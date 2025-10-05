import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get("inviteId");

    if (!inviteId) {
      return NextResponse.json({ error: "inviteId is required" }, { status: 400 });
    }

    const client = await pool.connect();

    const query = `
      SELECT 
        il.id,
        il.group_id,
        il.is_active,
        il.created_at,
        g.name as group_name
      FROM invite_links il
      JOIN groups g ON il.group_id = g.id
      WHERE il.id = $1 AND il.is_active = true
    `;

    const result = await client.query(query, [inviteId]);
    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: "This invite link is invalid or has expired" 
      }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });

  } catch (err) {
    console.error("Error validating invite:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}