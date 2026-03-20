
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Removing "runtime: 'edge'" defaults this function to standard Node.js Serverless Function
// which supports the necessary modules (stream, net, etc.) that were causing the build error.

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db'; // Broader prefix to find files with or without suffixes
const LOCAL_DB_PATH = path.join(process.cwd(), 'data', DB_FILENAME);

// Ensure data directory exists for local fallback
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  try {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const useLocalFallback = !token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE';

  if (useLocalFallback) {
    console.warn('BLOB_READ_WRITE_TOKEN is missing or invalid. Using local file storage fallback.');
    console.warn('WARNING: Local storage is ephemeral and will be lost if the container restarts.');
  }

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      if (useLocalFallback) {
        if (fs.existsSync(LOCAL_DB_PATH)) {
          const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
          return response.status(200).json(JSON.parse(data));
        }
        return response.status(200).json(null);
      }

      // Use prefix to find any matching files (including those with random suffixes from previous versions)
      const { blobs } = await list({ prefix: DB_PREFIX, token });
      
      if (blobs.length === 0) {
        console.log('No blobs found with prefix:', DB_PREFIX);
        return response.status(200).json(null);
      }

      // Sort by uploadedAt descending to get the most recent version
      const sortedBlobs = blobs.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );

      const jsonUrl = sortedBlobs[0].url;
      console.log('Loading data from:', jsonUrl, 'Uploaded at:', sortedBlobs[0].uploadedAt);

      // Using global fetch (available in Node.js 18+)
      const res = await fetch(jsonUrl, { cache: 'no-store' });
      const data = await res.json();
      
      response.setHeader('Cache-Control', 'no-store, max-age=0');
      return response.status(200).json(data);
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      if (useLocalFallback) {
        console.log('Saving data to local file storage...');
        fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(body, null, 2));
        return response.status(200).json({ success: true, url: 'local://' + DB_FILENAME });
      }

      console.log('Saving data to blob storage...');
      const { url } = await put(DB_FILENAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false, // Keep file name constant for easier retrieval
        allowOverwrite: true,   // Explicitly allow overwriting existing file
        token,
      });

      console.log('Data saved successfully to:', url);
      return response.status(200).json({ success: true, url });
    }

    return response.status(405).send('Method not allowed');
  } catch (error: any) {
    console.error('Storage API Error:', error);
    
    // Handle specific Vercel Blob errors
    if (error.name === 'BlobAccessError') {
      // If Vercel Blob fails, try to fallback to local storage for this request
      try {
        if (request.method === 'GET' && fs.existsSync(LOCAL_DB_PATH)) {
          const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
          return response.status(200).json(JSON.parse(data));
        } else if (request.method === 'POST') {
          fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(request.body, null, 2));
          return response.status(200).json({ success: true, url: 'local://' + DB_FILENAME, warning: 'Vercel Blob failed, used local fallback' });
        }
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError);
      }

      return response.status(401).json({ 
        error: 'Access Denied', 
        message: 'Vercel Blob storage access denied. Please verify your BLOB_READ_WRITE_TOKEN in Settings -> Secrets.' 
      });
    }
    
    return response.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred in the storage API.'
    });
  }
}
