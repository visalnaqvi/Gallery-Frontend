// app/api/save-drive-folder/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE! });

export async function POST(req: Request) {
  const { folderIds, groupId, userId } = await req.json();

  if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
    return NextResponse.json({ error: "No folderIds IDs provided" }, { status: 400 });
  }

  if (!groupId || !userId) {
    return NextResponse.json({ error: "Group ID and User ID are required" }, { status: 400 });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Batch size for inserting records
    const batchSize = 1000;
    const batches = [];
    
    // Split imageIds into batches
    for (let i = 0; i < folderIds.length; i += batchSize) {
      batches.push(folderIds.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      // Create the VALUES part of the query
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      batch.forEach((folderId: string) => {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, NOW(), false)`);
        params.push(folderId, groupId, userId);
        paramIndex += 3;
      });

      const insertQuery = `
        INSERT INTO drive_folders (folder_id, group_id, user_id, created_at, is_processed) 
        VALUES ${values.join(', ')}
        ON CONFLICT (folder_id, group_id) DO NOTHING
      `;

      await client.query(insertQuery, params);
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: `Successfully saved ${folderIds.length} images for processing`
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database error:', err);
    return NextResponse.json(
      { error: "Failed to save image IDs" }, 
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request) {
  const { folderIds, groupId } = await req.json();

  if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
    return NextResponse.json({ error: "No folder IDs provided" }, { status: 400 });
  }

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create placeholders for the folder IDs
    const placeholders = folderIds.map((_, index) => `$${index + 2}`).join(', ');
    
    const deleteQuery = `
      DELETE FROM drive_folders 
      WHERE group_id = $1 AND folder_id IN (${placeholders})
    `;

    const params = [groupId, ...folderIds];
    const result = await client.query(deleteQuery, params);

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: `Successfully removed ${result.rowCount} folders from processing queue`,
      deletedCount: result.rowCount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database error:', err);
    return NextResponse.json(
      { error: "Failed to remove folder IDs from processing queue" }, 
      { status: 500 }
    );
  } finally {
    client.release();
  }
}