/**
 * Tạo toàn bộ tables trên Supabase PostgreSQL.
 * Chạy: node server/setup-db.mjs
 */
import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const __dir = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dir, "../drizzle/supabase-setup.sql");

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function setupDatabase() {
  try {
    console.log("🔧 Kết nối Supabase...");
    await sql`SELECT 1`; // kiểm tra kết nối
    console.log("✅ Kết nối thành công!\n");

    const setupSQL = readFileSync(sqlFile, "utf-8");

    // Xóa comment lines trước, sau đó tách từng statement
    const cleanSQL = setupSQL
      .split("\n")
      .filter(line => !line.trim().startsWith("--"))
      .join("\n");

    const statements = cleanSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let success = 0;
    let skipped = 0;

    for (const stmt of statements) {
      if (!stmt) continue;
      try {
        await sql.unsafe(stmt);
        success++;
      } catch (err) {
        if (err.message.includes("already exists")) {
          skipped++;
        } else {
          console.warn(`⚠️  Cảnh báo: ${err.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`📊 Kết quả:`);
    console.log(`   - ${success} statements thực thi thành công`);
    console.log(`   - ${skipped} objects đã tồn tại (bỏ qua)`);
    console.log(`\n✅ Database setup hoàn tất!`);
    console.log(`👉 Chạy tiếp: npm run seed`);
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupDatabase();
