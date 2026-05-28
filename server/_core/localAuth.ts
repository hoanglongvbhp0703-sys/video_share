import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const DEFAULT_PASSWORD = "123456Long";
const SALT_ROUNDS = 10;

export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Body: { email: string, name?: string }
   *
   * - Email tồn tại → đăng nhập ngay (200)
   * - Email chưa có, không có name → 422 NAME_REQUIRED (frontend hỏi tên)
   * - Email chưa có, có name → tạo tài khoản + đăng nhập (200)
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, name } = req.body ?? {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Email không hợp lệ" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    try {
      let user = await db.getUserByEmail(emailLower);

      if (user) {
        // Cập nhật lastSignedIn
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      } else if (!name || !String(name).trim()) {
        res.status(422).json({ error: "NAME_REQUIRED" });
        return;
      } else {
        // Tạo user mới với default password hash
        const openId = `local:${emailLower}`;
        const displayName = String(name).trim();
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

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
      res.status(500).json({ error: "Đăng nhập thất bại, vui lòng thử lại" });
    }
  });
}
