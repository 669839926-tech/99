
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db'; 
const LOCAL_DB_PATH = path.join(process.cwd(), 'football_manager_db.json');
const TMP_DB_PATH = path.join('/tmp', 'football_manager_db.json');

const readLocalDB = () => {
  // 1. Try reading from /tmp first (the most recently written local backup)
  if (fs.existsSync(TMP_DB_PATH)) {
    try {
      const content = fs.readFileSync(TMP_DB_PATH, 'utf-8');
      if (content && content.trim() !== '') {
        return JSON.parse(content);
      }
    } catch (tmpError) {
      console.warn('[Storage API] Failed to parse /tmp DB file, it may be corrupted. Cleaning up and falling back...', tmpError);
      try {
        fs.unlinkSync(TMP_DB_PATH); // Delete corrupted temp file to prevent reuse
      } catch {
        // Ignore unlink errors
      }
    }
  }

  // 2. Fallback to reading from the project root (the bundled asset)
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      if (content && content.trim() !== '') {
        return JSON.parse(content);
      }
    } catch (localError) {
      console.error('[Storage API] Failed to read/parse root local file DB:', localError);
    }
  }
  return null;
};

const writeLocalDB = (data: any) => {
  let success = false;

  // 1. Attempt to write to project root (works in dev or standard writeable containers)
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    success = true;
  } catch (error) {
    console.warn('[Storage API] Write to project root failed (expected in read-only lambda/Vercel). Trying /tmp...', error);
  }

  // 2. Always write to /tmp as a robust fallback/cache (writable in serverless, Cloud Run, Vercel)
  try {
    const tmpDir = path.dirname(TMP_DB_PATH);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    fs.writeFileSync(TMP_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    success = true; // Mark as successful if we wrote to /tmp successfully
  } catch (error) {
    console.error('[Storage API] Failed to write DB to /tmp:', error);
  }

  return success;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), ms))
  ]);
};

let isBlobDisabled = false;

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  console.log(`[Storage API] Method: ${request.method}, Token present: ${!!token}, Bypassed/Disabled: ${isBlobDisabled}`);

  const isTokenMissing = isBlobDisabled || !token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE';

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      // 1. Check if we should list available backups
      if (request.query && request.query.listBackups === 'true') {
        if (isTokenMissing) {
          return response.status(200).json({ 
            success: false, 
            reason: 'BLOB_READ_WRITE_TOKEN_MISSING', 
            blobs: [],
            message: '云端存储Token未配置或不可用' 
          });
        }
        try {
          console.log('[Storage API] Listing blobs with prefix:', DB_PREFIX);
          const { blobs } = await withTimeout(list({ prefix: DB_PREFIX, token }), 4000);
          const sortedBlobs = blobs.sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
          return response.status(200).json({ success: true, blobs: sortedBlobs });
        } catch (err: any) {
          console.error('[Storage API] Failed to list backups:', err);
          return response.status(500).json({ success: false, error: err.message });
        }
      }

      // 2. Check if we should restore from a specific snapshot URL
      if (request.query && request.query.restoreFromUrl) {
        const backupUrl = request.query.restoreFromUrl;
        console.log('[Storage API] Restoring database from snapshot URL:', backupUrl);
        try {
          const res = await fetch(backupUrl);
          if (!res.ok) {
            throw new Error(`无法从快照地址下载数据: HTTP ${res.status}`);
          }
          const restoredData = await res.json();
          
          // Write to local cache & process file
          const writeSuccess = writeLocalDB(restoredData);
          if (!writeSuccess) {
            throw new Error('本地主数据库写入失败');
          }
          
          if (!isTokenMissing) {
            console.log('[Storage API] Synchronizing restored database over primary cloud database...');
            await put(DB_FILENAME, JSON.stringify(restoredData), {
              access: 'public',
              addRandomSuffix: false,
              allowOverwrite: true,
              token
            });
          }
          
          response.setHeader('Cache-Control', 'no-store, max-age=0');
          return response.status(200).json({ 
            success: true, 
            message: '云端及本地数据库已成功恢复至该备份！', 
            data: restoredData 
          });
        } catch (err: any) {
          console.error('[Storage API] Restore operation failed:', err);
          return response.status(500).json({ success: false, error: err.message });
        }
      }

      // 3. Check if we should create a manual backup of current state
      if (request.query && request.query.action === 'createManualBackup') {
        const currentData = readLocalDB();
        if (!currentData) {
          return response.status(400).json({ success: false, error: '当前本地无有效数据可用于备份。' });
        }
        if (isTokenMissing) {
          return response.status(400).json({ success: false, error: '储存Token未配置，无法在云端创建备份。' });
        }
        try {
          const suffix = new Date().toISOString().replace(/[:.]/g, '-');
          const backupFilename = `football_manager_db-backup-${suffix}.json`;
          console.log('[Storage API] Creating explicit cloud-backups snapshot:', backupFilename);
          const result = await put(backupFilename, JSON.stringify(currentData), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
            token
          });
          return response.status(200).json({ 
            success: true, 
            url: result.url, 
            pathname: backupFilename,
            message: `手动点云备份成功: ${backupFilename}`
          });
        } catch (err: any) {
          console.error('[Storage API] Manual snapshot creation failed:', err);
          return response.status(500).json({ success: false, error: err.message });
        }
      }

      // Primary Standard GET: Loading current database
      if (isTokenMissing) {
        console.log('[Storage API] Token missing or disabled. Loading from local file...');
        const localData = readLocalDB();
        return response.status(200).json(localData);
      }

      try {
        console.log('[Storage API] Listing blobs with prefix to get latest database:', DB_PREFIX);
        const { blobs } = await withTimeout(list({ prefix: DB_PREFIX, token }), 4000);
        
        if (blobs.length === 0) {
          console.log('[Storage API] No blobs found. Loading from local file...');
          const localData = readLocalDB();
          return response.status(200).json(localData);
        }

        const sortedBlobs = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

        // Filter out other manual backup files so the app retrieves the master file 'football_manager_db.json'
        // or the newest synced master database state instead of randomly picking a specific manual backup
        const primaryBlob = sortedBlobs.find(b => b.pathname === DB_FILENAME) || sortedBlobs[0];
        const jsonUrl = primaryBlob.url;
        console.log('[Storage API] Loading primary data database from vercel blob:', primaryBlob.pathname, jsonUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(jsonUrl, { 
          cache: 'no-store',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        const data = await res.json();
        
        response.setHeader('Cache-Control', 'no-store, max-age=0');
        // Cache to local file as warm backup
        writeLocalDB(data);
        return response.status(200).json(data);
      } catch (blobError: any) {
        const errorMsg = blobError instanceof Error ? blobError.message : String(blobError);
        const hasAccessIssue = errorMsg.includes('Access') || errorMsg.includes('denied') || errorMsg.includes('token') || errorMsg.includes('credential') || errorMsg.includes('Forbidden');
        if (hasAccessIssue) {
          isBlobDisabled = true;
        }
        console.log('[Storage API] Cloud sync currently deferred, loading from local file assets. Status: OK.');
        const localData = readLocalDB();
        return response.status(200).json(localData);
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      if (!body || Object.keys(body).length === 0) {
        console.log('[Storage API] Received empty body for POST request.');
      }

      // Always save to local file as primary or backup persistence
      const localWriteSuccess = writeLocalDB(body);
      if (!localWriteSuccess) {
         console.log('[Storage API] Failed to write local database.');
         return response.status(500).json({ error: 'Failed to write to local storage' });
      }

      let cloudUrl = null;
      let cloudSynced = false;
      let cloudErrorMsg = null;

      if (!isTokenMissing) {
        try {
          console.log('[Storage API] Saving data to Vercel blob storage synchronously with a timeout...');
          // Await the cloud upload with a 5-second timeout to prevent connection hangs, but ensure it completes
          const result = await withTimeout(
            put(DB_FILENAME, JSON.stringify(body), {
              access: 'public',
              addRandomSuffix: false, 
              allowOverwrite: true,   
              token,
            }),
            5000
          );
          cloudUrl = result.url;
          cloudSynced = true;
          console.log('[Storage API] Data saved successfully to Vercel Blob synchronously:', cloudUrl);
        } catch (err: any) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const hasAccessIssue = errorMsg.includes('Access') || errorMsg.includes('denied') || errorMsg.includes('token') || errorMsg.includes('credential') || errorMsg.includes('Forbidden');
          if (hasAccessIssue) {
            isBlobDisabled = true;
          }
          cloudErrorMsg = errorMsg;
          console.error('[Storage API] Cloud sync failed or timed out:', errorMsg);
        }
      }

      // Return status 200 with cloudSynced feedback to let frontend know true status
      return response.status(200).json({ 
        success: true, 
        message: cloudSynced ? '已保存至本地并成功同步至云端。' : `已保存至本地。云端同步未就绪 (${cloudErrorMsg || '未配置Token'})`,
        url: cloudUrl || ('local://' + DB_FILENAME),
        cloudSynced
      });
    }

    return response.status(405).send('Method not allowed');
  } catch (error: any) {
    console.error('[Storage API Error]:', error);
    try {
      if (request.method === 'GET') {
        const localData = readLocalDB();
        return response.status(200).json(localData);
      } else if (request.method === 'POST') {
        writeLocalDB(request.body);
        return response.status(200).json({ success: true, url: 'local://' + DB_FILENAME });
      }
    } catch (fallbackError) {
      console.error('[Storage API Ultimate Fallback Warning]:', fallbackError);
    }

    return response.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message || 'An unknown error occurred during storage operation.' 
    });
  }
}
