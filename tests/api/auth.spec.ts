import { test, expect } from "@playwright/test";
import { login, tGet, tPost, TEST_USER, TEST_ADMIN, TEST_USER_3 } from "./helpers";

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
// POST /api/auth/reset-password-otp
// ---------------------------------------------------------------------------

test.describe("POST /api/auth/reset-password-otp — validation", () => {
  test("thiếu otp → 400 OTP_INVALID", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password-otp", {
      data: { email: TEST_ADMIN.email, password: "NewPass123!" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("OTP_INVALID");
  });

  test("otp không đúng 6 ký tự → 400 OTP_INVALID", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password-otp", {
      data: { email: TEST_ADMIN.email, otp: "12345", password: "NewPass123!" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("OTP_INVALID");
  });

  test("otp 7 ký tự → 400 OTP_INVALID", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password-otp", {
      data: { email: TEST_ADMIN.email, otp: "1234567", password: "NewPass123!" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("OTP_INVALID");
  });

  test("mật khẩu mới quá ngắn → 400 PASSWORD_TOO_SHORT", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password-otp", {
      data: { email: TEST_ADMIN.email, otp: "123456", password: "123" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("PASSWORD_TOO_SHORT");
  });

  test("OTP sai (không tồn tại trong DB) → 400 OTP_NOT_FOUND", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password-otp", {
      data: { email: TEST_ADMIN.email, otp: "000000", password: "NewPass123!" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("OTP_NOT_FOUND");
  });
});

test.describe("POST /api/auth/reset-password-otp — E2E flow (dev server)", () => {
  const TEMP_PASS = "TempReset999!";

  test("forgot → lấy OTP (test endpoint) → đặt lại mật khẩu → đăng nhập thành công → restore", async ({
    request,
  }) => {
    const { email, password: originalPass } = TEST_USER_3;

    // 1. Yêu cầu OTP
    const forgotRes = await request.post("/api/auth/forgot-password", {
      data: { email },
    });
    expect(forgotRes.status()).toBe(200);
    expect((await forgotRes.json()).success).toBe(true);

    // 2. Lấy OTP qua endpoint dev-only
    const otpRes = await request.get(`/api/test/otp?email=${encodeURIComponent(email)}`);
    expect(otpRes.status()).toBe(200);
    const { otp } = await otpRes.json();
    expect(typeof otp).toBe("string");
    expect(otp).toHaveLength(6);

    // 3. Đặt lại mật khẩu
    const resetRes = await request.post("/api/auth/reset-password-otp", {
      data: { email, otp, password: TEMP_PASS },
    });
    expect(resetRes.status()).toBe(200);
    expect((await resetRes.json()).success).toBe(true);

    // 4. Đăng nhập với mật khẩu mới
    const loginResult = await login(request, email, TEMP_PASS);
    expect(loginResult.status).toBe(200);
    expect(loginResult.body.success).toBe(true);

    // 5. Dùng OTP mới nhất đã bị mark-used → lỗi nếu dùng lại
    const reuseRes = await request.post("/api/auth/reset-password-otp", {
      data: { email, otp, password: "AnotherPass123!" },
    });
    expect(reuseRes.status()).toBe(400);
    const reuseBody = await reuseRes.json();
    expect(reuseBody.error).toBe("OTP_USED");

    // 6. Restore mật khẩu gốc
    const forgotRes2 = await request.post("/api/auth/forgot-password", {
      data: { email },
    });
    expect(forgotRes2.status()).toBe(200);
    const otpRes2 = await request.get(`/api/test/otp?email=${encodeURIComponent(email)}`);
    const { otp: otp2 } = await otpRes2.json();
    await request.post("/api/auth/reset-password-otp", {
      data: { email, otp: otp2, password: originalPass },
    });
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
