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

    // Check if there's already an active invite link for this group
    const checkQuery = `
      SELECT id, group_id, created_at
      FROM invite_links
      WHERE group_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const existingResult = await client.query(checkQuery, [groupId]);

    // If active invite exists, return it
    if (existingResult.rows.length > 0) {
      client.release();
      return NextResponse.json({
        inviteId: existingResult.rows[0].id,
        groupId: existingResult.rows[0].group_id,
        createdAt: existingResult.rows[0].created_at,
        isExisting: true,
      }, { status: 200 });
    }

    // Generate unique invite ID
    const inviteId = nanoid(12);

    // Insert into invite_links table
    const insertQuery = `
      INSERT INTO invite_links (id, group_id, created_by, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, group_id, created_at
    `;

    const result = await client.query(insertQuery, [inviteId, groupId, token.sub || token.id]);

    client.release();

    return NextResponse.json({
      inviteId: result.rows[0].id,
      groupId: result.rows[0].group_id,
      createdAt: result.rows[0].created_at,
      isExisting: false,
    }, { status: 200 });

  } catch (err) {
    console.error("Error generating invite link:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}