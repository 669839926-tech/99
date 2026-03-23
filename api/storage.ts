
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export default async function handler(request, response) {
  try {
    // Ensure data directory exists
    try {
      await fs.access(DATA_DIR);
    } catch (_e) {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }

    if (request.method === 'GET') {
      try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return response.status(200).json(JSON.parse(data));
      } catch (_e) {
        // If file doesn't exist, return null (new database)
        console.log('No local database found, returning null.');
        return response.status(200).json(null);
      }
    }

    if (request.method === 'POST') {
      const body = request.body;
      console.log('Saving data to local storage...');
      await fs.writeFile(DB_FILE, JSON.stringify(body, null, 2), 'utf-8');
      console.log('Data saved successfully to:', DB_FILE);
      return response.status(200).json({ success: true, url: 'local-storage' });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
