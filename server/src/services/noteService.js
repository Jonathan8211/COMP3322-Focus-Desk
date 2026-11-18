const { db } = require("../config/database");
const { cleanNoteHtml } = require('./noteSanitizer');
const safeNote = (note) => note ? { ...note, content: cleanNoteHtml(note.content) } : null;
const missingGroup = () => Object.assign(new Error('Note group not found'), { statusCode: 404 });

const checkGroup = async (groupId, userId) => {
  if (groupId === null || groupId === undefined) return;
  const [[group]] = await db.query('SELECT id FROM note_groups WHERE id = ? AND user_id = ?', [groupId, userId]);
  if (!group) throw missingGroup();
};

const rejectRemovedGroup = (error) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw missingGroup();
  throw error;
};

const listNotes = async (userId) => {
  const [rows] = await db.query(
    "SELECT id, user_id, group_id, title, emoji, content, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return rows.map(safeNote);
};

const getNote = async (noteId, userId) => {
  const [[row]] = await db.query(
    "SELECT id, user_id, group_id, title, emoji, content, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?",
    [noteId, userId]
  );
  return safeNote(row);
};

const createNote = async (userId, { title = "Untitled", emoji = "📄", content = "", group_id = null } = {}) => {
  await checkGroup(group_id, userId);
  let result;
  try {
    [result] = await db.query(
      "INSERT INTO notes (user_id, group_id, title, emoji, content) VALUES (?, ?, ?, ?, ?)",
      [userId, group_id, title, emoji, cleanNoteHtml(content)]
    );
  } catch (error) { rejectRemovedGroup(error); }
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
    values.push(fields.title);
  }
  if (fields.emoji !== undefined) {
    updates.push("emoji = ?");
    values.push(fields.emoji || "📄");
  }
  if (fields.content !== undefined) {
    updates.push("content = ?");
    values.push(cleanNoteHtml(fields.content));
  }
  if (fields.group_id !== undefined) {
    await checkGroup(fields.group_id, userId);
    updates.push('group_id = ?');
    values.push(fields.group_id);
  }
  if (updates.length === 0) return existing;

  values.push(noteId, userId);
  try {
    await db.query(`UPDATE notes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, values);
  } catch (error) { rejectRemovedGroup(error); }
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
