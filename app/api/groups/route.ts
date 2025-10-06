// app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  



  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

    if (!userId) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }
  try {
    const client = await pool.connect();
    
    // Get user's groups and member_groups
    const userQuery = await client.query(
      'SELECT groups, member_groups FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rowCount === 0) {
      client.release();
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { groups, member_groups } = userQuery.rows[0];
    const allGroupIds = [
      ...(groups || []),
      ...(member_groups || []),
    ];

    if (!allGroupIds || allGroupIds.length === 0) {
      client.release();
      return NextResponse.json({ 
        ownerGroups: [], 
        adminGroups: [], 
        memberGroups: [] 
      }, { status: 200 });
    }

    if (session.is_master && session.user.email !== process.env.MASTER_EMAIL) {
      return NextResponse.json({ error: "NOT AUTHORIZED" }, { status: 401 });
    }

    // Fetch all groups
    const groupQuery = session.is_master && session.user.email == process.env.MASTER_EMAIL 
      ? await client.query(
          `SELECT id, name, profile_pic_bytes, total_images, total_size, admin_user, 
                  last_image_uploaded_at, status, access, delete_at
           FROM groups ORDER BY id DESC`
        )
      : await client.query(
          `SELECT id, name, profile_pic_bytes, total_images, total_size, admin_user, 
                  last_image_uploaded_at, status, access, delete_at
           FROM groups
           WHERE id = ANY($1) ORDER BY id DESC`,
          [allGroupIds]
        );

    client.release();

    const formatGroup = (row: any) => ({
      id: row.id,
      name: row.name,
      profile_pic_bytes: row.profile_pic_bytes
        ? `data:image/jpeg;base64,${Buffer.from(row.profile_pic_bytes).toString("base64")}`
        : "",
      total_images: row.total_images,
      total_size: row.total_size,
      admin_user: row.admin_user,
      last_image_uploaded_at: row.last_image_uploaded_at,
      status: row.status,
      access: row.access,
      delete_at: row.delete_at
    });

    // Categorize groups
    const ownerGroups: any[] = [];
    const adminGroups: any[] = [];
    const memberGroups: any[] = [];

    groupQuery.rows.forEach((row) => {
      const formattedGroup = formatGroup(row);
      
      // Owner: where admin_user matches userId
      if (row.admin_user === userId) {
        ownerGroups.push(formattedGroup);
      }
      // Admin: in users.groups but not owner
      else if (groups && groups.includes(row.id)) {
        adminGroups.push(formattedGroup);
      }
      // Member: in users.member_groups
      else if (member_groups && member_groups.includes(row.id)) {
        memberGroups.push(formattedGroup);
      }
    });

    return NextResponse.json({ 
      ownerGroups, 
      adminGroups, 
      memberGroups 
    }, { status: 200 });
  } catch (err) {
    console.error('Error fetching groups:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, userId, profile_pic_bytes, access, planType } = body;
  let profilePicBuffer = null;

  if (profile_pic_bytes) {
    if (Array.isArray(profile_pic_bytes)) {
      profilePicBuffer = Buffer.from(profile_pic_bytes);
    } else {
      profilePicBuffer = Buffer.from(Object.values(profile_pic_bytes));
    }
  }

  if (!name || !userId) {
    return NextResponse.json({ error: 'Invalid group name or userId' }, { status: 400 });
  }

  try {
    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO groups (name, admin_user, status, total_images, total_size, plan_type, access, profile_pic_bytes, created_at)
       VALUES ($1, $2, 'heating', 0, 0, 'pro', $3, $4, NOW())
       RETURNING id`,
      [name, userId, access, profilePicBuffer]
    );

    await client.query(
      `UPDATE users SET groups = array_append(groups, $1) WHERE id = $2`,
      [result.rows[0].id, userId]
    );

    client.release();
    return NextResponse.json({ message: 'Group created successfully' }, { status: 201 });
  } catch (err) {
    console.error('Error creating group:', err);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { groupId } = body;

  if (!groupId) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  try {
    const client = await pool.connect();

    const result = await client.query(
      `UPDATE groups 
       SET status = 'heating'
       WHERE id = $1
       RETURNING id, name, status`,
      [groupId]
    );

    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Group status updated to heating', group: result.rows[0] },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error updating group status:', err);
    return NextResponse.json({ error: 'Failed to update group status' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const client = await pool.connect();
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    
    if (!token) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    try {
      await client.query(
        `UPDATE groups
         SET delete_at = NOW() + interval '24 hours'
         WHERE id = $1`,
        [groupId]
      );

      return NextResponse.json({
        success: true,
        message: `Group ${groupId} marked for deletion (in 24 hours).`,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in DELETE:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}