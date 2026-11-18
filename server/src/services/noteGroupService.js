const { db } = require('../config/database');

const notFound = () => Object.assign(new Error('Note group not found'), { statusCode: 404 });

const listGroups = async (userId) => {
  const [rows] = await db.query(
    'SELECT id, name, created_at, updated_at FROM note_groups WHERE user_id = ? ORDER BY name, id',
    [userId]
  );
  return rows;
};

const createGroup = async (userId, name) => {
  const [result] = await db.query('INSERT INTO note_groups (user_id, name) VALUES (?, ?)', [userId, name]);
  const [[row]] = await db.query('SELECT id, name, created_at, updated_at FROM note_groups WHERE id = ? AND user_id = ?', [result.insertId, userId]);
  return row;
};

const renameGroup = async (groupId, userId, name) => {
  const [result] = await db.query('UPDATE note_groups SET name = ? WHERE id = ? AND user_id = ?', [name, groupId, userId]);
  if (!result.affectedRows) throw notFound();
  const [[row]] = await db.query('SELECT id, name, created_at, updated_at FROM note_groups WHERE id = ? AND user_id = ?', [groupId, userId]);
  return row;
};

const deleteGroup = async (groupId, userId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[group]] = await connection.query('SELECT id FROM note_groups WHERE id = ? AND user_id = ? FOR UPDATE', [groupId, userId]);
    if (!group) throw notFound();
    await connection.query('UPDATE notes SET group_id = NULL WHERE user_id = ? AND group_id = ?', [userId, groupId]);
    await connection.query('DELETE FROM note_groups WHERE id = ? AND user_id = ?', [groupId, userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { listGroups, createGroup, renameGroup, deleteGroup };
