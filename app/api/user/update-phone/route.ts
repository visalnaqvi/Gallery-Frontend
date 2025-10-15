// app/api/user/update-phone/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE!,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { phone_number, firebase_uid } = await req.json();

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if phone number is already registered by another user
      const existing = await client.query(
        `SELECT id FROM users WHERE phone_number = $1 AND id != $2`,
        [phone_number, session.user.id]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Phone number already registered' },
          { status: 409 }
        );
      }

      // Update user's phone number
      await client.query(
        `UPDATE users 
         SET phone_number = $1
         WHERE id = $2`,
        [phone_number, session.user.id]
      );

      return NextResponse.json({
        message: 'Phone number updated successfully',
        success: true
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update Phone Error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}