// app/api/download/[imageId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'image.jpg';
    const signedUrl = searchParams.get('url');

    if (!signedUrl) {
      return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
    }

    // Fetch the image from Firebase signed URL
    const imageResponse = await fetch(signedUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image from storage' },
        { status: 500 }
      );
    }

    // Convert response to a buffer
    const imageBuffer = await imageResponse.arrayBuffer();

    // Return the image as a downloadable file
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': imageResponse.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
