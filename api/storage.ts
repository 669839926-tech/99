
import { put, list } from '@vercel/blob';

// Removing "runtime: 'edge'" defaults this function to standard Node.js Serverless Function
// which supports the necessary modules (stream, net, etc.) that were causing the build error.

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db'; // Broader prefix to find files with or without suffixes

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  console.log(`[Storage API] Method: ${request.method}, Token present: ${!!token}`);

  if (!token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE') {
    console.error('[Storage API] BLOB_READ_WRITE_TOKEN is missing or invalid.');
    return response.status(500).json({ 
      error: 'Storage configuration missing', 
      details: 'Please add BLOB_READ_WRITE_TOKEN to your environment variables in Settings -> Secrets.' 
    });
  }

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      console.log('[Storage API] Listing blobs with prefix:', DB_PREFIX);
      const { blobs } = await list({ prefix: DB_PREFIX, token });
      
      if (blobs.length === 0) {
        console.log('[Storage API] No blobs found. Returning null.');
        return response.status(200).json(null);
      }

      // Sort by uploadedAt descending to get the most recent version
      const sortedBlobs = blobs.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );

      const jsonUrl = sortedBlobs[0].url;
      console.log('[Storage API] Loading data from:', jsonUrl);

      // Using global fetch (available in Node.js 18+)
      const res = await fetch(jsonUrl, { cache: 'no-store' });
      const data = await res.json();
      
      response.setHeader('Cache-Control', 'no-store, max-age=0');
      return response.status(200).json(data);
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      if (!body || Object.keys(body).length === 0) {
        console.warn('[Storage API] Received empty body for POST request.');
      }

      console.log('[Storage API] Saving data to blob storage...');
      const { url } = await put(DB_FILENAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false, // Keep file name constant for easier retrieval
        allowOverwrite: true,   // Explicitly allow overwriting existing file
        token,
      });

      console.log('[Storage API] Data saved successfully to:', url);
      return response.status(200).json({ success: true, url });
    }

    return response.status(405).send('Method not allowed');
  } catch (error: any) {
    console.error('[Storage API Error]:', error);
    return response.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message || 'An unknown error occurred during storage operation.' 
    });
  }
}
