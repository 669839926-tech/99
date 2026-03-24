
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Removing "runtime: 'edge'" defaults this function to standard Node.js Serverless Function
// which supports the necessary modules (stream, net, etc.) that were causing the build error.

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db'; // Broader prefix to find files with or without suffixes
const LOCAL_DB_PATH = path.join(process.cwd(), DB_FILENAME);

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const hasValidToken = token && token.trim() !== '' && token !== 'YOUR_BLOB_TOKEN_HERE';

  if (!hasValidToken) {
    console.warn('BLOB_READ_WRITE_TOKEN is missing or invalid. Falling back to local file storage.');
  }

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      if (!hasValidToken) {
        if (fs.existsSync(LOCAL_DB_PATH)) {
          const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
          return response.status(200).json(JSON.parse(data));
        }
        return response.status(200).json(null);
      }

      try {
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
      } catch (error: any) {
        if (error.name === 'BlobAccessError' || error.message?.includes('Access denied')) {
          console.warn('Vercel Blob Access Denied. Falling back to local file storage.');
          if (fs.existsSync(LOCAL_DB_PATH)) {
            const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
            return response.status(200).json(JSON.parse(data));
          }
          return response.status(200).json(null);
        }
        throw error;
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      if (!hasValidToken) {
        console.log('Saving data to local file storage...');
        fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(body, null, 2), 'utf-8');
        return response.status(200).json({ success: true, url: 'local-file' });
      }

      try {
        console.log('Saving data to blob storage...');
        const { url } = await put(DB_FILENAME, JSON.stringify(body), {
          access: 'public',
          addRandomSuffix: false, // Keep file name constant for easier retrieval
          allowOverwrite: true,   // Explicitly allow overwriting existing file
          token,
        });

        console.log('Data saved successfully to:', url);
        return response.status(200).json({ success: true, url });
      } catch (error: any) {
        if (error.name === 'BlobAccessError' || error.message?.includes('Access denied')) {
          console.warn('Vercel Blob Access Denied. Saving data to local file storage...');
          fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(body, null, 2), 'utf-8');
          return response.status(200).json({ success: true, url: 'local-file' });
        }
        throw error;
      }
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
