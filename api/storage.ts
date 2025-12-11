
import { put, list } from '@vercel/blob';

// Removing "runtime: 'edge'" defaults this function to standard Node.js Serverless Function
// which supports the necessary modules (stream, net, etc.) that were causing the build error.

const DB_FILENAME = 'football_manager_db.json';

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      const { blobs } = await list({ prefix: DB_FILENAME, limit: 1, token });
      
      if (blobs.length === 0) {
        return response.status(200).json(null);
      }

      const jsonUrl = blobs[0].url;
      // Using global fetch (available in Node.js 18+)
      const res = await fetch(jsonUrl, { cache: 'no-store' });
      const data = await res.json();
      
      response.setHeader('Cache-Control', 'no-store, max-age=0');
      return response.status(200).json(data);
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      // In Vercel Node.js functions, request.body is automatically parsed if content-type is json
      const body = request.body;
      
      const { url } = await put(DB_FILENAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false, // Keep file name constant
        allowOverwrite: true,   // Explicitly allow overwriting existing file
        token,
      });

      return response.status(200).json({ success: true, url });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
