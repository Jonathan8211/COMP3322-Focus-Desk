const RECURRENCE = ["none", "daily", "weekly", "monthly"];

const toDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

const parseDate = (value) => {
  const key = toDateOnly(value);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const stepDate = (date, recurrence) => {
  const next = new Date(date.getTime());
  if (recurrence === "daily") next.setDate(next.getDate() + 1);
  else if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
};

/** Next due date strictly after today (at least one recurrence step from base). */
const computeNextDueDate = (dueDate, recurrence) => {
  if (!RECURRENCE.includes(recurrence) || recurrence === "none") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor = parseDate(dueDate) || new Date(today.getTime());
  cursor = stepDate(cursor, recurrence);

  let guard = 0;
  while (cursor <= today && guard < 400) {
    cursor = stepDate(cursor, recurrence);
    guard += 1;
  }

  return formatDate(cursor);
};

const createNextOccurrence = async (conn, completedTask) => {
  const recurrence = completedTask.recurrence || "none";
  if (recurrence === "none") return null;

  const nextDue = computeNextDueDate(completedTask.due_date, recurrence);

  const [result] = await conn.query(
    `INSERT INTO tasks
      (user_id, title, description, status, due_date, priority, kanban_status, project, recurrence)
     VALUES (?, ?, ?, 'pending', ?, ?, 'todo', ?, ?)`,
    [
      completedTask.user_id,
      completedTask.title,
      completedTask.description || null,
      nextDue,
      completedTask.priority || "medium",
      completedTask.project || null,
      recurrence,
    ]
  );

  const [[row]] = await conn.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]);
  return row || null;
};

module.exports = {
  RECURRENCE,
  computeNextDueDate,
  createNextOccurrence,
  toDateOnly,
};
