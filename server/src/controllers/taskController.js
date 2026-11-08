const { DateTime } = require('luxon');
const { db } = require('../config/database');
const { withUserLock } = require('../services/transaction');
const { createNextOccurrence } = require('../services/recurrenceService');

const taskIdFrom = (value) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const notFound = () => Object.assign(new Error('Task not found.'), { statusCode: 404 });
const invalidId = () => Object.assign(new Error('Task ID must be a positive integer.'), { statusCode: 400 });
const invalidProject = () => Object.assign(new Error('Choose one of your projects.'), { statusCode: 400 });

function syncStatusFields(current, input) {
  if (input.kanban_status !== undefined) {
    return { kanbanStatus: input.kanban_status, status: input.kanban_status === 'done' ? 'completed' : 'pending' };
  }
  if (input.status !== undefined) {
    return {
      status: input.status,
      kanbanStatus: input.status === 'completed' ? 'done' : current.kanban_status === 'done' ? 'todo' : current.kanban_status,
    };
  }
  return { status: current.status, kanbanStatus: current.kanban_status };
}

async function assertProjectOwned(connection, userId, project) {
  if (!project) return;
  const [[row]] = await connection.query('SELECT id FROM projects WHERE user_id = ? AND name = ? LIMIT 1', [userId, project]);
  if (!row) throw invalidProject();
}

async function getTimezone(connection, userId) {
  const [[user]] = await connection.query('SELECT timezone FROM users WHERE id = ?', [userId]);
  return user?.timezone || 'UTC';
}

async function withChecklistCounts(connection, tasks) {
  if (!tasks.length) return tasks;
  const [rows] = await connection.query(
    `SELECT task_id, COUNT(*) AS checklist_total,
      COALESCE(SUM(is_done = 1), 0) AS checklist_done
     FROM task_checklist_items WHERE task_id IN (?) GROUP BY task_id`,
    [tasks.map((task) => task.id)]
  );
  const counts = new Map(rows.map((row) => [row.task_id, row]));
  return tasks.map((task) => ({
    ...task,
    checklist_done: Number(counts.get(task.id)?.checklist_done || 0),
    checklist_total: Number(counts.get(task.id)?.checklist_total || 0),
  }));
}

const getAllTasks = async (req, res, next) => {
  try {
    const { page, limit, status, priority, project } = req.validatedQuery;
    const clauses = ['user_id = ?'];
    const params = [req.user.id];
    if (status) { clauses.push('status = ?'); params.push(status); }
    if (priority) { clauses.push('priority = ?'); params.push(priority); }
    if (project) { clauses.push('project = ?'); params.push(project); }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM tasks ${where}`, params);
    const [tasks] = await db.query(
      `SELECT * FROM tasks ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ success: true, data: await withChecklistCounts(db, tasks), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getTaskById = async (req, res, next) => {
  try {
    const taskId = taskIdFrom(req.params.id);
    if (!taskId) throw invalidId();
    const [[task]] = await db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
    if (!task) throw notFound();
    res.json({ success: true, data: (await withChecklistCounts(db, [task]))[0] });
  } catch (error) { next(error); }
};

const getTaskStats = async (req, res, next) => {
  try {
    const timezone = await getTimezone(db, req.user.id);
    const today = DateTime.now().setZone(timezone).toISODate();
    const [[counts]] = await db.query(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(status = 'pending'), 0) AS pending,
        COALESCE(SUM(status = 'completed'), 0) AS completed,
        COALESCE(SUM(status = 'pending' AND due_date < ?), 0) AS overdue
       FROM tasks WHERE user_id = ?`,
      [today, req.user.id]
    );
    const total = Number(counts.total);
    const completed = Number(counts.completed);
    res.json({ success: true, data: {
      total, pending: Number(counts.pending), completed, overdue: Number(counts.overdue),
      completionRate: total ? Math.round(completed * 100 / total) : 0,
    } });
  } catch (error) { next(error); }
};

const createTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, description, due_date, priority, kanban_status, project, recurrence } = req.body;
    const newTask = await withUserLock(userId, async (connection) => {
      const projectName = project || null;
      await assertProjectOwned(connection, userId, projectName);
      const status = kanban_status === 'done' ? 'completed' : 'pending';
      const [result] = await connection.query(
        `INSERT INTO tasks (user_id, title, description, status, due_date, priority, kanban_status, project, recurrence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, description || null, status, due_date || null, priority, kanban_status, projectName, recurrence]
      );
      const [[task]] = await connection.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [result.insertId, userId]);
      return task;
    });
    res.status(201).json({ success: true, data: newTask });
  } catch (error) { next(error); }
};

const updateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const taskId = taskIdFrom(req.params.id);
    if (!taskId) throw invalidId();
    const result = await withUserLock(userId, async (connection) => {
      const [[current]] = await connection.query('SELECT * FROM tasks WHERE id = ? AND user_id = ? FOR UPDATE', [taskId, userId]);
      if (!current) throw notFound();
      const input = req.body;
      const { status, kanbanStatus } = syncStatusFields(current, input);
      const project = input.project !== undefined ? input.project || null : current.project;
      if (input.project !== undefined) await assertProjectOwned(connection, userId, project);
      await connection.query(
        `UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, priority = ?,
           kanban_status = ?, project = ?, recurrence = ? WHERE id = ? AND user_id = ?`,
        [input.title !== undefined ? input.title : current.title,
          input.description !== undefined ? input.description : current.description,
          status, input.due_date !== undefined ? input.due_date : current.due_date,
          input.priority !== undefined ? input.priority : current.priority,
          kanbanStatus, project,
          input.recurrence !== undefined ? input.recurrence : current.recurrence,
          taskId, userId]
      );
      const [[updated]] = await connection.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
      let nextOccurrence = null;
      if (current.status !== 'completed' && updated.status === 'completed' && updated.recurrence !== 'none') {
        const timezone = await getTimezone(connection, userId);
        nextOccurrence = await createNextOccurrence(connection, updated, timezone);
      }
      return { updated, nextOccurrence };
    });
    res.json({ success: true, data: result.updated, nextOccurrence: result.nextOccurrence });
  } catch (error) { next(error); }
};

const deleteTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const taskId = taskIdFrom(req.params.id);
    if (!taskId) throw invalidId();
    await withUserLock(userId, async (connection) => {
      const [[task]] = await connection.query('SELECT id FROM tasks WHERE id = ? AND user_id = ? FOR UPDATE', [taskId, userId]);
      if (!task) throw notFound();
      await connection.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
    });
    res.status(204).send();
  } catch (error) { next(error); }
};

module.exports = { getAllTasks, getTaskById, getTaskStats, createTask, updateTask, deleteTask };
