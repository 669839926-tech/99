import { list } from '@vercel/blob';

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is missing' });
  }

  try {
    const { blobs } = await list({ token });
    return response.status(200).json({ success: true, count: blobs.length, blobs: blobs.map(b => b.pathname) });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
