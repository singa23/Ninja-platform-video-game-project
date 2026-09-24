"use client";

export type VoxelCell = { gx: number; gy: number; depth: number; colors: (string | null)[] };

/** Charge une image et renvoie ses pixels RGBA. */
export function loadPixels(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      resolve(g.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Transforme les sprites pixel-art du jeu (pixels de 5×5) en grille de voxels.
 * Chaque case garde une couleur par image d'animation (null = vide dans cette image).
 */
export function spritesToVoxels(frames: ImageData[], cell = 5): { cells: VoxelCell[]; w: number; h: number } {
  const w = Math.floor(frames[0].width / cell);
  const h = Math.max(...frames.map((f) => Math.floor(f.height / cell)));
  const grids = frames.map((f) => {
    const gw = Math.floor(f.width / cell), gh = Math.floor(f.height / cell);
    const grid: (string | null)[][] = [];
    for (let y = 0; y < h; y++) {
      grid.push([]);
      for (let x = 0; x < w; x++) {
        // on aligne les images par le bas (les pieds au sol)
        const sy = y - (h - gh);
        if (sy < 0 || x >= gw) { grid[y].push(null); continue; }
        const i = ((sy * cell + 2) * f.width + (x * cell + 2)) * 4;
        const a = f.data[i + 3];
        if (a < 128) { grid[y].push(null); continue; }
        const r = f.data[i], g = f.data[i + 1], b = f.data[i + 2];
        grid[y].push(`rgb(${r},${g},${b})`);
      }
    }
    return grid;
  });
  const cells: VoxelCell[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const colors = grids.map((g) => g[y][x]);
      if (colors.every((c) => c === null)) continue;
      // profondeur constante : une silhouette nette, sans marches
      cells.push({ gx: x, gy: h - 1 - y, depth: 3, colors });
    }
  }
  return { cells, w, h };
}
