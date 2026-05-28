import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(DATABASE_URL);

// 5 mock users tương ứng với 5 channels
const mockUsers = [
  { openId: "mock_user_1", name: "Minh Tuấn", email: "minhtuan@example.com", loginMethod: "mock" },
  { openId: "mock_user_2", name: "Hồng Anh", email: "honganh@example.com", loginMethod: "mock" },
  { openId: "mock_user_3", name: "Quốc Bảo", email: "quocbao@example.com", loginMethod: "mock" },
  { openId: "mock_user_4", name: "Thúy Linh", email: "thuylinh@example.com", loginMethod: "mock" },
  { openId: "mock_user_5", name: "Đức Thành", email: "ducthanh@example.com", loginMethod: "mock" },
];

// Mock data generators
const mockChannels = [
  {
    userId: 1, // placeholder, sẽ được gán sau khi insert users
    name: "Tech Channel",
    description: "Công nghệ, lập trình, AI",
    avatarUrl: "/manus-storage/avatar-1.jpg",
    subscriberCount: 15420,
  },
  {
    userId: 2,
    name: "Gaming Pro",
    description: "Gaming, esports, reviews",
    avatarUrl: "/manus-storage/avatar-2.jpg",
    subscriberCount: 8950,
  },
  {
    userId: 3,
    name: "Music Vibes",
    description: "Nhạc, cover, beat making",
    avatarUrl: "/manus-storage/avatar-3.jpg",
    subscriberCount: 12340,
  },
  {
    userId: 4,
    name: "Travel Adventures",
    description: "Du lịch, khám phá thế giới",
    avatarUrl: "/manus-storage/avatar-4.jpg",
    subscriberCount: 9870,
  },
  {
    userId: 5,
    name: "Cooking Master",
    description: "Nấu ăn, công thức, mẹo bếp",
    avatarUrl: "/manus-storage/avatar-5.jpg",
    subscriberCount: 11200,
  },
];

// category theo channel index (0-4):  news, gaming, music, news, movies
const CHANNEL_CATEGORIES = ["news", "gaming", "music", "news", "movies"];

const videoTitles = [
  "Hướng dẫn React 19 - Tất cả những gì bạn cần biết",
  "Top 10 game hay nhất năm 2026",
  "Cách làm bánh mì tại nhà đơn giản",
  "Du lịch Bali - Những điểm đến tuyệt vời",
  "Sáng tác nhạc với AI - Hướng dẫn chi tiết",
  "Lập trình TypeScript từ cơ bản",
  "Ăn gì khi giảm cân - Thực đơn 7 ngày",
  "Khám phá Tokyo - Vlog du lịch",
  "Tạo website với Tailwind CSS",
  "Nấu cơm tấm Sài Gòn chuẩn vị",
  "Chơi Elden Ring - Boss guide",
  "Học tiếng Anh qua bài hát",
  "Làm bánh cheesecake ngon",
  "Phỏng vấn startup founder",
  "Yoga cho người bận rộn",
  "Xây dựng API REST với Node.js",
  "Vlog: Một ngày của lập trình viên",
  "Nấu mì Ý authentic",
  "Chơi piano - Bài hát nổi tiếng",
  "Kinh doanh online từ A-Z",
];

const videoDescriptions = [
  "Trong video này, tôi sẽ hướng dẫn bạn tất cả những tính năng mới của React 19, bao gồm Server Components, Actions, và nhiều hơn nữa.",
  "Danh sách những game hay nhất được phát hành năm 2026. Từ AAA titles đến indie games độc lập.",
  "Công thức làm bánh mì tại nhà đơn giản, ngon và tiết kiệm. Chỉ cần 5 nguyên liệu cơ bản.",
  "Khám phá những điểm đến tuyệt vời tại Bali. Từ bãi biển đẹp đến các đền thờ cổ kính.",
  "Hướng dẫn cách sáng tác nhạc bằng AI. Công cụ, kỹ thuật và tips từ chuyên gia.",
  "Khóa học TypeScript từ cơ bản đến nâng cao. Phù hợp cho người mới bắt đầu.",
  "Thực đơn giảm cân 7 ngày với các món ăn ngon, lành mạnh và dễ nấu.",
  "Vlog du lịch Tokyo - Khám phá các quán ăn, điểm tham quan và trải nghiệm văn hóa.",
  "Hướng dẫn tạo website đẹp với Tailwind CSS. Responsive design, animation, và component.",
  "Công thức làm cơm tấm Sài Gòn chuẩn vị nhất. Bí quyết từ những người nấu chuyên nghiệp.",
];

const commentTexts = [
  "Video rất hay, cảm ơn bạn!",
  "Giải thích rõ ràng, dễ hiểu lắm",
  "Mình sẽ thử theo hướng dẫn này",
  "Bạn có thể làm video về ... không?",
  "Tuyệt vời! Chờ video tiếp theo",
  "Cảm ơn vì những tips hữu ích",
  "Mình đã áp dụng và thành công rồi",
  "Có thể chi tiết hơn về phần này không?",
  "Rất bổ ích, đã subscribe rồi",
  "Bạn giỏi quá, keep it up!",
];

async function seedDatabase() {
  try {
    console.log("🌱 Bắt đầu seed dữ liệu...");

    // Seed users trước
    console.log("👤 Tạo users...");
    const userIds = [];
    for (const user of mockUsers) {
      const [result] = await sql`
        INSERT INTO users ("openId", name, email, "loginMethod")
        VALUES (${user.openId}, ${user.name}, ${user.email}, ${user.loginMethod})
        ON CONFLICT ("openId") DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      userIds.push(result.id);
    }
    console.log(`✓ Đã tạo ${userIds.length} users`);

    // Seed channels (dùng userIds thực từ DB)
    console.log("📺 Tạo channels...");
    const channelIds = [];
    for (let i = 0; i < mockChannels.length; i++) {
      const channel = mockChannels[i];
      const [result] = await sql`
        INSERT INTO channels ("userId", name, description, "avatarUrl", "subscriberCount")
        VALUES (${userIds[i]}, ${channel.name}, ${channel.description}, ${channel.avatarUrl}, ${channel.subscriberCount})
        RETURNING id
      `;
      channelIds.push(result.id);
    }
    console.log(`✓ Đã tạo ${channelIds.length} channels`);

    // Seed videos
    console.log("🎬 Tạo videos...");
    const videoIds = [];
    for (let i = 0; i < 50; i++) {
      const channelIndex = i % mockChannels.length;
      const titleIndex = i % videoTitles.length;
      const descIndex = i % videoDescriptions.length;

      const title = `${videoTitles[titleIndex]} - Part ${Math.floor(i / videoTitles.length) + 1}`;
      const description = videoDescriptions[descIndex];
      const videoUrl = `/manus-storage/video-${i + 1}.mp4`;
      const thumbnailUrl = `/manus-storage/thumbnail-${i + 1}.jpg`;
      const duration = Math.floor(Math.random() * 1800) + 300;
      const viewCount = Math.floor(Math.random() * 100000) + 100;
      const likeCount = Math.floor(Math.random() * 5000);
      const dislikeCount = Math.floor(Math.random() * 500);
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      const category = CHANNEL_CATEGORIES[channelIndex];
      const [result] = await sql`
        INSERT INTO videos ("channelId", title, description, "videoUrl", "thumbnailUrl", duration, "viewCount", "likeCount", "dislikeCount", category, "createdAt")
        VALUES (${channelIds[channelIndex]}, ${title}, ${description}, ${videoUrl}, ${thumbnailUrl}, ${duration}, ${viewCount}, ${likeCount}, ${dislikeCount}, ${category}, ${createdAt})
        RETURNING id
      `;
      videoIds.push(result.id);
    }
    console.log(`✓ Đã tạo ${videoIds.length} videos`);

    // Seed comments
    console.log("💬 Tạo comments...");
    let commentCount = 0;
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      const numComments = Math.floor(Math.random() * 20) + 5;

      for (let j = 0; j < numComments; j++) {
        const commentIndex = Math.floor(Math.random() * commentTexts.length);
        const userId = (Math.floor(Math.random() * mockChannels.length)) + 1;
        const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

        await sql`
          INSERT INTO comments ("videoId", "userId", content, "likeCount", "createdAt")
          VALUES (${videoId}, ${userId}, ${commentTexts[commentIndex]}, ${Math.floor(Math.random() * 100)}, ${createdAt})
        `;
        commentCount++;
      }
    }
    console.log(`✓ Đã tạo ${commentCount} comments`);

    // Seed likes
    console.log("👍 Tạo likes...");
    let likeCount = 0;
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      const numLikes = Math.floor(Math.random() * 30) + 5;
      const addedUsers = new Set();

      for (let j = 0; j < numLikes; j++) {
        const userId = (j % mockChannels.length) + 1;
        if (addedUsers.has(userId)) continue;
        addedUsers.add(userId);

        const type = Math.random() > 0.3 ? "like" : "dislike";
        const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

        await sql`
          INSERT INTO likes ("videoId", "userId", type, "createdAt")
          VALUES (${videoId}, ${userId}, ${type}, ${createdAt})
        `;
        likeCount++;
      }
    }
    console.log(`✓ Đã tạo ${likeCount} likes`);

    // Seed subscriptions
    console.log("🔔 Tạo subscriptions...");
    let subscriptionCount = 0;
    for (let i = 0; i < channelIds.length; i++) {
      const channelId = channelIds[i];
      const numSubscribers = Math.floor(Math.random() * 50) + 10;
      const addedUsers = new Set();

      for (let j = 0; j < numSubscribers; j++) {
        const userId = userIds[j % userIds.length];
        if (userId === userIds[i] || addedUsers.has(userId)) continue;
        addedUsers.add(userId);

        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        await sql`
          INSERT INTO subscriptions ("channelId", "userId", "createdAt")
          VALUES (${channelId}, ${userId}, ${createdAt})
        `;
        subscriptionCount++;
      }
    }
    console.log(`✓ Đã tạo ${subscriptionCount} subscriptions`);

    console.log("\n✅ Seed dữ liệu thành công!");
    console.log(`📊 Tóm tắt:`);
    console.log(`   - ${userIds.length} users`);
    console.log(`   - ${channelIds.length} channels`);
    console.log(`   - ${videoIds.length} videos`);
    console.log(`   - ${commentCount} comments`);
    console.log(`   - ${likeCount} likes`);
    console.log(`   - ${subscriptionCount} subscriptions`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi seed dữ liệu:", error.message);
    await sql.end();
    process.exit(1);
  }
}

seedDatabase();
