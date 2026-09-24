// Parcours QA Sillage : glisser le globe → cliquer un port → tableau de bord → tarifs annuels → FAQ → demande de démo
export default async ({ page, shot, vp, log }) => {
  const mobile = vp === "mobile";
  const wait = (ms) => page.waitForTimeout(ms);
  const hscroll = async (tag) => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    log(`${tag} scrollWidth=${r.sw} innerWidth=${r.iw} ok=${r.sw <= r.iw}`);
    if (r.sw > r.iw) throw new Error(`défilement horizontal : ${r.sw} > ${r.iw}`);
  };
  if (mobile) await hscroll("mobile début");

  // 1. Glisser le globe (souris, avec inertie)
  const canvas = page.locator('[data-testid="globe"] canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx + 60, cy);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) await page.mouse.move(cx + 60 - i * 18, cy + i * 2, { steps: 1 });
  await page.mouse.up();
  await wait(1500);
  await shot("02-globe-glisse");

  // 2. Cliquer un port visible directement sur la canvas
  await page.waitForFunction(() => !!window.__sillage);
  const candidates = ["SGSIN", "AEJEA", "MAPTM", "FRLEH", "EGPSD", "LKCMB", "NLRTM", "ZADUR", "CNSHA", "BRSSZ", "KRPUS", "USNYC", "USLAX"];
  let clicked = null;
  for (const code of candidates) {
    const p = await page.evaluate((c) => window.__sillage.portScreen(c), code);
    const inside = p && p.x > box.x + 10 && p.x < box.x + box.width - 10 && p.y > box.y + 10 && p.y < box.y + box.height - 10;
    if (p && p.facing > 0.45 && inside) {
      await page.mouse.move(p.x, p.y);
      await wait(400);
      await page.mouse.click(p.x, p.y);
      try {
        await page.getByTestId("port-panel").waitFor({ timeout: 2500 });
        clicked = code;
        break;
      } catch { /* essaie le suivant */ }
    }
  }
  log(`port cliqué sur la canvas : ${clicked ?? "aucun (repli sur les puces)"}`);
  if (!clicked) {
    await page.getByRole("button", { name: "Singapour", exact: true }).click();
    await page.getByTestId("port-panel").waitFor();
  }
  await wait(2200);
  log(`panneau : ${(await page.getByTestId("port-panel").locator("h3").innerText()).trim()}`);
  await shot("03-port-selectionne");
  if (mobile) {
    await page.getByTestId("port-panel").scrollIntoViewIfNeeded();
    await wait(400);
    await shot("03b-panneau-port");
  }

  // Autre port via les puces (clavier / accessibilité)
  await page.getByRole("button", { name: "Shanghai", exact: true }).click();
  await wait(2600);
  await shot("04-shanghai");
  if (!mobile) {
    // Tanger Med : le globe décalé ne doit pas toucher la fin du titre
    await page.getByRole("button", { name: "Tanger Med", exact: true }).click();
    await page.waitForFunction(() => window.__sillage.settled(), null, { timeout: 90000, polling: 250 });
    await wait(300);
    await shot("04c-tanger-med");
  }

  // Ports voisins : centrer Rotterdam puis cliquer pile sur Anvers (à < 1° de Rotterdam)
  await page.evaluate(() => document.querySelector('[data-testid="globe"]').scrollIntoView({ block: "start" }));
  await page.getByRole("button", { name: "Rotterdam", exact: true }).click();
  // le rendu logiciel est lent : on attend que le globe soit immobile avant de viser
  await page.evaluate(() => document.querySelector('[data-testid="globe"]').scrollIntoView({ block: "start" }));
  await page.waitForFunction(() => window.__sillage.settled(), null, { timeout: 90000, polling: 250 });
  await wait(300);
  const an = await page.evaluate(() => window.__sillage.portScreen("BEANR"));
  const rt = await page.evaluate(() => window.__sillage.portScreen("NLRTM"));
  log(`écran Rotterdam ${rt.x.toFixed(1)},${rt.y.toFixed(1)} · Anvers ${an.x.toFixed(1)},${an.y.toFixed(1)}`);
  await page.mouse.move(an.x, an.y);
  await wait(300);
  await page.mouse.click(an.x, an.y);
  await wait(1800);
  const anName = (await page.getByTestId("port-panel").locator("h3").innerText()).trim();
  log(`clic sur les coordonnées d'Anvers → ${anName}`);
  if (!/anvers/i.test(anName)) throw new Error("Anvers non sélectionnable depuis le globe");
  await shot("04b-anvers-clic-globe");
  await page.keyboard.press("Escape");
  await wait(300);
  const left = await page.getByTestId("port-panel").count();
  log(`panneau après Échap : ${left}`);
  if (left) throw new Error("Échap ne ferme pas le panneau");

  // 3. Tableau de bord
  await page.evaluate(() => document.getElementById("passerelle").scrollIntoView({ behavior: "instant", block: "start" }));
  await wait(2200);
  await shot("05-tableau-de-bord");
  await page.getByRole("button", { name: /NVTU 730418 2/ }).click();
  await wait(500);
  await page.getByTestId("ship-detail").scrollIntoViewIfNeeded();
  await shot("06-expedition-retard");

  // 4. Fonctionnalités
  await page.evaluate(() => document.getElementById("fonctions").scrollIntoView({ behavior: "instant", block: "start" }));
  await wait(500);
  await shot("07-fonctionnalites");

  await page.evaluate(() => document.getElementById("integrations").scrollIntoView({ behavior: "instant", block: "start" }));
  await wait(500);
  await shot("08-integrations");

  // 5. Tarifs mensuel → annuel
  await page.evaluate(() => document.getElementById("tarifs").scrollIntoView({ behavior: "instant", block: "start" }));
  const before = await page.getByTestId("price-ligne").innerText();
  await page.getByTestId("bill-annual").click();
  await wait(500);
  const after = await page.getByTestId("price-ligne").innerText();
  log(`tarif Ligne régulière : ${before} → ${after}`);
  if (before === after) throw new Error("la bascule annuelle ne change pas le prix");
  // clavier : flèches dans le groupe radio
  await page.keyboard.press("ArrowLeft");
  const kb1 = await page.getByTestId("bill-monthly").getAttribute("aria-checked");
  await page.keyboard.press("ArrowRight");
  const kb2 = await page.getByTestId("bill-annual").getAttribute("aria-checked");
  log(`flèches clavier facturation : mensuel=${kb1} puis annuel=${kb2}`);
  if (kb1 !== "true" || kb2 !== "true") throw new Error("flèches clavier inopérantes sur la bascule");
  await wait(400);
  await shot("09-tarifs-annuel");

  // 6. FAQ
  await page.evaluate(() => document.getElementById("faq").scrollIntoView({ behavior: "instant", block: "start" }));
  const q = page.getByRole("button", { name: /transbordement/ });
  await q.click();
  await wait(400);
  log(`FAQ transbordement ouverte : ${await q.getAttribute("aria-expanded")}`);
  await shot("10-faq");

  // 7. Formulaire de démo : erreurs puis envoi
  await page.evaluate(() => document.getElementById("demo").scrollIntoView({ behavior: "instant", block: "start" }));
  await page.getByTestId("demo-submit").click();
  await wait(300);
  log(`erreurs affichées : ${await page.locator(".err").count()}`);
  await page.getByTestId("demo-form").scrollIntoViewIfNeeded();
  await shot("11-formulaire-erreurs");
  await page.getByTestId("f-nom").fill("Claire Lemaître");
  await page.getByTestId("f-email").fill("c.lemaitre@transit-atlantique.fr");
  await page.getByTestId("f-societe").fill("Transit Atlantique");
  await page.getByTestId("f-volume").selectOption("500-5000");
  await page.getByTestId("f-port").selectOption("Le Havre");
  await page.getByTestId("f-message").fill("25 EVP par semaine Shanghai → Le Havre, beaucoup de roulage à Tanger Med.");
  await shot("12-formulaire-rempli");
  await page.getByTestId("demo-submit").click();
  await page.getByTestId("demo-success").waitFor({ timeout: 5000 });
  log(`focus après envoi : ${await page.evaluate(() => document.activeElement?.getAttribute("data-testid") || document.activeElement?.tagName)}`);
  await page.getByTestId("demo-success").scrollIntoViewIfNeeded();
  await wait(600);
  await shot("13-demo-envoyee");

  if (mobile) {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await wait(400);
    await shot("14-menu-mobile");
    await page.getByRole("button", { name: "Fermer le menu" }).click();
    await hscroll("mobile fin");
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(1500);
};
