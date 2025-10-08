// app/api/auth/signup/step1/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE!,
});

export async function POST(req: NextRequest) {
  try {
    const { first_name, last_name, password, email } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    try {
      // Check if email already exists
      const existing = await client.query(
        `SELECT email FROM users WHERE email = $1`,
        [email]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }

      // Insert new user with basic info only
      const result = await client.query(
        `INSERT INTO users (
          first_name, 
          last_name, 
          password_hash, 
          email, 
          is_admin, 
          groups, 
          created_at, 
          plan_type
        ) VALUES ($1, $2, $3, $4, false, ARRAY[]::int[], NOW(), 'lite')
        RETURNING id, email`,
        [first_name, last_name, hashedPassword, email]
      );

      return NextResponse.json({
        message: 'Step 1 completed',
        userId: result.rows[0].id,
        email: result.rows[0].email
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Signup Step 1 Error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}