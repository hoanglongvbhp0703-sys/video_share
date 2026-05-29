import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 phút

export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Body: { email: string, password: string, name?: string }
   *
   * - Email tồn tại + password đúng → đăng nhập (200)
   * - Email tồn tại + password sai → 401 INVALID_CREDENTIALS
   * - Email tồn tại + không có password trong DB → 401 NO_PASSWORD
   * - Email chưa có, không có name → 422 NAME_REQUIRED
   * - Email chưa có, có name + password → tạo tài khoản + đăng nhập (200)
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password, name } = req.body ?? {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "EMAIL_INVALID", message: "Email không hợp lệ (phải có dạng example@domain.com)" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    try {
      let user = await db.getUserByEmail(emailLower);

      if (user) {
        // Kiểm tra password
        if (!user.passwordHash) {
          res.status(401).json({ error: "NO_PASSWORD", message: "Tài khoản này đăng nhập qua phương thức khác" });
          return;
        }
        if (!password || typeof password !== "string") {
          res.status(400).json({ error: "Vui lòng nhập mật khẩu" });
          return;
        }
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng" });
          return;
        }
        // Cập nhật lastSignedIn
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      } else if (!name || !String(name).trim()) {
        res.status(422).json({ error: "NAME_REQUIRED" });
        return;
      } else {
        // Tạo user mới — password bắt buộc
        if (!password || typeof password !== "string" || password.length < 6) {
          res.status(422).json({ error: "PASSWORD_REQUIRED", message: "Mật khẩu phải có ít nhất 6 ký tự" });
          return;
        }
        const openId = `local:${emailLower}`;
        const displayName = String(name).trim();
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await db.upsertUser({
          openId,
          name: displayName,
          email: emailLower,
          loginMethod: "local",
          passwordHash,
          lastSignedIn: new Date(),
        });

        user = await db.getUserByOpenId(openId);
        if (!user) throw new Error("Failed to create user");
      }

      const token = await sdk.signSession(
        { openId: user.openId, appId: "local", name: user.name || emailLower },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, token });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "SERVER_ERROR", message: "Đã xảy ra lỗi, vui lòng thử lại" });
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Body: { email: string }
   * Luôn trả 200 để không lộ email tồn tại hay không.
   * Reset link được log ra console server (dev) — cấu hình SMTP để gửi email thật.
   */
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body ?? {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "EMAIL_INVALID", message: "Email không hợp lệ" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    try {
      const user = await db.getUserByEmail(emailLower);

      if (user && user.passwordHash) {
        const token = nanoid(48);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await db.createPasswordReset(user.id, token, expiresAt);

        const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
        const resetUrl = `${clientUrl}/reset-password?token=${token}`;

        console.log("\n==============================");
        console.log("[Password Reset] Link đặt lại mật khẩu:");
        console.log(resetUrl);
        console.log("(Hết hạn sau 15 phút)");
        console.log("==============================\n");
      }

      // Luôn trả success để không lộ email có tồn tại không
      res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Forgot password failed", error);
      res.status(500).json({ error: "SERVER_ERROR", message: "Đã xảy ra lỗi, vui lòng thử lại" });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Body: { token: string, password: string }
   */
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, password } = req.body ?? {};

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "TOKEN_REQUIRED", message: "Token không hợp lệ" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "PASSWORD_TOO_SHORT", message: "Mật khẩu phải có ít nhất 6 ký tự" });
      return;
    }

    try {
      const reset = await db.getPasswordResetByToken(token);

      if (!reset) {
        res.status(400).json({ error: "TOKEN_INVALID", message: "Link đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng" });
        return;
      }
      if (reset.usedAt) {
        res.status(400).json({ error: "TOKEN_USED", message: "Link này đã được sử dụng, vui lòng yêu cầu link mới" });
        return;
      }
      if (new Date() > reset.expiresAt) {
        res.status(400).json({ error: "TOKEN_EXPIRED", message: "Link đặt lại mật khẩu đã hết hạn, vui lòng yêu cầu link mới" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await db.updateUserPassword(reset.userId, passwordHash);
      await db.markPasswordResetUsed(reset.id);

      res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Reset password failed", error);
      res.status(500).json({ error: "SERVER_ERROR", message: "Đã xảy ra lỗi, vui lòng thử lại" });
    }
  });
}
