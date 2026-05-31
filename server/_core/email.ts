import { Resend } from "resend";
import nodemailer from "nodemailer";

// HTML template dùng chung cho cả Resend và SMTP fallback
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

// ─── Gửi qua Resend API (HTTPS — hoạt động trên Railway) ───────────────────
async function sendViaResend(to: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "VideoShare <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Mã đặt lại mật khẩu của bạn",
    html: buildOtpHtml(to, otp),
  });

  if (error) throw new Error(error.message);
  console.log(`[Email] Resend: OTP sent to ${to}`);
}

// ─── Fallback: SMTP (không hoạt động trên Railway vì block port) ───────────
async function sendViaSmtp(to: string, otp: string): Promise<void> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP_USER/SMTP_PASS not set");

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 5000,
    socketTimeout: 5000,
  } as any);

  await transport.sendMail({
    from: `"VideoShare" <${user}>`,
    to,
    subject: "Mã đặt lại mật khẩu của bạn",
    html: buildOtpHtml(to, otp),
  });
  console.log(`[Email] SMTP: OTP sent to ${to}`);
}

// ─── Public API ────────────────────────────────────────────────────────────
export async function sendResetPasswordOtp(to: string, otp: string): Promise<void> {
  // Ưu tiên Resend (HTTPS, hoạt động trên mọi host)
  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend(to, otp);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Email] Resend thất bại → ${msg}`);
      // Không throw — fallback về SMTP hoặc console
    }
  }

  // Fallback: SMTP (chỉ dùng ở local dev, Railway block SMTP)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await sendViaSmtp(to, otp);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Email] SMTP thất bại → ${msg}`);
      // Không throw — fallback về console
    }
  }

  // Final fallback: log ra console
  console.log("\n==============================");
  console.log("[OTP] Chưa cấu hình email — log console:");
  console.log(`  Email : ${to}`);
  console.log(`  OTP   : ${otp}`);
  console.log("  (Hết hạn sau 10 phút)");
  console.log("==============================\n");
}
