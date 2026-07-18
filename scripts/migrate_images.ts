import 'dotenv/config';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), 'football_manager_db.json');
const TMP_DB_PATH = path.join('/tmp', 'football_manager_db.json');

async function uploadBase64Image(base64Data: string, prefix: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is missing');
  }
  
  // Extract content type and data
  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 format');
  }
  const contentType = matches[1];
  const base64Str = matches[2];
  const buffer = Buffer.from(base64Str, 'base64');
  
  // Generate a random unique filename with correct extension
  const extension = contentType.split('/')[1] || 'png';
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const filename = `${prefix}_${Date.now()}_${randomSuffix}.${extension}`;
  
  const { url } = await put(filename, buffer, {
    access: 'public',
    token,
    contentType,
  });
  return url;
}

async function runMigration() {
  console.log('[Migration] Starting image optimization migration...');
  
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    console.error(`[Migration] Local database file not found at ${LOCAL_DB_PATH}`);
    return;
  }
  
  const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
  let db;
  try {
    db = JSON.parse(content);
  } catch (err) {
    console.error('[Migration] Failed to parse local database:', err);
    return;
  }
  
  let updated = false;
  
  // 1. Optimize appLogo
  if (db.appLogo && typeof db.appLogo === 'string' && db.appLogo.startsWith('data:image/')) {
    try {
      console.log('[Migration] Optimizing appLogo from base64...');
      const url = await uploadBase64Image(db.appLogo, 'app_logo');
      db.appLogo = url;
      updated = true;
      console.log('[Migration] appLogo optimized:', url);
    } catch (e) {
      console.error('[Migration] Failed to optimize appLogo:', e);
    }
  }
  
  // 2. Optimize players
  if (db.players && Array.isArray(db.players)) {
    const uploadTasks: { type: 'image' | 'gallery'; playerIndex: number; galleryIndex?: number; base64: string }[] = [];
    
    db.players.forEach((player: any, pIdx: number) => {
      if (player.image && typeof player.image === 'string' && player.image.startsWith('data:image/')) {
        uploadTasks.push({ type: 'image', playerIndex: pIdx, base64: player.image });
      }
      if (player.gallery && Array.isArray(player.gallery)) {
        player.gallery.forEach((item: any, gIdx: number) => {
          if (item.url && typeof item.url === 'string' && item.url.startsWith('data:image/')) {
            uploadTasks.push({ type: 'gallery', playerIndex: pIdx, galleryIndex: gIdx, base64: item.url });
          }
        });
      }
    });
    
    if (uploadTasks.length > 0) {
      console.log(`[Migration] Found ${uploadTasks.length} base64 images to upload to Vercel Blob.`);
      
      const chunkSize = 15;
      for (let i = 0; i < uploadTasks.length; i += chunkSize) {
        const chunk = uploadTasks.slice(i, i + chunkSize);
        console.log(`[Migration] Processing chunk ${i / chunkSize + 1} of ${Math.ceil(uploadTasks.length / chunkSize)}...`);
        
        await Promise.all(chunk.map(async (task) => {
          const playerName = db.players[task.playerIndex]?.name || `Player #${task.playerIndex}`;
          try {
            const prefix = task.type === 'image' ? `player_avatar` : `player_gallery`;
            const url = await uploadBase64Image(task.base64, prefix);
            
            if (task.type === 'image') {
              db.players[task.playerIndex].image = url;
              console.log(`[Migration] Successfully optimized avatar for: ${playerName}`);
            } else if (task.type === 'gallery' && task.galleryIndex !== undefined) {
              db.players[task.playerIndex].gallery[task.galleryIndex].url = url;
              console.log(`[Migration] Successfully optimized gallery photo for: ${playerName}`);
            }
            updated = true;
          } catch (uploadErr) {
            console.error(`[Migration] Failed to upload image for player ${playerName}:`, uploadErr);
          }
        }));
      }
    } else {
      console.log('[Migration] No base64 player images found.');
    }
  }
  
  if (updated) {
    console.log('[Migration] Saving optimized database to disk...');
    const jsonStr = JSON.stringify(db, null, 2);
    
    // Save to local
    fs.writeFileSync(LOCAL_DB_PATH, jsonStr, 'utf-8');
    
    // Save to tmp if exists
    try {
      const tmpDir = path.dirname(TMP_DB_PATH);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(TMP_DB_PATH, jsonStr, 'utf-8');
    } catch (e) {
      console.warn('[Migration] Failed to write to temp path:', e);
    }
    
    console.log('[Migration] Migration complete. New file size:', fs.statSync(LOCAL_DB_PATH).size, 'bytes');
  } else {
    console.log('[Migration] Database is already fully optimized!');
  }
}

runMigration().catch(err => {
  console.error('[Migration] Migration failed with error:', err);
});
