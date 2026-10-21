// L'appartement : grille, murs (sur les bords des cases), meubles, chemins.
import { W, D, FURN, FLOORS } from './data.js';

// Bords : 'v,x,z' = bord vertical sur la ligne X = x, entre z et z+1.
//         'h,x,z' = bord horizontal sur la ligne Z = z, entre x et x+1.
export const ek = (t, x, z) => t + ',' + x + ',' + z;
export const parseEdge = k => { const [t, x, z] = k.split(','); return { t, x: +x, z: +z }; };
export const isBoundary = (t, x, z) => (t === 'v' ? x === 0 || x === W : z === 0 || z === D);
export const edgeType = (home, t, x, z) => home.edges[ek(t, x, z)] || 'none';
const BLOCKS = { wall: 1, window: 1 };

export function defaultHome() {
  const edges = {};
  for (let x = 0; x < W; x++) { edges[ek('h', x, 0)] = 'wall'; edges[ek('h', x, D)] = 'wall'; edges[ek('h', x, 4)] = 'wall'; }
  for (let z = 0; z < D; z++) { edges[ek('v', 0, z)] = 'wall'; edges[ek('v', W, z)] = 'wall'; edges[ek('v', 8, z)] = 'wall'; }
  Object.assign(edges, {
    'h,3,4': 'door', 'v,8,2': 'door', 'v,8,6': 'door', 'h,5,9': 'entree',
    'h,2,0': 'window', 'h,5,0': 'window', 'h,10,0': 'window', 'h,1,9': 'window',
    'v,0,6': 'window', 'h,10,9': 'window', 'v,12,6': 'window',
  });
  const floors = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    floors.push(z < 4 ? (x < 8 ? 'parquet' : 'zellige_bleu') : (x < 8 ? 'carrelage' : 'terre'));
  }
  const furn = [
    { id: 1, type: 'lit', x: 1, z: 0, r: 0 },
    { id: 2, type: 'douche', x: 11, z: 0, r: 0 },
    { id: 3, type: 'frigo', x: 11, z: 4, r: 3 },
    { id: 4, type: 'cuisiniere', x: 11, z: 5, r: 3 },
    { id: 5, type: 'plan', x: 11, z: 6, r: 3 },
    { id: 6, type: 'banquette', x: 0, z: 5, r: 1 },
    { id: 7, type: 'banquette', x: 1, z: 4, r: 0 },
    { id: 8, type: 'tapis', x: 1, z: 5, r: 0 },
    { id: 9, type: 'mida', x: 2, z: 6, r: 0 },
    { id: 10, type: 'lanterne', x: 0, z: 4, r: 0 },
    { id: 11, type: 'plante', x: 7, z: 8, r: 0 },
  ];
  return { edges, floors, furn, wall: 'chaux', wainscot: 'vert', nextId: 12 };
}

// Taille au sol d'un meuble selon sa rotation (0 à 3, quart de tour).
export function footprint(type, r) {
  const f = FURN[type];
  return r % 2 ? { w: f.d, d: f.w } : { w: f.w, d: f.d };
}
export function furnTiles(f) {
  const { w, d } = footprint(f.type, f.r), out = [];
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push({ x: f.x + dx, z: f.z + dz });
  return out;
}
export function furnCenter(f) {
  const { w, d } = footprint(f.type, f.r);
  return { x: f.x + w / 2, z: f.z + d / 2 };
}
export const frontDir = r => [{ x: 0, z: 1 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: -1, z: 0 }][r];

export function blockedGrid(home, ignoreId) {
  const g = new Uint8Array(W * D);
  for (const f of home.furn) {
    if (f.id === ignoreId || FURN[f.type].sol) continue;
    for (const t of furnTiles(f)) g[t.z * W + t.x] = 1;
  }
  return g;
}

// Passage orthogonal d'une case à sa voisine (murs et fenêtres bloquent, portes non).
export function wallBetween(home, x, z, dx, dz) {
  let k;
  if (dx === 1) k = ek('v', x + 1, z);
  else if (dx === -1) k = ek('v', x, z);
  else if (dz === 1) k = ek('h', x, z + 1);
  else k = ek('h', x, z);
  return !!BLOCKS[home.edges[k]];
}
// Bord séparant deux cases voisines, quel que soit son type.
export function edgeKeyBetween(x, z, dx, dz) {
  if (dx === 1) return ek('v', x + 1, z);
  if (dx === -1) return ek('v', x, z);
  if (dz === 1) return ek('h', x, z + 1);
  return ek('h', x, z);
}
const inside = (x, z) => x >= 0 && z >= 0 && x < W && z < D;

// Plus court chemin (8 directions) vers la case cible la plus proche.
export function findPath(home, sx, sz, targets, blocked = blockedGrid(home)) {
  const goal = new Set(targets.map(t => t.z * W + t.x));
  if (!goal.size) return null;
  const start = sz * W + sx;
  const dist = new Float32Array(W * D).fill(Infinity), prev = new Int32Array(W * D).fill(-1);
  const done = new Uint8Array(W * D);
  dist[start] = 0;
  const can = (x, z, dx, dz) => inside(x + dx, z + dz) && !blocked[(z + dz) * W + x + dx] && !wallBetween(home, x, z, dx, dz);
  for (;;) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < W * D; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; best = i; }
    if (best < 0) return null;
    if (goal.has(best)) {
      const path = [];
      for (let i = best; i !== -1; i = prev[i]) path.unshift({ x: i % W, z: Math.floor(i / W) });
      return path;
    }
    done[best] = 1;
    const x = best % W, z = Math.floor(best / W);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      let ok;
      if (dx && dz) ok = can(x, z, dx, 0) && can(x + dx, z, 0, dz) && can(x, z, 0, dz) && can(x, z + dz, dx, 0);
      else ok = can(x, z, dx, dz);
      if (!ok) continue;
      const n = (z + dz) * W + x + dx, nd = bd + (dx && dz ? 1.414 : 1);
      if (nd < dist[n]) { dist[n] = nd; prev[n] = best; }
    }
  }
}

// Cases libres d'où l'on peut utiliser un meuble.
export function approachTiles(home, f, blocked = blockedGrid(home)) {
  const own = new Set(furnTiles(f).map(t => t.z * W + t.x)), out = [];
  for (const t of furnTiles(f)) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = t.x + dx, z = t.z + dz, i = z * W + x;
      if (!inside(x, z) || own.has(i) || blocked[i] || wallBetween(home, t.x, t.z, dx, dz)) continue;
      out.push({ x, z, from: t });
    }
  }
  return out;
}

export function entrance(home) {
  for (const k in home.edges) {
    if (home.edges[k] !== 'entree') continue;
    const e = parseEdge(k);
    if (e.t === 'h') return e.z === D ? { x: e.x, z: D - 1, out: { x: 0, z: 1 } } : { x: e.x, z: 0, out: { x: 0, z: -1 } };
    return e.x === W ? { x: W - 1, z: e.z, out: { x: 1, z: 0 } } : { x: 0, z: e.z, out: { x: -1, z: 0 } };
  }
  return { x: 0, z: 0, out: { x: 0, z: 1 } };
}

// Peut-on poser ce meuble ici ?
export function canPlace(home, type, x, z, r, ignoreId, charTile) {
  const { w, d } = footprint(type, r), sol = FURN[type].sol;
  if (x < 0 || z < 0 || x + w > W || z + d > D) return 'Hors de la maison.';
  const ent = entrance(home);
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
    const tx = x + dx, tz = z + dz;
    for (const f of home.furn) {
      if (f.id === ignoreId || !!FURN[f.type].sol !== !!sol) continue;
      if (furnTiles(f).some(t => t.x === tx && t.z === tz)) return 'La place est déjà prise.';
    }
    if (!sol && ent.x === tx && ent.z === tz) return "Laisse l'entrée libre.";
    if (!sol && charTile && charTile.x === tx && charTile.z === tz) return 'Ton personnage est sur cette case.';
    if (dx + 1 < w && edgeType(home, 'v', tx + 1, tz) !== 'none') return 'Un mur traverse cet emplacement.';
    if (dz + 1 < d && edgeType(home, 'h', tx, tz + 1) !== 'none') return 'Un mur traverse cet emplacement.';
  }
  return null;
}

// Un mur peut-il passer sur ce bord (sans couper un meuble en deux) ?
export function canWall(home, t, x, z) {
  for (const f of home.furn) {
    const tiles = furnTiles(f);
    const has = (a, b) => tiles.some(p => p.x === a && p.z === b);
    if (t === 'v' && has(x - 1, z) && has(x, z)) return false;
    if (t === 'h' && has(x, z - 1) && has(x, z)) return false;
  }
  return true;
}

// Toutes les cases de la pièce (délimitée par murs, fenêtres et portes).
export function roomTiles(home, sx, sz) {
  const seen = new Set([sz * W + sx]), stack = [[sx, sz]], out = [];
  while (stack.length) {
    const [x, z] = stack.pop();
    out.push({ x, z });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, i = nz * W + nx;
      if (!inside(nx, nz) || seen.has(i)) continue;
      if ((home.edges[edgeKeyBetween(x, z, dx, dz)] || 'none') !== 'none') continue;
      seen.add(i); stack.push([nx, nz]);
    }
  }
  return out;
}

// Ambiance de la maison, de 0 à 30. Elle remonte doucement le moral.
export function ambiance(home) {
  let fb = 0, sb = 0;
  for (const f of home.furn) fb += FURN[f.type].beaute;
  for (const t of home.floors) sb += FLOORS[t].beaute;
  let a = Math.min(18, fb) + Math.min(9, sb / 12);
  if (home.wall !== 'chaux') a += 1;
  if (home.wainscot !== 'aucun') a += 2;
  return Math.round(Math.min(30, a));
}
