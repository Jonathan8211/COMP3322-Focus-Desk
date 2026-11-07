const { db } = require("../config/database");
const { withUserLock } = require("../services/transaction");
const { createNextOccurrence } = require("../services/recurrenceService");

const sendServerError = (res, error) => {
  return res.status(500).json({ success: false, message: error.message });
};

const VALID_STATUS = ["pending", "completed"];

const syncStatusFields = (current, { status, kanban_status }) => {
  let nextStatus = status !== undefined ? status : current.status;
  let nextKanban = kanban_status !== undefined ? kanban_status : current.kanban_status;

  if (status !== undefined && kanban_status === undefined) {
    if (status === "completed") nextKanban = "done";
    else if (current.kanban_status === "done") nextKanban = "todo";
  }

  if (kanban_status !== undefined && status === undefined) {
    nextStatus = kanban_status === "done" ? "completed" : "pending";
  }

  return { nextStatus, nextKanban };
};

const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let where = "WHERE user_id = ?";
    let params = [userId];
    if (status && VALID_STATUS.includes(status)) {
      where += " AND status = ?";
      params.push(status);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tasks ${where}`,
      params
    );

    const [tasks] = await db.query(
      `SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, due_date, priority, kanban_status, project, recurrence } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const newTask = await withUserLock(userId, async (conn) => {

      const initialKanban = kanban_status || "todo";
      const initialStatus = initialKanban === "done" ? "completed" : "pending";
      const initialRecurrence = recurrence || "none";

      const [result] = await conn.query(
        `INSERT INTO tasks
          (user_id, title, description, status, due_date, priority, kanban_status, project, recurrence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          title,
          description || null,
          initialStatus,
          due_date || null,
          priority || "medium",
          initialKanban,
          project || null,
          initialRecurrence,
        ]
      );
      const [rows] = await conn.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]);
      return rows[0];
    });

    res.status(201).json({ success: true, message: "Task created successfully", data: newTask });
  } catch (error) {
    return sendServerError(res, error);
  }
};

const updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { title, description, status, due_date, priority, kanban_status, project, recurrence } =
      req.body;

    const [rows] = await db.query(
      "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      [taskId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const current = rows[0];
    const { nextStatus, nextKanban } = syncStatusFields(current, { status, kanban_status });
    const nextRecurrence = recurrence !== undefined ? recurrence : current.recurrence || "none";
    const wasPending = current.status !== "completed";
    const becomingCompleted = wasPending && nextStatus === "completed";

    const { updated, nextOccurrence } = await withUserLock(userId, async (conn) => {
      await conn.query(
        `UPDATE tasks SET
          title = ?, description = ?, status = ?, due_date = ?, priority = ?,
          kanban_status = ?, project = ?, recurrence = ?
         WHERE id = ? AND user_id = ?`,
        [
          title || current.title,
          description !== undefined ? description : current.description,
          nextStatus,
          due_date !== undefined ? due_date : current.due_date,
          priority || current.priority,
          nextKanban,
          project !== undefined ? project : current.project,
          nextRecurrence,
          taskId,
          userId,
        ]
      );

      const [[row]] = await conn.query(
        "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
        [taskId, userId]
      );

      let spawned = null;
      if (becomingCompleted && (row.recurrence || "none") !== "none") {
        spawned = await createNextOccurrence(conn, row);
      }

      return { updated: row, nextOccurrence: spawned };
    });

    res.json({
      success: true,
      message: "Task updated successfully",
      data: updated,
      nextOccurrence: nextOccurrence || null,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const [existing] = await db.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [
      taskId,
      userId,
    ]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await db.query("DELETE FROM tasks WHERE id = ?", [taskId]);
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    return sendServerError(res, error);
  }
};

module.exports = { getAllTasks, createTask, updateTask, deleteTask };
