export type MediaType = "image" | "video" | "pdf" | "audio" | "file";

export type Media = {
  type: MediaType;
  src: string; // caminho em /public (ex: /kb/cmts-nodos.jpg) ou URL do Vercel Blob
  name: string;
};

export type Entry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  media: Media[];
  sensitive: boolean; // senhas etc.: no Telegram vão só no privado
  hits: number;
  source: "rose" | "novo";
  updatedAt: string;
};

export type Miss = {
  query: string;
  count: number;
  lastAt: string;
};

export const CATEGORIES = [
  "Senhas e acessos",
  "Códigos de material",
  "Configuração de equipamentos",
  "TV e decoder",
  "Rede e HFC",
  "Links e sistemas",
  "Procedimentos",
] as const;
