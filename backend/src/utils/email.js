import { env } from '../config/env.js';
import { logger } from './logger.js';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'api-key': env.brevoApiKey,
  };
}

export async function verifySmtpConnection() {
  if (!env.brevoApiKey) {
    logger.warn('[email] Brevo API key not configured — verification SKIPPED');
    logger.warn('[email] Set BREVO_API_KEY, BREVO_SENDER_EMAIL in environment variables');
    return false;
  }

  try {
    const response = await fetch(`${BREVO_API_BASE}/account`, {
      method: 'GET',
      headers: getHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      logger.error('[email] Brevo API verification FAILED', {
        status: response.status,
        statusText: response.statusText,
        message: body.message || 'Unknown error',
        code: body.code,
      });
      return false;
    }

    logger.info('[email] Brevo API connection verified successfully');
    return true;
  } catch (err) {
    logger.error('[email] Brevo API verification error', {
      message: err.message,
      code: err.cause?.code || err.code,
    });
    return false;
  }
}

export async function sendInvitationEmail({ to, inviterName, teamName, teamColor, acceptUrl, expiresAt }) {
  if (!env.brevoApiKey) {
    logger.warn('[email] Brevo API key not configured — cannot send invitation email');
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
    const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        sender: {
          name: env.brevoSenderName,
          email: env.brevoSenderEmail,
        },
        to: [{ email: to }],
        subject: `${inviterName} invited you to join ${teamName} on Sprintive`,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = body.message || response.statusText || 'Unknown error';
      const code = body.code;

      logger.error('[email] Send invitation FAILED', {
        to,
        team: teamName,
        status: response.status,
        code,
        message,
      });

      if (response.status === 401 || code === 'unauthorized') {
        throw new Error('Email authentication failed. Check Brevo API key.');
      }
      if (response.status === 429 || code === 'too_many_requests') {
        throw new Error('Email rate limit exceeded. Try again later.');
      }
      if (response.status === 400 && typeof message === 'string' && message.toLowerCase().includes('invalid')) {
        throw new Error(`Email address "${to}" was rejected by the email service.`);
      }

      throw new Error(`Failed to send invitation email: ${message}`);
    }

    logger.info(`[email] Invitation sent to ${to} — messageId=${body.messageId || 'N/A'}`);
  } catch (err) {
    if (err.message.startsWith('Email ') || err.message.startsWith('Failed to send')) {
      throw err;
    }

    logger.error('[email] Send invitation network error', {
      to,
      team: teamName,
      message: err.message,
      code: err.cause?.code || err.code,
      type: err.type,
    });

    if (err.name === 'AbortError') {
      throw new Error('Cannot connect to email service. Request timed out.');
    }
    if (err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOTFOUND' || err.cause?.code === 'ENETUNREACH') {
      throw new Error('Cannot connect to email service. Check network connectivity.');
    }

    throw new Error(`Failed to send invitation email: ${err.message}`);
  }
}
