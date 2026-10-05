import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { slugify } from "@/lib/store";
import type { Media, MediaType } from "@/lib/types";

function typeOf(name: string, mime: string): MediaType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/") || name.endsWith(".opus")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nenhum arquivo." }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const base = slugify(path.basename(file.name, path.extname(file.name)));
  const fileName = `${base}-${Date.now().toString(36)}${ext}`;
  const dir = path.join(process.cwd(), "public", "kb");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  const media: Media = { type: typeOf(file.name, file.type), src: `/kb/${fileName}`, name: file.name };
  return NextResponse.json(media);
}
