// app/api/save-drive-folder/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE! });

export async function POST(req: Request) {
  try {
    const { groupId } = await req.json();

    const client = await pool.connect();
    try {
      // Fetch folder IDs that are not processed for the given group
      const result = await client.query(
        `SELECT folder_id
         FROM drive_folders
         WHERE group_id = $1 AND is_processed = FALSE`,
        [groupId]
      );

      const folderIds = result.rows.map(row => row.folder_id);

      return NextResponse.json({
        success: true,
        count: folderIds.length,
        folderIds,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch folder count" },
      { status: 500 }
    );
  }
}
