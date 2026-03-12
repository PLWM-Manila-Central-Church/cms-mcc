"use strict";

// ── Resend HTTP API (replaces Nodemailer SMTP)
// Railway blocks outbound SMTP ports (465/587). Using Resend's REST API
// over HTTPS (port 443) bypasses this restriction entirely.

const RESEND_API_URL = "https://api.resend.com/emails";

async function sendViaResend(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("[Mailer] RESEND_API_KEY env variable is not set.");

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`[Mailer] Resend API error: ${data?.message || response.statusText}`);
  }

  console.log("[Mailer] Email sent successfully. ID:", data.id);
  return data;
}

// ── Verify on startup (non-fatal) ────────────────────────────
(function verifyMailer() {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Mailer] WARNING: RESEND_API_KEY is not set. Emails will fail.");
  } else {
    console.log("[Mailer] Resend HTTP mailer ready.");
  }
})();

// ── Send Password Reset Email ────────────────────────────────
exports.sendPasswordReset = async ({ to, resetUrl }) => {
  const from = process.env.SMTP_FROM || "PLWM-MCC <onboarding@resend.dev>";

  await sendViaResend({
    from,
    to,
    subject: "Reset Your PLWM-MCC Password",
    text: `
You requested a password reset for your PLWM-MCC Church Management System account.

Click the link below to set a new password. This link expires in 1 hour.

${resetUrl}

If you did not request this, you can safely ignore this email.

— PLWM Manila Central Church
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f0f6ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,85,153,0.10);">
          <tr>
            <td style="background:linear-gradient(90deg,#003d70,#005599,#13B5EA);height:5px;"></td>
          </tr>
          <tr>
            <td align="center" style="padding:36px 40px 24px;">
              <div style="display:inline-block;background:#e8f4fd;border-radius:12px;padding:10px 20px;">
                <span style="font-size:13px;font-weight:800;color:#005599;letter-spacing:2px;">PLWM-MCC</span>
              </div>
              <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Church Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px;">
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">Reset Your Password</h2>
              <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.65;">
                We received a request to reset the password for your PLWM-MCC account.
                Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#003d70,#005599);border-radius:10px;">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;">If the button does not work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 28px;font-size:12px;color:#005599;word-break:break-all;">
                <a href="${resetUrl}" style="color:#005599;">${resetUrl}</a>
              </p>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:8px;">
                <p style="margin:0;font-size:13px;color:#92400e;">
                  If you did not request a password reset, please ignore this email. Your password will not change.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:0.5px;">
                © 2026 PLWM Manila Central Church · All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
};
