import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { storage } from "@/lib/firebaseAdmin"; 
import { getToken } from "next-auth/jwt";

// setup postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE,
});

// helper to refresh signed url (same as in main images API)
async function refreshSignedUrl(imgId: string) {
  try {
    const file = storage.bucket().file("compressed_" + imgId);

    const [newSignedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    const expireTime = new Date(Date.now() + (24 * 60 - 10) * 60 * 1000);

    pool.query(
      `UPDATE images 
       SET signed_url = $1, expire_time = $2 
       WHERE id = $3`,
      [newSignedUrl, expireTime, imgId]
    ).then(() => {
      console.log(`✅ Background DB update done for ${imgId}`);
    }).catch(err => {
      console.error(`❌ Failed background DB update for ${imgId}:`, err);
    });

    return { signedUrl: newSignedUrl, expireTime };
  } catch (err) {
    console.error(`❌ Failed to refresh signed URL for ${imgId}:`, err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const similarImageId = searchParams.get("similarImageId");
    const sorting = searchParams.get("sorting") || "uploaded_at";

    if (!groupId || !similarImageId) {
      return NextResponse.json({ 
        error: "Missing groupId or similarImageId" 
      }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      // Check authentication
      const token = await getToken({ req, secret: process.env.JWT_SECRET });
      if (!token) {
        const res = await client.query(`
          SELECT access FROM groups WHERE id = $1
        `, [groupId]);

        if (res.rows[0]?.access?.toLowerCase() !== 'public') {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      console.log(`Fetching similar images for similarImageId: ${similarImageId}`);

      // Fetch all images with the same similar_image_id
      const result = await client.query(
        `
          SELECT id, filename, location, thumb_byte, uploaded_at, size, date_taken, 
                 signed_url, expire_time, status, highlight, delete_at, similar_image_id
          FROM images 
          WHERE group_id = $1 
            AND similar_image_id = $2
            AND status != 'hot' 
            AND delete_at IS NULL
          ORDER BY ${sorting} DESC
        `,
        [groupId, similarImageId]
      );

      const rows = result.rows;

      if (rows.length === 0) {
        return NextResponse.json({ 
          images: [], 
          message: "No similar images found" 
        });
      }

      // Process images (similar to main images API)
      const images = await Promise.all(
        rows.map(async (img) => {
          let signedUrl = img.signed_url;
          let expireTime = img.expire_time ? new Date(img.expire_time) : null;
          
          // if missing or expired, refresh immediately
          if (!signedUrl || !expireTime || expireTime < new Date()) {
            const refreshed = await refreshSignedUrl(img.id); 
            if (refreshed) {
              signedUrl = refreshed.signedUrl;
              expireTime = refreshed.expireTime;
            }
          } else {
            // if close to expiry, refresh in background
            const timeLeft = expireTime.getTime() - Date.now();
            if (timeLeft < 15 * 60 * 1000) {
              refreshSignedUrl(img.id); // fire and forget
            }
          }

          return {
            id: img.id,
            thumbnail_location: img.location ? img.location : (img.thumb_byte ? `data:image/jpeg;base64,${Buffer.from(
              img.thumb_byte
            ).toString("base64")}` : ""),
            filename: img.filename,
            uploaded_at: img.uploaded_at,
            size: img.size,
            date_taken: img.date_taken,
            compressed_location: signedUrl,
            expire_time: expireTime,
            highlight: img.highlight,
            delete_at: img.delete_at,
            similar_image_id: img.similar_image_id
          };
        })
      );

      return NextResponse.json({ 
        images, 
        count: images.length,
        similarImageId 
      });

    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in GET /api/groups/images/similar:", err);
    return NextResponse.json({ 
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}