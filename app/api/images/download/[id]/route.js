import { NextRequest } from "next/server";
import { storage } from "@/lib/firebaseAdmin";

export async function GET(
  req,
  context
) {
  try {
    const { id } = await context.params;

    // Firebase path
    const filePath = `compressed_${id}`;
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    // Get metadata to detect content type
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || "image/jpeg";

    // Determine extension
    const extension = contentType.split("/")[1] || "jpg";
    const downloadFileName = `image_${id}.${extension}`;

    // Download as Buffer
    const [buffer] = await file.download();

    // ✅ Use Response (not NextResponse) to force download
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return new Response(JSON.stringify({ error: "Failed to download file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
