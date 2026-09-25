"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { byId, euros, unitPrice, FREE_SHIPPING, PROMO_CODE } from "./data";
import { maxQty, totals, useShop } from "./store";

type Props = { open: boolean; onClose: () => void; onCheckout: () => void; onOpenProduct: (id: string) => void };

/** Libellé unique de la ligne livraison, identique dans le panier, le tunnel et la confirmation. */
export const shipLabel = (express: boolean) => (express ? "Livraison express 24 h" : "Livraison colis 2–3 j");

export function Summary({ express = false, showVat = true, testid = "summary" }: { express?: boolean; showVat?: boolean; testid?: string }) {
  const lines = useShop((s) => s.lines);
  const promo = useShop((s) => s.promo);
  const t = totals(lines, promo, express);
  return (
    <dl className="sum" data-testid={testid}>
      <div>
        <dt>Sous-total</dt>
        <dd>{euros(t.subtotal)}</dd>
      </div>
      {t.discount > 0 && (
        <div className="discount">
          <dt>Remise {PROMO_CODE} (−10 %)</dt>
          <dd data-testid="discount">−{euros(t.discount)}</dd>
        </div>
      )}
      <div>
        <dt>{shipLabel(express)}</dt>
        <dd>{t.shipping + t.expressFee === 0 ? "Offerte" : euros(t.shipping + t.expressFee)}</dd>
      </div>
      <div className="total">
        <dt>Total TTC</dt>
        <dd data-testid={testid === "summary" ? "total" : undefined}>{euros(t.total)}</dd>
      </div>
      {showVat && (
        <div className="vat">
          <dt>dont TVA 20 %</dt>
          <dd>{euros(t.vat)}</dd>
        </div>
      )}
    </dl>
  );
}

export default function CartDrawer({ open, onClose, onCheckout, onOpenProduct }: Props) {
  const lines = useShop((s) => s.lines);
  const promo = useShop((s) => s.promo);
  const setQty = useShop((s) => s.setQty);
  const remove = useShop((s) => s.remove);
  const applyPromo = useShop((s) => s.applyPromo);
  const removePromo = useShop((s) => s.removePromo);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = totals(lines, promo);

  useEffect(() => {
    if (open) setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 50);
    else setMsg(null);
  }, [open]);

  const submitPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setMsg({ ok: false, text: "Saisissez un code." });
      return;
    }
    if (applyPromo(code)) {
      setMsg({ ok: true, text: "Code appliqué : −10 % sur les articles." });
      setCode("");
    } else setMsg({ ok: false, text: `« ${code.trim().toUpperCase()} » n'est pas un code valide.` });
  };

  const pct = Math.min(100, (t.net / FREE_SHIPPING) * 100);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" key="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            key="drawer"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            data-testid="cart-drawer"
          >
            <div className="drawer-head">
              <h2 id="cart-title">
                Panier <span className="mono" style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>({t.count})</span>
              </h2>
              <button className="icon-btn" onClick={onClose} ref={closeRef} aria-label="Fermer le panier">
                <X size={18} />
              </button>
            </div>
            {t.count > 0 && (
              <div className="freebar" aria-live="polite">
                {t.missing > 0 ? (
                  <>
                    Plus que <b className="mono">{euros(t.missing)}</b> pour la livraison offerte.
                  </>
                ) : (
                  <>Livraison offerte sur cette commande.</>
                )}
                <div className="track">
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            <div className="drawer-body">
              {lines.length === 0 ? (
                <div className="cart-empty">
                  <p>Votre panier est vide.</p>
                  <span style={{ color: "var(--muted)" }}>Configurez un objet dans le catalogue, il apparaîtra ici avec son coloris.</span>
                  <button className="btn btn-ghost" onClick={onClose}>
                    Continuer mes achats
                  </button>
                </div>
              ) : (
                lines.map((l) => {
                  const p = byId(l.productId)!;
                  const v = p.variants.find((x) => x.id === l.variantId) ?? p.variants[0];
                  const optLabel = p.options.map((o) => o.choices.find((c) => c.id === l.options[o.id])?.label).filter(Boolean);
                  const u = unitPrice(p, l.options);
                  return (
                    <div className="line" key={l.key} data-testid="cart-line">
                      <span className="line-sw" style={{ background: v.swatch }} aria-hidden />
                      <div>
                        <h3>
                          <button className="link-btn" style={{ color: "var(--ink)", textDecoration: "none", fontSize: 17, padding: 0, fontFamily: "var(--display)", fontWeight: 700 }} onClick={() => onOpenProduct(p.id)}>
                            {p.name}
                          </button>
                        </h3>
                        <p className="line-meta">
                          {v.name}
                          {optLabel.length ? " · " + optLabel.join(" · ") : ""} · <span className="mono">{euros(u)}</span>
                        </p>
                        <div className="line-ctrl">
                          <div className="qty" role="group" aria-label={`Quantité ${p.name}`}>
                            <button onClick={() => setQty(l.key, l.qty - 1)} disabled={l.qty <= 1} aria-label="Diminuer">
                              <Minus size={14} />
                            </button>
                            <output>{l.qty}</output>
                            <button onClick={() => setQty(l.key, l.qty + 1)} disabled={l.qty >= maxQty(l.productId)} aria-label="Augmenter" data-testid="line-plus">
                              <Plus size={14} />
                            </button>
                          </div>
                          <button className="link-btn" onClick={() => remove(l.key)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                      <span className="line-price">{euros(u * l.qty)}</span>
                    </div>
                  );
                })
              )}
            </div>
            {lines.length > 0 && (
              <div className="drawer-foot">
                {promo ? (
                  <p className="msg ok" style={{ margin: 0, display: "flex", justifyContent: "space-between" }}>
                    <span>
                      Code <b className="mono">{promo}</b> appliqué (−10 %)
                    </span>
                    <button className="link-btn" onClick={removePromo}>
                      Retirer
                    </button>
                  </p>
                ) : (
                  <form className="promo" onSubmit={submitPromo}>
                    <label className="sr-only" htmlFor="promo">
                      Code promo
                    </label>
                    <input id="promo" placeholder="Code promo" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" data-testid="promo-input" />
                    <button className="btn btn-ink" type="submit" data-testid="promo-apply">
                      Appliquer
                    </button>
                  </form>
                )}
                {msg && !msg.ok && <p className="msg err" role="alert">{msg.text}</p>}
                {msg && msg.ok && !promo && <p className="msg ok">{msg.text}</p>}
                <Summary />
                <button className="btn btn-primary" onClick={onCheckout} data-testid="checkout">
                  Passer commande · {euros(t.total)}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
