# Sites 3D — Next.js + React Three Fiber

Quatre sites de démonstration, entièrement en 3D temps réel procédurale (aucun modèle ni image externe, sauf les sprites du jeu Ninjakoï).

| Dossier | Site | Contenu |
|---|---|---|
| `apps/boutique` | **Studio Oblique** | E-commerce : 9 produits modélisés en 3D (montre GPS, casque, enceinte, lampe, chaise, vase, mug, parfum, lunettes), configurateur de coloris, vue éclatée, annotations, panier (code `BIENVENUE10`), tunnel de commande de démonstration. |
| `apps/ninja` | **Ninjakoï** | Site officiel du jeu de ce dépôt : bambouseraie nocturne en 3D, bestiaire, mini-jeu « Dojo des shurikens » jouable. |
| `apps/globe` | **Sillage Fret** | SaaS de suivi de conteneurs : globe 3D en points (world-atlas), vrais ports, arcs et navires animés, tableau de bord, tarifs, FAQ, formulaire. |
| `apps/cosmos` | **Almanach Orbital** | Explorateur du système solaire : données NASA, positions à la date choisie (1800–2050), vitesse du temps, échelle réelle, comparateur. |

## Lancer en local

```bash
cd sites-3d
npm install
npm run dev -- boutique        # ou ninja, globe, cosmos → http://localhost:3000
```

## Construire (export statique)

```bash
npx next build apps/boutique   # → apps/boutique/out/ (chemins relatifs, hébergeable n'importe où)
npx serve apps/boutique/out    # pour tester le résultat
```

Chaque `out/` se dépose tel quel sur Netlify, Vercel, GitHub Pages ou un simple hébergement FTP.

## Scripts de contrôle

- `node scripts/shot.mjs <app> [--video]` : captures desktop + mobile avec Chromium (WebGL logiciel), exécute `apps/<app>/qa.mjs` (parcours interactif), signale erreurs console et canvas vides.
- `node scripts/artifact.mjs <app> --check` : prépare une version « page unique » et vérifie qu'elle fonctionne dans une enveloppe HTML tierce.
