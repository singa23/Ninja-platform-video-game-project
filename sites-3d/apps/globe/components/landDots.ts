import { feature } from "topojson-client";
import land from "world-atlas/land-110m.json";
import type { Topology, GeometryCollection } from "topojson-specification";

type Ring = number[][];
type Poly = { rings: Ring[]; minX: number; maxX: number; minY: number; maxY: number };

function pointInRing(x: number, y: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Renvoie des couples [lat, lon] (degrés) sur une grille ~équi-aire, uniquement sur les terres. */
export function landPoints(stepDeg = 1.1): Float32Array {
  const topo = land as unknown as Topology;
  const fc = feature(topo, topo.objects.land as GeometryCollection) as unknown as GeoJSON.FeatureCollection;
  const polys: Poly[] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    const list = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const rings of list as Ring[][]) {
      let minX = 180, maxX = -180, minY = 90, maxY = -90;
      for (const [x, y] of rings[0]) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      polys.push({ rings, minX, maxX, minY, maxY });
    }
  }
  const out: number[] = [];
  let row = 0;
  for (let lat = -84; lat <= 84; lat += stepDeg, row++) {
    const c = Math.cos((lat * Math.PI) / 180);
    const n = Math.max(1, Math.round((360 * c) / stepDeg));
    const off = row % 2 ? 0.5 : 0; // quinconce
    for (let k = 0; k < n; k++) {
      const lon = -180 + ((k + off) * 360) / n;
      for (const p of polys) {
        if (lon < p.minX || lon > p.maxX || lat < p.minY || lat > p.maxY) continue;
        if (pointInRing(lon, lat, p.rings[0])) {
          let hole = false;
          for (let h = 1; h < p.rings.length; h++) if (pointInRing(lon, lat, p.rings[h])) { hole = true; break; }
          if (!hole) { out.push(lat, lon); break; }
        }
      }
    }
  }
  return new Float32Array(out);
}
