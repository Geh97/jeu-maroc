// La simulation : temps, besoins, actions, sorties, travail, argent, sauvegarde.
import {
  SAVE_KEY, START_MONEY, LOYER, FACTURE, WALK, FURN, ACT, RECETTES, QUAL, QUAL_MORAL,
  MARCHE, LIEUX, JOB,
} from './data.js';
import * as Wd from './world.js';

export const G = {
  s: null,          // état sauvegardé
  cur: null,        // action en cours
  queue: [],        // actions en attente
  speed: 1, mode: 'live', modal: false,
  yaw: 0, walkPhase: 0, idle: 0, amb: 0, alerts: {}, pendingWork: false, qid: 1,
};
export const hooks = { toast: () => {} };
const toast = (m, k) => hooks.toast(m, k);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const has = t => G.s.char.traits.includes(t);
const nm = () => G.s.char.name;

// ---------- Temps et formats ----------
export const dayIdx = t => Math.floor(t / 1440);
export const dow = t => dayIdx(t) % 7;
export const hm = t => { const m = Math.floor(t % 1440); return { h: Math.floor(m / 60), m: m % 60 }; };
export const fmtTime = t => { const { h, m } = hm(t); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
export const fmtDH = n => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ') + ' DH';
export const fmtDur = m => (m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) : ''));

// ---------- Partie ----------
export function newGame(look) {
  const home = Wd.defaultHome(), ent = Wd.entrance(home);
  G.s = {
    v: 1, char: look, t: 7 * 60, money: START_MONEY,
    needs: { faim: 70, energie: 80, hygiene: 75, moral: 65 },
    skills: { cuisine: 0 },
    inv: { the: 2, msemen: 1, tajine: 0, snack: 2 },
    plats: [],
    job: { level: 0, perf: 40, day: -1, week: 0 },
    home, pos: { x: ent.x + 0.5, z: ent.z + 0.5 }, away: null, lastBill: 0, autonomy: true,
  };
  resetRuntime();
  save();
}
function resetRuntime() {
  G.cur = null; G.queue = []; G.idle = 0; G.alerts = {}; G.pendingWork = false;
  G.yaw = Math.PI; G.amb = Wd.ambiance(G.s.home);
}
export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || s.v !== 1) return false;
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

// ---------- Ce qu'on peut faire ----------
const getF = id => G.s.home.furn.find(f => f.id === id);
const findPlat = key => { const [r, q] = key.split(':'); return G.s.plats.find(p => p.r === r && p.q === +q); };

export function itemLabel(it) {
  if (it.kind === 'goto') return 'Aller ici';
  if (it.kind === 'out') {
    if (it.lieu === 'travail') return 'Partir au travail';
    const L = LIEUX[it.lieu];
    const o = L.options && L.options.find(x => x.id === it.opt);
    return o ? o.nom : 'Courses au marché';
  }
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
      { act: 'lieu', param: 'cafe', label: 'Aller au café du quartier', sub: '5 min à pied' },
      { act: 'lieu', param: 'hammam', label: 'Aller au hammam', sub: '10 min à pied' },
      { act: 'lieu', param: 'marche', label: 'Faire les courses au marché', sub: '10 min à pied' },
      { act: 'travail', label: 'Partir au travail', sub: w || 'Tram : 30 min', disabled: !!w, why: w },
    ],
  };
}
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
  if (c && c.stage === 'do' && c.it.act === 'cuisiner') toast('Préparation abandonnée.');
  G.cur = null;
}
const fail = (it, why) => { if (!it.auto) toast(why); G.cur = null; };
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const tileOf = p => ({ x: Math.floor(p.x), z: Math.floor(p.z) });

function startItem(it) {
  const s = G.s, home = s.home, blocked = Wd.blockedGrid(home), here = tileOf(s.pos);
  const go = (targets, extra) => {
    const path = Wd.findPath(home, here.x, here.z, targets, blocked);
    if (!path) return null;
    G.cur = { it, stage: 'walk', path: path.slice(1).map(p => ({ x: p.x + 0.5, z: p.z + 0.5 })), t: 0, ...extra };
    if (here.x === path[0].x && here.z === path[0].z) G.cur.path.unshift({ x: here.x + 0.5, z: here.z + 0.5 });
    return path;
  };
  if (it.kind === 'goto') { if (!go([{ x: it.x, z: it.z }])) fail(it, "Impossible d'aller là."); return; }
  if (it.kind === 'out') { if (!go([Wd.entrance(home)])) fail(it, "Impossible d'atteindre la porte."); return; }
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

function walk(c, m) {
  const s = G.s;
  let left = WALK * m;
  while (left > 0 && c.path.length) {
    const p = c.path[0], dx = p.x - s.pos.x, dz = p.z - s.pos.z, L = Math.hypot(dx, dz);
    if (L > 0.001) G.yaw = Math.atan2(dx, dz);
    if (L <= left) { s.pos = { x: p.x, z: p.z }; c.path.shift(); left -= L; G.walkPhase += L * 5; }
    else { s.pos = { x: s.pos.x + dx / L * left, z: s.pos.z + dz / L * left }; G.walkPhase += left * 5; left = 0; }
  }
  if (!c.path.length) arrive(c);
}

function arrive(c) {
  const s = G.s, it = c.it;
  if (it.kind === 'goto') { G.cur = null; return; }
  if (it.kind === 'out') { depart(it); return; }
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

// ---------- Sorties ----------
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
    phases.push({ until: Math.max(t0 + L.trajet + 60, end), label: L.ici, work: true, extra: { faim: 2.5 } });
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
  const s = G.s, a = s.away, ent = Wd.entrance(s.home);
  s.away = null;
  s.pos = { x: ent.x + 0.5, z: ent.z + 0.5 };
  G.yaw = Math.atan2(-ent.out.x, -ent.out.z);
  if (a.lieu === 'marche') {
    for (const k in a.basket) s.inv[k] = (s.inv[k] || 0) + a.basket[k];
    toast(`${nm()} est de retour. Les courses sont rangées dans le frigo.`);
  } else toast(`${nm()} est de retour à la maison.`);
  save();
  const d = dayIdx(s.t);
  if (G.pendingWork && dow(s.t) <= 4 && hm(s.t).h < 12 && s.job.day !== d) goWork();
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
  if (w <= 4 && mm === 8 * 60 + 30 && s.job.day !== d) {
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
}

// ---------- Besoins ----------
function applyNeeds(m, extra) {
  const s = G.s, n = s.needs, c = G.cur;
  const r = { faim: has('gourmand') ? -6.5 : -5, energie: -5, hygiene: -3, moral: -2 + G.amb / 10 };
  if (extra) for (const k in extra) r[k] += extra[k];
  if (!s.away && c && c.stage === 'do') {
    const A = ACT[c.it.act];
    if (A.rates) for (const k in A.rates) r[k] += A.rates[k] * (k === 'moral' && c.it.act === 'douche' && has('soigne') ? 1.5 : 1);
    if (c.gain && isFinite(c.dur)) for (const k in c.gain) r[k] += c.gain[k] / c.dur * 60;
  }
  for (const k of ['faim', 'energie', 'hygiene']) if (n[k] < 25) r.moral -= 4;
  if (n.faim <= 0) r.moral -= 6;
  if (has('soigne') && n.hygiene < 50) r.moral -= 3;
  for (const k in r) n[k] = clamp(n[k] + r[k] * m / 60, 0, 100);
}
const ALERTS = {
  faim: n => `${n} a faim.`,
  energie: n => `${n} tombe de fatigue.`,
  hygiene: n => `${n} aurait bien besoin d'une douche.`,
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
  const s = G.s, n = s.needs, { h } = hm(s.t);
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
  }
  if (n.hygiene < 30 && tryAct(['douche'], 'douche')) return;
  if (n.moral < 45 && (tryAct(['tv'], 'tele') || tryAct(['banquette', 'pouf'], 'detente'))) return;
}

// ---------- Boucle ----------
export function advance(mins) {
  while (mins > 0 && G.s) { const m = Math.min(0.5, mins); step(m); mins -= m; }
}
function step(m) {
  const s = G.s, t0 = s.t;
  s.t += m;
  for (let k = Math.floor(t0) + 1; k <= Math.floor(s.t); k++) minuteEvent(k);
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
  return { visible: !s.away, x, z, yaw, pose, walkPhase: G.walkPhase, t: s.t, active };
}
export function progress() {
  const c = G.cur;
  if (!c || c.stage !== 'do') return 0;
  if (c.dur === Infinity) return G.s.needs.energie / 100;
  return clamp(c.t / c.dur, 0, 1);
}
