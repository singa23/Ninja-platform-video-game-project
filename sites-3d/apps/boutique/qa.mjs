// Parcours QA Studio Oblique : catalogue → fiche 3D → couleur → vue éclatée → rotation → panier → BIENVENUE10 → tunnel → confirmation
export default async ({ page, shot, vp, log }) => {
  const mobile = vp === "mobile";
  const wait = (ms) => page.waitForTimeout(ms);

  if (mobile) {
    const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    log(`mobile scrollWidth=${sw.sw} innerWidth=${sw.iw} ok=${sw.sw <= sw.iw}`);
    if (sw.sw > sw.iw) throw new Error(`défilement horizontal : ${sw.sw} > ${sw.iw}`);
  }

  // Catalogue
  await page.locator("#catalogue").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById("catalogue").scrollIntoView());
  await wait(2500);
  if (!mobile) {
    await page.locator('[data-testid="card-aria"]').hover();
    await wait(1200);
  }
  await shot("02-catalogue");

  // Liste d'envies
  await page.locator('[data-testid="card-orbe"] .heart').click();
  // Filtre + tri + recherche
  await page.getByRole("button", { name: "Maison", exact: true }).click();
  await page.getByTestId("sort").selectOption("prix-desc");
  await wait(1800);
  await shot("03-filtre-maison-prix");
  await page.getByRole("button", { name: "Tout", exact: true }).click();
  await page.getByTestId("sort").selectOption("pertinence");
  await page.getByTestId("search").fill("cobalt");
  await wait(1200);
  log(`recherche « cobalt » : ${await page.locator("article.card").count()} résultats`);
  await page.getByTestId("search").fill("");
  await wait(600);

  // Fiche produit
  await page.locator('[data-testid="card-cadence"] .card-hit').click();
  await page.getByTestId("product-sheet").waitFor();
  await wait(3500);
  await shot("04-fiche-produit");
  if (mobile) {
    const tb = await page.evaluate(() => { const c = document.querySelector(".viewer-tools"); return { w: c.clientWidth, sw: c.scrollWidth }; });
    log(`barre d'outils visionneuse : ${tb.sw} / ${tb.w} ok=${tb.sw <= tb.w}`);
  }

  // Couleur
  await page.getByTestId("color-signal").click();
  await page.getByRole("radio", { name: /Titane/ }).click();
  await wait(1500);
  log(`prix après options : ${await page.getByTestId("price").innerText()}`);
  await shot("05-couleur-signal-titane");

  // Vue éclatée
  await page.getByTestId("explode").click();
  await wait(3000);
  await shot("06-vue-eclatee");

  // Rotation à la souris
  const box = await page.getByTestId("viewer").boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(cx - i * 22, cy + i * 3);
  await page.mouse.up();
  await wait(1800);
  await shot("07-rotation-souris");

  // Annotation
  const dot = page.locator(".hs-dot").first();
  if (await dot.isVisible()) {
    await dot.click({ force: true });
    await wait(500);
  }

  // Ajout au panier
  // double clic : un seul article doit être ajouté
  await page.locator('[data-testid="add-to-cart"]:visible').dblclick();
  await wait(900);
  await shot("08-ajout-confirmation");
  await wait(600);

  // Panier
  await page.locator(".viewer-top [data-cart-target]").click();
  await page.getByTestId("cart-drawer").waitFor();
  await wait(700);
  log(`quantité après double clic sur Ajouter : ${await page.locator('[data-testid="cart-line"] output').first().innerText().catch(() => "?")}`);
  await page.getByTestId("line-plus").first().click();
  await shot("09-panier");

  // Code promo
  await page.getByTestId("promo-input").fill("bienvenue10");
  await page.getByTestId("promo-apply").click();
  await page.getByTestId("discount").waitFor();
  log(`remise : ${await page.getByTestId("discount").innerText()} · total : ${await page.getByTestId("total").first().innerText()}`);
  await wait(300);
  await shot("10-code-promo");

  // Tunnel de commande
  await page.getByTestId("checkout").click();
  await page.getByTestId("checkout-page").waitFor();
  await page.getByTestId("to-payment").click();
  await wait(400);
  await shot("11-livraison-erreurs");
  await page.getByTestId("f-prenom").fill("Camille");
  await page.getByTestId("f-nom").fill("Rivière");
  await page.getByTestId("f-email").fill("camille.riviere@exemple.fr");
  await page.getByTestId("f-tel").fill("06 12 34 56 78");
  await page.getByTestId("f-adresse").fill("12 rue de la Charité");
  await page.getByTestId("f-cp").fill("69002");
  await page.getByTestId("f-ville").fill("Lyon");
  await page.locator("label.mode").nth(1).click();
  await shot("12-livraison-remplie");
  await page.getByTestId("to-payment").click();
  await page.getByTestId("demo-banner").waitFor();
  await page.getByTestId("f-titulaire").fill("Camille Rivière");
  await page.getByTestId("f-numero").fill("4242424242424242");
  await page.getByTestId("f-exp").fill("0929");
  await page.getByTestId("f-cvc").fill("123");
  await wait(300);
  await shot("13-paiement-demo");
  await page.getByTestId("pay").click();
  await page.getByTestId("confirmation").waitFor({ timeout: 8000 });
  log(`commande : ${await page.getByTestId("order-number").innerText()}`);
  await wait(400);
  await shot("14-confirmation");
  await page.getByTestId("back-to-shop").click();
  await wait(800);

  // Lien direct #produit-aria
  await page.evaluate(() => {
    window.location.hash = "#produit-aria";
  });
  await page.getByTestId("product-sheet").waitFor();
  await wait(3000);
  await page.getByTestId("explode").click();
  await wait(2800);
  await shot("15-lien-direct-casque-eclate");
  await page.getByTestId("close-sheet").click();
  await wait(1500);

  if (mobile) {
    const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    log(`fin mobile scrollWidth=${sw.sw} innerWidth=${sw.iw} ok=${sw.sw <= sw.iw}`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(1500);
};
