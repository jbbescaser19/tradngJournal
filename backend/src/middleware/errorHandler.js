import multer from 'multer';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let status = error.status || 500;
  let message = error.message || 'Something went wrong.';
  if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE'
      ? `Image is too large. Maximum upload size is ${process.env.MAX_UPLOAD_MB || 10} MB.`
      : error.message;
  }
  if (error.name === 'ValidationError') {
    status = 400;
    message = Object.values(error.errors).map((item) => item.message).join(' ');
  }
  if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid trade ID or field value.';
  }

  if (status >= 500) console.error(error);
  res.status(status).json({ message });
}
