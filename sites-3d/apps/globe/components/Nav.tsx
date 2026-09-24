"use client";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  ["#passerelle", "Tableau de bord"],
  ["#fonctions", "Fonctionnalités"],
  ["#integrations", "Intégrations"],
  ["#tarifs", "Tarifs"],
  ["#faq", "FAQ"],
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={"nav" + (scrolled ? " is-scrolled" : "") + (open ? " is-open" : "")}>
      <a href="#top" className="brand" aria-label="Sillage, retour en haut">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M4 19c4-3 8 3 12 0s8-3 12 0" fill="none" stroke="var(--balise)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="16" cy="11" r="2.4" fill="currentColor" />
        </svg>
        <span>Sillage</span>
      </a>
      <nav id="menu" aria-label="Navigation principale">
        {LINKS.map(([h, l]) => (
          <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>
        ))}
      </nav>
      <div className="nav-cta">
        <a className="btn btn-primary btn-sm" href="#demo">Demander une démo</a>
        <button className="icon-btn menu-btn" aria-expanded={open} aria-controls="menu" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
