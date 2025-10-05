import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteId, userId } = await req.json();

    if (!inviteId || !userId) {
      return NextResponse.json({ 
        error: "inviteId and userId are required" 
      }, { status: 400 });
    }

    const client = await pool.connect();

    // Get invite details
    const inviteQuery = `
      SELECT group_id, is_active 
      FROM invite_links 
      WHERE id = $1 AND is_active = true
    `;
    const inviteResult = await client.query(inviteQuery, [inviteId]);

    if (inviteResult.rows.length === 0) {
      client.release();
      return NextResponse.json({ 
        error: "Invalid or expired invite link" 
      }, { status: 404 });
    }

    const groupId = inviteResult.rows[0].group_id;

    // Check if user already has access
    const userQuery = `SELECT groups FROM users WHERE id = $1`;
    const userResult = await client.query(userQuery, [userId]);
    
    const currentGroups = userResult.rows[0]?.groups || [];
    
    if (currentGroups.includes(groupId)) {
      client.release();
      return NextResponse.json({ 
        message: "You already have access to this group" 
      }, { status: 200 });
    }

    // Add group to user's groups array
    const updateQuery = `
      UPDATE users 
      SET groups = array_append(groups, $1)
      WHERE id = $2
      RETURNING groups
    `;
    await client.query(updateQuery, [groupId, userId]);

    // Mark invite as used (optional)
    const markUsedQuery = `
      UPDATE invite_links 
      SET used_at = NOW(), used_by = $1
      WHERE id = $2
    `;
    await client.query(markUsedQuery, [userId, inviteId]);

    client.release();

    return NextResponse.json({ 
      message: "Successfully joined the group",
      groupId 
    }, { status: 200 });

  } catch (err) {
    console.error("Error joining group:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}