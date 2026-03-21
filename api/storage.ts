
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';

const DB_FILENAME = 'football_manager_db.json';
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DB_PATH = path.join(LOCAL_DATA_DIR, DB_FILENAME);

// Ensure data directory exists
if (!fs.existsSync(LOCAL_DATA_DIR)) {
  try {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

export default async function handler(request: Request, response: Response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  // Consider token invalid if it's the placeholder or empty
  const isTokenMissing = !token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE';

  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      console.log('Storage GET request received');
      
      // If token is missing, strictly use local
      if (isTokenMissing) {
        console.log('Vercel Blob token missing, using local filesystem');
        return serveLocalData(response);
      }

      try {
        console.log('Attempting to list blobs from Vercel...');
        const { blobs } = await list({ prefix: 'football_manager_db', token });
        
        if (blobs.length === 0) {
          console.log('No blobs found in Vercel, checking local fallback');
          return serveLocalData(response);
        }
        
        const sortedBlobs = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

        console.log(`Found ${blobs.length} blobs, fetching latest from: ${sortedBlobs[0].url}`);
        const res = await fetch(sortedBlobs[0].url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch blob: ${res.statusText}`);
        
        const data = await res.json();
        response.setHeader('X-Storage-Method', 'blob');
        return response.status(200).json(data);
      } catch (blobError: any) {
        console.error('Vercel Blob GET error:', blobError.message);
        // On any Vercel error (Access denied, network, etc.), fall back to local
        console.warn('Falling back to local filesystem due to Vercel error');
        return serveLocalData(response);
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      if (!body) {
        return response.status(400).json({ error: 'Empty request body' });
      }
      
      const dataString = JSON.stringify(body);

      // Always save locally as a reliable backup
      try {
        fs.writeFileSync(LOCAL_DB_PATH, dataString);
        console.log('Data backed up to local filesystem');
      } catch (fsError) {
        console.error('Failed to write to local filesystem:', fsError);
      }

      if (isTokenMissing) {
        console.log('Vercel Blob token missing, saved locally only');
        return response.status(200).json({ success: true, method: 'local' });
      }

      try {
        console.log('Attempting to save to Vercel Blob...');
        const { url } = await put(DB_FILENAME, dataString, {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          token,
        });
        console.log('Data successfully saved to Vercel Blob:', url);
        return response.status(200).json({ success: true, url, method: 'blob' });
      } catch (blobError: any) {
        console.error('Vercel Blob POST error:', blobError.message);
        return response.status(200).json({ 
          success: true, 
          method: 'local', 
          warning: `Vercel Blob save failed: ${blobError.message}. Data saved to local backup.` 
        });
      }
    }

    // Handle other methods
    return response.status(405).json({ error: 'Method Not Allowed' });

  } catch (error: any) {
    console.error('Global Storage API Error:', error);
    return response.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}

/**
 * Helper to serve data from local filesystem
 */
function serveLocalData(response: Response) {
  response.setHeader('X-Storage-Method', 'local');
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      return response.status(200).json(JSON.parse(data));
    } catch (parseError) {
      console.error('Failed to parse local DB file:', parseError);
      return response.status(500).json({ error: 'Corrupted local data file' });
    }
  }
  console.log('No local data file found');
  return response.status(200).json(null);
}

