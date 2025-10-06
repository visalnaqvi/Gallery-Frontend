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
    
    if (!groupId) {
      client.release();
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    
    let currentUserId = null;
    let isPublic = false;
    
    // Check if group is public
    const groupRes = await client.query(`
      SELECT access FROM groups WHERE id = $1
    `, [groupId]);

    if (!groupRes.rows.length) {
      client.release();
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    isPublic = groupRes.rows[0].access.toLowerCase() === 'public';

    // If public, return all persons
    if (isPublic) {
      const result = await fetchAllPersons(client, groupId, null);
      client.release();
      return result;
    }

    // If not public and no token, return 401
    if (!token) {
      client.release();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user ID from token
    currentUserId = token.id;

    // Get user's groups and member_groups
    const userRes = await client.query(`
      SELECT groups, member_groups FROM users WHERE id = $1
    `, [currentUserId]);

    if (!userRes.rows.length) {
      client.release();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userGroups = userRes.rows[0].groups || [];
    const memberGroups = userRes.rows[0].member_groups || [];

    // If user is in groups (full access) - return all persons
    if (userGroups.includes(parseInt(groupId))) {
      const result = await fetchAllPersons(client, groupId, currentUserId);
      client.release();
      return result;
    }

    // If user is in member_groups (limited access) - return only their person
    if (memberGroups.includes(parseInt(groupId))) {
      const result = await fetchCurrentUserPerson(client, groupId, currentUserId);
      client.release();
      return result;
    }

    // User has no access to this group
    client.release();
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  } catch (err) {
    console.error("Error fetching person IDs:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Helper function to fetch all persons in a group
async function fetchAllPersons(client: any, groupId: string, currentUserId: string | null) {
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
      return NextResponse.json([], { status: 202 });
    }
  }

  const formattedRows = result.rows.map((row: { id: any; name: any; user_id: string | null; first_name: any; last_name: any; thumbnail: any; }) => ({
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

  return NextResponse.json(formattedRows, { status: 200 });
}

// Helper function to fetch only the current user's person
async function fetchCurrentUserPerson(client: any, groupId: string, currentUserId: string) {
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
      AND p.user_id = $2
      AND p.quality_score >= 0.8 
      AND p.total_images > 1
    ORDER BY 
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
      return NextResponse.json([], { status: 202 });
    }
  }

  const formattedRows = result.rows.map((row: { id: any; name: any; user_id: any; first_name: any; last_name: any; thumbnail: any; }) => ({
    person_id: row.id,
    name: row.name,
    user_id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    is_current_user: true, // Always true since we're fetching current user
    face_thumb_bytes: row.thumbnail
      ? `data:image/jpeg;base64,${Buffer.from(row.thumbnail).toString("base64")}`
      : "",
  }));

  return NextResponse.json(formattedRows, { status: 200 });
}