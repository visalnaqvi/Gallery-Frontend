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

    try {
      // Get invite details
      const inviteQuery = `
        SELECT group_id, is_active 
        FROM invite_links 
        WHERE id = $1 AND is_active = true
      `;
      const inviteResult = await client.query(inviteQuery, [inviteId]);

      if (inviteResult.rows.length === 0) {
        return NextResponse.json({ 
          error: "Invalid or expired invite link" 
        }, { status: 404 });
      }

      const groupId = inviteResult.rows[0].group_id;

      // Check if user already has access using SQL to avoid null issues
      const checkAccessQuery = `
        SELECT 
          CASE 
            WHEN groups IS NULL THEN false
            WHEN $1 = ANY(groups) THEN true
            ELSE false
          END as has_access
        FROM users 
        WHERE id = $2
      `;
      const accessResult = await client.query(checkAccessQuery, [groupId, userId]);
      
      if (accessResult.rows.length === 0) {
        return NextResponse.json({ 
          error: "User not found" 
        }, { status: 404 });
      }

      if (accessResult.rows[0].has_access) {
        return NextResponse.json({ 
          message: "You already have access to this group",
          groupId 
        }, { status: 200 });
      }

      // Add group to user's groups array (handles NULL case)
      const updateQuery = `
        UPDATE users 
        SET groups = COALESCE(groups, ARRAY[]::int[]) || $1::int
        WHERE id = $2
        RETURNING groups
      `;
      await client.query(updateQuery, [groupId, userId]);

      // Mark invite as used
      const markUsedQuery = `
        UPDATE invite_links 
        SET used_at = NOW(), used_by = $1
        WHERE id = $2
      `;
      await client.query(markUsedQuery, [userId, inviteId]);

      return NextResponse.json({ 
        message: "Successfully joined the group",
        groupId 
      }, { status: 200 });

    } finally {
      client.release();
    }

  } catch (err) {
    console.error("Error joining group:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}