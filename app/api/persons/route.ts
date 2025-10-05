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
    const groupId = searchParams.get("groupId");
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    
    let currentUserId = null;
    
    if (!token) {
      const res = await client.query(`
        SELECT access FROM groups WHERE id = $1
      `, [groupId]);

      if (res.rows[0]?.access.toLowerCase() !== 'public') {
        client.release();
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      currentUserId = token.id; // Get current user ID from token
    }
    
    // Query: get persons with user details if claimed
    const query = `
      SELECT 
        p.id,
        p.thumbnail,
        p.name,
        p.user_id,
        u.first_name,
        u.last_name
      FROM persons p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.group_id = $1
        AND p.quality_score >= 0.8 
        AND p.total_images > 1
      ORDER BY 
        CASE WHEN p.user_id = $2 THEN 0 ELSE 1 END,
        p.name, 
        p.total_images DESC
    `;
    
    const result = await client.query(query, [groupId, currentUserId]);

    if (result.rows.length === 0) {
      const queryP = `
        SELECT COUNT(*) as count 
        FROM images 
        WHERE group_id = $1 AND status != 'cooling'
      `;
      const res = await client.query(queryP, [groupId]);
      
      if (res.rows[0].count > 0) {
        client.release();
        return NextResponse.json([], { status: 202 });
      }
    }

    // Convert Buffer -> base64 string
    const formattedRows = result.rows.map((row) => ({
      person_id: row.id,
      name: row.name,
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      is_current_user: row.user_id === currentUserId,
      face_thumb_bytes: row.thumbnail
        ? `data:image/jpeg;base64,${Buffer.from(row.thumbnail).toString("base64")}`
        : "",
    }));

    client.release();
    return NextResponse.json(formattedRows, { status: 200 });
  } catch (err) {
    console.error("Error fetching person IDs:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}