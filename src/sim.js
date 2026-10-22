// La simulation : temps, besoins, actions, quartier, voisins, animaux, argent, sauvegarde.
import {
  SAVE_KEY, WALK, FURN, ACT, RECETTES, QUAL, QUAL_MORAL,
  MARCHE, LIEUX, RUE, CAFE, HANOUT, NPCS, PASSANTS, SALUTS, X0, X1, D, matchEnCours, relLabel,
  MILIEUX, POCHE, EPARGNE_TAUX, DARET, BOULOTS, VENTE, VENTE_MAX, ACHETEURS, ANIMAUX, ADOPT_SEUIL,
  SUJETS, GOUTS, REPONSES, EVENEMENTS, PLATS_SUCRES, TAXI, SORTIES, MARCHANDAGE, OUTFIT_COLORS,
  QUARTIERS, NPCS_ANFA, GOUTS_ANFA, BOULOTS_ANFA, CAUTION_SEMAINES, VEHICULES, NPCS_CORNICHE, GOUTS_CORNICHE, PLAGE, PLAGE_ACTS,
} from './data.js';
const GOUTS_ALL = { ...GOUTS, ...GOUTS_ANFA, ...GOUTS_CORNICHE }, BOULOTS_ALL = [...BOULOTS, ...BOULOTS_ANFA];
import * as Wd from './world.js';
import { initSocial, socialMinute, remarque, rep, remiseHanout, creditPossible, evite } from './social.js';
import { initFetes, fetesMinute, calendrier, ramadan, jeune, rompreJeune, cafeRamadan, finTravail, ferie } from './fetes.js';
import { initVie, vieMinute, amourNpcDefs, conjointView, conjointLabel, startConjoint, arriveConjoint, finishConjoint } from './vie.js';
import { initObjectifs, objectifsMinute } from './objectifs.js';
import { initParents, parentsMinute, parentsView, parentLabel, startParent, arriveParent, finishParent } from './parents.js';
import { initTravail, collegueDefs, personnaliser, effetCollegue, paie, extraNoir, finExtraNoir, potDepart, journeeAffaire, evenementAffaire, jourAffaire, hausseLoyer } from './travail.js';

export const G = {
  s: null,          // état sauvegardé
  cur: null,        // action en cours
  queue: [],        // actions en attente
  npcs: [], passants: [], animaux: [], chairs: [],
  speed: 1, mode: 'live', modal: false,
  yaw: 0, walkPhase: 0, idle: 0, amb: 0, alerts: {}, pendingWork: false, workAsk: false, qid: 1,
};
export const hooks = { toast: () => {}, askWork: () => {}, workEvent: () => {}, sortieEvent: () => {}, lookChanged: () => {}, quartierChanged: () => {} };
const toast = (m, k) => hooks.toast(m, k);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const clampv = clamp;
export const ambiance = home => Wd.ambiance(home);
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
export const cafeOuvert = t => (ramadan() ? cafeRamadan(hour(t)) : hour(t) >= CAFE.ouvre && hour(t) < CAFE.ferme);
export const hanoutOuvert = t => hour(t) >= HANOUT.ouvre && hour(t) < HANOUT.ferme;
export const hanoutCost = b => Math.round(HANOUT.articles.reduce((t, m) => t + (b[m.id] || 0) * prix(m.prix), 0) * remiseHanout());
export const milieu = () => MILIEUX[G.s.milieu];
export const jobOf = () => milieu().jobs[G.s.job.level];
export const revenu = k => milieu().revenus.includes(k);
// Le quartier où l'on est, celui où l'on habite, et les prix du coin.
export const Q = () => QUARTIERS[G.s.quartier];
export const homeHere = () => G.s.quartier === G.s.chezMoi;
export const prix = p => Math.round(p * Q().coeff);
export const npcDefs = (q = G.s.quartier) => (q === 'anfa' ? NPCS_ANFA : q === 'corniche' ? NPCS_CORNICHE : NPCS).concat(q === G.s.chezMoi ? collegueDefs(G.s.milieu) : [], q === G.s.quartier ? amourNpcDefs() : []);
// Quand la liste des gens du quartier change (une rencontre, un mariage), on la reconstruit sans perdre ceux qui sont là.
export function refreshNpcs() {
  if (!G.s || !G.npcs) return;
  const old = new Map(G.npcs.map(n => [n.id, n]));
  G.npcs = npcDefs().map(def => old.get(def.id) || { id: def.id, def, visible: false, x: 0, z: 0, yaw: 0, state: 'home', path: [], walkPhase: 0, nextAt: 0, chair: -1, goal: null, talkUntil: 0, greetedAt: -9999, talks: 0, talkDay: -1, sujets: {}, sujetsDay: -1 });
  npcGrid = null;
  hooks.quartierChanged();
}
// Le loyer hebdomadaire : celui du milieu dans le quartier d'origine, sinon celui du quartier.
const loyerMilieu = () => (G.s.independant && milieu().loyerSeul ? milieu().loyerSeul : milieu().loyer);
export const loyerHebdo = (q = G.s.chezMoi) => Math.round((q === 'populaire' ? loyerMilieu() : Math.max(700, loyerMilieu()) * QUARTIERS[q].loyer) * (G.s.loyerMult || 1));
export const vehicule = () => (G.s.vehicule ? VEHICULES[G.s.vehicule] : null);

// ---------- Partie ----------
export function newGame(look) {
  const m = MILIEUX[look.milieu] ? look.milieu : 'moyen';
  const home = Wd.defaultHome(m), ent = Wd.entrance(home);
  G.s = {
    v: 3, char: look, milieu: m, t: 7 * 60, money: MILIEUX[m].argent,
    needs: { faim: 70, energie: 80, hygiene: 75, social: 55, moral: 65 },
    skills: { cuisine: 0 },
    inv: { the: 2, msemen: 1, tajine: 0, snack: 2, patee: 0, tartines: 3, oeufs: 2, salade: 1 },
    plats: [],
    job: { level: 0, perf: 40, day: -1, week: 0, absences: 0, competence: 0, collegues: 50 },
    rel: {}, ventes: { day: -1 }, boulots: { day: -1 }, daret: null, epargne: 0, autoWork: false,
    animaux: {}, stock: {}, home, pos: center(ent), away: null, lastBill: 0, autonomy: true,
    quartier: 'populaire', chezMoi: 'populaire', visites: { populaire: true }, vehicule: null, pratique: look.pratique || 'occasionnel',
  };
  initSocial(G.s);
  initTravail(G.s);
  initFetes(G.s);
  initVie(G.s);
  initParents(G.s);
  initObjectifs(G.s);
  for (const a of ANIMAUX) G.s.animaux[a.id] = { confiance: 0, adopte: false, nom: '', faim: 70, fled: 0 };
  resetRuntime();
  save();
}
function resetRuntime() {
  const s = G.s;
  G.cur = null; G.queue = []; G.idle = 0; G.alerts = {}; G.pendingWork = false; G.workAsk = false;
  G.yaw = Math.PI; G.amb = Wd.ambiance(s.home);
  G.chairs = CAFE.chaises.map(() => null);
  G.npcs = npcDefs().map(def => ({ id: def.id, def, visible: false, x: 0, z: 0, yaw: 0, state: 'home', path: [], walkPhase: 0, nextAt: 0, chair: -1, goal: null, talkUntil: 0, greetedAt: -9999, talks: 0, talkDay: -1, sujets: {}, sujetsDay: -1 }));
  Wd.setBlocking({ noHome: !homeHere(), vehicule: s.vehicule, quartier: s.quartier });
  G.passants = PASSANTS.map((look, i) => ({ id: 'p' + i, look, visible: false, x: 0, z: 0, yaw: 0, path: [], walkPhase: 0, nextAt: rand(0, 40) }));
  G.animaux = ANIMAUX.map(def => {
    const home = s.animaux[def.id].adopte, c = home ? center({ x: 6, z: 7 }) : center(def.coin);
    return { id: def.id, def, x: c.x, z: c.z, yaw: 0, state: 'idle', path: [], walkPhase: 0, nextAt: 0, hold: 0 };
  });
  npcGrid = null;
}
export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || !(s.v >= 1 && s.v <= 3)) return false;
    if (s.v === 1) { s.needs.social = 60; s.rel = {}; }
    if (s.v < 3) {
      s.milieu = 'moyen'; s.ventes = { day: -1 }; s.boulots = { day: -1 }; s.daret = null; s.epargne = 0; s.autoWork = true;
      s.job.absences = 0; s.inv.patee = 0; s.animaux = {};
      for (const a of ANIMAUX) s.animaux[a.id] = { confiance: 0, adopte: false, nom: '', faim: 70, fled: 0 };
      s.v = 3;
    }
    if (s.job.competence == null) { s.job.competence = 0; s.job.collegues = 50; }
    if (!s.stock) s.stock = {};
    if (!s.quartier) { s.quartier = 'populaire'; s.chezMoi = 'populaire'; s.visites = { populaire: true }; s.vehicule = null; }
    initSocial(s);
    initTravail(s);
    initFetes(s);
    initVie(s);
    initParents(s);
    initObjectifs(s);
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
export const getNpc = getN;
export const relOf = id => G.s.rel[id] || 0;
const getA = id => G.animaux.find(a => a.id === id);
const findPlat = key => { const [r, q] = key.split(':'); return G.s.plats.find(p => p.r === r && p.q === +q); };
const boulotOf = id => BOULOTS_ALL.find(b => b.id === id);

export function itemLabel(it) {
  if (it.kind === 'goto') return 'Aller ici';
  if (it.kind === 'out') {
    if (it.lieu === 'travail') return 'Partir au travail';
    const L = LIEUX[it.lieu];
    const o = L.options && L.options.find(x => x.id === it.opt);
    return o ? o.nom : 'Courses au marché';
  }
  if (it.kind === 'cafe') return 'Café : ' + CAFE.options.find(o => o.id === it.opt).nom.toLowerCase();
  if (it.kind === 'hanout') return 'Courses au hanout';
  if (it.kind === 'sortie') return SORTIES[it.dest].nom + (vehicule() ? '' : ' (' + TAXI[it.taxi].nom.toLowerCase() + ')');
  if (it.kind === 'quartier') return (it.to === G.s.chezMoi ? 'Rentrer ' : 'Aller ') + QUARTIERS[it.to].article + (vehicule() ? '' : ' (' + TAXI[it.taxi].nom.toLowerCase() + ')');
  if (it.kind === 'plage') return PLAGE_ACTS[it.act].nom;
  if (it.kind === 'animal') return ANIMAL_ACTS[it.act].label + ' : ' + animalName(it.id);
  if (it.kind === 'parent') return parentLabel(it);
  if (it.kind === 'conjoint') return conjointLabel(it);
  if (it.kind === 'talk') {
    const n = getN(it.npc).def.nom;
    if (it.mode === 'boulot') return boulotOf(it.boulot).nom;
    if (it.mode === 'vendre') return 'Vendre à ' + n;
    if (it.mode === 'sujet') return SUJETS.find(s => s.id === it.sujet).label + ' : ' + n;
    if (it.mode === 'inviter') return 'Inviter ' + n + ' au café';
    if (it.mode === 'offrir') return 'Offrir un plat à ' + n;
    return (it.mode === 'saluer' ? 'Saluer ' : 'Discuter avec ') + n;
  }
  if (it.act === 'cuisiner') return 'Préparer : ' + RECETTES[it.param].nom;
  if (it.act === 'manger') return 'Manger : ' + RECETTES[it.param.split(':')[0]].nom;
  if (it.act === 'boire') return 'Boire un verre de thé';
  return ACT[it.act].label;
}

function checkAct(it) {
  const s = G.s;
  if (jeune() && ['manger', 'boire', 'casse'].includes(it.act)) return 'C\'est le Ramadan : on attend le ftour. (Menu : rompre le jeûne.)';
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
      info = `Cuisine : niveau ${lvl}. Les recettes difficiles ratent souvent au début.`;
      let teaser = false;
      for (const r in RECETTES) {
        const R = RECETTES[r], n = s.inv[r] || 0;
        const hard = R.d > lvl + 1;
        // Les recettes trop difficiles restent cachées ; on montre juste la prochaine à débloquer.
        if (R.d > lvl + 2) { if (!teaser) { teaser = true; items.push({ act: 'cuisiner', param: r, label: 'Bientôt : ' + R.nom, sub: `Se débloque au niveau ${R.d - 2} de cuisine`, disabled: true, why: 'Pas encore à ta portée.' }); } continue; }
        items.push({
          act: 'cuisiner', param: r, label: 'Préparer : ' + R.nom,
          sub: n ? `${fmtDur(R.dur)} · difficulté ${R.d}${hard ? ' (trop dur pour l\'instant)' : ''}${R.vendredi ? ' · le vendredi, moral en plus' : ''} · ${n} lot${n > 1 ? 's' : ''}` : `Difficulté ${R.d} · ingrédients au marché`,
          disabled: !n, why: "Il manque les ingrédients : passe au marché ou au hanout.",
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
    const inv = Object.keys(RECETTES).filter(r => s.inv[r] > 0).map(r => `${RECETTES[r].nom.split(' ')[0].toLowerCase()} ${s.inv[r]}`).join(' · ');
    info = `Ingrédients au frais : ${inv || 'rien'}`;
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
      { act: 'hanout', label: 'Courses au hanout', sub: hanoutOuvert(G.s.t) ? 'À côté, un peu plus cher' : `Fermé (ouvre à ${HANOUT.ouvre} h)`, disabled: !hanoutOuvert(G.s.t) },
      { act: 'sorties', label: 'Sortir en ville (taxi)', sub: 'Anfa, la corniche, le mall, la médina' },
      { act: 'lieu', param: 'hammam', label: 'Aller au hammam', sub: 'À deux rues, 8 min' },
      { act: 'lieu', param: 'marche', label: 'Faire les courses au marché', sub: 'À deux rues, 8 min' },
      { act: 'travail', label: 'Partir au travail', sub: w || 'Tram : 25 min', disabled: !!w, why: w },
    ],
  };
}
export function chairActions(i) {
  const s = G.s, c = CAFE.chaises[i], occ = G.chairs[i], nom = Q().cafeNom;
  if (occ && occ !== 'player') return { title: nom, items: [], info: `${getN(occ).def.nom} est assis(e) ici.` };
  if (!cafeOuvert(s.t)) return { title: nom, items: [], info: `Le café est fermé. Il ouvre à ${CAFE.ouvre} h.` };
  const h = hour(s.t), match = matchEnCours(dow(s.t), h);
  const voisin = G.npcs.find(n => n.chair >= 0 && CAFE.chaises[n.chair].table === c.table);
  const items = CAFE.options.filter(o => (!o.jusqua || h < o.jusqua) && (!o.de || h >= o.de)).filter(o => !o.match || match).filter(o => !o.voisin || voisin).map(o => ({
    act: 'cafe', chair: i, opt: o.id, label: o.nom + (o.voisin ? ` : ${voisin.def.nom}` : ''), sub: `${fmtDH(prix(o.prix))} · ${fmtDur(o.dur)}`, disabled: prix(o.prix) > s.money, why: "Pas assez d'argent.",
  }));
  return { title: nom, items, info: voisin ? `${voisin.def.nom} est à cette table.` : 'Une chaise libre en terrasse.' };
}
const sellable = () => G.s.plats.filter(p => VENTE[p.r] && VENTE[p.r][p.q] > 0);
export function npcActions(id) {
  const n = getN(id), s = G.s, rel = s.rel[id] || 0, d = dayIdx(s.t);
  const items = [
    { kind: 'talk', npc: id, mode: 'saluer', label: 'Saluer', sub: 'Un bonjour en passant' },
  ];
  sujetsOf(n);
  const fuit = evite() && s.quartier === 'populaire';
  for (const sj of SUJETS) {
    const done = n.sujets[sj.id];
    items.push({ kind: 'talk', npc: id, mode: 'sujet', sujet: sj.id, label: sj.label, sub: done ? 'Déjà fait aujourd\'hui' : `${fmtDur(sj.dur)}`, disabled: rel < sj.rel || !!done || fuit, why: fuit ? 'Il t\'évite ces temps-ci. Ta réputation est au plus bas.' : rel < sj.rel ? `Il faut mieux se connaître (amitié ${sj.rel}).` : 'Déjà fait aujourd\'hui.' });
  }
  const plat = sellable().find(p => p.r !== 'the');
  items.push({ kind: 'talk', npc: id, mode: 'offrir', plat: plat && plat.r + ':' + plat.q, label: 'Offrir un plat fait maison', sub: plat ? `${RECETTES[plat.r].nom} (${QUAL[plat.q]})` : '', disabled: !plat, why: 'Il faut avoir cuisiné quelque chose de réussi.' });
  if (!n.def.serveur && !n.def.boutique) {
    const libre = CAFE.tables.map((t, ti) => CAFE.chaises.filter((c, ci) => c.table === ti && !G.chairs[ci]).length >= 2).some(Boolean);
    const deux = prix(20);
    const why = !cafeOuvert(s.t) ? 'Le café est fermé.' : n.chair >= 0 ? 'Il est déjà attablé.' : !libre ? 'Pas deux chaises libres à la même table.' : s.money < deux ? `Pas assez d'argent (${deux} DH pour deux thés).` : rel < 10 ? 'Il faut mieux se connaître (amitié 10).' : null;
    items.push({ kind: 'talk', npc: id, mode: 'inviter', label: 'Inviter à prendre un thé au café', sub: `${deux} DH pour deux · 45 min`, disabled: !!why, why });
  }
  if (revenu('boulots') || revenu('cours') || s.quartier === 'anfa') {
    for (const b of BOULOTS_ALL.filter(b => b.npc === id && b.milieux.includes(s.milieu))) {
      const done = s.boulots.day === d && s.boulots[b.id];
      let why = null;
      if (rel < b.rel) why = `Il faut mieux se connaître (amitié ${b.rel}).`;
      else if (done) why = 'Déjà fait aujourd\'hui.';
      else if (b.match && !matchEnCours(dow(s.t), hour(s.t))) why = 'Seulement pendant un match.';
      items.push({ kind: 'talk', npc: id, mode: 'boulot', boulot: b.id, label: b.nom, sub: `${fmtDur(b.dur)} · ${fmtDH(b.paie)}${b.pourboire ? ' + pourboires' : ''}`, disabled: !!why, why });
    }
  }
  if (revenu('vente') && ACHETEURS.includes(id)) {
    const sold = s.ventes.day === d ? s.ventes[id] || 0 : 0, left = VENTE_MAX - sold;
    for (const p of sellable()) {
      const n = Math.min(p.n, left), prix = VENTE[p.r][p.q];
      items.push({ kind: 'talk', npc: id, mode: 'vendre', plat: p.r + ':' + p.q, label: `Vendre : ${RECETTES[p.r].nom.toLowerCase()} (${QUAL[p.q]})`, sub: `${n} part${n > 1 ? 's' : ''} à ${prix} DH = ${fmtDH(n * prix)}`, disabled: left <= 0, why: "Il en a assez acheté pour aujourd'hui." });
    }
  }
  return { title: n.def.nom, items, info: `${relLabelOf(rel)} · ${n.def.desc}`, img: 'portrait-' + id };
}
const relLabelOf = v => relLabel(v) + (v > 0 ? ` (${Math.round(v)})` : '');
// Les sujets déjà abordés avec ce voisin aujourd'hui.
function sujetsOf(n) {
  const d = dayIdx(G.s.t);
  if (n.sujetsDay !== d) { n.sujetsDay = d; n.sujets = {}; }
  return n.sujets;
}
export const basketCost = b => MARCHE.reduce((t, m) => t + (b[m.id] || 0) * m.prix, 0);

// ---------- Animaux : actions ----------
const ANIMAL_ACTS = {
  nourrir: { label: 'Donner à manger', dur: 4 },
  caresser: { label: 'Caresser', dur: 3 },
  jouer: { label: 'Jouer (20 min)', dur: 20 },
  adopter: { label: 'Adopter', dur: 0 },
};
export const animalName = id => { const a = G.s.animaux[id]; return a.adopte && a.nom ? a.nom : ANIMAUX.find(x => x.id === id).nom.toLowerCase(); };
export function animalActions(id) {
  const s = G.s, a = s.animaux[id], def = ANIMAUX.find(x => x.id === id), items = [];
  const conf = Math.round(a.confiance);
  items.push({ kind: 'animal', id, act: 'nourrir', label: ANIMAL_ACTS.nourrir.label, sub: s.inv.patee > 0 ? `${s.inv.patee} portion${s.inv.patee > 1 ? 's' : ''} de restes` : '', disabled: !(s.inv.patee > 0), why: 'Achète des restes de poulet au hanout ou au marché.' });
  items.push({ kind: 'animal', id, act: 'caresser', label: ANIMAL_ACTS.caresser.label, sub: a.adopte || conf >= 20 ? '' : 'Il risque de s\'enfuir' });
  if (a.adopte) items.push({ kind: 'animal', id, act: 'jouer', label: ANIMAL_ACTS.jouer.label });
  else items.push({ kind: 'animal', id, act: 'adopter', label: 'Adopter et ramener à la maison', sub: conf >= ADOPT_SEUIL ? 'Il te suit partout maintenant' : `Confiance ${conf} / ${ADOPT_SEUIL}`, disabled: conf < ADOPT_SEUIL, why: 'Nourris-le et caresse-le plusieurs jours.' });
  const info = a.adopte ? `${a.nom} · faim ${Math.round(a.faim)} / 100` : `${def.desc} Confiance : ${conf} / 100.`;
  return { title: a.adopte ? a.nom : def.nom, items, info, img: 'animal-' + id };
}

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
  if (it.kind === 'goto') { if (!go([{ x: it.x, z: it.z }]) && !go(Wd.approachCells(home, [{ x: it.x, z: it.z }], blocked))) fail(it, "Impossible d'aller là."); return; }
  if (it.kind === 'out') { if (!go([RUE.coin])) fail(it, "Impossible d'atteindre le coin de la rue."); return; }
  if (it.kind === 'hanout') {
    if (!hanoutOuvert(s.t)) return fail(it, 'Le hanout est fermé.');
    if (!go([HANOUT.devant])) return fail(it, "Impossible d'atteindre le hanout.");
    G.cur.spot = { x: HANOUT.devant.x + 0.5, z: HANOUT.devant.z + 0.5, yaw: Math.PI, pose: 'stand', anim: 'talk', h: 0 };
    return;
  }
  if (it.kind === 'sortie' || it.kind === 'quartier') {
    if (!go(Wd.approachCells(home, [TAXI.arret], blocked))) return fail(it, "Impossible d'atteindre l'arrêt de taxi.");
    return;
  }
  if (it.kind === 'cafe') {
    const c = CAFE.chaises[it.chair];
    if (jeune() && it.opt !== 'match' && it.opt !== 'cartes' && it.opt !== 'journal') return fail(it, 'C\'est le Ramadan : rien à consommer avant le ftour.');
    if (G.chairs[it.chair] && G.chairs[it.chair] !== 'player') return fail(it, 'La chaise vient d\'être prise.');
    if (!cafeOuvert(s.t)) return fail(it, 'Le café est fermé.');
    if (!go(Wd.approachCells(home, [c], blocked))) return fail(it, 'Impossible d\'atteindre la terrasse.');
    const opt = CAFE.options.find(o => o.id === it.opt);
    G.cur.spot = { x: c.x + 0.5, z: c.z + 0.5, yaw: c.r * Math.PI / 2, pose: 'sit', h: 0.45, anim: opt.match ? null : 'eat' };
    return;
  }
  if (it.kind === 'plage') {
    const A = PLAGE_ACTS[it.act], h = hour(s.t);
    if (s.quartier !== 'corniche') return fail(it, 'La plage est loin d\'ici.');
    if (h < A.heures[0] || h >= A.heures[1]) return fail(it, `${A.nom} : pas à cette heure-ci (de ${A.heures[0]} h à ${A.heures[1]} h).`);
    const F = PLAGE.foot;
    const cell = it.act === 'bain' ? { x: Math.max(X0 + 1, Math.min(X1 - 2, it.x)), z: PLAGE.eau }
      : it.act === 'foot' ? { x: Math.floor((F.x0 + F.x1) / 2) + (Math.random() < 0.5 ? -2 : 1), z: Math.floor((F.z0 + F.z1) / 2) }
      : { x: it.x, z: it.z + 1 };
    const targets = it.act === 'foot' ? [cell] : Wd.approachCells(home, [cell], blocked);
    if (!targets.length || !go(targets)) return fail(it, "Impossible d'y aller.");
    G.cur.spot = it.act === 'bain' ? { x: cell.x + 0.5, z: cell.z + 0.9, yaw: 0, pose: 'stand', anim: 'swim', h: 0 }
      : it.act === 'foot' ? { x: cell.x + 0.5, z: cell.z + 0.5, yaw: Math.PI / 2, pose: 'walk', anim: null, h: 0 }
      : { x: cell.x + 0.5, z: cell.z + 0.5, yaw: Math.PI, pose: 'lie', h: 0.04 };
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
  if (it.kind === 'parent') return startParent(it, go, home, blocked, fail, Wd.approachCells);
  if (it.kind === 'conjoint') return startConjoint(it, go, home, blocked, fail, Wd.approachCells);
  if (it.kind === 'animal') {
    const a = getA(it.id);
    if (!animalHere(a)) return fail(it, `${animalName(it.id)} n'est pas ici.`);
    const app = Wd.approachCells(home, [tileOf(a)], blocked);
    if (!app.length || !go(app)) return fail(it, `${animalName(it.id)} est hors d'atteinte.`);
    a.hold = s.t + 20;
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
  const seatNear = act === 'tele' || act.startsWith('lire') || (f.type === 'mida' && (act === 'manger' || act === 'boire'));
  if (onIt) return onSpot(f, act, blocked, c);
  if (seatNear) {
    const seats = home.furn.filter(o => FURN[o.type].assise)
      .map(o => { const oc = Wd.furnCenter(o); return { o, d: Math.hypot(oc.x - c.x, oc.z - c.z) }; })
      .filter(x => x.d <= (act.startsWith('lire') ? 8 : 3.6)).sort((a, b) => a.d - b.d);
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
  if (it.kind === 'sortie') { departSortie(it); return; }
  if (it.kind === 'quartier') { departQuartier(it); return; }
  if (it.kind === 'hanout') {
    const cost = hanoutCost(it.basket), n = Object.values(it.basket).reduce((a, b) => a + b, 0);
    if (!hanoutOuvert(s.t)) return fail(it, 'La boutique vient de fermer.');
    if (cost > s.money) {
      if (!creditPossible()) return fail(it, "Pas assez d'argent pour ça.");
      s.dette += cost; toast(`Ba Lahcen : « Tu me paieras la semaine prochaine, je te connais. » (dette : ${fmtDH(s.dette)})`);
    } else s.money -= cost;
    c.dur = 3 + n * 1.5; c.stage = 'do'; c.t = 0; G.yaw = c.spot.yaw;
    return;
  }
  if (it.kind === 'plage') {
    const A = PLAGE_ACTS[it.act];
    c.dur = A.dur; c.rates = {};
    for (const k in A.eff) c.rates[k] = A.eff[k] / A.dur * 60 * (k === 'moral' && has('sociable') && it.act === 'foot' ? 1.3 : 1);
    c.stage = 'do'; c.t = 0; G.yaw = c.spot.yaw;
    return;
  }
  if (it.kind === 'cafe') {
    const opt = CAFE.options.find(o => o.id === it.opt);
    if (G.chairs[it.chair]) return fail(it, 'La chaise vient d\'être prise.');
    if (s.money < prix(opt.prix)) return fail(it, "Pas assez d'argent pour ça.");
    s.money -= prix(opt.prix);
    G.chairs[it.chair] = 'player';
    c.dur = opt.dur; c.rates = {};
    for (const k in opt.eff) c.rates[k] = opt.eff[k] / opt.dur * 60 * (k === 'moral' && has('sociable') ? 1.4 : 1);
    c.stage = 'do'; c.t = 0; G.yaw = c.spot.yaw;
    return;
  }
  if (it.kind === 'parent') { arriveParent(c); return; }
  if (it.kind === 'conjoint') { arriveConjoint(c); return; }
  if (it.kind === 'animal') {
    const a = getA(it.id), d = Math.hypot(a.x - s.pos.x, a.z - s.pos.z);
    if (d > 2.2) {
      if ((it.tries = (it.tries || 0) + 1) < 3) { G.cur = null; G.queue.unshift(it); return; }
      return fail(it, `${animalName(it.id)} s'est éloigné.`);
    }
    if (it.act === 'nourrir' && !(s.inv.patee > 0)) return fail(it, 'Plus rien à lui donner.');
    a.hold = s.t + 30; a.path = []; a.state = 'idle'; a.yaw = yawTo(a.x, a.z, s.pos.x, s.pos.z);
    c.dur = ANIMAL_ACTS[it.act].dur || 1;
    c.spot = { x: s.pos.x, z: s.pos.z, yaw: yawTo(s.pos.x, s.pos.z, a.x, a.z), pose: 'stand', anim: 'pet', h: 0 };
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
    if (it.mode === 'boulot') { G.cur = null; startBoulot(it, n); return; }
    if (it.mode === 'inviter') { G.cur = null; invite(it, n); return; }
    n.state = 'talk'; n.path = [];
    n.yaw = yawTo(n.x, n.z, s.pos.x, s.pos.z);
    c.dur = it.mode === 'saluer' ? 2 : it.mode === 'vendre' || it.mode === 'offrir' ? 3 : it.mode === 'sujet' ? SUJETS.find(x => x.id === it.sujet).dur : 15;
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
  if (it.kind === 'hanout') {
    for (const k in it.basket) s.inv[k] = (s.inv[k] || 0) + it.basket[k];
    const l = getN('lahcen');
    if (l && l.visible) { addRel(l, 1.5); toast(`Ba Lahcen : « ${pick(l.def.lignes)} »`); }
    toast(it.auto ? `${nm()} a acheté de quoi manger au hanout.` : 'Courses faites. Tout est au frigo.');
    return;
  }
  if (it.kind === 'cafe') {
    G.chairs[it.chair] = null;
    const table = CAFE.chaises[it.chair].table;
    const voisin = G.npcs.find(n => n.chair >= 0 && CAFE.chaises[n.chair].table === table);
    if (voisin) {
      const opt = CAFE.options.find(o => o.id === it.opt);
      addRel(voisin, 5 + (opt.voisin ? 6 : 0) + (it.invite ? 8 : 0));
      s.needs.social = clamp(s.needs.social + 6, 0, 100);
      toast(`${voisin.def.nom} : « ${it.invite ? 'Merci pour le thé, c\'est la prochaine fois pour moi.' : pick(voisin.def.lignes)} »`);
    } else if (it.invite) toast('Ton invité n\'est pas venu s\'asseoir.');
    return;
  }
  if (it.kind === 'plage') return finishPlage(it);
  if (it.kind === 'parent') return finishParent(it);
  if (it.kind === 'conjoint') return finishConjoint(it);
  if (it.kind === 'animal') return finishAnimal(it);
  if (it.kind === 'talk') {
    const n = getN(it.npc);
    if (n.state === 'talk') { n.state = 'idle'; n.nextAt = s.t + 2; }
    if (it.mode === 'vendre') return sell(it, n);
    if (it.mode === 'offrir') return offer(it, n);
    if (it.mode === 'sujet') return topic(it, n);
    const d = dayIdx(s.t);
    if (n.talkDay !== d) { n.talkDay = d; n.talks = 0; }
    const k = 1 / (1 + n.talks * 0.6);
    n.talks++;
    const gain = (it.mode === 'saluer' ? 3 : 9) * k, soc = (it.mode === 'saluer' ? 6 : 22) * k, mor = (it.mode === 'saluer' ? 2 : 8) * (has('sociable') ? 1.5 : 1);
    addRel(n, gain);
    s.needs.social = clamp(s.needs.social + soc, 0, 100);
    s.needs.moral = clamp(s.needs.moral + mor, 0, 100);
    toast(`${n.def.nom} : « ${it.mode === 'saluer' ? pick(SALUTS) : pick(n.def.lignes)} »`);
    if (it.mode === 'discuter' && revenu('daret') && !s.daret && n.id === 'khadija' && (s.rel.khadija || 0) >= 20) toast('Lalla Khadija te propose d\'entrer dans la daret du quartier (voir ta fiche).', 'good');
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
    const R = RECETTES[c.food.r], vendredi = R.vendredi && dow(s.t) === 4;
    s.needs.moral = clamp(s.needs.moral + R.moral + QUAL_MORAL[c.food.q] + (has('gourmand') && c.food.q > 0 ? 5 : 0) + (vendredi ? 8 : 0), 0, 100);
    if (vendredi) toast('Le couscous du vendredi, comme il se doit.', 'good');
  }
  if (it.act === 'casse') s.needs.moral = clamp(s.needs.moral + 2, 0, 100);
  const A = it.act && ACT[it.act];
  if (A && A.cuisine) { s.skills.cuisine = Math.min(10, s.skills.cuisine + A.cuisine); toast(`Un chapitre de plus. Cuisine : ${s.skills.cuisine.toFixed(1)}.`); }
  if (A && A.competence) { s.job.competence = Math.min(10, s.job.competence + A.competence); toast(`Tu progresses dans ton métier. Compétence : ${s.job.competence.toFixed(1)}.`); }
}

// Discussion sur un sujet : la réaction dépend des goûts du voisin.
function topic(it, n) {
  const s = G.s, g = (GOUTS_ALL[n.id] || {})[it.sujet] || 0, faits = sujetsOf(n), k = faits[it.sujet] ? 0.3 : 1;
  faits[it.sujet] = true;
  const gain = [-3, 5, 10][g + 1] * k, soc = [4, 12, 18][g + 1] * k, mor = [-4, 4, 8][g + 1] * (has('sociable') ? 1.4 : 1) * k;
  addRel(n, gain);
  s.needs.social = clamp(s.needs.social + soc, 0, 100);
  s.needs.moral = clamp(s.needs.moral + mor, 0, 100);
  toast(`${n.def.nom} : « ${pick(REPONSES[it.sujet][1 - g])} »`);
  if (g < 0) toast(`${n.def.nom} n'aime pas ce sujet.`, 'bad');
}
function offer(it, n) {
  const s = G.s, p = it.plat && findPlat(it.plat);
  if (!p) return toast('Plus rien à offrir.');
  p.n--;
  if (!p.n) s.plats.splice(s.plats.indexOf(p), 1);
  const R = RECETTES[p.r];
  addRel(n, p.q === 2 ? 12 : 7);
  s.needs.social = clamp(s.needs.social + 8, 0, 100);
  toast(`${n.def.nom} : « ${p.q === 2 ? `${R.nom.split(' ')[0]} fait maison, et délicieux ! Tu me gâtes.` : 'C\'est gentil, merci. Je goûterai ce soir.'} »`);
}
// Inviter un voisin au café : chacun va s'asseoir à la même table.
function invite(it, n) {
  const s = G.s;
  const ti = CAFE.tables.findIndex((t, i) => CAFE.chaises.filter((c, ci) => c.table === i && !G.chairs[ci]).length >= 2);
  if (ti < 0 || !cafeOuvert(s.t) || n.chair >= 0 || s.money < 20) return toast('Ça ne va pas être possible maintenant.');
  const [a, b] = CAFE.chaises.map((c, ci) => ci).filter(ci => CAFE.chaises[ci].table === ti && !G.chairs[ci]);
  s.money -= prix(10);
  G.chairs[a] = n.id; n.state = 'idle';
  goTo(n, Wd.approachCells(s.home, [CAFE.chaises[a]], grid()), 'cafe', a);
  n.hold = s.t + 75; // il reste le temps du thé, même si c'est l'heure de rentrer
  toast(`${n.def.nom} : « Avec plaisir ! »`);
  enqueue({ kind: 'cafe', chair: b, opt: 'the', invite: n.id, label: 'Thé au café avec ' + n.def.nom }, true);
}
function addRel(n, v) {
  const s = G.s, before = s.rel[n.id] || 0;
  if (v > 0) v *= Q().regard[s.milieu] || 1; // le regard des autres selon le milieu et le quartier
  const after = clamp(before + v, 0, 100);
  s.rel[n.id] = after;
  if (v > 0 && s.quartier === 'populaire') s.reputation = clamp(s.reputation + v * 0.12, 0, 100);
  for (const seuil of [20, 50, 80]) if (before < seuil && after >= seuil) toast(`${n.def.nom} : ${relLabel(after)}.`, 'good');
}
export function addRelRaw(n, v) { const s = G.s; s.rel[n.id] = clamp((s.rel[n.id] || 0) + v, 0, 100); }

// ---------- Gagner de l'argent autrement ----------
function sell(it, n) {
  const s = G.s, p = findPlat(it.plat), d = dayIdx(s.t);
  if (!p) return toast('Il ne reste plus rien à vendre.');
  if (s.ventes.day !== d) s.ventes = { day: d };
  const left = VENTE_MAX - (s.ventes[n.id] || 0);
  if (left <= 0) return toast(`${n.def.nom} en a assez acheté pour aujourd'hui.`);
  const k = Math.min(p.n, left), prix = VENTE[p.r][p.q] * (ramadan() && (p.r === 'harira' || p.r === 'chebakia') ? 2 : 1), total = k * prix;
  p.n -= k;
  if (!p.n) s.plats.splice(s.plats.indexOf(p), 1);
  s.ventes[n.id] = (s.ventes[n.id] || 0) + k;
  s.money += total;
  addRel(n, 1);
  toast(`${n.def.nom} t'achète ${k} part${k > 1 ? 's' : ''} : +${fmtDH(total)}.`, 'good');
}
function startBoulot(it, n) {
  const s = G.s, b = boulotOf(it.boulot), d = dayIdx(s.t);
  if (s.boulots.day !== d) s.boulots = { day: d };
  if (s.boulots[b.id]) return toast('Déjà fait aujourd\'hui.');
  if (b.match && !matchEnCours(dow(s.t), hour(s.t))) return toast('Le match n\'a pas lieu maintenant.');
  s.boulots[b.id] = true;
  const extra = {};
  for (const k in b.eff) extra[k] = b.eff[k] / b.dur * 60;
  s.away = { lieu: 'boulot', boulot: b.id, phases: [{ until: s.t + b.dur, label: b.ici, extra }], start: s.t, back: { ...s.pos }, backYaw: G.yaw };
  G.cur = null; G.queue = [];
  toast(`${n.def.nom} : « Merci, à tout à l'heure ! »`);
}
export function joinDaret() {
  const s = G.s;
  if (!revenu('daret') || s.daret) return;
  s.daret = { tour: 0, pos: 2 + Math.floor(Math.random() * 4) };
  toast(`Tu entres dans la ${DARET.nom} : ${fmtDH(DARET.part)} chaque lundi, et la cagnotte (${fmtDH(DARET.part * DARET.membres)}) quand c'est ton tour.`, 'good');
  save();
}
export function epargne(montant) {
  const s = G.s;
  if (!revenu('epargne')) return;
  if (montant > 0 && !spend(montant)) return;
  if (montant < 0) { s.money += s.epargne; s.epargne = 0; toast('Épargne retirée.'); save(); return; }
  s.epargne += montant;
  toast(`${fmtDH(montant)} placés. Intérêts : ${EPARGNE_TAUX * 100} % par semaine.`);
  save();
}

// ---------- Animaux ----------
function finishAnimal(it) {
  const s = G.s, a = s.animaux[it.id], def = ANIMAUX.find(x => x.id === it.id), live = getA(it.id);
  const name = animalName(it.id);
  if (it.act === 'nourrir') {
    s.inv.patee--;
    a.confiance = clamp(a.confiance + (def.espece === 'chat' ? 12 : 15), 0, 100);
    a.faim = clamp(a.faim + 50, 0, 100);
    s.needs.moral = clamp(s.needs.moral + 4, 0, 100);
    toast(a.adopte ? `${a.nom} a bien mangé.` : `Le ${name} mange avec appétit. Confiance : ${Math.round(a.confiance)}.`);
  } else if (it.act === 'caresser') {
    if (!a.adopte && a.confiance < 20) {
      a.confiance = clamp(a.confiance - 2, 0, 100);
      live.state = 'idle'; live.hold = 0; live.nextAt = s.t;
      toast(`Le ${name} s'enfuit. Il faut d'abord l'apprivoiser en le nourrissant.`, 'bad');
      return;
    }
    a.confiance = clamp(a.confiance + 6, 0, 100);
    s.needs.moral = clamp(s.needs.moral + 5, 0, 100);
    toast(a.adopte ? `${a.nom} ronronne de bonheur.` : `Le ${name} se laisse caresser. Confiance : ${Math.round(a.confiance)}.`);
  } else if (it.act === 'jouer') {
    s.needs.moral = clamp(s.needs.moral + 10, 0, 100);
    s.needs.social = clamp(s.needs.social + 6, 0, 100);
    toast(`Un bon moment avec ${a.nom}.`);
  } else if (it.act === 'adopter') {
    if (a.confiance < ADOPT_SEUIL) return toast('Il ne te fait pas encore assez confiance.');
    a.adopte = true; a.nom = it.nom || def.nom;
    const c = center(Wd.doorstep(s.home));
    live.x = c.x; live.z = c.z; live.path = []; live.state = 'idle'; live.nextAt = s.t; live.hold = 0;
    s.needs.moral = clamp(s.needs.moral + 15, 0, 100);
    toast(`${a.nom} fait désormais partie de la maison !`, 'good');
  }
  save();
}
export const animalHere = a => (G.s.animaux[a.id].adopte ? homeHere() : G.s.quartier === 'populaire');
function stepAnimaux(m) {
  const s = G.s, h = hour(s.t);
  for (const a of G.animaux) {
    const st = s.animaux[a.id];
    if (!animalHere(a)) continue;
    if (st.adopte) {
      st.faim = clamp(st.faim - 3 * m / 60, 0, 100);
      if (st.faim < 25 && !G.alerts['an-' + a.id]) { G.alerts['an-' + a.id] = true; toast(`${st.nom} a faim.`, 'bad'); }
      if (st.faim > 40) G.alerts['an-' + a.id] = false;
    }
    if (s.t < a.hold) { if (a.state === 'walk') { a.state = 'idle'; a.path = []; } continue; } // il attend qu'on arrive
    if (a.state === 'walk') { if (walkAlong(a, m, a.def.vitesse)) { a.state = 'idle'; a.nextAt = s.t + rand(5, 25); } continue; }
    if (s.t < a.nextAt) continue;
    const night = h >= 23 || h < 7;
    let target;
    if (st.adopte) {
      const free = [];
      const g = Wd.blockedGrid(s.home);
      for (let z = 0; z < D; z++) for (let x = 0; x < 12; x++) if (!g[Wd.idx(x, z)]) free.push({ x, z });
      const tapis = s.home.furn.find(f => f.type === 'tapis');
      target = night && tapis ? { x: tapis.x, z: tapis.z } : pick(free);
    } else {
      target = night ? a.def.coin : pick(Wd.sidewalkCells());
    }
    if (!target) { a.nextAt = s.t + 10; continue; }
    const path = Wd.findPath(s.home, Math.floor(a.x), Math.floor(a.z), [target], st.adopte ? Wd.blockedGrid(s.home) : grid());
    if (!path || path.length < 2) { a.nextAt = s.t + rand(10, 30); continue; }
    a.path = path.slice(1).map(center); a.state = 'walk';
  }
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
    const end = dayIdx(t0) * 1440 + finTravail() * 60;
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
// ---------- Sorties en ville : taxi (ou son propre véhicule), activité, un événement, retour ----------
// Le trajet : prix et durée selon le taxi choisi, ou gratuit et plus court avec son propre véhicule.
export function trajet(tr, taxi) {
  const v = vehicule();
  if (v) return { prix: 0, dur: Math.round(tr.petit.dur * v.vitesse), attente: 0, label: it => (G.s.vehicule === 'voiture' ? 'En voiture' : 'En scooter') };
  const t = tr[taxi];
  return { prix: t.prix, dur: t.dur, attente: taxi === 'grand' ? Math.round(rand(...TAXI.grand.attente)) : 0, label: () => 'En taxi' };
}
export const sortieCost = (dest, taxi, actId) => (vehicule() ? 0 : SORTIES[dest].trajet[taxi].prix * 2) + SORTIES[dest].activites.find(a => a.id === actId).prix;
function departSortie(it) {
  const s = G.s, Sd = SORTIES[it.dest], tr = trajet(Sd.trajet, it.taxi), act = Sd.activites.find(a => a.id === it.act);
  const cost = sortieCost(it.dest, it.taxi, it.act);
  if (cost > s.money) { G.cur = null; toast("Pas assez d'argent pour cette sortie.", 'bad'); return; }
  s.money -= cost;
  const t0 = s.t, phases = [];
  let t = t0;
  if (tr.attente) { t += tr.attente; phases.push({ until: t, label: `Attente du grand taxi (${tr.attente} min)` }); }
  t += tr.dur; phases.push({ until: t, label: tr.label() });
  const extra = {};
  for (const k in act.eff) extra[k] = act.eff[k] / act.dur * 60;
  phases.push({ until: t + act.dur, label: Sd.ici + ' : ' + act.nom.toLowerCase(), extra, evtAt: t + act.dur / 2 });
  t += act.dur;
  phases.push({ until: t + tr.dur, label: 'Retour' });
  s.away = { lieu: 'sortie', dest: it.dest, taxi: it.taxi, act: it.act, phases, start: t0, back: { ...s.pos }, backYaw: G.yaw, evt: false };
  G.cur = null; G.queue = [];
  if (!vehicule() && it.taxi === 'petit' && Math.random() < 0.3) {
    const ev = { titre: 'Le taxi', texte: 'Le chauffeur annonce que le compteur est « en panne » et demande 10 DH de plus.', choix: [
      { label: 'Payer les 10 DH', eff: { money: -10 }, suite: 'Il démarre en sifflotant.' },
      { label: 'Insister pour le compteur', cond: 'chance50', ok: { moral: 4 }, ko: { moral: -3, attente: 10 }, suiteOk: 'Il soupire et met le compteur.', suiteKo: 'Il te fait descendre. Le suivant arrive dix minutes plus tard.' },
    ] };
    hooks.sortieEvent(ev, i => sortieChoice(ev, i));
  }
}
function sortieChoice(ev, i) {
  const s = G.s, a = s.away, ch = ev.choix[i];
  const { eff, suite } = resolveChoice(ch);
  for (const k in eff) {
    const v = eff[k];
    if (k === 'money') s.money += v;
    else if (k === 'attente' && a) for (const p of a.phases) p.until += v;
    else if (s.needs[k] != null) s.needs[k] = clamp(s.needs[k] + v, 0, 100);
  }
  if (ch.tenue) newOutfit();
  toast(suite, eff.money < 0 ? '' : 'good');
  save();
}
function newOutfit() {
  const c = G.s.char, others = OUTFIT_COLORS.filter(x => x !== c.outfitColor);
  c.outfitColor = pick(others);
  hooks.lookChanged();
}
// Marchander un objet dans la médina : trois approches, un prix final, l'objet va dans les affaires.
function bargain(act) {
  const s = G.s, base = act.achat.prix, type = act.achat.type;
  hooks.sortieEvent({ titre: FURN[type].nom, texte: `L'artisan annonce ${fmtDH(base)}. Comment tu t'y prends ?`, choix: MARCHANDAGE.map(m => ({ label: m.label })) }, i => {
    const m = MARCHANDAGE[i], ok = Math.random() < m.chance, prix = Math.round(base * (ok ? m.ok : m.ko));
    if (prix > s.money) { toast(`Tu n'as pas les ${fmtDH(prix)} demandés. Tu repars sans.`, 'bad'); return; }
    s.money -= prix;
    s.stock[type] = (s.stock[type] || 0) + 1;
    s.needs.moral = clamp(s.needs.moral + (ok ? 10 : 2), 0, 100);
    toast(`${ok ? m.suiteOk : m.suiteKo} ${FURN[type].nom} pour ${fmtDH(prix)}, rangé(e) dans tes affaires : à poser depuis « Construire ».`, ok ? 'good' : '');
    save();
  });
}
// Fin d'une activité à la plage : un mot, et parfois une petite histoire comme lors des sorties.
function finishPlage(it) {
  const s = G.s;
  toast({ bain: 'L\'eau était bonne. On se sent revivre.', foot: 'Match gagné, ou presque. Du sable partout.', bronzer: 'Le bruit des vagues, le soleil… une vraie sieste.' }[it.act], 'good');
  if (it.act === 'foot') s.reputation = clamp(s.reputation + 0.5, 0, 100);
  if (Math.random() < 0.4) {
    const Sd = SORTIES.plage, ev = pick(Sd.evenements);
    hooks.sortieEvent({ titre: Sd.nom, img: Sd.img, texte: ev.texte, choix: ev.choix }, i => sortieChoice(ev, i));
  }
  save();
}
function stepSortie(m) {
  const s = G.s, a = s.away, p = awayPhase();
  if (p.evtAt && !a.evt && s.t >= p.evtAt) {
    a.evt = true;
    const Sd = SORTIES[a.dest], ev = pick(Sd.evenements);
    hooks.sortieEvent({ titre: Sd.nom, img: Sd.img, texte: ev.texte, choix: ev.choix }, i => sortieChoice(ev, i));
  }
  if (!a.fin && s.t >= a.phases[a.phases.length - 2].until) {
    a.fin = true;
    const act = SORTIES[a.dest].activites.find(x => x.id === a.act);
    if (act.tenue) { newOutfit(); toast('Nouvelle tenue ! Les voisins vont la remarquer.', 'good'); }
    if (act.achat) bargain(act);
  }
}
// ---------- Changer de quartier, déménager, acheter un véhicule ----------
export const quartierCost = (to, taxi) => (vehicule() ? 0 : QUARTIERS[to].trajet[taxi].prix);
function departQuartier(it) {
  const s = G.s, tr = trajet(QUARTIERS[it.to].trajet, it.taxi);
  if (tr.prix > s.money) { G.cur = null; toast("Pas assez d'argent pour le taxi.", 'bad'); return; }
  s.money -= tr.prix;
  const t0 = s.t, phases = [];
  let t = t0;
  if (tr.attente) { t += tr.attente; phases.push({ until: t, label: `Attente du grand taxi (${tr.attente} min)` }); }
  phases.push({ until: t + tr.dur, label: `${tr.label()} vers ${QUARTIERS[it.to].nom}` });
  s.away = { lieu: 'quartier', to: it.to, phases, start: t0 };
  G.cur = null; G.queue = [];
}
function arriveQuartier(to) {
  const s = G.s, first = !s.visites[to];
  s.quartier = to; s.visites[to] = true;
  s.pos = center({ x: TAXI.arret.x + 1, z: TAXI.arret.z }); G.yaw = Math.PI / 2;
  G.chairs = CAFE.chaises.map(() => null);
  G.npcs = npcDefs().map(def => ({ id: def.id, def, visible: false, x: 0, z: 0, yaw: 0, state: 'home', path: [], walkPhase: 0, nextAt: 0, chair: -1, goal: null, talkUntil: 0, greetedAt: -9999, talks: 0, talkDay: -1, sujets: {}, sujetsDay: -1 }));
  npcGrid = null;
  Wd.setBlocking({ noHome: !homeHere(), vehicule: s.vehicule, quartier: s.quartier });
  hooks.quartierChanged();
  toast(`${nm()} arrive ${QUARTIERS[to].article}.`);
  if (first && QUARTIERS[to].accueil) toast(QUARTIERS[to].accueil[s.milieu]);
  save();
}
export function demenager(to) {
  const s = G.s, loyer = loyerHebdo(to), caution = loyer * CAUTION_SEMAINES;
  if (to === s.chezMoi) return;
  if (!s.visites[to]) return toast('Il faut d\'abord aller voir sur place.');
  if (s.money < caution + loyer) return toast(`Il faut ${fmtDH(caution + loyer)} : la caution (${CAUTION_SEMAINES} semaines) et la première semaine.`, 'bad');
  s.money -= caution + loyer;
  s.chezMoi = to; s.quartier = to; s.lastBill = dayIdx(s.t);
  s.pos = center(Wd.entrance(s.home));
  G.chairs = CAFE.chaises.map(() => null);
  G.npcs = npcDefs().map(def => ({ id: def.id, def, visible: false, x: 0, z: 0, yaw: 0, state: 'home', path: [], walkPhase: 0, nextAt: 0, chair: -1, goal: null, talkUntil: 0, greetedAt: -9999, talks: 0, talkDay: -1, sujets: {}, sujetsDay: -1 }));
  npcGrid = null;
  Wd.setBlocking({ noHome: false, vehicule: s.vehicule, quartier: s.quartier });
  for (const a of G.animaux) { const c = center(Wd.doorstep(s.home)); a.x = c.x; a.z = c.z; a.path = []; a.state = 'idle'; }
  hooks.quartierChanged();
  toast(`Déménagement ${QUARTIERS[to].article} ! Caution ${fmtDH(caution)}, loyer ${fmtDH(loyer)} par semaine. Tes meubles ont suivi.`, 'good');
  save();
}
export function acheterVehicule(id) {
  const s = G.s, v = VEHICULES[id];
  if (s.vehicule) return toast('Tu as déjà un véhicule.');
  if (!spend(v.prix)) return;
  s.vehicule = id;
  s.needs.moral = clamp(s.needs.moral + 12, 0, 100);
  Wd.setBlocking({ noHome: !homeHere(), vehicule: id, quartier: s.quartier });
  npcGrid = null;
  hooks.quartierChanged();
  toast(`${v.nom} : à toi ! Les voisins l'ont remarqué.`, 'good');
  const omar = getN('omar');
  if (omar && omar.visible) toast('Omar : « Tu as une voiture maintenant ? Tu vas m\'oublier… »');
  save();
}
export function awayPhase() {
  const a = G.s.away;
  return a && (a.phases.find(p => G.s.t < p.until) || a.phases[a.phases.length - 1]);
}
export function comeBack() {
  const s = G.s, a = s.away;
  if (!a || a.lieu === 'travail' || a.lieu === 'marche' || a.lieu === 'boulot') return;
  if (a.lieu === 'sortie') { a.fin = true; a.phases = [{ until: s.t + trajet(SORTIES[a.dest].trajet, a.taxi).dur, label: 'Retour' }]; return; }
  a.phases = [{ until: s.t + LIEUX[a.lieu].trajet, label: 'Sur le chemin du retour' }];
}
function stepAway(m) {
  const s = G.s, a = s.away, p = awayPhase();
  applyNeeds(m, p.extra);
  if (a.lieu === 'sortie') stepSortie(m);
  if (a.lieu === 'affaire' && !a.evt && a.phases[1].evtAt && s.t >= a.phases[1].evtAt) { a.evt = true; evenementAffaire(); }
  if (a.lieu === 'travail' && !a.evt && s.t >= a.phases[0].until + 120) {
    a.evt = true;
    const recents = s.job.recents || [];
    const pool = EVENEMENTS.filter(e => !e.milieux || e.milieux.includes(s.milieu)).filter(e => !recents.includes(e.id));
    const ev = { ...pick(pool.length ? pool : EVENEMENTS) };
    s.job.recents = [ev.id, ...recents].slice(0, 4);
    ev.texte = personnaliser(ev.texte);
    hooks.workEvent(ev, i => workChoice(ev, i));
  }
  if (a.lieu === 'travail' && !a.done && s.t >= a.phases[1].until) finishWork();
  if (s.t >= a.phases[a.phases.length - 1].until) returnHome();
}
// Un choix (au travail ou en sortie) : tire le sort s'il y a une condition, puis renvoie les effets et la phrase.
function resolveChoice(ch) {
  const J = G.s.job;
  if (!ch.cond) return { eff: ch.eff || {}, suite: ch.suite || '' };
  const ok = ch.cond === 'perf70' ? J.perf >= 70 : Math.random() < (+ch.cond.replace('chance', '') / 100);
  return { eff: ok ? ch.ok : ch.ko, suite: ok ? ch.suiteOk : ch.suiteKo };
}
// Le choix fait au travail s'applique tout de suite. Retourne la phrase de conclusion.
function workChoice(ev, i) {
  const s = G.s, J = s.job, ch = ev.choix[i], a = s.away;
  const { eff, suite } = resolveChoice(ch);
  for (const k in eff) {
    const v = eff[k];
    if (k === 'perf') J.perf = clamp(J.perf + v, 0, 100);
    else if (k === 'collegues') { J.collegues = clamp(J.collegues + v, 0, 100); effetCollegue(v); }
    else if (k === 'competence') J.competence = Math.min(10, J.competence + v);
    else if (k === 'money') s.money += v;
    else if (k === 'heures' && a) { a.phases[1].until += 60 * v; a.phases[2].until += 60 * v; }
    else if (s.needs[k] != null) s.needs[k] = clamp(s.needs[k] + v, 0, 100);
  }
  const bilan = Object.entries(eff).filter(([k]) => ['perf', 'collegues', 'competence', 'money'].includes(k)).map(([k, v]) => `${{ perf: 'performance', collegues: 'collègues', competence: 'compétence', money: 'argent' }[k]} ${v > 0 ? '+' : ''}${k === 'competence' ? v.toFixed(1) : v}`).join(', ');
  toast(suite + (bilan ? ` (${bilan})` : ''), eff.perf < 0 || eff.money < 0 ? '' : 'good');
  save();
  return suite;
}
function returnHome() {
  const s = G.s, a = s.away;
  s.away = null;
  if (a.lieu === 'quartier') { arriveQuartier(a.to); return; }
  if (a.lieu === 'sortie') {
    s.pos = { ...a.back }; G.yaw = a.backYaw || 0;
    toast(`${nm()} est de retour de ${SORTIES[a.dest].nom.toLowerCase()}.`);
    save();
    return;
  }
  if ((a.lieu === 'boulot' && !a.boulot) || a.lieu === 'affaire') { if (a.back) { s.pos = { ...a.back }; G.yaw = a.backYaw || 0; } if (a.noir) finExtraNoir(a); save(); return; }
  if (a.lieu === 'boulot') {
    const b = boulotOf(a.boulot), tip = b.pourboire ? Math.round(rand(0, b.pourboire)) : 0;
    s.money += b.paie + tip;
    s.pos = { ...a.back }; G.yaw = a.backYaw || 0;
    toast(`${b.nom} : +${fmtDH(b.paie)}${tip ? ` et ${fmtDH(tip)} de pourboires` : ''}.`, 'good');
    const n = getN(b.npc);
    if (n) addRel(n, 3);
    save();
    return;
  }
  s.pos = center(RUE.coin);
  G.yaw = Math.PI / 2;
  if (a.lieu === 'marche') {
    for (const k in a.basket) s.inv[k] = (s.inv[k] || 0) + a.basket[k];
    toast(`${nm()} revient du marché, les courses seront au frigo.`);
  } else toast(`${nm()} est de retour dans le quartier.`);
  save();
  const d = dayIdx(s.t);
  if (dow(s.t) <= 4 && hm(s.t).h < 12 && s.job.day !== d && (G.pendingWork || G.workAsk)) {
    if (s.autoWork) goWork(); else hooks.askWork();
  } else if (homeHere()) enqueue({ kind: 'goto', ...Wd.entrance(s.home), auto: true, label: 'Rentrer à la maison' });
  G.pendingWork = false; G.workAsk = false;
}

// ---------- Travail, loyer, salaire ----------
function goWork() {
  cancelAll();
  enqueue({ kind: 'out', lieu: 'travail', auto: true }, true);
  toast("C'est l'heure : départ au travail.");
}
export function enqueueWork() { if (G.s.affaire) return journeeAffaire(); cancelAll(); enqueue({ kind: 'out', lieu: 'travail' }); }
export function skipWork() { toast(`${nm()} ne va pas travailler aujourd'hui.`); }
function finishWork() {
  const s = G.s, a = s.away, n = a.startNeeds, J = s.job;
  a.done = true;
  let gain = (n.moral >= 60 ? 8 : n.moral >= 35 ? 4 : -3) + (n.energie >= 40 ? 3 : -4) + (has('travailleur') ? 3 : 0) - (a.late ? 5 : 0) + Math.round(J.competence * 0.6);
  J.day = dayIdx(s.t); J.week++;
  J.perf = clamp(J.perf + gain, 0, 100);
  J.competence = Math.min(10, J.competence + 0.05);
  J.collegues = clamp(J.collegues + (J.collegues < 50 ? 0.5 : -0.3), 0, 100);
  let msg = `Journée de travail terminée. Performance ${gain >= 0 ? '+' : ''}${gain}${a.late ? ' (retard)' : ''}.`;
  if (J.perf >= 100 && J.level < milieu().jobs.length - 1) {
    if (J.collegues < 30) { J.perf = 90; toast('Le chef pensait te promouvoir, mais l\'équipe ne te soutient pas. Soigne tes collègues.', 'bad'); }
    else { J.level++; J.perf = 30; toast(`Promotion ! ${nm()} devient ${jobOf().titre}. Salaire : ${fmtDH(Math.round(jobOf().salaire * (J.mult || 1)))} par semaine.`, 'good'); }
  } else toast(msg, gain < 0 ? 'bad' : '');
}
function minuteEvent(T) {
  const s = G.s, d = dayIdx(T), w = d % 7, mm = T % 1440, M = milieu();
  if (w === 0 && mm === 6 * 60 && d > 0 && s.lastBill !== d) {
    s.lastBill = d;
    const loyer = loyerHebdo();
    s.money -= loyer + M.facture;
    toast(loyer ? `Loyer de la semaine (${fmtDH(loyer)}) et facture d'eau et d'électricité (${fmtDH(M.facture)}) payés.` : `Facture d'eau et d'électricité payée (${fmtDH(M.facture)}).`);
    if (s.vehicule) { s.money -= VEHICULES[s.vehicule].essence; toast(`${VEHICULES[s.vehicule].nom} : ${fmtDH(VEHICULES[s.vehicule].essence)} d'essence et d'entretien.`); }
    if (s.daret) {
      s.money -= DARET.part; s.daret.tour++;
      if (s.daret.tour === s.daret.pos) { s.money += DARET.part * DARET.membres; toast(`C'est ton tour de daret : +${fmtDH(DARET.part * DARET.membres)} !`, 'good'); }
      else toast(`Daret : ${fmtDH(DARET.part)} versés. Ton tour dans ${(s.daret.pos - s.daret.tour + DARET.membres) % DARET.membres || DARET.membres} semaine(s).`);
      if (s.daret.tour >= DARET.membres) s.daret = { tour: 0, pos: 2 + Math.floor(Math.random() * 4) };
    }
    if (s.epargne > 0) { const i = Math.round(s.epargne * EPARGNE_TAUX); s.epargne += i; toast(`Épargne : +${fmtDH(i)} d'intérêts.`); }
    s.job.absences = 0;
    if (s.money < 0) toast('Attention : ton compte est à découvert.', 'bad');
  }
  if (mm === 1) { jourAffaire(d); hausseLoyer(d); }
  const actif = !s.job.chomage && !ferie();
  if (w <= 4 && mm === 8 * 60 + 20 && s.job.day !== d && actif) {
    if (s.affaire) { if (!s.away) hooks.askWork(); }
    else if (s.away) { if (s.autoWork) G.pendingWork = true; else G.workAsk = true; }
    else if (s.autoWork) goWork(); else hooks.askWork();
  }
  if (w <= 4 && mm === 12 * 60 && s.job.day !== d && actif && !s.affaire && !(s.away && s.away.lieu === 'travail')) {
    s.job.day = d; s.job.perf = Math.max(0, s.job.perf - 15); s.job.absences++; G.pendingWork = false; G.workAsk = false;
    toast("Absence au travail aujourd'hui. Ton chef n'est pas content (performance -15).", 'bad');
    if (s.quartier === 'populaire') rep(-2);
  }
  if (w === 4 && mm === 18 * 60) paie();
  if (w === 4 && mm === 18 * 60 + 40) potDepart();
  if (w === 5 && mm === 10 * 60) extraNoir();
  if (w === 6 && mm === 10 * 60 && revenu('poche') && !s.independant) {
    if (s.job.absences === 0) { s.money += POCHE; toast(`Tes parents t'envoient ton argent de poche : +${fmtDH(POCHE)}.`, 'good'); }
    else toast('Tes parents ont su que tu avais séché le travail : pas d\'argent de poche cette semaine.', 'bad');
  }
  if (mm % 60 === 0) save();
  if (mm === 18 * 60 + 30) remarque();
  socialMinute(T);
  fetesMinute(T);
  vieMinute(T);
  parentsMinute(T);
  objectifsMinute(T);
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
  // Un animal adopté tient compagnie, sauf s'il a faim.
  for (const a of ANIMAUX) { const st = s.animaux[a.id]; if (st.adopte) r.moral += st.faim > 25 ? 1 : -2; }
  for (const k of ['faim', 'energie', 'hygiene']) if (n[k] < 25 && !(k === 'faim' && jeune())) r.moral -= 4;
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
  if (!homeHere()) {
    // Loin de chez soi : on rentre quand ça devient urgent, sinon on profite du quartier.
    if ((n.energie < 20 || n.faim < 15 || h >= 23) && s.money >= QUARTIERS[s.chezMoi].trajet.grand.prix) enqueue({ kind: 'quartier', to: s.chezMoi, taxi: 'grand', auto: true });
    return;
  }
  const tryAct = (types, act, param) => {
    for (const f of s.home.furn.filter(f => types.includes(f.type))) {
      const it = { kind: 'act', fid: f.id, act, param, auto: true };
      if (!checkAct(it) && planSpot(f, act, Wd.blockedGrid(s.home))) { enqueue(it); return true; }
    }
    return false;
  };
  if ((n.energie < 20 || ((h >= 23 || h < 6) && n.energie < 70)) && tryAct(['lit', 'lit1'], 'dormir')) return;
  if (n.faim < 35 && !jeune()) {
    const p = s.plats.filter(p => p.r !== 'the').sort((a, b) => b.q - a.q)[0];
    if (p && tryAct(['table', 'mida', 'banquette', 'pouf', 'frigo'], 'manger', p.r + ':' + p.q)) return;
    if (s.inv.snack > 0 && tryAct(['frigo'], 'casse')) return;
    const lvl = s.skills.cuisine;
    const r = ['couscous', 'rfissa', 'tajine', 'kefta', 'harira', 'loubia', 'pates', 'bissara', 'msemen', 'oeufs', 'salade', 'tartines'].find(r => s.inv[r] > 0 && RECETTES[r].d <= lvl + 2);
    if (r && tryAct(['cuisiniere'], 'cuisiner', r)) return;
    if (hanoutOuvert(s.t) && s.money >= 46) { enqueue({ kind: 'hanout', basket: { snack: 1, msemen: 1 }, auto: true }); return; }
  }
  if (n.hygiene < 30 && tryAct(['douche'], 'douche')) return;
  if (n.social < 35 && h >= 8 && h < 22 && cafeOuvert(s.t) && s.money >= 10 && !jeune()) {
    const i = G.chairs.findIndex(c => !c);
    if (i >= 0) { enqueue({ kind: 'cafe', chair: i, opt: 'the', auto: true }); return; }
  }
  if (n.moral < 45 && (tryAct(['tv'], 'tele') || tryAct(['biblio'], 'lire') || tryAct(['banquette', 'pouf'], 'detente'))) return;
  if (!isHome() && h >= 22 && tryAct(['lit', 'lit1'], 'dormir')) return;
}

// ---------- Les voisins ----------
let npcGrid = null;
const grid = () => npcGrid || (npcGrid = Wd.blockedGrid(G.s.home, null, true));
const dehors = (n, h) => (!n.def.jours || n.def.jours.includes(dow(G.s.t))) && (ramadan() && !n.def.serveur && !n.def.boutique && !n.def.collegue ? (h >= 10 && h < 12.5) || h >= 20.5 || h < 0.5 : n.def.sorties.some(([a, b]) => h >= a && h < b));
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
  if (def.boutique) {
    if (r < 0.75) return goTo(n, [HANOUT.porte], 'post');
    return goTo(n, [{ x: RUE.hanout.x0 + 4 + Math.floor(Math.random() * 6), z: D + 1 }], 'stroll');
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
    n.state = 'sit'; n.nextAt = Math.max(s.t + rand(30, 90), n.hold || 0);
    return;
  }
  n.state = 'idle'; n.nextAt = s.t + rand(3, 15);
  if (n.goal === 'post') { n.yaw = 0; if (n.def.boutique) n.nextAt = s.t + rand(15, 40); }
}
function stepNpcs(m) {
  const s = G.s, h = hour(s.t);
  for (const n of G.npcs) {
    if (n.state === 'talk') { if (s.t >= n.talkUntil && !(G.cur && G.cur.it.kind === 'talk' && G.cur.it.npc === n.id)) { n.state = 'idle'; n.nextAt = s.t + 2; } continue; }
    const out = dehors(n, h) || s.t < (n.hold || 0); // invité ou en pleine discussion : il reste
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
  stepAnimaux(m);
  if (s.away) { stepAway(m); return; }
  if (!G.cur && G.queue.length) startItem(G.queue.shift());
  const c = G.cur;
  if (c) {
    if (c.stage === 'walk') walk(c, m);
    else {
      c.t += m;
      if (c.it.kind === 'plage' && c.it.act === 'foot') { G.walkPhase += m * 6; if (Math.random() < m * 0.1) c.spot.yaw = Math.random() * Math.PI * 2; }
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
  const s = G.s, c = G.cur, h = hour(s.t);
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
  })).concat(G.passants.map(p => ({ id: p.id, visible: p.visible, x: p.x, z: p.z, yaw: p.yaw, walkPhase: p.walkPhase, pose: { base: 'walk' } })), parentsView(), conjointView());
  const animaux = G.animaux.map(a => ({
    id: a.id, x: a.x, z: a.z, yaw: a.yaw, walkPhase: a.walkPhase, visible: animalHere(a),
    pose: a.state === 'walk' ? 'walk' : (h >= 23 || h < 7) && s.t >= a.hold ? 'lie' : 'idle',
  }));
  return { visible: !s.away, x, z, yaw, pose, walkPhase: G.walkPhase, t: s.t, active, outside: !Wd.inHome(Math.floor(x), Math.floor(z)) || !homeHere(), npcs, animaux };
}
export function progress() {
  const c = G.cur;
  if (!c || c.stage !== 'do') return 0;
  if (c.dur === Infinity) return G.s.needs.energie / 100;
  return clamp(c.t / c.dur, 0, 1);
}
