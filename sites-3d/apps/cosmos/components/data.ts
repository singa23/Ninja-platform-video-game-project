// Données physiques : NASA Planetary Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet).
// Éléments orbitaux : JPL « Approximate Positions of the Planets », table 1 (1800–2050),
// valeurs à J2000 et dérivées par siècle julien.

export type Elements = {
  a: [number, number]; // UA, UA/siècle
  e: [number, number];
  I: [number, number]; // degrés
  L: [number, number]; // longitude moyenne
  w: [number, number]; // longitude du périhélie ϖ
  O: [number, number]; // longitude du nœud ascendant Ω
};

export type Planet = {
  id: string;
  name: string;
  /** complément du nom : « de la Terre », « d’Uranus »… */
  of: string;
  kind: string;
  radiusKm: number;
  distanceAU: number;
  periodDays: number;
  rotationHours: number; // négatif = rétrograde
  moons: number;
  gravity: number; // m/s²
  tempC: number;
  tiltDeg: number;
  massE24: number;
  escapeKms: number;
  orbitalKms: number;
  color: string; // teinte d'interface
  blurb: string;
  fact: string;
  el: Elements;
};

export const PLANETS: Planet[] = [
  {
    id: "mercure", name: "Mercure", of: "de Mercure", kind: "Planète tellurique",
    radiusKm: 2439.7, distanceAU: 0.387, periodDays: 88.0, rotationHours: 1407.6, moons: 0,
    gravity: 3.7, tempC: 167, tiltDeg: 0.034, massE24: 0.33, escapeKms: 4.3, orbitalKms: 47.4,
    color: "#A9A39A",
    blurb: "Noyau de fer surdimensionné (≈ 85 % du rayon), surface criblée de cratères et presque pas d’atmosphère : l’écart thermique va de −180 °C la nuit à 430 °C au zénith.",
    fact: "Résonance spin-orbite 3:2 — trois rotations sidérales pour deux révolutions.",
    el: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.2503235, 149472.67411175], w: [77.45779628, 0.16047689], O: [48.33076593, -0.12534081] },
  },
  {
    id: "venus", name: "Vénus", of: "de Vénus", kind: "Planète tellurique",
    radiusKm: 6051.8, distanceAU: 0.723, periodDays: 224.7, rotationHours: -5832.5, moons: 0,
    gravity: 8.9, tempC: 464, tiltDeg: 177.4, massE24: 4.87, escapeKms: 10.4, orbitalKms: 35.0,
    color: "#E3C58A",
    blurb: "Atmosphère à 96,5 % de CO₂ et pression au sol de 92 bar : l’effet de serre emballé en fait la planète la plus chaude, sous un plafond permanent de nuages d’acide sulfurique.",
    fact: "Rotation rétrograde de 243 jours, plus longue que son année de 224,7 jours.",
    el: { a: [0.72333566, 0.0000039], e: [0.00677672, -0.00004107], I: [3.39467605, -0.0007889], L: [181.9790995, 58517.81538729], w: [131.60246718, 0.00268329], O: [76.67984255, -0.27769418] },
  },
  {
    id: "terre", name: "Terre", of: "de la Terre", kind: "Planète tellurique",
    radiusKm: 6371, distanceAU: 1.0, periodDays: 365.2, rotationHours: 23.9, moons: 1,
    gravity: 9.8, tempC: 15, tiltDeg: 23.4, massE24: 5.97, escapeKms: 11.2, orbitalKms: 29.8,
    color: "#7FB3E6",
    blurb: "Seul corps connu à abriter de l’eau liquide stable en surface (71 % du globe). Le champ magnétique généré par le noyau externe dévie le vent solaire.",
    fact: "La Lune stabilise l’inclinaison de l’axe autour de 23,4° (± 1,3° sur 41 000 ans).",
    el: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], O: [0, 0] },
  },
  {
    id: "mars", name: "Mars", of: "de Mars", kind: "Planète tellurique",
    radiusKm: 3389.5, distanceAU: 1.524, periodDays: 687.0, rotationHours: 24.6, moons: 2,
    gravity: 3.7, tempC: -65, tiltDeg: 25.2, massE24: 0.642, escapeKms: 5.0, orbitalKms: 24.1,
    color: "#D9774B",
    blurb: "Régolithe riche en oxydes de fer, calottes polaires de glace d’eau recouvertes l’hiver de CO₂ givré, et Olympus Mons, 21,9 km au-dessus du niveau de référence.",
    fact: "Pression au sol ≈ 6 mbar : moins de 1 % de celle de la Terre.",
    el: { a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], w: [-23.94362959, 0.44441088], O: [49.55953891, -0.29257343] },
  },
  {
    id: "jupiter", name: "Jupiter", of: "de Jupiter", kind: "Géante gazeuse",
    radiusKm: 69911, distanceAU: 5.204, periodDays: 4331, rotationHours: 9.9, moons: 95,
    gravity: 23.1, tempC: -110, tiltDeg: 3.1, massE24: 1898, escapeKms: 59.5, orbitalKms: 13.1,
    color: "#D8A77A",
    blurb: "2,5 fois la masse de toutes les autres planètes réunies. Ses bandes (zones claires ascendantes, ceintures sombres descendantes) sont cisaillées par des jets de 150 m/s.",
    fact: "La Grande Tache rouge, anticyclone observé depuis 1830 au moins, reste plus large que la Terre.",
    el: { a: [5.202887, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], w: [14.72847983, 0.21252668], O: [100.47390909, 0.20469106] },
  },
  {
    id: "saturne", name: "Saturne", of: "de Saturne", kind: "Géante gazeuse",
    radiusKm: 58232, distanceAU: 9.573, periodDays: 10747, rotationHours: 10.7, moons: 274,
    gravity: 9.0, tempC: -140, tiltDeg: 26.7, massE24: 568, escapeKms: 35.5, orbitalKms: 9.7,
    color: "#E6CF98",
    blurb: "Densité moyenne de 0,69 g/cm³, inférieure à celle de l’eau. Les anneaux s’étendent sur 280 000 km mais ne dépassent guère 10 à 100 m d’épaisseur.",
    fact: "La division de Cassini (≈ 4 700 km) est vidée par la résonance 2:1 avec la lune Mimas.",
    el: { a: [9.53667594, -0.0012506], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], w: [92.59887831, -0.41897216], O: [113.66242448, -0.28867794] },
  },
  {
    id: "uranus", name: "Uranus", of: "d’Uranus", kind: "Géante de glaces",
    radiusKm: 25362, distanceAU: 19.165, periodDays: 30589, rotationHours: -17.2, moons: 29,
    gravity: 8.7, tempC: -195, tiltDeg: 97.8, massE24: 86.8, escapeKms: 21.3, orbitalKms: 6.8,
    color: "#9ED6DA",
    blurb: "Couchée sur son orbite (97,8°) : chaque pôle vit 42 ans de jour puis 42 ans de nuit. Le méthane atmosphérique absorbe le rouge et lui donne sa teinte cyan.",
    fact: "Treize anneaux étroits et sombres, découverts en 1977 par occultation stellaire.",
    el: { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], I: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], w: [170.9542763, 0.40805281], O: [74.01692503, 0.04240589] },
  },
  {
    id: "neptune", name: "Neptune", of: "de Neptune", kind: "Géante de glaces",
    radiusKm: 24622, distanceAU: 30.181, periodDays: 59800, rotationHours: 16.1, moons: 16,
    gravity: 11.0, tempC: -200, tiltDeg: 28.3, massE24: 102, escapeKms: 23.5, orbitalKms: 5.4,
    color: "#5C7FE0",
    blurb: "Vents les plus rapides du système solaire, jusqu’à 2 100 km/h. Découverte en 1846 par le calcul (Le Verrier) avant d’être observée à Berlin par Galle.",
    fact: "Une révolution dure 164,8 ans : elle n’a bouclé sa première orbite depuis sa découverte qu’en 2011.",
    el: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], I: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], w: [44.96476227, -0.32241464], O: [131.78422574, -0.00508664] },
  },
];

export const EARTH_RADIUS_KM = 6371;
export const SUN_RADIUS_KM = 695700;
export const MOON = { radiusKm: 1737.4, distanceKm: 384400, periodDays: 27.32 };
export const AU_KM = 149597870.7;
export const MS_PER_DAY = 86400000;
export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

const rad = Math.PI / 180;

/** Position héliocentrique écliptique (UA) à `days` jours depuis J2000, convertie en repère three (Y = nord écliptique). */
export function heliocentric(el: Elements, days: number, out: [number, number, number] = [0, 0, 0]) {
  const T = days / 36525;
  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const I = (el.I[0] + el.I[1] * T) * rad;
  const L = el.L[0] + el.L[1] * T;
  const wbar = el.w[0] + el.w[1] * T;
  const O = (el.O[0] + el.O[1] * T) * rad;
  const w = wbar * rad - O;
  let M = ((L - wbar) % 360) * rad;
  if (M > Math.PI) M -= 2 * Math.PI;
  if (M < -Math.PI) M += 2 * Math.PI;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return orient(xp, yp, w, O, I, out);
}

function orient(xp: number, yp: number, w: number, O: number, I: number, out: [number, number, number]) {
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = sw * sI * xp + cw * sI * yp;
  out[0] = x; out[1] = z; out[2] = -y;
  return out;
}

/** Ellipse complète (UA) pour tracer l'orbite à la date donnée. */
export function orbitPoints(el: Elements, days: number, n = 256): Float32Array {
  const T = days / 36525;
  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const I = (el.I[0] + el.I[1] * T) * rad;
  const wbar = (el.w[0] + el.w[1] * T) * rad;
  const O = (el.O[0] + el.O[1] * T) * rad;
  const w = wbar - O;
  const pts = new Float32Array((n + 1) * 3);
  const tmp: [number, number, number] = [0, 0, 0];
  for (let i = 0; i <= n; i++) {
    const E = (i / n) * Math.PI * 2;
    orient(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), w, O, I, tmp);
    pts[i * 3] = tmp[0]; pts[i * 3 + 1] = tmp[1]; pts[i * 3 + 2] = tmp[2];
  }
  return pts;
}

export const SPEEDS = [
  { id: "1j", label: "1 j/s", short: "1 j", daysPerSec: 1 },
  { id: "1s", label: "1 sem/s", short: "1 sem", daysPerSec: 7 },
  { id: "1m", label: "1 mois/s", short: "1 mois", daysPerSec: 30.44 },
  { id: "1a", label: "1 an/s", short: "1 an", daysPerSec: 365.25 },
];

const fmt = (d: number, max = 2, min = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: max, minimumFractionDigits: min }).format(d);
export { fmt };

export function formatRotation(h: number) {
  const abs = Math.abs(h);
  const retro = h < 0 ? " (rétro.)" : "";
  if (abs > 72) return `${fmt(abs / 24, 1)} j${retro}`;
  return `${fmt(abs, 1)} h${retro}`;
}

export function formatDate(ms: number) {
  const d = new Date(ms);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}
