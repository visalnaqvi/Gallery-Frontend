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
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) {
          const res = await client.query(`
            select access from groups where id = $1
            ` , [groupId])

            if(res.rows[0].access.toLowerCase() != 'public'){
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

          
        }
    // Query: get distinct person_id with any one thumb_byte
    const query = `
SELECT 
    id,
    thumbnail,
    name
FROM persons
WHERE group_id = ${groupId}
  AND quality_score >= 0.8
ORDER BY name, cardinality(image_ids) DESC;
;
    `;
    
    const result = await client.query(query);

    client.release();

    if(result.rows.length == 0){
          const queryP = ` 
SELECT count(*) as count from images WHERE group_id = ${groupId} and status != 'cooling';

    `;
        const res = await client.query(queryP);
    if(res.rows[0].count > 0){
      return NextResponse.json([], { status: 202 });
    }
    }

    // Convert Buffer -> base64 string
    const formattedRows = result.rows.map((row) => ({
      person_id: row.id,
      name:row.name , 
      face_thumb_bytes: row.thumbnail
        ? `data:image/jpeg;base64,${Buffer.from(row.thumbnail).toString("base64")}`
        : "",
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
