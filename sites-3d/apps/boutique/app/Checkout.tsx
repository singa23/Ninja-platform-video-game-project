"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Lock, Info } from "lucide-react";
import { byId, euros, unitPrice, type Product } from "./data";
import { totals, useShop, type CartLine } from "./store";
import { Summary, shipLabel } from "./CartDrawer";

type Step = "livraison" | "paiement" | "confirmation";
type Ship = { prenom: string; nom: string; email: string; tel: string; adresse: string; cp: string; ville: string; pays: string; mode: "standard" | "express" };
type Pay = { titulaire: string; numero: string; exp: string; cvc: string };
type Errors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function luhn(n: string) {
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function validateShip(s: Ship): Errors {
  const e: Errors = {};
  if (s.prenom.trim().length < 2) e.prenom = "Indiquez votre prénom.";
  if (s.nom.trim().length < 2) e.nom = "Indiquez votre nom.";
  if (!EMAIL.test(s.email.trim())) e.email = "Adresse e-mail invalide (ex. nom@domaine.fr).";
  if (s.tel.trim() && !/^(\+33\s?|0)[1-9](\s?\d{2}){4}$/.test(s.tel.trim())) e.tel = "Format attendu : 06 12 34 56 78.";
  if (s.adresse.trim().length < 6) e.adresse = "Adresse trop courte.";
  if (!/^\d{5}$/.test(s.cp.trim())) e.cp = "5 chiffres.";
  if (s.ville.trim().length < 2) e.ville = "Indiquez la ville.";
  return e;
}

function validatePay(p: Pay): Errors {
  const e: Errors = {};
  const num = p.numero.replace(/\s/g, "");
  if (p.titulaire.trim().length < 3) e.titulaire = "Nom tel qu'il figure sur la carte.";
  if (!/^\d{16}$/.test(num) || !luhn(num)) e.numero = "Numéro invalide. Pour la démo : 4242 4242 4242 4242.";
  const m = /^(\d{2})\s?\/\s?(\d{2})$/.exec(p.exp.trim());
  if (!m) e.exp = "Format MM/AA.";
  else {
    const mm = Number(m[1]);
    const yy = 2000 + Number(m[2]);
    const now = new Date();
    if (mm < 1 || mm > 12) e.exp = "Mois invalide.";
    else if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1)) e.exp = "Carte expirée.";
  }
  if (!/^\d{3}$/.test(p.cvc.trim())) e.cvc = "3 chiffres au dos.";
  return e;
}

function addBusinessDays(d: Date, n: number) {
  const r = new Date(d);
  while (n > 0) {
    r.setDate(r.getDate() + 1);
    const w = r.getDay();
    if (w !== 0 && w !== 6) n--;
  }
  return r;
}

type Field = { id: string; label: string; cls?: string; type?: string; auto?: string; hint?: string; inputMode?: "numeric" | "email" | "tel" | "text"; placeholder?: string; mono?: boolean };

function Input<T extends Record<string, string>>({ f, v, set, err, touched, onBlur }: { f: Field; v: T; set: (k: string, val: string) => void; err?: string; touched: boolean; onBlur: () => void }) {
  const showErr = touched && err;
  return (
    <div className={"f " + (f.cls ?? "")}>
      <label htmlFor={"f-" + f.id}>
        {f.label} {f.hint && <small>{f.hint}</small>}
      </label>
      <input
        id={"f-" + f.id}
        name={f.id}
        type={f.type ?? "text"}
        autoComplete={f.auto}
        inputMode={f.inputMode}
        placeholder={f.placeholder}
        value={v[f.id] ?? ""}
        onChange={(e) => set(f.id, e.target.value)}
        onBlur={onBlur}
        aria-invalid={showErr ? true : undefined}
        aria-describedby={showErr ? "e-" + f.id : undefined}
        data-testid={"f-" + f.id}
        className={f.mono ? "mono" : undefined}
      />
      {showErr && (
        <span className="err" id={"e-" + f.id}>
          {err}
        </span>
      )}
    </div>
  );
}

function fmtCard(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}
function fmtExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

type Snapshot = { no: string; lines: CartLine[]; t: ReturnType<typeof totals>; ship: Ship; eta: string; last4: string };

export default function Checkout({ onClose, onBackToShop }: { onClose: () => void; onBackToShop: () => void }) {
  const lines = useShop((s) => s.lines);
  const promo = useShop((s) => s.promo);
  const clear = useShop((s) => s.clear);
  const [step, setStep] = useState<Step>("livraison");
  const [ship, setShip] = useState<Ship>({ prenom: "", nom: "", email: "", tel: "", adresse: "", cp: "", ville: "", pays: "France métropolitaine", mode: "standard" });
  const [pay, setPay] = useState<Pay>({ titulaire: "", numero: "", exp: "", cvc: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [processing, setProcessing] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const express = ship.mode === "express";
  const t = totals(lines, promo, express);

  useEffect(() => {
    rootRef.current?.scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  const shipErr = validateShip(ship);
  const payErr = validatePay(pay);

  const focusFirst = (errs: Errors) => {
    const k = Object.keys(errs)[0];
    if (k) document.getElementById("f-" + k)?.focus();
  };

  const submitShip = (e: React.FormEvent) => {
    e.preventDefault();
    const all = Object.fromEntries(Object.keys({ ...ship }).map((k) => [k, true]));
    setTouched((x) => ({ ...x, ...all }));
    if (Object.keys(shipErr).length) return focusFirst(shipErr);
    setStep("paiement");
  };

  const submitPay = (e: React.FormEvent) => {
    e.preventDefault();
    const all = Object.fromEntries(Object.keys({ ...pay }).map((k) => [k, true]));
    setTouched((x) => ({ ...x, ...all }));
    if (Object.keys(payErr).length) return focusFirst(payErr);
    setProcessing(true);
    setTimeout(() => {
      const now = new Date();
      const no = `SO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const eta = addBusinessDays(now, express ? 1 : 3).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      setSnap({ no, lines: lines.slice(), t, ship: { ...ship }, eta, last4: pay.numero.replace(/\s/g, "").slice(-4) });
      // rien n'est stocké ni envoyé : on efface immédiatement les données de carte
      setPay({ titulaire: "", numero: "", exp: "", cvc: "" });
      clear();
      setProcessing(false);
      setStep("confirmation");
    }, 1300);
  };

  const shipFields: Field[] = [
    { id: "prenom", label: "Prénom", cls: "h keep", auto: "given-name" },
    { id: "nom", label: "Nom", cls: "h keep", auto: "family-name" },
    { id: "email", label: "E-mail", cls: "tt", type: "email", auto: "email", inputMode: "email", hint: "pour le suivi" },
    { id: "tel", label: "Téléphone", cls: "t", type: "tel", auto: "tel", inputMode: "tel", hint: "facultatif" },
    { id: "adresse", label: "Adresse", auto: "street-address", placeholder: "N° et voie" },
    { id: "cp", label: "Code postal", cls: "t", auto: "postal-code", inputMode: "numeric", mono: true },
    { id: "ville", label: "Ville", cls: "tt", auto: "address-level2" },
  ];
  const payFields: Field[] = [
    { id: "titulaire", label: "Titulaire de la carte", auto: "off" },
    { id: "numero", label: "Numéro de carte", auto: "off", inputMode: "numeric", placeholder: "4242 4242 4242 4242", mono: true },
    { id: "exp", label: "Expiration", cls: "h keep", auto: "off", inputMode: "numeric", placeholder: "MM/AA", mono: true },
    { id: "cvc", label: "Cryptogramme", cls: "h keep", auto: "off", inputMode: "numeric", placeholder: "123", mono: true },
  ];

  const steps: [Step, string][] = [
    ["livraison", "Livraison"],
    ["paiement", "Paiement"],
    ["confirmation", "Confirmation"],
  ];
  const idx = steps.findIndex(([s]) => s === step);

  return (
    <div className="checkout" role="dialog" aria-modal="true" aria-labelledby="co-title" ref={rootRef} data-testid="checkout-page">
      <div className="co-head">
        <a className="logo" href="#haut" onClick={(e) => (e.preventDefault(), step === "confirmation" ? onBackToShop() : onClose())}>
          <span className="logo-mark" aria-hidden />
          Studio Oblique
        </a>
        <ol className="steps" aria-label="Étapes de commande">
          {steps.map(([s, l], i) => (
            <li key={s} aria-current={s === step ? "step" : undefined} className={i < idx ? "done" : ""}>
              <span className="n">{i < idx ? <Check size={12} /> : i + 1}</span>
              <span className="lbl">{l}</span>
            </li>
          ))}
        </ol>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <Lock size={13} /> Paiement de démonstration
        </span>
      </div>

      {step !== "confirmation" && (
        <div className="co-grid">
          <div>
            {/* mobile : récapitulatif repliable au-dessus du formulaire */}
            <details className="sum-mini" data-testid="summary-mini">
              <summary>
                <span>
                  Voir le récapitulatif <small>· {t.count} article{t.count > 1 ? "s" : ""}</small>
                </span>
                <span className="mono">{euros(t.total)}</span>
              </summary>
              <div className="sum-mini-body">
                {lines.map((l) => (
                  <SummaryLine key={l.key} l={l} />
                ))}
                <Summary express={express} testid="summary-mini-totals" />
                {step === "paiement" && (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                    Livraison : {ship.prenom} {ship.nom}, {ship.adresse}, {ship.cp} {ship.ville}
                  </p>
                )}
              </div>
            </details>
            {step === "livraison" ? (
              <form className="form" onSubmit={submitShip} noValidate>
                <h1 className="co-title" id="co-title" tabIndex={-1} ref={titleRef} style={{ gridColumn: "span 6" }}>
                  Adresse de livraison
                </h1>
                {shipFields.map((f) => (
                  <Input key={f.id} f={f} v={ship} set={(k, val) => setShip((s) => ({ ...s, [k]: val }))} err={shipErr[f.id]} touched={!!touched[f.id]} onBlur={() => setTouched((x) => ({ ...x, [f.id]: true }))} />
                ))}
                <div className="f">
                  <label htmlFor="f-pays">Pays</label>
                  <select id="f-pays" value={ship.pays} onChange={(e) => setShip((s) => ({ ...s, pays: e.target.value }))}>
                    <option>France métropolitaine</option>
                    <option>Belgique</option>
                    <option>Luxembourg</option>
                    <option>Suisse</option>
                  </select>
                </div>
                <fieldset className="modes">
                  <legend>Mode de livraison</legend>
                  <label className="mode">
                    <input type="radio" name="mode" checked={!express} onChange={() => setShip((s) => ({ ...s, mode: "standard" }))} />
                    <span>
                      Colis à domicile, 2 à 3 jours ouvrés
                      <small>Suivi par e-mail, remise contre signature</small>
                    </span>
                    <span className="mono">{t.shipping === 0 ? "Offert" : euros(t.shipping)}</span>
                  </label>
                  <label className="mode">
                    <input type="radio" name="mode" checked={express} onChange={() => setShip((s) => ({ ...s, mode: "express" }))} />
                    <span>
                      Express 24 h
                      <small>Commande avant 13 h, livrée le lendemain</small>
                    </span>
                    <span className="mono">+ {euros(990)}</span>
                  </label>
                </fieldset>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={onClose}>
                    <ArrowLeft size={16} /> Retour au panier
                  </button>
                  <button type="submit" className="btn btn-primary" data-testid="to-payment">
                    Continuer vers le paiement
                  </button>
                </div>
              </form>
            ) : (
              <form className="form" onSubmit={submitPay} noValidate>
                <h1 className="co-title" id="co-title" tabIndex={-1} ref={titleRef} style={{ gridColumn: "span 6" }}>
                  Paiement
                </h1>
                <div className="demo" role="note" data-testid="demo-banner">
                  <Info size={20} style={{ flex: "none", marginTop: 1 }} />
                  <span>
                    <strong>Démo : aucun paiement réel.</strong>
                    Utilisez la carte de test <code>4242 4242 4242 4242</code>, une date future et 3 chiffres. Rien n'est stocké ni envoyé : les champs sont effacés dès la validation.
                  </span>
                </div>
                <div className="card-visual" aria-hidden>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="chipset" />
                    <span style={{ fontSize: 12, opacity: 0.8 }}>CARTE DE TEST</span>
                  </div>
                  <span className="num">{fmtCard(pay.numero) || "•••• •••• •••• ••••"}</span>
                  <div className="row">
                    <span>{pay.titulaire || "Titulaire"}</span>
                    <span>{pay.exp || "MM/AA"}</span>
                  </div>
                </div>
                {payFields.map((f) => (
                  <Input
                    key={f.id}
                    f={f}
                    v={pay}
                    set={(k, val) => setPay((s) => ({ ...s, [k]: k === "numero" ? fmtCard(val) : k === "exp" ? fmtExp(val) : k === "cvc" ? val.replace(/\D/g, "").slice(0, 3) : val }))}
                    err={payErr[f.id]}
                    touched={!!touched[f.id]}
                    onBlur={() => setTouched((x) => ({ ...x, [f.id]: true }))}
                  />
                ))}
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setStep("livraison")}>
                    <ArrowLeft size={16} /> Livraison
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={processing} data-testid="pay">
                    {processing ? (
                      <>
                        <span className="spinner" /> Autorisation…
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> Payer {euros(t.total)} (démo)
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
          <aside className="summary" aria-label="Récapitulatif">
            <h3>Récapitulatif</h3>
            {lines.map((l) => (
              <SummaryLine key={l.key} l={l} />
            ))}
            <Summary express={express} />
            {step === "paiement" && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                Livraison : {ship.prenom} {ship.nom}, {ship.adresse}, {ship.cp} {ship.ville}
              </p>
            )}
          </aside>
        </div>
      )}

      {step === "confirmation" && snap && (
        <div className="confirm" data-testid="confirmation">
          <span className="check">
            <Check size={30} />
          </span>
          <h1 className="co-title" id="co-title" tabIndex={-1} ref={titleRef} style={{ margin: 0 }}>
            Merci {snap.ship.prenom}, commande confirmée.
          </h1>
          <div>
            <p className="h-sub" style={{ marginBottom: 6 }}>
              Numéro de commande
            </p>
            <span className="order-no" data-testid="order-number">
              {snap.no}
            </span>
          </div>
          <p style={{ margin: 0 }}>
            Un récapitulatif serait envoyé à <b>{snap.ship.email}</b>. Livraison estimée <b>{snap.eta}</b>. Commande de démonstration : aucun débit n'a eu lieu (carte de test se terminant par {snap.last4}).
          </p>
          <div className="confirm-grid">
            <div>
              <p className="h-sub">Articles</p>
              {snap.lines.map((l) => (
                <SummaryLine key={l.key} l={l} />
              ))}
            </div>
            <div>
              <p className="h-sub">Montant</p>
              <dl className="sum">
                <div>
                  <dt>Sous-total</dt>
                  <dd>{euros(snap.t.subtotal)}</dd>
                </div>
                {snap.t.discount > 0 && (
                  <div className="discount">
                    <dt>Remise −10 %</dt>
                    <dd>−{euros(snap.t.discount)}</dd>
                  </div>
                )}
                <div>
                  <dt>{shipLabel(snap.ship.mode === "express")}</dt>
                  <dd>{snap.t.shipping + snap.t.expressFee === 0 ? "Offerte" : euros(snap.t.shipping + snap.t.expressFee)}</dd>
                </div>
                <div className="total">
                  <dt>Total TTC</dt>
                  <dd>{euros(snap.t.total)}</dd>
                </div>
                <div className="vat">
                  <dt>dont TVA 20 %</dt>
                  <dd>{euros(snap.t.vat)}</dd>
                </div>
              </dl>
              <p style={{ fontSize: 13, margin: "12px 0 0", color: "var(--muted)" }}>
                {snap.ship.adresse}, {snap.ship.cp} {snap.ship.ville} · {snap.ship.mode === "express" ? "Express 24 h" : "Colis à domicile"}
              </p>
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={onBackToShop} data-testid="back-to-shop">
              Continuer mes achats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryLine({ l }: { l: CartLine }) {
  const p = byId(l.productId) as Product;
  const v = p.variants.find((x) => x.id === l.variantId) ?? p.variants[0];
  return (
    <div className="s-line">
      <span className="line-sw" style={{ background: v.swatch, width: 14, height: 14 }} aria-hidden />
      <span>
        {p.name} × {l.qty}
        <small>{[v.name, ...p.options.map((o) => o.choices.find((c) => c.id === l.options[o.id])?.label).filter(Boolean)].join(" · ")}</small>
      </span>
      <span className="mono">{euros(unitPrice(p, l.options) * l.qty)}</span>
    </div>
  );
}
