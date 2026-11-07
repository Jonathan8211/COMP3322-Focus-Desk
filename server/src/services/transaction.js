const { db } = require("../config/database");

const withUserLock = async (userId, fn) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { withUserLock };
