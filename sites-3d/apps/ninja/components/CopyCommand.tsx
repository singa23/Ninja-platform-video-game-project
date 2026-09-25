"use client";
import { useRef, useState } from "react";

export default function CopyCommand({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const code = useRef<HTMLElement>(null);
  const selectAll = () => {
    try {
      const sel = window.getSelection();
      const r = document.createRange();
      if (!sel || !code.current) return;
      r.selectNodeContents(code.current);
      sel.removeAllRanges();
      sel.addRange(r);
    } catch { /* sélection indisponible */ }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setState("ok");
    } catch {
      // presse-papiers refusé (cadre sandboxé) : on sélectionne la commande pour un Ctrl+C / appui long
      selectAll();
      setState("fail");
    }
    window.setTimeout(() => setState("idle"), 2400);
  };
  return (
    <div className="cmd">
      <code ref={code}>{command}</code>
      <button type="button" className="cmd-btn" onClick={copy} aria-live="polite">
        {state === "ok" ? "Copié" : state === "fail" ? "Texte sélectionné" : "Copier"}
      </button>
    </div>
  );
}
