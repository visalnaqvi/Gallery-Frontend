import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { storage } from "@/lib/firebaseAdmin"; 
import { getToken } from "next-auth/jwt";

// setup postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE, // railway, supabase, etc.
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const personId = searchParams.get("personId");
    const page = parseInt(searchParams.get("page") || "0");
    const sorting = searchParams.get("sorting") || "date_taken";
    const limit = 100; // Images per page

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }
    if (!personId) {
      return NextResponse.json({ error: "Missing personId" }, { status: 400 });
    }

    const client = await pool.connect();
    
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

      console.log("Fetching images for person:", personId, "page:", page);

      // Determine sorting column
      let orderBy = "i.uploaded_at DESC";
      if (sorting === "date_taken") {
        orderBy = "i.date_taken DESC";
      } else if (sorting === "filename") {
        orderBy = "i.filename ASC";
      }

      const offset = page * limit;

      // Fetch images using JOIN with faces table for pagination
      const result = await client.query(
        `SELECT i.id,i.location , i.filename, i.uploaded_at, i.size, i.date_taken, i.signed_url,i.signed_url_3k,i.signed_url_stripped, i.highlight
         FROM images i
         INNER JOIN faces f ON i.id = f.image_id
         WHERE i.group_id = $1 AND f.person_id = $2
         ORDER BY ${orderBy}
         LIMIT $3 OFFSET $4`,
        [groupId, personId, limit + 1, offset] // +1 to check if there are more
      );

      const hasMore = result.rows.length > limit;
      const imagesFromDB = hasMore ? result.rows.slice(0, -1) : result.rows;

      const images = await Promise.all(
        imagesFromDB.map(async (img) => {
          return {
            id: img.id,
            thumbnail_location: img.location ,
            filename: img.filename,
            uploaded_at: img.uploaded_at,
            size: img.size,
            date_taken: img.date_taken,
            compressed_location: img.signed_url,
            compressed_location_3k: img.signed_url_3k,
            expire_time: null,
            highlight:img.highlight,
            location_stripped: img.signed_url_stripped
          };
        })
      );

      return NextResponse.json({ images, hasMore });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in GET /api/persons/getPersonImages:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}