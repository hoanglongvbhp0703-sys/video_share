import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
  ORDER BY ordinal_position
`;
console.log("=== public.users table columns on Supabase ===");
cols.forEach(c =>
  console.log(`  ${c.column_name.padEnd(15)} ${c.data_type.padEnd(20)} nullable=${c.is_nullable}`)
);
await sql.end();
