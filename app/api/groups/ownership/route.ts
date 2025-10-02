import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const pool = new Pool({
  connectionString: process.env.DATABASE,
});

// POST: Send ownership invitation
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
  const { groupId, invitedUserId } = body;

  if (!groupId || !invitedUserId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Verify current user is admin
    const groupCheck = await client.query(
      `SELECT admin_user FROM groups WHERE id = $1`,
      [groupId]
    );

    
   if (groupCheck.rows[0].admin_user !== session.user.id) {
      return NextResponse.json({ error: "Only admin can invite owners" }, { status: 403 });
    }

    // Update invited_owner column
    await client.query(
      `UPDATE groups 
       SET invited_owner = $1 
       WHERE id = $2`,
      [invitedUserId, groupId]
    );

    return NextResponse.json({ message: "Ownership invitation sent" }, { status: 200 });
  } catch (err) {
    console.error("Error sending ownership invitation:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

// PATCH: Accept or reject ownership
export async function PATCH(req: NextRequest) {
            const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { groupId, action } = body; // action: 'accept' or 'reject'

  if (!groupId || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Verify current user is the invited owner
    const groupCheck = await client.query(
      `SELECT invited_owner FROM groups WHERE id = $1`,
      [groupId]
    );

       if (groupCheck.rows[0].invited_owner !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === 'accept') {
      // Transfer ownership
      await client.query(
        `UPDATE groups 
         SET admin_user = $1, invited_owner = NULL 
         WHERE id = $2`,
        [session.user.id, groupId]
      );
      return NextResponse.json({ message: "Ownership transferred successfully" }, { status: 200 });
    } else if (action === 'reject') {
      // Clear invitation
      await client.query(
        `UPDATE groups 
         SET invited_owner = NULL 
         WHERE id = $1`,
        [groupId]
      );
      return NextResponse.json({ message: "Invitation rejected" }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Error processing ownership action:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE: Cancel ownership invitation
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

  if (!groupId) {
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Verify current user is admin
    const groupCheck = await client.query(
      `SELECT admin_user FROM groups WHERE id = $1`,
      [groupId]
    );

       if (groupCheck.rows[0].admin_user !== session.user.id) {
      return NextResponse.json({ error: "Only admin can cancel invitations" }, { status: 403 });
    }

    await client.query(
      `UPDATE groups 
       SET invited_owner = NULL 
       WHERE id = $1`,
      [groupId]
    );

    return NextResponse.json({ message: "Invitation cancelled" }, { status: 200 });
  } catch (err) {
    console.error("Error cancelling invitation:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}