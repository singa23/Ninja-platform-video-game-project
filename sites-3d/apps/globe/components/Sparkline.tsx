"use client";
import { useState } from "react";

export default function Sparkline({ values, label, unit = "h", w = 132, h = 40 }: { values: number[]; label: string; unit?: string; w?: number; h?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const min = Math.min(...values), max = Math.max(...values);
  const pad = 5;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  const cur = hi ?? last;
  return (
    <figure className="spark" onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={`${label} : de ${values[0]} à ${values[last]} ${unit}`}>
        <path d={d} fill="none" stroke="var(--lagon)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(cur)} cy={y(values[cur])} r="3.5" fill="var(--ecume)" stroke="var(--marine)" strokeWidth="2" />
        {values.map((_, i) => (
          <rect key={i} x={x(i) - (w - pad * 2) / (values.length - 1) / 2} y={0} width={(w - pad * 2) / (values.length - 1)} height={h} fill="transparent" onMouseEnter={() => setHi(i)} />
        ))}
      </svg>
      <figcaption className="mono tiny muted">{hi === null ? "8 sem." : `S-${last - hi} : ${values[hi].toLocaleString("fr-FR")} ${unit}`}</figcaption>
    </figure>
  );
}
