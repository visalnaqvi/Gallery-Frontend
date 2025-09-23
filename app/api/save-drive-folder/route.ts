// app/api/save-drive-folder/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE! });

export async function POST(req: Request) {
  const { folderId, groupId, userId } = await req.json();

  const client = await pool.connect();
  try {
    await client.query(
    "INSERT INTO drive_folders (folder_id, group_id, user_id, created_at , is_processed) VALUES ($1, $2, $3, NOW() , false)",
    [folderId, groupId, userId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save folder" }, { status: 500 });
  } finally {
    client.release();
  }
}
