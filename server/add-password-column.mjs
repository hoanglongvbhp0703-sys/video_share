import postgres from "postgres";
import bcrypt from "bcryptjs";
import "dotenv/config";

const DEFAULT_PASSWORD = "123456Long";

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    // 1. Thêm column password
    console.log("Adding password column...");
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "password" text
    `;
    console.log("✓ Column 'password' added");

    // 2. Đảm bảo unique constraint tồn tại trên openId
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_openId_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT "users_openId_unique" UNIQUE ("openId");
        END IF;
      END $$
    `;
    console.log("✓ Unique constraint on openId ensured");

    // 3. Hash default password bằng bcrypt (salt rounds = 10)
    console.log(`Hashing default password "${DEFAULT_PASSWORD}"...`);
    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log("✓ Password hashed");

    // 4. Cập nhật tất cả user chưa có password
    const result = await sql`
      UPDATE users
      SET password = ${hashed}
      WHERE password IS NULL
      RETURNING id, "openId", name
    `;

    console.log(`✓ Updated ${result.length} users with default password`);
    result.forEach(u => console.log(`  - [${u.id}] ${u.name || u.openId}`));

    console.log("\n✅ Done! Default password for all users: 123456Long");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
