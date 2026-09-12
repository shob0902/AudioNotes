// The decorative drifting particle field drawn on a canvas behind the whole app.
import { useEffect, useRef } from "react";
// Sets up the canvas, runs the animation loop, and tears the listeners down on unmount.
export default function ParticleBackground() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame;
    const pointer = { x: -9999, y: -9999 };
    const PARTICLE_COUNT = () => Math.min(320, Math.floor((width * height) / 6500));
    // Creates one particle at a random position, depth and drift speed.
    function makeParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        twinklePhase: Math.random() * Math.PI * 2,
      };
    }
    // Matches the canvas to the window size and tops up or trims the particle count.
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const target = PARTICLE_COUNT();
      if (particles.length < target) {
        particles = particles.concat(Array.from({ length: target - particles.length }, makeParticle));
      } else {
        particles.length = target;
      }
    }
    // Records the cursor position so nearby particles can sparkle.
    function handlePointerMove(event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }
    // Parks the cursor off-screen once it leaves the window.
    function handlePointerLeave() {
      pointer.x = -9999;
      pointer.y = -9999;
    }
    // Draws one frame: moves each particle, wraps it at the edges and brightens the ones near the cursor.
    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (!reduceMotion) {
          p.x += p.vx * (0.4 + p.z);
          p.y += p.vy * (0.4 + p.z);
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
        const baseRadius = 0.5 + p.z * 1.6;
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hoverRadius = 140;
        const proximity = Math.max(0, 1 - dist / hoverRadius);
        const twinkle = reduceMotion
          ? 0.75
          : 0.55 + 0.45 * Math.sin(time * 0.0012 + p.twinklePhase);
        const baseAlpha = (0.15 + p.z * 0.5) * twinkle;
        const sparkleAlpha = proximity * proximity * 0.9;
        const alpha = Math.min(1, baseAlpha + sparkleAlpha);
        const radius = baseRadius + proximity * 2.5;
        if (proximity > 0.02) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4);
          glow.addColorStop(0, `rgba(255, 255, 255, ${sparkleAlpha * 0.5})`);
          glow.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduceMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    }
    resize();
    draw(0);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
