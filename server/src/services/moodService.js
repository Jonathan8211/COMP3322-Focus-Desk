const { db } = require('../config/database');
const { withUserLock } = require('./transaction');
const entries = require('./dailyEntryService');
const model = require('./moodModel');

const notFound = () => model.safeError(404, 'Journal entry not found.');
const stale = () => model.safeError(409, 'The saved journal changed. Review it and try again.');
const actionFor = (score) => score < 60 ? 'comfort_all_five' : score > 85 ? 'celebrate_selected' : 'normal';
const output = (row, date) => ({
  entryId: row.daily_entry_id,
  localDate: date,
  sourceVersion: row.source_version,
  score: row.score,
  label: row.label,
  responseText: row.response_text,
  petAction: actionFor(row.score),
  analyzedAt: row.analyzed_at instanceof Date ? row.analyzed_at.toISOString() : String(row.analyzed_at),
});

async function get(userId, date) {
  const entry = await entries.get(userId, date);
  const [[row]] = await db.query(
    'SELECT daily_entry_id, source_version, score, label, response_text, analyzed_at FROM daily_mood_assessments WHERE user_id = ? AND daily_entry_id = ?',
    [userId, entry.id]
  );
  return row && row.source_version === entry.contentVersion
    ? { status: 'analyzed', data: output(row, date) }
    : { status: row ? 'stale' : 'not_analyzed', data: null };
}

async function remove(userId, date) {
  const entry = await entries.get(userId, date);
  await db.query('DELETE FROM daily_mood_assessments WHERE user_id = ? AND daily_entry_id = ?', [userId, entry.id]);
}

async function analyze(userId, date, payload, signal) {
  const entry = await entries.get(userId, date);
  if (entry.id !== payload.entryId || entry.contentVersion !== payload.contentVersion) throw stale();
  const text = payload.excerpt === undefined ? entry.journal_text : payload.excerpt;
  if (!text.trim() || text.length > 12000 || (payload.excerpt !== undefined && !entry.journal_text.includes(text))) {
    throw model.safeError(400, 'Choose text from the saved journal to analyze.');
  }
  const result = await model.analyze(text, signal);
  if (signal?.aborted) throw model.safeError(503, 'Mood analysis was cancelled. Please try again.');
  return withUserLock(userId, async (connection) => {
    if (signal?.aborted) throw model.safeError(503, 'Mood analysis was cancelled. Please try again.');
    const current = await entries.get(userId, date, connection).catch((error) => { if (error.statusCode === 404) throw stale(); throw error; });
    if (current.id !== entry.id || current.contentVersion !== payload.contentVersion) throw stale();
    await connection.query(
      `INSERT INTO daily_mood_assessments (user_id, daily_entry_id, source_version, score, label, response_text, model_id)
       VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
       source_version=VALUES(source_version), score=VALUES(score), label=VALUES(label), response_text=VALUES(response_text), model_id=VALUES(model_id), analyzed_at=CURRENT_TIMESTAMP`,
      [userId, entry.id, entry.contentVersion, result.score, result.label, result.responseText, result.modelId]
    );
    return { entryId: entry.id, localDate: date, sourceVersion: entry.contentVersion,
      score: result.score, label: result.label, responseText: result.responseText,
      petAction: actionFor(result.score), analyzedAt: new Date().toISOString() };
  });
}

module.exports = { get, remove, analyze, actionFor, notFound };
