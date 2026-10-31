import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { supabase } from '../config/supabase.js';
import { HttpError } from '../lib/http-error.js';

export const IMAGE_BUCKET = 'issue-images';

const MAX_DIMENSION_PX = 1280;
const WEBP_QUALITY = 80;

export interface UploadedImage {
  path: string;
  publicUrl: string;
}

/** EXIF-rotate, shrink to fit 1280 px (never enlarge), re-encode as WebP. */
async function normalizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Sharp's default failOn is 'warning', which rejects phone JPEGs with harmless
    // decoder warnings. 'error' still rejects broken files and non-images.
    return await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: MAX_DIMENSION_PX, height: MAX_DIMENSION_PX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    // The MIME type passed Multer's filter but the bytes aren't a readable image.
    const message = 'Photo could not be read as an image';
    throw HttpError.validation(message, [{ field: 'photo', message }]);
  }
}

/** Processes the photo with Sharp and uploads it to the public `issue-images` bucket. */
export async function processAndUploadImage(buffer: Buffer): Promise<UploadedImage> {
  const processed = await normalizeImage(buffer);
  const path = `${randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, processed, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Best-effort cleanup when the database write after an upload fails. */
export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) console.warn(`Could not remove orphaned image ${path}: ${error.message}`);
}
