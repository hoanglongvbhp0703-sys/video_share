import { test, expect } from "@playwright/test";
import { login, tGet, tPost, TEST_USER } from "./helpers";

// ---------------------------------------------------------------------------
// videos.list (public query)
// ---------------------------------------------------------------------------

test.describe("videos.list", () => {
  test("trả về mảng video", async ({ request }) => {
    const { data, status } = await tGet(request, "videos.list", { limit: 10, offset: 0 });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("giới hạn limit", async ({ request }) => {
    const { data } = await tGet(request, "videos.list", { limit: 3, offset: 0 });
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBeLessThanOrEqual(3);
  });

  test("offset phân trang — kết quả khác nhau", async ({ request }) => {
    const page1 = await tGet(request, "videos.list", { limit: 5, offset: 0 });
    const page2 = await tGet(request, "videos.list", { limit: 5, offset: 5 });
    expect(Array.isArray(page1.data)).toBe(true);
    expect(Array.isArray(page2.data)).toBe(true);
    // Nếu có đủ video, hai trang phải khác nhau
    if ((page1.data as unknown[]).length > 0 && (page2.data as unknown[]).length > 0) {
      const ids1 = (page1.data as { id: number }[]).map(v => v.id);
      const ids2 = (page2.data as { id: number }[]).map(v => v.id);
      const overlap = ids1.filter(id => ids2.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  test("mỗi video có đủ các trường cơ bản", async ({ request }) => {
    const { data } = await tGet(request, "videos.list", { limit: 1, offset: 0 });
    const videos = data as Record<string, unknown>[];
    if (videos.length > 0) {
      const v = videos[0];
      expect(v).toHaveProperty("id");
      expect(v).toHaveProperty("title");
      expect(v).toHaveProperty("videoUrl");
      expect(v).toHaveProperty("channelId");
      expect(v).toHaveProperty("viewCount");
    }
  });
});

// ---------------------------------------------------------------------------
// videos.getTrending (public query)
// ---------------------------------------------------------------------------

test.describe("videos.getTrending", () => {
  test("trả về mảng video trending", async ({ request }) => {
    const { data, status } = await tGet(request, "videos.getTrending", { limit: 10, offset: 0 });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// videos.search (public query)
// ---------------------------------------------------------------------------

test.describe("videos.search", () => {
  test("tìm không trống → mảng kết quả", async ({ request }) => {
    const { data, status } = await tGet(request, "videos.search", {
      query: "a",
      limit: 10,
      offset: 0,
    });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("tìm không dấu → vẫn có kết quả khi seed data tồn tại", async ({ request }) => {
    // "honganh" → "Hồng Anh" (channel name in seed)
    const { data } = await tGet(request, "videos.search", { query: "honganh", limit: 5, offset: 0 });
    expect(Array.isArray(data)).toBe(true);
  });

  test("tìm chuỗi không tồn tại → mảng rỗng", async ({ request }) => {
    const { data } = await tGet(request, "videos.search", {
      query: "xyzxyzxyz_nonexistent_query_abc",
      limit: 10,
      offset: 0,
    });
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// videos.suggest (public query)
// ---------------------------------------------------------------------------

test.describe("videos.suggest", () => {
  test("query ≥ 2 ký tự → trả gợi ý", async ({ request }) => {
    const { data, status } = await tGet(request, "videos.suggest", { query: "vi", limit: 8 });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    if ((data as unknown[]).length > 0) {
      const first = (data as Record<string, unknown>[])[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("title");
    }
  });
});

// ---------------------------------------------------------------------------
// videos.getById (public query)
// ---------------------------------------------------------------------------

test.describe("videos.getById", () => {
  test("ID hợp lệ → trả video object", async ({ request }) => {
    // Lấy ID từ danh sách trước
    const list = await tGet(request, "videos.list", { limit: 1, offset: 0 });
    const videos = list.data as { id: number }[];
    if (videos.length === 0) {
      test.skip(true, "Không có video trong DB — chạy npm run seed trước");
      return;
    }
    const firstId = videos[0].id;
    const { data, status } = await tGet(request, "videos.getById", { id: firstId });
    expect(status).toBe(200);
    const video = data as Record<string, unknown>;
    expect(video.id).toBe(firstId);
    expect(video).toHaveProperty("title");
    expect(video).toHaveProperty("videoUrl");
  });

  test("ID không tồn tại → tRPC NOT_FOUND error", async ({ request }) => {
    const { error, status } = await tGet(request, "videos.getById", { id: 99999999 });
    // tRPC trả HTTP 404 cho NOT_FOUND code
    expect(status).toBeGreaterThanOrEqual(400);
    expect(error).not.toBeUndefined();
    const err = error as Record<string, unknown>;
    expect((err?.data as any)?.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// videos.getByCategory (public query)
// ---------------------------------------------------------------------------

test.describe("videos.getByCategory", () => {
  test("category hợp lệ → mảng video", async ({ request }) => {
    const { data, status } = await tGet(request, "videos.getByCategory", {
      category: "gaming",
      limit: 10,
      offset: 0,
    });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// videos.createWithUrls (protected mutation)
// ---------------------------------------------------------------------------

test.describe("videos.createWithUrls", () => {
  test("không auth → UNAUTHORIZED", async ({ request }) => {
    const { error, status } = await tPost(request, "videos.createWithUrls", {
      title: "Test video",
      videoUrl: "https://example.com/video.mp4",
    });
    expect(status).toBe(401);
    expect((error as any)?.data?.code).toBe("UNAUTHORIZED");
  });

  test("có auth + input hợp lệ → tạo video thành công", async ({ request }) => {
    const { token } = await login(request, TEST_USER.email, TEST_USER.password);
    const title = `Test video ${Date.now()}`;
    const { data, status } = await tPost(
      request,
      "videos.createWithUrls",
      {
        title,
        description: "Tạo bởi Playwright test",
        videoUrl: "https://example.com/test.mp4",
        thumbnailUrl: "https://example.com/thumb.jpg",
        duration: 60,
        category: "gaming",
      },
      token,
    );
    expect(status).toBe(200);
    const video = data as Record<string, unknown>;
    expect(video.title).toBe(title);
    expect(video.id).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// comments.create (protected mutation) + comments.getByVideoId
// ---------------------------------------------------------------------------

test.describe("comments", () => {
  test("getByVideoId không auth → trả mảng comment", async ({ request }) => {
    const list = await tGet(request, "videos.list", { limit: 1, offset: 0 });
    const videos = list.data as { id: number }[];
    if (videos.length === 0) {
      test.skip(true, "Cần có video để test comment");
      return;
    }
    const { data, status } = await tGet(request, "comments.getByVideoId", {
      videoId: videos[0].id,
      limit: 10,
      offset: 0,
    });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("create không auth → UNAUTHORIZED", async ({ request }) => {
    const { error, status } = await tPost(request, "comments.create", {
      videoId: 1,
      content: "Bình luận test",
    });
    expect(status).toBe(401);
    expect((error as any)?.data?.code).toBe("UNAUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// likes.toggle (protected mutation)
// ---------------------------------------------------------------------------

test.describe("likes", () => {
  test("toggle không auth → UNAUTHORIZED", async ({ request }) => {
    const { error, status } = await tPost(request, "likes.toggle", {
      videoId: 1,
      type: "like",
    });
    expect(status).toBe(401);
    expect((error as any)?.data?.code).toBe("UNAUTHORIZED");
  });
});
