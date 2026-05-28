import postgres from "postgres";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const sql = postgres(DATABASE_URL);
const DEFAULT_PASSWORD = "1234567Long";

async function run() {
  try {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result = await sql`
      UPDATE users
      SET password = ${hash}
      WHERE password IS NULL
      RETURNING id, name, email, "openId"
    `;

    if (result.length === 0) {
      console.log("✓ Không có user nào thiếu password.");
    } else {
      console.log(`✅ Đã set password cho ${result.length} user:`);
      for (const u of result) {
        console.log(`   - [${u.id}] ${u.name ?? "(no name)"} | ${u.email ?? u.openId}`);
      }
      console.log(`\nPassword: ${DEFAULT_PASSWORD}`);
    }
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
