import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { storage } from "@/lib/firebaseAdmin"; 
import { getToken } from "next-auth/jwt";

// setup postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE, // railway, supabase, etc.
});

// helper to refresh signed url
// async function refreshSignedUrl(imgId: string) {
//   try {
//     const file = storage.bucket().file("compressed_" + imgId);

//     // signed url valid for 8h
//     const [newSignedUrl] = await file.getSignedUrl({
//       action: "read",
//       expires: Date.now() + 24 * 60 * 60 * 1000,
//     });

//     // expiry time 10 min before actual
//     const expireTime = new Date(Date.now() + (24 * 60 - 10) * 60 * 1000);

//     // run DB update in background (don’t await)
//     pool.query(
//       `UPDATE images 
//        SET signed_url = $1, expire_time = $2 
//        WHERE id = $3`,
//       [newSignedUrl, expireTime, imgId]
//     ).then(() => {
//       console.log(`✅ Background DB update done for ${imgId}`);
//     }).catch(err => {
//       console.error(`❌ Failed background DB update for ${imgId}:`, err);
//     });

//     return { signedUrl: newSignedUrl, expireTime };
//   } catch (err) {
//     console.error(`❌ Failed to refresh signed URL for ${imgId}:`, err);
//     return null;
//   }
// }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const mode = searchParams.get("mode");
    const sorting = searchParams.get("sorting") || "uploaded_at"; // fallback
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = 50;
    const offset = page * limit;

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const client = await pool.connect();
    const deleteClause  = mode == 'bin' ? "IS NOT NULL" : "IS NULL";
    const highlightClause  = mode == 'highlight' ? "AND highlight = true" : "";
    try {
          const token = await getToken({ req, secret: process.env.JWT_SECRET });
        if (!token) {
          const res = await client.query(`
            select access from groups where id = $1
            ` , [groupId])

            if(res.rows[0].access.toLowerCase() != 'public'){
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

          
        }
      console.log("Fetching images (not hot) + hot count");

      // fetch paginated images (excluding hot)
const result = await client.query(
  `
    SELECT id, filename,location, uploaded_at, size, date_taken, signed_url,signed_url_3k, status , highlight , delete_at 
    FROM images 
    WHERE group_id = $1 
      AND status != 'hot' 
      AND delete_at ${deleteClause}
      ${highlightClause}
    ORDER BY ${sorting} DESC
    LIMIT $2 OFFSET $3
  `,
  [groupId, limit + 1, offset]
);

      // fetch hot image count
      const hotResult = await client.query(
        `SELECT COUNT(*)::int AS hot_count 
         FROM images 
         WHERE group_id = $1 AND status = 'hot'`,
        [groupId]
      );

      const hotImages = hotResult.rows[0]?.hot_count || 0;

      const rows = result.rows;
      const hasMore = rows.length > limit;
      const imagesFromDB = hasMore ? rows.slice(0, limit) : rows;

      const refreshTasks: Promise<any>[] = [];

      const images = await Promise.all(
        imagesFromDB.map(async (img) => {
          // let signedUrl = img.signed_url;
          // let expireTime = img.expire_time ? new Date(img.expire_time) : null;
          
          // // if missing or expired, refresh immediately (await so response has URL)
          // if (!signedUrl || !expireTime || expireTime < new Date()) {
          //   const refreshed = await refreshSignedUrl(img.id); 
          //   if (refreshed) {
          //     signedUrl = refreshed.signedUrl;
          //     expireTime = refreshed.expireTime;
          //   }
          // } else {
          //   // if close to expiry, refresh in background
          //   const timeLeft = expireTime.getTime() - Date.now();
          //   if (timeLeft < 15 * 60 * 1000) {
          //     refreshSignedUrl(img.id); // fire and forget
          //   }
          // }

          return {
            id: img.id,
            thumbnail_location: img.location,
            filename: img.filename,
            uploaded_at: img.uploaded_at,
            size: img.size,
            date_taken: img.date_taken,
            compressed_location: img.signed_url,
            compressed_location_3k: img.signed_url_3k,
            expire_time: null,
            highlight:img.highlight,
            delete_at:img.delete_at
          };
        })
      );

      Promise.all(refreshTasks).then(() =>
        console.log(`✅ Background refresh done for ${refreshTasks.length} URLs`)
      );

      return NextResponse.json({ images, hasMore, hotImages });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in GET /api/images:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }

    const client = await pool.connect();
              const token = await getToken({ req, secret: process.env.JWT_SECRET });
        if (!token) {
        

     
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
       

          
        }
    try {
      // update deleted_at = now + 24 hr
      await client.query(
        `
        UPDATE images
        SET delete_at = NOW() + interval '24 hours'
        WHERE id = $1
        `,
        [imageId]
      );

      return NextResponse.json({
        success: true,
        message: `Image ${imageId} marked for deletion (in 24 hours).`,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in DELETE /api/images:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");
    const action = searchParams.get("action");

    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }

    const client = await pool.connect();
    const isHighlight = action == 'add'
    try {
      // update deleted_at = now + 24 hr
      await client.query(
        `
        UPDATE images
        SET highlight = ${isHighlight}
        WHERE id = $1
        `,
        [imageId]
      );

      return NextResponse.json({
        success: true,
        message: `Image ${imageId} marked as highlight.`,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in marked as highlight:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}