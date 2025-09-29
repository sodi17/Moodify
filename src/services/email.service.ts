// src/services/email.service.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE, // ej: 'gmail'
  auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_SECRET_KEY,
  },
});

/**
 * Envía un correo electrónico
 * @param to - Dirección del destinatario
 * @param subject - Asunto del correo
 * @param html - Contenido en formato HTML
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const mailOptions = {
      from: `"Moodify 🎵" <${process.env.MAILER_EMAIL}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error enviando correo:", error);
    throw new Error("No se pudo enviar el correo.");
  }
};
