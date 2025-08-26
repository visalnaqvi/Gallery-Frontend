import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
      const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
WHERE group_id = ${groupId} order by name;

    `;
    
    const result = await client.query(query);

    client.release();

    // Convert Buffer -> base64 string
    const formattedRows = result.rows.map((row) => ({
      person_id: row.id,
      name:row.name , 
      face_thumb_bytes: row.thumbnail
        ? `data:image/jpeg;base64,${Buffer.from(row.thumbnail).toString("base64")}`
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
