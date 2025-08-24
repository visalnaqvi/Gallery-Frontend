// app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'Invalid groupId ID' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
 
const groupQuery = await client.query(
  `SELECT id, first_name, last_name, email
   FROM users
   WHERE $1 = ANY(groups)`,
  [groupId]
);

    client.release();

    const formattedRows = groupQuery.rows.map((row) => ({
      id: row.id,
      name:row.first_name + ' '+row.last_name , 
      email:row.email

    }));

    return NextResponse.json( formattedRows , { status: 200 });
  } catch (err) {
    console.error('Error fetching groups:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}