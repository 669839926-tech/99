import { put, list } from '@vercel/blob';

const DB_FILENAME = 'football_manager_db.json';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_UpvUlsKisME5Q77S_NAzNDtAxlP5FR8fIxtyMJ07dWF0lAQ';

export default async function handler(request, response) {
  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      try {
        // List blobs to find the latest one with the prefix
        const { blobs } = await list({ prefix: DB_FILENAME, token: BLOB_TOKEN });
        
        if (blobs.length === 0) {
          console.log('No cloud database found, returning null');
          return response.status(200).json(null);
        }

        // Get the latest blob
        const latestBlob = blobs[0];
        const res = await fetch(latestBlob.url);
        const data = await res.json();
        
        return response.status(200).json(data);
      } catch (error) {
        console.error('Failed to load data from Vercel Blob:', error);
        return response.status(200).json(null);
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      console.log('Saving data to Vercel Blob...');
      const blob = await put(DB_FILENAME, JSON.stringify(body, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        token: BLOB_TOKEN,
      });

      console.log('Data saved successfully to Vercel Blob:', blob.url);
      return response.status(200).json({ success: true, url: blob.url });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
