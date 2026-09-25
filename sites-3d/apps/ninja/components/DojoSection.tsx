"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useDojo, multiplier, GAME_LENGTH } from "./dojoStore";
import { unlockAudio } from "./sfx";

const DojoScene = dynamic(() => import("./DojoScene"), { ssr: false });

/** Les polices display n'ont pas l'espace fine insécable (U+202F) : on la remplace. */
export const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, "\u00a0");

function Hud() {
  const { timeLeft, score, combo, phase } = useDojo();
  const mult = multiplier(combo);
  const pct = (timeLeft / GAME_LENGTH) * 100;
  const hot = timeLeft <= 5 && phase === "playing";
  return (
    <div className="hud" data-testid="dojo-hud">
      <div className={`hud-time${hot ? " hot" : ""}`}>
        <span className="hud-label">Temps</span>
        <span className="hud-value" data-testid="dojo-time">{timeLeft.toFixed(1)}<small> s</small></span>
        <span className="bar"><span style={{ transform: `scaleX(${pct / 100})` }} /></span>
      </div>
      <div className="hud-score">
        <span className="hud-label">Score</span>
        <span className="hud-value" data-testid="dojo-score">{fmt(score)}</span>
      </div>
      <div className={`hud-combo m${mult}`}>
        <span className="hud-label">Combo</span>
        <span className="hud-value" key={combo}>{combo}<small> ×{mult}</small></span>
      </div>
    </div>
  );
}

function Popups() {
  const popups = useDojo((s) => s.popups);
  const drop = useDojo((s) => s.dropPopup);
  return (
    <div className="popups" aria-hidden>
      {popups.map((p) => {
        const [pts, ...rest] = p.text.split(" ");
        const label = rest.join(" ").trim();
        return (
          <span key={p.id} className={`popup ${p.kind}`} style={{ left: p.x, top: p.y }} onAnimationEnd={() => drop(p.id)}>
            <b>{pts}</b>
            {label && <em>{label}</em>}
          </span>
        );
      })}
    </div>
  );
}

export default function DojoSection() {
  const phase = useDojo((s) => s.phase);
  const countdown = useDojo((s) => s.countdown);
  const s = useDojo();
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const aim = useRef({ x: 0, y: 0.1 });
  const startBtn = useRef<HTMLButtonElement>(null);
  const reticleEl = useRef<HTMLDivElement>(null);
  const [kb, setKb] = useState(false);
  const held = useRef(new Set<string>());
  const raf = useRef(0);

  const placeReticle = () => {
    const el = reticleEl.current;
    if (!el) return;
    el.style.left = `${((aim.current.x + 1) / 2) * 100}%`;
    el.style.top = `${((1 - aim.current.y) / 2) * 100}%`;
  };

  // déplacement continu du réticule tant qu'une flèche est enfoncée
  const loop = (last: number) => (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    const k = held.current;
    const sp = 1.5 * dt;
    let { x, y } = aim.current;
    if (k.has("ArrowLeft")) x -= sp;
    if (k.has("ArrowRight")) x += sp;
    if (k.has("ArrowUp")) y += sp;
    if (k.has("ArrowDown")) y -= sp;
    aim.current = { x: Math.max(-0.95, Math.min(0.95, x)), y: Math.max(-0.9, Math.min(0.75, y)) };
    placeReticle();
    raf.current = k.size ? requestAnimationFrame(loop(now)) : 0;
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    s.loadBest();
    setMounted(true);
    const el = frame.current;
    if (!el || !("IntersectionObserver" in window)) { setActive(true); return; }
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Recadre la zone de jeu entière sous la barre fixe avant le décompte. */
  const frameIntoView = () => {
    const el = frame.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const navH = document.querySelector<HTMLElement>(".nav")?.getBoundingClientRect().height ?? 64;
    const room = window.innerHeight - navH;
    if (r.top >= navH - 1 && r.bottom <= window.innerHeight + 1) return;
    const top = window.scrollY + r.top - navH - Math.max(0, (room - r.height) / 2);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  const start = () => {
    if (useDojo.getState().sound) unlockAudio();
    s.start();
    frameIntoView();
    frame.current?.focus({ preventScroll: true });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== frame.current) return;
    // passage au clavier : le réticule repart du centre de la zone de jeu
    const toKb = () => { if (!kb) { aim.current = { x: 0, y: 0.1 }; setKb(true); } };
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      toKb();
      if (!held.current.has(e.key)) {
        held.current.add(e.key);
        if (!raf.current) raf.current = requestAnimationFrame(loop(performance.now()));
      }
      return;
    }
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      if (phase === "idle" || phase === "over") { start(); return; }
      toKb();
      window.dispatchEvent(new CustomEvent("dojo-throw", { detail: { ...aim.current, snap: true } }));
    }
  };
  const onKeyUp = (e: React.KeyboardEvent) => { held.current.delete(e.key); };
  const onMove = (e: React.PointerEvent) => {
    const r = frame.current!.getBoundingClientRect();
    aim.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    if (kb && e.pointerType === "mouse") setKb(false);
  };
  useEffect(() => { if (kb) placeReticle(); }, [kb]); // eslint-disable-line react-hooks/exhaustive-deps

  const accuracy = s.throws ? Math.round((s.hits / s.throws) * 100) : 0;
  const locked = phase === "playing" || phase === "countdown";

  return (
    <section id="dojo" className="dojo" data-cam aria-labelledby="dojo-title">
      <div className="dojo-head">
        <div>
          <p className="eyebrow">Mini-jeu · 30 secondes</p>
          <h2 id="dojo-title">Dojo des shurikens</h2>
        </div>
        <p className="dojo-intro">
          Les cibles de paille glissent sur leurs rails, les pièces anciennes sont lancées en cloche et les oni
          surgissent derrière le muret. Enchaîne les touches sans rater : le multiplicateur monte jusqu&apos;à ×5.
        </p>
      </div>

      <div
        ref={frame}
        id="dojo-frame"
        className={`dojo-frame${locked ? " locked" : ""}`}
        tabIndex={0}
        role="application"
        aria-label="Zone de jeu du dojo. Clic ou toucher pour lancer un shuriken. Au clavier : flèches pour viser, Espace ou Entrée pour lancer."
        onKeyDown={onKey}
        onKeyUp={onKeyUp}
        onBlur={() => held.current.clear()}
        onPointerMove={onMove}
        data-testid="dojo-frame"
      >
        {mounted && <DojoScene active={active} />}
        <Hud />
        <Popups />
        <div ref={reticleEl} className={`reticle${kb ? " on" : ""}`} aria-hidden data-testid="dojo-reticle"><i /></div>
        <button
          type="button"
          className="sound"
          aria-pressed={s.sound}
          onClick={() => { unlockAudio(); s.setSound(!s.sound); }}
        >
          {s.sound ? "Son : activé" : "Son : coupé"}
        </button>

        {phase === "idle" && (
          <div className="dojo-card" role="dialog" aria-label="Commencer le mini-jeu">
            <p className="eyebrow">Entraînement libre en cours</p>
            <h3>Trente secondes, un carquois sans fond</h3>
            <p className="muted">Lance quelques shurikens pour t&apos;échauffer, puis démarre le chrono.</p>
            <button ref={startBtn} type="button" className="btn btn-shu" onClick={start} data-testid="dojo-start">
              Commencer · 30 s
            </button>
            <p className="best">Record sur cet appareil : <b>{fmt(s.best)}</b></p>
          </div>
        )}
        {phase === "countdown" && <div className="countdown" key={countdown} aria-live="assertive">{countdown}</div>}
        {phase === "over" && (
          <div className="dojo-card over" role="dialog" aria-label="Résultat" data-testid="dojo-result">
            <p className="eyebrow">{s.newRecord ? "Nouveau record" : "Fin du temps"}</p>
            <p className="final">{fmt(s.score)}<small> pts</small></p>
            <dl className="result">
              <div><dt>Précision</dt><dd>{accuracy} %</dd></div>
              <div><dt>Touches</dt><dd>{s.hits}/{s.throws}</dd></div>
              <div><dt>Meilleur combo</dt><dd>{s.bestCombo}</dd></div>
              <div><dt>Record</dt><dd>{fmt(s.best)}</dd></div>
            </dl>
            <button type="button" className="btn btn-shu" onClick={start} data-testid="dojo-replay">Rejouer</button>
          </div>
        )}
      </div>

      <ul className="legend" aria-label="Barème">
        <li><i className="sw target" />Cible de paille <b>100</b><span>plein centre 150</span></li>
        <li><i className="sw coin" />Pièce ancienne <b>150</b><span>lancée en cloche</span></li>
        <li><i className="sw oni" />Oni du muret <b>250</b><span>visible ≈ 1 s</span></li>
        <li><i className="sw bird" />Oiseau-sentinelle <b>300</b><span>passe en hauteur</span></li>
        <li><i className="sw combo" />Combo <b>×2 · ×3 · ×4 · ×5</b><span>à 3, 6, 10, 15 touches ; un raté remet à zéro</span></li>
      </ul>
    </section>
  );
}
