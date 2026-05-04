require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const sqlPath = path.join(__dirname, '..', 'database', 'migrate_add_columns.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration file not found:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Running migration...');
    const [results] = await connection.query(sql);
    console.log('Migration executed.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
