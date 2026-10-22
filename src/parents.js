// Chez les parents : dans le milieu aisé, on commence sous le toit familial. La mère cuisine, le père lit son journal,
// on discute, on demande de l'argent, on rentre tard… puis, avec le temps, on prend son indépendance.
import { FURN, RECETTES, CAUTION_SEMAINES, MILIEUX } from './data.js';
import { G, hooks, dayIdx, dow, hour, fmtDH, save, clampv, homeHere, isHome } from './sim.js';
import { furnCenter, frontDir } from './world.js';
import { fam } from './social.js';

const toast = (m, k) => hooks.toast(m, k);
const pick = a => a[Math.floor(Math.random() * a.length)];
const nm = () => G.s.char.name;

export const PARENTS = {
  mere: { id: 'mere', nom: 'Ta mère', look: { skin: '#d19e78', hair: 'foulard', scarfColor: '#5b3d6e', outfit: 'caftan', outfitColor: '#7a2e3a' } },
  pere: { id: 'pere', nom: 'Ton père', look: { skin: '#b07a55', hair: 'rasee', hairColor: '#9a958f', outfit: 'djellaba', outfitColor: '#f2ede3' } },
};
export const isParent = id => id === 'mere' || id === 'pere';
// Vit-on chez ses parents ? Seulement dans le milieu aisé, tant qu'on n'a pas pris son indépendance.
export const chezParents = () => G.s.milieu === 'aise' && !G.s.independant;
export const parentDefs = () => (chezParents() && homeHere() ? [PARENTS.mere, PARENTS.pere] : []);

export function initParents(s) {
  if (s.independant == null) s.independant = false;
  if (!s.parents) s.parents = { argent: { mere: -1, pere: -1 }, tard: false, repas: -1 };
}

// ---------- Où sont-ils, à chaque heure ? ----------
const furnOf = (type, i = 0) => G.s.home.furn.filter(f => f.type === type)[i];
export function spotCook() {
  const f = furnOf('cuisiniere');
  if (!f) return { x: 10.5, z: 5.5, yaw: Math.PI / 2, pose: 'stand', anim: 'cook', h: 0 };
  const c = furnCenter(f), fd = frontDir(f.r);
  return { x: c.x + fd.x, z: c.z + fd.z, yaw: Math.atan2(-fd.x, -fd.z), pose: 'stand', anim: 'cook', h: 0 };
}
export function spotSit(i, anim) {
  const f = furnOf('banquette', i) || furnOf('banquette', 0) || furnOf('pouf', i);
  if (!f) return { x: 2.5 + i, z: 5.5, yaw: 0, pose: 'stand', anim, h: 0 };
  const c = furnCenter(f);
  return { x: c.x, z: c.z, yaw: f.r * Math.PI / 2, pose: 'sit', anim, h: FURN[f.type].assise || 0.45 };
}
function spotTable() {
  const f = furnOf('table') || furnOf('mida');
  if (!f) return { x: 9.5, z: 7.5, yaw: 0, pose: 'stand', anim: 'eat', h: 0 };
  const c = furnCenter(f), fd = frontDir(f.r);
  return { x: c.x + fd.x, z: c.z + fd.z, yaw: Math.atan2(-fd.x, -fd.z), pose: 'stand', anim: 'eat', h: 0 };
}
// Le programme de la journée : null = absent (sorti, ou couché).
function ou(id, h, w) {
  const we = w >= 5;
  if (id === 'mere') {
    if (h < 7 || h >= 23) return null;
    if (h < 9) return spotCook();
    if (h < 12) return spotSit(0, null);
    if (h < 13) return spotCook();
    if (h < 15) return spotSit(0, 'eat');
    if (h < 18) return we ? spotSit(0, null) : null;        // en semaine : visites, marché, hammam
    if (h < 20.5) return spotCook();
    return spotSit(0, null);
  }
  if (h < 7 || h >= 23) return null;
  if (h < 8) return spotTable();
  if (!we) return h < 19 ? null : spotSit(1, 'read');         // à l'entreprise toute la journée
  if (h < 10) return spotSit(1, 'read');
  if (h < 13) return null;                                     // marché, mosquée, amis
  if (h < 15) return spotSit(1, 'eat');
  return spotSit(1, h >= 19 ? 'read' : null);
}
export const parentSpot = id => (chezParents() && homeHere() ? ou(id, hour(G.s.t), dow(G.s.t)) : null);
export function parentsView() {
  if (!chezParents() || !homeHere()) return [];
  const h = hour(G.s.t), w = dow(G.s.t), out = [];
  for (const id of ['mere', 'pere']) {
    const p = ou(id, h, w);
    out.push(p ? { id, visible: true, x: p.x, z: p.z, yaw: p.yaw, walkPhase: 0, pose: { base: p.pose, anim: p.anim, h: p.h } } : { id, visible: false, x: 0, z: 0, yaw: 0, walkPhase: 0, pose: { base: 'stand' } });
  }
  return out;
}

// ---------- Ce qui se passe au fil de la journée ----------
const MENU = { 0: 'kefta', 1: 'tajine', 2: 'loubia', 3: 'harira', 4: 'couscous', 5: 'rfissa', 6: 'tajine' };
export function parentsMinute(T) {
  const s = G.s;
  if (!chezParents()) return;
  const d = dayIdx(T), mm = T % 1440, w = d % 7;
  // La mère cuisine : le déjeuner à 13 h, le dîner à 20 h 30. Les plats attendent au frigo.
  if ((mm === 13 * 60 || mm === 20 * 60 + 30) && s.parents.repas !== T) {
    s.parents.repas = T;
    const r = mm === 13 * 60 ? MENU[w] : pick(['harira', 'loubia', 'msemen', 'salade', 'bissara']);
    const total = s.plats.reduce((a, p) => a + p.n, 0);
    if (total < 10 && RECETTES[r]) {
      const ex = s.plats.find(p => p.r === r && p.q === 2);
      if (ex) ex.n += 3; else s.plats.push({ r, q: 2, n: 3 });
      if (homeHere() && !s.away) toast(`Ta mère a préparé ${RECETTES[r].nom.toLowerCase().split(' (')[0]}. C'est au frigo.`);
    }
  }
  // Rentrer tard ne passe pas inaperçu.
  if (mm === 23 * 60 + 30 && (!homeHere() || !isHome() || s.away)) s.parents.tard = true;
  if (mm === 7 * 60 + 30 && s.parents.tard) {
    s.parents.tard = false;
    if (!s.away) { fam(-2); toast(pick(['Ton père : « Tu es rentré(e) à quelle heure, hier ? Ce n\'est pas un hôtel ici. »', 'Ta mère : « Je n\'ai pas dormi. Tu aurais pu appeler. »']), 'bad'); }
  }
}

// ---------- Parler à ses parents ----------
export const PARENT_ACTS = {
  discuter: { label: 'Discuter un moment', dur: 15 },
  aider: { label: 'Aider en cuisine', dur: 30 },
  travail: { label: 'Parler travail', dur: 20 },
  argent: { label: 'Demander de l\'argent', dur: 5 },
};
export function parentActions(id) {
  const s = G.s, P = PARENTS[id], sp = parentSpot(id), d = dayIdx(s.t), sem = Math.floor(d / 7);
  if (!sp) return { title: P.nom, items: [] };
  const items = [{ act: 'discuter', label: PARENT_ACTS.discuter.label, sub: '15 min · un peu de chaleur' }];
  if (id === 'mere' && sp.anim === 'cook') items.push({ act: 'aider', label: PARENT_ACTS.aider.label, sub: '30 min · on apprend en regardant' });
  if (id === 'pere') items.push({ act: 'travail', label: PARENT_ACTS.travail.label, sub: '20 min · ses conseils comptent au bureau' });
  const deja = s.parents.argent[id] === sem, somme = id === 'mere' ? 500 : 1000;
  items.push({ act: 'argent', label: `${PARENT_ACTS.argent.label} (${fmtDH(somme)})`, sub: deja ? 'Déjà demandé cette semaine' : id === 'mere' ? 'Elle cède souvent, si la famille va bien' : 'Il veut te voir au bureau d\'abord', disabled: deja, why: 'Pas deux fois la même semaine.' });
  return { title: P.nom, items };
}
export const parentLabel = it => `${PARENT_ACTS[it.act].label} : ${PARENTS[it.id].nom.toLowerCase()}`;
// Aller se placer à côté du parent.
export function startParent(it, go, home, blocked, fail, approachCells) {
  const sp = parentSpot(it.id);
  if (!sp) return fail(it, `${PARENTS[it.id].nom} n'est pas là en ce moment.`);
  const cell = { x: Math.floor(sp.x), z: Math.floor(sp.z) };
  const app = approachCells(home, [cell], blocked);
  if (!app.length || !go(app)) return fail(it, `Impossible d'approcher ${PARENTS[it.id].nom.toLowerCase()}.`);
  G.cur.parentCell = cell;
}
export function arriveParent(c) {
  const s = G.s, it = c.it, sp = parentSpot(it.id);
  if (!sp) { G.cur = null; toast(`${PARENTS[it.id].nom} vient de sortir.`); return; }
  c.dur = PARENT_ACTS[it.act].dur;
  c.spot = { x: s.pos.x, z: s.pos.z, yaw: Math.atan2(sp.x - s.pos.x, sp.z - s.pos.z), pose: 'stand', anim: it.act === 'aider' ? 'cook' : 'talk', h: 0 };
  c.stage = 'do'; c.t = 0; G.yaw = c.spot.yaw;
}
export function finishParent(it) {
  const s = G.s, id = it.id, P = PARENTS[id], sem = Math.floor(dayIdx(s.t) / 7), n = s.needs;
  const up = (k, v) => { n[k] = clampv(n[k] + v, 0, 100); };
  if (it.act === 'discuter') {
    up('social', id === 'mere' ? 8 : 6); up('moral', 3); fam(3);
    toast(id === 'mere' ? pick(['Ta mère : « Tu manges assez ? Tu as une petite mine. »', 'Ta mère te raconte les dernières nouvelles de la famille, en détail.', 'Ta mère : « La fille de Lalla Zohra s\'est fiancée. Et toi ? »']) : pick(['Ton père : « Le pays change. Il faut être prêt. »', 'Ton père parle de l\'entreprise, comme toujours. Mais il t\'écoute aussi.', 'Ton père : « À ton âge, j\'avais déjà deux employés. » Il sourit.']));
  } else if (it.act === 'aider') {
    s.skills.cuisine = Math.min(10, s.skills.cuisine + 0.3); fam(6); up('social', 6); up('energie', -4);
    toast('Ta mère te montre le geste pour les msemen. « Regarde, pas comme ça, comme ça. » Cuisine +0,3.', 'good');
  } else if (it.act === 'travail') {
    s.job.perf = clampv(s.job.perf + 4, 0, 100); s.job.competence = Math.min(10, s.job.competence + 0.1); fam(2); up('social', 4);
    toast('Ton père : « Les clients, on les écoute avant de leur vendre. » Performance +4.', 'good');
  } else if (it.act === 'argent') {
    s.parents.argent[id] = sem;
    const somme = id === 'mere' ? 500 : 1000;
    const ok = id === 'mere' ? s.famille >= 40 : s.famille >= 50 && s.job.absences === 0;
    if (ok) { s.money += somme; fam(id === 'mere' ? -3 : -4); toast(id === 'mere' ? `Ta mère sort ${fmtDH(somme)} de son sac sans un mot. « Ne le dis pas à ton père. »` : `Ton père signe un chèque de ${fmtDH(somme)}. « C'est la dernière fois. » Ce n'est jamais la dernière fois.`, 'good'); }
    else { fam(-2); up('moral', -4); toast(id === 'mere' ? 'Ta mère : « Demande à ton père. » Elle est fâchée, cette semaine.' : 'Ton père : « De l\'argent ? Travaille d\'abord. » Il retourne à son journal.', 'bad'); }
  }
  save();
}

// ---------- Prendre son indépendance ----------
export const coutIndependance = () => MILIEUX.aise.loyerSeul * (CAUTION_SEMAINES + 1);
export function peutPartir() {
  const s = G.s, d = dayIdx(s.t), marie = s.vie && s.vie.amour && s.vie.amour.etape >= 6;
  if (!chezParents()) return { ok: false, why: '' };
  if (d < 42 && !marie) return { ok: false, why: `Tes parents n'en entendront parler qu'après six semaines (encore ${42 - d} jours), ou après ton mariage.` };
  if (s.money < coutIndependance()) return { ok: false, why: `Il faut ${fmtDH(coutIndependance())} : la caution et la première semaine du loyer.` };
  return { ok: true, why: '' };
}
export function independance() {
  const s = G.s, p = peutPartir();
  if (!p.ok) return toast(p.why, 'bad');
  s.money -= coutIndependance();
  s.independant = true; s.lastBill = dayIdx(s.t);
  s.needs.moral = clampv(s.needs.moral + 15, 0, 100); fam(-4);
  hooks.quartierChanged();
  toast(`${nm()} vole de ses propres ailes : un appartement à toi, ${fmtDH(MILIEUX.aise.loyerSeul)} de loyer par semaine, et plus d'argent de poche. Ta mère a pleuré un peu.`, 'good');
  save();
}
export const parentsInfo = () => ({ chez: chezParents(), partir: chezParents() ? peutPartir() : null, cout: coutIndependance(), loyer: MILIEUX.aise.loyerSeul });
