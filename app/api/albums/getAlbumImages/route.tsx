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
//     try {
//         const file = storage.bucket().file("compressed_" + imgId);
//         const file_3k = storage.bucket().file("compressed_3k_" + imgId);

//         // signed url valid for 8h
//         const [newSignedUrl] = await file.getSignedUrl({
//             action: "read",
//             expires: Date.now() + 24 * 60 * 60 * 1000,
//         });
//         const [newSignedUrl_3k] = await file_3k.getSignedUrl({
//             action: "read",
//             expires: Date.now() + 24 * 60 * 60 * 1000,
//         });
//         // expiry time 10 min before actual
//         const expireTime = new Date(Date.now() + (24 * 60 - 10) * 60 * 1000);

//         // run DB update in background (don't await)
//         pool.query(
//             `UPDATE images 
//        SET signed_url = $1, expire_time = $2 , signed_url_3k = $3,
//        WHERE id = $4`,
//             [newSignedUrl, expireTime, newSignedUrl_3k, imgId]
//         ).then(() => {
//             console.log(`✅ Background DB update done for ${imgId}`);
//         }).catch(err => {
//             console.error(`❌ Failed background DB update for ${imgId}:`, err);
//         });

//         return { signedUrl: newSignedUrl, expireTime, newSignedUrl_3k: newSignedUrl_3k };
//     } catch (err) {
//         console.error(`❌ Failed to refresh signed URL for ${imgId}:`, err);
//         return null;
//     }
// }

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const groupId = searchParams.get("groupId");
        const albumId = searchParams.get("albumId");
        const page = parseInt(searchParams.get("page") || "0");
        const sorting = searchParams.get("sorting") || "date_taken";
        const limit = 50; // Images per page

        if (!groupId) {
            return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
        }
        if (!albumId) {
            return NextResponse.json({ error: "Missing albumId" }, { status: 400 });
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

            console.log("Fetching images for person:", albumId, "page:", page);

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
                `SELECT i.id,i.location , i.filename, i.uploaded_at, i.size, i.date_taken, i.signed_url, i.signed_url_3k, i.highlight
         FROM images i
         INNER JOIN album_images f ON i.id = f.image_id
         WHERE i.group_id = $1 AND f.album_id = $2
         ORDER BY ${orderBy}
         LIMIT $3 OFFSET $4`,
                [groupId, albumId, limit + 1, offset] // +1 to check if there are more
            );

            const hasMore = result.rows.length > limit;
            const imagesFromDB = hasMore ? result.rows.slice(0, -1) : result.rows;

            const images = await Promise.all(
                imagesFromDB.map(async (img) => {
                    // let signedUrl = img.signed_url;
                    // let signedUrl3k = img.signed_url_3k;
                    // let expireTime = img.expire_time ? new Date(img.expire_time) : null;

                    // // if missing or expired, refresh immediately (await so response has URL)
                    // if (!signedUrl || !signedUrl3k || !expireTime || expireTime < new Date()) {
                    //     // generate fresh signed url immediately
                    //     const refreshed = await refreshSignedUrl(img.id);
                    //     if (refreshed) {
                    //         signedUrl = refreshed.signedUrl;
                    //         expireTime = refreshed.expireTime;
                    //     }
                    // } else {
                    //     // if close to expiry, refresh in background (don't block response)
                    //     const timeLeft = expireTime.getTime() - Date.now();
                    //     if (timeLeft < 15 * 60 * 1000) {
                    //         refreshSignedUrl(img.id); // fire and forget
                    //     }
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
                        highlight: img.highlight
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