// Vercel serverless handler
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const crypto = require('crypto');
const cors = require('cors');

dotenv.config({ path: '../backend/.env' });

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

const app = express();
app.use(cors());
app.use(express.json());

const forgotPasswordRateLimit = new Map();

function checkForgotPasswordLimit(email) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 3;

  if (!forgotPasswordRateLimit.has(email)) {
    forgotPasswordRateLimit.set(email, []);
  }

  const attempts = forgotPasswordRateLimit.get(email);
  const recentAttempts = attempts.filter((t) => now - t < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return false;
  }

  recentAttempts.push(now);
  forgotPasswordRateLimit.set(email, recentAttempts);
  return true;
}

let pool;

async function initDB() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const [rows] = await pool.query('SELECT 1 AS ok');
  if (!rows || rows.length === 0) {
    throw new Error('No se pudo conectar a MySQL');
  }
  return pool;
}

function getPool() {
  return pool;
}

function handleServerError(res, error) {
  console.error(error);

  if (
    error &&
    (error.code === 'ECONNREFUSED' ||
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.code === 'ETIMEDOUT')
  ) {
    return res.status(503).json({
      error: 'No hay conexion con MySQL. Verifica host, puerto y que el servicio este encendido.',
    });
  }

  if (error && error.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(500).json({
      error: 'Credenciales de MySQL invalidas. Revisa backend/.env.',
    });
  }

  if (error && error.code === 'ER_BAD_DB_ERROR') {
    return res.status(500).json({
      error: 'La base de datos no existe. Ejecuta database/script.sql.',
    });
  }

  if (error && error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({
      error: 'Faltan tablas en la base de datos. Ejecuta database/script.sql.',
    });
  }

  return res.status(500).json({ error: 'Error en el servidor' });
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const PORT = process.env.PORT || 3000;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalido' });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ ok: false, error: 'Database not initialized' });
    }
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'ok' });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const token = jwt.sign({ userId: result.insertId, email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'Usuario creado exitosamente', token });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email ya esta registrado' });
    }
    handleServerError(res, error);
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login exitoso', token });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Get Projects
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects WHERE user_id = ?', [req.user.userId]);
    res.json(projects);
  } catch (error) {
    handleServerError(res, error);
  }
});

// Create Project
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
    }

    const [result] = await pool.query(
      'INSERT INTO projects (name, description, user_id) VALUES (?, ?, ?)',
      [name, description || '', req.user.userId]
    );

    res.status(201).json({ id: result.insertId, name, description, user_id: req.user.userId });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Get Tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { project_id, status, priority } = req.query;
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [req.user.userId];

    if (project_id) {
      query += ' AND project_id = ?';
      params.push(project_id);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY created_at DESC';

    const [tasks] = await pool.query(query, params);
    res.json(tasks);
  } catch (error) {
    handleServerError(res, error);
  }
});

// Create Task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, due_date, project_id } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'El titulo es requerido' });
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (title, description, priority, due_date, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || '', priority || 'medium', due_date || null, project_id || null, req.user.userId]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      priority,
      due_date,
      project_id,
      user_id: req.user.userId,
      status: 'pending',
    });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Update Task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, project_id } = req.body;
    const taskId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, project_id = ? WHERE id = ?',
      [title, description, status, priority, due_date, project_id, taskId]
    );

    res.json({ message: 'Tarea actualizada' });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Delete Task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    if (!checkForgotPasswordLimit(email)) {
      return res.status(429).json({
        error: 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.',
      });
    }

    const [users] = await pool.query('SELECT id, email, username FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(200).json({ message: 'Si el email existe, recibiras instrucciones para restablecer tu contraseña.' });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await pool.query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [token, expires.toISOString().slice(0, 19).replace('T', ' '), user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    if (nodemailer) {
      try {
        let transporter;

        if (process.env.SMTP_HOST) {
          transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
          });
        }

        const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f5f1e8; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f1e8; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:18px; box-shadow:0 12px 24px rgba(114,82,24,0.08); overflow:hidden; max-width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:40px 30px; text-align:center;">
              <div style="font-size:48px; margin-bottom:10px;">🔐</div>
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">Recuperacion de contraseña</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">Task Manager</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 16px; color:#21201c; font-size:20px;">Hola, ${user.username || 'usuario'}</h2>
              <p style="margin:0 0 24px; color:#5d5648; font-size:15px; line-height:1.6;">Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el boton de abajo para crear una nueva:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#c24f2a 0%,#96361b 100%); border-radius:12px;">
                    <a href="${resetLink}" target="_blank" style="display:inline-block; padding:16px 32px; color:#ffffff; text-decoration:none; font-weight:700; font-size:16px;">Restablecer mi contraseña</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; color:#5d5648; font-size:14px; text-align:center;">O copia y pega este enlace en tu navegador:</p>
              <p style="margin:0; padding:12px; background-color:#f8f4ed; border:1px solid #dccfb5; border-radius:8px; word-break:break-all; font-size:13px; color:#5d5648; text-align:center;">${resetLink}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 30px; border-top:1px solid #dccfb5;">
              <p style="margin:16px 0 0; color:#897f69; font-size:13px; line-height:1.5;">⏰ Este enlace expirara en <strong>1 hora</strong>. Si no solicitaste este cambio, simplemente ignora este mensaje.</p>
              <p style="margin:16px 0 0; color:#897f69; font-size:12px; text-align:center;">Task Manager © ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        const mailOptions = {
          from: process.env.SMTP_FROM || '"Task Manager" <onboarding@resend.dev>',
          to: user.email,
          subject: '🔐 Recupera tu contraseña - Task Manager',
          text: `Hola ${user.username || 'usuario'},\n\nHemos recibido una solicitud para restablecer tu contraseña.\n\n${resetLink ? `Usa este enlace: ${resetLink}\n\n` : ''}Este enlace expirara en 1 hora. Si no solicitaste este cambio, ignora este mensaje.\n\nTask Manager`,
          html: emailHtml,
        };

        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error('Error sending reset email:', err.message);
      }
    }

    res.json({ message: 'Si el email existe, recibiras instrucciones para restablecer tu contraseña.' });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Token invalido o expirado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Serverless handler
let dbInitialized = false;

module.exports = async (req, res) => {
  if (!dbInitialized) {
    try {
      await initDB();
      dbInitialized = true;
    } catch (err) {
      console.error('DB init error:', err);
      return res.status(503).json({ error: 'Database connection failed' });
    }
  }
  return app(req, res);
};
