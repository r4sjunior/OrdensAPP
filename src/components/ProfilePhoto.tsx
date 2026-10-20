"use client";

import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

const SIZE = 512;

// Recorta o centro da foto num quadrado e reduz para 512px (foto de celular tem vários MB).
async function squareJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file;
}

// Foto de perfil (guardada no Clerk). Só aparece na roleta do sorteio da Caixinha de Gela.
export default function ProfilePhoto() {
  const { user, isLoaded } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ ok: false, text: "Escolha uma imagem." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await user.setProfileImage({ file: await squareJpeg(file) });
      await user.reload();
      await fetch("/api/profile/avatar", { method: "POST" });
      setMessage({ ok: true, text: "Foto atualizada! Ela aparece nos rankings e na sua fatia da roleta." });
    } catch {
      setMessage({ ok: false, text: "Não foi possível trocar a foto. Tente outra imagem." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 text-center sm:p-10">
      <h1 className="font-display text-xl font-bold text-ink">Seu avatar</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-inkSoft">
        Essa foto aparece nos rankings e na sua fatia da roleta do sorteio da Caixinha de Gela.
        Quem não adiciona foto aparece nos rankings com um ícone neutro.
      </p>

      <div className="mt-6 flex justify-center">
        {isLoaded && user ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt="Sua foto de perfil"
            className="h-36 w-36 animate-pop-in rounded-full object-cover shadow-lift ring-4 ring-stamp ring-offset-4 ring-offset-white"
          />
        ) : (
          <div className="h-36 w-36 animate-pulse rounded-full border-4 border-line bg-paperDim" />
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || !user}
        className="btn-stamp mt-6 w-full sm:w-auto"
      >
        {busy ? "Enviando…" : "📷 Trocar foto"}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.ok ? "text-teal" : "text-stamp"}`}>{message.text}</p>
      )}
    </div>
  );
}
