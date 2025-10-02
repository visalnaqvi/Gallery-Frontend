import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const mode = searchParams.get("mode");

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const client = await pool.connect();
    const deleteClause = mode === 'bin' ? "IS NOT NULL" : "IS NULL";
    const highlightClause = mode === 'highlight' ? "AND highlight = true" : "";

    try {
      const token = await getToken({ req, secret: process.env.JWT_SECRET });
      if (!token) {
        const res = await client.query(`
          SELECT access FROM groups WHERE id = $1
        `, [groupId]);

        if (res.rows[0].access.toLowerCase() !== 'public') {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const result = await client.query(
        `
        SELECT COUNT(*)::int AS total_count 
        FROM images 
        WHERE group_id = $1 
          AND status != 'hot' 
          AND delete_at ${deleteClause}
          ${highlightClause}
        `,
        [groupId]
      );

      const totalCount = result.rows[0]?.total_count || 0;

      return NextResponse.json({ totalCount });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in GET /api/groups/images/count:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}