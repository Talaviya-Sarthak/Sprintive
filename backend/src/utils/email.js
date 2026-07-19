import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  host:   env.smtpHost,
  port:   env.smtpPort,
  secure: env.smtpPort === 465,
  auth:   { user: env.smtpUser, pass: env.smtpPass },
});

export async function sendInvitationEmail({ to, inviterName, teamName, teamColor, acceptUrl, expiresAt }) {
  if (!env.smtpHost || !env.smtpUser) {
    logger.warn('[email] SMTP not configured — skipping invitation email');
    return;
  }

  const expiry = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0B1220;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1220;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="height:4px;background:linear-gradient(90deg,${teamColor ?? '#3B82F6'},#06B6D4);"></td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
            <div style="width:36px;height:36px;background:#3B82F6;border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:18px;font-weight:800;">S</span>
            </div>
            <span style="color:#F8FAFC;font-size:18px;font-weight:700;">Sprintive</span>
          </div>
          <h1 style="color:#F8FAFC;font-size:22px;font-weight:700;margin:0 0 8px;">You're invited to join <span style="color:${teamColor ?? '#3B82F6'};">${teamName}</span></h1>
          <p style="color:#94A3B8;font-size:14px;margin:0 0 32px;line-height:1.6;">
            <strong style="color:#CBD5E1;">${inviterName}</strong> has invited you to collaborate on <strong style="color:#CBD5E1;">${teamName}</strong> on Sprintive.
          </p>
          <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,${teamColor ?? '#3B82F6'},#06B6D4);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;">
            Accept Invitation
          </a>
          <p style="color:#475569;font-size:12px;margin:24px 0 0;">This invitation expires on ${expiry}. If you didn't expect this, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from:    `"Sprintive" <${env.smtpFrom}>`,
      to,
      subject: `${inviterName} invited you to join ${teamName} on Sprintive`,
      html,
    });
    logger.info(`[email] Invitation sent to ${to}`);
  } catch (err) {
    logger.error(`[email] Failed to send to ${to}:`, err.message);
  }
}
