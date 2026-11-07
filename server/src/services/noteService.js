const { db } = require("../config/database");

const MAX_NOTES = 100;

const listNotes = async (userId) => {
  const [rows] = await db.query(
    "SELECT id, user_id, title, emoji, content, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return rows;
};

const getNote = async (noteId, userId) => {
  const [[row]] = await db.query(
    "SELECT id, user_id, title, emoji, content, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?",
    [noteId, userId]
  );
  return row || null;
};

const createNote = async (userId, { title = "Untitled", emoji = "📄", content = "" } = {}) => {
  const [[{ count }]] = await db.query(
    "SELECT COUNT(*) AS count FROM notes WHERE user_id = ?",
    [userId]
  );
  if (count >= MAX_NOTES) {
    const err = new Error(`You can have at most ${MAX_NOTES} notes.`);
    err.statusCode = 403;
    err.code = "NOTE_LIMIT";
    throw err;
  }

  const [result] = await db.query(
    "INSERT INTO notes (user_id, title, emoji, content) VALUES (?, ?, ?, ?)",
    [userId, title || "Untitled", emoji || "📄", content || ""]
  );
  return getNote(result.insertId, userId);
};

const updateNote = async (noteId, userId, fields) => {
  const existing = await getNote(noteId, userId);
  if (!existing) {
    const err = new Error("Note not found");
    err.statusCode = 404;
    throw err;
  }

  const updates = [];
  const values = [];
  if (fields.title !== undefined) {
    updates.push("title = ?");
    values.push(fields.title || "Untitled");
  }
  if (fields.emoji !== undefined) {
    updates.push("emoji = ?");
    values.push(fields.emoji || "📄");
  }
  if (fields.content !== undefined) {
    updates.push("content = ?");
    values.push(fields.content || "");
  }
  if (updates.length === 0) return existing;

  values.push(noteId, userId);
  await db.query(
    `UPDATE notes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
    values
  );
  return getNote(noteId, userId);
};

const deleteNote = async (noteId, userId) => {
  const [result] = await db.query(
    "DELETE FROM notes WHERE id = ? AND user_id = ?",
    [noteId, userId]
  );
  if (result.affectedRows === 0) {
    const err = new Error("Note not found");
    err.statusCode = 404;
    throw err;
  }
};

module.exports = { listNotes, getNote, createNote, updateNote, deleteNote };