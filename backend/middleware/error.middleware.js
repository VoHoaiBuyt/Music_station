function errorHandler(err, req, res, next) {
  console.error('[Error Handler]:', err);

  const status = err.statusCode || 500;
  const message = err.message || 'Đã có lỗi xảy ra trên hệ thống!';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
