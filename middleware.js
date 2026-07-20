import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Nota: usamos 'jose' aquí (en vez de jsonwebtoken) porque el middleware de
// Next.js corre en el Edge Runtime, que no soporta el módulo 'jsonwebtoken'.

async function verify(token) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sm_session")?.value;
  const session = token ? await verify(token) : null;

  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    if (session) {
      const url = req.nextUrl.clone();
      url.pathname = session.role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && session.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"]
};
