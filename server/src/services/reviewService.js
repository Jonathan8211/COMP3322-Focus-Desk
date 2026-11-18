const { createHash } = require('node:crypto');
const { DateTime } = require('luxon');
const { db } = require('../config/database');
const { contentVersion } = require('./dailyEntryService');
const reviewModel = require('./reviewModel');
const MAX_SOURCE_BYTES = 48000;
const MAX_COMPLETION_EVENTS = 250;

const failure = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const asUtc = (value) => DateTime.fromSQL(String(value), { zone: 'utc' });
const utcSql = (value) => value.toUTC().toFormat('yyyy-MM-dd HH:mm:ss.SSS');

function scopeFrom(review) {
  const moods = review.facts.diaryEntries.filter((entry) => entry.mood).map((entry) => ({ date: entry.localDate, score: entry.mood.score }));
  const firstMood = moods[0];
  const lastMood = moods.at(-1);
  return {
    period: review.period, relation: review.relation,
    startLocal: review.startLocal, endExclusiveLocal: review.endExclusiveLocal,
    moodMovement: moods.length < 2 ? 'insufficient_for_change'
      : lastMood.score > firstMood.score ? 'later_higher' : lastMood.score < firstMood.score ? 'later_lower' : 'same_endpoints',
    completedEvents: review.facts.completedEvents.map((event) => ({
      id: event.id, currentTitle: event.currentTitle, completedLocalDate: event.completedLocalDate,
    })),
    diaryEntries: review.facts.diaryEntries.map((entry) => ({
      entryId: entry.id, localDate: entry.localDate, journalText: entry.journalText, mood: entry.mood,
    })),
  };
}

function sourceStatusFor(scope) {
  const bytes = Buffer.byteLength(JSON.stringify(scope), 'utf8');
  const reasons = [];
  if (scope.completedEvents.length > MAX_COMPLETION_EVENTS) reasons.push('too_many_completions');
  if (bytes > MAX_SOURCE_BYTES) reasons.push('too_much_text');
  const moodEntries = scope.diaryEntries.filter((entry) => entry.mood);
  return {
    ready: reasons.length === 0, reasons, bytes, maxBytes: MAX_SOURCE_BYTES,
    maxCompletionEvents: MAX_COMPLETION_EVENTS,
    counts: { completedEvents: scope.completedEvents.length, journalEntries: scope.diaryEntries.length, moodScores: moodEntries.length },
    // The all-or-nothing policy makes every item explicit when capacity is exceeded.
    unableToInclude: reasons.length ? {
      completedEvents: scope.completedEvents.length,
      completionDates: [...new Set(scope.completedEvents.map((event) => event.completedLocalDate))],
      journalDates: scope.diaryEntries.map((entry) => entry.localDate),
      moodDates: moodEntries.map((entry) => entry.localDate),
    } : null,
  };
}

function periodWindow(period, anchor, timezone) {
  if (!['week', 'month'].includes(period)) throw failure(400, 'Choose a week or month.');
  const checked = DateTime.fromISO(anchor || '', { zone: 'utc' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor || '') || !checked.isValid || checked.toISODate() !== anchor) {
    throw failure(400, 'Anchor must be a valid YYYY-MM-DD date.');
  }
  const local = DateTime.fromISO(anchor, { zone: timezone });
  if (!local.isValid) throw failure(400, 'Account time zone is invalid.');
  const start = local.startOf(period);
  const end = period === 'week' ? start.plus({ weeks: 1 }) : start.plus({ months: 1 });
  return {
    period, anchor, timezone,
    startLocal: start.toISODate(), endExclusiveLocal: end.toISODate(),
    startUtc: start.toUTC().toISO(), endExclusiveUtc: end.toUTC().toISO(),
    startSql: utcSql(start), endSql: utcSql(end),
  };
}

async function factsFor(userId, period, anchor) {
  const [[user]] = await db.query('SELECT timezone FROM users WHERE id = ?', [userId]);
  if (!user) throw failure(401, 'Sign in required.');
  const window = periodWindow(period, anchor, user.timezone);
  const localToday = DateTime.now().setZone(user.timezone).toISODate();
  const relation = localToday < window.startLocal ? 'future'
    : localToday >= window.endExclusiveLocal ? 'past' : 'current';
  const [eventRows] = await db.query(
    `SELECT e.id, e.task_id, e.completed_at, t.title
     FROM task_completion_events e LEFT JOIN tasks t ON t.id = e.task_id AND t.user_id = e.user_id
     WHERE e.user_id = ? AND e.completed_at >= ? AND e.completed_at < ?
     ORDER BY e.completed_at, e.id`,
    [userId, window.startSql, window.endSql]
  );
  const completedEvents = eventRows.map((row) => {
    const instant = asUtc(row.completed_at);
    return { id: Number(row.id), taskId: row.task_id, currentTitle: row.title || null,
      completedAtUtc: instant.toISO(), completedLocalDate: instant.setZone(user.timezone).toISODate() };
  });
  const [[pending]] = await db.query(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(due_date >= ? AND due_date < ?), 0) AS dueInPeriod,
       COALESCE(SUM(due_date < ?), 0) AS overdueNow
     FROM tasks WHERE user_id = ? AND status = 'pending'`,
    [window.startLocal, window.endExclusiveLocal, DateTime.now().setZone(user.timezone).toISODate(), userId]
  );
  const [diaryRows] = await db.query(
    `SELECT d.id, d.local_date, d.journal_text, d.reflection_text,
       m.score, m.label, m.source_version
     FROM daily_entries d LEFT JOIN daily_mood_assessments m
       ON m.daily_entry_id = d.id AND m.user_id = d.user_id
     WHERE d.user_id = ? AND d.local_date >= ? AND d.local_date < ?
     ORDER BY d.local_date`,
    [userId, window.startLocal, window.endExclusiveLocal]
  );
  const diaryEntries = diaryRows.map((row) => {
    const version = contentVersion(row);
    return { id: row.id, localDate: row.local_date, contentVersion: version,
      journalText: row.journal_text, hasReflection: Boolean(row.reflection_text),
      mood: row.source_version === version && row.score !== null
        ? { score: Number(row.score), label: row.label } : null };
  });
  const [[unknown]] = await db.query(
    `SELECT COUNT(*) AS count FROM tasks t
     WHERE t.user_id = ? AND t.status = 'completed'
       AND NOT EXISTS (SELECT 1 FROM task_completion_events e WHERE e.user_id = t.user_id AND e.task_id = t.id)`,
    [userId]
  );
  const [[migration]] = await db.query("SELECT applied_at FROM schema_migrations WHERE version = '005_task_completion_events'");
  const trackingSinceUtc = migration ? asUtc(migration.applied_at).toISO() : null;
  const facts = {
    completedEventCount: completedEvents.length, completedEvents,
    pendingNow: Number(pending.total), pendingDueInPeriod: Number(pending.dueInPeriod),
    overdueNow: Number(pending.overdueNow), diaryDays: diaryEntries.length,
    diaryEntries,
  };
  const coverage = {
    trackingSinceUtc, unknownCompletedTaskCount: Number(unknown.count),
    windowIncludesUntrackedHistory: !trackingSinceUtc || DateTime.fromISO(window.startUtc) < DateTime.fromISO(trackingSinceUtc),
    note: 'Completion dates are recorded only from event tracking onward. Older completed tasks without events have unknown completion dates.',
  };
  const review = { period, anchor, relation, startLocal: window.startLocal, endExclusiveLocal: window.endExclusiveLocal,
    startUtc: window.startUtc, endExclusiveUtc: window.endExclusiveUtc, facts, coverage };
  return { ...review, sourceStatus: sourceStatusFor(scopeFrom(review)) };
}

async function prepareScope(userId, period, anchor) {
  const review = await factsFor(userId, period, anchor);
  const scope = scopeFrom(review);
  if (!review.sourceStatus.ready) return { ...review, scope: null, scopeDigest: null };
  const scopeDigest = createHash('sha256').update(JSON.stringify({ userId, review, scope })).digest('hex');
  return { ...review, scope, scopeDigest };
}

async function generate(userId, period, request, signal) {
  const prepared = await prepareScope(userId, period, request.anchor);
  if (!prepared.sourceStatus.ready) throw failure(413, 'All records cannot fit in one review. No records were sent.');
  if (request.consent?.provider !== 'deepseek' || request.consent.approved !== true ||
      request.consent.scopeDigest !== prepared.scopeDigest) {
    throw failure(409, 'Review the current sending preview and confirm again.');
  }
  let result;
  try { result = await reviewModel.generate(prepared.scope, signal); }
  catch (error) {
    if (error.isModelError) error.fallback = { facts: prepared.facts, coverage: prepared.coverage, reviewText: null };
    throw error;
  }
  if (signal?.aborted) throw failure(503, 'Review generation was cancelled.');
  const current = await prepareScope(userId, period, request.anchor);
  if (current.scopeDigest !== prepared.scopeDigest) throw failure(409, 'Review sources changed. Refresh the preview.');
  return { period, startLocal: current.startLocal, endExclusiveLocal: current.endExclusiveLocal,
    facts: current.facts, coverage: current.coverage, reviewText: result.reviewText,
    sourceStatus: current.sourceStatus,
    sourceEventIds: current.scope.completedEvents.map((event) => event.id),
    sourceDates: current.scope.diaryEntries.map((entry) => entry.localDate),
    evidence: result.evidence, generatedAt: new Date().toISOString() };
}

module.exports = { periodWindow, factsFor, prepareScope, generate, sourceStatusFor };
