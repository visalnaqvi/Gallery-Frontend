import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";
import { nanoid } from "nanoid";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const client = await pool.connect();

    // Generate unique invite ID
    const inviteId = nanoid(12); // Generates a 12-character unique ID

    // Insert into invite_links table
    const query = `
      INSERT INTO invite_links (id, group_id, created_by, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, group_id, created_at
    `;

    const result = await client.query(query, [inviteId, groupId, token.sub || token.id]);

    client.release();

    return NextResponse.json({
      inviteId: result.rows[0].id,
      groupId: result.rows[0].group_id,
      createdAt: result.rows[0].created_at,
    }, { status: 200 });

  } catch (err) {
    console.error("Error generating invite link:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}