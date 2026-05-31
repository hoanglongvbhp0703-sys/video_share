import nodemailer from "nodemailer";
import { resolve4 } from "dns/promises";

// HTML template
function buildOtpHtml(to: string, otp: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#3b82f6);padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">VideoShare</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Đặt lại mật khẩu</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${to}</strong>.
                Nhập mã OTP bên dưới để tiếp tục.
              </p>
              <div style="background:#f9fafb;border:2px dashed #d1d5db;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">Mã xác nhận</p>
                <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#111827;font-variant-numeric:tabular-nums;">${otp}</div>
                <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;">Mã có hiệu lực trong <strong>10 phút</strong></p>
              </div>
              <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
              </p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">⚠️ Không chia sẻ mã này với bất kỳ ai.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 VideoShare · Email tự động, vui lòng không trả lời.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ─── SMTP via nodemailer ───────────────────────────────────────────────────────
async function sendViaSmtp(to: string, otp: string): Promise<void> {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT ?? "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) throw new Error("SMTP_USER / SMTP_PASS not set");

  const fromEmail = process.env.SMTP_FROM_EMAIL ?? user;
  const fromName = process.env.SMTP_FROM_NAME ?? "VideoShare";

  // Resolve hostname → IPv4 trước để tránh Railway dùng IPv6
  let resolvedHost = host;
  try {
    const [ipv4] = await resolve4(host);
    resolvedHost = ipv4;
  } catch {
    // fallback về hostname gốc nếu resolve thất bại
  }

  const transporter = nodemailer.createTransport({
    host: resolvedHost,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    socketTimeout: 8000,
    tls: { servername: host }, // giữ hostname gốc cho TLS certificate check
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: "Mã đặt lại mật khẩu của bạn",
    html: buildOtpHtml(to, otp),
  });

  console.log(`[Email] SMTP (${host}:${port}): OTP sent to ${to}`);
}

// ─── Public API ────────────────────────────────────────────────────────────────
export async function sendResetPasswordOtp(to: string, otp: string): Promise<void> {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await sendViaSmtp(to, otp);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Email] SMTP thất bại → ${msg}`);
    }
  }

  // Fallback: log ra console khi chưa cấu hình SMTP
  console.log("\n==============================");
  console.log("[OTP] Chưa cấu hình SMTP — log console:");
  console.log(`  Email : ${to}`);
  console.log(`  OTP   : ${otp}`);
  console.log("  (Hết hạn sau 10 phút)");
  console.log("==============================\n");
}
