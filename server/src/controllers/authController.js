const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { db } = require('../config/database');

const REFRESH_DAYS = 7;
const COOKIE_NAME = 'refreshToken';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
};
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const publicUser = ({ id, name, email, timezone }) => ({ id, name, email, timezone });
const accessTokenFor = (user) => jwt.sign(
  { id: user.id, session_version: user.session_version },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
const newRefresh = () => {
  const raw = crypto.randomBytes(40).toString('hex');
  return { raw, hash: hashToken(raw), expires: new Date(Date.now() + REFRESH_DAYS * 86400000) };
};
const setRefreshCookie = (res, raw) => res.cookie(COOKIE_NAME, raw, cookieOptions);
const clearRefreshCookie = (res) => res.clearCookie(COOKIE_NAME, {
  httpOnly: cookieOptions.httpOnly,
  secure: cookieOptions.secure,
  sameSite: cookieOptions.sameSite,
  path: cookieOptions.path,
});

async function withLockedUser(userId, fn) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[user]] = await connection.query('SELECT id, name, email, timezone, session_version FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!user) {
      await connection.rollback();
      return null;
    }
    const result = await fn(connection, user);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

const register = async (req, res, next) => {
  try {
    const { name, email, password, timezone } = req.body;
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Email is already registered.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, timezone) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, timezone]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name, email, timezone } });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [[account]] = await db.query('SELECT id, password FROM users WHERE email = ?', [email]);
    if (!account || !(await bcrypt.compare(password, account.password))) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }
    const result = await withLockedUser(account.id, async (connection, user) => {
      const sessionVersion = user.session_version + 1;
      const refresh = newRefresh();
      await connection.query('UPDATE users SET session_version = ? WHERE id = ?', [sessionVersion, user.id]);
      await connection.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
      await connection.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, refresh.hash, refresh.expires]
      );
      return { user: { ...user, session_version: sessionVersion }, refresh: refresh.raw };
    });
    if (!result) return res.status(401).json({ success: false, message: 'Account unavailable.' });
    setRefreshCookie(res, result.refresh);
    res.json({ success: true, data: { token: accessTokenFor(result.user), user: publicUser(result.user) } });
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw) return res.status(401).json({ success: false, message: 'Session unavailable.' });
    const hash = hashToken(raw);
    const [[candidate]] = await db.query('SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP()', [hash]);
    if (!candidate) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }
    const result = await withLockedUser(candidate.user_id, async (connection, user) => {
      const [[stored]] = await connection.query(
        'SELECT id FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > UTC_TIMESTAMP() FOR UPDATE',
        [user.id, hash]
      );
      if (!stored) return null;
      const replacement = newRefresh();
      await connection.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
      await connection.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, replacement.hash, replacement.expires]
      );
      return { user, refresh: replacement.raw };
    });
    if (!result) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }
    setRefreshCookie(res, result.refresh);
    res.json({ success: true, data: { token: accessTokenFor(result.user) } });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (raw) {
      const hash = hashToken(raw);
      const [[candidate]] = await db.query('SELECT user_id FROM refresh_tokens WHERE token_hash = ?', [hash]);
      if (candidate) {
        await withLockedUser(candidate.user_id, async (connection, user) => {
          const [[stored]] = await connection.query('SELECT id FROM refresh_tokens WHERE user_id = ? AND token_hash = ? FOR UPDATE', [user.id, hash]);
          if (stored) {
            await connection.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
            await connection.query('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [user.id]);
          }
        });
      }
    }
    clearRefreshCookie(res);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const [[user]] = await db.query('SELECT id, name, email, timezone FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(401).json({ success: false, message: 'Session unavailable.' });
    res.json({ success: true, data: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const fields = [];
    const values = [];
    for (const key of ['name', 'timezone']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...values, req.user.id]);
    const [[user]] = await db.query('SELECT id, name, email, timezone FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, data: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshAccessToken, logout, getMe, updateMe };
