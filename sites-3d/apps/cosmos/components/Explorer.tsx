"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, X, RotateCcw, ChevronUp, ChevronLeft, ChevronRight, Scale, Orbit, Keyboard, Rewind } from "lucide-react";
import { AU_KM, EARTH_RADIUS_KM, MOON, PLANETS, SPEEDS, fmt, formatDate, formatRotation } from "./data";
import { VALID_FROM, VALID_TO, labelEls, moonLabel, realDistanceAU, resetToToday, setSimDate, sim, simDateMs, useStore } from "./sim";
import { sphereSnapshot } from "./textures";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

function useTicker(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => set((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

/* ——— Date simulée ——— */
function SimDate() {
  useTicker(120);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ms = mounted ? simDateMs() : 0;
  const jd = mounted ? sim.days + 2451545 : 0;
  const out = mounted && (ms < VALID_FROM || ms > VALID_TO);
  return (
    <div className="simdate" data-testid="sim-date">
      <span className="eyebrow">Date simulée</span>
      <output className="simdate-value" aria-live="off">{mounted ? formatDate(ms) : "—"}</output>
      <span className={`simdate-jd ${out ? "is-warn" : ""}`}>
        {out ? "Hors 1800–2050 : précision dégradée" : `JJ ${mounted ? fmt(jd, 1, 1) : "—"}`}
      </span>
    </div>
  );
}

/* ——— Choix de la date (saisie jj/mm/aaaa, indépendante de la langue du navigateur) ——— */
const frDay = (ms: number) => { const d = new Date(ms); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`; };
function parseDay(v: string): number | null {
  const t = v.trim();
  let y: number, mo: number, d: number;
  let m = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{4})$/.exec(t);
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else return null;
  if (y < 1000 || y > 2999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const ms = Date.UTC(y, mo - 1, d, 12);
  const back = new Date(ms);
  if (back.getUTCMonth() !== mo - 1) return null; // 31/02 et consorts
  return ms;
}
function DatePicker() {
  useTicker(120);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [bad, setBad] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = editing ? val : mounted ? frDay(simDateMs()) : "";
  const apply = (v: string) => {
    const t = parseDay(v);
    if (t === null) { setBad(true); return false; }
    setBad(false); setSimDate(t); return true;
  };
  return (
    <form className="goto" noValidate onSubmit={(e) => { e.preventDefault(); if (apply(val)) (e.currentTarget.elements.namedItem("goto-date") as HTMLInputElement | null)?.blur(); }}>
      <label className="eyebrow" htmlFor="goto-date">Aller au</label>
      <input
        id="goto-date" name="goto-date" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} enterKeyHint="go"
        placeholder="jj/mm/aaaa" maxLength={10} value={shown} data-testid="date-input"
        aria-invalid={bad} aria-describedby="goto-help" className={bad ? "is-bad" : ""}
        onFocus={(e) => { setVal(frDay(simDateMs())); setEditing(true); setBad(false); const el = e.currentTarget; requestAnimationFrame(() => el.select()); }}
        onBlur={() => { const t = parseDay(val); if (t !== null && val !== frDay(simDateMs())) setSimDate(t); setBad(false); setEditing(false); }}
        onChange={(e) => { setVal(e.target.value); setBad(false); }}
      />
      <span id="goto-help" className="sr-only">Format jour/mois/année, par exemple 09/02/1986, puis Entrée.</span>
    </form>
  );
}

/* ——— Console temporelle ——— */
function TimeConsole() {
  const speed = useStore((s) => s.speed);
  const paused = useStore((s) => s.paused);
  const setSpeed = useStore((s) => s.setSpeed);
  const togglePause = useStore((s) => s.togglePause);
  const dir = useStore((s) => s.dir);
  const toggleDir = useStore((s) => s.toggleDir);
  return (
    <div className="time" role="group" aria-label="Contrôle du temps">
      <button type="button" className="time-play" onClick={togglePause} aria-label={paused ? "Reprendre le temps" : "Mettre le temps en pause"} data-testid="play-pause">
        {paused ? <Play size={16} strokeWidth={2.2} /> : <Pause size={16} strokeWidth={2.2} />}
      </button>
      <button type="button" className={`time-dir ${dir < 0 ? "is-on" : ""}`} onClick={toggleDir} aria-pressed={dir < 0} aria-label="Remonter le temps" title="Remonter le temps (R)" data-testid="reverse">
        <Rewind size={15} strokeWidth={2.2} />
      </button>
      <div className="seg" role="radiogroup" aria-label="Vitesse de simulation">
        {SPEEDS.map((s, i) => (
          <button
            key={s.id} type="button" role="radio" aria-checked={!paused && speed === i}
            className={`seg-btn ${!paused && speed === i ? "is-on" : ""}`}
            onClick={() => setSpeed(i)} data-testid={`speed-${s.id}`}
          >
            <span className="seg-long">{dir < 0 ? "−" : ""}{s.label}</span><span className="seg-short">{dir < 0 ? "−" : ""}{s.short}</span>
          </button>
        ))}
      </div>
      <button type="button" className="time-today" onClick={resetToToday} title="Revenir à la date du jour" aria-label="Aujourd’hui : revenir à la date du jour" data-testid="today">
        <RotateCcw size={14} /> <span>Aujourd’hui</span>
      </button>
    </div>
  );
}

/* ——— Échelle ——— */
function ScaleToggle() {
  const scale = useStore((s) => s.scale);
  const setScale = useStore((s) => s.setScale);
  return (
    <div className="scale" role="radiogroup" aria-label="Échelle">
      <Scale size={14} className="scale-ico" aria-hidden="true" />
      {(["lisible", "reelle"] as const).map((m) => (
        <button key={m} type="button" role="radio" aria-checked={scale === m} className={`scale-btn ${scale === m ? "is-on" : ""}`} onClick={() => setScale(m)} data-testid={`scale-${m}`}>
          {m === "lisible" ? "Lisible" : "Réelle"}
        </button>
      ))}
    </div>
  );
}

/* ——— Liste des planètes ——— */
function PlanetList() {
  const focus = useStore((s) => s.focus);
  const select = useStore((s) => s.select);
  const ref = useRef<HTMLElement>(null);
  // rail horizontal (mobile) : garde l'élément actif visible, sans faire défiler la page
  useEffect(() => {
    const nav = ref.current; if (!nav || nav.scrollWidth <= nav.clientWidth + 1) return;
    const btn = nav.querySelector<HTMLElement>(".is-on"); if (!btn) return;
    const pad = 16;
    const l = btn.offsetLeft - pad, r = btn.offsetLeft + btn.offsetWidth + pad - nav.clientWidth;
    if (nav.scrollLeft > l) nav.scrollTo({ left: l, behavior: "smooth" });
    else if (nav.scrollLeft < r) nav.scrollTo({ left: r, behavior: "smooth" });
  }, [focus]);
  return (
    <nav className="rail" aria-label="Planètes" ref={ref}>
      <button type="button" className={`rail-item rail-sun ${focus === null ? "is-on" : ""}`} onClick={() => select(null)} data-testid="overview">
        <kbd>0</kbd><span className="rail-name">Vue d’ensemble</span><span className="rail-meta">Soleil</span>
      </button>
      {PLANETS.map((p, i) => (
        <button
          key={p.id} type="button" className={`rail-item ${focus === i ? "is-on" : ""}`}
          style={{ ["--c" as string]: p.color }}
          onClick={() => select(i)} aria-pressed={focus === i}
          data-testid={`planet-btn-${p.id}`}
        >
          <kbd>{i + 1}</kbd>
          <span className="rail-name"><i className="rail-dot" aria-hidden="true" />{p.name}</span>
          <span className="rail-meta">{fmt(p.distanceAU, 2, 2)} UA</span>
        </button>
      ))}
    </nav>
  );
}

/* ——— Comparateur de taille ——— */
const tint = (h: string) => {
  const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgb(${n.map((v) => Math.round(v + (255 - v) * 0.45)).join(",")})`;
};
function Comparator({ i }: { i: number }) {
  const p = PLANETS[i];
  const isEarth = p.id === "terre";
  const refName = isEarth ? "la Lune" : "la Terre";
  const refR = isEarth ? MOON.radiusKm : EARTH_RADIUS_KM;
  const refColor = isEarth ? "#b9b5ad" : "#7FB3E6";
  const ratio = p.radiusKm / refR;
  const big = Math.max(p.radiusKm, refR);
  const R = 74;
  const rp = (p.radiusKm / big) * R, rr = (refR / big) * R;
  const gap = 26;
  const W = 2 * rp + 2 * rr + gap;
  const x0 = (320 - W) / 2;
  const cxP = x0 + rp, cxR = x0 + 2 * rp + gap + rr;
  const base = 172;
  const vol = ratio ** 3;
  const massRatio = isEarth ? 5.97 / 0.0735 : p.massE24 / 5.97;
  const gRatio = isEarth ? 9.8 / 1.62 : p.gravity / 9.8;
  const across = Math.max(ratio, 1 / ratio);
  // globes ombrés tirés des textures de la scène (repli : dégradé tant qu'elles ne sont pas prêtes)
  const [imgs, setImgs] = useState<[string | null, string | null]>([null, null]);
  useEffect(() => {
    let alive = true;
    const run = () => {
      const a = sphereSnapshot(p.id, rp * 2 * 2.2), b = sphereSnapshot(isEarth ? "lune" : "terre", rr * 2 * 2.2);
      if (alive) setImgs([a, b]);
      if (alive && (!a || !b)) t = window.setTimeout(run, 700);
    };
    let t = window.setTimeout(run, 30);
    return () => { alive = false; window.clearTimeout(t); };
  }, [p.id, isEarth, rp, rr]);
  const [imgP, imgR] = imgs;
  return (
    <figure className="compare" data-testid="comparator">
      <svg viewBox="0 0 320 190" role="img" aria-label={`${p.name} comparée à ${refName} : rayon ${fmt(ratio, 2)} fois celui de ${refName}`}>
        <defs>
          <radialGradient id={`gp-${p.id}`} cx="0.35" cy="0.32" r="0.8">
            <stop offset="0" stopColor={tint(p.color)} />
            <stop offset="0.35" stopColor={p.color} />
            <stop offset="1" stopColor="#05070c" />
          </radialGradient>
          <radialGradient id="gref" cx="0.35" cy="0.32" r="0.8">
            <stop offset="0" stopColor={tint(refColor)} />
            <stop offset="0.35" stopColor={refColor} />
            <stop offset="1" stopColor="#05070c" />
          </radialGradient>
        </defs>
        <line x1="8" x2="312" y1={base + 0.5} y2={base + 0.5} className="compare-base" />
        {p.id === "saturne" && <ellipse cx={cxP} cy={base - rp} rx={rp * 2.2} ry={rp * 0.5} className="compare-ring" />}
        {imgP ? <image href={imgP} x={cxP - rp} y={base - 2 * rp} width={2 * rp} height={2 * rp} /> : <circle cx={cxP} cy={base - rp} r={Math.max(rp, 1.2)} fill={`url(#gp-${p.id})`} />}
        {imgR && rr > 3 ? <image href={imgR} x={cxR - rr} y={base - 2 * rr} width={2 * rr} height={2 * rr} /> : <circle cx={cxR} cy={base - rr} r={Math.max(rr, 1.2)} fill="url(#gref)" />}
        <text x={cxP} y={base + 14} textAnchor="middle" className="compare-lbl">{p.name}</text>
        <text x={cxR} y={base + 14} textAnchor="middle" className="compare-lbl">{isEarth ? "Lune" : "Terre"}</text>
      </svg>
      <dl className="compare-grid">
        <div><dt>Diamètre</dt><dd>× {fmt(ratio, 2, 2)}</dd></div>
        <div><dt>Volume</dt><dd>× {fmt(vol, vol < 10 ? 3 : 0)}</dd></div>
        <div><dt>Masse</dt><dd>× {fmt(massRatio, massRatio < 10 ? 3 : 0)}</dd></div>
        <div><dt>Gravité</dt><dd>× {fmt(gRatio, 2, 2)}</dd></div>
      </dl>
      <figcaption>
        {ratio >= 1
          ? `Il faudrait aligner ${fmt(across, 1)} fois ${refName} pour couvrir le diamètre ${p.of}.`
          : `${p.name} tiendrait ${fmt(across, 1)} fois dans le diamètre de ${refName}.`}
        {!isEarth && vol > 1 && ` Son volume engloberait ${fmt(vol, 0)} Terres.`}
      </figcaption>
    </figure>
  );
}

/* ——— Fiche planète ——— */
function LiveRows({ i }: { i: number }) {
  useTicker(250);
  const dSun = realDistanceAU(i, -1);
  const dEarth = i === 2 ? null : realDistanceAU(i, 2);
  const lightMin = dEarth === null ? 0 : (dEarth * 149597870.7) / 299792.458 / 60;
  return (
    <>
      <tr className="is-live"><th scope="row">Distance au Soleil, ce jour</th><td>{fmt(dSun, 3, 3)}<span>UA</span></td></tr>
      {dEarth !== null && (
        <tr className="is-live"><th scope="row">Distance à la Terre, ce jour</th><td>{fmt(dEarth, 3, 3)}<span>UA</span></td></tr>
      )}
      {dEarth !== null && (
        <tr className="is-live"><th scope="row">Temps-lumière depuis la Terre</th><td>{lightMin < 90 ? `${fmt(lightMin, 1, 1)}` : fmt(lightMin / 60, 2, 2)}<span>{lightMin < 90 ? "min" : "h"}</span></td></tr>
      )}
    </>
  );
}

function InfoPanel() {
  const focus = useStore((s) => s.focus);
  const select = useStore((s) => s.select);
  const compare = useStore((s) => s.compare);
  const setCompare = useStore((s) => s.setCompare);
  const sheetOpen = useStore((s) => s.sheetOpen);
  const setSheetOpen = useStore((s) => s.setSheetOpen);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [focus]);
  if (focus === null) return null;
  const p = PLANETS[focus];
  const years = p.periodDays / 365.25;
  return (
    <aside className={`panel ${sheetOpen ? "is-open" : ""}`} style={{ ["--c" as string]: p.color }} aria-label={`Fiche ${p.name}`} data-testid="info-panel" key={p.id}>
      <button type="button" className="panel-handle" onClick={() => setSheetOpen(!sheetOpen)} aria-expanded={sheetOpen} data-testid="sheet-toggle">
        <span className="panel-grip" aria-hidden="true" />
        <span className="sr-only">{sheetOpen ? "Réduire la fiche" : "Déplier la fiche"}</span>
        <ChevronUp size={16} className="panel-chev" aria-hidden="true" />
      </button>
      <header className="panel-head">
        <div>
          <p className="eyebrow"><span className="panel-swatch" aria-hidden="true" />{p.kind} · planète n° {focus + 1}</p>
          <h2 className="panel-title">{p.name}</h2>
        </div>
        <div className="panel-nav">
          <button type="button" className="panel-btn" onClick={() => select((focus + 7) % 8)} aria-label={`Planète précédente : ${PLANETS[(focus + 7) % 8].name}`} data-testid="prev-planet">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="panel-btn" onClick={() => select((focus + 1) % 8)} aria-label={`Planète suivante : ${PLANETS[(focus + 1) % 8].name}`} data-testid="next-planet">
            <ChevronRight size={18} />
          </button>
          <button type="button" className="panel-btn panel-close" onClick={() => select(null)} aria-label="Fermer la fiche et revenir à la vue d’ensemble">
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="panel-quick">
        <div><span>Rayon</span><b>{fmt(p.radiusKm, 0)} km</b></div>
        <div><span>Année</span><b>{p.periodDays < 1000 ? `${fmt(p.periodDays, 1)} j` : `${fmt(years, 2)} ans`}</b></div>
        <div><span>Lunes</span><b>{p.moons}</b></div>
      </div>
      <div className="panel-body" ref={scrollRef}>
        <FocusScaleNote i={focus} />
        <p className="panel-blurb">{p.blurb}</p>
        <button type="button" className={`compare-btn ${compare ? "is-on" : ""}`} onClick={() => setCompare(!compare)} aria-pressed={compare} data-testid="compare-btn">
          <Orbit size={15} aria-hidden="true" />
          {compare ? "Masquer la comparaison" : p.id === "terre" ? "Comparer à la Lune" : "Comparer à la Terre"}
        </button>
        {compare && <Comparator i={focus} />}
        <table className="facts">
          <caption>Fiche technique · source NASA</caption>
          <tbody>
            <tr><th scope="row">Rayon moyen</th><td>{fmt(p.radiusKm, 1)}<span>km</span></td></tr>
            <tr><th scope="row">Distance moyenne au Soleil</th><td>{fmt(p.distanceAU, 3, 3)}<span>UA</span></td></tr>
            <tr><th scope="row">Période orbitale</th><td>{fmt(p.periodDays, 1)}<span>j</span></td></tr>
            <tr><th scope="row">Période de rotation</th><td>{formatRotation(p.rotationHours)}</td></tr>
            <tr><th scope="row">Lunes connues (2025)</th><td>{p.moons}</td></tr>
            <tr><th scope="row">Gravité de surface</th><td>{fmt(p.gravity, 1, 1)}<span>m/s²</span></td></tr>
            <tr><th scope="row">Température moyenne</th><td>{p.tempC > 0 ? "+" : p.tempC < 0 ? "−" : ""}{fmt(Math.abs(p.tempC), 0)}<span>°C</span></td></tr>
            <tr><th scope="row">Inclinaison de l’axe</th><td>{fmt(p.tiltDeg, p.tiltDeg < 1 ? 3 : 1)}<span>°</span></td></tr>
            <tr><th scope="row">Masse</th><td>{fmt(p.massE24, 3)}<span>× 10²⁴ kg</span></td></tr>
            <tr><th scope="row">Vitesse orbitale moyenne</th><td>{fmt(p.orbitalKms, 1, 1)}<span>km/s</span></td></tr>
            <tr><th scope="row">Vitesse de libération</th><td>{fmt(p.escapeKms, 1, 1)}<span>km/s</span></td></tr>
            <LiveRows i={focus} />
          </tbody>
        </table>
        <p className="panel-fact"><b>À retenir</b>{p.fact}</p>
      </div>
    </aside>
  );
}

/* ——— Note d'échelle ——— */
function ScaleNote() {
  const scale = useStore((s) => s.scale);
  const focus = useStore((s) => s.focus);
  if (scale !== "reelle" || focus !== null) return null;
  return (
    <p className="scalenote" role="status" data-testid="scale-note">
      <b>Échelle réelle.</b> Si la Terre était à 100 m du Soleil, elle mesurerait 8,5 mm, le Soleil 93 cm, et Neptune tournerait à 3 km. Les repères signalent les planètes devenues invisibles.
    </p>
  );
}
function FocusScaleNote({ i }: { i: number }) {
  const scale = useStore((s) => s.scale);
  if (scale !== "reelle") return null;
  const p = PLANETS[i];
  const dKm = p.distanceAU * AU_KM;
  const text = p.id === "terre"
    ? `La Lune orbite à 384 400 km, soit 30 diamètres terrestres : la caméra recule pour montrer tout ce vide.`
    : `${fmt(p.radiusKm * 2, 0)} km de diamètre, à ${fmt(dKm / 1e6, 0)} millions de km du Soleil : ${fmt(dKm / (p.radiusKm * 2), 0)} fois son propre diamètre.`;
  return (
    <p className="panel-scalenote" role="status" data-testid="scale-note">
      <b>Échelle réelle</b>{text}
    </p>
  );
}

/* ——— Étiquettes de la scène (positionnées par la scène à chaque image) ——— */
function SceneLabels() {
  const select = useStore((s) => s.select);
  return (
    <div className="labels" aria-hidden="true">
      {PLANETS.map((p, i) => (
        <button
          key={p.id} type="button" tabIndex={-1} className="tag is-hidden"
          style={{ ["--c" as string]: p.color }}
          ref={(el) => { labelEls[i] = el; }}
          onClick={() => select(i)}
        >
          <span className="tag-dot" />
          <span className="tag-name">{p.name}</span>
        </button>
      ))}
      <span className="tag tag-moon is-hidden" ref={(el) => { moonLabel.el = el; }}><span className="tag-dot" /><span className="tag-name">Lune</span></span>
    </div>
  );
}

/* ——— Introduction ——— */
function Intro() {
  const setIntro = useStore((s) => s.setIntro);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <section className="intro" aria-labelledby="intro-title">
      <p className="brand brand-lg"><span className="brand-mark" aria-hidden="true" />Almanach Orbital</p>
      <h1 id="intro-title" className="intro-title">Le système solaire,{" "}<br />à la date que{" "}<br />vous choisissez.</h1>
      <p className="intro-lede">
        Positions calculées à partir des éléments orbitaux moyens du JPL depuis J2000, dimensions et périodes des fiches NASA.
        <span className="lede-more"> Choisissez une date entre 1800 et 2050, accélérez le temps jusqu’à une année par seconde ou remontez-le, passez à l’échelle réelle, mesurez chaque planète contre la Terre.</span>
      </p>
      <div className="intro-cta">
        <button ref={btn} type="button" className="btn-primary" onClick={() => setIntro(false)} data-testid="enter">
          Ouvrir l’explorateur
        </button>
        <span className="intro-hint"><Keyboard size={14} aria-hidden="true" /> Touches <kbd>1</kbd>–<kbd>8</kbd> pour sauter d’une planète à l’autre</span>
      </div>
      <dl className="intro-stats">
        <div><dt>Corps modélisés</dt><dd>8 planètes, la Lune, la ceinture principale</dd></div>
        <div><dt>Précision 1800–2050</dt><dd>≈ 1′ (telluriques) à 10′ (géantes)</dd></div>
        <div><dt>Horizon</dt><dd>Neptune à {fmt(PLANETS[7].distanceAU, 2, 2)} UA</dd></div>
      </dl>
    </section>
  );
}

/* ——— Page ——— */
export default function Explorer() {
  const intro = useStore((s) => s.intro);
  const focus = useStore((s) => s.focus);
  const sheetOpen = useStore((s) => s.sheetOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      if (/^[1-8]$/.test(e.key)) { s.setIntro(false); s.select(Number(e.key) - 1); e.preventDefault(); }
      else if (e.key === "0" || e.key === "Escape") { if (!s.intro) s.select(null); }
      else if (e.key === " " && !(t && t.tagName === "BUTTON")) { e.preventDefault(); s.togglePause(); }
      else if (e.key === "e" || e.key === "E") s.toggleScale();
      else if ((e.key === "c" || e.key === "C") && s.focus !== null) s.setCompare(!s.compare);
      else if ((e.key === "r" || e.key === "R") && !s.intro) s.toggleDir();
      else if (e.key === "Enter" && s.intro && !(t && t.tagName === "BUTTON")) s.setIntro(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className={`app ${intro ? "is-intro" : "is-explore"} ${focus !== null ? "has-focus" : ""} ${focus !== null && sheetOpen ? "has-sheet" : ""}`}>
      <div className="stage" data-testid="scene"><Scene /></div>
      {intro ? (
        <Intro />
      ) : (
        <>
          <header className="top">
            <p className="brand"><span className="brand-mark" aria-hidden="true" />Almanach Orbital</p>
            <SimDate />
            <DatePicker />
            <ScaleToggle />
          </header>
          <SceneLabels />
          <PlanetList />
          <div className="bottom">
            <TimeConsole />
            <p className="keys" aria-hidden="true"><kbd>1</kbd>–<kbd>8</kbd> planètes · <kbd>0</kbd> ensemble · <kbd>espace</kbd> pause · <kbd>R</kbd> sens · <kbd>E</kbd> échelle · <kbd>C</kbd> comparer</p>
          </div>
          <ScaleNote />
          <InfoPanel />
        </>
      )}
    </main>
  );
}
