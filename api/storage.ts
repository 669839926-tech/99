
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Removing "runtime: 'edge'" defaults this function to standard Node.js Serverless Function
// which supports the necessary modules (stream, net, etc.) that were causing the build error.

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db'; // Broader prefix to find files with or without suffixes
const LOCAL_DB_PATH = path.join(process.cwd(), 'local_db.json');

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const useLocalFallback = !token || token === '' || token === 'YOUR_BLOB_TOKEN_HERE';

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      if (!useLocalFallback) {
        try {
          // Use prefix to find any matching files (including those with random suffixes from previous versions)
          const { blobs } = await list({ prefix: DB_PREFIX, token });
          
          if (blobs.length > 0) {
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
        } catch (error) {
          console.error('Vercel Blob GET Error, falling back to local file:', error);
        }
      }
      
      // Local fallback
      if (fs.existsSync(LOCAL_DB_PATH)) {
        console.log('Loading data from local file fallback');
        const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
        return response.status(200).json(JSON.parse(data));
      }
      
      console.log('No blobs found and no local file found');
      return response.status(200).json(null);
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      let url = 'local';
      
      if (!useLocalFallback) {
        try {
          console.log('Saving data to blob storage...');
          const result = await put(DB_FILENAME, JSON.stringify(body), {
            access: 'public',
            addRandomSuffix: false, // Keep file name constant for easier retrieval
            allowOverwrite: true,   // Explicitly allow overwriting existing file
            token,
          });
          url = result.url;
          console.log('Data saved successfully to:', url);
        } catch (error) {
          console.error('Vercel Blob POST Error, falling back to local file:', error);
        }
      }
      
      // Local fallback
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(body));
      console.log('Data saved to local file fallback');
      
      return response.status(200).json({ success: true, url });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
