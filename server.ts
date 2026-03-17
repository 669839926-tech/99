import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { put, list } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  const DB_FILENAME = 'football_manager_db.json';

  app.get("/api/storage", async (req, res) => {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.warn('BLOB_READ_WRITE_TOKEN is not configured. Cloud storage is disabled.');
      return res.status(200).json(null);
    }
    try {
      const { blobs } = await list({ prefix: DB_FILENAME, limit: 1, token });
      
      if (blobs.length === 0) {
        return res.status(200).json(null);
      }

      const jsonUrl = blobs[0].url;
      const response = await fetch(jsonUrl, { cache: 'no-store' });
      const data = await response.json();
      
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json(data);
    } catch (error) {
      console.error('Storage API Error (GET):', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/storage", async (req, res) => {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return res.status(400).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured.' });
    }
    try {
      const body = req.body;
      const { url } = await put(DB_FILENAME, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
      });

      return res.status(200).json({ success: true, url });
    } catch (error) {
      console.error('Storage API Error (POST):', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
