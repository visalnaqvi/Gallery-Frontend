import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getToken } from "next-auth/jwt";

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personId, name } = body;
    // const token = await getToken({ req, secret: process.env.JWT_SECRET });
    // if (!token) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    if (!personId || !name) {
      return NextResponse.json({ error: "Missing personId or name" }, { status: 400 });
    }

    const client = await pool.connect();
    const query = `
      UPDATE persons
      SET name = $1
      WHERE id = $2
      RETURNING id, name;
    `;
    const result = await client.query(query, [name, personId]);
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err) {
    console.error("Error updating name:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
