import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let publicPaths = [
    '/api/groups/images',
    '/api/groups/images/restore',
    '/api/images/download',
    '/api/persons',
    '/api/persons/getPersonDetails',
    '/api/persons/getPersonImages',
    '/api/user/getIdByGroupId',
    '/api/user',
    '/api/persons/updateName',
    '/api/albums',
    '/api/albums/getAlbumImages',
    '/api/groups/images/getAlbums'

  ]
  // ✅ Skip all public routes
  if (pathname.startsWith("/public/")) {
    return NextResponse.next();
  }

  // ✅ Skip auth routes
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/privacy-policy")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/terms-of-service")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if(publicPaths.includes(pathname)){
    return NextResponse.next();
  }

  // ✅ Check authentication
  const token = await getToken({ req, secret: process.env.JWT_SECRET });

  if (!token) {
    // Redirect to /auth if not authenticated
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (Next.js internals)
     * - static files
     * - well-known files
     */
    "/((?!_next/|_next|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)$|\\.well-known/).*)",
  ],
};
