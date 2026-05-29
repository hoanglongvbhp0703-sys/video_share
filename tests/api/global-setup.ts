import { request } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/**
 * Đảm bảo các test account tồn tại trước khi test chạy.
 * Gọi POST /api/auth/login: nếu email chưa có → tạo mới; nếu có rồi → ignore (400/401 level).
 */
export default async function globalSetup() {
  const api = await request.newContext({ baseURL: BASE_URL });

  const accounts = [
    { email: "pw_admin@playwright.test", password: "PwAdmin123!", name: "PW Admin" },
    { email: "pw_user3@playwright.test", password: "PwUser123!", name: "PW User Three" },
  ];

  for (const acc of accounts) {
    // Try to register: if email does not exist, login endpoint creates the user
    const res = await api.post("/api/auth/login", {
      data: { email: acc.email, password: acc.password, name: acc.name },
    });
    const body = await res.json();
    if (!body.success && body.error !== "INVALID_CREDENTIALS") {
      // INVALID_CREDENTIALS = user exists with different password → OK for our purpose
      // Other errors are unexpected
      console.warn(`[global-setup] Unexpected response for ${acc.email}:`, body);
    }
  }

  await api.dispose();
}
