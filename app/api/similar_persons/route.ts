import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
  //   const token = await getToken({ req, secret: process.env.JWT_SECRET });
  // if (!token) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const groupId = parseInt(searchParams.get("groupId") || "10");
    
    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    const client = await pool.connect();
    
    // Get total count for pagination metadata
    const countQuery = `
      SELECT COUNT(DISTINCT p1.id) as total_count
      FROM persons p1
      JOIN similar_faces sf ON sf.person_id::uuid = p1.id
      JOIN persons p2 ON p2.id = sf.similar_person_id::uuid
      WHERE p1.thumbnail IS NOT NULL
        AND p2.thumbnail IS NOT NULL
        AND  p1.group_id = ${groupId}
    `;
    
    const countResult = await client.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].total_count);
    
    // Get paginated data
    const dataQuery = `
      SELECT
        p1.id as person_id,
        encode(p1.thumbnail, 'base64') as thumbnail,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'sim_person_id', sf.similar_person_id,
                'thumb_img_byte', encode(p2.thumbnail, 'base64')
            )
        ) as sim_faces
      FROM persons p1
      JOIN similar_faces sf ON sf.person_id::uuid = p1.id
      JOIN persons p2 ON p2.id = sf.similar_person_id::uuid
      WHERE p1.thumbnail IS NOT NULL
        AND p2.thumbnail IS NOT NULL
        AND p1.group_id = ${groupId}
      GROUP BY p1.id, p1.thumbnail
      ORDER BY p1.id
      LIMIT $1 OFFSET $2;
    `;
    
    const dataResult = await client.query(dataQuery, [limit, offset]);
    client.release();

    // Define types for better TypeScript support
    interface SimFace {
      sim_person_id: string;
      thumb_img_byte: string;
    }
    
    interface QueryRow {
      person_id: string;
      thumbnail: string;
      sim_faces: SimFace[];
    }

    // Format the data
    const formattedData = dataResult.rows.map((row: QueryRow) => ({
      person_id: row.person_id,
      thumbnail: row.thumbnail || "",
      sim_faces: (row.sim_faces || []).map((simFace: SimFace) => ({
        sim_person_id: simFace.sim_person_id,
        thumb_img_byte: simFace.thumb_img_byte || ""
      }))
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      data: formattedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
    
  } catch (error) {
    console.error("Error fetching similar faces:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}