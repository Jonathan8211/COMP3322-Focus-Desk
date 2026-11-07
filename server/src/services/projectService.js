const { db } = require("../config/database");
const { withUserLock } = require("./transaction");

const getProjectsByUser = async (userId) => {
  const [projects] = await db.query(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return projects;
};

const createProject = async (userId, name, color) => {
  return withUserLock(userId, async (conn) => {
    const [result] = await conn.query(
      "INSERT INTO projects (user_id, name, color) VALUES (?, ?, ?)",
      [userId, name, color]
    );
    const [project] = await conn.query("SELECT * FROM projects WHERE id = ?", [result.insertId]);
    return project[0];
  });
};

const deleteProject = async (projectId, userId) => {
  await db.query(
    "UPDATE tasks SET project = NULL WHERE project = (SELECT name FROM projects WHERE id = ?)",
    [projectId]
  );
  await db.query("DELETE FROM projects WHERE id = ? AND user_id = ?", [projectId, userId]);
};

module.exports = { getProjectsByUser, createProject, deleteProject };
