import Image from "next/image";
import SceneLayer from "@/components/SceneLayer";
import DojoSection from "@/components/DojoSection";
import CopyCommand from "@/components/CopyCommand";
import { Glyph, Hanko } from "@/components/Glyph";
import birdImg from "@/assets/bird.png";
import missileImg from "@/assets/missile.png";
import enemyImg from "@/assets/enemy.png";
import minoImg from "@/assets/minautor.png";
import fireImg from "@/assets/fire.png";
import logoImg from "@/assets/logo-ninja.png";

const BESTIAIRE = [
  {
    img: birdImg, name: "Oiseau-sentinelle", role: "Éclaireur", appear: "0 s",
    speed: "3 ← · 2 ↓ px/image", box: "100 × 100 px",
    note: "Plonge en diagonale depuis le coin haut droit, puis réapparaît à une hauteur tirée au hasard dans la moitié haute de l'écran.",
  },
  {
    img: missileImg, name: "Missile à tête d'acier", role: "Artillerie", appear: "0 s",
    speed: "3 px/image →", box: "100 × 100 px",
    note: "Traverse de gauche à droite à 400 px au-dessus du sol. Le piège : sauter au mauvais moment depuis la troisième plateforme.",
  },
  {
    img: enemyImg, name: "Oni rouge", role: "Chargeur", appear: "15 s",
    speed: "5 px/image ←", box: "70 × 100 px",
    note: "Le plus rapide du bestiaire, au ras du sol. Un saut suffit, mais il revient par la droite dès qu'il sort de l'écran.",
  },
  {
    img: minoImg, name: "Minotaure de l'empereur", role: "Garde lourd", appear: "30 s",
    speed: "2 px/image ←", box: "180 × 220 px",
    note: "Insautable depuis le sol : l'apex du saut plafonne à ≈ 205 px pour 220 px de corne à sabot. Passe par les plateformes.",
  },
  {
    img: fireImg, name: "Pluie de feu", role: "Châtiment", appear: "45 s",
    speed: "2 px/image ↓", box: "250 × 220 px",
    note: "Tombe du ciel en boucle et balaie un quart de la largeur du niveau. Lis sa colonne avant de t'engager sous elle.",
  },
];

export default function Page() {
  return (
    <>
      <SceneLayer />
      <a className="skip" href="#histoire">Aller au contenu</a>

      <header className="nav">
        <a className="brand" href="#top" aria-label="Ninjakoï, retour en haut">
          <Hanko size={34} />
          <span>Ninjakoï</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#histoire">Légende</a>
          <a href="#bestiaire">Bestiaire</a>
          <a href="#commandes">Commandes</a>
          <a href="#depot">Le jeu</a>
        </nav>
        <details className="menu">
          <summary aria-label="Menu des sections">Menu</summary>
          <nav aria-label="Sections (mobile)">
            <a href="#histoire">Légende</a>
            <a href="#bestiaire">Bestiaire</a>
            <a href="#commandes">Commandes</a>
            <a href="#dojo">Dojo</a>
            <a href="#depot">Le jeu</a>
          </nav>
        </details>
        <a className="btn btn-shu nav-play" href="#dojo-frame">Jouer</a>
      </header>

      <main>
        <section id="top" className="hero" data-cam>
          <div className="hero-copy">
            <p className="kicker">
              <span className="dot" aria-hidden /> Jeu de plateforme 2D · canvas HTML5 · JavaScript natif
            </p>
            <h1 className="title" aria-label="Ninjakoï">
              {"NINJAKOÏ".split("").map((c, i) => (
                <span key={i} style={{ animationDelay: `${0.15 + i * 0.06}s` }} aria-hidden>{c}</span>
              ))}
            </h1>
            <p className="lead">
              Un souffle, pas un bruit. Reprends les pièces anciennes que l&apos;empereur a volées au temple de Koï
              et traverse sa garde : oni, minotaure, missiles et pluie de feu.
            </p>
            <div className="cta-row">
              <a className="btn btn-shu" href="#dojo-frame">Entrer au dojo</a>
              <a className="btn btn-ghost" href="#histoire">Lire la légende</a>
            </div>
          </div>
          <dl className="hero-stats">
            <div><dt>Arène</dt><dd>1200 × 1200 px</dd></div>
            <div><dt>Cadence</dt><dd>60 i/s</dd></div>
            <div><dt>Ennemis</dt><dd>5 types</dd></div>
            <div><dt>Vies</dt><dd>1, pas deux</dd></div>
          </dl>
          <div className="scroll-cue" aria-hidden><span />défiler</div>
        </section>

        <section id="histoire" className="band band-left" data-cam>
          <div className="panel">
            <p className="eyebrow"><Glyph name="shinobi" size={22} stroke="var(--shu)" width={11} /> La légende</p>
            <h2>Les pièces de Koï ne dorment jamais</h2>
            <p className="serif">
              Pendant trois cents hivers, le temple de Koï a gardé les pièces anciennes de la vallée : des mon de bronze
              percés d&apos;un trou carré, frappés avant même que l&apos;empereur ait un nom.
            </p>
            <p>
              Une nuit de pleine lune, sa garde a vidé le temple et dispersé le trésor sur les toits et les passerelles
              du palais. Le dernier ninja du clan n&apos;a qu&apos;une consigne : tout reprendre, sans jamais être touché.
              Un seul contact avec un ennemi, et la partie est perdue.
            </p>
            <div className="timeline" role="list" aria-label="Chronologie d'une partie">
              <div role="listitem"><b>0 s</b><span>L&apos;oiseau-sentinelle plonge, le missile est déjà en vol.</span></div>
              <div role="listitem"><b>15 s</b><span>L&apos;oni rouge charge au sol. Sept pièces réapparaissent.</span></div>
              <div role="listitem"><b>30 s</b><span>Le minotaure de l&apos;empereur entre par la droite.</span></div>
              <div role="listitem"><b>45 s</b><span>La pluie de feu commence. Elle ne s&apos;arrête plus.</span></div>
            </div>
          </div>
        </section>

        <section id="bestiaire" className="band band-wide" data-cam>
          <div className="section-head">
            <p className="eyebrow">Bestiaire · la garde de l&apos;empereur</p>
            <h2>Cinq façons de perdre en une seconde</h2>
            <p className="muted">Valeurs relevées dans le code du jeu (index.js), à 60 images par seconde.</p>
          </div>
          <ul className="cards">
            {BESTIAIRE.map((b) => (
              <li key={b.name} className="card">
                <div className="card-art">
                  <Image src={b.img} alt={`Sprite du jeu : ${b.name}`} sizes="200px" style={{ objectFit: "contain" }} />
                </div>
                <p className="card-role">{b.role}</p>
                <h3>{b.name}</h3>
                <dl className="specs">
                  <div><dt>Entrée</dt><dd>{b.appear}</dd></div>
                  <div><dt>Vitesse</dt><dd>{b.speed}</dd></div>
                  <div><dt>Collision</dt><dd>{b.box}</dd></div>
                </dl>
                <p className="card-note">{b.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="commandes" className="band band-right" data-cam>
          <div className="panel">
            <p className="eyebrow">Commandes</p>
            <h2>Trois touches, zéro inertie</h2>
            <div className="keys" aria-hidden>
              <kbd className="key k-left">←</kbd>
              <kbd className="key k-right">→</kbd>
              <kbd className="key k-space">Espace</kbd>
            </div>
            <dl className="controls">
              <div>
                <dt><kbd>←</kbd> <kbd>→</kbd></dt>
                <dd>Déplacement de 6 px par image, soit 360 px/s. Relâcher la touche arrête le ninja net.</dd>
              </div>
              <div>
                <dt><kbd>Espace</kbd></dt>
                <dd>Impulsion de 13 px/image contre une gravité de 0,4 : apex ≈ 205 px, environ 1,1 s en l&apos;air. Uniquement depuis le sol ou une plateforme.</dd>
              </div>
              <div>
                <dt>Pièces</dt>
                <dd>+1 point chacune. Trois plateformes de 200 px, à 160, 260 et 360 px du sol.</dd>
              </div>
              <div>
                <dt>Dojo</dt>
                <dd>Clic ou toucher pour lancer un shuriken. Au clavier : <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> déplacent le réticule, <kbd>Espace</kbd> ou <kbd>Entrée</kbd> lance ; le tir s&apos;aimante sur la cible la plus proche.</dd>
              </div>
            </dl>
          </div>
        </section>

        <DojoSection />

        <section id="depot" className="band band-left depot" data-cam>
          <div className="panel">
            <p className="eyebrow">Le jeu complet</p>
            <h2>Tout est dans le dépôt GitHub</h2>
            <div className="depot-grid">
              <Image className="logo" src={logoImg} alt="Logo d'origine du jeu Ninjakoï : un ninja au sabre sur un écu" sizes="160px" />
              <div>
                <p>
                  Le jeu tient en trois fichiers et deux dossiers, sans dépendance ni étape de compilation.
                  Clone le dépôt, ouvre <code>index.html</code> dans un navigateur, clique sur « Start Game ».
                </p>
                <CopyCommand command="git clone https://github.com/singa23/Ninja-platform-video-game-project.git" />
                <ul className="tree" aria-label="Contenu du dépôt">
                  <li><code>index.html</code><span>écran titre, canvas, game over</span></li>
                  <li><code>index.js</code><span>687 lignes : physique, collisions, boucle</span></li>
                  <li><code>style.css</code><span>mise en page de l&apos;écran titre</span></li>
                  <li><code>images/</code><span>27 sprites et décors PNG</span></li>
                  <li><code>audio/</code><span>Cyberpunk.mp3, scream.ogg</span></li>
                </ul>
                <a className="btn btn-ghost" href="https://github.com/singa23/Ninja-platform-video-game-project">
                  Voir singa23/Ninja-platform-video-game-project
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <Hanko size={26} />
        <p>Ninjakoï · site vitrine 3D réalisé avec Next.js et Three.js. Sprites et sons issus du dépôt du jeu.</p>
      </footer>
    </>
  );
}
