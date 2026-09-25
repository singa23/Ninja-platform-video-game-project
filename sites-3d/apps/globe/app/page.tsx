import { BellRing, Hourglass, Leaf, FileStack, Layers, Truck, Database, FileCode, Landmark, Webhook, Braces, Sheet, MessagesSquare, KeyRound, ArrowRight } from "lucide-react";
import Nav from "../components/Nav";
import HeroGlobe from "../components/HeroGlobe";
import Dashboard from "../components/Dashboard";
import { Pricing, Faq, DemoForm } from "../components/Interactive";

function Coord({ c, place }: { c: string; place: string }) {
  return (
    <p className="coord mono">
      <span>{c}</span>
      <span className="coord-sep" aria-hidden="true" />
      <span>{place}</span>
    </p>
  );
}

const FEATURES = [
  { icon: <BellRing size={20} />, t: "Alertes d'exception", d: "Roulage, changement de navire, omission d'escale, retard au-delà de votre seuil : une alerte par événement, pas un rapport de 40 lignes." },
  { icon: <Hourglass size={20} />, t: "Surestaries et détention", d: "Jours francs restants par conteneur, calculés sur vos conditions contractuelles. Vous savez quelles boîtes enlever en premier." },
  { icon: <Leaf size={20} />, t: "CO₂ par conteneur", d: "Émissions du puits au sillage par tronçon, conformes GLEC et ISO 14083, exportables pour votre reporting CSRD." },
  { icon: <FileStack size={20} />, t: "Documents rattachés", d: "B/L, VGM, certificat d'origine, avis d'arrivée : rangés sous le bon numéro de conteneur, retrouvés en deux clics." },
  { icon: <Layers size={20} />, t: "Portail client", d: "Donnez à vos clients leur propre vue, à vos couleurs, limitée à leurs dossiers. Fini les « où en est mon conteneur ? »." },
];

const INTEGRATIONS = [
  { icon: <Truck size={18} />, t: "TMS", p: "API REST · webhooks", f: "temps réel" },
  { icon: <Database size={18} />, t: "ERP", p: "connecteur SFTP / API", f: "toutes les 15 min" },
  { icon: <FileCode size={18} />, t: "EDI armateurs", p: "EDIFACT IFTSTA, COPARN, IFTMIN", f: "à réception" },
  { icon: <Landmark size={18} />, t: "Guichets portuaires", p: "Cargo Community Systems", f: "toutes les 5 min" },
  { icon: <Webhook size={18} />, t: "Webhooks", p: "JSON signé HMAC", f: "< 2 s" },
  { icon: <Braces size={18} />, t: "API publique", p: "REST + OpenAPI 3.1", f: "600 req/min" },
  { icon: <Sheet size={18} />, t: "Tableurs", p: "import / export CSV, XLSX", f: "à la demande" },
  { icon: <MessagesSquare size={18} />, t: "Messageries d'équipe", p: "canaux d'alertes", f: "temps réel" },
  { icon: <KeyRound size={18} />, t: "Identité", p: "SSO SAML 2.0, OIDC", f: "—" },
];

export default function Page() {
  return (
    <>
      <a className="skip" href="#contenu">Aller au contenu</a>
      <Nav />
      <main id="top">
        {/* ------------------ HERO ------------------ */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <Coord c="49°29′N 000°06′E" place="Départ Le Havre" />
            <h1 id="hero-title">
              <span className="l1">Chaque conteneur,</span>
              <span className="l2">chaque escale,</span>
              <span className="l3">à l&apos;heure près.</span>
            </h1>
            <p className="lede">
              Sillage fusionne l&apos;AIS, les messages EDI des armateurs et vos balises IoT pour prédire l&apos;ETA de chaque conteneur à ±4 h,
              repérer les transbordements à risque et chiffrer le CO₂ de chaque traversée.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="#demo">Demander une démo <ArrowRight size={16} aria-hidden="true" /></a>
              <a className="btn btn-ghost" href="#passerelle">Voir le tableau de bord</a>
            </div>
            <dl className="hero-stats">
              <div><dt>navires suivis</dt><dd>14 212</dd></div>
              <div><dt>ports d&apos;escale</dt><dd>961</dd></div>
              <div><dt>latence AIS côtière</dt><dd>90 s</dd></div>
            </dl>
          </div>
          <HeroGlobe />
        </section>

        {/* ------------------ TABLEAU DE BORD ------------------ */}
        <section id="passerelle" className="section" aria-labelledby="dash-title">
          <span id="contenu" />
          <div className="section-head">
            <Coord c="01°16′N 103°50′E" place="Singapour, hub de transbordement" />
            <h2 id="dash-title">La passerelle, <em>pas le brouillard.</em></h2>
            <p className="section-lede">Une seule vue pour toutes vos boîtes, tous armateurs confondus. Les chiffres ci-dessous tournent en direct sur un compte de démonstration.</p>
          </div>
          <Dashboard />
        </section>

        {/* ------------------ FONCTIONNALITÉS ------------------ */}
        <section id="fonctions" className="section" aria-labelledby="feat-title">
          <div className="section-head">
            <Coord c="35°53′N 005°30′W" place="Tanger Med" />
            <h2 id="feat-title">Ce que vos tableurs <em>ne voient pas venir.</em></h2>
          </div>
          <div className="features">
            <article className="feature-main">
              <div>
                <h3>ETA prédictive, pas déclarative</h3>
                <p>
                  L&apos;ETA annoncée par l&apos;armateur est tenue à ±24 h dans moins d&apos;un cas sur deux. Sillage recalcule la vôtre toutes les 15 minutes
                  à partir de la vitesse fond réelle, de la congestion au port d&apos;escale et de la météo marine.
                </p>
              </div>
              <figure className="eta-fig">
                <svg viewBox="0 0 420 170" role="img" aria-label="Exemple : écart entre l'ETA armateur, l'ETA Sillage et l'arrivée réelle sur une traversée Shanghai – Le Havre">
                  <line x1="20" y1="140" x2="400" y2="140" className="axis" />
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <g key={i}>
                      <line x1={20 + i * 63} y1="136" x2={20 + i * 63} y2="144" className="axis" />
                      <text x={20 + i * 63} y="160" className="tick">J-{30 - i * 5}</text>
                    </g>
                  ))}
                  <path d="M20 40 L83 42 L146 46 L209 58 L272 70 L335 88 L400 104" className="l-carrier" />
                  <path d="M20 96 L83 104 L146 100 L209 108 L272 106 L335 110 L400 112" className="l-sillage" />
                  <line x1="20" y1="112" x2="400" y2="112" className="l-real" />
                  <text x="26" y="32" className="lab">ETA armateur</text>
                  <text x="26" y="88" className="lab lab-s">ETA Sillage</text>
                  <text x="300" y="128" className="lab">arrivée réelle</text>
                </svg>
                <figcaption className="tiny muted">Traversée type Shanghai → Le Havre, 34 jours. Écart à l&apos;arrivée réelle selon la date de prévision.</figcaption>
              </figure>
              <p className="feature-num"><b>±4 h</b><span>à J-3 sur 94 % des escales</span></p>
            </article>
            {FEATURES.map((f) => (
              <article className="feature" key={f.t}>
                <span className="feature-ico" aria-hidden="true">{f.icon}</span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------ INTÉGRATIONS ------------------ */}
        <section id="integrations" className="section integ" aria-labelledby="integ-title">
          <div className="section-head integ-head">
            <Coord c="51°57′N 004°03′E" place="Rotterdam" />
            <h2 id="integ-title">Branché sur vos outils, <em>pas l&apos;inverse.</em></h2>
            <p className="section-lede">Sillage lit ce que vous avez déjà. Aucune ressaisie de numéros de conteneur : vos B/L arrivent par EDI, fichier ou API, les statuts repartent vers vos systèmes.</p>
          </div>
          <div className="manifest" role="table" aria-label="Connecteurs disponibles">
            <div className="m-row m-head" role="row">
              <span role="columnheader">Connecteur</span>
              <span role="columnheader">Protocole</span>
              <span role="columnheader">Synchronisation</span>
            </div>
            {INTEGRATIONS.map((i) => (
              <div className="m-row" role="row" key={i.t}>
                <span role="cell" className="m-name"><i aria-hidden="true">{i.icon}</i>{i.t}</span>
                <span role="cell" className="muted">{i.p}</span>
                <span role="cell" className="mono">{i.f}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------ TARIFS ------------------ */}
        <section id="tarifs" className="section" aria-labelledby="tarifs-title">
          <div className="section-head">
            <Coord c="25°00′N 055°03′E" place="Jebel Ali" />
            <h2 id="tarifs-title">Un prix au conteneur suivi, <em>pas au siège.</em></h2>
          </div>
          <Pricing />
        </section>

        {/* ------------------ FAQ ------------------ */}
        <section id="faq" className="section faq-wrap" aria-labelledby="faq-title">
          <div className="section-head">
            <Coord c="23°57′S 046°18′W" place="Santos" />
            <h2 id="faq-title">Questions <em>de quai.</em></h2>
            <p className="section-lede">Celles que nous posent les responsables supply chain, les transitaires et les directions achats avant de signer.</p>
          </div>
          <Faq />
        </section>

        {/* ------------------ DÉMO ------------------ */}
        <section id="demo" className="section demo" aria-labelledby="demo-title">
          <div className="section-head">
            <Coord c="33°44′N 118°15′W" place="Arrivée Los Angeles" />
            <h2 id="demo-title">Suivez vos propres boîtes <em>dès la démo.</em></h2>
            <p className="section-lede">Envoyez-nous trois numéros de conteneur en cours d&apos;acheminement : nous vous montrons leur position, leur ETA prédite et leur bilan CO₂ en direct.</p>
            <ul className="demo-points">
              <li>30 minutes en visio, avec un ancien transitaire</li>
              <li>Essai de 30 jours sans carte bancaire</li>
              <li>Données hébergées dans l&apos;Union européenne</li>
            </ul>
          </div>
          <DemoForm />
        </section>
      </main>
      <footer className="footer">
        <div className="brand-foot">Sillage</div>
        <p className="tiny muted">Startup fictive créée pour une démonstration. Toutes les données affichées (ports, navires, conteneurs, indicateurs) sont des données de démonstration.</p>
        <p className="mono tiny muted">Nantes · Le Havre · Singapour</p>
      </footer>
    </>
  );
}
