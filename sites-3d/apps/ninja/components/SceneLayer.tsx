"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/** Scène 3D fixe derrière toute la page ; mise en pause quand le dojo occupe l'écran. */
export default function SceneLayer() {
  const [paused, setPaused] = useState(false);
  // Défilement doux des ancres internes (en JS pour ne pas imposer scroll-behavior à toute la page)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      a.closest("details")?.removeAttribute("open");
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      try { history.replaceState(null, "", "#" + id); } catch { /* cadre sandboxé */ }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const dojo = document.getElementById("dojo");
    if (!dojo || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setPaused(e.intersectionRect.height >= window.innerHeight * 0.6), {
      threshold: Array.from({ length: 21 }, (_, i) => i / 20),
    });
    io.observe(dojo);
    return () => io.disconnect();
  }, []);
  return (
    <div className="scene-layer" aria-hidden>
      <HeroScene paused={paused} />
      <div className="scene-vignette" />
    </div>
  );
}
