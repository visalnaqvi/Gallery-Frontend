// app/api/auth/signup/step2/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE!,
});

export async function POST(req: NextRequest) {
  try {
    const { userId, phone_number, firebase_uid } = await req.json();

    if (!userId || !phone_number) {
      return NextResponse.json(
        { error: 'User ID and phone number are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if phone number is already registered
      const existing = await client.query(
        `SELECT id FROM users WHERE phone_number = $1 AND id != $2`,
        [phone_number, userId]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Phone number already registered' },
          { status: 409 }
        );
      }

      // Update user with phone number and firebase UID
      await client.query(
        `UPDATE users 
         SET phone_number = $1
         WHERE id = $2`,
        [phone_number, userId]
      );

      return NextResponse.json({
        message: 'Step 2 completed',
        success: true
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Signup Step 2 Error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}