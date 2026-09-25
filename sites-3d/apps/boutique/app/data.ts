// Catalogue Studio Oblique — données fictives (prix en centimes, TTC).

export type Vec3 = [number, number, number];
export type Variant = { id: string; name: string; swatch: string; c: Record<string, string> };
export type OptionChoice = { id: string; label: string; delta: number; note?: string };
export type ProductOption = { id: string; label: string; choices: OptionChoice[] };
export type Hotspot = { id: string; p: Vec3; title: string; text: string; exploded?: boolean; /** décalage suivi en vue éclatée (même valeur que la pièce) */ off?: Vec3 };
export type Review = { author: string; city: string; note: number; date: string; text: string };
export type Category = "Tech" | "Maison" | "Mobilier" | "Accessoires";

export type Product = {
  id: string;
  ref: string;
  name: string;
  category: Category;
  tagline: string;
  description: string;
  price: number;
  stock: number;
  rating: number;
  reviewCount: number;
  variants: Variant[];
  options: ProductOption[];
  specs: [string, string][];
  hotspots: Hotspot[];
  explode: boolean;
  cam: { pos: Vec3; target: Vec3; fov: number };
  card: { pos: Vec3; target: Vec3; fov: number };
  reviews: Review[];
  badge?: string;
};

export const CATEGORIES: Category[] = ["Tech", "Maison", "Mobilier", "Accessoires"];

export const PRODUCTS: Product[] = [
  {
    id: "cadence",
    ref: "OB-101",
    name: "Cadence S2",
    category: "Tech",
    tagline: "Montre GPS multisport, boîtier 47 mm",
    description:
      "Écran AMOLED toujours allumé, GPS bi-fréquence L1 + L5 et cardio optique 5 LED. Jusqu'à 14 jours en mode montre, 38 h en GPS continu. Kit de développement ouvert : vos cadrans et champs de données s'installent en quelques lignes de code.",
    price: 34900,
    stock: 23,
    rating: 4.7,
    reviewCount: 212,
    badge: "Nouveau",
    variants: [
      { id: "cobalt", name: "Cobalt", swatch: "#2340E0", c: { strap: "#2340E0", accent: "#5B7CFF" } },
      { id: "signal", name: "Signal", swatch: "#FF5A36", c: { strap: "#F0512E", accent: "#FF7A57" } },
      { id: "graphite", name: "Graphite", swatch: "#2A2D32", c: { strap: "#26292E", accent: "#C9CCD1" } },
      { id: "sauge", name: "Sauge", swatch: "#8FA89A", c: { strap: "#8FA89A", accent: "#B7E0C8" } },
    ],
    options: [
      {
        id: "boitier",
        label: "Boîtier",
        choices: [
          { id: "alu", label: "Aluminium", delta: 0, note: "anodisé, 44 g" },
          { id: "titane", label: "Titane grade 5", delta: 8000, note: "brossé, 39 g" },
        ],
      },
      {
        id: "taille",
        label: "Taille du bracelet",
        choices: [
          { id: "s", label: "S · 125–175 mm", delta: 0 },
          { id: "m", label: "M · 140–195 mm", delta: 0 },
          { id: "l", label: "L · 155–215 mm", delta: 0 },
        ],
      },
    ],
    specs: [
      ["Boîtier", "Ø 47 × 13,2 mm"],
      ["Écran", "AMOLED 1,4″ · 454 × 454 px"],
      ["Étanchéité", "5 ATM · natation en piscine"],
      ["Autonomie", "14 j montre · 38 h GPS"],
      ["Capteurs", "GPS L1+L5, cardio 5 LED, SpO₂, baromètre"],
      ["Bracelet", "FKM 22 mm, dégagement rapide"],
    ],
    hotspots: [
      { id: "ecran", p: [-0.33, 0.5, 0.13], off: [0, 0, 0.25], title: "Écran AMOLED 1,4″", text: "454 × 454 px, 1 000 cd/m² en plein soleil, verre saphir bombé." },
      { id: "start", p: [0.47, 0.98, -0.02], off: [0.138, 0.08, 0], title: "Bouton Start / Stop", text: "Retour haptique, bague acier 316L, repère couleur." },
      { id: "lunette", p: [-0.38, 1.02, 0.13], off: [0, 0, 0.46], title: "Lunette graduée", text: "Graduation 60 min gravée au laser, finition du boîtier." },
      { id: "capteur", p: [0, 0.7, -0.2], off: [0, 0, -0.44], title: "Capteur optique", text: "5 LED vertes + 2 rouges, 8 photodiodes en couronne.", exploded: true },
      { id: "batterie", p: [0.28, 0.7, -0.08], off: [0, 0, -0.28], title: "Batterie 470 mAh", text: "Li-ion polymère, charge 0–80 % en 55 min.", exploded: true },
    ],
    explode: true,
    cam: { pos: [1.6, 1.25, 2.6], target: [0, 0.66, -0.25], fov: 32 },
    card: { pos: [1.5, 1.2, 2.55], target: [0, 0.62, -0.42], fov: 34 },
    reviews: [
      { author: "Camille R.", city: "Annecy", note: 5, date: "août 2026", text: "Trace GPS propre même sous les arbres, le bi-fréquence fait vraiment la différence en trail." },
      { author: "Yanis B.", city: "Nantes", note: 5, date: "juillet 2026", text: "J'ai codé mon propre champ de données (allure ajustée au dénivelé) en une soirée." },
      { author: "Hélène M.", city: "Lille", note: 4, date: "juin 2026", text: "Autonomie conforme : 11 jours avec 4 sorties GPS. Bracelet un peu raide au début." },
    ],
  },
  {
    id: "aria",
    ref: "OB-114",
    name: "Aria",
    category: "Tech",
    tagline: "Casque circum-aural à réduction de bruit",
    description:
      "Transducteurs de 40 mm en bio-cellulose, réduction de bruit hybride à 6 micros et arceau en acier à ressort gainé. 42 h d'écoute ANC actif, charge rapide : 10 min pour 6 h.",
    price: 28900,
    stock: 41,
    rating: 4.6,
    reviewCount: 158,
    variants: [
      { id: "minuit", name: "Minuit", swatch: "#1D2433", c: { shell: "#1D2433", band: "#141922", cushion: "#252C3A", metal: "#B8925A" } },
      { id: "brume", name: "Brume", swatch: "#CFD3D6", c: { shell: "#D3D6D8", band: "#A9AEB3", cushion: "#E6E7E8", metal: "#9A9EA3" } },
      { id: "olive", name: "Olive", swatch: "#5B6148", c: { shell: "#5B6148", band: "#3E4333", cushion: "#6C7257", metal: "#B8925A" } },
    ],
    options: [
      {
        id: "coussinets",
        label: "Coussinets",
        choices: [
          { id: "protein", label: "Similicuir protéiné", delta: 0 },
          { id: "velours", label: "Velours côtelé", delta: 1900 },
        ],
      },
    ],
    specs: [
      ["Transducteurs", "40 mm, membrane bio-cellulose"],
      ["Réponse", "5 Hz – 40 kHz"],
      ["Réduction de bruit", "Hybride, 6 micros, −38 dB"],
      ["Autonomie", "42 h ANC actif · 60 h sans"],
      ["Connectique", "Bluetooth 5.4, LE Audio, USB-C"],
      ["Poids", "262 g"],
    ],
    hotspots: [
      { id: "arceau", p: [0, 1.6, 0.05], off: [0, 0.34, 0], title: "Arceau acier à ressort", text: "Gainé de TPU, pression 4,2 N sur les tempes." },
      { id: "coque", p: [0.8, 0.46, 0.12], off: [0.42, 0, 0], title: "Coque tactile", text: "Glisser pour le volume, double tap pour l'ANC." },
      { id: "coussin", p: [-0.44, 0.3, 0.2], off: [0.04, 0, 0], title: "Coussinets à mémoire", text: "Mousse viscoélastique 18 mm, aimantés, remplaçables." },
      { id: "driver", p: [0.54, 0.46, 0.0], off: [0.2, 0, 0], title: "Transducteur 40 mm", text: "Aimant néodyme, distorsion < 0,1 % à 94 dB.", exploded: true },
    ],
    explode: true,
    cam: { pos: [1.5, 1.35, 3.4], target: [0, 0.8, 0], fov: 32 },
    card: { pos: [1.2, 1.2, 3.0], target: [0, 0.8, 0], fov: 34 },
    reviews: [
      { author: "Louis D.", city: "Rennes", note: 5, date: "août 2026", text: "Le TGV Paris–Rennes devient silencieux. Tient 3 allers-retours sans recharge." },
      { author: "Sofia K.", city: "Paris", note: 4, date: "juillet 2026", text: "Scène large, basses tenues. Les coussinets velours valent le supplément l'été." },
    ],
  },
  {
    id: "orbe",
    ref: "OB-122",
    name: "Orbe 360",
    category: "Tech",
    tagline: "Enceinte Wi-Fi & Bluetooth, son à 360°",
    description:
      "Trois médiums de 50 mm orientés à 120° et un haut-parleur de grave de 100 mm vers le bas : le son remplit la pièce, où que vous posiez l'enceinte. Tissu recyclé déperlant, IP67.",
    price: 19900,
    stock: 7,
    rating: 4.5,
    reviewCount: 96,
    variants: [
      { id: "ardoise", name: "Ardoise", swatch: "#3A3F46", c: { fabric: "#3A3F46", cap: "#C9CCD1", led: "#8FB0FF" } },
      { id: "lin", name: "Lin", swatch: "#CDC6B8", c: { fabric: "#CFC8BA", cap: "#E7E6E1", led: "#FFB38A" } },
      { id: "cobalt", name: "Cobalt", swatch: "#2340E0", c: { fabric: "#2A45D8", cap: "#C9CCD1", led: "#9FC0FF" } },
      { id: "signal", name: "Signal", swatch: "#FF5A36", c: { fabric: "#F2552F", cap: "#2A2D32", led: "#FFD0B8" } },
    ],
    options: [
      {
        id: "socle",
        label: "Socle",
        choices: [
          { id: "sans", label: "Sans socle", delta: 0 },
          { id: "charge", label: "Socle de charge", delta: 2900, note: "induction 15 W" },
        ],
      },
    ],
    specs: [
      ["Haut-parleurs", "3 × 50 mm + grave 100 mm"],
      ["Puissance", "60 W RMS"],
      ["Autonomie", "18 h à 50 % du volume"],
      ["Protection", "IP67, flotte"],
      ["Dimensions", "Ø 96 × 186 mm · 1,1 kg"],
      ["Réseau", "Wi-Fi 6, Bluetooth 5.3, multiroom"],
    ],
    hotspots: [
      { id: "molette", p: [0.0, 1.2, 0.14], off: [0, 0.84, 0], title: "Couronne de volume", text: "Aluminium moleté, 36 crans, anneau LED d'état." },
      { id: "tissu", p: [0.42, 0.62, 0.1], off: [0, 0.5, 0], title: "Tissu recyclé", text: "Maille 3D en PET recyclé, traitement déperlant." },
      { id: "medium", p: [0.165, 0.74, 0.303], off: [0.144, 0.5, 0.263], title: "Médiums 50 mm", text: "Trois voies à 120°, membranes aluminium.", exploded: true },
      { id: "grave", p: [0.17, 0.13, 0.17], off: [0, 0.2, 0], title: "Grave 100 mm", text: "Longue excursion (± 9 mm), orienté vers le sol : le socle sert de pavillon.", exploded: true },
    ],
    explode: true,
    cam: { pos: [1.7, 1.5, 3.0], target: [0, 0.62, 0], fov: 32 },
    card: { pos: [1.4, 1.3, 2.6], target: [0, 0.6, 0], fov: 34 },
    reviews: [
      { author: "Marc T.", city: "Bordeaux", note: 5, date: "août 2026", text: "Tombée dans la piscine, repêchée, joue toujours. Le grave surprend pour la taille." },
      { author: "Inès P.", city: "Lyon", note: 4, date: "juin 2026", text: "Multiroom stable avec deux Orbe. L'appli pourrait proposer un égaliseur plus fin." },
    ],
  },
  {
    id: "bras",
    ref: "OB-207",
    name: "Bras L-1",
    category: "Maison",
    tagline: "Lampe de bureau articulée à ressorts",
    description:
      "Deux bras en acier équilibrés par ressorts de traction : la tête reste là où vous la posez, sans vis de serrage. LED 8 W à IRC 95 pour lire les couleurs justes, variateur tactile sur la tête.",
    price: 16900,
    stock: 18,
    rating: 4.8,
    reviewCount: 74,
    variants: [
      { id: "cobalt", name: "Cobalt", swatch: "#2340E0", c: { body: "#142CC4", joint: "#1A1D22" } },
      { id: "craie", name: "Blanc craie", swatch: "#E8E8E3", c: { body: "#E4E4DE", joint: "#9A9EA3" } },
      { id: "noir", name: "Noir mat", swatch: "#1C1E21", c: { body: "#1E2023", joint: "#B8925A" } },
      { id: "signal", name: "Signal", swatch: "#FF5A36", c: { body: "#F2552F", joint: "#1A1D22" } },
    ],
    options: [
      {
        id: "temp",
        label: "Température de couleur",
        choices: [
          { id: "2700", label: "2 700 K · chaud", delta: 0 },
          { id: "4000", label: "4 000 K · neutre", delta: 0 },
        ],
      },
    ],
    specs: [
      ["Hauteur max.", "62 cm · portée 48 cm"],
      ["Source", "LED 8 W, 700 lm, IRC 95"],
      ["Variateur", "Tactile, 4 niveaux"],
      ["Base", "Acier Ø 18 cm, 2,3 kg"],
      ["Câble", "Textile 2 m, interrupteur au pied"],
    ],
    hotspots: [
      { id: "ressort", p: [0.02, 0.5, 0.06], title: "Ressorts de traction", text: "Acier trempé, équilibrage réglé en atelier." },
      { id: "tete", p: [0.62, 1.25, 0.12], title: "Tête orientable", text: "Rotule 270°, variateur tactile sur le dessus." },
      { id: "base", p: [0.25, 0.08, 0.3], title: "Base lestée", text: "Acier 2,3 kg, feutre anti-rayures en dessous." },
    ],
    explode: false,
    cam: { pos: [1.4, 1.2, 3.3], target: [0.22, 0.62, 0], fov: 32 },
    card: { pos: [1.1, 1.1, 2.9], target: [0.22, 0.62, 0], fov: 34 },
    reviews: [
      { author: "Nathalie G.", city: "Grenoble", note: 5, date: "juillet 2026", text: "Enfin une lampe d'architecte qui ne retombe pas. Lumière 4 000 K parfaite pour le dessin." },
      { author: "Tom V.", city: "Strasbourg", note: 5, date: "mai 2026", text: "Base lourde, rien ne bouge. Le cobalt est plus profond qu'en photo." },
    ],
  },
  {
    id: "pli",
    ref: "OB-310",
    name: "Pli",
    category: "Mobilier",
    tagline: "Chaise en contreplaqué moulé",
    description:
      "Une seule feuille de contreplaqué 9 plis, moulée à chaud en une coque continue de l'assise au dossier. Le pli arrière travaille comme un ressort : le dossier accompagne le dos sans mécanisme.",
    price: 42000,
    stock: 12,
    rating: 4.7,
    reviewCount: 63,
    variants: [
      { id: "chene", name: "Chêne naturel", swatch: "#C9A27C", c: { wood: "#C9A27C" } },
      { id: "noyer", name: "Noyer", swatch: "#6E4B35", c: { wood: "#74503A" } },
      { id: "frene", name: "Frêne noirci", swatch: "#2B2724", c: { wood: "#2E2A27" } },
      { id: "laque", name: "Laque cobalt", swatch: "#2340E0", c: { wood: "#2340E0", lacquer: "1" } },
    ],
    options: [
      {
        id: "pied",
        label: "Piètement",
        choices: [
          { id: "bois", label: "Bois massif", delta: 0 },
          { id: "acier", label: "Acier thermolaqué", delta: 3000 },
        ],
      },
    ],
    specs: [
      ["Coque", "Contreplaqué 9 plis, placage 0,6 mm"],
      ["Dimensions", "L 50 × P 54 × H 81 cm"],
      ["Hauteur d'assise", "45 cm"],
      ["Poids", "5,4 kg"],
      ["Finition", "Vernis à l'eau, mat"],
      ["Essai", "EN 16139, 150 kg"],
    ],
    hotspots: [
      { id: "pli", p: [0.0, 0.52, -0.36], title: "Le pli", text: "Rayon 42 mm, travaille comme un ressort de 6 mm de débattement." },
      { id: "chant", p: [0.46, 0.47, 0.25], title: "Chants apparents", text: "Les 9 plis sont poncés et laissés visibles." },
      { id: "pied", p: [0.4, 0.15, 0.36], title: "Pieds fuselés", text: "Ø 28 → 20 mm, patins feutre." },
    ],
    explode: false,
    cam: { pos: [1.9, 1.3, 2.6], target: [0, 0.48, 0], fov: 32 },
    card: { pos: [1.6, 1.15, 2.3], target: [0, 0.46, 0], fov: 34 },
    reviews: [
      { author: "Pauline L.", city: "Montpellier", note: 5, date: "août 2026", text: "Confortable plus longtemps que prévu sans coussin, le dossier fléchit juste ce qu'il faut." },
      { author: "Antoine F.", city: "Tours", note: 4, date: "avril 2026", text: "Très belle en noyer. Livraison en caisse bois, montage des pieds en 10 min." },
    ],
  },
  {
    id: "galet",
    ref: "OB-221",
    name: "Galet",
    category: "Maison",
    tagline: "Vase en grès émaillé, tourné main",
    description:
      "Grès chamotté tourné à Villeurbanne, cuit à 1 280 °C en réduction. Chaque pièce porte les lignes de tournage et un moucheté de fer propre à sa cuisson : aucune n'est identique.",
    price: 8900,
    stock: 30,
    rating: 4.9,
    reviewCount: 41,
    variants: [
      { id: "celadon", name: "Céladon", swatch: "#9FB8AD", c: { glaze: "#9FB8AD" } },
      { id: "encre", name: "Encre", swatch: "#1F2A44", c: { glaze: "#1F2A44" } },
      { id: "sable", name: "Sable", swatch: "#D8C7A8", c: { glaze: "#D8C7A8" } },
      { id: "brume", name: "Brume", swatch: "#C4C9D2", c: { glaze: "#C4C9D2" } },
    ],
    options: [
      {
        id: "taille",
        label: "Format",
        choices: [
          { id: "moyen", label: "Moyen · H 24 cm", delta: 0 },
          { id: "grand", label: "Grand · H 32 cm", delta: 3000 },
        ],
      },
    ],
    specs: [
      ["Matière", "Grès chamotté, émail satiné"],
      ["Cuisson", "1 280 °C, réduction"],
      ["Dimensions", "Ø 17 × H 24 cm (moyen)"],
      ["Poids", "1,3 kg"],
      ["Entretien", "Intérieur étanche, lavage à la main"],
    ],
    hotspots: [
      { id: "lignes", p: [0.36, 0.42, 0.1], title: "Lignes de tournage", text: "Laissées volontairement, relief de 0,3 mm." },
      { id: "col", p: [0.0, 0.98, 0.16], title: "Col resserré", text: "Ø 5 cm, tient trois tiges sans pique-fleurs." },
    ],
    explode: false,
    cam: { pos: [1.5, 1.2, 2.7], target: [0, 0.5, 0], fov: 32 },
    card: { pos: [1.2, 1.05, 2.3], target: [0, 0.5, 0], fov: 34 },
    reviews: [
      { author: "Claire A.", city: "Dijon", note: 5, date: "juillet 2026", text: "Le céladon change selon la lumière de la journée. Moucheté superbe." },
    ],
  },
  {
    id: "brume",
    ref: "OB-405",
    name: "Brume N°3",
    category: "Accessoires",
    tagline: "Eau de parfum, flacon en verre épais",
    description:
      "Concentration 18 %, composée et macérée six semaines à Grasse. Flacon en verre extra-blanc de 8 mm, bouchon aimanté en zamak : le flacon se recharge en 30 secondes.",
    price: 7800,
    stock: 55,
    rating: 4.4,
    reviewCount: 129,
    variants: [
      { id: "vetiver", name: "Vétiver fumé", swatch: "#B98A3E", c: { liquid: "#B98A3E", cap: "#1E2023" } },
      { id: "figue", name: "Figue verte", swatch: "#8D9A4F", c: { liquid: "#8D9A4F", cap: "#B8925A" } },
      { id: "iris", name: "Iris poudré", swatch: "#D7B9C6", c: { liquid: "#D9B6C4", cap: "#E4E4DE" } },
    ],
    options: [
      {
        id: "ml",
        label: "Contenance",
        choices: [
          { id: "50", label: "50 ml", delta: 0 },
          { id: "100", label: "100 ml", delta: 4200 },
        ],
      },
    ],
    specs: [
      ["Concentration", "Eau de parfum, 18 %"],
      ["Flacon", "Verre extra-blanc 8 mm, rechargeable"],
      ["Bouchon", "Zamak aimanté, 92 g"],
      ["Tenue", "7 à 9 h sur peau"],
      ["Origine", "Composé et macéré à Grasse"],
    ],
    hotspots: [
      { id: "verre", p: [0.3, 0.5, 0.17], title: "Verre extra-blanc", text: "8 mm d'épaisseur, fond lesté de 14 mm." },
      { id: "bouchon", p: [0.0, 1.12, 0.15], title: "Bouchon aimanté", text: "Zamak moulé, ferme sans visser." },
    ],
    explode: false,
    cam: { pos: [1.2, 1.1, 2.6], target: [0, 0.55, 0], fov: 30 },
    card: { pos: [1.0, 1.0, 2.25], target: [0, 0.55, 0], fov: 32 },
    reviews: [
      { author: "Élise N.", city: "Nice", note: 5, date: "août 2026", text: "Vétiver sec, fumé sans être lourd. Le flacon est une petite sculpture." },
      { author: "Julien C.", city: "Toulouse", note: 4, date: "juin 2026", text: "Tenue correcte, 7 h environ. Recharge très pratique." },
    ],
  },
  {
    id: "axe",
    ref: "OB-412",
    name: "Axe",
    category: "Accessoires",
    tagline: "Monture en acétate, verres minéraux",
    description:
      "Acétate de cellulose découpé dans la plaque puis poli au tonneau pendant 72 h. Charnières à 5 barillets rivetées, verres minéraux catégorie 3 ou filtre lumière bleue pour l'écran.",
    price: 14500,
    stock: 26,
    rating: 4.6,
    reviewCount: 88,
    variants: [
      { id: "ecaille", name: "Écaille", swatch: "#6B3F1F", c: { frame: "#FFFFFF", tex: "ecaille" } },
      { id: "noir", name: "Noir", swatch: "#141518", c: { frame: "#141518" } },
      { id: "cristal", name: "Cristal", swatch: "#D6DCE0", c: { frame: "#DDE3E8", clear: "1" } },
      { id: "cobalt", name: "Cobalt", swatch: "#2340E0", c: { frame: "#2340E0" } },
    ],
    options: [
      {
        id: "verres",
        label: "Verres",
        choices: [
          { id: "solaire", label: "Solaires cat. 3", delta: 0 },
          { id: "bleue", label: "Filtre lumière bleue", delta: 1000 },
        ],
      },
    ],
    specs: [
      ["Monture", "Acétate de cellulose, poli 72 h"],
      ["Calibre", "50 □ 21 – 145"],
      ["Charnières", "5 barillets, rivetées"],
      ["Verres", "Minéraux, UV400"],
      ["Poids", "24 g"],
    ],
    hotspots: [
      { id: "charniere", p: [0.62, 0.34, 0.2], title: "Charnière 5 barillets", text: "Rivetée à travers la face, aucune vis apparente." },
      { id: "verre", p: [-0.3, 0.24, 0.3], title: "Verre minéral", text: "Catégorie 3, UV400, traitement antireflet arrière." },
    ],
    explode: false,
    cam: { pos: [1.5, 1.1, 2.4], target: [0, 0.22, -0.1], fov: 30 },
    card: { pos: [1.3, 1.0, 2.2], target: [0, 0.22, -0.1], fov: 32 },
    reviews: [
      { author: "Mehdi S.", city: "Marseille", note: 5, date: "juillet 2026", text: "L'écaille est profonde, avec des nuances miel. Ajustées gratuitement chez un opticien." },
    ],
  },
  {
    id: "fil",
    ref: "OB-230",
    name: "Fil",
    category: "Maison",
    tagline: "Mug en grès, émail réactif",
    description:
      "Grès cuit à haute température, émail réactif qui s'éclaircit sur les arêtes. Pied brut poncé pour ne pas rayer la table, anse calibrée pour trois doigts.",
    price: 3200,
    stock: 64,
    rating: 4.8,
    reviewCount: 203,
    variants: [
      { id: "cobalt", name: "Cobalt profond", swatch: "#1E3AA8", c: { glaze: "#1E3AA8" } },
      { id: "blanc", name: "Blanc satiné", swatch: "#ECEBE6", c: { glaze: "#ECEBE6" } },
      { id: "tenmoku", name: "Tenmoku", swatch: "#3B2A22", c: { glaze: "#3B2A22" } },
      { id: "celadon", name: "Céladon", swatch: "#A7BFAE", c: { glaze: "#A7BFAE" } },
    ],
    options: [
      {
        id: "cl",
        label: "Contenance",
        choices: [
          { id: "25", label: "25 cl", delta: 0 },
          { id: "35", label: "35 cl", delta: 400 },
        ],
      },
    ],
    specs: [
      ["Contenance", "25 ou 35 cl"],
      ["Matière", "Grès, émail réactif"],
      ["Dimensions", "Ø 8,5 × H 9,5 cm (35 cl)"],
      ["Entretien", "Lave-vaisselle, micro-ondes"],
      ["Poids", "380 g"],
    ],
    hotspots: [
      { id: "anse", p: [0.56, 0.42, 0], title: "Anse trois doigts", text: "Section ovale de 12 mm, attache renforcée." },
      { id: "pied", p: [-0.3, 0.04, 0.2], title: "Pied brut", text: "Grès nu poncé au grain 400, ne raye pas." },
    ],
    explode: false,
    cam: { pos: [1.3, 1.25, 2.4], target: [0.06, 0.38, 0], fov: 30 },
    card: { pos: [1.1, 1.1, 2.1], target: [0.06, 0.38, 0], fov: 32 },
    reviews: [
      { author: "Sarah H.", city: "Caen", note: 5, date: "août 2026", text: "Le cobalt s'éclaircit sur le bord, exactement comme sur la fiche. Tient bien chaud." },
      { author: "Bastien O.", city: "Metz", note: 5, date: "mai 2026", text: "Acheté deux, puis quatre. L'anse est vraiment confortable." },
    ],
  },
];

export const byId = (id: string) => PRODUCTS.find((p) => p.id === id);

export const FREE_SHIPPING = 8000;
export const SHIPPING_COST = 590;
export const EXPRESS_COST = 990;
export const PROMO_CODE = "BIENVENUE10";

export function defaultOptions(p: Product): Record<string, string> {
  const o: Record<string, string> = {};
  for (const opt of p.options) o[opt.id] = opt.id === "taille" && p.id === "cadence" ? "m" : opt.choices[0].id;
  return o;
}

export function unitPrice(p: Product, opts: Record<string, string>) {
  let v = p.price;
  for (const opt of p.options) {
    const c = opt.choices.find((x) => x.id === opts[opt.id]);
    if (c) v += c.delta;
  }
  return v;
}

const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const euros = (cents: number) => fmt.format(cents / 100);
