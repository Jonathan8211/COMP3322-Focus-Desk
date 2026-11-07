const rateLimit = require("express-rate-limit");

/**
 * For auth endpoints (login, register).
 * Limit: 10 requests per 15 minutes per IP.
 * Prevents brute-force attacks against passwords.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
});

/**
 * For all general API endpoints.
 * Limit: 100 requests per minute per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again shortly.",
  },
});

module.exports = { authLimiter, apiLimiter };
