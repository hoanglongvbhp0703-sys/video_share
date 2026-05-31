import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// vi.mock phải ở top-level — vitest tự hoist lên trước imports
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

import nodemailer from "nodemailer";
import { sendResetPasswordOtp } from "../../server/_core/email.ts";

describe("sendResetPasswordOtp", () => {
  const mockSendMail = vi.fn();

  beforeEach(() => {
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail: mockSendMail } as any);
    mockSendMail.mockResolvedValue({ messageId: "test-message-id" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  // ─── Fallback khi chưa cấu hình SMTP ───────────────────────────────────────

  it("log ra console khi SMTP_USER bị thiếu", async () => {
    delete process.env.SMTP_USER;
    process.env.SMTP_PASS = "somepass";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendResetPasswordOtp("user@example.com", "123456");

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
    // OTP phải xuất hiện trong log
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("123456"));
    logSpy.mockRestore();
  });

  it("log ra console khi SMTP_PASS bị thiếu", async () => {
    process.env.SMTP_USER = "sender@gmail.com";
    delete process.env.SMTP_PASS;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendResetPasswordOtp("user@example.com", "654321");

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("654321"));
    logSpy.mockRestore();
  });

  // ─── Gọi nodemailer đúng khi SMTP đầy đủ ───────────────────────────────────

  it("tạo transporter với cấu hình Gmail SMTP chuẩn", async () => {
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password-16ch";

    await sendResetPasswordOtp("user@example.com", "111222");

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: "sender@gmail.com", pass: "app-password-16ch" },
    });
  });

  it("gọi sendMail với đúng địa chỉ nhận, subject, OTP trong HTML", async () => {
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password-16ch";

    await sendResetPasswordOtp("user@example.com", "999888");

    expect(mockSendMail).toHaveBeenCalledOnce();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining("sender@gmail.com"),
        to: "user@example.com",
        subject: expect.stringMatching(/mật khẩu/i),
        html: expect.stringContaining("999888"),
      })
    );
  });

  it("log thành công sau khi sendMail resolve", async () => {
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password-16ch";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendResetPasswordOtp("user@example.com", "112233");

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("user@example.com"));
    logSpy.mockRestore();
  });

  // ─── Xử lý lỗi khi sendMail thất bại ──────────────────────────────────────

  it("re-throw lỗi khi sendMail thất bại", async () => {
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password-16ch";
    mockSendMail.mockRejectedValue(new Error("535 Authentication failed"));

    await expect(sendResetPasswordOtp("user@example.com", "000111")).rejects.toThrow(
      "535 Authentication failed"
    );
  });

  it("log console.error khi sendMail thất bại", async () => {
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password-16ch";
    mockSendMail.mockRejectedValue(new Error("Connection timeout"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendResetPasswordOtp("user@example.com", "000111")).rejects.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Connection timeout"));
    errorSpy.mockRestore();
  });
});
