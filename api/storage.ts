
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db'; 
const LOCAL_DB_PATH = path.join(process.cwd(), 'football_manager_db.json');

const readLocalDB = () => {
  try {
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
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Storage API] Failed to write to local file DB:', error);
    return false;
  }
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), ms))
  ]);
};

export default async function handler(request: any, response: any) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Set strict, comprehensive cache-busting headers to prevent Vercel CDN or browser from caching
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, stale-while-revalidate=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');

  console.log(`[Storage API] Method: ${request.method}, Token present: ${!!token}`);

  const isTokenMissing = !token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE';

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      if (isTokenMissing) {
        if (process.env.VERCEL === '1') {
          console.warn('[Storage API] Vercel environment detected but Vercel Blob token is missing!');
          return response.status(500).json({
            error: 'Missing Vercel Blob Token',
            message: '系统云端数据库未激活：当前部署处于 Vercel 环境，但未找到关联的 BLOB_READ_WRITE_TOKEN 环境变量。请登录 Vercel 控制台，进入该项目的 Settings -> Environment Variables 页签关联/开通 Vercel Blob 存储服务以开启云端持续同步功能！'
          });
        }
        console.log('[Storage API] Token missing. Loading from local file...');
        const localData = readLocalDB();
        return response.status(200).json(localData);
      }

      try {
        console.log('[Storage API] Listing blobs with prefix:', DB_PREFIX);
        // Increase list timeout to 12000ms to allow plenty of time for S3 retrieval under serverless platform cold starts
        const { blobs } = await withTimeout(list({ prefix: DB_PREFIX, token }), 12000);
        
        if (blobs.length === 0) {
          console.log('[Storage API] No blobs found. Loading from local file...');
          const localData = readLocalDB();
          return response.status(200).json(localData);
        }

        const sortedBlobs = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

        // Add a timestamp query parameter to bypass edge cache for static suffixed files
        const jsonUrl = `${sortedBlobs[0].url}?t=${Date.now()}`;
        console.log('[Storage API] Loading data from vercel blob:', jsonUrl);

        const controller = new AbortController();
        // Increase fetch timeout to 10000ms
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(jsonUrl, { 
          cache: 'no-store',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        const data = await res.json();
        
        // Cache to local file as warm backup
        writeLocalDB(data);
        return response.status(200).json(data);
      } catch (blobError: any) {
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

      if (isTokenMissing) {
        if (process.env.VERCEL === '1') {
          console.error('[Storage API] Fail to save: Vercel Blob token is missing!');
          return response.status(500).json({
            error: 'Missing Vercel Blob Token',
            message: '云端同步保存失败：未检测到 BLOB_READ_WRITE_TOKEN。请前往 Vercel 控制台关联/添加 Vercel Blob，否则数据无法在 Vercel 中实现保存。'
          });
        }
      }

      // Always save to local file as primary or backup persistence
      const localWriteSuccess = writeLocalDB(body);
      if (!localWriteSuccess) {
         console.error('[Storage API] Failed to write local database.');
         return response.status(500).json({ error: 'Failed to write to local storage' });
      }

      let uploadUrl = 'local://' + DB_FILENAME;

      if (!isTokenMissing) {
        console.log('[Storage API] Saving data to Vercel blob storage synchronously...');
        try {
          const blobRes = await withTimeout(put(DB_FILENAME, JSON.stringify(body), {
            access: 'public',
            addRandomSuffix: false, 
            allowOverwrite: true,
            token,
          }), 15000); // Wait up to 15 seconds to finish the upload before returning 200
          
          uploadUrl = blobRes.url;
          console.log('[Storage API] Data saved successfully to Vercel Blob:', uploadUrl);
        } catch (err: any) {
          console.error('[Storage API] Vercel Blob put failed:', err);
          return response.status(500).json({ 
            error: 'Failed to sync to cloud storage', 
            message: err.message || 'The Vercel Blob system encountered an unexpected error.' 
          });
        }
      }

      return response.status(200).json({ 
        success: true, 
        message: 'Saved to local and cloud storage successfully.',
        url: uploadUrl 
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
