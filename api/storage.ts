
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const DB_FILENAME = 'football_manager_db.json';
const LOCAL_DB_PATH = path.join(process.cwd(), 'data', DB_FILENAME);

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const useLocalFallback = !token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE';

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      if (useLocalFallback) {
        console.log('Using local filesystem fallback for GET');
        if (fs.existsSync(LOCAL_DB_PATH)) {
          const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
          return response.status(200).json(JSON.parse(data));
        }
        return response.status(200).json(null);
      }

      try {
        const { blobs } = await list({ prefix: 'football_manager_db', token });
        if (blobs.length === 0) return response.status(200).json(null);
        
        const sortedBlobs = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

        const res = await fetch(sortedBlobs[0].url, { cache: 'no-store' });
        const data = await res.json();
        return response.status(200).json(data);
      } catch (blobError: any) {
        if (blobError.message && blobError.message.includes('Access denied')) {
          console.warn('Vercel Blob Access Denied, falling back to local filesystem');
          if (fs.existsSync(LOCAL_DB_PATH)) {
            const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
            return response.status(200).json(JSON.parse(data));
          }
          return response.status(200).json(null);
        }
        throw blobError;
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      const dataString = JSON.stringify(body);

      // Always save locally as a backup
      fs.writeFileSync(LOCAL_DB_PATH, dataString);

      if (useLocalFallback) {
        console.log('Using local filesystem fallback for POST');
        return response.status(200).json({ success: true, method: 'local' });
      }

      try {
        const { url } = await put(DB_FILENAME, dataString, {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          token,
        });
        return response.status(200).json({ success: true, url, method: 'blob' });
      } catch (blobError: any) {
        if (blobError.message && blobError.message.includes('Access denied')) {
          console.warn('Vercel Blob Access Denied during POST, data saved locally only');
          return response.status(200).json({ 
            success: true, 
            method: 'local', 
            warning: 'Vercel Blob access denied. Data saved to local filesystem only.' 
          });
        }
        throw blobError;
      }
    }

    } catch (error: any) {
    console.error('Storage API Error:', error);
    
    // Check for Vercel Blob specific access error
    if (error.message && error.message.includes('Access denied')) {
      return response.status(403).json({ 
        error: 'Blob Access Denied', 
        message: 'The provided BLOB_READ_WRITE_TOKEN is invalid or does not have the required permissions. Please check your Vercel Blob configuration.' 
      });
    }
    
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
