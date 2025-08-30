// app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});


export async function PATCH(req: NextRequest) {
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
        SET delete_at = NULL
        WHERE id = $1
        `,
        [groupId]
      );

      return NextResponse.json({
        success: true,
        message: `Group ${groupId} unmarked for deletion (in 24 hours).`,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in not DELETE:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
