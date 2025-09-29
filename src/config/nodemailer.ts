import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE, // "gmail"
  auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_SECRET_KEY
  }
});

// Opcional: verificar conexión
transporter.verify()
  .then(() => console.log("Servidor de correo listo (Nodemailer con Gmail)"))
  .catch(err => console.error("Error en conexión SMTP:", err));