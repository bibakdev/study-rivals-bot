// apps/frontend/src/shared/components/ui/Confetti.tsx

'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
  color: string;
  tilt: number;
  tiltAngleInc: number;
  tiltAngle: number;
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: Particle[] = [];
    // پالت رنگی (آبی، طلایی، سفید)
    const colors = ['#3b82f6', '#fbbf24', '#ffffff', '#60a5fa', '#f59e0b'];
    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    const createParticles = (
      x: number,
      y: number,
      count: number,
      angle: number,
      spread: number,
      velocity: number
    ) => {
      for (let i = 0; i < count; i++) {
        const particleAngle = angle + (Math.random() * spread - spread / 2);
        const speed = velocity * (0.5 + Math.random() * 0.5);
        particles.push({
          x,
          y,
          r: Math.random() * 4 + 2,
          dx: Math.cos(particleAngle) * speed,
          dy: Math.sin(particleAngle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          tilt: Math.floor(Math.random() * 10) - 10,
          tiltAngleInc: Math.random() * 0.07 + 0.05,
          tiltAngle: 0
        });
      }
    };

    const startTime = Date.now();
    const DURATION = 10000; // دقیقا 10 ثانیه

    // ۱. انفجار بزرگ و اولیه در لحظه لود صفحه از ۳ نقطه پایین
    createParticles(width / 2, height, 100, -Math.PI / 2, Math.PI / 2, 22);
    createParticles(0, height, 50, -Math.PI / 3, Math.PI / 4, 18);
    createParticles(width, height, 50, (-Math.PI * 2) / 3, Math.PI / 4, 18);

    // ۲. بارش پیوسته کاغذ رنگی به مدت ۱۰ ثانیه
    intervalId = setInterval(() => {
      // اگر ۱۰ ثانیه گذشت، پرتاب متوقف شود
      if (Date.now() - startTime > DURATION) {
        clearInterval(intervalId);
        return;
      }

      // بارش نرم از سقف
      createParticles(
        Math.random() * width,
        -20,
        4,
        Math.PI / 2,
        Math.PI / 2,
        6
      );

      // فواره ملایم از گوشه چپ و راست تصویر
      createParticles(0, height * 0.6, 2, -Math.PI / 4, Math.PI / 6, 12);
      createParticles(
        width,
        height * 0.6,
        2,
        (-Math.PI * 3) / 4,
        Math.PI / 6,
        12
      );
    }, 50); // هر ۵۰ میلی‌ثانیه ذره جدید اضافه می‌شود

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle) * 2 + p.dx;
        p.dy += 0.15; // نیروی جاذبه نرم و ملایم
        p.y += p.dy;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
        ctx.stroke();
      }

      // بهینه‌سازی: پاک کردن ذراتی که از کادر خارج شده‌اند
      for (let i = particles.length - 1; i >= 0; i--) {
        if (
          particles[i].y > height + 50 ||
          particles[i].x < -50 ||
          particles[i].x > width + 50
        ) {
          particles.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
    />
  );
}
