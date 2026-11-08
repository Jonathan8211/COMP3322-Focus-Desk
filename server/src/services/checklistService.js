const { db } = require('../config/database');
const { withUserLock } = require('./transaction');

const positiveId = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const invalidId = () => Object.assign(new Error('ID must be a positive integer.'), { statusCode: 400 });
const notFound = () => Object.assign(new Error('Checklist item not found.'), { statusCode: 404 });
const toItem = (row) => ({ ...row, is_done: Boolean(row.is_done) });

async function assertTaskOwned(connection, taskId, userId, lock = false) {
  const [[task]] = await connection.query(
    `SELECT id FROM tasks WHERE id = ? AND user_id = ?${lock ? ' FOR UPDATE' : ''}`,
    [taskId, userId]
  );
  if (!task) throw notFound();
}

async function getChecklist(connection, taskId) {
  const [rows] = await connection.query(
    'SELECT * FROM task_checklist_items WHERE task_id = ? ORDER BY position ASC, id ASC',
    [taskId]
  );
  const data = rows.map(toItem);
  return { data, summary: { done: data.filter((item) => item.is_done).length, total: data.length } };
}

async function list(userId, rawTaskId) {
  const taskId = positiveId(rawTaskId);
  if (!taskId) throw invalidId();
  await assertTaskOwned(db, taskId, userId);
  return getChecklist(db, taskId);
}

async function create(userId, rawTaskId, title) {
  const taskId = positiveId(rawTaskId);
  if (!taskId) throw invalidId();
  return withUserLock(userId, async (connection) => {
    await assertTaskOwned(connection, taskId, userId, true);
    const [[position]] = await connection.query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM task_checklist_items WHERE task_id = ?',
      [taskId]
    );
    const [result] = await connection.query(
      'INSERT INTO task_checklist_items (task_id, title, position) VALUES (?, ?, ?)',
      [taskId, title, position.next_position]
    );
    const [[item]] = await connection.query('SELECT * FROM task_checklist_items WHERE id = ? AND task_id = ?', [result.insertId, taskId]);
    const { summary } = await getChecklist(connection, taskId);
    return { data: toItem(item), summary };
  });
}

async function update(userId, rawTaskId, rawItemId, changes) {
  const taskId = positiveId(rawTaskId);
  const itemId = positiveId(rawItemId);
  if (!taskId || !itemId) throw invalidId();
  return withUserLock(userId, async (connection) => {
    await assertTaskOwned(connection, taskId, userId, true);
    const [[item]] = await connection.query(
      'SELECT * FROM task_checklist_items WHERE id = ? AND task_id = ? FOR UPDATE',
      [itemId, taskId]
    );
    if (!item) throw notFound();
    await connection.query(
      'UPDATE task_checklist_items SET title = ?, is_done = ? WHERE id = ? AND task_id = ?',
      [changes.title !== undefined ? changes.title : item.title,
        changes.is_done !== undefined ? Number(changes.is_done) : item.is_done,
        itemId, taskId]
    );
    const [[updated]] = await connection.query('SELECT * FROM task_checklist_items WHERE id = ? AND task_id = ?', [itemId, taskId]);
    const { summary } = await getChecklist(connection, taskId);
    return { data: toItem(updated), summary };
  });
}

async function remove(userId, rawTaskId, rawItemId) {
  const taskId = positiveId(rawTaskId);
  const itemId = positiveId(rawItemId);
  if (!taskId || !itemId) throw invalidId();
  return withUserLock(userId, async (connection) => {
    await assertTaskOwned(connection, taskId, userId, true);
    const [[item]] = await connection.query(
      'SELECT id FROM task_checklist_items WHERE id = ? AND task_id = ? FOR UPDATE',
      [itemId, taskId]
    );
    if (!item) throw notFound();
    await connection.query('DELETE FROM task_checklist_items WHERE id = ? AND task_id = ?', [itemId, taskId]);
  });
}

module.exports = { list, create, update, remove };
