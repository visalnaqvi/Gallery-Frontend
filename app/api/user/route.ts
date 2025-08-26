import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});
function toBase64(bytes: Buffer | null) {
  if (!bytes) return null;
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}
// GET /api/user?userId={id}
export async function GET(req: NextRequest) {
      const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT id, first_name, last_name, email, plan_type, groups 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRes.rows[0];

    // Fetch group details
    let groups = [];
    if (user.groups && user.groups.length > 0) {
      const groupRes = await client.query(
        `SELECT id, name, total_images, created_at, profile_pic_bytes 
         FROM groups WHERE id = ANY($1)`,
        [user.groups]
      );
        groups = groupRes.rows.map((g) => ({
        ...g,
        profile_pic_bytes: toBase64(g.profile_pic_bytes), // convert bytes to image string
      }));
    }

    return NextResponse.json({ ...user, groups });
  } finally {
    client.release();
  }
}

// POST /api/user?userId={}
export async function POST(req: NextRequest) {
      const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const body = await req.json();
  const { first_name, last_name, email, password, plan_type } = body;

  const client = await pool.connect();
  try {
    let hashedPassword: string | null = null;

    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    if (hashedPassword) {
      await client.query(
        `UPDATE users 
         SET first_name=$1, last_name=$2, email=$3, password_hash=$4, plan_type=$5 
         WHERE id=$6`,
        [first_name, last_name, email, hashedPassword, plan_type, userId]
      );
    } else {
      await client.query(
        `UPDATE users 
         SET first_name=$1, last_name=$2, email=$3, plan_type=$4 
         WHERE id=$5`,
        [first_name, last_name, email, plan_type, userId]
      );
    }

    return NextResponse.json({ message: "User updated successfully" });
  } finally {
    client.release();
  }
}
