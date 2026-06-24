"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * MysticBackdrop — the persistent, immersive atmosphere layer for the
 * imperial-lacquer redesign (the "overwhelming, ancient-Eastern-mystique"
 * ground the whole app sits on).
 *
 * Mounted ONCE in app/layout.tsx, fixed behind everything (-z-10,
 * pointer-events-none), so it never remounts between phase changes — the
 * smoke and embers drift continuously across landing → casting → reading.
 *
 * Composition, back-to-front:
 *   1. CSS planes (no JS): lacquer gradient ground, craquelure grain, a
 *      slow-pulsing central altar glow, and a heavy edge vignette.
 *   2. One <canvas> driving four particle planes in a SINGLE requestAnimation-
 *      Frame loop — far gold-dust/bokeh, mid incense smoke + embers, near
 *      drifting oracle glyphs — each plane offset by a different factor of the
 *      pointer position for real multi-plane parallax/depth.
 *
 * Performance & accessibility:
 *   - One rAF for all particles; counts scale with viewport area (mobile stays
 *     light, desktop goes loud); DPR-aware.
 *   - prefers-reduced-motion → no loop at all: a single static haze is painted
 *     once and left still (the CSS planes also freeze via the globals.css
 *     reduced-motion guard).
 *   - The loop stops while the tab is hidden (visibilitychange) and on unmount.
 *
 * Nothing here is content — these are decorative symbols, no translatable
 * copy, no hexagram logic. Purely presentational (AGENTS.md golden rules).
 */

/** Decorative glyphs for the near-plane "glyph rain" — symbols, not UI copy. */
const RAIN_GLYPHS = [
  "卦", "爻", "易", "陰", "陽", "乾", "坤", "震", "巽", "坎", "離", "艮", "兌",
  "☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷",
  "䷀", "䷁", "䷂", "䷃", "䷜", "䷝", "䷿",
];

type Dust = { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number };
type Smoke = { x: number; y: number; r: number; vy: number; drift: number; a: number; grow: number };
type Ember = { x: number; y: number; r: number; vx: number; vy: number; a: number; life: number; max: number };
type Glyph = { x: number; y: number; size: number; vy: number; a: number; ch: string; sway: number; seed: number };

/** Parallax depth factor per plane (× pointer offset in px). */
const DEPTH = { dust: 0.35, smoke: 0.7, ember: 0.85, glyph: 1.15 };

export function MysticBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!canvasRef.current) return;
    // Non-null at declaration (not just guard-narrowed): control-flow
    // narrowing isn't preserved inside the nested draw closures below, so
    // capture canvas + context as non-null types up front.
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // Canvas can't resolve a CSS var() chain in ctx.font, so read the concrete
    // family next/font assigned to --font-ma-shan (falls back to serif).
    const brushFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-ma-shan").trim() || "serif";

    let dust: Dust[] = [];
    let smoke: Smoke[] = [];
    let embers: Ember[] = [];
    let glyphs: Glyph[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;

    function seedParticles() {
      const area = width * height;
      // Counts scale with area; capped so a huge desktop stays sane and a
      // phone stays light. The denser, "+90%" spec lives in these divisors.
      const dustN = Math.min(90, Math.round(area / 16000));
      const smokeN = Math.min(14, Math.round(area / 120000));
      const emberN = Math.min(34, Math.round(area / 42000));
      const glyphN = Math.min(26, Math.round(area / 60000));

      dust = Array.from({ length: dustN }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(0.4, 2.2),
        vx: rand(-0.06, 0.06),
        vy: rand(-0.12, -0.02),
        a: rand(0.05, 0.4),
        tw: rand(0, Math.PI * 2),
      }));
      smoke = Array.from({ length: smokeN }, () => ({
        x: rand(0, width),
        y: rand(height * 0.3, height + 80),
        r: rand(60, 160),
        vy: rand(-0.35, -0.12),
        drift: rand(-0.18, 0.18),
        a: rand(0.015, 0.06),
        grow: rand(0.05, 0.16),
      }));
      embers = Array.from({ length: emberN }, () => {
        const max = rand(260, 620);
        return {
          x: rand(0, width),
          y: rand(0, height),
          r: rand(0.6, 1.8),
          vx: rand(-0.15, 0.15),
          vy: rand(-0.55, -0.18),
          a: 0,
          life: rand(0, max),
          max,
        };
      });
      glyphs = Array.from({ length: glyphN }, () => ({
        x: rand(0, width),
        y: rand(-height, height),
        size: rand(14, 40),
        vy: rand(0.18, 0.55),
        a: rand(0.04, 0.16),
        ch: pick(RAIN_GLYPHS),
        sway: rand(0, Math.PI * 2),
        seed: rand(0.4, 1),
      }));
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    // Pointer parallax — target follows the cursor (normalized to ±1), the
    // applied offset eases toward it each frame.
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    function onPointer(e: PointerEvent) {
      target.x = (e.clientX / width - 0.5) * 2;
      target.y = (e.clientY / height - 0.5) * 2;
    }

    const MAX_PARALLAX = 26; // px at the nearest plane

    function drawDust(ox: number, oy: number) {
      for (const p of dust) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.02;
        if (p.y < -4) p.y = height + 4;
        if (p.x < -4) p.x = width + 4;
        else if (p.x > width + 4) p.x = -4;
        const twinkle = 0.6 + 0.4 * Math.sin(p.tw);
        ctx.beginPath();
        ctx.arc(p.x + ox * DEPTH.dust, p.y + oy * DEPTH.dust, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 215, 122, ${p.a * twinkle})`;
        ctx.fill();
      }
    }

    function drawSmoke(ox: number, oy: number) {
      for (const s of smoke) {
        s.y += s.vy;
        s.x += s.drift;
        s.r += s.grow;
        if (s.y + s.r < -40 || s.r > 240) {
          s.y = height + rand(40, 160);
          s.x = rand(0, width);
          s.r = rand(60, 140);
          s.a = rand(0.015, 0.06);
        }
        const cx = s.x + ox * DEPTH.smoke;
        const cy = s.y + oy * DEPTH.smoke;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.r);
        g.addColorStop(0, `rgba(60, 30, 24, ${s.a})`);
        g.addColorStop(1, "rgba(60, 30, 24, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawEmbers(ox: number, oy: number) {
      for (const e of embers) {
        e.life += 1;
        e.x += e.vx;
        e.y += e.vy;
        e.vx += rand(-0.02, 0.02);
        if (e.life > e.max || e.y < -8) {
          e.x = rand(0, width);
          e.y = height + rand(0, 40);
          e.life = 0;
          e.vy = rand(-0.55, -0.18);
        }
        // Fade in then out across its life.
        const phase = e.life / e.max;
        e.a = Math.sin(phase * Math.PI) * 0.85;
        const cx = e.x + ox * DEPTH.ember;
        const cy = e.y + oy * DEPTH.ember;
        ctx.beginPath();
        ctx.arc(cx, cy, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 84, 58, ${e.a})`;
        ctx.shadowColor = "rgba(244, 170, 90, 0.9)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function drawGlyphs(ox: number, oy: number) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const g of glyphs) {
        g.y += g.vy;
        g.sway += 0.01;
        if (g.y > height + 30) {
          g.y = -30;
          g.x = rand(0, width);
          g.ch = pick(RAIN_GLYPHS);
        }
        const sway = Math.sin(g.sway) * 8 * g.seed;
        ctx.font = `${g.size}px ${brushFamily}, serif`;
        ctx.fillStyle = `rgba(212, 175, 55, ${g.a})`;
        ctx.fillText(g.ch, g.x + sway + ox * DEPTH.glyph, g.y + oy * DEPTH.glyph);
      }
    }

    let raf = 0;
    function frame() {
      eased.x += (target.x - eased.x) * 0.04;
      eased.y += (target.y - eased.y) * 0.04;
      const ox = eased.x * MAX_PARALLAX;
      const oy = eased.y * MAX_PARALLAX;

      ctx.clearRect(0, 0, width, height);
      drawSmoke(ox, oy);
      drawDust(ox, oy);
      drawEmbers(ox, oy);
      drawGlyphs(ox, oy);

      raf = requestAnimationFrame(frame);
    }

    // Static single paint for reduced-motion: a calm haze, no loop.
    function paintStatic() {
      ctx.clearRect(0, 0, width, height);
      drawSmoke(0, 0);
      drawDust(0, 0);
      drawGlyphs(0, 0);
    }

    function onVisibility() {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduce && !raf) {
        raf = requestAnimationFrame(frame);
      }
    }

    resize();
    window.addEventListener("resize", resize);

    if (reduce) {
      paintStatic();
    } else {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* CSS planes: lacquer ground + grain + altar glow + vignette */}
      <div className="lacquer-ground absolute inset-0" />
      <div className="craquelure absolute inset-0 opacity-60" />
      <div
        className="animate-lantern absolute left-1/2 top-1/2 h-[80vmax] w-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.10) 0%, rgba(200,65,42,0.05) 35%, transparent 65%)",
        }}
      />
      {/* Particle planes */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Vignette sits above the particles to seat them into the dark edges */}
      <div className="altar-vignette absolute inset-0" />
    </div>
  );
}
