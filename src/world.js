// Le quartier : grille, murs de l'appartement (sur les bords des cases), meubles, obstacles, chemins.
import { W, D, X0, X1, Z0, Z1, FURN, FLOORS, RUE, CAFE, PLACE, TAXI, PLAGE } from './data.js';

export const GW = X1 - X0, GD = Z1 - Z0;
export const idx = (x, z) => (z - Z0) * GW + (x - X0);
export const inWorld = (x, z) => x >= X0 && x < X1 && z >= Z0 && z < Z1;
export const inHome = (x, z) => x >= 0 && x < W && z >= 0 && z < D;

// Bords : 'v,x,z' = bord vertical sur la ligne X = x, entre z et z+1.
//         'h,x,z' = bord horizontal sur la ligne Z = z, entre x et x+1.
export const ek = (t, x, z) => t + ',' + x + ',' + z;
export const parseEdge = k => { const [t, x, z] = k.split(','); return { t, x: +x, z: +z }; };
export const isBoundary = (t, x, z) => (t === 'v' ? x === 0 || x === W : z === 0 || z === D);
export const edgeType = (home, t, x, z) => home.edges[ek(t, x, z)] || 'none';
const BLOCKS = { wall: 1, window: 1 };

// L'appartement de départ dépend du milieu : nu pour l'enfant du quartier, bien équipé pour la famille aisée.
export function defaultHome(milieu = 'moyen') {
  const edges = {};
  for (let x = 0; x < W; x++) { edges[ek('h', x, 0)] = 'wall'; edges[ek('h', x, D)] = 'wall'; edges[ek('h', x, 4)] = 'wall'; }
  for (let z = 0; z < D; z++) { edges[ek('v', 0, z)] = 'wall'; edges[ek('v', W, z)] = 'wall'; edges[ek('v', 8, z)] = 'wall'; }
  Object.assign(edges, {
    'h,3,4': 'door', 'v,8,2': 'door', 'v,8,6': 'door', 'h,5,9': 'entree',
    'h,2,0': 'window', 'h,5,0': 'window', 'h,10,0': 'window', 'h,1,9': 'window',
    'v,0,6': 'window', 'h,10,9': 'window', 'v,12,6': 'window',
  });
  const SOLS = {
    populaire: () => 'carrelage',
    moyen: (x, z) => (z < 4 ? (x < 8 ? 'parquet' : 'zellige_bleu') : (x < 8 ? 'carrelage' : 'terre')),
    aise: (x, z) => (z < 4 ? (x < 8 ? 'parquet' : 'zellige_bleu') : (x < 8 ? 'marbre' : 'zellige_vert')),
  };
  const floors = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) floors.push(SOLS[milieu](x, z));
  const base = [
    ['douche', 11, 0, 0], ['frigo', 11, 4, 3], ['cuisiniere', 11, 5, 3],
  ];
  const FURNS = {
    populaire: [...base, ['lit1', 1, 0, 0], ['table', 9, 7, 0], ['pouf', 1, 6, 0], ['pouf', 3, 6, 0], ['mida', 2, 6, 0], ['plante', 7, 8, 0]],
    moyen: [...base, ['lit', 1, 0, 0], ['plan', 11, 6, 3], ['banquette', 0, 5, 1], ['banquette', 1, 4, 0], ['tapis', 1, 5, 0], ['mida', 2, 6, 0], ['lanterne', 0, 4, 0], ['plante', 7, 8, 0]],
    aise: [...base, ['lit', 1, 0, 0], ['armoire', 4, 0, 0], ['plan', 11, 6, 3], ['table', 9, 7, 0], ['banquette', 0, 5, 1], ['banquette', 1, 4, 0], ['tapis', 1, 5, 0], ['mida', 2, 6, 0], ['tv', 4, 4, 0], ['lanterne', 0, 4, 0], ['lanterne', 7, 4, 0], ['jarre', 7, 8, 0], ['plante', 6, 8, 0]],
  };
  const furn = FURNS[milieu].map(([type, x, z, r], i) => ({ id: i + 1, type, x, z, r }));
  const deco = { populaire: ['chaux', 'aucun'], moyen: ['chaux', 'vert'], aise: ['sable', 'bleu'] }[milieu];
  return { edges, floors, furn, wall: deco[0], wainscot: deco[1], nextId: furn.length + 1 };
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

// Obstacles fixes du quartier (immeubles, mobilier urbain, terrasse du café), plus ce qui change :
// l'appartement quand on n'y habite pas, le véhicule garé devant.
let outdoor = null, blocking = { noHome: false, vehicule: null };
export function setBlocking(b) { blocking = b; outdoor = null; }
export function vehiculeCells(v) {
  if (v === 'voiture') return [{ x: 1, z: D + 3 }, { x: 2, z: D + 3 }, { x: 3, z: D + 3 }, { x: 1, z: D + 4 }, { x: 2, z: D + 4 }, { x: 3, z: D + 4 }];
  if (v === 'scooter') return [{ x: 7, z: D }];
  return [];
}
export function outdoorGrid() {
  if (outdoor) return outdoor;
  const g = new Uint8Array(GW * GD);
  if (blocking.noHome) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) g[idx(x, z)] = 1;
  vehiculeCells(blocking.vehicule).forEach(c => { g[idx(c.x, c.z)] = 1; });
  const inPlace = (x, z) => x >= PLACE.x0 && x < PLACE.x1 && z >= PLACE.z0 && z < PLACE.z1, corniche = blocking.quartier === 'corniche';
  for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
    if (z < D && !inHome(x, z)) g[idx(x, z)] = 1;                       // notre pâté de maisons
    if (z >= RUE.trottoirLoin[1] && !inPlace(x, z) && !corniche) g[idx(x, z)] = 1;   // les immeubles d'en face (à la corniche : la plage)
  }
  const mark = c => { if (inWorld(c.x, c.z)) g[idx(c.x, c.z)] = 1; };
  RUE.lampes.forEach(mark); RUE.palmiers.forEach(mark); RUE.taxi.cells.forEach(mark); RUE.hanout.caisses.forEach(mark); RUE.charrette.cells.forEach(mark);
  mark(RUE.banc); mark({ x: RUE.banc.x + 1, z: RUE.banc.z });
  CAFE.tables.forEach(mark); CAFE.chaises.forEach(mark); CAFE.poteaux.forEach(mark);
  if (!corniche) { PLACE.fontaine.cells.forEach(mark); PLACE.orangers.forEach(mark); }
  mark(TAXI.arret);
  if (blocking.quartier === 'anfa') RUE.terrassesLoin.forEach(mark);
  if (!corniche) for (const b of PLACE.bancs) { mark(b); mark({ x: b.x + 1, z: b.z }); }
  if (corniche) {
    // La plage : le muret sauf aux escaliers, l'eau, les parasols et leurs serviettes, la tour, les buts.
    for (let x = X0; x < X1; x++) {
      if (!PLAGE.escaliers.some(([a, b]) => x >= a && x < b)) g[idx(x, PLAGE.muret)] = 1;
      for (let z = PLAGE.eau; z < Z1; z++) g[idx(x, z)] = 1;
    }
    for (const p of PLAGE.parasols) { mark(p); mark({ x: p.x, z: p.z + 1 }); }
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) mark({ x: PLAGE.tour.x + dx, z: PLAGE.tour.z + dz });
    for (const b of PLAGE.buts) for (let dz = -1; dz <= 2; dz++) mark({ x: b.x, z: b.z + dz });
  }
  return (outdoor = g);
}
// Grille des cases bloquées. noHome : l'appartement entier est interdit (pour les voisins).
export function blockedGrid(home, ignoreId, noHome = false) {
  const g = new Uint8Array(outdoorGrid());
  if (noHome || blocking.noHome) { for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) g[idx(x, z)] = 1; return g; }
  for (const f of home.furn) {
    if (f.id === ignoreId || FURN[f.type].sol) continue;
    for (const t of furnTiles(f)) g[idx(t.x, t.z)] = 1;
  }
  return g;
}

// Passage orthogonal d'une case à sa voisine (murs et fenêtres bloquent, portes non).
export function edgeKeyBetween(x, z, dx, dz) {
  if (dx === 1) return ek('v', x + 1, z);
  if (dx === -1) return ek('v', x, z);
  if (dz === 1) return ek('h', x, z + 1);
  return ek('h', x, z);
}
export const wallBetween = (home, x, z, dx, dz) => !!BLOCKS[home.edges[edgeKeyBetween(x, z, dx, dz)]];

// File de priorité minimale.
class Heap {
  constructor() { this.a = []; }
  push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

// Plus court chemin (8 directions) vers la case cible la plus proche.
export function findPath(home, sx, sz, targets, blocked = blockedGrid(home)) {
  const goal = new Set(targets.filter(t => inWorld(t.x, t.z)).map(t => idx(t.x, t.z)));
  if (!goal.size || !inWorld(sx, sz)) return null;
  const start = idx(sx, sz);
  const dist = new Float32Array(GW * GD).fill(Infinity), prev = new Int32Array(GW * GD).fill(-1);
  const done = new Uint8Array(GW * GD), heap = new Heap();
  dist[start] = 0; heap.push(0, start);
  const can = (x, z, dx, dz) => inWorld(x + dx, z + dz) && !blocked[idx(x + dx, z + dz)] && !wallBetween(home, x, z, dx, dz);
  while (heap.size) {
    const [bd, best] = heap.pop();
    if (done[best]) continue;
    if (goal.has(best)) {
      const path = [];
      for (let i = best; i !== -1; i = prev[i]) path.unshift({ x: (i % GW) + X0, z: Math.floor(i / GW) + Z0 });
      return path;
    }
    done[best] = 1;
    const x = (best % GW) + X0, z = Math.floor(best / GW) + Z0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      let ok;
      if (dx && dz) ok = can(x, z, dx, 0) && can(x + dx, z, 0, dz) && can(x, z, 0, dz) && can(x, z + dz, dx, 0);
      else ok = can(x, z, dx, dz);
      if (!ok) continue;
      const n = idx(x + dx, z + dz), nd = bd + (dx && dz ? 1.414 : 1);
      if (nd < dist[n]) { dist[n] = nd; prev[n] = best; heap.push(nd, n); }
    }
  }
  return null;
}

// Cases libres d'où l'on peut atteindre un groupe de cases (meuble, chaise, personne).
export function approachCells(home, cells, blocked = blockedGrid(home)) {
  const own = new Set(cells.map(t => idx(t.x, t.z))), out = [];
  for (const t of cells) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = t.x + dx, z = t.z + dz;
      if (!inWorld(x, z)) continue;
      const i = idx(x, z);
      if (own.has(i) || blocked[i] || wallBetween(home, t.x, t.z, dx, dz)) continue;
      out.push({ x, z, from: t });
    }
  }
  return out;
}
export const approachTiles = (home, f, blocked) => approachCells(home, furnTiles(f), blocked);

export function entrance(home) {
  for (const k in home.edges) {
    if (home.edges[k] !== 'entree') continue;
    const e = parseEdge(k);
    if (e.t === 'h') return e.z === D ? { x: e.x, z: D - 1, out: { x: 0, z: 1 } } : { x: e.x, z: 0, out: { x: 0, z: -1 } };
    return e.x === W ? { x: W - 1, z: e.z, out: { x: 1, z: 0 } } : { x: 0, z: e.z, out: { x: -1, z: 0 } };
  }
  return { x: 0, z: 0, out: { x: 0, z: 1 } };
}
export function doorstep(home) {
  const e = entrance(home);
  return { x: e.x + e.out.x, z: e.z + e.out.z };
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
      if (!inHome(nx, nz) || seen.has(i)) continue;
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

// Cases libres du trottoir et de la placette (pour les promenades des voisins).
export function sidewalkCells() {
  const g = outdoorGrid(), out = [];
  for (const [a, b] of [RUE.trottoir, RUE.trottoirLoin]) for (let z = a; z < b; z++) for (let x = X0 + 1; x < X1 - 1; x++) if (!g[idx(x, z)]) out.push({ x, z });
  if (blocking.quartier === 'corniche') for (let z = PLAGE.z0 + 1; z < PLAGE.eau; z++) for (let x = X0 + 1; x < X1 - 1; x++) if (!g[idx(x, z)]) out.push({ x, z });
  else for (let z = PLACE.z0; z < PLACE.z1; z++) for (let x = PLACE.x0; x < PLACE.x1; x++) if (!g[idx(x, z)]) out.push({ x, z });
  return out;
}
