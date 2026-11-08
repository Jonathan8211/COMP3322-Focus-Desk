const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

module.exports = async (req, res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ success: false, message: 'Sign in required.' });
  try {
    const claims = jwt.verify(match[1], process.env.JWT_SECRET);
    if (!Number.isInteger(claims.id) || !Number.isInteger(claims.session_version)) {
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }
    const [[user]] = await db.query('SELECT id, session_version FROM users WHERE id = ?', [claims.id]);
    if (!user || user.session_version !== claims.session_version) {
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }
    req.user = { id: user.id };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }
    next(error);
  }
};
