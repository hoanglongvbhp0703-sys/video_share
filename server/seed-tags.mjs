/**
 * Seed tags from existing video categories + "hot" tag for top-viewed.
 * Run: node server/seed-tags.mjs
 * Safe to re-run — all inserts use ON CONFLICT DO NOTHING.
 */
import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

const CATEGORY_TAG_MAP = {
  movies:  "phim",
  gaming:  "gaming",
  music:   "nhac",
  news:    "tin-tuc",
  live:    "live",
  sports:  "the-thao",
};

const HOT_LIMIT = 15; // top N most-viewed videos tagged "hot"

try {
  // 1. Ensure all tags exist
  const allTags = [...Object.values(CATEGORY_TAG_MAP), "hot"];
  for (const name of allTags) {
    await sql`INSERT INTO tags (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
  }
  console.log(`✓ Ensured ${allTags.length} tags: ${allTags.join(", ")}`);

  // 2. Tag videos by their category field
  for (const [category, tagName] of Object.entries(CATEGORY_TAG_MAP)) {
    const [tag] = await sql`SELECT id FROM tags WHERE name = ${tagName}`;
    if (!tag) continue;

    const videos = await sql`SELECT id FROM videos WHERE category = ${category}`;
    for (const video of videos) {
      await sql`
        INSERT INTO "videoTags" ("videoId", "tagId")
        VALUES (${video.id}, ${tag.id})
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`✓ "${tagName}" → ${videos.length} videos (category: ${category})`);
  }

  // 3. Tag top-N most-viewed videos as "hot"
  const [hotTag] = await sql`SELECT id FROM tags WHERE name = 'hot'`;
  if (hotTag) {
    const topVideos = await sql`
      SELECT id FROM videos
      WHERE "isPublished" = true
      ORDER BY "viewCount" DESC
      LIMIT ${HOT_LIMIT}
    `;
    for (const video of topVideos) {
      await sql`
        INSERT INTO "videoTags" ("videoId", "tagId")
        VALUES (${video.id}, ${hotTag.id})
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`✓ "hot" → ${topVideos.length} most-viewed videos`);
  }

  // 4. Verify
  const counts = await sql`
    SELECT t.name, count(vt."videoId")::int as cnt
    FROM tags t
    LEFT JOIN "videoTags" vt ON vt."tagId" = t.id
    GROUP BY t.name
    ORDER BY cnt DESC
  `;
  console.log("\n=== Tag distribution ===");
  counts.forEach(r => console.log(`  ${r.name.padEnd(12)} ${r.cnt} videos`));
  console.log("\nTag seeding completed.");
} catch (err) {
  console.error("Seeding failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
