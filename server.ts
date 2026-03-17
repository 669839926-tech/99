
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { put, list } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const DB_FILENAME = 'football_manager_db.json';
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // API Routes
  app.get('/api/storage', async (req, res) => {
    try {
      if (!token) {
        console.warn('BLOB_READ_WRITE_TOKEN is not set. Returning null.');
        return res.json(null);
      }

      const { blobs } = await list({ prefix: DB_FILENAME, limit: 1, token });
      
      if (blobs.length === 0) {
        return res.json(null);
      }

      const jsonUrl = blobs[0].url;
      const blobRes = await fetch(jsonUrl, { cache: 'no-store' });
      const data = await blobRes.json();
      
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.json(data);
    } catch (error) {
      console.error('Storage API GET Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/storage', async (req, res) => {
    try {
      if (!token) {
        return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not set' });
      }

      const body = req.body;
      const { url } = await put(DB_FILENAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
      });

      return res.json({ success: true, url });
    } catch (error) {
      console.error('Storage API POST Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
