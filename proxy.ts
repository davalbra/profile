import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/api/auth/firebase-session",
  "/api/secure/session",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  if (pathname.startsWith("/_next/")) {
    return true;
  }

  if (pathname.includes(".")) {
    return true;
  }

  return false;
}

function redirectToHome(request: NextRequest): NextResponse {
  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("auth", "required");

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (nextPath && nextPath !== "/") {
    redirectUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader?.includes("firebase_id_token=")) {
    return redirectToHome(request);
  }

  try {
    const validationUrl = new URL("/api/secure/session", request.url);
    const validationResponse = await fetch(validationUrl, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (validationResponse.ok) {
      return NextResponse.next();
    }
  } catch {
    // Si falla la validación, tratamos como sesión inválida.
  }

  return redirectToHome(request);
}

export const config = {
  matcher: ["/:path*"],
};
