// app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
    //   const token = await getToken({ req, secret: process.env.JWT_SECRET });
    // if (!token) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    const userQuery = await client.query(
      'SELECT groups FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rowCount === 0) {
      client.release();
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const groupIds: [] = userQuery.rows[0].groups;

    if (!groupIds || groupIds.length === 0) {
      client.release();
      return NextResponse.json({ groups: [] }, { status: 200 });
    }

    const groupQuery = await client.query(
      `SELECT id, name,profile_pic_bytes, total_images, total_size, admin_user, last_image_uploaded_at, status , access , delete_at
       FROM groups
       WHERE id = ANY($1) order by id`,
      [groupIds]
    );

    client.release();

    const formattedRows = groupQuery.rows.map((row) => ({
      id: row.id,
      name:row.name , 
      profile_pic_bytes: row.profile_pic_bytes
        ? `data:image/jpeg;base64,${Buffer.from(row.profile_pic_bytes).toString("base64")}`
        : "",
        total_images:row.total_images,
        total_size:row.total_size,
        admin_user:row.admin_user,
        last_image_uploaded_at:row.last_image_uploaded_at,
        status:row.status,
      access:row.access,
      delete_at:row.delete_at
    }));

    return NextResponse.json({ groups: formattedRows }, { status: 200 });
  } catch (err) {
    console.error('Error fetching groups:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, userId , profile_pic_bytes , access , planType } = body;
  let profilePicBuffer = null;
    //   const token = await getToken({ req, secret: process.env.JWT_SECRET });
    // if (!token) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
if (profile_pic_bytes) {
  // If it's an array of numbers (e.g. [255, 216, 255, ...])
  if (Array.isArray(profile_pic_bytes)) {
    profilePicBuffer = Buffer.from(profile_pic_bytes);
  }
  // If it's an object with numeric keys (e.g. {0:255, 1:216,...})
  else {
    profilePicBuffer = Buffer.from(Object.values(profile_pic_bytes));
  }
}
  if (!name || !userId) {
    return NextResponse.json({ error: 'Invalid group name or userId' }, { status: 400 });
  }

  try {
    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO groups (name, admin_user, status, total_images, total_size , plan_type , access , profile_pic_bytes , created_at)
       VALUES ($1, $2, 'heating', 0, 0 , $3 , $4 , $5 , NOW())
       RETURNING id`,
      [name, userId , planType , access , profilePicBuffer]
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

// NEW METHOD: Update group status to "heating"
export async function PATCH(req: NextRequest) {
    //   const token = await getToken({ req, secret: process.env.JWT_SECRET });
    // if (!token) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
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
    try {
      // update deleted_at = now + 24 hr
      await client.query(
        `
        UPDATE groups
        SET delete_at = NOW() + interval '24 hours'
        WHERE id = $1
        `,
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
