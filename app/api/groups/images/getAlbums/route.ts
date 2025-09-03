// app/api/image-albums/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json(
      { error: "Missing imageId query parameter" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT album_id
      FROM album_images
      WHERE image_id = $1
      `,
      [imageId]
    );

    // Map to array of IDs
    const albumIds = result.rows.map((row) => row.album_id);

    return NextResponse.json({ albumIds });
  } catch (err) {
    console.error("Error fetching albums for image:", err);
    return NextResponse.json(
      { error: "Failed to fetch albums for this image" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
