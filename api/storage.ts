
import { put, list } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

const DB_FILENAME = 'football_manager_db.json';

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);

    // GET Request: Load data
    if (request.method === 'GET') {
      // Find the database file
      const { blobs } = await list({ prefix: DB_FILENAME, limit: 1 });
      
      if (blobs.length === 0) {
        // Return null if no DB exists yet
        return new Response(JSON.stringify(null), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const jsonUrl = blobs[0].url;
      // Fetch the JSON content, bypassing cache to ensure fresh data
      const res = await fetch(jsonUrl, { cache: 'no-store' });
      const data = await res.json();
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = await request.json();
      
      // Save to Blob. 
      // addRandomSuffix: false ensures we overwrite/keep the same filename logic conceptually (though Vercel Blob URLs are immutable, we use the predictable prefix for listing).
      const { url } = await put(DB_FILENAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return new Response(JSON.stringify({ success: true, url }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Storage API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
