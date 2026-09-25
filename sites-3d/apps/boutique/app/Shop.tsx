"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Heart, PackageCheck, RotateCcw, Search, ShieldCheck, ShoppingBag, Truck, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORIES, PRODUCTS, byId, euros, type Category, type Product } from "./data";
import { totals, useShop } from "./store";
import View3D, { Stage } from "./View3D";
import ProductSheet from "./ProductSheet";
import CartDrawer from "./CartDrawer";
import Checkout from "./Checkout";

type Filter = "Tout" | Category | "Envies";
type Sort = "pertinence" | "prix-asc" | "prix-desc" | "note";

export type Added = { id: number; text: string; color: string; from?: DOMRect };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function Shop() {
  const hydrate = useShop((s) => s.hydrate);
  const lines = useShop((s) => s.lines);
  const promo = useShop((s) => s.promo);
  const wishlist = useShop((s) => s.wishlist);
  const toggleWish = useShop((s) => s.toggleWish);
  const [mounted, setMounted] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openVariant, setOpenVariant] = useState<string | undefined>();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("Tout");
  const [sort, setSort] = useState<Sort>("pertinence");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<Added | null>(null);
  const [fly, setFly] = useState<{ id: number; x0: number; y0: number; x1: number; y1: number; color: string } | null>(null);
  const [bump, setBump] = useState(0);
  const [heroExploded, setHeroExploded] = useState(false);
  const lastFocus = useRef<HTMLElement | null>(null);

  const [fine, setFine] = useState(false);
  useEffect(() => {
    hydrate();
    setMounted(true);
    try {
      setFine(window.matchMedia("(pointer: fine)").matches);
    } catch {
      /* ignore */
    }
  }, [hydrate]);

  const t = totals(lines, promo);

  // --- liens directs #produit-<id>
  const syncHash = useCallback(() => {
    const m = /^#produit-([a-z0-9-]+)$/.exec(window.location.hash);
    if (m && byId(m[1])) {
      setOpenId(m[1]);
      setCheckoutOpen(false);
    } else if (!m) setOpenId(null);
  }, []);
  useEffect(() => {
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [syncHash]);

  const openProduct = useCallback((id: string, variantId?: string) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setOpenVariant(variantId);
    setOpenId(id);
    try {
      history.replaceState(null, "", "#produit-" + id);
    } catch {
      /* cadre sandboxé : on ignore */
    }
  }, []);
  const openIdRef = useRef<string | null>(null);
  openIdRef.current = openId;
  const closeProduct = useCallback(() => {
    const id = openIdRef.current;
    setOpenId(null);
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      /* ignore */
    }
    // retour du focus : l'élément qui a ouvert la fiche, sinon (lien direct #produit-…) la carte du produit
    setTimeout(() => {
      const prev = lastFocus.current;
      lastFocus.current = null;
      if (prev && prev !== document.body && prev.isConnected && !prev.closest("[inert]")) {
        prev.focus({ preventScroll: true });
        if (document.activeElement === prev) return;
      }
      const card = id ? document.querySelector<HTMLElement>(`[data-testid="card-${id}"] .card-hit`) : null;
      (card ?? document.querySelector<HTMLElement>("#catalogue h2"))?.focus({ preventScroll: !card });
    }, 30);
  }, []);

  const covered = !!openId || checkoutOpen;
  const anyOverlay = covered || cartOpen;

  useEffect(() => {
    const el = document.documentElement;
    el.style.overflow = anyOverlay ? "hidden" : "";
    return () => {
      el.style.overflow = "";
    };
  }, [anyOverlay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cartOpen) setCartOpen(false);
      else if (checkoutOpen) return;
      else if (openId) closeProduct();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, checkoutOpen, openId, closeProduct]);

  const onAdded = useCallback((a: Added) => {
    setToast(a);
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && getComputedStyle(el).visibility !== "hidden";
    });
    const tgt = targets[targets.length - 1];
    if (a.from && tgt) {
      const r = tgt.getBoundingClientRect();
      setFly({ id: a.id, x0: a.from.left + a.from.width / 2 - 9, y0: a.from.top + a.from.height / 2 - 9, x1: r.left + r.width / 2 - 9, y1: r.top + r.height / 2 - 9, color: a.color });
    }
    setTimeout(() => setBump((b) => b + 1), 650);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  const list = useMemo(() => {
    let l = PRODUCTS.slice();
    if (filter === "Envies") l = l.filter((p) => wishlist.includes(p.id));
    else if (filter !== "Tout") l = l.filter((p) => p.category === filter);
    const nq = norm(q.trim());
    if (nq) l = l.filter((p) => norm(`${p.name} ${p.tagline} ${p.category} ${p.ref} ${p.variants.map((v) => v.name).join(" ")}`).includes(nq));
    if (sort === "prix-asc") l.sort((a, b) => a.price - b.price);
    if (sort === "prix-desc") l.sort((a, b) => b.price - a.price);
    if (sort === "note") l.sort((a, b) => b.rating - a.rating);
    return l;
  }, [filter, q, sort, wishlist]);

  const hero = PRODUCTS[0];
  const openCart = () => setCartOpen(true);
  const wishCount = mounted ? wishlist.length : 0;
  const cartCount = mounted ? t.count : 0;

  return (
    <>
      <div className={"page" + (covered ? " is-covered" : "")} inert={anyOverlay || undefined}>
        <header className="hdr">
          <div className="hdr-in">
            <a className="logo" href="#haut" aria-label="Studio Oblique, accueil">
              <span className="logo-mark" aria-hidden />
              Studio Oblique
            </a>
            <nav className="nav" aria-label="Navigation principale">
              <a href="#catalogue">Catalogue</a>
              <a href="#atelier">L'atelier</a>
              <a href="#service">Livraison &amp; retours</a>
            </nav>
            <div className="hdr-actions">
              <button
                className="icon-btn"
                aria-pressed={filter === "Envies"}
                aria-label={`Liste d'envies (${wishCount})`}
                onClick={() => {
                  setFilter((f) => (f === "Envies" ? "Tout" : "Envies"));
                  document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Heart size={18} />
                {wishCount > 0 && <span className="count">{wishCount}</span>}
              </button>
              <button className={"cart-btn" + (bump ? " bump" : "")} key={bump} onClick={openCart} data-cart-target data-testid="open-cart" aria-label={`Ouvrir le panier, ${cartCount} article${cartCount > 1 ? "s" : ""}`}>
                <ShoppingBag size={18} />
                <span className="label">Panier</span>
                <span className="mono">{euros(mounted ? t.total - t.shipping : 0)}</span>
                <span className="pill">{cartCount}</span>
              </button>
            </div>
          </div>
        </header>

        <main id="haut">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-stage">
              <div className="grid-bg" aria-hidden />
              <View3D product={hero} variant={hero.variants[0]} opts={{ boitier: "titane", taille: "m" }} mode="hero" visible={!covered} still={cartOpen} exploded={heroExploded} interactive={fine} />
              <p className="stage-tag tl">
                <b>{hero.ref}</b> · Cadence S2 · titane
                <br />
                <span className="live-dot" aria-hidden />
                Cadran en direct : l'heure de votre appareil
              </p>
              <p className="stage-tag tr">
                Rendu temps réel
                <br />
                <b>WebGL · 0 photo</b>
              </p>
              <div className="cote" aria-hidden>
                Ø 47 mm
              </div>
              <div className="stage-tools">
                <button className="chip" aria-pressed={heroExploded} onClick={() => setHeroExploded((v) => !v)}>
                  {heroExploded ? "Refermer" : "Vue éclatée"}
                </button>
                <button className="chip" onClick={() => openProduct(hero.id)}>
                  Configurer <ArrowRight size={14} />
                </button>
              </div>
            </div>
            <div className="hero-copy">
              <div>
                <p className="eyebrow">
                  <span className="tag">Nouveau</span> Montre GPS · 349 €
                </p>
                <h1 id="hero-title">
                  Tournez-les, ouvrez-les, <em>puis</em> commandez.
                </h1>
                <p className="lead">Neuf objets dessinés et assemblés à Lyon, rendus en 3D dans votre navigateur. Chaque coloris, chaque option, chaque vis se vérifie avant d'arriver chez vous.</p>
                <div className="cta-row">
                  <button className="btn btn-primary" onClick={() => openProduct(hero.id)} data-testid="hero-cta">
                    Configurer la Cadence S2 <ArrowRight size={18} />
                  </button>
                  <a className="btn btn-ghost" href="#catalogue">
                    Voir les 9 objets
                  </a>
                </div>
              </div>
              <dl className="hero-facts">
                <div>
                  <dt>Autonomie</dt>
                  <dd>14 j</dd>
                </div>
                <div>
                  <dt>Étanchéité</dt>
                  <dd>5 ATM</dd>
                </div>
                <div>
                  <dt>Poids</dt>
                  <dd>39 g</dd>
                </div>
              </dl>
            </div>
          </section>

          <ul className="services" id="service" aria-label="Services">
            <li>
              <Truck size={20} />
              <div>
                <strong>Livraison offerte dès 80 €</strong>
                <span>Sinon 5,90 € · expédié sous 48 h</span>
              </div>
            </li>
            <li>
              <RotateCcw size={20} />
              <div>
                <strong>Retours sous 30 jours</strong>
                <span>Étiquette prépayée incluse</span>
              </div>
            </li>
            <li>
              <ShieldCheck size={20} />
              <div>
                <strong>Garantie 2 ans</strong>
                <span>Pièces détachées 7 ans</span>
              </div>
            </li>
            <li>
              <PackageCheck size={20} />
              <div>
                <strong>Emballage sans plastique</strong>
                <span>Carton recyclé, calage papier</span>
              </div>
            </li>
          </ul>

          <section className="section" id="catalogue" aria-labelledby="cat-title">
            <div className="cat-head">
              <h2 className="h2" id="cat-title">
                Catalogue<sup>{String(list.length).padStart(2, "0")} / {PRODUCTS.length}</sup>
              </h2>
              <p className="cat-intro">Survolez un objet pour le faire tourner, touchez une pastille pour changer son coloris, ouvrez la fiche pour le démonter.</p>
            </div>
            <div className="toolbar" role="search">
              <label className="search">
                <span className="sr-only">Rechercher un objet</span>
                <Search size={16} />
                <input type="search" placeholder="Rechercher : montre, grès, cobalt…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="search" />
              </label>
              <div className="chips" role="group" aria-label="Filtrer par catégorie">
                {(["Tout", ...CATEGORIES, "Envies"] as Filter[]).map((f) => (
                  <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                    {f === "Envies" ? (
                      <>
                        <Heart size={13} /> Envies ({wishCount})
                      </>
                    ) : (
                      f
                    )}
                  </button>
                ))}
              </div>
              <label className="sort">
                Trier
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} data-testid="sort">
                  <option value="pertinence">Sélection de l'atelier</option>
                  <option value="prix-asc">Prix croissant</option>
                  <option value="prix-desc">Prix décroissant</option>
                  <option value="note">Mieux notés</option>
                </select>
              </label>
            </div>
            {list.length === 0 ? (
              <div className="empty">
                <p>{filter === "Envies" ? "Votre liste d'envies est vide." : `Aucun objet ne correspond à « ${q} ».`}</p>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setQ("");
                    setFilter("Tout");
                  }}
                >
                  Tout afficher
                </button>
              </div>
            ) : (
              <div className="grid">
                {list.map((p) => (
                  <ProductCard key={p.id} p={p} visible={!covered} wished={wishlist.includes(p.id)} onWish={() => toggleWish(p.id)} onOpen={(v) => openProduct(p.id, v)} />
                ))}
              </div>
            )}
          </section>

          <section className="section atelier" id="atelier" aria-labelledby="at-title">
            <div>
              <h2 className="h2" id="at-title">
                L'atelier
              </h2>
              <p className="cat-intro" style={{ marginTop: 18 }}>
                Studio Oblique dessine ses objets à Lyon et travaille avec six ateliers situés à moins de 400 km : un tourneur de grès à Villeurbanne, un mouleur de contreplaqué dans le Jura, un parfumeur à Grasse. Les modèles 3D de cette boutique sont les mêmes que ceux envoyés en fabrication.
              </p>
            </div>
            <div className="atelier-facts">
              <article>
                <div className="fig">
                  1 280<small>°C</small>
                </div>
                <h3>Cuisson du grès</h3>
                <p>Galet et Fil sortent d'un four à gaz en réduction : le fer du grès remonte en moucheté.</p>
              </article>
              <article>
                <div className="fig">
                  9<small>plis</small>
                </div>
                <h3>Contreplaqué moulé</h3>
                <p>La coque de Pli est pressée à chaud 12 minutes dans un moule en aluminium.</p>
              </article>
              <article>
                <div className="fig">
                  7<small>ans</small>
                </div>
                <h3>Pièces détachées</h3>
                <p>Bracelets, coussinets, ressorts, abat-jour : tout se remplace, sans outil spécial.</p>
              </article>
            </div>
          </section>
        </main>

        <footer className="foot">
          <div>
            <a className="logo" href="#haut">
              <span className="logo-mark" aria-hidden />
              Studio Oblique
            </a>
            <p style={{ maxWidth: "36ch", marginTop: 14 }}>Objets calibrés pour durer, vendus en direct depuis l'atelier. 14 quai Arloing, 69009 Lyon.</p>
          </div>
          <div>
            <h4>Boutique</h4>
            <ul>
              <li>
                <a href="#catalogue">Catalogue</a>
              </li>
              <li>
                <a href="#produit-cadence">Cadence S2</a>
              </li>
              <li>
                <a href="#produit-aria">Casque Aria</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Service</h4>
            <ul>
              <li>Lun–ven, 9 h–18 h</li>
              <li>04 78 00 00 00</li>
              <li>
                <a href="#service">Livraison &amp; retours</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Paiement</h4>
            <ul>
              <li>Carte bancaire</li>
              <li>Paiement en 3× dès 150 €</li>
              <li>TVA 20 % incluse</li>
            </ul>
          </div>
          <div className="legal">
            <span>© 2026 Studio Oblique — boutique de démonstration, aucune commande réelle.</span>
            <span>Rendu 3D procédural · aucune image externe</span>
          </div>
        </footer>

      </div>

      {openId && byId(openId) && (
        <ProductSheet
          key={openId}
          product={byId(openId)!}
          initialVariant={openVariant}
          onClose={closeProduct}
          onAdded={onAdded}
          onOpenCart={openCart}
          cartCount={cartCount}
          bump={bump}
          wished={wishlist.includes(openId)}
          onWish={() => toggleWish(openId)}
        />
      )}

      {checkoutOpen && (
        <Checkout
          onClose={() => setCheckoutOpen(false)}
          onBackToShop={() => {
            setCheckoutOpen(false);
            setOpenId(null);
          }}
        />
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
        onOpenProduct={(id) => {
          setCartOpen(false);
          openProduct(id);
        }}
      />

      <AnimatePresence>
        {fly && (
          <motion.div
            key={fly.id}
            className="fly"
            style={{ background: fly.color }}
            initial={{ x: fly.x0, y: fly.y0, scale: 1.4, opacity: 1 }}
            animate={{ x: [fly.x0, (fly.x0 + fly.x1) / 2, fly.x1], y: [fly.y0, Math.min(fly.y0, fly.y1) - 120, fly.y1], scale: [1.4, 1.1, 0.6], opacity: [1, 1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            onAnimationComplete={() => setFly(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" key={toast.id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} data-testid="toast">
            <span className="ok">
              <Check size={16} />
            </span>
            <span>{toast.text}</span>
            <button
              onClick={() => {
                setToast(null);
                openCart();
              }}
            >
              Voir le panier
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {openId && <div className="sheet-backdrop" aria-hidden />}
      <Stage />
    </>
  );
}

function ProductCard({ p, visible, wished, onWish, onOpen }: { p: Product; visible: boolean; wished: boolean; onWish: () => void; onOpen: (variantId?: string) => void }) {
  const [hover, setHover] = useState(false);
  const [vi, setVi] = useState(0);
  const variant = p.variants[vi];
  const opts = useMemo(() => {
    const o: Record<string, string> = {};
    for (const opt of p.options) o[opt.id] = opt.choices[0].id;
    return o;
  }, [p]);
  return (
    <article className="card" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} data-testid={`card-${p.id}`}>
      <div className="card-stage">
        <View3D product={p} variant={variant} opts={opts} mode="card" hovered={hover} visible={visible} />
        <button className="card-hit" onClick={() => onOpen(variant.id)} onFocus={() => setHover(true)} onBlur={() => setHover(false)} aria-label={`Voir ${p.name}, ${p.tagline}`} />
        <div className="card-top">
          <span className="ref">
            {p.ref} · {p.category}
            {p.badge && <span className="badge">{p.badge}</span>}
          </span>
          <button className="heart" aria-pressed={wished} aria-label={wished ? `Retirer ${p.name} des envies` : `Ajouter ${p.name} aux envies`} onClick={onWish}>
            <Heart size={17} />
          </button>
        </div>
      </div>
      <div className="card-info">
        <h3 className="card-name">{p.name}</h3>
        <span className="card-price">{euros(p.price)}</span>
        <p className="card-tag">{p.tagline}</p>
        <div className="card-foot">
          <div className="swatches" role="group" aria-label={`Coloris de ${p.name}`}>
            {p.variants.map((v, i) => (
              <button key={v.id} className="sw" style={{ "--c": v.swatch } as React.CSSProperties} aria-pressed={i === vi} aria-label={v.name} title={v.name} onClick={() => setVi(i)} />
            ))}
          </div>
          <button className="more" onClick={() => onOpen(variant.id)} tabIndex={-1} aria-hidden>
            {p.stock < 10 ? <span className="stock-low mono">Plus que {p.stock}</span> : "Configurer"} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
