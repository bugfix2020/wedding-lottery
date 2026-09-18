"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type?: "circle" | "square" | "star" | "line";
  rotation?: number;
  rotationSpeed?: number;
}

export function Particles({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Sci-fi color palette
    const colors = [
      "#22d3ee", // cyan
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#06b6d4", // teal
    ];

    const createParticle = (x: number, y: number): Particle => {
      const types: Array<"circle" | "square" | "star" | "line"> = ["circle", "square", "star", "line"];
      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * -8 - 3,
        size: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.012 + 0.004,
        type: types[Math.floor(Math.random() * types.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      };
    };

    const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? "moveTo" : "lineTo";
        ctx[method](Math.cos(angle) * size, Math.sin(angle) * size);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create particles from multiple sources when active
      if (isActive) {
        if (Math.random() < 0.5) {
          const x = Math.random() * canvas.width;
          particlesRef.current.push(createParticle(x, canvas.height + 20));
        }
        // Side particles
        if (Math.random() < 0.2) {
          const y = Math.random() * canvas.height;
          particlesRef.current.push({
            ...createParticle(0, y),
            vx: Math.random() * 4 + 2,
            vy: (Math.random() - 0.5) * 2,
          });
        }
        if (Math.random() < 0.2) {
          const y = Math.random() * canvas.height;
          particlesRef.current.push({
            ...createParticle(canvas.width, y),
            vx: -(Math.random() * 4 + 2),
            vy: (Math.random() - 0.5) * 2,
          });
        }
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= p.decay;
        p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0);

        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        switch (p.type) {
          case "square":
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
            break;
          case "star":
            drawStar(ctx, p.x, p.y, p.size, p.rotation || 0);
            break;
          case "line":
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.fillRect(-p.size * 1.5, -1, p.size * 3, 2);
            ctx.restore();
            break;
          default:
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add glow effect
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        ctx.restore();

        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
    />
  );
}

export function Confetti({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Celebration colors
    const colors = [
      "#FFD700", // Gold
      "#22d3ee", // Cyan
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#06b6d4", // Teal
      "#f97316", // Orange
      "#84cc16", // Lime
    ];

    if (isActive) {
      // Create explosion from center
      for (let i = 0; i < 200; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = Math.random() * 15 + 5;
        const types: Array<"circle" | "square" | "star"> = ["circle", "square", "star"];
        particlesRef.current.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.008 + 0.003,
          type: types[Math.floor(Math.random() * types.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        });
      }

      // Create side cannons
      for (let side = 0; side < 2; side++) {
        const startX = side === 0 ? 0 : canvas.width;
        const direction = side === 0 ? 1 : -1;
        for (let i = 0; i < 50; i++) {
          const types: Array<"circle" | "square" | "star"> = ["circle", "square", "star"];
          particlesRef.current.push({
            x: startX,
            y: canvas.height,
            vx: direction * (Math.random() * 10 + 5),
            vy: -(Math.random() * 15 + 10),
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: Math.random() * 0.008 + 0.003,
            type: types[Math.floor(Math.random() * types.length)],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
          });
        }
      }
    }

    const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? "moveTo" : "lineTo";
        ctx[method](Math.cos(angle) * size, Math.sin(angle) * size);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.vx *= 0.99;
        p.alpha -= p.decay;
        p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0);

        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;

        switch (p.type) {
          case "square":
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
            break;
          case "star":
            drawStar(ctx, p.x, p.y, p.size * 0.5, p.rotation || 0);
            break;
          default:
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        return true;
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}
