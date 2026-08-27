"use client";

import { useEffect, useRef } from "react";

// Fixed-viewport dot grid that repels from the cursor and eases back to
// rest, à la Gemini's landing-page background. Pure Canvas 2D — no
// dependency pulled in just for this. Respects prefers-reduced-motion by
// falling back to a static grid (no listeners, no animation loop).
const SPACING = 18;
const DOT_RADIUS = 1.3;
const INFLUENCE_RADIUS = 140;
const MAX_PUSH = 18;
const EASE = 0.12;
const DOT_COLOR = "37, 99, 235"; // blue-600, matches the site's accent
const BASE_ALPHA = 0.22;
const PEAK_ALPHA = 0.6;

type Dot = {
  ox: number;
  oy: number;
  x: number;
  y: number;
};

export default function DotCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    function buildGrid() {
      dots = [];
      for (let x = SPACING / 2; x < width; x += SPACING) {
        for (let y = SPACING / 2; y < height; y += SPACING) {
          dots.push({ ox: x, oy: y, x, y });
        }
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = `rgba(${DOT_COLOR}, ${BASE_ALPHA})`;
      for (const dot of dots) {
        ctx!.beginPath();
        ctx!.arc(dot.ox, dot.oy, DOT_RADIUS, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    if (reduceMotion) {
      resize();
      drawStatic();
      window.addEventListener("resize", () => {
        resize();
        drawStatic();
      });
      return;
    }

    const mouse = { x: -9999, y: -9999 };
    let rafId = 0;

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function tick() {
      ctx!.clearRect(0, 0, width, height);
      for (const dot of dots) {
        const dx = dot.ox - mouse.x;
        const dy = dot.oy - mouse.y;
        const dist = Math.hypot(dx, dy);

        let targetX = dot.ox;
        let targetY = dot.oy;
        let proximity = 0;

        if (dist < INFLUENCE_RADIUS && dist > 0.001) {
          proximity = 1 - dist / INFLUENCE_RADIUS;
          const push = proximity * MAX_PUSH;
          targetX = dot.ox + (dx / dist) * push;
          targetY = dot.oy + (dy / dist) * push;
        }

        dot.x += (targetX - dot.x) * EASE;
        dot.y += (targetY - dot.y) * EASE;

        const radius = DOT_RADIUS + proximity * 1.6;
        const alpha = BASE_ALPHA + proximity * (PEAK_ALPHA - BASE_ALPHA);
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${DOT_COLOR}, ${alpha})`;
        ctx!.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      rafId = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
