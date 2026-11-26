import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = env.SMTP_HOST ? nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE === "true",
  ...(env.SMTP_USER && env.SMTP_PASSWORD ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
}) : null;

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  if (!transporter || !env.SMTP_FROM) throw new Error("SMTP is not configured");
  const url = new URL("/recover", env.PUBLIC_APP_URL);
  url.searchParams.set("token", token);
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Reset password Deep Notes",
    text: `Gunakan tautan ini untuk membuat kata sandi baru. Tautan berlaku 30 menit: ${url.toString()}`,
    html: `<p>Gunakan tautan berikut untuk membuat kata sandi baru. Tautan berlaku 30 menit.</p><p><a href="${url.toString()}">Atur kata sandi baru</a></p>`,
  });
}
