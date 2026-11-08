const { DateTime } = require('luxon');

const RECURRENCE = ['none', 'daily', 'weekly', 'monthly'];

function computeNextDueDate(dueDate, recurrence, timezone = 'UTC', now = DateTime.now()) {
  if (!RECURRENCE.includes(recurrence) || recurrence === 'none') return null;
  const today = now.setZone(timezone).startOf('day');
  if (!today.isValid) throw new Error('Invalid account time zone.');
  const base = DateTime.fromISO(dueDate || today.toISODate(), { zone: timezone }).startOf('day');
  if (!base.isValid) throw new Error('Invalid task due date.');
  let next;
  if (recurrence === 'daily') {
    const steps = Math.max(1, Math.floor(today.diff(base, 'days').days) + 1);
    next = base.plus({ days: steps });
  } else if (recurrence === 'weekly') {
    const steps = Math.max(1, Math.floor(today.diff(base, 'days').days / 7) + 1);
    next = base.plus({ weeks: steps });
  } else {
    const candidate = (offset) => {
      const month = base.startOf('month').plus({ months: offset });
      return month.set({ day: Math.min(base.day, month.daysInMonth) });
    };
    let offset = Math.max(1, (today.year - base.year) * 12 + today.month - base.month);
    next = candidate(offset);
    while (next <= today) next = candidate(++offset);
  }
  return next.toISODate();
}

async function createNextOccurrence(connection, completedTask, timezone) {
  const recurrence = completedTask.recurrence || 'none';
  if (recurrence === 'none') return null;
  const [[existing]] = await connection.query(
    'SELECT id FROM tasks WHERE recurrence_parent_id = ? AND user_id = ? LIMIT 1',
    [completedTask.id, completedTask.user_id]
  );
  if (existing) return null;
  const nextDue = computeNextDueDate(completedTask.due_date, recurrence, timezone);
  const [result] = await connection.query(
    `INSERT INTO tasks
      (user_id, title, description, status, due_date, priority, kanban_status, project, recurrence, recurrence_parent_id)
     VALUES (?, ?, ?, 'pending', ?, ?, 'todo', ?, ?, ?)`,
    [completedTask.user_id, completedTask.title, completedTask.description || null,
      nextDue, completedTask.priority || 'medium', completedTask.project || null,
      recurrence, completedTask.id]
  );
  await connection.query(
    `INSERT INTO task_checklist_items (task_id, title, is_done, position)
     SELECT ?, title, 0, position FROM task_checklist_items
     WHERE task_id = ? ORDER BY position ASC, id ASC`,
    [result.insertId, completedTask.id]
  );
  const [[row]] = await connection.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [result.insertId, completedTask.user_id]);
  return row;
}

module.exports = { RECURRENCE, computeNextDueDate, createNextOccurrence };
