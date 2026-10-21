// Mode construction : meubles, murs, sols, peinture. Le temps est arrêté.
import { W, D, FURN, CATS, FLOORS, WALL_COLORS, WAINSCOTS, PAINT_PRICE, WAINSCOT_PRICE, WALL_PRICES, asset } from './data.js';
import { G, spend, homeChanged, fmtDH } from './sim.js';
import * as S from './scene.js';
import * as Wd from './world.js';
import { $, esc, toast } from './ui.js';

export const B = { tab: 'meubles', cat: 'salon', item: null, rot: 0, sel: null, moving: null, ghost: null, tool: 'wall', corner: null, floor: 'zellige_vert', fill: true };
const home = () => G.s.home;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const charTile = () => (G.s.away ? null : { x: Math.floor(G.s.pos.x), z: Math.floor(G.s.pos.z) });
const getF = id => home().furn.find(f => f.id === id);

export function enter() { reset(); render(); }
export function exit() { reset(); }
function reset() {
  B.item = null; B.moving = null; B.sel = null; B.ghost = null; B.corner = null;
  S.hideGhost(); S.clearMarks();
}
function changed() {
  S.rebuildHome(home());
  homeChanged();
  S.clearMarks();
  if (B.sel && getF(B.sel)) S.markFurn(B.sel); else B.sel = null;
  render();
}

// ---------- Panneau ----------
const TOOLS = {
  wall: { nom: 'Mur', prix: `${WALL_PRICES.wall} DH le mètre`, hint: 'Touche un coin, puis un autre coin sur la même ligne pour tracer un mur.' },
  door: { nom: 'Porte', prix: fmtDH(WALL_PRICES.door), hint: 'Touche un mur intérieur pour y percer une porte en arc.' },
  window: { nom: 'Fenêtre', prix: fmtDH(WALL_PRICES.window), hint: 'Touche un mur pour y poser une fenêtre à moucharabieh.' },
  erase: { nom: 'Démolir', prix: 'Gratuit', hint: 'Touche un mur intérieur, une porte ou une fenêtre pour l’enlever.' },
};
export function render() {
  const tabs = { meubles: 'Meubles', murs: 'Murs', sols: 'Sols', peinture: 'Peinture' };
  const tabIcon = { meubles: 'onglet-meubles', murs: 'onglet-murs', sols: 'onglet-sols', peinture: 'onglet-peinture' };
  let hint = '', items = '', acts = '';
  if (B.tab === 'meubles') {
    if (B.moving) hint = 'Touche l’endroit où poser le meuble.';
    else if (B.item) hint = `Touche le sol pour poser : ${FURN[B.item].nom}.`;
    else if (B.sel) hint = FURN[getF(B.sel).type].nom;
    else hint = 'Choisis un meuble à acheter, ou touche un meuble de la maison pour le déplacer ou le vendre.';
    items = `<div class="chips cats">${Object.entries(CATS).map(([k, n]) => `<button data-cat="${k}" class="${B.cat === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="cards">${Object.entries(FURN).filter(([, f]) => f.cat === B.cat).map(([k, f]) =>
        `<button class="card-i ${f.img ? 'thumb' : ''} ${B.item === k ? 'on' : ''}" data-item="${k}">${f.img ? `<img src="${asset(f.img)}" alt="" draggable="false">` : ''}<b>${esc(f.nom)}</b><small>${G.s.stock[k] ? `Dans tes affaires : ${G.s.stock[k]} (gratuit)` : fmtDH(f.prix)}${f.beaute ? ` · ambiance +${f.beaute}` : ''}</small></button>`).join('')}</div>`;
    if (B.item || B.moving) {
      if (B.ghost) acts += '<button class="btn primary" data-a="place">Poser ici</button>';
      acts += '<button class="btn" data-a="rot">Tourner</button><button class="btn" data-a="cancel">Annuler</button>';
    } else if (B.sel) {
      const f = getF(B.sel);
      acts = `<button class="btn" data-a="rotsel">Tourner</button><button class="btn" data-a="move">Déplacer</button>
        <button class="btn" data-a="sell">Vendre (+${fmtDH(Math.round(FURN[f.type].prix * 0.75))})</button><button class="btn" data-a="unsel">Fermer</button>`;
    }
  } else if (B.tab === 'murs') {
    hint = TOOLS[B.tool].hint;
    items = `<div class="cards">${Object.entries(TOOLS).map(([k, t]) =>
      `<button class="card-i ${B.tool === k ? 'on' : ''}" data-tool="${k}"><b>${t.nom}</b><small>${t.prix}</small></button>`).join('')}</div>`;
    if (B.corner) acts = '<button class="btn" data-a="cancel">Annuler le mur</button>';
  } else if (B.tab === 'sols') {
    hint = B.fill ? 'Touche une pièce pour changer tout son sol.' : 'Touche une case pour changer son sol.';
    items = `<div class="cards">${Object.entries(FLOORS).map(([k, f]) =>
      `<button class="card-i ${B.floor === k ? 'on' : ''}" data-floor="${k}"><i class="sw-floor" style="background-image:url('${asset(f.img)}')"></i><b>${f.nom}</b><small>${f.prix} DH la case</small></button>`).join('')}</div>`;
    acts = `<button class="btn ${B.fill ? 'on' : ''}" data-a="fill">Toute la pièce</button><button class="btn ${B.fill ? '' : 'on'}" data-a="one">Une case</button>`;
  } else {
    hint = `Couleur des murs : ${PAINT_PRICE} DH. Soubassement en zellige : ${WAINSCOT_PRICE} DH.`;
    items = `<div class="cards">${Object.entries(WALL_COLORS).map(([k, c]) =>
      `<button class="card-i ${home().wall === k ? 'on' : ''}" data-paint="${k}"><i class="dot" style="background:${c.c}"></i><b>${c.nom}</b></button>`).join('')}</div>
      <div class="cards">${Object.entries(WAINSCOTS).map(([k, n]) =>
      `<button class="card-i ${home().wainscot === k ? 'on' : ''}" data-ws="${k}"><b>${n}</b><small>Bas des murs</small></button>`).join('')}</div>`;
  }
  $('build').innerHTML = `<div class="card">
    <nav class="tabs">${Object.entries(tabs).map(([k, n]) => `<button data-tab="${k}" class="${B.tab === k ? 'on' : ''}"><img src="${asset(tabIcon[k])}" alt="" draggable="false">${n}</button>`).join('')}
      <span class="amb">Ambiance ${Wd.ambiance(home())} / 30</span></nav>
    <p class="hint">${esc(hint)}</p>${items}${acts ? `<div class="bacts">${acts}</div>` : ''}</div>`;
}
export function initPanel() {
  $('build').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.tab) { reset(); B.tab = d.tab; }
    else if (d.cat) { B.cat = d.cat; }
    else if (d.item) { reset(); B.item = B.item === d.item ? null : d.item; B.rot = 0; }
    else if (d.tool) { B.tool = d.tool; B.corner = null; S.clearMarks(); }
    else if (d.floor) B.floor = d.floor;
    else if (d.paint) return paint('wall', d.paint);
    else if (d.ws) return paint('wainscot', d.ws);
    else if (d.a) return action(d.a);
    render();
  });
}
function action(a) {
  const h = home();
  if (a === 'place' && B.ghost) return place(B.ghost);
  if (a === 'rot') { B.rot = (B.rot + 1) % 4; refreshGhost(); }
  if (a === 'cancel') reset();
  if (a === 'fill') B.fill = true;
  if (a === 'one') B.fill = false;
  if (a === 'unsel') { B.sel = null; S.clearMarks(); }
  if (a === 'rotsel') {
    const f = getF(B.sel), nr = (f.r + 1) % 4;
    const why = Wd.canPlace(h, f.type, f.x, f.z, nr, f.id, charTile());
    if (why) toast(why, 'bad'); else { f.r = nr; return changed(); }
  }
  if (a === 'move') { const f = getF(B.sel); B.moving = { id: f.id, type: f.type }; B.rot = f.r; B.sel = null; S.clearMarks(); }
  if (a === 'sell') {
    const f = getF(B.sel), back = Math.round(FURN[f.type].prix * 0.75);
    h.furn = h.furn.filter(x => x !== f); G.s.money += back; B.sel = null;
    toast(`${FURN[f.type].nom} vendu(e) : +${fmtDH(back)}.`);
    return changed();
  }
  render();
}
function paint(key, v) {
  const h = home();
  if (h[key] === v) return;
  if (!spend(key === 'wall' ? PAINT_PRICE : WAINSCOT_PRICE)) return;
  h[key] = v;
  changed();
}

// ---------- Toucher la scène ----------
const hp = h => (h.point ? { px: h.point.x, pz: h.point.z } : { px: h.px, pz: h.pz });
function originFor(h, type, r) {
  const { px, pz } = hp(h), { w, d } = Wd.footprint(type, r);
  return { x: Math.floor(px - w / 2 + 0.5), z: Math.floor(pz - d / 2 + 0.5) };
}
function refreshGhost() {
  const type = B.item || (B.moving && B.moving.type);
  if (!type || !B.ghost) return S.hideGhost();
  const ok = !Wd.canPlace(home(), type, B.ghost.x, B.ghost.z, B.rot, B.moving && B.moving.id, charTile());
  S.showGhost(type, B.ghost.x, B.ghost.z, B.rot, ok);
}
function place(t) {
  const h = home(), type = B.item || B.moving.type;
  const why = Wd.canPlace(h, type, t.x, t.z, B.rot, B.moving && B.moving.id, charTile());
  if (why) { toast(why, 'bad'); return; }
  if (B.moving) {
    Object.assign(getF(B.moving.id), { x: t.x, z: t.z, r: B.rot });
    B.moving = null; B.ghost = null; S.hideGhost();
  } else {
    const stock = G.s.stock[type] || 0;
    if (stock) { G.s.stock[type] = stock - 1; toast(`${FURN[type].nom} sorti(e) de tes affaires.`); }
    else if (!spend(FURN[type].prix)) return;
    else toast(`${FURN[type].nom} : -${fmtDH(FURN[type].prix)}.`);
    h.furn.push({ id: h.nextId++, type, x: t.x, z: t.z, r: B.rot });
    B.ghost = null; S.hideGhost();
  }
  changed();
}

function edgeFrom(h) {
  if (h.type === 'edge') return Wd.parseEdge(h.key);
  const { px, pz } = hp(h), rx = Math.round(px), rz = Math.round(pz), dx = Math.abs(px - rx), dz = Math.abs(pz - rz);
  if (dx < dz) {
    const z = Math.floor(pz);
    return dx > 0.35 || rx < 0 || rx > W || z < 0 || z >= D ? null : { t: 'v', x: rx, z };
  }
  const x = Math.floor(px);
  return dz > 0.35 || rz < 0 || rz > D || x < 0 || x >= W ? null : { t: 'h', x, z: rz };
}
const cornerFrom = h => { const { px, pz } = hp(h); return { x: clamp(Math.round(px), 0, W), z: clamp(Math.round(pz), 0, D) }; };
function wallLine(a, b) {
  const out = [];
  if (Math.abs(b.x - a.x) >= Math.abs(b.z - a.z)) for (let x = Math.min(a.x, b.x); x < Math.max(a.x, b.x); x++) out.push({ t: 'h', x, z: a.z });
  else for (let z = Math.min(a.z, b.z); z < Math.max(a.z, b.z); z++) out.push({ t: 'v', x: a.x, z });
  return out;
}
const freeForWall = e => Wd.edgeType(home(), e.t, e.x, e.z) === 'none' && Wd.canWall(home(), e.t, e.x, e.z);

export function tap(px, py, ptype) {
  const h = S.pick(px, py, { build: true });
  if (B.tab === 'meubles') {
    const type = B.item || (B.moving && B.moving.type);
    if (type) {
      if (!h || h.type === 'char') return;
      const t = originFor(h, type, B.rot);
      if (ptype !== 'mouse' && (!B.ghost || B.ghost.x !== t.x || B.ghost.z !== t.z)) { B.ghost = t; refreshGhost(); render(); return; }
      return place(t);
    }
    S.clearMarks();
    B.sel = h && h.type === 'furn' ? h.id : null;
    if (B.sel) S.markFurn(B.sel);
    return render();
  }
  if (!h) return;
  if (B.tab === 'murs') return wallTap(h);
  if (B.tab === 'sols') return floorTap(h);
}

function wallTap(h) {
  const hm = home();
  if (B.tool === 'wall') {
    const c = cornerFrom(h);
    if (!B.corner) { B.corner = c; S.clearMarks(); S.markCorner(c.x, c.z); return render(); }
    const list = wallLine(B.corner, c), todo = list.filter(freeForWall);
    B.corner = null; S.clearMarks();
    if (!list.length) { toast('Choisis un autre coin sur la même ligne.'); return render(); }
    if (!todo.length) { toast('Rien à construire ici.'); return render(); }
    if (list.some(e => Wd.edgeType(hm, e.t, e.x, e.z) === 'none' && !Wd.canWall(hm, e.t, e.x, e.z))) toast('Un meuble gêne : une partie du mur n’a pas été construite.');
    const cost = todo.length * WALL_PRICES.wall;
    if (!spend(cost)) return render();
    for (const e of todo) hm.edges[Wd.ek(e.t, e.x, e.z)] = 'wall';
    toast(`Mur de ${todo.length} m : -${fmtDH(cost)}.`);
    return changed();
  }
  const e = edgeFrom(h);
  if (!e) return;
  const k = Wd.ek(e.t, e.x, e.z), cur = hm.edges[k] || 'none', bnd = Wd.isBoundary(e.t, e.x, e.z);
  if (cur === 'entree') return toast("La porte d'entrée reste à sa place.");
  if (B.tool === 'erase') {
    if (cur === 'none') return;
    if (bnd) {
      if (cur === 'window') { hm.edges[k] = 'wall'; return changed(); }
      return toast('Les murs extérieurs ne se démolissent pas.');
    }
    delete hm.edges[k];
    return changed();
  }
  if (B.tool === 'door' && bnd) return toast("L'appartement n'a qu'une porte d'entrée. Les portes se posent sur les murs intérieurs.");
  if (cur !== 'wall') return toast(B.tool === 'door' ? 'Une porte se pose sur un mur.' : 'Une fenêtre se pose sur un mur.');
  if (!spend(WALL_PRICES[B.tool])) return;
  hm.edges[k] = B.tool;
  changed();
}

function floorTap(h) {
  const hm = home(), { px, pz } = hp(h), x = Math.floor(px), z = Math.floor(pz);
  if (x < 0 || z < 0 || x >= W || z >= D) return;
  const tiles = B.fill ? Wd.roomTiles(hm, x, z) : [{ x, z }];
  const todo = tiles.filter(t => hm.floors[t.z * W + t.x] !== B.floor);
  if (!todo.length) return toast('Ce sol est déjà posé ici.');
  const cost = todo.length * FLOORS[B.floor].prix;
  if (!spend(cost)) return;
  for (const t of todo) hm.floors[t.z * W + t.x] = B.floor;
  toast(`${FLOORS[B.floor].nom} : ${todo.length} case${todo.length > 1 ? 's' : ''}, -${fmtDH(cost)}.`);
  changed();
}

// Survol à la souris : aperçu avant de cliquer.
export function hover(px, py) {
  const h = S.pick(px, py, { build: true });
  if (B.tab === 'meubles') {
    const type = B.item || (B.moving && B.moving.type);
    if (!type) return;
    if (!h || h.type === 'char') return S.hideGhost();
    B.ghost = originFor(h, type, B.rot);
    return refreshGhost();
  }
  S.clearMarks();
  if (!h) return;
  if (B.tab === 'murs') {
    if (B.tool === 'wall') {
      const c = cornerFrom(h);
      if (B.corner) { const l = wallLine(B.corner, c); S.markEdges(l, l.some(freeForWall)); S.markCorner(B.corner.x, B.corner.z); }
      S.markCorner(c.x, c.z);
    } else {
      const e = edgeFrom(h);
      if (e) S.markEdges([e], Wd.edgeType(home(), e.t, e.x, e.z) !== 'none');
    }
  } else if (B.tab === 'sols') {
    const { px: x, pz: z } = hp(h);
    if (x >= 0 && z >= 0 && x < W && z < D) S.markTiles(B.fill ? Wd.roomTiles(home(), Math.floor(x), Math.floor(z)) : [{ x: Math.floor(x), z: Math.floor(z) }]);
  }
}
export function key(k) {
  if (k === 'r' || k === 'R') {
    if (B.item || B.moving) action('rot'); else if (B.sel) action('rotsel');
  }
  if (k === 'Escape') { reset(); render(); }
}
