"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Heart, Minus, Plus, ShoppingBag, Star, Truck } from "lucide-react";
import { euros, unitPrice, defaultOptions, FREE_SHIPPING, type Product } from "./data";
import { maxQty, useShop } from "./store";
import View3D from "./View3D";
import type { Added } from "./Shop";

function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={15} fill={value >= i - 0.25 ? "currentColor" : "none"} strokeWidth={1.6} />
      ))}
    </span>
  );
}

type Props = {
  product: Product;
  initialVariant?: string;
  onClose: () => void;
  onAdded: (a: Added) => void;
  onOpenCart: () => void;
  cartCount: number;
  bump: number;
  wished: boolean;
  onWish: () => void;
};

export default function ProductSheet({ product: p, initialVariant, onClose, onAdded, onOpenCart, cartCount, bump, wished, onWish }: Props) {
  const add = useShop((s) => s.add);
  const [variantId, setVariantId] = useState(initialVariant && p.variants.some((v) => v.id === initialVariant) ? initialVariant : p.variants[0].id);
  const [opts, setOpts] = useState<Record<string, string>>(() => defaultOptions(p));
  const [qty, setQty] = useState(1);
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [notes, setNotes] = useState(true);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [done, setDone] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const cap = maxQty(p.id);
  const hotspotRefs = useRef<Record<string, HTMLElement | null>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const variant = p.variants.find((v) => v.id === variantId) ?? p.variants[0];
  const price = unitPrice(p, opts);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAutoRotate(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(id);
  }, [done]);

  useEffect(() => setLimitMsg(null), [variantId, opts]);

  const busy = useRef(false);
  const doAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    // un double clic ne doit ajouter qu'une fois : on ignore les clics pendant la confirmation
    if (busy.current) return;
    busy.current = true;
    setTimeout(() => (busy.current = false), 1000);
    const n = add({ productId: p.id, variantId: variant.id, options: opts, qty });
    const capText = cap < 9 ? `${cap} pièces en stock` : `${cap} par commande`;
    if (n === 0) {
      setLimitMsg(`Déjà ${cap} dans votre panier pour ce coloris : c'est le maximum (${capText}).`);
      return;
    }
    setLimitMsg(n < qty ? `Seulement ${n} ajouté${n > 1 ? "s" : ""} : plafond de ${cap} atteint (${capText}).` : null);
    setDone(true);
    onAdded({ id: Date.now(), text: `Ajouté : ${p.name}, ${variant.name}${n > 1 ? ` (× ${n})` : ""}${n < qty ? ` · plafond de ${cap} atteint` : ""}`, color: variant.swatch, from: e.currentTarget.getBoundingClientRect() });
  };

  // piège à focus : Tab boucle dans la fiche (la page de fond est de plus « inert »)
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
      (el) => el.offsetParent !== null && !el.closest("[aria-hidden='true']"),
    );
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const hotspots = p.hotspots.filter((h) => (h.exploded ? exploded : true));
  const stockLow = p.stock < 10;

  const addBtn = (
    <button className={"btn btn-primary add" + (done ? " done" : "")} onClick={doAdd} aria-disabled={done || undefined} data-testid="add-to-cart">
      {done ? (
        <>
          <Check size={18} /> Ajouté
        </>
      ) : (
        <>
          <ShoppingBag size={18} /> Ajouter · {euros(price * qty)}
        </>
      )}
    </button>
  );

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-testid="product-sheet" onKeyDown={trapTab}>
      <div className="viewer" data-testid="viewer">
        <View3D
          product={p}
          variant={variant}
          opts={opts}
          mode="viewer"
          exploded={exploded}
          autoRotate={autoRotate}
          interactive
          resetKey={resetKey}
          hotspotRefs={hotspotRefs}
        />
        {notes && (
          <div className="hotspots">
            {hotspots.map((h) => (
              <div key={h.id} className={"hs" + (openNote === h.id ? " open" : "")} ref={(el) => void (hotspotRefs.current[h.id] = el)} style={{ transform: "translate3d(-100px,-100px,0)" }}>
                <button className="hs-dot" aria-label={h.title} aria-expanded={openNote === h.id} onClick={() => setOpenNote((o) => (o === h.id ? null : h.id))} />
                <div className="hs-card" role="note">
                  <strong>{h.title}</strong>
                  {h.text}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="viewer-top">
          <button className="chip" onClick={onClose} ref={closeRef} data-testid="close-sheet">
            <ArrowLeft size={15} /> Catalogue
          </button>
          <span className="crumbs">
            {p.category} / <b>{p.name}</b>
          </span>
          <button className={"icon-btn" + (bump ? " bump" : "")} key={bump} style={{ marginLeft: "auto", background: "var(--papier)" }} onClick={onOpenCart} data-cart-target aria-label={`Panier, ${cartCount} article(s)`}>
            <ShoppingBag size={18} />
            {cartCount > 0 && <span className="count">{cartCount}</span>}
          </button>
        </div>
        <div className="viewer-tools">
          <button className="chip" aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
            <span className="t-lg">Rotation auto</span>
            <span className="t-sm">Rotation</span>
          </button>
          {p.explode && (
            <button className="chip" aria-pressed={exploded} onClick={() => setExploded((v) => !v)} data-testid="explode">
              <span className="t-lg">Vue éclatée</span>
              <span className="t-sm">Éclater</span>
            </button>
          )}
          <button className="chip" aria-pressed={notes} onClick={() => setNotes((v) => !v)}>
            <span className="t-lg">Annotations</span>
            <span className="t-sm">Notes</span>
          </button>
          <button className="chip" onClick={() => setResetKey((k) => k + 1)}>
            Recentrer
          </button>
          <span className="hint">Glisser pour tourner · molette ou pincer pour zoomer</span>
        </div>
      </div>

      <aside className="panel" aria-label="Configuration et achat">
        <div className="panel-body">
          <div className="panel-meta">
            <span className="ref">
              {p.ref} · {p.category}
            </span>
            <span className={"stock" + (stockLow ? " low" : "")}>{stockLow ? `Plus que ${p.stock} en stock` : `En stock · ${p.stock} pièces`}</span>
          </div>
          <div>
            <h2 className="p-name" id="sheet-title">
              {p.name}
            </h2>
            <p className="p-tag">{p.tagline}</p>
          </div>
          <div className="rating">
            <Stars value={p.rating} />
            <span className="mono">{p.rating.toFixed(1).replace(".", ",")}</span>
            <span style={{ color: "var(--muted)" }}>· {p.reviewCount} avis vérifiés</span>
          </div>
          <div className="price-row">
            <span className="price" data-testid="price">
              {euros(price)}
            </span>
            <small>TTC · TVA 20 % incluse</small>
          </div>

          <fieldset className="opt">
            <legend>
              Coloris <b>{variant.name}</b>
            </legend>
            <div className="colors" role="radiogroup" aria-label="Coloris">
              {p.variants.map((v) => (
                <button key={v.id} role="radio" aria-checked={v.id === variant.id} aria-label={v.name} title={v.name} className="color" style={{ background: v.swatch }} onClick={() => setVariantId(v.id)} data-testid={`color-${v.id}`} />
              ))}
            </div>
          </fieldset>

          {p.options.map((o) => (
            <fieldset className="opt" key={o.id}>
              <legend>{o.label}</legend>
              <div className="seg" role="radiogroup" aria-label={o.label}>
                {o.choices.map((c) => (
                  <button key={c.id} role="radio" aria-checked={opts[o.id] === c.id} onClick={() => setOpts((s) => ({ ...s, [o.id]: c.id }))}>
                    {c.label}
                    <small>{c.delta ? `+ ${euros(c.delta)}` : c.note ?? "inclus"}</small>
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="buy buy-inline">
            <div className="qty" role="group" aria-label="Quantité">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Diminuer la quantité">
                <Minus size={16} />
              </button>
              <output aria-live="polite">{qty}</output>
              <button onClick={() => setQty((q) => Math.min(cap, q + 1))} disabled={qty >= cap} aria-label="Augmenter la quantité">
                <Plus size={16} />
              </button>
            </div>
            {addBtn}
            <button className="heart" aria-pressed={wished} aria-label={wished ? "Retirer des envies" : "Ajouter aux envies"} onClick={onWish}>
              <Heart size={19} />
            </button>
          </div>
          {(limitMsg || qty >= cap) && (
            <p className="qty-note" role="status">
              {limitMsg ?? (cap < 9 ? `Quantité maximale : ${cap}, soit tout le stock disponible.` : `Quantité maximale : ${cap} par commande.`)}
            </p>
          )}
          <p className="ship-note">
            <Truck size={16} /> {price * qty >= FREE_SHIPPING ? "Livraison offerte" : `Livraison offerte dès ${euros(FREE_SHIPPING)}`} · expédié sous 48 h depuis Lyon
          </p>

          <p className="desc">{p.description}</p>

          <div>
            <h3 className="h-sub">Caractéristiques</h3>
            <dl className="specs">
              {p.specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="h-sub">Avis clients · {p.reviewCount}</h3>
            <div className="reviews">
              {p.reviews.map((r) => (
                <article className="review" key={r.author}>
                  <header>
                    <strong>
                      {r.author} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {r.city}</span>
                    </strong>
                    <Stars value={r.note} />
                  </header>
                  <p>{r.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="buybar">
          <span className="price">{euros(price * qty)}</span>
          {addBtn}
        </div>
      </aside>
    </div>
  );
}
