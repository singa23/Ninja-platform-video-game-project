// QA Ninjakoï : défilement par étapes, lancement du dojo, lancers, score.
export default async ({ page, shot, vp, log }) => {
  const mobile = vp === "mobile";
  if (mobile) {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    log(`défilement horizontal mobile : scrollWidth=${r.sw} innerWidth=${r.iw} → ${r.sw <= r.iw ? "OK" : "DÉBORDEMENT"}`);
    if (r.sw > r.iw) throw new Error(`débordement horizontal ${r.sw} > ${r.iw}`);
  }

  // checkCanvases (script partagé) a fait défiler jusqu'aux canvas : retour en haut
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(1500);

  const scrollTo = async (id, name) => {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: "instant" });
    }, id);
    await page.waitForTimeout(2600); // la caméra rejoint sa position (amorti)
    await shot(name);
  };

  // parallaxe souris sur le héros
  if (!mobile) {
    await page.mouse.move(1100, 300);
    await page.waitForTimeout(900);
    await shot("02-hero-parallaxe");
  }
  await scrollTo("histoire", "03-legende");
  await scrollTo("bestiaire", "04-bestiaire");
  await scrollTo("commandes", "05-commandes");
  if (mobile) {
    // menu des sections (remplace les liens masqués sous 760 px)
    await page.locator(".menu summary").click();
    await page.waitForTimeout(400);
    await shot("05b-menu-mobile");
    await page.locator(".menu summary").click();
  }

  // parcours « Jouer » depuis la barre : la zone de jeu doit être entièrement visible
  await page.getByRole("link", { name: "Jouer", exact: true }).click();
  // défilement doux : on attend qu'il se termine (rendu logiciel lent)
  await page.waitForFunction(() => {
    const t = document.getElementById("dojo-frame").getBoundingClientRect().top;
    const w = window; const same = w.__lastTop === t; w.__lastTop = t; return same && t < 200;
  }, null, { timeout: 15000, polling: 400 }).catch(() => {});
  await page.waitForTimeout(1200);
  const fr = await page.evaluate(() => {
    const r = document.getElementById("dojo-frame").getBoundingClientRect();
    const nav = document.querySelector(".nav").getBoundingClientRect().height;
    const btn = document.querySelector('[data-testid="dojo-start"]').getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), nav: Math.round(nav), ih: innerHeight, btnBottom: Math.round(btn.bottom) };
  });
  log(`cadre du dojo après « Jouer » : ${JSON.stringify(fr)} → ${fr.top >= fr.nav - 1 && fr.bottom <= fr.ih + 1 && fr.btnBottom <= fr.ih ? "entièrement visible" : "PARTIELLEMENT HORS ÉCRAN"}`);
  await shot("06-dojo-attente");

  // bouton son : doit être cliquable avant la partie (pas recouvert par la carte)
  const snd = page.locator("button.sound");
  await snd.click({ timeout: 5000 });
  log(`bouton son cliquable en attente : aria-pressed=${await snd.getAttribute("aria-pressed")}`);
  await snd.click();

  const frame = page.getByTestId("dojo-frame");
  const box = await frame.boundingBox();

  // entraînement libre : un lancer avant le chrono
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
  await page.waitForTimeout(250);

  await page.getByTestId("dojo-start").click();
  await page.waitForTimeout(700);
  await shot("07-dojo-compte-a-rebours");
  // attend la fin du compte à rebours (le rendu logiciel est lent)
  await page.waitForFunction(() => !document.querySelector(".countdown"), null, { timeout: 30000 });
  await page.waitForTimeout(300);

  // Lancers : on vise les cibles réellement visibles (positions projetées exposées par la scène)
  const pref = { oni: 0, bird: 1, coin: 2, target: 3 };
  for (let i = 0; i < 14; i++) {
    const aims = await page.evaluate(() => (window.__dojoAim ? window.__dojoAim() : []));
    aims.sort((a, b) => pref[a.kind] - pref[b.kind]);
    const t = aims[0] || { x: box.x + box.width / 2, y: box.y + box.height * 0.5 };
    if (mobile) await page.touchscreen.tap(t.x, t.y);
    else await page.mouse.click(t.x, t.y);
    await page.waitForTimeout(220);
    if (i === 6) await shot("08-dojo-lancers");
  }
  // double lancer rapide sur la même cible : le combo ne doit pas retomber à zéro
  const comboTxt = () => page.locator(".hud-combo .hud-value").innerText();
  for (let k = 0; k < 2; k++) {
    await page.waitForTimeout(1200); // laisse retomber les shurikens encore en vol
    const aims = await page.evaluate(() => (window.__dojoAim ? window.__dojoAim() : []));
    const t = aims.find((a) => a.kind === "target") || aims[0];
    if (!t) { log(`double lancer : aucune cible visible (${aims.length})`); await page.waitForTimeout(300); continue; }
    const c0 = await comboTxt();
    if (mobile) { await page.touchscreen.tap(t.x, t.y); await page.touchscreen.tap(t.x, t.y); }
    else { await page.mouse.click(t.x, t.y); await page.mouse.click(t.x, t.y); }
    await page.waitForTimeout(700);
    log(`double lancer même cible : combo ${c0.replace(/\s+/g, " ")} -> ${(await comboTxt()).replace(/\s+/g, " ")}`);
  }
  // au clavier : flèches pour viser, Espace pour lancer (tir aimanté)
  await frame.focus();
  const before = await page.getByTestId("dojo-score").innerText();
  await page.keyboard.down("ArrowLeft"); await page.waitForTimeout(250); await page.keyboard.up("ArrowLeft");
  for (let i = 0; i < 5; i++) { await page.keyboard.press("Space"); await page.waitForTimeout(260); }
  const after = await page.getByTestId("dojo-score").innerText();
  log(`clavier : score ${before} → ${after}`);
  await shot("08b-dojo-clavier");
  await page.waitForTimeout(400);
  await shot("09-dojo-score");
  const score = await page.getByTestId("dojo-score").innerText();
  const time = await page.getByTestId("dojo-time").innerText();
  log(`score après 12 lancers : ${score} (temps restant ${time})`);

  // accélère la fin de partie : on attend la fin du chrono
  await page.waitForFunction(() => document.querySelector('[data-testid="dojo-result"]'), null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await shot("10-dojo-resultat");
  const result = await page.getByTestId("dojo-result").innerText();
  log(`résultat : ${result.replace(/\s+/g, " ")}`);
  const best = await page.evaluate(() => { try { return localStorage.getItem("ninjakoi-dojo-best"); } catch { return "n/a"; } });
  log(`meilleur score stocké : ${best}`);

  await scrollTo("depot", "11-depot");
};
