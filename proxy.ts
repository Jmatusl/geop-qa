import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy logic
 * En esta versión de Next.js se utiliza proxy.ts en lugar de middleware.ts
 * Maneja redirecciones y validación de sesión de forma optimista.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas
  const publicRoutes = ["/login", "/recover", "/reset", "/activate", "/validar", "/api/v1/storage/signed-url", "/api/v1/public/validar"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Rutas de API de auth y CRON (siempre accesibles o manejadas por sus propias rutas)
  if (pathname.startsWith("/api/v1/auth/") || pathname.startsWith("/api/v1/cron/")) {
    return NextResponse.next();
  }

  // Verificar sesión para rutas protegidas
  const hasSession = request.cookies.has("session_token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si hay cookie y trata de ir a login, redirigir a dashboard
  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Pasar el path actual a los Server Components mediante headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api/v1/auth|api/v1/cron|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
