"use client";

import { useEffect, useRef } from "react";

// Comemoração do vencedor em 8-bit: canecas de cerveja caindo e espuma espirrando
// dos cantos de baixo como champanhe. Canvas que ocupa o elemento pai.

// Caneca (9×10): W espuma · Y cerveja · O bolha · G vidro.
const MUG = [
  ".WW.WW...",
  "WWWWWWW..",
  "WWWWWWW..",
  "GYYYYYGGG",
  "GYOYYYG.G",
  "GYYYOYG.G",
  "GYOYYYG.G",
  "GYYYYOGGG",
  "GYYYYYG..",
  "GGGGGGG..",
];
const MUG_COLORS: Record<string, string> = { W: "#FFF1E8", Y: "#FFEC27", O: "#FFA300", G: "#C2C3C7" };
const FOAM_COLORS = ["#FFF1E8", "#FFF1E8", "#FFEC27", "#FFCCAA"];

function mugSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = MUG[0].length;
  c.height = MUG.length;
  const ctx = c.getContext("2d")!;
  MUG.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = MUG_COLORS[row[x]];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  return c;
}

type Mug = { x: number; y: number; vy: number; phase: number; scale: number };
type Drop = { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string };

export default function BeerRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const sprite = mugSprite();
    let width = 0;
    let height = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width);
      canvas!.height = Math.round(height);
      ctx!.imageSmoothingEnabled = false;
    }
    resize();
    window.addEventListener("resize", resize);

    const unit = Math.max(3, Math.round(Math.min(width, 500) / 110)); // tamanho do "pixel"
    const mugs: Mug[] = Array.from({ length: 22 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 1.2 - height * 0.6, // metade já na tela
      vy: 60 + Math.random() * 90,
      phase: Math.random() * Math.PI * 2,
      scale: unit * (0.8 + Math.random() * 0.6),
    }));
    let drops: Drop[] = [];
    let nextBurst = 0;
    let last = performance.now();
    let raf = 0;

    function burst(fromLeft: boolean) {
      const x0 = fromLeft ? 0 : width;
      for (let i = 0; i < 70; i++) {
        // ângulo a partir da vertical, inclinado para o meio da tela
        const angle = (fromLeft ? -1 : 1) * (0.15 + Math.random() * 0.55);
        const speed = height * (0.7 + Math.random() * 0.6);
        drops.push({
          x: x0,
          y: height,
          vx: Math.sin(angle) * speed * -1,
          vy: -Math.cos(angle) * speed,
          life: 1.6 + Math.random() * 0.8,
          size: unit * (Math.random() < 0.3 ? 2 : 1),
          color: FOAM_COLORS[i % FOAM_COLORS.length],
        });
      }
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx!.clearRect(0, 0, width, height);

      if (now >= nextBurst) {
        burst(Math.random() < 0.5);
        nextBurst = now + 700 + Math.random() * 600;
      }

      for (const m of mugs) {
        m.y += m.vy * dt;
        m.phase += dt * 3;
        if (m.y > height + 40) {
          m.y = -40;
          m.x = Math.random() * width;
        }
        const x = Math.round(m.x + Math.sin(m.phase) * 12);
        ctx!.drawImage(sprite, x, Math.round(m.y), sprite.width * m.scale, sprite.height * m.scale);
      }

      const gravity = height * 0.9;
      drops = drops.filter((d) => (d.life -= dt) > 0 && d.y < height + 20);
      for (const d of drops) {
        d.vy += gravity * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        ctx!.fillStyle = d.color;
        ctx!.fillRect(Math.round(d.x / unit) * unit, Math.round(d.y / unit) * unit, d.size, d.size);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
