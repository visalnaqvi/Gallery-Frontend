import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {

  try {
    const client = await pool.connect();
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    
    // Query: get distinct person_id with any one thumb_byte
    const query = `
SELECT 
    id,
    face_thumb_bytes,
    person_id,
    image_id,
    quality_score,
    insight_face_confidence
FROM faces
WHERE group_id = ${groupId} order by person_id;

    `;
    
    const result = await client.query(query);

    client.release();


    // Convert Buffer -> base64 string
    const formattedRows = result.rows.map((row) => ({
      id: row.id,
      person_id:row.person_id , 
      face_thumb_bytes: row.face_thumb_bytes
        ? `data:image/jpeg;base64,${Buffer.from(row.face_thumb_bytes).toString("base64")}`
        : "",
        image_id:row.image_id,
        quality_score:row.quality_score,
        insight_face_confidence:row.insight_face_confidence
    }));

    return NextResponse.json(formattedRows, { status: 200 });
  } catch (err) {
    console.error("Error fetching person IDs:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
