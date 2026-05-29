
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db'; 
const LOCAL_DB_PATH = path.join(process.cwd(), 'football_manager_db.json');
const TMP_DB_PATH = path.join('/tmp', 'football_manager_db.json');

const readLocalDB = () => {
  try {
    // 1. Try reading from /tmp first (the most recently written local backup)
    if (fs.existsSync(TMP_DB_PATH)) {
      const content = fs.readFileSync(TMP_DB_PATH, 'utf-8');
      return JSON.parse(content);
    }
    // 2. Fallback to reading from the project root (the bundled asset)
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[Storage API] Failed to read from local file DB:', error);
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

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  console.log(`[Storage API] Method: ${request.method}, Token present: ${!!token}`);

  const isTokenMissing = !token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE';

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      if (isTokenMissing) {
        console.log('[Storage API] Token missing. Loading from local file...');
        const localData = readLocalDB();
        return response.status(200).json(localData);
      }

      try {
        console.log('[Storage API] Listing blobs with prefix:', DB_PREFIX);
        const { blobs } = await withTimeout(list({ prefix: DB_PREFIX, token }), 4000);
        
        if (blobs.length === 0) {
          console.log('[Storage API] No blobs found. Loading from local file...');
          const localData = readLocalDB();
          return response.status(200).json(localData);
        }

        const sortedBlobs = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

        const jsonUrl = sortedBlobs[0].url;
        console.log('[Storage API] Loading data from vercel blob:', jsonUrl);

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
      } catch (blobError) {
        console.warn('[Storage API] Vercel Blob access failed. Falling back to local file:', blobError);
        const localData = readLocalDB();
        return response.status(200).json(localData);
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      if (!body || Object.keys(body).length === 0) {
        console.warn('[Storage API] Received empty body for POST request.');
      }

      // Always save to local file as primary or backup persistence
      const localWriteSuccess = writeLocalDB(body);
      if (!localWriteSuccess) {
         console.error('[Storage API] Failed to write local database.');
         return response.status(500).json({ error: 'Failed to write to local storage' });
      }

      // Return status 200 immediately to client. This avoids client-side connection timeouts
      response.status(200).json({ 
        success: true, 
        message: 'Saved to local storage. Syncing to cloud in background.',
        url: 'local://' + DB_FILENAME 
      });

      if (!isTokenMissing) {
        console.log('[Storage API] Saving data to Vercel blob storage asynchronously in the background...');
        put(DB_FILENAME, JSON.stringify(body), {
          access: 'public',
          addRandomSuffix: false, 
          allowOverwrite: true,   
          token,
        }).then(({ url }) => {
          console.log('[Storage API] Data saved successfully to Vercel Blob in background:', url);
        }).catch(err => {
          console.warn('[Storage API] Vercel Blob background put failed:', err.message);
        });
      }
      return;
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
