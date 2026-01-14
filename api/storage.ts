
import { put, list } from '@vercel/blob';

// Vercel Serverless Functions have a default 4.5MB limit on request body size.
// For youth clubs, this single-file approach works until dozens of high-res base64 images are added.

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
      const res = await fetch(jsonUrl, { cache: 'no-store' });
      const data = await res.json();
      
      response.setHeader('Cache-Control', 'no-store, max-age=0');
      return response.status(200).json(data);
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      if (!body) {
        return response.status(400).json({ error: 'Empty request body' });
      }

      // Check approximate size (Base64 data is large)
      const bodySize = JSON.stringify(body).length;
      console.log(`Syncing database to cloud. Total size: ${(bodySize / 1024).toFixed(2)} KB`);

      const { url } = await put(DB_FILENAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
      });

      return response.status(200).json({ success: true, url, size: bodySize });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Critical Error:', error);
    return response.status(500).json({ error: 'Cloud synchronization failed', details: error.message });
  }
}
