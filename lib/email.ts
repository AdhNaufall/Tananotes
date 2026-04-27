import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(params: {
  toEmail: string;
  resetUrl: string;
}) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resend || !fromEmail) {
    return { sent: false, reason: 'missing-email-config' as const };
  }

  const { toEmail, resetUrl } = params;

  const text = [
    'Tananotes Password Reset',
    '',
    'We received a request to reset your password.',
    `Reset your password here: ${resetUrl}`,
    '',
    'This link is valid for 15 minutes.',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: 'Reset your Tananotes password',
    text,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px; color:#111827;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:2px solid #111827;border-radius:24px;overflow:hidden;box-shadow:6px 6px 0 #111827;">
          <div style="padding:24px;background:linear-gradient(135deg,#93C5FD 0%,#FDE047 100%);border-bottom:2px solid #111827;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Tananotes</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;">Reset your password</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">We received a request to reset your Tananotes password. Click the button below to choose a new password.</p>
            <p style="margin:0 0 20px;">
              <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border:2px solid #111827;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:800;">
                Reset Password
              </a>
            </p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">This link is valid for 15 minutes.</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">If you did not request this, you can ignore this email.</p>
          </div>
          <div style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">If the button doesn't work, copy and paste this link:<br />${resetUrl}</p>
          </div>
        </div>
      </div>
    `,
  });

  return { sent: true as const };
}
