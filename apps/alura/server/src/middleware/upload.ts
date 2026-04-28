import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'image/webp') return cb(new Error('Invalid file type'));
    cb(null, true);
  }
});

export default upload;