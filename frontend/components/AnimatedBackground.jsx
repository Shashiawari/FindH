'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function AnimatedBackground() {
  const layerRef = useRef(null);
  const blob1 = useRef(null);
  const blob2 = useRef(null);
  const blob3 = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      const tl1 = gsap.to(blob1.current, {
        x: 95,
        y: 70,
        rotation: 8,
        scale: 1.12,
        duration: 22,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      const tl2 = gsap.to(blob2.current, {
        x: -85,
        y: 55,
        rotation: -6,
        scale: 1.08,
        duration: 18,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 2,
      });

      const tl3 = gsap.to(blob3.current, {
        x: 60,
        y: -65,
        rotation: 10,
        scale: 1.15,
        duration: 26,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 4,
      });

      gsap.to(layerRef.current, {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      return () => {
        tl1.kill();
        tl2.kill();
        tl3.kill();
      };
    });

    return () => ctx.revert();
  }, []);

  const blobStyle = {
    position: 'fixed',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
    willChange: 'transform',
  };

  return (
    <div ref={layerRef} style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }} aria-hidden="true">
      <div
        ref={blob1}
        className="bg-blob"
        style={{
          ...blobStyle,
          width: '500px',
          height: '500px',
          background: '#6366F1',
          top: '-120px',
          left: '-100px',
          opacity: 0.13,
          filter: 'blur(100px)',
        }}
      />
      <div
        ref={blob2}
        className="bg-blob"
        style={{
          ...blobStyle,
          width: '420px',
          height: '420px',
          background: '#22C55E',
          bottom: '-80px',
          right: '-80px',
          opacity: 0.12,
          filter: 'blur(90px)',
        }}
      />
      <div
        ref={blob3}
        className="bg-blob"
        style={{
          ...blobStyle,
          width: '360px',
          height: '360px',
          background: '#8B5CF6',
          top: '30%',
          right: '15%',
          opacity: 0.1,
          filter: 'blur(110px)',
        }}
      />
    </div>
  );
}
