import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log("Middleware checking path:", pathname);

  // ✅ Allow public routes and auth routes - no authentication needed
  if (pathname.startsWith("/public") || pathname.startsWith("/auth")) {
    console.log("Allowing public/auth route:", pathname);
    return NextResponse.next();
  }

  // ✅ Check authentication for all other routes
  const token = await getToken({ req, secret: process.env.JWT_SECRET });

  if (!token) {
    console.log("No token found, redirecting to auth");
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  console.log("Token found, allowing access to:", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api routes (API routes)
     * 2. /_next (Next.js internals)
     * 3. /.next (Next.js internals)
     * 4. /favicon.ico, /sitemap.xml, /robots.txt (static files)
     * 5. Static assets (.png, .jpg, .jpeg, .gif, .webp, .svg, .ico, .css, .js)
     * 6. /.well-known (for various verification files)
     */
    "/((?!api/|_next/|_next|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)$|\\.well-known/).+)",
  ],
};