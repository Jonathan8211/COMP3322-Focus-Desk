const { db } = require("../config/database");
const { withUserLock } = require("./transaction");

const getProjectsByUser = async (userId) => {
  const [projects] = await db.query(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC, id DESC",
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
  return withUserLock(userId, async (conn) => {
    const [[project]] = await conn.query(
      "SELECT id, name FROM projects WHERE id = ? AND user_id = ? FOR UPDATE",
      [projectId, userId]
    );
    if (!project) {
      const error = new Error("Project not found");
      error.statusCode = 404;
      throw error;
    }
    await conn.query(
      "UPDATE tasks SET project = NULL WHERE user_id = ? AND project = ?",
      [userId, project.name]
    );
    await conn.query("DELETE FROM projects WHERE id = ? AND user_id = ?", [project.id, userId]);
  });
};

module.exports = { getProjectsByUser, createProject, deleteProject };
