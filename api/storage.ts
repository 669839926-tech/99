import fs from 'fs/promises';
import path from 'path';

const DB_FILENAME = 'football_manager_db.json';
const DB_PATH = path.join(process.cwd(), DB_FILENAME);

export default async function handler(request, response) {
  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return response.status(200).json(JSON.parse(data));
      } catch {
        // If file doesn't exist, return null or empty object
        console.log('No local database found, returning null');
        return response.status(200).json(null);
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      
      console.log('Saving data to local storage...');
      await fs.writeFile(DB_PATH, JSON.stringify(body, null, 2), 'utf-8');

      console.log('Data saved successfully to:', DB_PATH);
      return response.status(200).json({ success: true, path: DB_PATH });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
