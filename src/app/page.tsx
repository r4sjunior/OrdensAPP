import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm border border-line bg-paper p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-stamp font-display text-lg font-bold text-stamp">
            OS
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight text-ink">
              Ordens de Serviço
            </p>
            <p className="text-xs text-inkSoft">registro diário</p>
          </div>
        </div>

        <p className="mb-8 text-sm leading-relaxed text-inkSoft">
          Registre cada ordem de serviço realizada com um toque. Acompanhe o
          total do dia, da semana e do mês.
        </p>

        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 border-2 border-ink px-5 py-3 font-body text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            <GoogleIcon />
            Entrar com Google
          </button>
        </SignInButton>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
