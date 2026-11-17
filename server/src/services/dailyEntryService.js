const { db } = require('../config/database');
const { withUserLock } = require('./transaction');
const { createHash } = require('node:crypto');

const notFound = () => Object.assign(new Error('Journal entry not found.'), { statusCode: 404 });
const timestamp = (value) => value ? new Date(`${String(value).replace(' ', 'T')}Z`).toISOString() : null;
const contentVersion = (row) => createHash('sha256').update(JSON.stringify([row.journal_text, row.reflection_text])).digest('hex');
const normalize = (row) => row ? {
  ...row,
  contentVersion: contentVersion(row),
  created_at: timestamp(row.created_at),
  updated_at: timestamp(row.updated_at),
} : null;

async function list(userId, from, to) {
  const [rows] = await db.query(
    `SELECT id, local_date, journal_text, reflection_text, created_at, updated_at
     FROM daily_entries WHERE user_id = ? AND local_date BETWEEN ? AND ?
     ORDER BY local_date DESC`,
    [userId, from, to]
  );
  return rows.map(normalize);
}

async function get(userId, date, connection = db) {
  const [[row]] = await connection.query(
    `SELECT id, local_date, journal_text, reflection_text, created_at, updated_at
     FROM daily_entries WHERE user_id = ? AND local_date = ?`,
    [userId, date]
  );
  if (!row) throw notFound();
  return normalize(row);
}

async function save(userId, date, { journal_text, reflection_text }) {
  return withUserLock(userId, async (connection) => {
    const [[existing]] = await connection.query(
      'SELECT id, journal_text, reflection_text FROM daily_entries WHERE user_id = ? AND local_date = ? FOR UPDATE',
      [userId, date]
    );
    await connection.query(
      `INSERT INTO daily_entries (user_id, local_date, journal_text, reflection_text)
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE
       journal_text = VALUES(journal_text), reflection_text = VALUES(reflection_text)`,
      [userId, date, journal_text, reflection_text]
    );
    if (existing && (existing.journal_text !== journal_text || existing.reflection_text !== reflection_text)) {
      await connection.query('DELETE FROM daily_mood_assessments WHERE user_id = ? AND daily_entry_id = ?', [userId, existing.id]);
    }
    return { created: !existing, data: await get(userId, date, connection) };
  });
}

async function remove(userId, date) {
  const [result] = await db.query('DELETE FROM daily_entries WHERE user_id = ? AND local_date = ?', [userId, date]);
  if (!result.affectedRows) throw notFound();
}

module.exports = { list, get, save, remove, contentVersion };
