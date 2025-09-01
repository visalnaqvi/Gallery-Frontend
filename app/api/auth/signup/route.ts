import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE!,
});

export async function POST(req: NextRequest) {
  const { first_name, last_name, password, email, phone_number, date_of_birth } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    // 🔍 Check if email already exists
    const existing = await client.query(
      `SELECT email FROM users WHERE email = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      client.release();
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // ✅ Insert new user
    await client.query(
      `INSERT INTO users (
        first_name, last_name, password_hash, email, phone_number, date_of_birth, is_admin, groups, created_at, plan_type
      ) VALUES ($1, $2, $3, $4, $5, $6, false, ARRAY[]::int[], NOW(), 'lite')`,
      [first_name, last_name, hashedPassword, email, phone_number, date_of_birth]
    );

    client.release();

    return NextResponse.json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
