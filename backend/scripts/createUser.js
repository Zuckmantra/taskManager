const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

async function main() {
  const [, , username, email, password] = process.argv;

  if (!username || !email || !password) {
    console.error('Uso: node scripts/createUser.js <username> <email> <password>');
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
  });

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      console.error('Ya existe un usuario con ese email o username.');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    console.log(`Usuario creado correctamente con id ${result.insertId}`);
  } catch (error) {
    console.error('No se pudo crear el usuario.');
    console.error(error.code || error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
