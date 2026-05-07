const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const crypto = require('crypto');
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // nodemailer is optional; emails will fail if not installed
  nodemailer = null;
}
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting para forgot-password (max 3 solicitudes por email cada 15 min)
const forgotPasswordRateLimit = new Map();

function checkForgotPasswordLimit(email) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos
  const maxAttempts = 3;

  if (!forgotPasswordRateLimit.has(email)) {
    forgotPasswordRateLimit.set(email, []);
  }

  const attempts = forgotPasswordRateLimit.get(email);
  // Limpiar intentos antiguos
  const recentAttempts = attempts.filter((t) => now - t < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return false; // Limitado
  }

  recentAttempts.push(now);
  forgotPasswordRateLimit.set(email, recentAttempts);
  return true;
}

let pool;

function handleServerError(res, error) {
  console.error(error);

  if (
    error &&
    (error.code === 'ECONNREFUSED' ||
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.code === 'ETIMEDOUT')
  ) {
    return res.status(503).json({
      error: 'No hay conexion con MySQL. Verifica host, puerto y que el servicio este encendido.'
    });
  }

  if (error && error.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(500).json({
      error: 'Credenciales de MySQL invalidas. Revisa backend/.env.'
    });
  }

  if (error && error.code === 'ER_BAD_DB_ERROR') {
    return res.status(500).json({
      error: 'La base de datos no existe. Ejecuta database/script.sql.'
    });
  }

  if (error && error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({
      error: 'Faltan tablas en la base de datos. Ejecuta database/script.sql.'
    });
  }

  return res.status(500).json({ error: 'Error en el servidor' });
}

async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('Conectado a MySQL (pool)');
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'El usuario o email ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    handleServerError(res, error);
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    handleServerError(res, error);
  }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // Support search, priority filter and sorting via query params
    const { q, priority, sort, order, page: pageQ, limit: limitQ } = req.query;
    let sqlWhere = 'WHERE user_id = ?';
    const params = [req.user.id];

    if (priority) {
      sqlWhere += ' AND priority = ?';
      params.push(priority);
    }

    if (q) {
      sqlWhere += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
      params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
    }

    const validSort = ['created_at', 'due_date', 'priority'];
    const sortBy = validSort.includes(sort) ? sort : 'created_at';
    const sortOrder = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const page = Math.max(parseInt(pageQ || '1', 10), 1);
    const limit = Math.max(parseInt(limitQ || '50', 10), 1);
    const offset = (page - 1) * limit;

    // total count for pagination
    const countSql = `SELECT COUNT(*) as cnt FROM tasks ${sqlWhere}`;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0]?.cnt || 0;

    const sql = `SELECT * FROM tasks ${sqlWhere} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    const finalParams = params.concat([limit, offset]);

    const [tasks] = await pool.query(sql, finalParams);
    res.json({ tasks, page, limit, total });
  } catch (error) {
    handleServerError(res, error);
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    let { title, description, priority, due_date, project_id } = req.body;
    title = (title || '').toString().trim();
    description = (description || '').toString().trim();

    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    if (title.length > 200) return res.status(400).json({ error: 'Título demasiado largo' });
    const allowedPriorities = ['low', 'medium', 'high'];
    if (priority && !allowedPriorities.includes(priority)) priority = 'medium';
    // normalize due_date (expecting YYYY-MM-DD or ISO)
    if (due_date) {
      const d = new Date(due_date);
      if (isNaN(d)) {
        return res.status(400).json({ error: 'Fecha de vencimiento inválida' });
      }
      due_date = d.toISOString().slice(0, 19).replace('T', ' ');
    } else {
      due_date = null;
    }
    project_id = project_id || null;

    const [result] = await pool.query(
      'INSERT INTO tasks (user_id, title, description, completed, priority, due_date, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || '', false, priority || 'medium', due_date, project_id]
    );

    const [newTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);

    res.status(201).json(newTask[0]);
  } catch (error) {
    handleServerError(res, error);
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let { title, description, completed, priority, due_date, project_id } = req.body;
    title = (title || '').toString().trim();
    description = (description || '').toString().trim();

    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    if (title.length > 200) return res.status(400).json({ error: 'Título demasiado largo' });
    const allowedPriorities = ['low', 'medium', 'high'];
    if (priority && !allowedPriorities.includes(priority)) priority = 'medium';
    if (due_date) {
      const d = new Date(due_date);
      if (isNaN(d)) {
        return res.status(400).json({ error: 'Fecha de vencimiento inválida' });
      }
      due_date = d.toISOString().slice(0, 19).replace('T', ' ');
    } else {
      due_date = null;
    }
    project_id = project_id || null;

    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ?, project_id = ? WHERE id = ?',
      [title, description, completed, priority || 'medium', due_date, project_id, id]
    );

    const [updatedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);

    res.json(updatedTask[0]);
  } catch (error) {
    handleServerError(res, error);
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json({ message: 'Tarea eliminada exitosamente' });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Projects endpoints
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre del proyecto es requerido' });

    const [result] = await pool.query(
      'INSERT INTO projects (user_id, name, description) VALUES (?, ?, ?)',
      [req.user.id, name, description || null]
    );

    const [project] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json(project[0]);
  } catch (error) {
    handleServerError(res, error);
  }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(projects);
  } catch (error) {
    handleServerError(res, error);
  }
});

// Notifications endpoint: tasks due within next 24 hours
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tasks WHERE user_id = ? AND due_date IS NOT NULL AND due_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR) AND completed = 0 ORDER BY due_date ASC",
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    handleServerError(res, error);
  }
});

// Password recovery
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    // Rate limiting
    if (!checkForgotPasswordLimit(email)) {
      return res.status(429).json({
        error: 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.'
      });
    }

    const [users] = await pool.query('SELECT id, email, username FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // No revelar si el email existe
      return res.status(200).json({ message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' });
    }

    const user = users[0];
    // Token criptográficamente seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await pool.query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [token, expires.toISOString().slice(0, 19).replace('T', ' '), user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    let emailSent = false;
    let previewUrl = null;

    if (nodemailer) {
      try {
        let transporter;

        if (process.env.SMTP_HOST) {
          transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
          });
        }

        // Email HTML profesional
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
          <!-- Header con gradiente -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:40px 30px; text-align:center;">
              <div style="font-size:48px; margin-bottom:10px;">🔐</div>
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">Recuperación de contraseña</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">Task Manager</p>
            </td>
          </tr>
          <!-- Contenido -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 16px; color:#21201c; font-size:20px;">Hola, ${user.username || 'usuario'}</h2>
              <p style="margin:0 0 24px; color:#5d5648; font-size:15px; line-height:1.6;">Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
              ${resetLink ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#c24f2a 0%,#96361b 100%); border-radius:12px;">
                    <a href="${resetLink}" target="_blank" style="display:inline-block; padding:16px 32px; color:#ffffff; text-decoration:none; font-weight:700; font-size:16px;">Restablecer mi contraseña</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; color:#5d5648; font-size:14px; text-align:center;">O copia y pega este enlace en tu navegador:</p>
              <p style="margin:0; padding:12px; background-color:#f8f4ed; border:1px solid #dccfb5; border-radius:8px; word-break:break-all; font-size:13px; color:#5d5648; text-align:center;">${resetLink}</p>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 30px 30px; border-top:1px solid #dccfb5;">
              <p style="margin:16px 0 0; color:#897f69; font-size:13px; line-height:1.5;">⏰ Este enlace expirará en <strong>1 hora</strong>. Si no solicitaste este cambio, simplemente ignora este mensaje.</p>
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
          text: `Hola ${user.username || 'usuario'},\n\nHemos recibido una solicitud para restablecer tu contraseña.\n\n${resetLink ? `Usa este enlace: ${resetLink}\n\n` : ''}Este enlace expirará en 1 hora. Si no solicitaste este cambio, ignora este mensaje.\n\nTask Manager`,
          html: emailHtml
        };

        const info = await transporter.sendMail(mailOptions);
        emailSent = true;

        if (nodemailer && info && info.messageId && nodemailer.getTestMessageUrl) {
          previewUrl = nodemailer.getTestMessageUrl(info) || null;
        }
      } catch (err) {
        console.error('Error sending reset email:', err.message);
      }
    }

    res.json({ message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' });
  } catch (error) {
    handleServerError(res, error);
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [users] = await pool.query(
      'SELECT id, password_reset_expires FROM users WHERE password_reset_token = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const user = users[0];
    const expires = new Date(user.password_reset_expires);

    if (isNaN(expires) || expires < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado. Solicita uno nuevo.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [hashed, user.id]
    );

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    handleServerError(res, error);
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Error al conectar con la base de datos:', err);
    process.exit(1);
  });
} else {
  module.exports = { app, initDB, getPool: () => pool };
}
