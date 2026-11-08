require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

const migrations = ['001_core.sql', '002_checklist.sql', '003_daily_entries.sql'];
const migrationsDir = path.join(__dirname, '..', 'migrations');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    dateStrings: true,
    timezone: "Z",
  });
  let locked = false;
  try {
    const [[lock]] = await connection.query("SELECT GET_LOCK('focusdesk_schema_migrations', 30) AS acquired");
    if (lock.acquired !== 1) throw new Error('Could not acquire migration lock');
    locked = true;
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(32) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    for (const file of migrations) {
      const version = file.replace(/\.sql$/, '');
      const [[applied]] = await connection.query('SELECT version FROM schema_migrations WHERE version = ?', [version]);
      if (applied) {
        console.log(`Already applied ${version}`);
        continue;
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
      console.log(`Applied ${version}`);
    }
  } finally {
    if (locked) await connection.query("SELECT RELEASE_LOCK('focusdesk_schema_migrations')");
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
