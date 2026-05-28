import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("videos router", () => {
  describe("list", () => {
    it("should return list of videos", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videos.list({ limit: 10, offset: 0 });

      expect(Array.isArray(result)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videos.list({ limit: 5, offset: 0 });

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("search", () => {
    it("should return search results", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videos.search({
        query: "test",
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle empty search query", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videos.search({
        query: "",
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("incrementView", () => {
    it("should increment view count", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // This should not throw
      await caller.videos.incrementView({ id: 999 });
    });
  });

  describe("upload", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.videos.upload({
          title: "Test Video",
          description: "Test Description",
          videoUrl: "https://example.com/video.mp4",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should create video for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.videos.upload({
        title: "Test Video",
        description: "Test Description",
        videoUrl: "https://example.com/video.mp4",
        thumbnailUrl: "https://example.com/thumbnail.jpg",
        duration: 120,
      });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.videoUrl).toBeDefined();
    });

    it("should validate title is required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.videos.upload({
          title: "",
          description: "Test",
          videoUrl: "https://example.com/video.mp4",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });
});

describe("comments router", () => {
  describe("getByVideoId", () => {
    it("should return comments for video", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.comments.getByVideoId({
        videoId: 1,
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("create", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.comments.create({
          videoId: 1,
          content: "Test comment",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should create comment for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.comments.create({
        videoId: 1,
        content: "Test comment",
      });

      expect(result).toBeDefined();
      expect(result.content).toBe("Test comment");
    });
  });
});

describe("likes router", () => {
  describe("toggle", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.likes.toggle({
          videoId: 1,
          type: "like",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should toggle like for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.likes.toggle({
        videoId: 1,
        type: "like",
      });

      // toggleLike returns either null (when removing) or the type string (when adding/changing)
      expect(result === null || typeof result === "string").toBe(true);
    });
  });
});

describe("subscriptions router", () => {
  describe("toggle", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.subscriptions.toggle({
          channelId: 1,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should toggle subscription for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscriptions.toggle({
        channelId: 1,
      });

      expect(typeof result).toBe("boolean");
    });
  });
});
