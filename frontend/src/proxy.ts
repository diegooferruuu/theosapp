import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "theo_session";

/** Redirige a /login si no hay cookie de sesión (el backend valida el token real). */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|brand|icons|icon|apple-icon|manifest.webmanifest|sw.js|offline.html|favicon.ico).*)",
  ],
};
