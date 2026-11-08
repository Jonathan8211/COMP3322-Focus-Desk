const errorHandler = (error, req, res, _next) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This record already exists.' });
  }
  const status = Number(error.statusCode || error.status);
  if (status >= 400 && status < 500) {
    return res.status(status).json({ success: false, message: error.message || 'Request could not be completed.' });
  }
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({ success: false, message: 'Internal server error.' });
};

module.exports = errorHandler;
