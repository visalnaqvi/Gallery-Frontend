// app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from "next-auth/jwt";
const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'Invalid groupId ID' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
 
    const groupQuery = await client.query(
      `SELECT id, name, profile_pic_bytes, total_images, total_size, admin_user, 
              last_image_uploaded_at, plan_type, access, created_at, delete_at, invited_owner
       FROM groups
       WHERE id = $1`,
      [groupId]
    );

    client.release();

    const formattedRows = groupQuery.rows.map((row) => ({
      id: row.id,
      name: row.name,
      profile_pic_bytes: row.profile_pic_bytes
        ? `data:image/jpeg;base64,${Buffer.from(row.profile_pic_bytes).toString("base64")}`
        : "",
      total_images: row.total_images,
      total_size: row.total_size,
      admin_user: row.admin_user,
      last_image_uploaded_at: row.last_image_uploaded_at,
      plan_type: row.plan_type,
      access: row.access,
      created_at: row.created_at,
      delete_at: row.delete_at,
      invited_owner: row.invited_owner
    }));

    return NextResponse.json(formattedRows, { status: 200 });
  } catch (err) {
    console.error('Error fetching groups:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
    //   const token = await getToken({ req, secret: process.env.JWT_SECRET });
    // if (!token) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, plan_type, access, admin_user , profile_pic_bytes } = body;
  let profilePicBuffer = null;
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
    const client = await pool.connect();

await client.query(
  `UPDATE groups
   SET name = $1,
       plan_type = $2,
       access = $3,
       admin_user = $4,
       profile_pic_bytes = COALESCE($5, profile_pic_bytes)
   WHERE id = $6`,
  [name, plan_type, access, admin_user, profilePicBuffer, groupId]
);
    client.release();

    return NextResponse.json({ message: "Group updated successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error updating group:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}