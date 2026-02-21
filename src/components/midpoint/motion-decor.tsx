"use client";

import { useEffect } from "react";

export function MotionDecor() {
  useEffect(() => {
    let frame = 0;
    const root = document.documentElement;

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth) * 100;
        const y = (event.clientY / window.innerHeight) * 100;
        root.style.setProperty("--mx", x.toFixed(2));
        root.style.setProperty("--my", y.toFixed(2));
        frame = 0;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="parallax-layer" aria-hidden="true">
      <div className="video-bg-base" />
      <div className="video-bg-wave video-bg-wave-a" />
      <div className="video-bg-wave video-bg-wave-b" />
      <div className="video-bg-grain" />
      <div className="parallax-blob parallax-blob-a" />
      <div className="parallax-blob parallax-blob-b" />
      <div className="parallax-blob parallax-blob-c" />
    </div>
  );
}
