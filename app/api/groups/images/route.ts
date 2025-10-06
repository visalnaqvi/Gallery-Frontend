import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

// setup postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE, // railway, supabase, etc.
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const mode = searchParams.get("mode");
    const sorting = searchParams.get("sorting") || "uploaded_at"; // fallback
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = 100;
    const offset = page * limit;

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const client = await pool.connect();
    const deleteClause = mode == 'bin' ? "IS NOT NULL" : "IS NULL";
    const highlightClause = mode == 'highlight' ? "AND i.highlight = true" : "";
    
    try {
      // Check if group is public
      const groupRes = await client.query(`
        SELECT access FROM groups WHERE id = $1
      `, [groupId]);

      if (!groupRes.rows.length) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }

      const isPublic = groupRes.rows[0].access.toLowerCase() === 'public';

      // If public, return all images
      if (isPublic) {
        return await fetchAllImages(client, groupId, mode, sorting, limit, offset, deleteClause, highlightClause);
      }

      // If not public, check for token
      const token = await getToken({ req, secret: process.env.JWT_SECRET });
      
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = token.id;

      // Get user's groups and member_groups
      const userRes = await client.query(`
        SELECT groups, member_groups FROM users WHERE id = $1
      `, [userId]);

      if (!userRes.rows.length) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const userGroups = userRes.rows[0].groups || [];
      const memberGroups = userRes.rows[0].member_groups || [];
      // If user is in groups (full access)
      if (userGroups.includes(parseInt(groupId))) {
        return await fetchAllImages(client, groupId, mode, sorting, limit, offset, deleteClause, highlightClause);
      }

      // If user is in member_groups (limited access - only their images)
      if (memberGroups.includes(parseInt(groupId))) {
        // Get person_id for this user in this group
        const personRes = await client.query(`
          SELECT id FROM persons WHERE user_id = $1 AND group_id = $2
        `, [userId, groupId]);

        if (!personRes.rows.length) {
          return NextResponse.json({ error: "Person not found in group" }, { status: 404 });
        }

        const personId = personRes.rows[0].id;
        return await fetchPersonImages(client, groupId, personId, mode, sorting, limit, offset, deleteClause, highlightClause);
      }

      // User has no access to this group
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Error in GET /api/images:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helper function to fetch all images (for public groups or full members)
async function fetchAllImages(
  client: any,
  groupId: string,
  mode: string | null,
  sorting: string,
  limit: number,
  offset: number,
  deleteClause: string,
  highlightClause: string
) {
  console.log("Fetching all images (not hot) + hot count");

  // Fetch paginated images (excluding hot)
  const result = await client.query(
    `
      SELECT id, filename, location, uploaded_at, size, date_taken, signed_url, signed_url_3k, signed_url_stripped, status, highlight, delete_at 
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

  // Fetch hot image count
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

  const images = imagesFromDB.map((img: any) => ({
    id: img.id,
    thumbnail_location: img.location,
    filename: img.filename,
    uploaded_at: img.uploaded_at,
    size: img.size,
    date_taken: img.date_taken,
    compressed_location: img.signed_url,
    compressed_location_3k: img.signed_url_3k,
    expire_time: null,
    highlight: img.highlight,
    delete_at: img.delete_at,
    location_stripped: img.signed_url_stripped,
  }));

  return NextResponse.json({ images, hasMore, hotImages });
}

// Helper function to fetch only person's images (for member_groups)
async function fetchPersonImages(
  client: any,
  groupId: string,
  personId: string,
  mode: string | null,
  sorting: string,
  limit: number,
  offset: number,
  deleteClause: string,
  highlightClause: string
) {
  console.log("Fetching images for person:", personId);

  // Determine sorting column
  let orderBy = "i.uploaded_at DESC";
  if (sorting === "date_taken") {
    orderBy = "i.date_taken DESC";
  } else if (sorting === "filename") {
    orderBy = "i.filename ASC";
  }

  // Fetch images using JOIN with faces table
  const result = await client.query(
    `
      SELECT i.id, i.location, i.filename, i.uploaded_at, i.size, i.date_taken, i.signed_url, i.signed_url_3k, i.signed_url_stripped, i.highlight, i.delete_at
      FROM images i
      INNER JOIN faces f ON i.id = f.image_id
      WHERE i.group_id = $1 
        AND f.person_id = $2
        AND i.status != 'hot'
        AND i.delete_at ${deleteClause}
        ${highlightClause}
      ORDER BY ${orderBy}
      LIMIT $3 OFFSET $4
    `,
    [groupId, personId, limit + 1, offset]
  );

  // Fetch hot image count for this person
  const hotResult = await client.query(
    `SELECT COUNT(*)::int AS hot_count 
     FROM images i
     INNER JOIN faces f ON i.id = f.image_id
     WHERE i.group_id = $1 AND f.person_id = $2 AND i.status = 'hot'`,
    [groupId, personId]
  );

  const hotImages = hotResult.rows[0]?.hot_count || 0;
  const hasMore = result.rows.length > limit;
  const imagesFromDB = hasMore ? result.rows.slice(0, limit) : result.rows;

  const images = imagesFromDB.map((img: any) => ({
    id: img.id,
    thumbnail_location: img.location,
    filename: img.filename,
    uploaded_at: img.uploaded_at,
    size: img.size,
    date_taken: img.date_taken,
    compressed_location: img.signed_url,
    compressed_location_3k: img.signed_url_3k,
    expire_time: null,
    highlight: img.highlight,
    delete_at: img.delete_at,
    location_stripped: img.signed_url_stripped,
  }));

  return NextResponse.json({ images, hasMore, hotImages });
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
      // Update delete_at = now + 24 hr
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
    const isHighlight = action == 'add';
    
    try {
      // Update highlight status
      await client.query(
        `
        UPDATE images
        SET highlight = $1
        WHERE id = $2
        `,
        [isHighlight, imageId]
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