
import { put } from '@vercel/blob';

export default async function handler(request, response) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token || token.trim() === '' || token === 'YOUR_BLOB_TOKEN_HERE') {
    return response.status(500).json({ 
      error: 'Storage configuration error', 
      message: 'BLOB_READ_WRITE_TOKEN is missing or invalid.' 
    });
  }

  if (request.method !== 'POST') {
    return response.status(405).send('Method not allowed');
  }

  try {
    const { filename, contentType } = request.query;
    const body = request.body;

    if (!body) {
      return response.status(400).json({ error: 'No body provided' });
    }

    const { url } = await put(filename || 'upload.bin', body, {
      access: 'public',
      token,
      contentType: contentType || 'application/octet-stream',
    });

    return response.status(200).json({ url });
  } catch (error) {
    console.error('Upload API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
