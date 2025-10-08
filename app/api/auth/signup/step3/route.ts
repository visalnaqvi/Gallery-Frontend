// app/api/auth/signup/step3/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE!,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Verify that face image was uploaded
      const result = await client.query(
        `SELECT face_image_bytes FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (!result.rows[0].face_image_bytes) {
        return NextResponse.json(
          { error: 'Face image not uploaded' },
          { status: 400 }
        );
      }

      // Mark signup as complete (you can add a flag if needed)
    //   await client.query(
    //     `UPDATE users 
    //      SET updated_at = NOW()
    //      WHERE id = $1`,
    //     [userId]
    //   );

      return NextResponse.json({
        message: 'Signup completed successfully',
        success: true
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Signup Step 3 Error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}