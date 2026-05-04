const dotenv = require('dotenv');
const path = require('path');
const mysql = require('mysql2/promise');

// Load the backend .env explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
  });

  try {
    console.log('Conectando a DB', process.env.DB_NAME, 'en', process.env.DB_HOST);

    const [users] = await pool.query('SELECT id, username, email FROM users ORDER BY id ASC');
    console.log(`Usuarios encontrados: ${users.length}`);
    for (const u of users) {
      console.log(`- id=${u.id} username=${u.username} email=${u.email}`);
    }

    const [tasksCountRows] = await pool.query('SELECT COUNT(*) AS cnt FROM tasks');
    const totalTasks = tasksCountRows[0]?.cnt || 0;
    console.log(`Total tareas en DB: ${totalTasks}`);

    const [tasks] = await pool.query('SELECT id, user_id, title, description, completed, priority, due_date, project_id, created_at FROM tasks ORDER BY created_at DESC LIMIT 50');
    console.log(`Mostrando hasta 50 tareas recientes (${tasks.length}):`);
    for (const t of tasks) {
      console.log(JSON.stringify(t));
    }

    // show tasks grouped by user id (counts)
    const [group] = await pool.query('SELECT user_id, COUNT(*) AS cnt FROM tasks GROUP BY user_id');
    if (group.length) {
      console.log('Tareas por usuario:');
      for (const g of group) console.log(` user_id=${g.user_id} -> ${g.cnt}`);
    }

    await pool.end();
  } catch (err) {
    console.error('Error en diagnóstico:', err.message || err);
    process.exitCode = 1;
  }
}

main();
