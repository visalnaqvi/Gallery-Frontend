import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
  try {
    const client = await pool.connect();
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    // Query: get distinct person_id with any one thumb_byte
    const query = `
SELECT 
    id,
    thumbnail,
    name
FROM persons
WHERE group_id = ${groupId};

    `;
    
    const result = await client.query(query);

    client.release();

    // Convert Buffer -> base64 string
    const formattedRows = result.rows.map((row) => ({
      person_id: row.id,
      face_thumb_bytes: row.thumbnail
        ? Buffer.from(row.thumbnail).toString("base64")
        : "",
    }));

    return NextResponse.json(formattedRows, { status: 200 });
  } catch (err) {
    console.error("Error fetching person IDs:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
