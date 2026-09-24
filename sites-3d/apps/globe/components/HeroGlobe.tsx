"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { X, Anchor, Clock3, Gauge, Boxes, CalendarClock, Timer } from "lucide-react";
import { PORTS, PORT_BY_CODE } from "./data";
import { useGlobe } from "./store";
import Sparkline from "./Sparkline";

const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => <div className="globe-canvas globe-loading" aria-hidden="true" />,
});

const fmt = (n: number) => n.toLocaleString("fr-FR");

function PortPanel() {
  const code = useGlobe((s) => s.selected);
  const select = useGlobe((s) => s.select);
  if (!code) {
    return (
      <div className="port-hint" aria-live="polite">
        <span className="hint-dot" /> Faites tourner le globe, puis cliquez ou touchez un port orange pour afficher ses indicateurs.
      </div>
    );
  }
  const p = PORT_BY_CODE[code];
  const trendDelta = p.trend[p.trend.length - 1] - p.trend[0];
  return (
    <aside className="port-panel" data-testid="port-panel" aria-live="polite" aria-label={`Indicateurs du port de ${p.name}`}>
      <header>
        <div>
          <p className="mono tiny muted">{p.code} · {p.country}</p>
          <h3>{p.name}</h3>
        </div>
        <button className="icon-btn" onClick={() => select(null)} aria-label="Fermer le panneau du port">
          <X size={18} />
        </button>
      </header>
      <p className="demo-tag">Données de démonstration</p>
      <dl className="port-stats">
        <div><dt><Boxes size={14} /> Volume 12 mois</dt><dd>{(p.teu / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M <small>EVP</small></dd></div>
        <div><dt><Anchor size={14} /> Conteneurs suivis</dt><dd>{fmt(p.tracked)}</dd></div>
        <div><dt><Gauge size={14} /> Occupation quais</dt><dd>{p.berth} <small>%</small></dd></div>
        <div><dt><Timer size={14} /> Séjour import</dt><dd>{p.dwell.toLocaleString("fr-FR")} <small>j</small></dd></div>
      </dl>
      <div className="port-wait">
        <div>
          <p className="tiny muted"><Clock3 size={13} /> Attente moyenne en rade</p>
          <p className="big">{p.wait.toLocaleString("fr-FR")} h <span className={trendDelta <= 0 ? "good" : "bad"}>{trendDelta <= 0 ? "▼" : "▲"} {Math.abs(trendDelta).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h / 8 sem.</span></p>
        </div>
        <Sparkline values={p.trend} label={`Attente en rade à ${p.name}, 8 dernières semaines`} />
      </div>
      <div className="port-next">
        <p className="tiny muted"><CalendarClock size={13} /> Prochaines escales · {p.calls7} sur 7 jours</p>
        <ul>
          {p.next.map((n) => (
            <li key={n.vessel}>
              <span>{n.vessel}</span>
              <span className="muted">de {n.from}</span>
              <span className="mono">ETA {n.eta}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function HeroGlobe() {
  const selected = useGlobe((s) => s.selected);
  const select = useGlobe((s) => s.select);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") select(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, select]);
  return (
    <div className="hero-globe">
      <GlobeScene />
      <div className="globe-hud mono" aria-hidden="true">
        <span>PROJ. ORTHO · 1:110M</span>
        <span>AIS SAT + TERRESTRE · MAJ 90 s</span>
      </div>
      <PortPanel />
      <nav className="port-chips" aria-label="Ports d'escale suivis">
        {PORTS.map((p) => (
          <button
            key={p.code}
            className={"chip" + (selected === p.code ? " is-on" : "")}
            aria-pressed={selected === p.code}
            onClick={() => select(selected === p.code ? null : p.code)}
          >
            {p.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
