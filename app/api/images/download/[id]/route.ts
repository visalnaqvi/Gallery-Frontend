import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg"; // your db helper
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest , context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  try {
    const conn = new Pool({
      connectionString: process.env.DATABASE
    });
    const result = await conn.query("SELECT location FROM images WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const location = result.rows[0].location;
    return NextResponse.json({ location });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch image URL" }, { status: 500 });
  }
}
