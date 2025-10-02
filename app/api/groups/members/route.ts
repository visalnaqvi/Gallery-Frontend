import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const pool = new Pool({
  connectionString: process.env.DATABASE,
});

// GET: Fetch all members of a group
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, first_name, last_name, email 
       FROM users 
       WHERE $1 = ANY(groups)
       ORDER BY first_name, last_name`,
      [parseInt(groupId)]
    );

    return NextResponse.json({ members: result.rows }, { status: 200 });
  } catch (err) {
    console.error("Error fetching members:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

// POST: Add member to group
export async function POST(req: NextRequest) {
      const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { groupId, userId } = body;

  if (!groupId || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Check if user is admin
    const groupCheck = await client.query(
      `SELECT admin_user FROM groups WHERE id = $1`,
      [groupId]
    );

   if (groupCheck.rows[0].admin_user !== session.user.id) {
      return NextResponse.json({ error: "Only admin can add members" }, { status: 403 });
    }
    // Add group to user's groups array
    await client.query(
      `UPDATE users 
       SET groups = array_append(groups, $1) 
       WHERE id = $2 AND NOT ($1 = ANY(groups))`,
      [parseInt(groupId), userId]
    );

    return NextResponse.json({ message: "Member added successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error adding member:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE: Remove member from group
export async function DELETE(req: NextRequest) {
          const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const userId = searchParams.get("userId");
  const mode = searchParams.get("mode");
  if (!groupId || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Check if user is admin
    const groupCheck = await client.query(
      `SELECT admin_user FROM groups WHERE id = $1`,
      [groupId]
    );


   if (mode == 'remove' && groupCheck.rows[0].admin_user !== session.user.id) {
      return NextResponse.json({ error: "Only admin can remove members" }, { status: 403 });
    }

    // Remove group from user's groups array
    await client.query(
      `UPDATE users 
       SET groups = array_remove(groups, $1) 
       WHERE id = $2`,
      [parseInt(groupId), userId]
    );

    return NextResponse.json({ message: "Member removed successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error removing member:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}