import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {

  try {
    const client = await pool.connect();
    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");

    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const query = `
      SELECT 
          id,
          thumbnail,
          name,
          ARRAY_LENGTH(image_ids, 1) AS total_images
      FROM persons
      WHERE id = $1;
    `;

    const result = await client.query(query, [personId]);

    client.release();

    // Convert Buffer -> base64 string
    const formattedRows = result.rows.map((row) => ({
      person_id: row.id,
      name: row.name  ? row.name : 'Add Name',
      face_thumb_bytes:  row.thumbnail
        ? `data:image/jpeg;base64,${Buffer.from(row.thumbnail).toString("base64")}`
        : "",
      totalImages:row.total_images
    }));

    return NextResponse.json(formattedRows[0], { status: 200 });
  } catch (err) {
    console.error("Error fetching person IDs:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
