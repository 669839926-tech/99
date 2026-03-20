import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'football_manager_db.json');

export default async function handler(request, response) {
  try {
    // GET Request: Load data
    if (request.method === 'GET') {
      try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        console.log('Data successfully loaded from local storage.');
        return response.status(200).json(JSON.parse(data));
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          console.log('Local database file not found, returning null.');
          return response.status(200).json(null);
        }
        throw error;
      }
    }

    // POST Request: Save data
    if (request.method === 'POST') {
      const body = request.body;
      console.log('Saving data to local storage...');
      await fs.writeFile(DB_PATH, JSON.stringify(body, null, 2), 'utf-8');
      console.log('Data saved successfully to local storage.');
      return response.status(200).json({ success: true });
    }

    return response.status(405).send('Method not allowed');
  } catch (error) {
    console.error('Storage API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
