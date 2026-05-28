import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

export function registerDevAuthRoutes(app: Express) {
  if (ENV.isProduction) return;

  app.post("/api/dev-login", async (req: Request, res: Response) => {
    const { name = "Dev User" } = req.body ?? {};
    const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const openId = `dev_${slug || "user"}`;

    try {
      await db.upsertUser({
        openId,
        name: String(name),
        loginMethod: "dev",
        lastSignedIn: new Date(),
      });

      const token = await sdk.signSession(
        { openId, appId: ENV.appId || "dev", name: String(name) },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, openId });
    } catch (error) {
      console.error("[DevAuth] Login failed", error);
      res.status(500).json({ error: "Dev login failed" });
    }
  });
}
