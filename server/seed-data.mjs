import postgres from "postgres";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(DATABASE_URL);

// Password dùng cho tất cả mock users: Password123!
// Admin user: admin@example.com / Admin123!
const MOCK_PASSWORD = "Password123!";
const ADMIN_PASSWORD = "Admin123!";

const mockUsers = [
  { openId: "mock_user_1", name: "Minh Tuấn", email: "minhtuan@example.com", loginMethod: "local" },
  { openId: "mock_user_2", name: "Hồng Anh", email: "honganh@example.com", loginMethod: "local" },
  { openId: "mock_user_3", name: "Quốc Bảo", email: "quocbao@example.com", loginMethod: "local" },
  { openId: "mock_user_4", name: "Thúy Linh", email: "thuylinh@example.com", loginMethod: "local" },
  { openId: "mock_user_5", name: "Đức Thành", email: "ducthanh@example.com", loginMethod: "local" },
];

const mockChannels = [
  {
    name: "Tech Việt",
    description: "Tin tức công nghệ, AI, lập trình và review thiết bị mới nhất",
    avatarUrl: "https://picsum.photos/seed/channel-tech/80/80",
    subscriberCount: 28450,
  },
  {
    name: "Gaming Pro VN",
    description: "Gaming, esports, hướng dẫn game và review phụ kiện gaming",
    avatarUrl: "https://picsum.photos/seed/channel-gaming/80/80",
    subscriberCount: 15920,
  },
  {
    name: "Music Vibes",
    description: "Nhạc chill, cover acoustic, beat making và nhạc lo-fi",
    avatarUrl: "https://picsum.photos/seed/channel-music/80/80",
    subscriberCount: 19340,
  },
  {
    name: "Movie Review VN",
    description: "Review phim, phân tích series và top phim hay mỗi tuần",
    avatarUrl: "https://picsum.photos/seed/channel-movies/80/80",
    subscriberCount: 12780,
  },
  {
    name: "Lifestyle VN",
    description: "Thể thao, ăn uống, du lịch và cuộc sống khỏe mạnh",
    avatarUrl: "https://picsum.photos/seed/channel-lifestyle/80/80",
    subscriberCount: 22100,
  },
];

// channelIndex: 0=Tech, 1=Gaming, 2=Music, 3=Movies, 4=Lifestyle
const videoData = [
  // --- NEWS (4 videos) ---
  {
    channelIndex: 0,
    category: "news",
    title: "ChatGPT vs Claude 2026: AI nào thông minh hơn?",
    description: "So sánh chi tiết hai mô hình AI hàng đầu thế giới trong năm 2026. Test thực tế qua lập trình, viết lách, phân tích dữ liệu và sáng tạo nội dung. Kết quả sẽ khiến bạn bất ngờ.",
    thumbnailUrl: "https://picsum.photos/seed/ai-battle/640/360",
    duration: 1842,
    viewCount: 87430,
    likeCount: 4210,
    dislikeCount: 185,
  },
  {
    channelIndex: 0,
    category: "news",
    title: "Review MacBook Pro M4: Có đáng mua không?",
    description: "Đánh giá toàn diện MacBook Pro M4 sau 30 ngày sử dụng. Hiệu năng, pin, màn hình, và liệu con chip M4 có thực sự vượt trội so với M3? Dành cho cả developer lẫn creative.",
    thumbnailUrl: "https://picsum.photos/seed/macbook-review/640/360",
    duration: 2134,
    viewCount: 63210,
    likeCount: 3087,
    dislikeCount: 142,
  },
  {
    channelIndex: 0,
    category: "news",
    title: "Lập trình TypeScript 5.0 — Tất cả tính năng mới",
    description: "Hướng dẫn đầy đủ về TypeScript 5.0: decorators mới, satisfies operator, const type parameters và nhiều hơn nữa. Có demo thực tế từng tính năng với ví dụ dễ hiểu.",
    thumbnailUrl: "https://picsum.photos/seed/typescript-code/640/360",
    duration: 3256,
    viewCount: 41870,
    likeCount: 2341,
    dislikeCount: 67,
  },
  {
    channelIndex: 0,
    category: "news",
    title: "Học tiếng Anh qua phim — Phương pháp hiệu quả nhất 2026",
    description: "Kỹ thuật shadowing và extensive listening qua phim ảnh, series. Hướng dẫn chọn phim phù hợp, cách note vocab và luyện phát âm chuẩn như người bản xứ không cần đến lớp.",
    thumbnailUrl: "https://picsum.photos/seed/english-learning/640/360",
    duration: 1678,
    viewCount: 52340,
    likeCount: 3120,
    dislikeCount: 98,
  },

  // --- GAMING (3 videos) ---
  {
    channelIndex: 1,
    category: "gaming",
    title: "Top 10 Game AAA hay nhất 2026 — Xếp hạng chi tiết",
    description: "Điểm mặt 10 tựa game bom tấn hay nhất nửa đầu 2026. Từ RPG đến FPS, mỗi game được đánh giá về gameplay, đồ họa, story và giá trị đồng tiền. Bạn đã chơi hết chưa?",
    thumbnailUrl: "https://picsum.photos/seed/gaming-top10/640/360",
    duration: 2890,
    viewCount: 124500,
    likeCount: 7823,
    dislikeCount: 312,
  },
  {
    channelIndex: 1,
    category: "gaming",
    title: "Elden Ring DLC — Hướng dẫn đánh boss khó nhất",
    description: "Shadow of the Erdtree: Hướng dẫn chi tiết cách đánh Promised Consort Radahn và Messmer the Impaler. Build được khuyên dùng, phase transitions và những lỗi thường gặp cần tránh.",
    thumbnailUrl: "https://picsum.photos/seed/elden-ring/640/360",
    duration: 1534,
    viewCount: 98760,
    likeCount: 5432,
    dislikeCount: 201,
  },
  {
    channelIndex: 1,
    category: "gaming",
    title: "Minecraft 1.22 — Build thành phố siêu hoành tráng từ đầu",
    description: "Timelapse và hướng dẫn build thành phố hiện đại với 50+ tòa nhà, hệ thống metro ngầm, sân bay và công viên. Resource pack đẹp, không cần mod phức tạp.",
    thumbnailUrl: "https://picsum.photos/seed/minecraft-city/640/360",
    duration: 2245,
    viewCount: 76430,
    likeCount: 4890,
    dislikeCount: 156,
  },

  // --- MUSIC (3 videos) ---
  {
    channelIndex: 2,
    category: "music",
    title: "Nhạc Lo-fi Chill Học Bài — 2 Giờ Không Quảng Cáo",
    description: "Playlist lo-fi hip hop được chọn lọc kỹ càng cho việc học bài, làm việc và thư giãn. Không quảng cáo ngắt quãng, âm thanh lossless chất lượng cao. Bgm nhẹ nhàng không làm phân tâm.",
    thumbnailUrl: "https://picsum.photos/seed/lofi-music/640/360",
    duration: 7234,
    viewCount: 234560,
    likeCount: 12340,
    dislikeCount: 234,
  },
  {
    channelIndex: 2,
    category: "music",
    title: "Cover 'Đừng Làm Trái Tim Anh Đau' — Acoustic Guitar",
    description: "Cover acoustic bài hit của Sơn Tùng M-TP với phong cách nhẹ nhàng, tập trung vào giai điệu và cảm xúc. Chỉ guitar và giọng hát, không auto-tune. Chord và tab guitar ở phần mô tả.",
    thumbnailUrl: "https://picsum.photos/seed/acoustic-guitar/640/360",
    duration: 287,
    viewCount: 189340,
    likeCount: 9870,
    dislikeCount: 145,
  },
  {
    channelIndex: 2,
    category: "music",
    title: "Sáng Tác Beat Trap Với FL Studio Từ Con Số 0",
    description: "Tutorial làm beat trap từ đầu hoàn toàn trong FL Studio 21. 808 bass, hi-hat patterns, melody leads và mixing cơ bản. Sau video bạn có thể tự tạo beat hoàn chỉnh trong 30 phút.",
    thumbnailUrl: "https://picsum.photos/seed/music-studio/640/360",
    duration: 3412,
    viewCount: 45670,
    likeCount: 2890,
    dislikeCount: 78,
  },

  // --- MOVIES (3 videos) ---
  {
    channelIndex: 3,
    category: "movies",
    title: "Review Dune Part 3 — Có Xứng Đáng Oscar Không?",
    description: "Đánh giá chi tiết Dune: Messiah (2026) — phần cuối của trilogy. Diễn xuất, hiệu ứng hình ảnh, cốt truyện so với nguyên tác và vị trí của nó trong lịch sử điện ảnh sci-fi. SPOILER nhẹ.",
    thumbnailUrl: "https://picsum.photos/seed/dune-movie/640/360",
    duration: 1823,
    viewCount: 67890,
    likeCount: 4123,
    dislikeCount: 234,
  },
  {
    channelIndex: 3,
    category: "movies",
    title: "Top 15 Phim Hành Động Hay Nhất 2026 — Không Bỏ Được",
    description: "Xếp hạng 15 phim action bom tấn và indie đáng xem nhất 2026. Từ siêu anh hùng đến thriller căng thẳng. Mỗi phim có điểm chất lượng, lý do nên xem và rating của giới phê bình.",
    thumbnailUrl: "https://picsum.photos/seed/action-movies/640/360",
    duration: 2156,
    viewCount: 93210,
    likeCount: 5670,
    dislikeCount: 189,
  },
  {
    channelIndex: 3,
    category: "movies",
    title: "Phân Tích Kết Thúc The Last of Us Season 3 — Ý Nghĩa Thật Sự",
    description: "Deep dive vào tập cuối mùa 3 của The Last of Us. Tại sao ending này hoàn hảo cho toàn bộ series, những chi tiết ẩn từ mùa 1 và lý giải quyết định của nhân vật chính. Full spoiler.",
    thumbnailUrl: "https://picsum.photos/seed/tv-series/640/360",
    duration: 2567,
    viewCount: 78450,
    likeCount: 4980,
    dislikeCount: 312,
  },

  // --- SPORTS (3 videos) ---
  {
    channelIndex: 4,
    category: "sports",
    title: "Chạy Bộ 10km Mỗi Ngày — Kết Quả Thật Sau 30 Ngày",
    description: "Thử thách chạy bộ 10km liên tục 30 ngày: thay đổi về thể trọng, sức bền, sức khỏe tổng thể và tinh thần. Honest review với số liệu thực tế, những ngày khó khăn và cách vượt qua.",
    thumbnailUrl: "https://picsum.photos/seed/running-sport/640/360",
    duration: 1234,
    viewCount: 43210,
    likeCount: 2876,
    dislikeCount: 67,
  },
  {
    channelIndex: 4,
    category: "sports",
    title: "Yoga Buổi Sáng 20 Phút — Bắt Đầu Ngày Mới Tràn Đầy Năng Lượng",
    description: "Bài tập yoga 20 phút dành cho người mới bắt đầu. Các tư thế cơ bản giúp kéo căng cơ thể, cải thiện linh hoạt và tập trung tâm trí. Không cần kinh nghiệm yoga, chỉ cần thảm tập.",
    thumbnailUrl: "https://picsum.photos/seed/yoga-morning/640/360",
    duration: 1198,
    viewCount: 67890,
    likeCount: 4123,
    dislikeCount: 89,
  },
  {
    channelIndex: 4,
    category: "sports",
    title: "Gym Tại Nhà — Bài Tập Full Body Không Cần Dụng Cụ",
    description: "Workout calisthenics 45 phút tập toàn thân tại nhà: push-up variations, squat, plank, dip và cardio HIIT. Phù hợp cả người mới lẫn trung cấp. Có phần warm-up và cool-down đầy đủ.",
    thumbnailUrl: "https://picsum.photos/seed/home-workout/640/360",
    duration: 2734,
    viewCount: 54320,
    likeCount: 3456,
    dislikeCount: 112,
  },

  // --- LIVE (4 videos) ---
  {
    channelIndex: 4,
    category: "live",
    title: "Nấu Bún Bò Huế Chuẩn Vị Miền Trung — Công Thức Gia Truyền",
    description: "Hướng dẫn nấu bún bò Huế đúng cách với nước dùng đậm đà, thịt mềm và các loại chả cần thiết. Công thức từ người Huế chính gốc. Bí quyết để nước dùng không bị đục và thơm mùi sả.",
    thumbnailUrl: "https://picsum.photos/seed/vietnamese-food/640/360",
    duration: 1876,
    viewCount: 87650,
    likeCount: 5670,
    dislikeCount: 123,
  },
  {
    channelIndex: 4,
    category: "live",
    title: "Làm Bánh Mì Việt Nam Giòn Thơm Tại Nhà — Không Cần Lò Nướng Xịn",
    description: "Công thức làm vỏ bánh mì Việt Nam giòn xốp với lớp vỏ mỏng và ruột nhẹ. Kỹ thuật nhào bột đúng cách, thời gian ủ và nhiệt độ nướng tối ưu. Cả nhà ai cũng làm được.",
    thumbnailUrl: "https://picsum.photos/seed/bread-baking/640/360",
    duration: 2345,
    viewCount: 112340,
    likeCount: 6780,
    dislikeCount: 156,
  },
  {
    channelIndex: 4,
    category: "live",
    title: "Du Lịch Đà Nẵng 3 Ngày 2 Đêm — Full Vlog & Chi Phí Thực Tế",
    description: "Vlog du lịch Đà Nẵng tự túc: Bà Nà Hills, Cầu Rồng, Mỹ Khê, Hội An 1 ngày. Chi phí thực tế ăn uống, di chuyển, khách sạn. Tips tiết kiệm và những nơi ít người biết.",
    thumbnailUrl: "https://picsum.photos/seed/danang-travel/640/360",
    duration: 3123,
    viewCount: 98760,
    likeCount: 5890,
    dislikeCount: 198,
  },
  {
    channelIndex: 4,
    category: "live",
    title: "Khám Phá Chợ Đêm Hà Nội — Street Food Tour Phố Cổ",
    description: "Tour ẩm thực đường phố Hà Nội lúc nửa đêm: bún ốc nguội, bánh cuốn Thanh Trì, chả cá Lã Vọng, phở bò đêm khuya. Review thực tế giá cả và chất lượng từng quán.",
    thumbnailUrl: "https://picsum.photos/seed/hanoi-street/640/360",
    duration: 1567,
    viewCount: 76540,
    likeCount: 4560,
    dislikeCount: 134,
  },
];

const commentTexts = [
  "Video rất hay, cảm ơn bạn đã chia sẻ!",
  "Giải thích rõ ràng, dễ hiểu lắm, subscribe rồi nha",
  "Mình đã thử theo và thành công rồi, cảm ơn nhiều",
  "Bạn có thể làm thêm video về chủ đề này không?",
  "Tuyệt vời! Đang chờ video tiếp theo của bạn",
  "Cảm ơn vì những tips hữu ích, rất thiết thực",
  "Nội dung chất lượng cao, kênh này xứng đáng triệu sub",
  "Có thể chi tiết hơn về phần cuối không, mình chưa hiểu lắm",
  "Rất bổ ích, đã share cho bạn bè rồi",
  "Bạn giỏi quá, keep it up! Ủng hộ dài dài",
  "Đây là video hay nhất về chủ đề này mình từng xem",
  "Cảm ơn bạn đã bỏ công sức làm video chất lượng như vậy",
  "Mình xem đi xem lại mấy lần rồi, vẫn học được cái mới",
];

async function seedDatabase() {
  try {
    console.log("🌱 Bắt đầu seed dữ liệu...");

    // Hash passwords
    console.log("🔑 Tạo password hashes...");
    const mockPasswordHash = await bcrypt.hash(MOCK_PASSWORD, 10);
    const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Seed admin user
    console.log("👑 Tạo admin user...");
    await sql`
      INSERT INTO users ("openId", name, email, "loginMethod", "passwordHash", role)
      VALUES ('admin_user', 'Admin', 'admin@example.com', 'local', ${adminPasswordHash}, 'admin')
      ON CONFLICT ("openId") DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        "passwordHash" = EXCLUDED."passwordHash",
        role = EXCLUDED.role
    `;
    console.log("✓ Admin user: admin@example.com / Admin123!");

    // Seed users (upsert by openId)
    console.log("👤 Tạo users...");
    const userIds = [];
    for (const user of mockUsers) {
      const [result] = await sql`
        INSERT INTO users ("openId", name, email, "loginMethod", "passwordHash")
        VALUES (${user.openId}, ${user.name}, ${user.email}, ${user.loginMethod}, ${mockPasswordHash})
        ON CONFLICT ("openId") DO UPDATE SET name = EXCLUDED.name, "passwordHash" = EXCLUDED."passwordHash"
        RETURNING id
      `;
      userIds.push(result.id);
    }
    console.log(`✓ Đã tạo ${userIds.length} users (password: ${MOCK_PASSWORD})`);

    // Seed channels (upsert by userId — mỗi user chỉ có 1 channel)
    console.log("📺 Tạo channels...");
    const channelIds = [];
    for (let i = 0; i < mockChannels.length; i++) {
      const channel = mockChannels[i];
      const [result] = await sql`
        INSERT INTO channels ("userId", name, description, "avatarUrl", "subscriberCount")
        VALUES (${userIds[i]}, ${channel.name}, ${channel.description}, ${channel.avatarUrl}, ${channel.subscriberCount})
        ON CONFLICT ("userId") DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          "avatarUrl" = EXCLUDED."avatarUrl",
          "subscriberCount" = EXCLUDED."subscriberCount"
        RETURNING id
      `;
      channelIds.push(result.id);
    }

    // Xóa toàn bộ videos cũ của các seeded channels để tránh duplicate khi seed lại
    console.log("🗑️ Xóa videos cũ của seeded channels...");
    await sql`DELETE FROM videos WHERE "channelId" = ANY(${channelIds})`;

    console.log(`✓ Đã tạo ${channelIds.length} channels`);

    // Public domain sample videos (Google Cloud Storage) — cycle through for variety
    const SAMPLE_VIDEOS = [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    ];

    // Seed videos
    console.log("🎬 Tạo videos...");
    const videoIds = [];
    for (let i = 0; i < videoData.length; i++) {
      const v = videoData[i];
      const videoUrl = SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length];
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      const [result] = await sql`
        INSERT INTO videos ("channelId", title, description, "videoUrl", "thumbnailUrl", duration, "viewCount", "likeCount", "dislikeCount", category, "createdAt")
        VALUES (
          ${channelIds[v.channelIndex]},
          ${v.title},
          ${v.description},
          ${videoUrl},
          ${v.thumbnailUrl},
          ${v.duration},
          ${v.viewCount},
          ${v.likeCount},
          ${v.dislikeCount},
          ${v.category},
          ${createdAt}
        )
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
      const numComments = Math.floor(Math.random() * 12) + 3;

      for (let j = 0; j < numComments; j++) {
        const commentIndex = Math.floor(Math.random() * commentTexts.length);
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

        await sql`
          INSERT INTO comments ("videoId", "userId", content, "likeCount", "createdAt")
          VALUES (${videoId}, ${userId}, ${commentTexts[commentIndex]}, ${Math.floor(Math.random() * 150)}, ${createdAt})
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
      const numLikes = Math.floor(Math.random() * 20) + 5;
      const addedUsers = new Set();

      for (let j = 0; j < numLikes; j++) {
        const userId = userIds[j % userIds.length];
        if (addedUsers.has(userId)) continue;
        addedUsers.add(userId);

        const type = Math.random() > 0.25 ? "like" : "dislike";
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
      const addedUsers = new Set();

      for (let j = 0; j < userIds.length; j++) {
        const userId = userIds[j];
        if (userId === userIds[i] || addedUsers.has(userId)) continue;
        if (Math.random() < 0.6) continue; // 40% chance subscribe
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
    console.log(`   - 1 admin user (admin@example.com / Admin123!)`);
    console.log(`   - ${userIds.length} mock users (password: ${MOCK_PASSWORD})`);
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
