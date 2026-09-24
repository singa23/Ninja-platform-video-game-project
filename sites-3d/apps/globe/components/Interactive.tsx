"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Plus, Minus, Send, CircleCheck, RotateCcw } from "lucide-react";

/* ---------------- Tarifs ---------------- */
const PLANS = [
  {
    id: "escale", name: "Escale", monthly: 290, annual: 240, cap: "jusqu'à 250 EVP suivis / mois",
    pitch: "Pour l'importateur qui veut enfin savoir où sont ses boîtes sans relancer trois transitaires.",
    items: ["Suivi AIS + messages EDI des armateurs", "ETA prédite, rafraîchie toutes les 15 min", "Alertes e-mail : retard, transbordement, roulage", "3 utilisateurs"],
  },
  {
    id: "ligne", name: "Ligne régulière", monthly: 890, annual: 740, cap: "jusqu'à 2 000 EVP suivis / mois", featured: true,
    pitch: "Pour les transitaires et chargeurs multi-origines qui pilotent des flux hebdomadaires.",
    items: ["Tout Escale, plus :", "Prévision de surestaries et de détention", "Bilan CO₂ par conteneur (GLEC, ISO 14083)", "API REST + webhooks, 20 utilisateurs", "Portail client en marque blanche"],
  },
  {
    id: "flotte", name: "Flotte", monthly: null, annual: null, cap: "volumes au-delà de 2 000 EVP / mois",
    pitch: "Pour les commissionnaires et groupes industriels avec des engagements contractuels d'ETA.",
    items: ["Tout Ligne régulière, plus :", "Balises IoT reefer (température, ouverture)", "Hébergement dédié UE, SSO SAML", "Engagement de service 99,9 %", "Chargé de compte, revue trimestrielle"],
  },
] as const;

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="pricing">
      <div className="billing" role="radiogroup" aria-label="Période de facturation" onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === "Home" ? false : e.key === "End" ? true : !annual;
        setAnnual(next);
        (e.currentTarget.querySelector(next ? "[data-testid=bill-annual]" : "[data-testid=bill-monthly]") as HTMLElement | null)?.focus();
      }}>
        <button role="radio" aria-checked={!annual} tabIndex={annual ? -1 : 0} className={!annual ? "is-on" : ""} onClick={() => setAnnual(false)} data-testid="bill-monthly">Mensuel</button>
        <button role="radio" aria-checked={annual} tabIndex={annual ? 0 : -1} className={annual ? "is-on" : ""} onClick={() => setAnnual(true)} data-testid="bill-annual">Annuel <small>2 mois offerts</small></button>
        <span className="billing-thumb" style={{ transform: `translateX(${annual ? "100%" : "0"})` }} aria-hidden="true" />
      </div>
      <div className="plans">
        {PLANS.map((p) => {
          const price = annual ? p.annual : p.monthly;
          return (
            <article key={p.id} className={"plan" + ("featured" in p && p.featured ? " is-featured" : "")} data-testid={`plan-${p.id}`}>
              {"featured" in p && p.featured && <p className="plan-flag mono tiny">Le plus choisi par les transitaires</p>}
              <h3>{p.name}</h3>
              <p className="plan-cap mono tiny">{p.cap}</p>
              <p className="plan-price" aria-live="polite">
                {price === null ? (
                  <span className="num">Sur devis</span>
                ) : (
                  <>
                    <span className="num" data-testid={`price-${p.id}`}>{price.toLocaleString("fr-FR")} €</span>
                    <span className="per">HT / mois{annual ? ", facturé annuellement" : ""}</span>
                  </>
                )}
              </p>
              {price !== null && annual && <p className="saving tiny">Soit {((p.monthly! - p.annual!) * 12).toLocaleString("fr-FR")} € économisés par an</p>}
              <p className="plan-pitch">{p.pitch}</p>
              <ul>
                {p.items.map((it) => (
                  <li key={it}><Check size={15} aria-hidden="true" />{it}</li>
                ))}
              </ul>
              <a className={"btn " + ("featured" in p && p.featured ? "btn-primary" : "btn-ghost")} href="#demo">
                {price === null ? "Parler à l'équipe" : "Essayer 30 jours"}
              </a>
            </article>
          );
        })}
      </div>
      <p className="tiny muted pricing-note">EVP suivi = un conteneur 20 pieds suivi de l'enlèvement à la livraison ; un 40 pieds compte pour 2 EVP. Au-delà du forfait : 0,90 € HT par EVP.</p>
    </div>
  );
}

/* ---------------- FAQ ---------------- */
const QA = [
  { q: "D'où viennent les positions des navires ?", a: "Nous croisons l'AIS terrestre et satellitaire (latence médiane de 90 s près des côtes, 6 à 12 min en haute mer), les messages EDIFACT des armateurs (IFTSTA, COPARN) et, en option, des balises IoT posées sur vos conteneurs. Chaque position est horodatée et sourcée dans l'historique." },
  { q: "Comment l'ETA est-elle calculée ?", a: "Notre modèle part de la route probable du navire, de sa vitesse fond réelle en nœuds, de la congestion observée au port d'escale (attente en rade, occupation des quais) et de la météo marine à 10 jours. Il ne s'appuie pas uniquement sur l'ETA déclarée par l'armateur, souvent optimiste de 12 à 30 h." },
  { q: "Que se passe-t-il lors d'un transbordement ?", a: "Sillage détecte le déchargement au hub (Tanger Med, Singapour, Colombo…) puis surveille le rechargement sur le navire suivant. Si la boîte n'a pas repris la mer 48 h après la date prévue, vous recevez une alerte de roulage avec la prochaine rotation disponible." },
  { q: "Comment sont estimées les émissions de CO₂ ?", a: "Par conteneur et par tronçon, selon le cadre GLEC et la norme ISO 14083 : distance réelle parcourue en milles nautiques, type et taille du navire, taux de remplissage moyen du service. Le « CO₂ évité » compare l'itinéraire retenu à l'option la plus émissive proposée pour le même couple POL/POD." },
  { q: "Combien de temps pour être opérationnel ?", a: "Une journée si vous importez vos numéros de B/L ou de conteneurs par fichier. Comptez deux à trois semaines pour une intégration complète avec votre TMS ou votre ERP via l'API et les webhooks." },
  { q: "Où sont hébergées nos données ?", a: "Dans l'Union européenne, chez un hébergeur certifié ISO 27001, avec chiffrement au repos et en transit. Vos données commerciales ne sont jamais partagées avec d'autres clients ni avec les compagnies maritimes." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="faq" data-testid="faq">
      {QA.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={"faq-item" + (isOpen ? " is-open" : "")}>
            <h3>
              <button
                id={`${base}-b${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-p${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                {isOpen ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              </button>
            </h3>
            <div id={`${base}-p${i}`} role="region" aria-labelledby={`${base}-b${i}`} className="faq-panel" hidden={!isOpen}>
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Formulaire de démo ---------------- */
type Fields = { nom: string; email: string; societe: string; volume: string; port: string; message: string };
const EMPTY: Fields = { nom: "", email: "", societe: "", volume: "", port: "", message: "" };
const KEY = "sillage-demo-draft";

export function DemoForm() {
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [sent, setSent] = useState<null | { ref: string; nom: string }>(null);
  const [busy, setBusy] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sent) successRef.current?.focus(); }, [sent]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setF({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* stockage indisponible : on ignore */ }
  }, []);
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...f, [k]: e.target.value };
    setF(next);
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    if (f.nom.trim().length < 2) er.nom = "Indiquez vos nom et prénom.";
    if (!f.email.trim()) er.email = "Indiquez votre e-mail professionnel.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) er.email = "Adresse e-mail invalide (ex. nom@societe.fr).";
    if (f.societe.trim().length < 2) er.societe = "Indiquez votre société.";
    if (!f.volume) er.volume = "Choisissez une tranche de volume.";
    setErrors(er);
    if (Object.keys(er).length) {
      const first = Object.keys(er)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSent({ ref: "DEMO-" + Math.floor(100000 + Math.random() * 899999), nom: f.nom.trim().split(" ")[0] });
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    }, 700);
  };

  if (sent) {
    return (
      <div className="form-success" role="status" data-testid="demo-success" tabIndex={-1} ref={successRef}>
        <CircleCheck size={34} aria-hidden="true" />
        <h3>Demande enregistrée, {sent.nom}.</h3>
        <p>Un chargé d'affaires vous rappelle sous 24 h ouvrées pour caler une démonstration de 30 minutes sur vos propres conteneurs.</p>
        <p className="mono tiny">Référence {sent.ref} · aucune donnée n'a quitté cette page de démonstration</p>
        <button className="btn btn-ghost" onClick={() => { setSent(null); setF(EMPTY); }}><RotateCcw size={15} /> Nouvelle demande</button>
      </div>
    );
  }

  const field = (k: keyof Fields) => ({
    id: `f-${k}`,
    name: k,
    value: f[k],
    onChange: set(k),
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `e-${k}` : undefined,
    "data-testid": `f-${k}`,
  });
  const err = (k: keyof Fields) => errors[k] && <span className="err" id={`e-${k}`} role="alert">{errors[k]}</span>;

  return (
    <form className="demo-form" onSubmit={submit} noValidate data-testid="demo-form">
      <label className="span2">Nom et prénom<input {...field("nom")} autoComplete="name" placeholder="Claire Lemaître" />{err("nom")}</label>
      <label>E-mail professionnel<input {...field("email")} type="email" autoComplete="email" placeholder="c.lemaitre@entreprise.fr" />{err("email")}</label>
      <label>Société<input {...field("societe")} autoComplete="organization" placeholder="Nom de votre société" />{err("societe")}</label>
      <label>Volume annuel
        <select {...field("volume")}>
          <option value="">Choisir…</option>
          <option value="<500">Moins de 500 EVP</option>
          <option value="500-5000">500 à 5 000 EVP</option>
          <option value="5000-50000">5 000 à 50 000 EVP</option>
          <option value=">50000">Plus de 50 000 EVP</option>
        </select>
        {err("volume")}
      </label>
      <label>Port de chargement principal
        <select {...field("port")}>
          <option value="">Indifférent</option>
          <option>Le Havre</option><option>Anvers</option><option>Rotterdam</option><option>Tanger Med</option>
          <option>Shanghai</option><option>Singapour</option><option>Busan</option><option>Autre</option>
        </select>
      </label>
      <label className="span2"><span>Votre contexte <span className="muted">(facultatif)</span></span>
        <textarea {...field("message")} rows={3} placeholder="Ex. : 40 EVP / semaine Asie → Le Havre, trop de surestaries au dépotage." />
      </label>
      <div className="span2 form-foot">
        <button type="submit" className="btn btn-primary" disabled={busy} data-testid="demo-submit">
          <Send size={16} aria-hidden="true" /> {busy ? "Envoi…" : "Demander ma démo"}
        </button>
        <p className="tiny muted">Réponse sous 24 h ouvrées. Pas de newsletter, pas de revente de données.</p>
      </div>
    </form>
  );
}
