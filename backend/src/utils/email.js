import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import { logger } from './logger.js';

// Lazy transporter: created once, reused for all emails
let _transporter = null;

/**
 * Returns a lazily initialised & verified Nodemailer transporter.
 * The transporter is shared across all email sends to leverage
 * Nodemailer's built-in connection pooling.
 */
function getTransporter() {
  if (!_transporter) {
    const port = Number(env.smtpPort);

    _transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port,

      // Port 465 = SSL/TLS, Port 587 = STARTTLS
      secure: port === 465,

      // Force IPv4 (helps on Render with Gmail SMTP)
      

      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },

      tls: {
      },

      dnsTimeout: 10000,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,

      // Connection timeouts

      logger: true,
      debug: true,
    });
  }

  return _transporter;
}
/**
 * Verifies the SMTP connection at startup by calling transporter.verify().
 * Logs success or a detailed failure so Render logs show exactly what went wrong.
 */
export async function verifySmtpConnection() {
  if (!env.smtpHost || !env.smtpUser) {
    logger.warn('[email] SMTP not configured — transporter verification SKIPPED');
    logger.warn('[email] Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM in environment variables');
    return false;
  }

  try {
    const transporter = getTransporter();
    const success = await transporter.verify();
    logger.info('[email] SMTP transporter verified successfully');
    return true;
  } catch (err) {
    logger.error('[email] SMTP transporter verification FAILED', {
      host: env.smtpHost,
      port: env.smtpPort,
      user: env.smtpUser ? `${env.smtpUser.slice(0, 3)}…` : '(empty)',
      from: env.smtpFrom,
      message: err.message,
      code: err.code,
      responseCode: err.responseCode,
      command: err.command,
      response: err.response,
      stack: err.stack,
    });
    return false;
  }
}

export async function sendInvitationEmail({ to, inviterName, teamName, teamColor, acceptUrl, expiresAt }) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    logger.warn('[email] SMTP not fully configured — cannot send invitation email');
    logger.warn(`[email] Missing: ${!env.smtpHost ? 'SMTP_HOST ' : ''}${!env.smtpUser ? 'SMTP_USER ' : ''}${!env.smtpPass ? 'SMTP_PASS ' : ''}`);
    throw new Error('Email sending is not configured. Contact the system administrator.');
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

  logger.info(`[email] Sending invitation to ${to} for team "${teamName}"`);

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Sprintive" <${env.smtpFrom}>`,
      to,
      subject: `${inviterName} invited you to join ${teamName} on Sprintive`,
      html,
    });

    logger.info(`[email] Invitation sent to ${to} — messageId=${info.messageId}`);
  } catch (err) {
    logger.error('[email] Send invitation FAILED', {
      to,
      team: teamName,
      message: err.message,
      code: err.code,
      responseCode: err.responseCode,
      command: err.command,
      response: err.response,
      stack: err.stack,
    });

    // Map common SMTP errors to user-friendly messages
    if (err.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check SMTP credentials.');
    }
    if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
      throw new Error(`Cannot connect to email server (${env.smtpHost}:${env.smtpPort}). Check SMTP host/port and firewall.`);
    }
    if (err.responseCode === 550) {
      throw new Error(`Email address "${to}" was rejected by the mail server.`);
    }

    throw new Error(`Failed to send invitation email: ${err.message}`);
  }
}
