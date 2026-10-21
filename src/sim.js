// La simulation : temps, besoins, actions, quartier, voisins, sorties, travail, argent, sauvegarde.
import {
  SAVE_KEY, START_MONEY, LOYER, FACTURE, WALK, FURN, ACT, RECETTES, QUAL, QUAL_MORAL,
  MARCHE, LIEUX, JOB, RUE, CAFE, NPCS, PASSANTS, SALUTS, X0, X1, D, matchEnCours, relLabel,
} from './data.js';
import * as Wd from './world.js';

export const G = {
  s: null,          // état sauvegardé
  cur: null,        // action en cours
  queue: [],        // actions en attente
  npcs: [], passants: [], chairs: [],
  speed: 1, mode: 'live', modal: false,
  yaw: 0, walkPhase: 0, idle: 0, amb: 0, alerts: {}, pendingWork: false, qid: 1,
};
export const hooks = { toast: () => {} };
const toast = (m, k) => hooks.toast(m, k);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const has = t => G.s.char.traits.includes(t);
const nm = () => G.s.char.name;
const tileOf = p => ({ x: Math.floor(p.x), z: Math.floor(p.z) });
const center = t => ({ x: t.x + 0.5, z: t.z + 0.5 });
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// ---------- Temps et formats ----------
export const dayIdx = t => Math.floor(t / 1440);
export const dow = t => dayIdx(t) % 7;
export const hm = t => { const m = Math.floor(t % 1440); return { h: Math.floor(m / 60), m: m % 60 }; };
export const hour = t => (t % 1440) / 60;
export const fmtTime = t => { const { h, m } = hm(t); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
export const fmtDH = n => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ') + ' DH';
export const fmtDur = m => (m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) : ''));
export const cafeOuvert = t => hour(t) >= CAFE.ouvre && hour(t) < CAFE.ferme;

// ---------- Partie ----------
export function newGame(look) {
  const home = Wd.defaultHome(), ent = Wd.entrance(home);
  G.s = {
    v: 2, char: look, t: 7 * 60, money: START_MONEY,
    needs: { faim: 70, energie: 80, hygiene: 75, social: 55, moral: 65 },
    skills: { cuisine: 0 },
    inv: { the: 2, msemen: 1, tajine: 0, snack: 2 },
    plats: [],
    job: { level: 0, perf: 40, day: -1, week: 0 },
    rel: {},
    home, pos: center(ent), away: null, lastBill: 0, autonomy: true,
  };
  resetRuntime();
  save();
}
function resetRuntime() {
  G.cur = null; G.queue = []; G.idle = 0; G.alerts = {}; G.pendingWork = false;
  G.yaw = Math.PI; G.amb = Wd.ambiance(G.s.home);
  G.chairs = CAFE.chaises.map(() => null);
  G.npcs = NPCS.map(def => ({ id: def.id, def, visible: false, x: 0, z: 0, yaw: 0, state: 'home', path: [], walkPhase: 0, nextAt: 0, chair: -1, goal: null, talkUntil: 0, greetedAt: -9999, talks: 0, talkDay: -1 }));
  G.passants = PASSANTS.map((look, i) => ({ id: 'p' + i, look, visible: false, x: 0, z: 0, yaw: 0, path: [], walkPhase: 0, nextAt: rand(0, 40) }));
  npcGrid = null;
}
export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || !(s.v === 1 || s.v === 2)) return false;
    if (s.v === 1) { s.v = 2; s.needs.social = 60; s.rel = {}; }
    G.s = s; resetRuntime(); return true;
  } catch { return false; }
}
export function save() { try { if (G.s) localStorage.setItem(SAVE_KEY, JSON.stringify(G.s)); } catch {} }
export function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch {} G.s = null; }

export function spend(cost) {
  if (G.s.money < cost) { toast("Pas assez d'argent.", 'bad'); return false; }
  G.s.money -= cost; return true;
}
export function homeChanged() {
  G.amb = Wd.ambiance(G.s.home);
  const c = G.cur;
  if (c) {
    const f = c.it.fid != null && getF(c.it.fid);
    if (c.stage === 'walk') { G.cur = null; G.queue.unshift(c.it); }
    else if (c.it.fid != null && (!f || c.sig !== sig(f))) G.cur = null;
  }
  save();
}
const sig = f => f.x + ',' + f.z + ',' + f.r;
export const isHome = () => Wd.inHome(Math.floor(G.s.pos.x), Math.floor(G.s.pos.z));

// ---------- Ce qu'on peut faire ----------
const getF = id => G.s.home.furn.find(f => f.id === id);
const getN = id => G.npcs.find(n => n.id === id);
const findPlat = key => { const [r, q] = key.split(':'); return G.s.plats.find(p => p.r === r && p.q === +q); };

export function itemLabel(it) {
  if (it.kind === 'goto') return 'Aller ici';
  if (it.kind === 'out') {
    if (it.lieu === 'travail') return 'Partir au travail';
    const L = LIEUX[it.lieu];
    const o = L.options && L.options.find(x => x.id === it.opt);
    return o ? o.nom : 'Courses au marché';
  }
  if (it.kind === 'cafe') return 'Café : ' + CAFE.options.find(o => o.id === it.opt).nom.toLowerCase();
  if (it.kind === 'talk') return (it.mode === 'saluer' ? 'Saluer ' : 'Discuter avec ') + getN(it.npc).def.nom;
  if (it.act === 'cuisiner') return 'Préparer : ' + RECETTES[it.param].nom;
  if (it.act === 'manger') return 'Manger : ' + RECETTES[it.param.split(':')[0]].nom;
  if (it.act === 'boire') return 'Boire un verre de thé';
  return ACT[it.act].label;
}

function checkAct(it) {
  const s = G.s;
  if (it.act === 'cuisiner' && !(s.inv[it.param] > 0)) return 'Il manque les ingrédients : passe au marché.';
  if ((it.act === 'manger' || it.act === 'boire') && !findPlat(it.param)) return 'Il ne reste plus rien.';
  if (it.act === 'casse' && !(s.inv.snack > 0)) return 'Plus de casse-croûte : passe au marché.';
  return null;
}

export function availableActions(fid) {
  const s = G.s, f = getF(fid);
  if (!f) return { title: '', items: [] };
  const def = FURN[f.type], items = [];
  let info = '';
  for (const a of def.actions) {
    if (a === 'cuisiner') {
      const lvl = Math.floor(s.skills.cuisine);
      info = `Cuisine : niveau ${lvl}`;
      for (const r in RECETTES) {
        const R = RECETTES[r], n = s.inv[r] || 0;
        items.push({
          act: 'cuisiner', param: r, label: 'Préparer : ' + R.nom,
          sub: n ? `${fmtDur(R.dur)} · ${n} lot${n > 1 ? 's' : ''} d'ingrédients` : '',
          disabled: !n, why: "Il manque les ingrédients : passe au marché.",
        });
      }
    } else if (a === 'manger') {
      for (const p of s.plats) {
        if (p.r === 'the') continue;
        items.push({ act: 'manger', param: p.r + ':' + p.q, label: 'Manger : ' + RECETTES[p.r].nom, sub: `${QUAL[p.q]} · ${p.n} part${p.n > 1 ? 's' : ''}` });
      }
    } else if (a === 'boire') {
      for (const p of s.plats) {
        if (p.r !== 'the') continue;
        items.push({ act: 'boire', param: 'the:' + p.q, label: 'Boire un verre de thé', sub: `${QUAL[p.q]} · ${p.n} verre${p.n > 1 ? 's' : ''}` });
      }
    } else if (a === 'casse') {
      const n = s.inv.snack || 0;
      items.push({ act: 'casse', label: ACT.casse.label, sub: n ? `${n} en réserve` : '', disabled: !n, why: 'Plus rien : passe au marché.' });
    } else items.push({ act: a, label: ACT[a].label });
  }
  if (f.type === 'frigo') {
    const inv = ['the', 'msemen', 'tajine'].map(r => `${RECETTES[r].nom.split(' ')[0].toLowerCase()} ${s.inv[r] || 0}`).join(' · ');
    info = `Ingrédients au frais : ${inv}`;
    if (!s.plats.length) info += '. Aucun plat prêt : cuisine à la cuisinière.';
  }
  if (!def.actions.length) info = def.beaute ? `Embellit la maison (ambiance +${def.beaute}).` : 'Rien à faire ici.';
  return { title: def.nom, items, info };
}

function workStatus() {
  const s = G.s, d = dow(s.t), { h } = hm(s.t);
  if (d > 4) return 'Pas de travail le week-end.';
  if (s.job.day === dayIdx(s.t)) return "C'est fait pour aujourd'hui.";
  if (h < 7 || h >= 12) return 'Départ possible de 7 h à midi.';
  return null;
}
export function doorActions() {
  const w = workStatus();
  return {
    title: "Porte d'entrée",
    items: [
      { act: 'rue', label: isHome() ? 'Sortir dans la rue' : 'Rentrer à la maison', sub: isHome() ? 'Le café est juste à droite' : '' },
      { act: 'lieu', param: 'hammam', label: 'Aller au hammam', sub: 'À deux rues, 8 min' },
      { act: 'lieu', param: 'marche', label: 'Faire les courses au marché', sub: 'À deux rues, 8 min' },
      { act: 'travail', label: 'Partir au travail', sub: w || 'Tram : 25 min', disabled: !!w, why: w },
    ],
  };
}
export function chairActions(i) {
  const s = G.s, c = CAFE.chaises[i], occ = G.chairs[i];
  if (occ && occ !== 'player') return { title: CAFE.nom, items: [], info: `${getN(occ).def.nom} est assis(e) ici.` };
  if (!cafeOuvert(s.t)) return { title: CAFE.nom, items: [], info: `Le café est fermé. Il ouvre à ${CAFE.ouvre} h.` };
  const h = hour(s.t), match = matchEnCours(dow(s.t), h);
  const items = CAFE.options.filter(o => !o.jusqua || h < o.jusqua).filter(o => !o.match || match).map(o => ({
    act: 'cafe', chair: i, opt: o.id, label: o.nom, sub: `${fmtDH(o.prix)} · ${fmtDur(o.dur)}`, disabled: o.prix > s.money, why: "Pas assez d'argent.",
  }));
  const voisin = G.npcs.find(n => n.chair >= 0 && CAFE.chaises[n.chair].table === c.table);
  return { title: CAFE.nom, items, info: voisin ? `${voisin.def.nom} est à cette table.` : 'Une chaise libre en terrasse.' };
}
export function npcActions(id) {
  const n = getN(id), s = G.s, rel = s.rel[id] || 0;
  const items = [
    { act: 'talk', npc: id, mode: 'saluer', label: 'Saluer', sub: 'Un bonjour en passant' },
    { act: 'talk', npc: id, mode: 'discuter', label: 'Discuter (15 min)', sub: rel >= 20 ? 'Prendre des nouvelles' : 'Faire connaissance' },
  ];
  return { title: n.def.nom, items, info: `${relLabelOf(rel)} · ${n.def.desc}` };
}
const relLabelOf = v => relLabel(v) + (v > 0 ? ` (${Math.round(v)})` : '');
export const basketCost = b => MARCHE.reduce((t, m) => t + (b[m.id] || 0) * m.prix, 0);

// ---------- File d'actions ----------
export function enqueue(it, front = false) {
  if (G.s.away) { toast('Pas pendant une sortie.'); return; }
  if (G.queue.length >= 5 && !front) { toast("Trop d'actions en attente."); return; }
  it.qid = G.qid++;
  it.label = it.label || itemLabel(it);
  if (front) G.queue.unshift(it); else G.queue.push(it);
  G.idle = 0;
}
export function cancel(qid) {
  if (G.cur && G.cur.it.qid === qid) stopCur();
  else G.queue = G.queue.filter(i => i.qid !== qid);
}
export function cancelAll() { G.queue = []; if (G.cur) stopCur(); }
function stopCur() {
  const c = G.cur;
  if (!c) return;
  if (c.stage === 'do' && c.it.act === 'cuisiner') toast('Préparation abandonnée.');
  if (c.stage === 'do' && c.it.kind === 'cafe') G.chairs[c.it.chair] = null;
  if (c.stage === 'do' && c.it.kind === 'talk') { const n = getN(c.it.npc); if (n && n.state === 'talk') { n.state = 'idle'; n.nextAt = G.s.t + 1; } }
  G.cur = null;
}
const fail = (it, why) => { if (!it.auto) toast(why); G.cur = null; };

function startItem(it) {
  const s = G.s, home = s.home, blocked = Wd.blockedGrid(home), here = tileOf(s.pos);
  const go = (targets, extra) => {
    const path = Wd.findPath(home, here.x, here.z, targets, blocked);
    if (!path) return null;
    G.cur = { it, stage: 'walk', path: path.slice(1).map(center), t: 0, ...extra };
    if (!G.cur.path.length) G.cur.path.push(center(here));
    return path;
  };
  if (it.kind === 'goto') { if (!go([{ x: it.x, z: it.z }])) fail(it, "Impossible d'aller là."); return; }
  if (it.kind === 'out') { if (!go([RUE.coin])) fail(it, "Impossible d'atteindre le coin de la rue."); return; }
  if (it.kind === 'cafe') {
    const c = CAFE.chaises[it.chair];
    if (G.chairs[it.chair] && G.chairs[it.chair] !== 'player') return fail(it, 'La chaise vient d\'être prise.');
    if (!cafeOuvert(s.t)) return fail(it, 'Le café est fermé.');
    if (!go(Wd.approachCells(home, [c], blocked))) return fail(it, 'Impossible d\'atteindre la terrasse.');
    const opt = CAFE.options.find(o => o.id === it.opt);
    G.cur.spot = { x: c.x + 0.5, z: c.z + 0.5, yaw: c.r * Math.PI / 2, pose: 'sit', h: 0.45, anim: opt.match ? null : 'eat' };
    return;
  }
  if (it.kind === 'talk') {
    const n = getN(it.npc);
    if (!n.visible) return fail(it, `${n.def.nom} n'est pas dans le quartier.`);
    if (n.state === 'talk') return fail(it, `${n.def.nom} est déjà en pleine discussion.`);
    const cells = n.chair >= 0 ? [CAFE.chaises[n.chair]] : [tileOf(n)];
    const app = Wd.approachCells(home, cells, blocked);
    if (!app.length || !go(app)) return fail(it, `${n.def.nom} est hors d'atteinte.`);
    n.hold = s.t + 12; // le voisin attend qu'on arrive
    return;
  }
  if (it.act === 'evanoui') {
    G.cur = { it, stage: 'do', t: 0, dur: ACT.evanoui.dur, spot: { x: s.pos.x, z: s.pos.z, yaw: G.yaw, pose: 'lie', h: 0 } };
    return;
  }
  const f = getF(it.fid);
  if (!f) return fail(it, "Ce meuble n'est plus là.");
  const why = checkAct(it);
  if (why) return fail(it, why);
  const plan = planSpot(f, it.act, blocked);
  if (!plan) return fail(it, `${nm()} ne peut pas y accéder.`);
  const path = go(plan.approach);
  if (!path) return fail(it, `${nm()} ne peut pas y accéder.`);
  G.cur.spot = plan.spotFor(path[path.length - 1]);
}

// Où se placer pour faire l'action : sur le meuble, sur un siège voisin, ou debout à côté.
function planSpot(f, act, blocked) {
  const home = G.s.home, def = FURN[f.type], A = ACT[act], c = Wd.furnCenter(f);
  const onIt = act === 'dormir' || act === 'sieste' || act === 'douche' || (def.assise && ['detente', 'manger', 'boire'].includes(act));
  const seatNear = act === 'tele' || (f.type === 'mida' && (act === 'manger' || act === 'boire'));
  if (onIt) return onSpot(f, act, blocked, c);
  if (seatNear) {
    const seats = home.furn.filter(o => FURN[o.type].assise)
      .map(o => { const oc = Wd.furnCenter(o); return { o, d: Math.hypot(oc.x - c.x, oc.z - c.z) }; })
      .filter(x => x.d <= 3.6).sort((a, b) => a.d - b.d);
    for (const { o } of seats) { const p = onSpot(o, act, blocked, c); if (p) return p; }
  }
  const app = Wd.approachTiles(home, f, blocked);
  if (!app.length) return null;
  return {
    approach: app,
    spotFor: e => ({ x: e.x + 0.5, z: e.z + 0.5, yaw: yawTo(e.x + 0.5, e.z + 0.5, c.x, c.z), pose: 'stand', anim: A.anim, h: 0 }),
  };
}
function onSpot(f, act, blocked, faceTo) {
  const app = Wd.approachTiles(G.s.home, f, blocked);
  if (!app.length) return null;
  const def = FURN[f.type], A = ACT[act], c = Wd.furnCenter(f);
  return {
    approach: app,
    spotFor: e => {
      const a = app.find(p => p.x === e.x && p.z === e.z) || app[0];
      if (f.type === 'lit' || f.type === 'lit1') return { x: c.x, z: c.z, yaw: f.r * Math.PI / 2, pose: 'lie', h: 0.55 };
      if (f.type === 'douche') return { x: c.x, z: c.z, yaw: f.r * Math.PI / 2, pose: 'shower', h: 0.07 };
      const fd = Wd.frontDir(f.r), x = a.from.x + 0.5 - fd.x * 0.08, z = a.from.z + 0.5 - fd.z * 0.08;
      const own = Math.abs(faceTo.x - c.x) < 0.01 && Math.abs(faceTo.z - c.z) < 0.01;
      return { x, z, yaw: own ? f.r * Math.PI / 2 : yawTo(x, z, faceTo.x, faceTo.z), pose: 'sit', anim: A.anim, h: def.assise };
    },
  };
}

function walkAlong(o, m, speed) {
  let left = speed * m;
  while (left > 0 && o.path.length) {
    const p = o.path[0], dx = p.x - o.x, dz = p.z - o.z, L = Math.hypot(dx, dz);
    if (L > 0.001) o.yaw = Math.atan2(dx, dz);
    if (L <= left) { o.x = p.x; o.z = p.z; o.path.shift(); left -= L; o.walkPhase += L * 5; }
    else { o.x += dx / L * left; o.z += dz / L * left; o.walkPhase += left * 5; left = 0; }
  }
  return !o.path.length;
}
function walk(c, m) {
  const s = G.s, o = { x: s.pos.x, z: s.pos.z, yaw: G.yaw, path: c.path, walkPhase: G.walkPhase };
  const done = walkAlong(o, m, WALK);
  s.pos = { x: o.x, z: o.z }; G.yaw = o.yaw; G.walkPhase = o.walkPhase;
  if (done) arrive(c);
}

function arrive(c) {
  const s = G.s, it = c.it;
  if (it.kind === 'goto') { G.cur = null; return; }
  if (it.kind === 'out') { depart(it); return; }
  if (it.kind === 'cafe') {
    const opt = CAFE.options.find(o => o.id === it.opt);
    if (G.chairs[it.chair]) return fail(it, 'La chaise vient d\'être prise.');
    if (s.money < opt.prix) return fail(it, "Pas assez d'argent pour ça.");
    s.money -= opt.prix;
    G.chairs[it.chair] = 'player';
    c.dur = opt.dur; c.rates = {};
    for (const k in opt.eff) c.rates[k] = opt.eff[k] / opt.dur * 60 * (k === 'moral' && has('sociable') ? 1.4 : 1);
    c.stage = 'do'; c.t = 0; G.yaw = c.spot.yaw;
    return;
  }
  if (it.kind === 'talk') {
    const n = getN(it.npc), d = Math.hypot(n.x - s.pos.x, n.z - s.pos.z);
    if (!n.visible || n.state === 'talk') return fail(it, `${n.def.nom} n'est plus disponible.`);
    if (d > 2.2) {
      if ((it.tries = (it.tries || 0) + 1) < 3) { G.cur = null; G.queue.unshift(it); return; }
      return fail(it, `${n.def.nom} est déjà parti(e).`);
    }
    n.state = 'talk'; n.path = [];
    n.yaw = yawTo(n.x, n.z, s.pos.x, s.pos.z);
    c.dur = it.mode === 'saluer' ? 2 : 15;
    n.talkUntil = s.t + c.dur;
    c.spot = { x: s.pos.x, z: s.pos.z, yaw: yawTo(s.pos.x, s.pos.z, n.x, n.z), pose: 'stand', anim: 'talk', h: 0 };
    c.stage = 'do'; c.t = 0; G.yaw = c.spot.yaw;
    return;
  }
  const why = checkAct(it);
  if (why) return fail(it, why);
  if (it.act === 'cuisiner') s.inv[it.param]--;
  if (it.act === 'manger' || it.act === 'boire') {
    const p = findPlat(it.param);
    p.n--;
    if (!p.n) s.plats.splice(s.plats.indexOf(p), 1);
    const R = RECETTES[p.r];
    c.food = { r: p.r, q: p.q };
    c.gain = { faim: R.faim };
  }
  if (it.act === 'casse') { s.inv.snack--; c.gain = { faim: 25 }; }
  c.dur = it.act === 'cuisiner' ? RECETTES[it.param].dur : ACT[it.act].dur || Infinity;
  c.stage = 'do'; c.t = 0;
  const f = getF(it.fid);
  if (f) c.sig = sig(f);
  if (c.spot) G.yaw = c.spot.yaw;
}

function finish(c) {
  const s = G.s, it = c.it;
  G.cur = null;
  if (it.kind === 'cafe') {
    G.chairs[it.chair] = null;
    const table = CAFE.chaises[it.chair].table;
    const voisin = G.npcs.find(n => n.chair >= 0 && CAFE.chaises[n.chair].table === table);
    if (voisin) {
      addRel(voisin, 5);
      s.needs.social = clamp(s.needs.social + 6, 0, 100);
      toast(`${voisin.def.nom} : « ${pick(voisin.def.lignes)} »`);
    }
    return;
  }
  if (it.kind === 'talk') {
    const n = getN(it.npc);
    if (n.state === 'talk') { n.state = 'idle'; n.nextAt = s.t + 2; }
    const d = dayIdx(s.t);
    if (n.talkDay !== d) { n.talkDay = d; n.talks = 0; }
    const k = 1 / (1 + n.talks * 0.6);
    n.talks++;
    const gain = (it.mode === 'saluer' ? 3 : 9) * k, soc = (it.mode === 'saluer' ? 6 : 22) * k, mor = (it.mode === 'saluer' ? 2 : 8) * (has('sociable') ? 1.5 : 1);
    addRel(n, gain);
    s.needs.social = clamp(s.needs.social + soc, 0, 100);
    s.needs.moral = clamp(s.needs.moral + mor, 0, 100);
    toast(`${n.def.nom} : « ${it.mode === 'saluer' ? pick(SALUTS) : pick(n.def.lignes)} »`);
    return;
  }
  if (it.act === 'cuisiner') {
    const R = RECETTES[it.param], sk = s.skills.cuisine;
    const pFail = clamp(0.35 + 0.12 * (R.d - sk), 0.03, 0.8), pGreat = clamp(0.05 + 0.08 * (sk - R.d), 0, 0.6);
    const roll = Math.random(), q = roll < pFail ? 0 : roll > 1 - pGreat ? 2 : 1;
    const ex = s.plats.find(p => p.r === it.param && p.q === q);
    if (ex) ex.n += R.portions; else s.plats.push({ r: it.param, q, n: R.portions });
    const before = Math.floor(sk);
    s.skills.cuisine = Math.min(10, sk + R.xp * (has('cuisinier') ? 1.6 : 1));
    toast(`${R.nom} : ${QUAL[q]}${q === 2 ? ' !' : q === 0 ? '…' : '.'}`, q === 0 ? 'bad' : q === 2 ? 'good' : '');
    if (Math.floor(s.skills.cuisine) > before) toast(`Cuisine : niveau ${Math.floor(s.skills.cuisine)}. Les plats réussiront plus souvent.`, 'good');
  }
  if (c.food) {
    const R = RECETTES[c.food.r];
    s.needs.moral = clamp(s.needs.moral + R.moral + QUAL_MORAL[c.food.q] + (has('gourmand') && c.food.q > 0 ? 5 : 0), 0, 100);
  }
  if (it.act === 'casse') s.needs.moral = clamp(s.needs.moral + 2, 0, 100);
}
function addRel(n, v) {
  const s = G.s, before = s.rel[n.id] || 0, after = clamp(before + v, 0, 100);
  s.rel[n.id] = after;
  for (const seuil of [20, 50, 80]) if (before < seuil && after >= seuil) toast(`${n.def.nom} : ${relLabel(after)}.`, 'good');
}

// ---------- Sorties hors du quartier ----------
function depart(it) {
  const s = G.s, L = LIEUX[it.lieu];
  const opt = L.options ? L.options.find(o => o.id === it.opt) : null;
  const cost = opt ? opt.prix : it.lieu === 'marche' ? basketCost(it.basket) : 0;
  if (cost > s.money) { G.cur = null; toast("Pas assez d'argent pour ça.", 'bad'); return; }
  s.money -= cost;
  const t0 = s.t, phases = [{ until: t0 + L.trajet, label: 'En chemin' }];
  let late = false;
  if (it.lieu === 'travail') {
    const end = dayIdx(t0) * 1440 + 17 * 60;
    late = t0 + L.trajet > dayIdx(t0) * 1440 + 9 * 60 + 15;
    phases.push({ until: Math.max(t0 + L.trajet + 60, end), label: L.ici, work: true, extra: { faim: 2.5, social: 1.5 } });
  } else {
    const dur = opt ? opt.dur : L.dur, extra = {};
    if (opt) for (const k in opt.eff) {
      let v = opt.eff[k];
      if (k === 'moral' && opt.social && has('sociable')) v *= 1.5;
      if (k === 'moral' && it.lieu === 'hammam' && has('soigne')) v *= 1.3;
      extra[k] = v / dur * 60;
    }
    phases.push({ until: t0 + L.trajet + dur, label: L.ici, extra });
  }
  phases.push({ until: phases[1].until + L.trajet, label: 'Sur le chemin du retour' });
  s.away = { lieu: it.lieu, opt: it.opt || null, basket: it.basket || null, phases, start: t0, late, done: false };
  G.cur = null; G.queue = []; G.pendingWork = G.pendingWork && it.lieu !== 'travail';
  if (it.lieu === 'travail') s.away.startNeeds = { ...s.needs };
}
export function awayPhase() {
  const a = G.s.away;
  return a && (a.phases.find(p => G.s.t < p.until) || a.phases[a.phases.length - 1]);
}
export function comeBack() {
  const s = G.s, a = s.away;
  if (!a || a.lieu === 'travail' || a.lieu === 'marche') return;
  a.phases = [{ until: s.t + LIEUX[a.lieu].trajet, label: 'Sur le chemin du retour' }];
}
function stepAway(m) {
  const s = G.s, a = s.away, p = awayPhase();
  applyNeeds(m, p.extra);
  if (a.lieu === 'travail' && !a.done && s.t >= a.phases[1].until) finishWork();
  if (s.t >= a.phases[a.phases.length - 1].until) returnHome();
}
function returnHome() {
  const s = G.s, a = s.away;
  s.away = null;
  s.pos = center(RUE.coin);
  G.yaw = Math.PI / 2;
  if (a.lieu === 'marche') {
    for (const k in a.basket) s.inv[k] = (s.inv[k] || 0) + a.basket[k];
    toast(`${nm()} revient du marché, les courses seront au frigo.`);
  } else toast(`${nm()} est de retour dans le quartier.`);
  save();
  const d = dayIdx(s.t);
  if (G.pendingWork && dow(s.t) <= 4 && hm(s.t).h < 12 && s.job.day !== d) goWork();
  else enqueue({ kind: 'goto', ...Wd.entrance(s.home), auto: true, label: 'Rentrer à la maison' });
  G.pendingWork = false;
}

// ---------- Travail, loyer, salaire ----------
function goWork() {
  cancelAll();
  enqueue({ kind: 'out', lieu: 'travail', auto: true }, true);
  toast("C'est l'heure : départ au travail.");
}
export function enqueueWork() { enqueue({ kind: 'out', lieu: 'travail' }); }
function finishWork() {
  const s = G.s, a = s.away, n = a.startNeeds, J = s.job;
  a.done = true;
  let gain = (n.moral >= 60 ? 10 : n.moral >= 35 ? 5 : -3) + (n.energie >= 40 ? 4 : -4) + (has('travailleur') ? 4 : 0) - (a.late ? 5 : 0);
  J.day = dayIdx(s.t); J.week++;
  J.perf = clamp(J.perf + gain, 0, 100);
  let msg = `Journée de travail terminée. Performance ${gain >= 0 ? '+' : ''}${gain}${a.late ? ' (retard)' : ''}.`;
  if (J.perf >= 100 && J.level < JOB.length - 1) {
    J.level++; J.perf = 30;
    toast(`Promotion ! ${nm()} devient ${JOB[J.level].titre}. Salaire : ${fmtDH(JOB[J.level].salaire)} par semaine.`, 'good');
  } else toast(msg, gain < 0 ? 'bad' : '');
}
function minuteEvent(T) {
  const s = G.s, d = dayIdx(T), w = d % 7, mm = T % 1440;
  if (w === 0 && mm === 6 * 60 && d > 0 && s.lastBill !== d) {
    s.lastBill = d;
    s.money -= LOYER + FACTURE;
    toast(`Loyer de la semaine (${fmtDH(LOYER)}) et facture d'eau et d'électricité (${fmtDH(FACTURE)}) payés.`);
    if (s.money < 0) toast('Attention : ton compte est à découvert.', 'bad');
  }
  if (w <= 4 && mm === 8 * 60 + 20 && s.job.day !== d) {
    if (!s.away) goWork(); else if (s.away.lieu !== 'travail') G.pendingWork = true;
  }
  if (w <= 4 && mm === 12 * 60 && s.job.day !== d && !(s.away && s.away.lieu === 'travail')) {
    s.job.day = d; s.job.perf = Math.max(0, s.job.perf - 15); G.pendingWork = false;
    toast("Absence au travail aujourd'hui. Ton chef n'est pas content (performance -15).", 'bad');
  }
  if (w === 4 && mm === 18 * 60) {
    const J = s.job, pay = Math.round(JOB[J.level].salaire * J.week / 5);
    if (pay) { s.money += pay; toast(`Salaire de la semaine : +${fmtDH(pay)} (${J.week} jour${J.week > 1 ? 's' : ''} travaillé${J.week > 1 ? 's' : ''}).`, 'good'); }
    else toast('Pas de salaire cette semaine : aucun jour travaillé.', 'bad');
    J.week = 0;
  }
  if (mm % 60 === 0) save();
  greetings();
}
// Les voisins qu'on connaît font signe quand on se croise.
function greetings() {
  const s = G.s;
  if (s.away) return;
  for (const n of G.npcs) {
    if (!n.visible || n.state === 'talk' || (s.rel[n.id] || 0) < 20 || s.t - n.greetedAt < 300) continue;
    if (Math.hypot(n.x - s.pos.x, n.z - s.pos.z) > 3) continue;
    n.greetedAt = s.t;
    s.needs.social = clamp(s.needs.social + 3, 0, 100);
    toast(`${n.def.nom} te fait signe.`);
  }
}

// ---------- Besoins ----------
function applyNeeds(m, extra) {
  const s = G.s, n = s.needs, c = G.cur;
  const r = { faim: has('gourmand') ? -6.5 : -5, energie: -5, hygiene: -3, social: has('sociable') ? -2.2 : -1.5, moral: -2 + G.amb / 10 };
  if (extra) for (const k in extra) r[k] += extra[k];
  if (!s.away && c && c.stage === 'do') {
    if (c.rates) for (const k in c.rates) r[k] += c.rates[k];
    const A = c.it.act && ACT[c.it.act];
    if (A && A.rates) for (const k in A.rates) r[k] += A.rates[k] * (k === 'moral' && c.it.act === 'douche' && has('soigne') ? 1.5 : 1);
    if (c.gain && isFinite(c.dur)) for (const k in c.gain) r[k] += c.gain[k] / c.dur * 60;
  }
  for (const k of ['faim', 'energie', 'hygiene']) if (n[k] < 25) r.moral -= 4;
  if (n.social < 20) r.moral -= 3;
  if (n.faim <= 0) r.moral -= 6;
  if (has('soigne') && n.hygiene < 50) r.moral -= 3;
  for (const k in r) n[k] = clamp(n[k] + r[k] * m / 60, 0, 100);
}
const ALERTS = {
  faim: n => `${n} a faim.`,
  energie: n => `${n} tombe de fatigue.`,
  hygiene: n => `${n} aurait bien besoin d'une douche.`,
  social: n => `${n} se sent seul(e). Un tour au café ferait du bien.`,
  moral: n => `${n} n'a pas le moral.`,
};
function checkAlerts() {
  const s = G.s, n = s.needs;
  for (const k in ALERTS) {
    if (n[k] < 20 && !G.alerts[k]) { G.alerts[k] = true; toast(ALERTS[k](nm()), 'bad'); }
    if (n[k] > 35) G.alerts[k] = false;
  }
  const c = G.cur, sleeping = c && c.stage === 'do' && ['dormir', 'sieste', 'evanoui'].includes(c.it.act);
  if (n.energie <= 0 && !sleeping && !s.away) {
    cancelAll();
    n.moral = clamp(n.moral - 10, 0, 100);
    enqueue({ kind: 'act', act: 'evanoui', auto: true }, true);
    toast(`${nm()} s'endort sur place, à bout de forces.`, 'bad');
  }
}

// Libre arbitre : le personnage s'occupe de lui quand il n'a rien à faire.
function decide() {
  const s = G.s, n = s.needs, h = hour(s.t);
  const tryAct = (types, act, param) => {
    for (const f of s.home.furn.filter(f => types.includes(f.type))) {
      const it = { kind: 'act', fid: f.id, act, param, auto: true };
      if (!checkAct(it) && planSpot(f, act, Wd.blockedGrid(s.home))) { enqueue(it); return true; }
    }
    return false;
  };
  if ((n.energie < 20 || ((h >= 23 || h < 6) && n.energie < 70)) && tryAct(['lit', 'lit1'], 'dormir')) return;
  if (n.faim < 35) {
    const p = s.plats.filter(p => p.r !== 'the').sort((a, b) => b.q - a.q)[0];
    if (p && tryAct(['table', 'mida', 'banquette', 'frigo'], 'manger', p.r + ':' + p.q)) return;
    if (s.inv.snack > 0 && tryAct(['frigo'], 'casse')) return;
    const r = ['msemen', 'tajine'].find(r => s.inv[r] > 0);
    if (r && tryAct(['cuisiniere'], 'cuisiner', r)) return;
  }
  if (n.hygiene < 30 && tryAct(['douche'], 'douche')) return;
  if (n.social < 35 && h >= 8 && h < 22 && cafeOuvert(s.t) && s.money >= 10) {
    const i = G.chairs.findIndex(c => !c);
    if (i >= 0) { enqueue({ kind: 'cafe', chair: i, opt: 'the', auto: true }); return; }
  }
  if (n.moral < 45 && (tryAct(['tv'], 'tele') || tryAct(['banquette', 'pouf'], 'detente'))) return;
  if (!isHome() && h >= 22 && tryAct(['lit', 'lit1'], 'dormir')) return;
}

// ---------- Les voisins ----------
let npcGrid = null;
const grid = () => npcGrid || (npcGrid = Wd.blockedGrid(G.s.home, null, true));
const dehors = (n, h) => n.def.sorties.some(([a, b]) => h >= a && h < b);
function goTo(n, targets, goal, chair = -1) {
  const path = Wd.findPath(G.s.home, Math.floor(n.x), Math.floor(n.z), targets, grid());
  if (!path) { n.state = 'idle'; n.nextAt = G.s.t + 5; return false; }
  n.path = path.slice(1).map(center); n.state = 'walk'; n.goal = goal; n.chairGoal = chair;
  return true;
}
function leaveChair(n) { if (n.chair >= 0) { G.chairs[n.chair] = null; n.chair = -1; } }
function spawn(n) {
  const p = center(n.def.porte);
  n.visible = true; n.x = p.x; n.z = p.z; n.yaw = 0; n.state = 'idle'; n.nextAt = G.s.t + 1; n.path = [];
}
function choose(n) {
  const s = G.s, def = n.def, r = Math.random();
  if (def.serveur) {
    if (r < 0.6) return goTo(n, [CAFE.poste], 'post');
    return goTo(n, [{ x: 13 + Math.floor(Math.random() * 9), z: D + 1 }], 'stroll');
  }
  if (def.poste && r < 0.5) return goTo(n, [def.poste], 'stroll');
  if (r < def.cafe && cafeOuvert(s.t)) {
    const free = CAFE.chaises.map((c, i) => i).filter(i => !G.chairs[i]);
    if (free.length) {
      const i = pick(free);
      G.chairs[i] = n.id;
      return goTo(n, Wd.approachCells(s.home, [CAFE.chaises[i]], grid()), 'cafe', i);
    }
  }
  goTo(n, [pick(Wd.sidewalkCells())], 'stroll');
}
function npcArrive(n) {
  const s = G.s;
  if (n.goal === 'home') { n.visible = false; n.state = 'home'; return; }
  if (n.goal === 'cafe') {
    const i = n.chairGoal, c = CAFE.chaises[i];
    if (G.chairs[i] !== n.id) { n.state = 'idle'; n.nextAt = s.t + 2; return; }
    n.chair = i; n.x = c.x + 0.5; n.z = c.z + 0.5; n.yaw = c.r * Math.PI / 2;
    n.state = 'sit'; n.nextAt = s.t + rand(30, 90);
    return;
  }
  n.state = 'idle'; n.nextAt = s.t + rand(3, 15);
  if (n.goal === 'post') n.yaw = Math.PI;
}
function stepNpcs(m) {
  const s = G.s, h = hour(s.t);
  for (const n of G.npcs) {
    if (n.state === 'talk') { if (s.t >= n.talkUntil && !(G.cur && G.cur.it.kind === 'talk' && G.cur.it.npc === n.id)) { n.state = 'idle'; n.nextAt = s.t + 2; } continue; }
    const out = dehors(n, h);
    if (!out) {
      if (n.state === 'home') continue;
      if (n.goal !== 'home') {
        if (n.chairGoal >= 0 && G.chairs[n.chairGoal] === n.id) G.chairs[n.chairGoal] = null;
        leaveChair(n);
        if (!goTo(n, [n.def.porte], 'home')) { n.visible = false; n.state = 'home'; }
      }
    } else if (n.state === 'home') spawn(n);
    if (n.state === 'walk') { if (walkAlong(n, m, 1.3)) npcArrive(n); }
    else if (s.t < (n.hold || 0)) continue;
    else if (n.state === 'idle' && s.t >= n.nextAt) choose(n);
    else if (n.state === 'sit' && s.t >= n.nextAt) { leaveChair(n); n.state = 'idle'; n.nextAt = s.t + 1; }
  }
  for (const p of G.passants) {
    if (p.visible) { if (walkAlong(p, m, 1.5)) { p.visible = false; p.nextAt = s.t + rand(8, 40); } continue; }
    if (s.t < p.nextAt || h < 7 || h >= 23) continue;
    const far = Math.random() < 0.5, z = far ? D + 12 : D + 1, fromLeft = Math.random() < 0.5;
    const a = { x: fromLeft ? X0 + 1 : X1 - 2, z }, b = { x: fromLeft ? X1 - 2 : X0 + 1, z };
    const path = Wd.findPath(s.home, a.x, a.z, [b], grid());
    if (!path) { p.nextAt = s.t + 30; continue; }
    const c = center(a);
    p.visible = true; p.x = c.x; p.z = c.z; p.path = path.slice(1).map(center);
  }
}

// ---------- Boucle ----------
export function advance(mins) {
  while (mins > 0 && G.s) { const m = Math.min(0.5, mins); step(m); mins -= m; }
}
function step(m) {
  const s = G.s, t0 = s.t;
  s.t += m;
  for (let k = Math.floor(t0) + 1; k <= Math.floor(s.t); k++) minuteEvent(k);
  stepNpcs(m);
  if (s.away) { stepAway(m); return; }
  if (!G.cur && G.queue.length) startItem(G.queue.shift());
  const c = G.cur;
  if (c) {
    if (c.stage === 'walk') walk(c, m);
    else {
      c.t += m;
      const over = c.dur === Infinity ? s.needs.energie >= 99.5 || c.t > 14 * 60 : c.t >= c.dur;
      if (over) finish(c);
    }
  } else {
    G.idle += m;
    if (G.idle >= 20) { G.idle = 0; if (s.autonomy) decide(); }
  }
  applyNeeds(m);
  checkAlerts();
}

// Ce que la 3D doit afficher.
export function view() {
  const s = G.s, c = G.cur;
  let x = s.pos.x, z = s.pos.z, yaw = G.yaw, pose = { base: 'stand' }, active = null;
  if (c && c.stage === 'walk') pose = { base: 'walk' };
  if (c && c.stage === 'do' && c.spot) {
    x = c.spot.x; z = c.spot.z; yaw = c.spot.yaw;
    pose = c.spot.pose === 'shower' ? { base: 'stand', anim: 'shower', h: c.spot.h } : { base: c.spot.pose, anim: c.spot.anim, h: c.spot.h };
    active = { fid: c.it.fid, act: c.it.act };
  }
  const npcs = G.npcs.map(n => ({
    id: n.id, visible: n.visible, x: n.x, z: n.z, yaw: n.yaw, walkPhase: n.walkPhase,
    pose: n.state === 'walk' ? { base: 'walk' } : n.state === 'sit' ? { base: 'sit', h: 0.45, anim: 'eat' } : n.state === 'talk' ? { base: 'stand', anim: 'talk' } : { base: 'stand' },
  })).concat(G.passants.map(p => ({ id: p.id, visible: p.visible, x: p.x, z: p.z, yaw: p.yaw, walkPhase: p.walkPhase, pose: { base: 'walk' } })));
  return { visible: !s.away, x, z, yaw, pose, walkPhase: G.walkPhase, t: s.t, active, outside: !Wd.inHome(Math.floor(x), Math.floor(z)), npcs };
}
export function progress() {
  const c = G.cur;
  if (!c || c.stage !== 'do') return 0;
  if (c.dur === Infinity) return G.s.needs.energie / 100;
  return clamp(c.t / c.dur, 0, 1);
}
