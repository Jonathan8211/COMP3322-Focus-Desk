/**
 * Global error handling middleware.
 * Must be registered as the LAST middleware in index.js.
 * Catches every error passed through next(err).
 */
const errorHandler = (err, req, res, _next) => {
  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token has expired. Please sign in again." });
  }

  // MySQL duplicate entry
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ success: false, message: "This record already exists." });
  }

  // Log the full error for debugging (server-side only, never exposed to the client)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);

  // Default: 500 Internal Server Error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error. Please try again."
        : err.message,
  });
};

module.exports = errorHandler;
