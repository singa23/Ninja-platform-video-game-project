"use client";
import { create } from "zustand";
import { byId, unitPrice, FREE_SHIPPING, SHIPPING_COST, PROMO_CODE } from "./data";

export type CartLine = { key: string; productId: string; variantId: string; options: Record<string, string>; qty: number };

type State = {
  lines: CartLine[];
  wishlist: string[];
  promo: string | null;
  hydrated: boolean;
  /** Ajoute au panier ; renvoie la quantité réellement ajoutée (plafond : 9 et le stock). */
  add: (l: Omit<CartLine, "key">) => number;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  toggleWish: (id: string) => void;
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
  hydrate: () => void;
};

const KEY = "studio-oblique:v1";

/** Quantité maximale par ligne : 9, ou moins si le stock est plus bas. */
export function maxQty(productId: string) {
  return Math.min(9, byId(productId)?.stock ?? 9);
}

function save(s: Pick<State, "lines" | "wishlist" | "promo">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ lines: s.lines, wishlist: s.wishlist, promo: s.promo }));
  } catch {
    /* stockage indisponible : on continue sans persistance */
  }
}

export const useShop = create<State>((set, get) => ({
  lines: [],
  wishlist: [],
  promo: null,
  hydrated: false,
  add: (l) => {
    const key = `${l.productId}|${l.variantId}|${Object.entries(l.options).map(([k, v]) => `${k}:${v}`).join(",")}`;
    const lines = [...get().lines];
    const cap = maxQty(l.productId);
    const i = lines.findIndex((x) => x.key === key);
    const before = i >= 0 ? lines[i].qty : 0;
    const after = Math.min(cap, before + l.qty);
    if (after === before) return 0;
    if (i >= 0) lines[i] = { ...lines[i], qty: after };
    else lines.push({ ...l, key, qty: after });
    set({ lines });
    return after - before;
  },
  setQty: (key, qty) =>
    set({ lines: get().lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(maxQty(l.productId), qty)) } : l)) }),
  remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
  clear: () => set({ lines: [], promo: null }),
  toggleWish: (id) => {
    const w = get().wishlist;
    set({ wishlist: w.includes(id) ? w.filter((x) => x !== id) : [...w, id] });
  },
  applyPromo: (code) => {
    if (code.trim().toUpperCase() === PROMO_CODE) {
      set({ promo: PROMO_CODE });
      return true;
    }
    return false;
  },
  removePromo: () => set({ promo: null }),
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const lines: CartLine[] = Array.isArray(d.lines) ? d.lines.filter((l: CartLine) => l && byId(l.productId)) : [];
        const wishlist: string[] = Array.isArray(d.wishlist) ? d.wishlist.filter((x: string) => byId(x)) : [];
        set({ lines, wishlist, promo: d.promo === PROMO_CODE ? PROMO_CODE : null });
      }
    } catch {
      /* ignore */
    }
    set({ hydrated: true });
  },
}));

useShop.subscribe((s) => {
  if (s.hydrated) save(s);
});

export function totals(lines: CartLine[], promo: string | null, express = false) {
  let subtotal = 0;
  let count = 0;
  for (const l of lines) {
    const p = byId(l.productId);
    if (!p) continue;
    subtotal += unitPrice(p, l.options) * l.qty;
    count += l.qty;
  }
  const discount = promo ? Math.round(subtotal * 0.1) : 0;
  const net = subtotal - discount;
  const shipping = count === 0 ? 0 : net >= FREE_SHIPPING ? 0 : SHIPPING_COST;
  const expressFee = express && count > 0 ? 990 : 0;
  const total = net + shipping + expressFee;
  const vat = Math.round(total - total / 1.2);
  return { subtotal, discount, net, shipping, expressFee, total, vat, count, missing: Math.max(0, FREE_SHIPPING - net) };
}
