import multer from 'multer';
import { HttpError } from '../lib/http-error.js';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Receives the single `photo` file in memory; Sharp re-encodes it before storage. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
    fields: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const message = 'Photo must be a JPEG, PNG or WebP image';
      cb(HttpError.validation(message, [{ field: 'photo', message }]));
    }
  },
});
