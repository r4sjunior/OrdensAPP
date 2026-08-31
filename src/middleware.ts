import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// As rotas /api/orders/* verificam a sessão internamente (via auth() do
// Clerk) e respondem com JSON 401 quando não autenticado, então não
// precisam de proteção aqui — só as páginas que exigem login.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/extrato(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js|jpe?g|png|gif|svg|ico|woff2?|ttf|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
