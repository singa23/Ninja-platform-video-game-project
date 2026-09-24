"use client";
import { useEffect, useRef, useState } from "react";
import { Ship, ArrowRight, Leaf, Timer, Target, Radio } from "lucide-react";
import { SHIPMENTS, STATUS_LABEL, type Shipment } from "./data";
import Sparkline from "./Sparkline";

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function useCount(target: number, run: boolean, ms = 1600) {
  // Démarre à 92 % de la cible (valeur plausible, jamais de chute visible) puis monte jusqu'à la cible.
  const [v, setV] = useState(target * 0.92);
  const started = useRef(false);
  useEffect(() => {
    if (!run || started.current) return;
    started.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 4);
      setV(target * (0.92 + 0.08 * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  useEffect(() => { if (started.current) setV(target); }, [target]);
  return v;
}

type Kpi = { key: string; label: string; value: number; digits: number; unit: string; note: string; trend: number[]; icon: React.ReactNode; spark: string };

function KpiTile({ k, run }: { k: Kpi; run: boolean }) {
  const v = useCount(k.value, run);
  return (
    <article className="kpi" data-testid={`kpi-${k.key}`}>
      <p className="kpi-label">{k.icon}{k.label}</p>
      <p className="kpi-value">
        <span className="num">{v.toLocaleString("fr-FR", { minimumFractionDigits: k.digits, maximumFractionDigits: k.digits })}</span>
        <span className="unit">{k.unit}</span>
      </p>
      <div className="kpi-foot">
        <p className="tiny muted">{k.note}</p>
        <Sparkline values={k.trend} label={k.spark} unit={k.unit} w={96} h={32} />
      </div>
    </article>
  );
}

const FEED = [
  "NVTU 730418 2 · ETA repoussée de 31 h · dépression en Pacifique Nord",
  "ORBU 118564 0 · reefer rebranché à Singapour · consigne −18 °C tenue",
  "SLGU 482193 7 · sortie du canal de Suez · cap sur Jebel Ali à 16,5 nœuds",
  "KAIU 267051 9 · sélectionné au scanner douanier · Rotterdam, terminal Euromax",
  "NVTU 551902 4 · 612 milles nautiques restants · ETA New York tenue",
];

function Pill({ s }: { s: Shipment["status"] }) {
  return <span className={`pill pill-${s}`}><i aria-hidden="true" />{STATUS_LABEL[s]}</span>;
}

export default function Dashboard() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [boxes, setBoxes] = useState(48213);
  const [feedI, setFeedI] = useState(0);
  const [sel, setSel] = useState(SHIPMENTS[0].ref);
  useEffect(() => {
    if (!seen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setBoxes((b) => b + Math.round(Math.random() * 7 + 1));
      setFeedI((i) => (i + 1) % FEED.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [seen]);

  const kpis: Kpi[] = [
    { key: "evp", label: "Volume suivi en temps réel", value: boxes, digits: 0, unit: "EVP", note: "+6,1 % sur 30 jours", trend: [39.8, 41.2, 42.0, 43.5, 44.1, 45.9, 47.0, 48.2], icon: <Ship size={15} />, spark: "Volume suivi, milliers d'EVP" },
    { key: "retard", label: "Retard moyen à l'arrivée", value: 7.4, digits: 1, unit: "h", note: "Moyenne marché : 19,8 h", trend: [12.1, 11.4, 10.2, 9.8, 9.1, 8.3, 7.9, 7.4], icon: <Timer size={15} />, spark: "Retard moyen à l'arrivée" },
    { key: "co2", label: "CO₂ évité ce mois-ci", value: 1284, digits: 0, unit: "t CO₂e", note: "Méthode GLEC · ISO 14083", trend: [610, 720, 790, 880, 960, 1040, 1170, 1284], icon: <Leaf size={15} />, spark: "CO₂ évité cumulé" },
    { key: "eta", label: "Précision ETA à J-3", value: 94.2, digits: 1, unit: "%", note: "Écart toléré ± 4 h", trend: [88.5, 89.9, 90.4, 91.8, 92.2, 93.1, 93.6, 94.2], icon: <Target size={15} />, spark: "Précision ETA à J-3" },
  ];
  const cur = SHIPMENTS.find((s) => s.ref === sel)!;

  return (
    <div className="dash" ref={ref}>
      <div className="dash-bar">
        <p className="mono tiny"><span className="live-dot" aria-hidden="true" /> DIRECT · compte démo « Transitaire Atlantique »</p>
        <p className="feed mono tiny" aria-live="off" key={feedI}><Radio size={13} /> {FEED[feedI]}</p>
      </div>

      <div className="kpis">
        {kpis.map((k) => <KpiTile key={k.key} k={k} run={seen} />)}
      </div>

      <div className="dash-grid">
        <section className="ship-list" aria-labelledby="exp-title">
          <header className="panel-head">
            <h3 id="exp-title">Expéditions en cours</h3>
            <p className="tiny muted">{SHIPMENTS.length} sur 1 942 · tri par ETA</p>
          </header>
          <ul aria-label="Expéditions" data-testid="shipments">
            {SHIPMENTS.map((s) => (
              <li key={s.ref}>
                <button
                  type="button"
                  aria-pressed={sel === s.ref}
                  className={"ship-row" + (sel === s.ref ? " is-on" : "")}
                  onClick={() => setSel(s.ref)}
                >
                  <span className="sr-ref mono">{s.box}<small>{s.type}</small></span>
                  <span className="sr-route">{s.pol} <ArrowRight size={13} aria-hidden="true" /> {s.pod}</span>
                  <Pill s={s.status} />
                  <span className="sr-bar" aria-hidden="true"><span style={{ width: `${Math.round(s.progress * 100)}%` }} /></span>
                  <span className="sr-eta mono">{s.eta}<small className={s.delta.startsWith("+") ? "bad" : "good"}>{s.delta}</small></span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="ship-detail" aria-live="polite" data-testid="ship-detail">
          <header className="panel-head">
            <div>
              <p className="mono tiny muted">{cur.ref} · {cur.type}</p>
              <h3>{cur.box}</h3>
            </div>
            <Pill s={cur.status} />
          </header>
          <p className="muted small">{cur.vessel}</p>
          <ol className="frise" aria-label="Frise des escales">
            {cur.stops.map((st, i) => (
              <li key={i} className={`stop stop-${st.state}`}>
                <span className="stop-dot" aria-hidden="true" />
                <div>
                  <p className="stop-port">{st.port}</p>
                  <p className="tiny muted">{st.label}</p>
                </div>
                <span className="mono tiny">{st.date}</span>
              </li>
            ))}
          </ol>
          <div className="detail-foot">
            <div><p className="tiny muted">ETA prédite</p><p className="mono">{cur.eta}</p></div>
            <div><p className="tiny muted">Écart contractuel</p><p className={"mono " + (cur.delta.startsWith("+") ? "bad" : "good")}>{cur.delta}</p></div>
            <div><p className="tiny muted">Avancement</p><p className="mono">{Math.round(cur.progress * 100)} %</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}
