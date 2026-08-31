export { auth as middleware } from "@/auth";

// As rotas /api/orders/* já verificam a sessão internamente e respondem
// com JSON 401 quando não autenticado — por isso não entram no matcher
// aqui (o middleware padrão redirecionaria para a página de login em vez
// de devolver JSON).
export const config = {
  matcher: ["/dashboard/:path*", "/extrato/:path*"],
};
