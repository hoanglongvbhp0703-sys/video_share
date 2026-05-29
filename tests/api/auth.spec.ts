import { test, expect } from "@playwright/test";
import { login, tGet, tPost, TEST_USER, TEST_ADMIN } from "./helpers";

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

test.describe("POST /api/auth/login", () => {
  test("đăng nhập thành công → 200 + token", async ({ request }) => {
    const { status, token, body } = await login(request, TEST_USER.email, TEST_USER.password);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
  });

  test("email sai định dạng → 400 EMAIL_INVALID", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "not-an-email", password: "anything" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("EMAIL_INVALID");
  });

  test("thiếu @ trong email → 400 EMAIL_INVALID", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "useratdomain.com", password: "anything" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("EMAIL_INVALID");
  });

  test("email đúng + sai mật khẩu → 401 INVALID_CREDENTIALS", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: TEST_USER.email, password: "WrongPassword99!" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("INVALID_CREDENTIALS");
  });

  test("email chưa tồn tại, không có name → 422 NAME_REQUIRED", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "nonexistent@test.example.com", password: "somepass" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("NAME_REQUIRED");
  });

  test("email chưa tồn tại + name nhưng password quá ngắn → 422 PASSWORD_REQUIRED", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "newuser-short@test.example.com", password: "123", name: "Test User" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("PASSWORD_REQUIRED");
  });

  test("admin account đăng nhập thành công (tạo bởi global-setup)", async ({ request }) => {
    const { status, body } = await login(request, TEST_ADMIN.email, TEST_ADMIN.password);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

test.describe("POST /api/auth/forgot-password", () => {
  test("email hợp lệ (tồn tại hoặc không) → luôn 200", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: TEST_USER.email },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("email không tồn tại → vẫn 200 (không lộ thông tin)", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: "ghost@notfound.example.com" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("email sai định dạng → 400 EMAIL_INVALID", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: "bademail" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("EMAIL_INVALID");
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

test.describe("POST /api/auth/reset-password", () => {
  test("token không hợp lệ → 400 TOKEN_INVALID", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "this-is-not-a-real-token-xyz123", password: "NewPass123!" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("TOKEN_INVALID");
  });

  test("thiếu token → 400 TOKEN_REQUIRED", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { password: "NewPass123!" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("TOKEN_REQUIRED");
  });

  test("mật khẩu mới quá ngắn → 400 PASSWORD_TOO_SHORT", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "any-token", password: "12345" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("PASSWORD_TOO_SHORT");
  });
});

// ---------------------------------------------------------------------------
// tRPC auth.me
// ---------------------------------------------------------------------------

test.describe("tRPC auth.me", () => {
  test("không có auth → trả null", async ({ request }) => {
    const { data, status } = await tGet(request, "auth.me");
    expect(status).toBe(200);
    expect(data).toBeNull();
  });

  test("có Bearer token → trả user object không có passwordHash", async ({ request }) => {
    const { token } = await login(request, TEST_USER.email, TEST_USER.password);
    const { data, status } = await tGet(request, "auth.me", {}, token);
    expect(status).toBe(200);
    expect(data).not.toBeNull();
    const user = data as Record<string, unknown>;
    expect(user.email).toBe(TEST_USER.email);
    expect(user).not.toHaveProperty("passwordHash");
    expect(user.role).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// tRPC auth.logout
// ---------------------------------------------------------------------------

test.describe("tRPC auth.logout", () => {
  test("logout thành công → {success: true}", async ({ request }) => {
    const { token } = await login(request, TEST_USER.email, TEST_USER.password);
    const { data, status } = await tPost(request, "auth.logout", null, token);
    expect(status).toBe(200);
    expect((data as any)?.success).toBe(true);
  });
});
