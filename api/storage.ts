
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

  // 3. Fallback to searching for any valid local backup files (e.g. football_manager_db_backup_*.json)
  try {
    const parentDir = path.dirname(LOCAL_DB_PATH);
    if (fs.existsSync(parentDir)) {
      const files = fs.readdirSync(parentDir);
      const backupFiles = files
        .filter(f => f.startsWith('football_manager_db_backup_') && f.endsWith('.json'))
        .map(f => path.join(parentDir, f));

      // Sort backup files by modification time descending
      const sortedBackups = backupFiles.sort((a, b) => {
        try {
          return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
        } catch {
          return b.localeCompare(a);
        }
      });

      for (const backupPath of sortedBackups) {
        try {
          console.log('[Storage API] Attempting self-healing recovery from backup file:', backupPath);
          const content = fs.readFileSync(backupPath, 'utf-8');
          if (content && content.trim() !== '') {
            const data = JSON.parse(content);
            console.log('[Storage API] Self-healing success! Restoring active database from backup file.');
            // Write to project root and temp to heal
            try {
              const tempRoot = LOCAL_DB_PATH + '.tmp';
              fs.writeFileSync(tempRoot, content, 'utf-8');
              fs.renameSync(tempRoot, LOCAL_DB_PATH);

              const tmpDir = path.dirname(TMP_DB_PATH);
              if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
              }
              const tempTmp = TMP_DB_PATH + '.tmp';
              fs.writeFileSync(tempTmp, content, 'utf-8');
              fs.renameSync(tempTmp, TMP_DB_PATH);
            } catch (writeErr) {
              console.warn('[Storage API] Self-healing warning: failed to write healed files:', writeErr);
            }
            return data;
          }
        } catch (backupErr) {
          console.warn(`[Storage API] Failed to read/parse backup file ${backupPath}:`, backupErr);
        }
      }
    }
  } catch (err) {
    console.error('[Storage API] Error while scanning for backup files:', err);
  }

  return null;
};

const writeLocalDB = (data: any) => {
  let success = false;
  const jsonStr = JSON.stringify(data, null, 2);

  // 1. Attempt to write to project root atomically
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempRootPath = LOCAL_DB_PATH + '.tmp';
    fs.writeFileSync(tempRootPath, jsonStr, 'utf-8');
    fs.renameSync(tempRootPath, LOCAL_DB_PATH);
    success = true;
  } catch (error) {
    console.warn('[Storage API] Write to project root failed (expected in read-only lambda/Vercel). Trying /tmp...', error);
  }

  // 2. Always write to /tmp atomically as a robust fallback/cache (writable in serverless, Cloud Run, Vercel)
  try {
    const tmpDir = path.dirname(TMP_DB_PATH);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tempTmpPath = TMP_DB_PATH + '.tmp';
    fs.writeFileSync(tempTmpPath, jsonStr, 'utf-8');
    fs.renameSync(tempTmpPath, TMP_DB_PATH);
    success = true; // Mark as successful if we wrote to /tmp successfully
  } catch (error) {
    console.error('[Storage API] Failed to write DB to /tmp:', error);
  }

  return success;
};

const uploadBase64Image = async (base64Data: string, prefix: string, token: string): Promise<string> => {
  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 format');
  }
  const contentType = matches[1];
  const base64Str = matches[2];
  const buffer = Buffer.from(base64Str, 'base64');
  
  const extension = contentType.split('/')[1] || 'png';
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const filename = `${prefix}_${Date.now()}_${randomSuffix}.${extension}`;
  
  const { url } = await put(filename, buffer, {
    access: 'public',
    token,
    contentType,
  });
  return url;
};

const optimizeDatabaseImages = async (db: any, token: string): Promise<any> => {
  if (!db) return db;

  // 1. Optimize appLogo
  if (db.appLogo && typeof db.appLogo === 'string' && db.appLogo.startsWith('data:image/')) {
    try {
      console.log('[Storage API] Optimizing appLogo from base64...');
      const url = await uploadBase64Image(db.appLogo, 'app_logo', token);
      db.appLogo = url;
      console.log('[Storage API] appLogo optimized:', url);
    } catch (e) {
      console.error('[Storage API] Failed to optimize appLogo:', e);
    }
  }

  // 2. Optimize players
  if (db.players && Array.isArray(db.players)) {
    const uploadTasks: { type: 'image' | 'gallery'; playerIndex: number; galleryIndex?: number; base64: string }[] = [];

    db.players.forEach((player: any, pIdx: number) => {
      if (player.image && typeof player.image === 'string' && player.image.startsWith('data:image/')) {
        uploadTasks.push({ type: 'image', playerIndex: pIdx, base64: player.image });
      }
      if (player.gallery && Array.isArray(player.gallery)) {
        player.gallery.forEach((item: any, gIdx: number) => {
          if (item.url && typeof item.url === 'string' && item.url.startsWith('data:image/')) {
            uploadTasks.push({ type: 'gallery', playerIndex: pIdx, galleryIndex: gIdx, base64: item.url });
          }
        });
      }
    });

    if (uploadTasks.length > 0) {
      console.log(`[Storage API] Found ${uploadTasks.length} new base64 images to upload during save.`);
      
      const chunkSize = 10;
      for (let i = 0; i < uploadTasks.length; i += chunkSize) {
        const chunk = uploadTasks.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (task) => {
          try {
            const prefix = task.type === 'image' ? 'player_avatar' : 'player_gallery';
            const url = await uploadBase64Image(task.base64, prefix, token);
            if (task.type === 'image') {
              db.players[task.playerIndex].image = url;
            } else if (task.type === 'gallery' && task.galleryIndex !== undefined) {
              db.players[task.playerIndex].gallery[task.galleryIndex].url = url;
            }
          } catch (uploadErr) {
            console.error('[Storage API] Failed to upload image on save:', uploadErr);
          }
        }));
      }
      console.log('[Storage API] Base64 images successfully uploaded and URLs replaced.');
    }
  }

  return db;
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
        const { blobs } = await withTimeout(list({ prefix: DB_PREFIX, token }), 10000);
        
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
        
        let data = await res.json();
        
        // Failsafe: If the local file database on this container actually has MORE players than
        // the downloaded cloud database, prioritize the local database and synchronize the cloud as well.
        const localData = readLocalDB();
        if (localData && Array.isArray(localData.players) && data && Array.isArray(data.players)) {
          if (localData.players.length > data.players.length) {
            console.log(`[Storage API] Local DB has MORE players (${localData.players.length}) than downloaded cloud DB (${data.players.length}). Synchronizing cloud with local...`);
            data = localData;
            
            // Sync richer local data to cloud immediately
            try {
              await put(DB_FILENAME, JSON.stringify(data), {
                access: 'public',
                addRandomSuffix: false,
                allowOverwrite: true,
                token
              });
              console.log('[Storage API] Failsafe cloud database sync completed successfully.');
            } catch (syncErr) {
              console.error('[Storage API] Failsafe cloud database alignment failed:', syncErr);
            }
          }
        }
        
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

      // Optimize incoming body images before writing
      if (!isTokenMissing) {
        try {
          await optimizeDatabaseImages(body, token);
        } catch (optErr) {
          console.error('[Storage API] Image optimization on save failed (non-blocking):', optErr);
        }
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
          // Await the cloud upload with a 25-second timeout to prevent connection hangs, but ensure it completes
          const result = await withTimeout(
            put(DB_FILENAME, JSON.stringify(body), {
              access: 'public',
              addRandomSuffix: false, 
              allowOverwrite: true,   
              token,
            }),
            25000
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
          console.log('[Storage API] Cloud sync notice: backup sync postponed (non-blocking). Reason:', errorMsg);
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
