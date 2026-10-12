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

export async function sendInvitationEmail({ to, inviterName, teamName, teamColor, acceptUrl, expiresAt, role = 'developer' }) {
  if (!env.brevoApiKey) {
    logger.warn('[email] Brevo API key not configured — cannot send invitation email');
    throw new Error('Email sending is not configured. Contact the system administrator.');
  }

  const expiry = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const displayRole = role ? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Developer';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You're invited to join ${teamName}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA;padding:48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:540px;background-color:#FFFFFF;border:1px solid #EAEAEA;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <!-- Header / Wordmark -->
          <tr>
            <td style="padding:28px 36px 20px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px;height:24px;background-color:#000000;border-radius:5px;text-align:center;vertical-align:middle;">
                    <span style="color:#FFFFFF;font-size:13px;font-weight:700;line-height:24px;display:block;">S</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:#000000;font-size:15px;font-weight:700;letter-spacing:-0.2px;">Sprintive</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Subtle Divider -->
          <tr>
            <td style="padding:0 36px;">
              <div style="border-top:1px solid #EAEAEA;height:1px;line-height:1px;"></div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 36px 28px;">
              <p style="margin:0 0 8px;font-size:13px;color:#666666;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">You're invited to join</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#000000;letter-spacing:-0.4px;line-height:1.25;">
                ${teamName}
              </h1>

              <p style="margin:0 0 28px;font-size:14px;color:#444444;line-height:1.6;">
                <strong>${inviterName}</strong> invited you to join the team as <strong>${displayRole}</strong>.
              </p>

              <!-- Primary Action Button -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="background-color:#000000;border-radius:6px;">
                    <a href="${acceptUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:-0.1px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#888888;line-height:1.5;">
                You can review the invitation before joining the team.
              </p>
            </td>
          </tr>

          <!-- Footer Divider -->
          <tr>
            <td style="padding:0 36px;">
              <div style="border-top:1px solid #EAEAEA;height:1px;line-height:1px;"></div>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="padding:20px 36px 24px;">
              <p style="margin:0 0 8px;font-size:12px;color:#888888;line-height:1.5;">
                This invitation expires on ${expiry}. If you weren't expecting this invitation, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:11px;color:#AAAAAA;">
                &copy; Sprintive &bull; Workspace Intelligence Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = `You're invited to join ${teamName} on Sprintive.

${inviterName} invited you to join the team as ${displayRole}.

Accept invitation by opening this link:
${acceptUrl}

You can review the invitation before joining the team.
This invitation expires on ${expiry}. If you weren't expecting this invitation, you can safely ignore this email.

© Sprintive`;

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
        textContent,
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
