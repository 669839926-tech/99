import { put } from '@vercel/blob';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).send('Method not allowed');
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return response.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is missing' });
  }

  try {
    const { filename, data } = request.body;
    
    // Convert base64 to buffer
    const buffer = Buffer.from(data.split(',')[1], 'base64');
    
    const { url } = await put(filename, buffer, {
      access: 'public',
      token,
    });

    return response.status(200).json({ success: true, url });
  } catch (error) {
    console.error('Upload API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
