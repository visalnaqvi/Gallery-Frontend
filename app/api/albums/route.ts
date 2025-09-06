// app/albums/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";
// ✅ PostgreSQL pool setup
const pool = new Pool({
  connectionString: process.env.DATABASE, // ensure this is in your .env
});

// GET /albums?group_id=123
// Returns albums with album name + total image count
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "group_id is required" }, { status: 400 });
  }
const token = await getToken({ req, secret: process.env.JWT_SECRET });
        if (!token) {
          const res = await pool.query(`
            select access from groups where id = $1
            ` , [groupId])

            if(res.rows[0].access.toLowerCase() != 'public'){
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

          
        }
  try {
    const query = `
      SELECT 
        a.id, 
        a.name, 
        a.group_id,
        COUNT(ai.image_id) AS total_images
      FROM albums a
      LEFT JOIN album_images ai ON a.id = ai.album_id
      WHERE a.group_id = $1
      GROUP BY a.id, a.name, a.group_id
      ORDER BY a.created_at DESC;
    `;
    const result = await pool.query(query, [groupId]);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /albums error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /albums
// Payload: { name: string, group_id: number }
export async function POST(req: NextRequest) {
  try {
    const { name, groupId } = await req.json();

    if (!name || !groupId) {
      return NextResponse.json({ error: "name and group_id are required" }, { status: 400 });
    }

    const query = `
      INSERT INTO albums (name, group_id)
      VALUES ($1, $2)
      RETURNING id, name, group_id, created_at;
    `;
    const result = await pool.query(query, [name, groupId]);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    console.error("POST /albums error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /albums
// Payload: { image_id: string, album_id: number, group_id: number }
export async function PUT(req: NextRequest) {
  try {
    const { imageId, albumId, groupId } = await req.json();

    if (!imageId || !albumId || !groupId) {
      return NextResponse.json({ error: "image_id, album_id, group_id are required" }, { status: 400 });
    }

    const query = `
      INSERT INTO album_images (album_id, image_id , group_id)
      VALUES ($1, $2 , $3)
      RETURNING album_id, image_id , group_id;
    `;
    const result = await pool.query(query, [albumId, imageId , groupId]);
    return NextResponse.json(result.rows[0] || { message: "Already exists" });
  } catch (err: any) {
    console.error("PUT /albums error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /albums
// Payload: { mode: "album" | "image", album_id: number, group_id: number, image_id?: string }
export async function DELETE(req: NextRequest) {
  try {
    const { mode, albumId, groupId, imageId } = await req.json();

    if (!mode || !albumId || !groupId) {
      return NextResponse.json({ error: "mode, album_id, group_id are required" }, { status: 400 });
    }

    if (mode === "album") {
      // delete all images in album and then delete album
      await pool.query("DELETE FROM album_images WHERE album_id = $1", [albumId]);
      await pool.query("DELETE FROM albums WHERE id = $1 AND group_id = $2", [albumId, groupId]);
      return NextResponse.json({ message: `Album ${albumId} deleted` });
    }

    if (mode === "image") {
      if (!imageId) {
        return NextResponse.json({ error: "image_id is required for mode=image" }, { status: 400 });
      }
      await pool.query(
        "DELETE FROM album_images WHERE album_id = $1 AND image_id = $2",
        [albumId, imageId]
      );
      return NextResponse.json({ message: `Image ${imageId} removed from album ${albumId}` });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: any) {
    console.error("DELETE /albums error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
