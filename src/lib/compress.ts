import { supabase } from "@/integrations/supabase/client";

export interface CompressResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  previewUrl: string;
  mimeType: string;
}

/**
 * Aggressively compresses a bill/receipt photo in the browser before upload.
 * - Resizes max dimension to 1280px (preserves full readability of printed/handwritten bills)
 * - Converts to WebP format at 0.6 quality (fallback to JPEG if WebP unsupported)
 * - Typical result: 3-5 MB camera photo shrinks to ~30-60 KB (over 95% storage savings)
 */
export async function compressReceiptImage(file: File): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Selected file is not an image"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Failed to create canvas context"));

        // Fill white background for transparent PNG/WebP conversions
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Attempt WebP first; fallback to JPEG
        const tryExport = (type: string, quality: number) => {
          return new Promise<Blob | null>((res) => {
            canvas.toBlob((b) => res(b), type, quality);
          });
        };

        (async () => {
          try {
            let blob = await tryExport("image/webp", 0.6);
            let mimeType = "image/webp";

            // If webp produced empty or failed, fallback to jpeg
            if (!blob || blob.type !== "image/webp") {
              blob = await tryExport("image/jpeg", 0.6);
              mimeType = "image/jpeg";
            }

            if (!blob) throw new Error("Image compression failed");

            const originalSize = file.size;
            const compressedSize = blob.size;
            const savedPercent = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );
            const previewUrl = URL.createObjectURL(blob);

            resolve({
              blob,
              originalSize,
              compressedSize,
              savedPercent,
              previewUrl,
              mimeType,
            });
          } catch (err) {
            reject(err);
          }
        })();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads compressed receipt blob into the 'receipts' Supabase Storage bucket.
 * Returns public URL of the uploaded receipt.
 */
export async function uploadReceipt({
  userId,
  partyId,
  blob,
  mimeType = "image/webp",
}: {
  userId: string;
  partyId: string;
  blob: Blob;
  mimeType?: string;
}): Promise<string> {
  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const randomStr = Math.random().toString(36).substring(2, 8);
  const filePath = `${userId}/${partyId}/${Date.now()}-${randomStr}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(filePath, blob, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload bill photo: ${uploadError.message}`);
  }

  // Store the private object path, not a public URL. Signed URLs are created only when viewing.
  return filePath;
}

/**
 * Formats byte size to human readable (e.g. 45 KB, 1.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
