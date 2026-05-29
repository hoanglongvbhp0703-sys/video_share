import { test, expect } from "@playwright/test";
import { login, tGet, tPost, TEST_USER, TEST_USER_2 } from "./helpers";

// ---------------------------------------------------------------------------
// channels.getById (public query)
// ---------------------------------------------------------------------------

test.describe("channels.getById", () => {
  test("ID hợp lệ → trả channel object", async ({ request }) => {
    // Lấy video đầu tiên để lấy channelId
    const listRes = await tGet(request, "videos.list", { limit: 1, offset: 0 });
    const videos = listRes.data as { id: number; channelId: number }[];
    if (videos.length === 0) {
      test.skip(true, "Cần có video trong DB — chạy npm run seed");
      return;
    }
    const channelId = videos[0].channelId;
    const { data, status } = await tGet(request, "channels.getById", { id: channelId });
    expect(status).toBe(200);
    const ch = data as Record<string, unknown>;
    expect(ch.id).toBe(channelId);
    expect(ch).toHaveProperty("name");
    expect(ch).toHaveProperty("subscriberCount");
  });

  test("ID không tồn tại → NOT_FOUND", async ({ request }) => {
    const { error, status } = await tGet(request, "channels.getById", { id: 99999999 });
    expect(status).toBeGreaterThanOrEqual(400);
    expect((error as any)?.data?.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// channels.getMyChannel (protected query)
// ---------------------------------------------------------------------------

test.describe("channels.getMyChannel", () => {
  test("không auth → UNAUTHORIZED", async ({ request }) => {
    const { error, status } = await tGet(request, "channels.getMyChannel");
    expect(status).toBe(401);
    expect((error as any)?.data?.code).toBe("UNAUTHORIZED");
  });

  test("có auth → trả channel của user đang đăng nhập", async ({ request }) => {
    const { token } = await login(request, TEST_USER.email, TEST_USER.password);
    const { data, status } = await tGet(request, "channels.getMyChannel", {}, token);
    expect(status).toBe(200);
    const ch = data as Record<string, unknown>;
    expect(ch).toHaveProperty("id");
    expect(ch).toHaveProperty("name");
    expect(ch).toHaveProperty("userId");
  });
});

// ---------------------------------------------------------------------------
// channels.getVideos (public query)
// ---------------------------------------------------------------------------

test.describe("channels.getVideos", () => {
  test("trả về video của channel", async ({ request }) => {
    const listRes = await tGet(request, "videos.list", { limit: 1, offset: 0 });
    const videos = listRes.data as { channelId: number }[];
    if (videos.length === 0) {
      test.skip(true, "Cần có video trong DB");
      return;
    }
    const channelId = videos[0].channelId;
    const { data, status } = await tGet(request, "channels.getVideos", {
      channelId,
      limit: 10,
      offset: 0,
    });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// subscriptions (public + protected)
// ---------------------------------------------------------------------------

test.describe("subscriptions", () => {
  test("isSubscribed không auth → trả false (null userId)", async ({ request }) => {
    // publicProcedure: dùng userId từ context nếu đăng nhập, null nếu không
    const listRes = await tGet(request, "videos.list", { limit: 1, offset: 0 });
    const videos = listRes.data as { channelId: number }[];
    if (videos.length === 0) {
      test.skip(true, "Cần có video trong DB");
      return;
    }
    const { data, status } = await tGet(request, "subscriptions.isSubscribed", {
      channelId: videos[0].channelId,
    });
    expect(status).toBe(200);
    // Không đăng nhập → không subscribe
    expect(data).toBe(false);
  });

  test("getCount trả subscriberCount cho channel hợp lệ", async ({ request }) => {
    const listRes = await tGet(request, "videos.list", { limit: 1, offset: 0 });
    const videos = listRes.data as { channelId: number }[];
    if (videos.length === 0) {
      test.skip(true, "Cần có video trong DB");
      return;
    }
    const channelId = videos[0].channelId;
    const { data, status } = await tGet(request, "subscriptions.getCount", { channelId });
    expect(status).toBe(200);
    expect(typeof data).toBe("number");
    expect(data as number).toBeGreaterThanOrEqual(0);
  });

  test("toggle subscribe không auth → UNAUTHORIZED", async ({ request }) => {
    const { error, status } = await tPost(request, "subscriptions.toggle", {
      channelId: 1,
    });
    expect(status).toBe(401);
    expect((error as any)?.data?.code).toBe("UNAUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// users.getMyProfile (protected)
// ---------------------------------------------------------------------------

test.describe("users.getMyProfile", () => {
  test("không auth → UNAUTHORIZED", async ({ request }) => {
    const { error, status } = await tGet(request, "users.getMyProfile");
    expect(status).toBe(401);
    expect((error as any)?.data?.code).toBe("UNAUTHORIZED");
  });

  test("có auth → trả profile + channel info", async ({ request }) => {
    const { token } = await login(request, TEST_USER.email, TEST_USER.password);
    const { data, status } = await tGet(request, "users.getMyProfile", {}, token);
    expect(status).toBe(200);
    const profile = data as Record<string, unknown>;
    expect(profile.email).toBe(TEST_USER.email);
    expect(profile).not.toHaveProperty("passwordHash");
    expect(profile).toHaveProperty("channel");
    expect((profile.channel as Record<string, unknown>).videoCount).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// playlists (protected CRUD)
// ---------------------------------------------------------------------------

test.describe("playlists", () => {
  test("getMyPlaylists không auth → UNAUTHORIZED", async ({ request }) => {
    const { error, status } = await tGet(request, "playlists.getMyPlaylists");
    expect(status).toBe(401);
    expect((error as any)?.data?.code).toBe("UNAUTHORIZED");
  });

  test("create + getMyPlaylists → playlist mới xuất hiện trong danh sách", async ({ request }) => {
    const { token } = await login(request, TEST_USER_2.email, TEST_USER_2.password);
    const uniqueName = `Playlist test ${Date.now()}`;

    const create = await tPost(
      request,
      "playlists.create",
      { name: uniqueName, isPublic: true },
      token,
    );
    expect(create.status).toBe(200);
    expect((create.data as any)?.id).toBeDefined();

    const list = await tGet(request, "playlists.getMyPlaylists", {}, token);
    expect(list.status).toBe(200);
    const playlists = list.data as { name: string }[];
    const found = playlists.find(p => p.name === uniqueName);
    expect(found).toBeDefined();
  });
});
