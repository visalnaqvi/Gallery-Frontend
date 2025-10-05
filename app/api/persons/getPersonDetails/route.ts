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
    const token = await getToken({ req, secret: process.env.JWT_SECRET });

    if (!personId) {
      client.release();
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    let currentUserId = null;
    if (token) {
      currentUserId = token.id;
    }

    const query = `
      SELECT 
        p.id,
        p.thumbnail,
        p.name,
        p.total_images,
        p.user_id,
        u.first_name,
        u.last_name
      FROM persons p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1;
    `;

    const result = await client.query(query, [personId]);

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const row = result.rows[0];

    // Format response
    const response = {
      person_id: row.id,
      name: !!row.user_id ? row.first_name+" "+row.last_name : row.name || 'Add Name',
      face_thumb_bytes: row.thumbnail
        ? `data:image/jpeg;base64,${Buffer.from(row.thumbnail).toString("base64")}`
        : "",
      totalImages: row.total_images,
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      is_current_user: row.user_id === currentUserId,
      is_claimed: !!row.user_id,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("Error fetching person details:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}