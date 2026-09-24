import { GLYPHS } from "./glyphs";

/** Glyphe dessiné en SVG (tracés au pinceau), jamais une police japonaise. */
export function Glyph({ name, size = 40, stroke = "currentColor", width = 9, className, title }: {
  name: string; size?: number; stroke?: string; width?: number; className?: string; title?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true} aria-label={title}>
      {GLYPHS[name].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Sceau hanko vermillon avec 忍 évidé. */
export function Hanko({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <rect x="4" y="4" width="92" height="92" rx="10" fill="var(--shu)" />
      <rect x="11" y="11" width="78" height="78" rx="5" fill="none" stroke="var(--washi)" strokeWidth="2.5" opacity=".55" />
      <g transform="translate(17 17) scale(.66)">
        {GLYPHS.shinobi.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--washi)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    </svg>
  );
}
