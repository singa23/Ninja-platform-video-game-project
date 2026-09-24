// Données de démonstration — toutes fictives mais plausibles.

export type Port = {
  code: string; // UN/LOCODE
  name: string;
  country: string;
  lat: number;
  lon: number;
  teu: number; // EVP manutentionnés sur 12 mois glissants (démo)
  wait: number; // attente moyenne en rade, en heures
  berth: number; // taux d'occupation des postes à quai, %
  tracked: number; // conteneurs suivis par Sillage actuellement présents
  calls7: number; // escales prévues sur 7 jours
  dwell: number; // temps de séjour moyen conteneur import, jours
  trend: number[]; // attente en rade, 8 dernières semaines (h)
  next: { vessel: string; eta: string; from: string }[];
};

export const PORTS: Port[] = [
  { code: "FRLEH", name: "Le Havre", country: "France", lat: 49.48, lon: 0.11, teu: 3_020_000, wait: 9.5, berth: 71, tracked: 4_182, calls7: 38, dwell: 4.1, trend: [14, 12, 13, 11, 10, 11, 9, 9.5], next: [ { vessel: "Ondine Explorer", eta: "25/09 06:40", from: "Tanger Med" }, { vessel: "Kestrel Bay", eta: "25/09 19:10", from: "Rotterdam" }, { vessel: "Mistral Horizon", eta: "26/09 02:30", from: "New York" } ] },
  { code: "NLRTM", name: "Rotterdam", country: "Pays-Bas", lat: 51.97, lon: 4.02, teu: 13_450_000, wait: 21.3, berth: 88, tracked: 11_904, calls7: 112, dwell: 3.6, trend: [26, 28, 25, 24, 23, 22, 22, 21.3], next: [ { vessel: "Nordvik Tide", eta: "24/09 22:15", from: "Singapour" }, { vessel: "Aurore Borealis", eta: "25/09 04:00", from: "Tanger Med" }, { vessel: "Lys de Mer", eta: "25/09 11:45", from: "Le Havre" } ] },
  { code: "BEANR", name: "Anvers", country: "Belgique", lat: 51.25, lon: 4.4, teu: 12_510_000, wait: 17.8, berth: 84, tracked: 9_630, calls7: 97, dwell: 3.9, trend: [20, 21, 19, 19, 18, 18.5, 18, 17.8], next: [ { vessel: "Escaut Pioneer", eta: "25/09 01:30", from: "Shanghai" }, { vessel: "Bravo Meridian", eta: "25/09 13:20", from: "New York" }, { vessel: "Calypso Reach", eta: "26/09 08:05", from: "Santos" } ] },
  { code: "MAPTM", name: "Tanger Med", country: "Maroc", lat: 35.89, lon: -5.5, teu: 9_120_000, wait: 6.2, berth: 79, tracked: 7_418, calls7: 84, dwell: 2.4, trend: [8, 7.5, 7, 7.2, 6.8, 6.5, 6.4, 6.2], next: [ { vessel: "Atlas Current", eta: "24/09 23:50", from: "Port-Saïd" }, { vessel: "Ondine Explorer", eta: "25/09 07:00", from: "Santos" }, { vessel: "Sirocco Line", eta: "25/09 15:35", from: "Anvers" } ] },
  { code: "EGPSD", name: "Port-Saïd", country: "Égypte", lat: 31.26, lon: 32.3, teu: 3_900_000, wait: 14.0, berth: 66, tracked: 2_107, calls7: 41, dwell: 3.1, trend: [19, 18, 17, 16, 16, 15, 14.5, 14], next: [ { vessel: "Nil Sentinel", eta: "25/09 03:10", from: "Jebel Ali" }, { vessel: "Atlas Current", eta: "25/09 18:25", from: "Singapour" }, { vessel: "Levant Arrow", eta: "26/09 05:40", from: "Tanger Med" } ] },
  { code: "AEJEA", name: "Jebel Ali", country: "Émirats arabes unis", lat: 25.01, lon: 55.06, teu: 14_720_000, wait: 8.7, berth: 82, tracked: 8_266, calls7: 91, dwell: 2.9, trend: [11, 10, 10.5, 9.8, 9.4, 9.1, 8.9, 8.7], next: [ { vessel: "Dune Voyager", eta: "25/09 00:20", from: "Colombo" }, { vessel: "Pearl Monsoon", eta: "25/09 09:55", from: "Shanghai" }, { vessel: "Nil Sentinel", eta: "25/09 21:00", from: "Port-Saïd" } ] },
  { code: "LKCMB", name: "Colombo", country: "Sri Lanka", lat: 6.95, lon: 79.84, teu: 7_250_000, wait: 11.4, berth: 77, tracked: 3_588, calls7: 63, dwell: 2.2, trend: [9, 9.5, 10, 10.8, 11, 11.6, 11.2, 11.4], next: [ { vessel: "Serendib Star", eta: "25/09 05:45", from: "Singapour" }, { vessel: "Dune Voyager", eta: "25/09 14:30", from: "Jebel Ali" }, { vessel: "Monsoon Crest", eta: "26/09 01:15", from: "Durban" } ] },
  { code: "SGSIN", name: "Singapour", country: "Singapour", lat: 1.26, lon: 103.84, teu: 39_010_000, wait: 18.9, berth: 91, tracked: 21_340, calls7: 246, dwell: 2.7, trend: [31, 29, 27, 25, 23, 21, 20, 18.9], next: [ { vessel: "Merlion Spirit", eta: "24/09 21:40", from: "Busan" }, { vessel: "Nordvik Tide", eta: "25/09 02:05", from: "Colombo" }, { vessel: "Straits Harmony", eta: "25/09 08:50", from: "Shanghai" } ] },
  { code: "CNSHA", name: "Shanghai", country: "Chine", lat: 30.63, lon: 122.07, teu: 49_160_000, wait: 24.6, berth: 93, tracked: 26_912, calls7: 301, dwell: 3.3, trend: [30, 29, 28, 27.5, 26, 25.4, 25, 24.6], next: [ { vessel: "Yangshan Dawn", eta: "24/09 20:30", from: "Busan" }, { vessel: "Pacific Loom", eta: "25/09 03:25", from: "Los Angeles" }, { vessel: "Escaut Pioneer", eta: "25/09 16:10", from: "Singapour" } ] },
  { code: "KRPUS", name: "Busan", country: "Corée du Sud", lat: 35.08, lon: 128.83, teu: 24_400_000, wait: 7.9, berth: 80, tracked: 12_755, calls7: 158, dwell: 2.5, trend: [9, 8.8, 8.5, 8.4, 8.1, 8, 8.1, 7.9], next: [ { vessel: "Hanbit Carrier", eta: "25/09 01:00", from: "Shanghai" }, { vessel: "Kuroshio Link", eta: "25/09 12:40", from: "Los Angeles" }, { vessel: "Merlion Spirit", eta: "26/09 04:20", from: "Singapour" } ] },
  { code: "USLAX", name: "Los Angeles", country: "États-Unis", lat: 33.74, lon: -118.26, teu: 9_910_000, wait: 13.2, berth: 74, tracked: 6_904, calls7: 52, dwell: 4.8, trend: [15, 14.6, 14, 13.8, 13.9, 13.5, 13.4, 13.2], next: [ { vessel: "Pacific Loom", eta: "25/09 07:35", from: "Busan" }, { vessel: "Golden Swell", eta: "25/09 18:00", from: "Shanghai" }, { vessel: "Kuroshio Link", eta: "26/09 10:15", from: "Busan" } ] },
  { code: "USNYC", name: "New York–New Jersey", country: "États-Unis", lat: 40.67, lon: -74.08, teu: 8_700_000, wait: 10.1, berth: 69, tracked: 5_216, calls7: 47, dwell: 4.4, trend: [12, 11.5, 11, 10.8, 10.6, 10.4, 10.2, 10.1], next: [ { vessel: "Bravo Meridian", eta: "25/09 09:20", from: "Anvers" }, { vessel: "Mistral Horizon", eta: "25/09 22:50", from: "Le Havre" }, { vessel: "Hudson Relay", eta: "26/09 06:00", from: "Santos" } ] },
  { code: "BRSSZ", name: "Santos", country: "Brésil", lat: -23.96, lon: -46.3, teu: 5_380_000, wait: 26.4, berth: 86, tracked: 3_941, calls7: 44, dwell: 6.2, trend: [22, 23, 24, 25, 24.8, 25.9, 26, 26.4], next: [ { vessel: "Calypso Reach", eta: "25/09 04:50", from: "Tanger Med" }, { vessel: "Hudson Relay", eta: "25/09 17:30", from: "New York–New Jersey" }, { vessel: "Austral Wind", eta: "26/09 09:10", from: "Durban" } ] },
  { code: "ZADUR", name: "Durban", country: "Afrique du Sud", lat: -29.87, lon: 31.03, teu: 2_850_000, wait: 38.5, berth: 92, tracked: 1_874, calls7: 29, dwell: 5.7, trend: [44, 42, 41, 40.2, 40, 39.1, 38.8, 38.5], next: [ { vessel: "Austral Wind", eta: "25/09 02:40", from: "Santos" }, { vessel: "Monsoon Crest", eta: "25/09 20:05", from: "Colombo" }, { vessel: "Cape Resolve", eta: "26/09 07:30", from: "Singapour" } ] },
];

export const PORT_BY_CODE = Object.fromEntries(PORTS.map((p) => [p.code, p])) as Record<string, Port>;

// Liaisons affichées sur le globe (services réguliers simplifiés)
export const ROUTES: [string, string][] = [
  ["CNSHA", "KRPUS"],
  ["CNSHA", "SGSIN"],
  ["SGSIN", "LKCMB"],
  ["LKCMB", "AEJEA"],
  ["AEJEA", "EGPSD"],
  ["EGPSD", "MAPTM"],
  ["MAPTM", "NLRTM"],
  ["MAPTM", "FRLEH"],
  ["BEANR", "USNYC"],
  ["FRLEH", "USNYC"],
  ["KRPUS", "USLAX"],
  ["CNSHA", "USLAX"],
  ["MAPTM", "BRSSZ"],
  ["BRSSZ", "ZADUR"],
  ["ZADUR", "SGSIN"],
  ["USNYC", "BRSSZ"],
];

export type Status = "mer" | "transbo" | "retard" | "quai" | "douane";

export const STATUS_LABEL: Record<Status, string> = {
  mer: "En mer",
  transbo: "Transbordement",
  retard: "Retard",
  quai: "À quai",
  douane: "Dédouanement",
};

export type Stop = { port: string; label: string; date: string; state: "done" | "now" | "next" };

export type Shipment = {
  ref: string;
  box: string; // n° conteneur (préfixe fictif)
  type: string;
  vessel: string;
  pol: string;
  pod: string;
  status: Status;
  progress: number; // 0..1
  eta: string;
  delta: string; // écart vs ETA contractuelle
  stops: Stop[];
};

export const SHIPMENTS: Shipment[] = [
  {
    ref: "SLG-26-08812", box: "SLGU 482193 7", type: "40' HC", vessel: "Atlas Current · voy. 614E", pol: "Le Havre", pod: "Singapour", status: "mer", progress: 0.58, eta: "03/10 14:00", delta: "−3 h",
    stops: [
      { port: "Le Havre", label: "Chargé à bord", date: "12/09", state: "done" },
      { port: "Tanger Med", label: "Transbordement", date: "16/09", state: "done" },
      { port: "Port-Saïd", label: "Transit canal de Suez", date: "20/09", state: "done" },
      { port: "Jebel Ali", label: "Escale", date: "26/09", state: "now" },
      { port: "Singapour", label: "Déchargement", date: "03/10", state: "next" },
    ],
  },
  {
    ref: "SLG-26-08790", box: "NVTU 730418 2", type: "20' DV", vessel: "Pacific Loom · voy. 082W", pol: "Busan", pod: "Los Angeles", status: "retard", progress: 0.71, eta: "28/09 09:30", delta: "+31 h",
    stops: [
      { port: "Busan", label: "Chargé à bord", date: "14/09", state: "done" },
      { port: "Pacifique Nord", label: "Dérouté, dépression", date: "21/09", state: "now" },
      { port: "Los Angeles", label: "Mouillage prévu", date: "28/09", state: "next" },
      { port: "Los Angeles", label: "Mise à quai", date: "29/09", state: "next" },
    ],
  },
  {
    ref: "SLG-26-08755", box: "ORBU 118564 0", type: "40' RF", vessel: "Merlion Spirit · voy. 203S", pol: "Shanghai", pod: "Anvers", status: "transbo", progress: 0.34, eta: "19/10 06:00", delta: "+6 h",
    stops: [
      { port: "Shanghai", label: "Chargé à bord", date: "10/09", state: "done" },
      { port: "Singapour", label: "Transbordement, reefer branché", date: "24/09", state: "now" },
      { port: "Colombo", label: "Escale", date: "28/09", state: "next" },
      { port: "Anvers", label: "Déchargement", date: "19/10", state: "next" },
    ],
  },
  {
    ref: "SLG-26-08731", box: "SLGU 904377 5", type: "40' HC", vessel: "Calypso Reach · voy. 51N", pol: "Santos", pod: "Tanger Med", status: "quai", progress: 1, eta: "Arrivé 23/09", delta: "−9 h",
    stops: [
      { port: "Santos", label: "Chargé à bord", date: "07/09", state: "done" },
      { port: "Tanger Med", label: "Déchargé, sur terre-plein", date: "23/09", state: "now" },
      { port: "Tanger Med", label: "Enlèvement camion", date: "25/09", state: "next" },
    ],
  },
  {
    ref: "SLG-26-08702", box: "KAIU 267051 9", type: "20' DV", vessel: "Kestrel Bay · voy. 330A", pol: "Jebel Ali", pod: "Rotterdam", status: "douane", progress: 1, eta: "Arrivé 22/09", delta: "+2 h",
    stops: [
      { port: "Jebel Ali", label: "Chargé à bord", date: "30/08", state: "done" },
      { port: "Port-Saïd", label: "Transit canal de Suez", date: "05/09", state: "done" },
      { port: "Rotterdam", label: "Déchargé", date: "22/09", state: "done" },
      { port: "Rotterdam", label: "Contrôle douanier (scanner)", date: "24/09", state: "now" },
      { port: "Duisbourg", label: "Pré-acheminement fluvial", date: "26/09", state: "next" },
    ],
  },
  {
    ref: "SLG-26-08688", box: "NVTU 551902 4", type: "40' DV", vessel: "Mistral Horizon · voy. 017W", pol: "Le Havre", pod: "New York–New Jersey", status: "mer", progress: 0.82, eta: "26/09 21:00", delta: "−1 h",
    stops: [
      { port: "Le Havre", label: "Chargé à bord", date: "17/09", state: "done" },
      { port: "Atlantique Nord", label: "En route, 17,8 nœuds", date: "24/09", state: "now" },
      { port: "New York–New Jersey", label: "Déchargement", date: "26/09", state: "next" },
    ],
  },
];
