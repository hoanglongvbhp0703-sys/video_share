import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const SALT_ROUNDS = 10;

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
        if (!user.password) {
          res.status(401).json({ error: "NO_PASSWORD", message: "Tài khoản này đăng nhập qua phương thức khác" });
          return;
        }
        if (!password || typeof password !== "string") {
          res.status(400).json({ error: "Vui lòng nhập mật khẩu" });
          return;
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
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
          password: passwordHash,
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
      res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "SERVER_ERROR", message: "Đã xảy ra lỗi, vui lòng thử lại" });
    }
  });
}
