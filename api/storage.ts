
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const DB_FILENAME = 'football_manager_db.json';
const DB_PREFIX = 'football_manager_db';

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isVercelBlobEnabled = token && token.trim() !== '' && token !== 'YOUR_BLOB_TOKEN_HERE';

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      if (isVercelBlobEnabled) {
        const { blobs } = await list({ prefix: DB_PREFIX, token });
        
        if (blobs.length > 0) {
          const sortedBlobs = blobs.sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
          const jsonUrl = sortedBlobs[0].url;
          const res = await fetch(jsonUrl, { cache: 'no-store' });
          const data = await res.json();
          response.setHeader('Cache-Control', 'no-store, max-age=0');
          return response.status(200).json(data);
        }
      }
      
      // Fallback to local file if blob is disabled or no blobs found
      const localPath = path.join(process.cwd(), DB_FILENAME);
      if (fs.existsSync(localPath)) {
        const data = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
        return response.status(200).json(data);
      }
      
      return response.status(200).json(null);
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      if (isVercelBlobEnabled) {
        try {
          await put(DB_FILENAME, JSON.stringify(body), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
            token,
          });
        } catch (blobError) {
          console.error('Vercel Blob save failed, falling back to local:', blobError);
        }
      }

      // Always save locally as well (or as fallback)
      const localPath = path.join(process.cwd(), DB_FILENAME);
      fs.writeFileSync(localPath, JSON.stringify(body, null, 2));
      
      return response.status(200).json({ success: true });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
