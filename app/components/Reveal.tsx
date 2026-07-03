'use client';
import { useEffect, useRef, useState } from 'react';

export default function Reveal({ children, delay = 0, className = '' }:
  { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(18px)',
      transition: `opacity .5s ease-out ${delay}ms, transform .5s ease-out ${delay}ms`,
    }}>{children}</div>
  );
}
