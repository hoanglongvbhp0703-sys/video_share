// Storage helpers — ưu tiên: Supabase Storage > Forge > Local disk
// Supabase: set SUPABASE_URL + SUPABASE_SERVICE_KEY + SUPABASE_BUCKET
// Forge: set BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY
// Local fallback: lưu vào server/uploads/, serve qua /uploads/*

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { ENV } from "./_core/env";

const UPLOADS_DIR = join(process.cwd(), "server", "uploads");

function storagePutLocal(relKey: string, data: Buffer | Uint8Array | string): { key: string; url: string } {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = join(UPLOADS_DIR, key);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array));
  return { key, url: `/uploads/${key}` };
}

function isSupabaseConfigured() {
  return !!(ENV.supabaseUrl && ENV.supabaseServiceKey);
}

async function storagePutSupabase(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(sanitizeKey(normalizeKey(relKey)));
  const bucket = ENV.supabaseBucket;
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  const url = `${ENV.supabaseUrl}/storage/v1/object/${bucket}/${key}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.supabaseServiceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Supabase Storage upload failed (${resp.status}): ${msg}`);
  }

  const publicUrl = `${ENV.supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
  return { key, url: publicUrl };
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function sanitizeKey(key: string): string {
  // Giữ lại cấu trúc thư mục (path segments), sanitize từng segment
  return key
    .split("/")
    .map((segment) =>
      segment
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")   // bỏ dấu tiếng Việt
        .replace(/[^\w.\-]/g, "_")          // ký tự đặc biệt → _
        .replace(/_+/g, "_")                // nhiều _ liên tiếp → 1 _
        .replace(/^_+|_+$/g, "")            // bỏ _ đầu/cuối
    )
    .join("/");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  if (isSupabaseConfigured()) {
    return storagePutSupabase(relKey, data, contentType);
  }

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return storagePutLocal(relKey, data);
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
