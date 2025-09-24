// app/api/save-drive-folder/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE! });

export async function POST(req: Request) {
  const { groupId } = await req.json();

  const client = await pool.connect();
  try {
    // Count rows in drive_folders for the group that are not processed
    const result = await client.query(
      `SELECT COUNT(*)::int AS importing_groups
       FROM drive_folders
       WHERE group_id = $1 AND is_processed = FALSE`,
      [groupId]
    );

    const count = result.rows[0]?.importing_groups || 0;

    return NextResponse.json({ success: true, count });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch folder count" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
