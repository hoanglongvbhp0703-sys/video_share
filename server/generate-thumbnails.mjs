import { generateImage } from "./server/_core/imageGeneration.ts";
import { storagePut } from "./server/storage.ts";
import dotenv from "dotenv";

dotenv.config();

const thumbnailPrompts = [
  "Vibrant tech coding screen with glowing code, modern UI design, professional",
  "Colorful gaming controller with neon lights, action-packed gaming scene",
  "Musical notes floating with headphones, colorful gradient background",
  "Beautiful tropical beach sunset with palm trees, travel destination",
  "Delicious food photography, appetizing dish with professional lighting",
  "Modern office workspace with laptop and coffee, productivity theme",
  "Esports gaming setup with RGB lighting, competitive gaming atmosphere",
  "Yoga meditation pose with nature background, peaceful wellness theme",
  "Piano keys with musical notes, elegant music composition",
  "Business growth chart with upward arrow, success and profit theme",
];

async function generateThumbnails() {
  try {
    console.log("🎨 Bắt đầu sinh ảnh thumbnail...");

    for (let i = 1; i <= 50; i++) {
      const promptIndex = (i - 1) % thumbnailPrompts.length;
      const prompt = `${thumbnailPrompts[promptIndex]}, 1280x720 resolution, professional thumbnail design`;

      console.log(`⏳ Sinh ảnh ${i}/50: "${prompt.substring(0, 50)}..."`);

      try {
        // Generate image
        const imageUrl = await generateImage({
          prompt: prompt,
        });

        // Fetch the image
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();

        // Upload to S3
        const fileKey = `thumbnail-${i}.jpg`;
        const { url } = await storagePut(
          fileKey,
          new Uint8Array(buffer),
          "image/jpeg"
        );

        console.log(`✓ Ảnh ${i} đã được upload: ${url}`);
      } catch (error) {
        console.error(`❌ Lỗi sinh ảnh ${i}:`, error.message);
        // Continue to next image even if one fails
      }

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("\n✅ Hoàn thành sinh ảnh thumbnail!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
}

generateThumbnails();
