// Caractères japonais dessinés à la main (tracés SVG dans une boîte 100×100),
// réutilisés en SVG (DOM) et en Path2D (textures canvas). Aucune police japonaise.

export const GLYPHS: Record<string, string[]> = {
  // 忍 — shinobi : 刃 (la lame) au-dessus de 心 (le cœur)
  shinobi: [
    "M28 16 H70 Q75 16 74 22 L71 42 Q70 50 61 46",
    "M50 6 Q50 32 24 52",
    "M33 29 L41 37",
    "M16 70 L21 84",
    "M33 60 Q28 90 46 90 H68 Q76 90 79 79",
    "M50 60 L57 71",
    "M70 60 L83 74",
  ],
  ni: ["M28 30 H72", "M14 76 H86"],
  n: ["M22 24 L40 38", "M18 84 Q60 74 84 28"],
  ji: ["M18 22 L32 34", "M12 46 L28 58", "M16 88 Q58 78 80 34", "M70 10 L76 22", "M82 6 L88 18"],
  ya: ["M30 52 Q58 44 76 48 L66 64", "M44 36 L54 94"],
  ko: ["M22 24 H78 V80 H22"],
  i: ["M72 10 Q52 44 16 60", "M54 36 V94"],
};

/** ニンジャコイ — « Ninjakoï » en katakana */
export const KATAKANA_TITLE = ["ni", "n", "ji", "ya", "ko", "i"];

export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  size: number,
  width = 9,
) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of GLYPHS[key]) ctx.stroke(new Path2D(d));
  ctx.restore();
}
