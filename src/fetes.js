// Les fêtes : le Ramadan, les deux Aïds, les mariages et les naissances du quartier.
import { RECETTES, OUTFIT_COLORS } from './data.js';
import { G, hooks, dayIdx, dow, hour, fmtDH, save, clampv, getNpc, relOf, addRelRaw, cancelAll, homeHere, npcDefs } from './sim.js';
import { rep, fam } from './social.js';

const toast = (m, k) => hooks.toast(m, k);
const pick = a => a[Math.floor(Math.random() * a.length)];
const ev = (titre, img, texte, choix, cb) => hooks.sortieEvent({ titre, img, texte, choix }, cb);
const nm = () => G.s.char.name;

// ---------- Le calendrier : une année de 360 jours ----------
// Le Ramadan commence le jour 30 et dure 30 jours ; l'Aïd el-Fitr suit (3 jours) ; l'Aïd el-Adha tombe 70 jours plus tard (2 jours).
export const ANNEE = 360, RAMADAN_DEBUT = 30, RAMADAN_DUREE = 30, FITR_DEBUT = 60, ADHA_DEBUT = 130;
export function calendrier(t = G.s.t) {
  const d = dayIdx(t), j = d % ANNEE;
  const c = { jour: j, ramadan: false, jourRamadan: 0, aid: null, jourAid: 0, veilleAdha: false, nuitDestin: false };
  if (j >= RAMADAN_DEBUT && j < RAMADAN_DEBUT + RAMADAN_DUREE) { c.ramadan = true; c.jourRamadan = j - RAMADAN_DEBUT + 1; c.nuitDestin = c.jourRamadan === 27; }
  if (j >= FITR_DEBUT && j < FITR_DEBUT + 3) { c.aid = 'fitr'; c.jourAid = j - FITR_DEBUT + 1; }
  if (j >= ADHA_DEBUT && j < ADHA_DEBUT + 2) { c.aid = 'adha'; c.jourAid = j - ADHA_DEBUT + 1; }
  if (j === ADHA_DEBUT - 2) c.veilleAdha = true;
  return c;
}
export const ramadan = () => calendrier().ramadan;
export const ferie = () => !!calendrier().aid;
// Le jeûne : du lever (5 h) au coucher du soleil (19 h), pour qui pratique.
export const jeune = () => { const s = G.s; if (!ramadan() || s.pratique === 'non' || s.jeuneRompu === dayIdx(s.t)) return false; const h = hour(s.t); return h >= 5 && h < 19; };
export const prochaineFete = () => {
  const j = calendrier().jour, L = [[RAMADAN_DEBUT, 'le Ramadan'], [FITR_DEBUT, "l'Aïd el-Fitr"], [ADHA_DEBUT, "l'Aïd el-Adha"]];
  for (const [d, n] of L) if (d > j) return { nom: n, dans: d - j };
  return { nom: 'le Ramadan', dans: ANNEE - j + RAMADAN_DEBUT };
};
export function initFetes(s) {
  if (s.invitation === undefined) s.invitation = null;
  if (s.fetes == null) s.fetes = { habits: -1, mouton: -1, dernierMariage: -20, ftour: -1, tarawih: -1 };
  if (s.jeuneRompu == null) s.jeuneRompu = -1;
}

// ---------- Chaque minute : ce que les fêtes déclenchent ----------
export function fetesMinute(T) {
  const s = G.s, d = dayIdx(T), mm = T % 1440, c = calendrier(T);
  if (c.ramadan) {
    if (c.jourRamadan === 1 && mm === 7 * 60) { toast('Le Ramadan commence. Le café ferme le jour et vit la nuit, le travail finit à 15 h, et tout le quartier attend le ftour.', 'good'); hooks.quartierChanged(); }
    if (mm === 18 * 60 + 50 && !s.away && s.fetes.ftour !== d) { s.fetes.ftour = d; ftour(); }
    if (mm === 21 * 60 + 30 && s.pratique !== 'non' && !s.away && s.fetes.tarawih !== d && Math.random() < (s.pratique === 'pratiquant' ? 0.5 : 0.2)) { s.fetes.tarawih = d; tarawih(c.nuitDestin); }
    if (c.jourRamadan === RAMADAN_DUREE && mm === 20 * 60) toast('Demain, c\'est l\'Aïd. Trois jours de fête, et pas de travail.', 'good');
  }
  if (c.jour === RAMADAN_DEBUT + RAMADAN_DUREE && mm === 7 * 60) hooks.quartierChanged();
  if (c.aid === 'fitr') {
    if (c.jourAid === 1 && mm === 8 * 60 && !s.away) matinAid('fitr');
    if (c.jourAid === 1 && mm === 13 * 60 && !s.away) visitesAid();
    if (c.jourAid === 2 && mm === 11 * 60 && !s.away) voisinsAid();
  }
  if (c.veilleAdha && mm === 10 * 60 && !s.away && s.fetes.mouton !== d) { s.fetes.mouton = d; mouton(); }
  if (c.aid === 'adha') {
    if (c.jourAid === 1 && mm === 8 * 60 && !s.away) matinAid('adha');
    if (c.jourAid === 1 && mm === 12 * 60 && !s.away) jourDuMouton();
  }
  // Les mariages et les naissances : une invitation de temps en temps, le grand jour trois jours plus tard.
  if (mm === 10 * 60 && !s.invitation && d - s.fetes.dernierMariage > 20 && !c.ramadan && Math.random() < 0.08) invitation();
  if (s.invitation && d === s.invitation.jour && mm === s.invitation.heure * 60) grandJour();
}

// ---------- Ramadan ----------
function ftour() {
  const s = G.s;
  const plats = s.plats.filter(p => p.r !== 'the');
  const voisin = npcDefs().find(n => relOf(n.id) >= 25 && !n.serveur && !n.boutique && !n.collegue);
  const choix = [{ label: plats.length ? `Rompre le jeûne à la maison (${RECETTES[plats[0].r].nom})` : 'Rompre le jeûne à la maison (dattes et lait)' }];
  if (s.milieu !== 'aise' || Math.random() < 0.5) choix.push({ label: 'Ftour chez tes parents (2 h)' });
  if (voisin) choix.push({ label: `Ftour chez ${voisin.nom}, qui t'a invité(e) (2 h)` });
  choix.push({ label: 'Ftour au café, en terrasse (30 DH)' });
  ev('L\'heure du ftour', 'illu-daret', `Le canon va tonner. ${jeune() || s.pratique !== 'non' ? 'Toute la journée sans manger ni boire : c\'est l\'heure.' : 'Même sans jeûner, le ftour est le moment de la journée.'}`, choix, i => {
    const l = choix[i].label;
    s.needs.faim = clampv(s.needs.faim + 55, 0, 100); s.needs.moral = clampv(s.needs.moral + 14, 0, 100);
    if (l.startsWith('Rompre')) { if (plats.length) { plats[0].n--; if (!plats[0].n) s.plats.splice(s.plats.indexOf(plats[0]), 1); } toast('Harira, dattes, chebakia. Le silence, puis les voix.'); }
    else if (l.startsWith('Ftour chez tes')) { cancelAll(); s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 120, label: 'Ftour en famille', extra: { social: 14, moral: 6 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw }; fam(8); }
    else if (voisin && l.includes(voisin.nom)) { cancelAll(); s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 120, label: `Ftour chez ${voisin.nom}`, extra: { social: 16, moral: 6 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw }; addRelRaw({ id: voisin.id }, 10); rep(3); }
    else { if (s.money < 30) return toast('Pas de quoi payer le café.', 'bad'); s.money -= 30; s.needs.social = clampv(s.needs.social + 10, 0, 100); toast('Harira et msemen en terrasse, avec tout le quartier.'); }
    save();
  });
}
function tarawih(destin) {
  const s = G.s;
  ev(destin ? 'La nuit du destin' : 'Les tarawih', null, destin ? 'La 27e nuit. La mosquée déborde jusque dans la rue, les lumières restent allumées jusqu\'à l\'aube.' : 'Après le ftour, les voisins partent pour les prières du soir. La rue est pleine.', [
    { label: destin ? 'Y aller, veiller tard' : 'Y aller (1 h 30)' }, { label: 'Rester à la maison' },
  ], i => {
    if (i === 0) {
      cancelAll();
      s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + (destin ? 240 : 90), label: 'À la mosquée', extra: { moral: destin ? 10 : 6, social: 6, energie: -4 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw };
      if (s.quartier === 'populaire') rep(destin ? 5 : 2);
      if (destin) fam(3);
    }
    save();
  });
}
export function rompreJeune() {
  const s = G.s;
  s.jeuneRompu = dayIdx(s.t);
  if (s.quartier === 'populaire' && Math.random() < 0.5) { rep(-4, 'tu as mangé en plein jour pendant le Ramadan'); toast('Quelqu\'un t\'a vu(e) manger.', 'bad'); }
}
// Pendant le Ramadan, les horaires changent : le café vit la nuit, le travail finit à 15 h.
export const cafeRamadan = h => h >= 20 || h < 1;
export const finTravail = () => (ramadan() ? 15 : 17);

// ---------- Les Aïds ----------
function matinAid(type) {
  const s = G.s, d = dayIdx(s.t);
  const texte = type === 'fitr' ? 'Aïd moubarak ! Le quartier s\'est levé tôt : habits neufs, prière de l\'Aïd, et les voisins qui s\'embrassent dans la rue.' : 'Aïd el-Adha. La prière du matin, puis le mouton. Tout le quartier sent le charbon et la menthe.';
  const choix = [{ label: 'Aller à la prière de l\'Aïd (1 h)' }];
  if (s.fetes.habits !== Math.floor(d / 30)) choix.push({ label: 'S\'acheter des habits neufs d\'abord (300 DH)' });
  choix.push({ label: 'Faire la grasse matinée' });
  ev(type === 'fitr' ? 'Aïd el-Fitr' : 'Aïd el-Adha', 'ecran-accueil', texte, choix, i => {
    const l = choix[i].label;
    if (l.startsWith('Aller')) { cancelAll(); s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 60, label: 'À la prière de l\'Aïd', extra: { moral: 12, social: 10 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw }; if (s.quartier === 'populaire') rep(4); fam(2); }
    else if (l.startsWith('S\'acheter')) { if (s.money < 300) return toast('Pas de quoi.', 'bad'); s.money -= 300; s.fetes.habits = Math.floor(d / 30); s.char.outfitColor = pick(OUTFIT_COLORS.filter(x => x !== s.char.outfitColor)); hooks.lookChanged(); s.needs.moral = clampv(s.needs.moral + 12, 0, 100); rep(2); toast('Habits neufs. Tout le monde l\'a remarqué.', 'good'); }
    else { s.needs.energie = clampv(s.needs.energie + 10, 0, 100); if (s.quartier === 'populaire' && s.pratique === 'pratiquant') rep(-2); toast('Le quartier fait la fête sans toi, pour le moment.'); }
    save();
  });
}
function visitesAid() {
  const s = G.s;
  ev('Les visites de l\'Aïd', 'illu-daret', 'Après-midi de visites : les parents, les tantes, les cousins. Il faut prévoir les gâteaux et les billets pour les enfants.', [
    { label: 'Faire le tour de la famille (4 h, 150 DH pour les enfants)' }, { label: 'Passer seulement chez les parents (2 h)' }, { label: 'Rester chez soi' },
  ], i => {
    if (i === 0) { if (s.money < 150) return toast('Les enfants attendent leurs billets… tu n\'as pas de quoi.', 'bad'); s.money -= 150; cancelAll(); s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 240, label: 'Visites de l\'Aïd', extra: { social: 20, moral: 10, faim: 15 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw }; fam(14); rep(3); }
    else if (i === 1) { cancelAll(); s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 120, label: 'Chez les parents', extra: { social: 12, moral: 8, faim: 10 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw }; fam(6); }
    else { fam(-10); toast('« Même pour l\'Aïd, tu ne viens pas ? »', 'bad'); }
    save();
  });
}
function voisinsAid() {
  const s = G.s, sucre = s.plats.find(p => p.r === 'chebakia' && p.q > 0);
  ev('Les voisins passent', null, 'Deuxième jour de l\'Aïd. Les voisins frappent aux portes avec des plateaux de gâteaux.', [
    { label: sucre ? 'Offrir tes chebakia faites maison' : 'Offrir des gâteaux du hanout (60 DH)' }, { label: 'Ouvrir, sans rien offrir' },
  ], i => {
    if (i === 0) {
      if (sucre) { s.plats.splice(s.plats.indexOf(sucre), 1); rep(6); toast('« Faites maison ! » Les voisins en parleront.', 'good'); }
      else { if (s.money < 60) return toast('Pas de quoi.', 'bad'); s.money -= 60; rep(3); }
      for (const n of npcDefs()) if (!n.collegue) addRelRaw({ id: n.id }, 4);
      s.needs.social = clampv(s.needs.social + 15, 0, 100);
    } else { rep(-3, 'ta porte restée vide à l\'Aïd'); }
    save();
  });
}
function mouton() {
  const s = G.s, prix = { populaire: 2500, moyen: 3500, aise: 5000 }[s.milieu];
  const choix = [{ label: `Acheter un mouton (${fmtDH(prix)})` }];
  if (s.milieu === 'aise') choix.push({ label: 'Tes parents s\'en chargent' });
  else choix.push({ label: 'Partager avec tes parents (la moitié)' });
  choix.push({ label: 'Pas de mouton cette année' });
  ev('Le mouton de l\'Aïd', 'illu-marche', 'Dans deux jours, l\'Aïd el-Adha. Le marché aux moutons est installé au bout de la rue, et tout le monde compare les prix.', choix, i => {
    const l = choix[i].label;
    if (l.startsWith('Acheter')) { if (s.money < prix) return toast('Tu n\'as pas cette somme.', 'bad'); s.money -= prix; s.fetes.moutonOk = true; rep(5); fam(6); toast('Le mouton bêle sur le toit. Les voisins ont jaugé.', 'good'); }
    else if (l.startsWith('Partager')) { if (s.money < prix / 2) return toast('Même la moitié, tu ne l\'as pas.', 'bad'); s.money -= prix / 2; s.fetes.moutonOk = true; fam(8); }
    else if (l.startsWith('Tes parents')) { s.fetes.moutonOk = true; fam(2); toast('Comme chaque année.'); }
    else { s.fetes.moutonOk = false; rep(-6, 'pas de mouton chez toi'); fam(-8); toast('Ta mère n\'a rien dit. Ta tante, si.', 'bad'); }
    save();
  });
}
function jourDuMouton() {
  const s = G.s;
  if (!s.fetes.moutonOk) { toast('Le quartier fête l\'Aïd el-Adha. Chez toi, ça sent moins le charbon.'); return; }
  ev('Le jour du mouton', 'illu-daret', 'Boulfaf au petit matin, puis le repas de famille. Les voisins s\'échangent des parts, et les enfants courent partout.', [
    { label: 'La journée en famille (5 h)' }, { label: 'Partager de la viande avec les voisins, puis la famille' },
  ], i => {
    cancelAll();
    s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 300, label: 'L\'Aïd en famille', extra: { faim: 20, social: 16, moral: 12 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw };
    fam(12);
    s.plats.push({ r: 'tajine', q: 1, n: 6 });
    if (i === 1) { rep(6); for (const n of npcDefs()) if (!n.collegue) addRelRaw({ id: n.id }, 3); toast('Tu as fait le tour des voisins avec des parts. On s\'en souviendra.', 'good'); }
    save();
  });
}

// ---------- Mariages et naissances du quartier ----------
function invitation() {
  const s = G.s, d = dayIdx(s.t);
  const hotes = npcDefs().filter(n => relOf(n.id) >= 15 && !n.collegue);
  if (!hotes.length) return;
  const h = pick(hotes), mariage = Math.random() < 0.7;
  const qui = pick(mariage ? ['sa fille', 'son fils', 'sa nièce', 'son neveu'] : ['sa fille', 'sa belle-sœur']);
  s.fetes.dernierMariage = d;
  s.invitation = { npc: h.id, type: mariage ? 'mariage' : 'sbou3', jour: d + 3, heure: mariage ? 20 : 15, qui };
  const cadeau = cadeauDe(mariage);
  ev(h.nom, 'portrait-' + h.id, mariage ? `« ${qui === 'sa fille' ? 'Ma fille' : qui === 'son fils' ? 'Mon fils' : qui === 'sa nièce' ? 'Ma nièce' : 'Mon neveu'} se marie samedi ! Tu es de la famille maintenant, tu viens. » Un mariage, c'est une soirée entière, et un cadeau d'environ ${fmtDH(cadeau)}.` : `« ${qui === 'sa fille' ? 'Ma fille' : 'Ma belle-sœur'} a eu un bébé ! Le sbou3, c'est dans trois jours, viens. » Une après-midi, et un petit cadeau (${fmtDH(cadeau)}).`, [
    { label: 'Accepter avec plaisir' }, { label: 'Décliner' },
  ], i => {
    if (i === 0) { s.invitation.ok = true; addRelRaw({ id: h.id }, 4); toast(`Rendez-vous dans trois jours à ${s.invitation.heure} h. Ne l'oublie pas.`); }
    else { addRelRaw({ id: h.id }, -8); rep(-2); s.invitation = null; toast('« Dommage. Une autre fois, inchallah. »'); }
    save();
  });
}
const cadeauDe = mariage => ({ populaire: mariage ? 200 : 100, moyen: mariage ? 300 : 150, aise: mariage ? 500 : 250 }[G.s.milieu]);
function grandJour() {
  const s = G.s, inv = s.invitation, h = getNpc(inv.npc), nom = h ? h.def.nom : 'ton voisin';
  s.invitation = null;
  if (!inv.ok) return;
  if (s.away) { addRelRaw({ id: inv.npc }, -10); rep(-3); toast(`Tu as manqué ${inv.type === 'mariage' ? 'le mariage' : 'le sbou3'} chez ${nom}.`, 'bad'); return; }
  const cadeau = cadeauDe(inv.type === 'mariage');
  const mariage = inv.type === 'mariage';
  ev(mariage ? 'Le mariage' : 'Le sbou3', 'illu-daret', mariage ? `C'est ce soir chez ${nom} : la negafa, l'amariya, l'orchestre, les tenues qui changent. Ça durera jusqu'à l'aube.` : `Le septième jour du bébé chez ${nom} : on donne son prénom, on mange, on chante.`, [
    { label: `Y aller avec le cadeau (${fmtDH(cadeau)})` }, { label: `Y aller avec un cadeau plus modeste (${fmtDH(Math.round(cadeau / 2))})` }, { label: 'Finalement, ne pas y aller' },
  ], i => {
    if (i === 2) { addRelRaw({ id: inv.npc }, -12); rep(-4, 'une invitation ignorée'); toast('Ils t\'ont attendu(e).', 'bad'); save(); return; }
    const c = i === 0 ? cadeau : Math.round(cadeau / 2);
    if (s.money < c) return toast('Tu n\'as pas le cadeau. Impossible d\'y aller les mains vides.', 'bad');
    s.money -= c;
    cancelAll();
    const dur = mariage ? 420 : 180;
    s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + dur, label: mariage ? 'Au mariage' : 'Au sbou3', extra: { social: mariage ? 40 : 20, moral: mariage ? 22 : 12, energie: mariage ? -25 : -6, faim: 30 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw };
    addRelRaw({ id: inv.npc }, i === 0 ? 14 : 8); rep(i === 0 ? 4 : 1);
    for (const n of npcDefs()) if (!n.collegue && n.id !== inv.npc) addRelRaw({ id: n.id }, 2);
    const traits = s.char.outfit === 'caftan' || s.char.outfit === 'djellaba';
    if (mariage) setTimeout(() => hooks.sortieEvent({ titre: 'Au mariage', texte: pick(['Une tante te présente « une personne très bien ». Elle sourit. Toi aussi.', 'L\'orchestre attaque un chaâbi. Tout le monde se lève.', 'On te demande de porter l\'amariya avec les autres. Tes épaules s\'en souviendront.']), choix: [{ label: 'Profiter de la soirée' }] }, () => { s.needs.moral = clampv(s.needs.moral + 5, 0, 100); }), 1500);
    toast(mariage ? `Un mariage comme il faut.${traits ? ' Ta tenue traditionnelle a fait son effet.' : ''}` : 'Le prénom est choisi. Les youyous ont fait trembler les murs.', 'good');
    if (traits) s.needs.moral = clampv(s.needs.moral + 5, 0, 100);
    save();
  });
}
export const fetesInfo = () => {
  const c = calendrier(), p = prochaineFete(), s = G.s;
  return { c, prochaine: p, invitation: s.invitation, jeune: jeune() };
};
