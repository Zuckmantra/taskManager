require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Task Manager <no-reply@example.com>',
    to: process.env.SMTP_TEST_TO || process.env.SMTP_USER,
    subject: 'Prueba SMTP - TaskManager',
    text: 'Este es un correo de prueba desde TaskManager usando Resend/SMTP.',
  });

  console.log('Enviado:', info.messageId || info);
  if (nodemailer.getTestMessageUrl) {
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }
}

main().catch(err => {
  console.error('Error enviando email de prueba:', err);
  process.exit(1);
});
