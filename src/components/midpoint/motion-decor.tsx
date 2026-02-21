"use client";

import { useEffect, useRef } from "react";

export function MotionDecor() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyPlaybackRate = () => {
      video.playbackRate = 0.6;
    };

    applyPlaybackRate();
    video.addEventListener("loadedmetadata", applyPlaybackRate);
    return () => {
      video.removeEventListener("loadedmetadata", applyPlaybackRate);
    };
  }, []);

  return (
    <div className="parallax-layer" aria-hidden="true">
      <video ref={videoRef} className="video-bg-video" autoPlay muted loop playsInline preload="auto">
        <source src="/midpoint-bg.mp4" type="video/mp4" />
      </video>
      <div className="video-bg-tint" />
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
