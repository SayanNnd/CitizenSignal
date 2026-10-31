import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { supabase } from '../config/supabase.js';

const BUCKET = 'issue-images';

/**
 * EXIF-rotate, resize to max 1280 px, convert to WebP, upload to Supabase Storage.
 * Returns the public URL.
 */
export async function processAndUploadImage(buffer: Buffer): Promise<string> {
  const processed = await sharp(buffer)
    .rotate() // apply EXIF orientation
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const filename = `${randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, processed, { contentType: 'image/webp', upsert: false });

  if (error) {
    throw Object.assign(new Error(`Image upload failed: ${error.message}`), { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
