// Parcours QA Almanach Orbital : intro → explorateur → Jupiter (liste) → vitesse 1 an/s → sens inverse →
// date choisie → Saturne (clavier) → échelle réelle → Mars (clic dans la scène) + comparateur → Terre →
// planète suivante → formats tablette et téléphone à l'horizontale.
export default async ({ page, shot, vp, log }) => {
  const mobile = vp === "mobile";
  const wait = (ms) => page.waitForTimeout(ms);
  const hscroll = async (tag) => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    log(`${tag} scrollWidth=${r.sw} innerWidth=${r.iw} ok=${r.sw <= r.iw}`);
    if (r.sw > r.iw) throw new Error(`défilement horizontal : ${r.sw} > ${r.iw}`);
  };
  const date = () => page.getByTestId("sim-date").locator("output").innerText();
  if (mobile) {
    await hscroll("intro");
    // petit Android (360 × 640) : l'intro doit tenir sans rien couper
    await page.setViewportSize({ width: 360, height: 640 });
    await wait(1200);
    const ir = await page.evaluate(() => {
      const t = document.querySelector(".intro-title")?.getBoundingClientRect();
      const b = document.querySelector(".brand-lg")?.getBoundingClientRect();
      const c = document.querySelector('[data-testid="enter"]')?.getBoundingClientRect();
      return { titleTop: t?.top, brandBottom: b?.bottom, ctaBottom: c?.bottom, h: innerHeight };
    });
    log(`intro 360x640 ${JSON.stringify(ir)}`);
    if (!(ir.titleTop >= ir.brandBottom) || !(ir.ctaBottom <= ir.h)) throw new Error("intro coupée à 360 × 640");
    await shot("01b-accueil-360x640");
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(800);
  }

  // 1. Entrée dans l'explorateur (l'horloge ne tourne pas pendant l'intro)
  const f = (ms) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(ms));
  const today = f(Date.now()), tomorrow = f(Date.now() + 86400000); // 1 j/s tourne dès l'entrée
  await page.getByTestId("enter").click();
  await wait(300);
  const d00 = await date();
  log(`date à l'entrée=${d00} aujourd'hui=${today}`);
  if (d00 !== today && d00 !== tomorrow) throw new Error(`date à l'entrée ${d00} ≠ ${today}`);
  await wait(3500);
  await shot("02-explorateur");
  if (mobile) {
    await hscroll("explorateur");
    const small = await page.evaluate(() => [...document.querySelectorAll(".top button, .top input, .bottom button, .rail button")]
      .map((e) => ({ id: e.getAttribute("data-testid") || e.getAttribute("aria-label") || e.textContent.trim(), r: e.getBoundingClientRect() }))
      .filter((o) => o.r.width > 0 && o.r.right > 0 && o.r.left < innerWidth && o.r.height < 44)
      .map((o) => `${o.id} ${Math.round(o.r.width)}×${Math.round(o.r.height)}`));
    log(`cibles tactiles < 44 px : ${JSON.stringify(small)}`);
  }

  // 2. Glisser sur la scène pour tourner autour du Soleil
  const vs = page.viewportSize();
  const cx = vs.width / 2, cy = vs.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(cx - i * 14, cy + i * 3);
  await page.mouse.up();
  await wait(1200);

  // 3. Jupiter via la liste
  await page.getByTestId("planet-btn-jupiter").click();
  await page.getByTestId("info-panel").waitFor();
  await wait(5000);
  await shot("03-jupiter-fiche");
  if (mobile) {
    await page.getByTestId("sheet-toggle").click();
    await wait(2500);
    await shot("04-jupiter-fiche-depliee");
    await page.getByTestId("sheet-toggle").click();
    await wait(500);
  }

  // 4. Vitesse du temps : 1 an/s
  const d0 = await date();
  await page.getByTestId("speed-1a").click();
  await wait(3000);
  const d1 = await date();
  log(`date avant=${d0} après 1 an/s=${d1}`);
  if (d0 === d1) throw new Error("la date simulée n'avance pas");
  await shot("05-vitesse-1-an-par-s");
  // sens inverse
  const y0 = Number((await date()).slice(-4));
  await page.getByTestId("reverse").click();
  await wait(3000);
  const y1 = Number((await date()).slice(-4));
  log(`sens inverse : ${y0} → ${y1}`);
  if (!(y1 < y0)) throw new Error("le temps ne recule pas");
  await page.getByTestId("reverse").click();
  await page.getByTestId("speed-1j").click();
  await page.getByTestId("play-pause").click();
  // date choisie
  const di = page.getByTestId("date-input");
  log(`champ date (jj/mm/aaaa) = ${await di.inputValue()}`);
  await di.click();
  await di.fill("09/02/1986");
  await di.press("Enter");
  await wait(600);
  log(`date choisie → ${await date()}`);
  await wait(2500);
  if (!(await date()).includes("1986")) throw new Error("la date choisie n'est pas appliquée");
  await shot("05b-date-1986");
  await page.getByTestId("play-pause").click();
  await page.getByRole("button", { name: /Aujourd/ }).click();

  // 5. Raccourci clavier : 6 → Saturne
  await page.keyboard.press("6");
  await wait(5500);
  await shot("06-saturne-clavier");

  // 6. Échelle réelle
  await page.getByTestId("scale-reelle").click();
  await wait(4000);
  await shot("07-saturne-echelle-reelle");
  await page.keyboard.press("0");
  await wait(4500);
  await shot("08-vue-ensemble-echelle-reelle");
  await page.getByTestId("scale-lisible").click();
  await wait(4000);

  // 7. Clic dans la scène : étiquette de Mars
  const tag = page.locator(".tag", { hasText: "Mars" }).first();
  let viaScene = false;
  // l'étiquette suit la planète à chaque image : on clique à sa position mesurée
  const b = await tag.boundingBox();
  const inView = b && b.x > 0 && b.y > 60 && b.x < vs.width - 20 && b.y < vs.height - 60;
  if (inView) {
    await page.mouse.click(b.x + 5, b.y + b.height / 2);
    try { await page.getByTestId("info-panel").filter({ hasText: "Mars" }).waitFor({ timeout: 2500 }); viaScene = true; } catch { /* repli */ }
  }
  if (!viaScene) await page.getByTestId("planet-btn-mars").click();
  log(`Mars sélectionnée via ${viaScene ? "la scène" : "la liste"}`);
  await wait(5000);
  if (mobile) { await page.getByTestId("sheet-toggle").click(); await wait(600); }
  await page.getByTestId("compare-btn").click();
  await page.getByTestId("comparator").waitFor();
  await wait(800);
  await shot("09-mars-comparateur");
  log(`comparateur : ${await page.getByTestId("comparator").locator("figcaption").innerText()}`);

  // 8. Terre : continents, nuages, Lune — comparateur Terre/Lune
  await page.keyboard.press("3");
  await wait(5500);
  if (!mobile) log(`comparateur Terre : ${await page.getByTestId("comparator").locator("figcaption").innerText()}`);
  if (mobile) { await page.getByTestId("sheet-toggle").click(); await wait(2500); }
  await shot("10-terre");
  if (mobile) await hscroll("fin");
  // échelle réelle sur la Terre : la caméra recule jusqu'à l'orbite de la Lune
  await page.getByTestId("scale-reelle").click();
  await wait(4500);
  await shot("10b-terre-echelle-reelle");
  await page.getByTestId("scale-lisible").click();
  await wait(2500);
  // planète suivante depuis la fiche
  await page.getByTestId("next-planet").click();
  await page.getByTestId("info-panel").filter({ hasText: "Mars" }).waitFor();
  log("fiche suivante : Mars");

  // 9. Tour des autres planètes (bureau)
  if (!mobile) {
    await page.getByTestId("compare-btn").click();
    for (const [k, n] of [["1", "mercure"], ["2", "venus"], ["7", "uranus"], ["8", "neptune"]]) {
      await page.keyboard.press(k);
      await wait(5000);
      await shot(`11-${n}`);
    }
    // vue d'ensemble puis tablette
    await page.keyboard.press("0");
    await wait(4000);
    await shot("12-vue-ensemble");
    await page.setViewportSize({ width: 900, height: 700 });
    await page.keyboard.press("5");
    await wait(5000);
    await shot("13-tablette-jupiter");
    await page.setViewportSize({ width: 1440, height: 900 });
  } else {
    // téléphone à l'horizontale
    await page.keyboard.press("0");
    await page.setViewportSize({ width: 844, height: 390 });
    await wait(4500);
    await shot("12-paysage");
    await hscroll("paysage");
    await page.getByTestId("planet-btn-saturne").click();
    await wait(5500);
    await shot("13-paysage-saturne");
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)?.getBoundingClientRect();
      const a = q(".rail"), b = q(".bottom"), p = q(".panel");
      const ov = (x, y) => x && y && x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top;
      return { railBottom: ov(a, b), panelBottom: ov(p, b), railPanel: ov(a, p) };
    });
    log(`paysage chevauchements ${JSON.stringify(r)}`);
    if (r.railBottom || r.panelBottom || r.railPanel) throw new Error("chevauchement en paysage");
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(1500);
  }
};
