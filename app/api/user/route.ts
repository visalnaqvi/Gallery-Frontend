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

function extractBase64Data(dataUrl: string | null): string | null {
  if (!dataUrl) return null;
  
  // Handle both data URLs and plain base64 strings
  if (dataUrl.startsWith('data:')) {
    const parts = dataUrl.split(',');
    return parts.length > 1 ? parts[1] : null;
  }
  
  // If it's already a plain base64 string
  return dataUrl;
}

// GET /api/user?userId={id}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT id, first_name, last_name, email, plan_type, groups, studio_name, studio_logo 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRes.rows[0];

    let groups = [];
    if (user.groups && user.groups.length > 0) {
      const groupRes = await client.query(
        `SELECT id, name, total_images, created_at, profile_pic_bytes 
         FROM groups WHERE id = ANY($1)`,
        [user.groups]
      );
      groups = groupRes.rows.map((g) => ({
        ...g,
        profile_pic_bytes: toBase64(g.profile_pic_bytes),
      }));
    }

    return NextResponse.json({
      ...user,
      studio_logo: toBase64(user.studio_logo),
      groups,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    client.release();
  }
}

// POST /api/user?userId={}
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const body = await req.json();
  const {
    first_name,
    last_name,
    email,
    password,
    plan_type,
    studio_name,
    studio_logo,
  } = body;

  const client = await pool.connect();
  try {
    let hashedPassword: string | null = null;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    let profilePicBuffer = null;
    if (studio_logo) {
      // Extract the raw base64 part if it's a Data URL
      const base64 = extractBase64Data(studio_logo);
      if (base64) {
        profilePicBuffer = Buffer.from(base64, "base64");
      }
    }

    if (hashedPassword) {
      await client.query(
        `UPDATE users 
         SET first_name=$1, last_name=$2, email=$3, password_hash=$4, studio_name=$5, 
             studio_logo=$6
         WHERE id=$7`,
        [
          first_name,
          last_name,
          email,
          hashedPassword,
          studio_name || null,
          profilePicBuffer,
          userId,
        ]
      );
    } else {
      await client.query(
        `UPDATE users 
         SET first_name=$1, last_name=$2, email=$3, studio_name=$4,
             studio_logo=$5
         WHERE id=$6`,
        [
          first_name,
          last_name,
          email,
          studio_name || null,
          profilePicBuffer,
          userId,
        ]
      );
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  } finally {
    client.release();
  }
}