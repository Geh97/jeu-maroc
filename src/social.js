// La société : réputation dans le quartier, famille selon le milieu, pression sociale, réseau et pratique religieuse.
import { RECETTES, QUARTIERS } from './data.js';
import { G, hooks, dayIdx, dow, hour, fmtDH, enqueue, cancelAll, save, revenu, homeHere, ambiance, clampv, getNpc, relOf, addRelRaw } from './sim.js';

const toast = (m, k) => hooks.toast(m, k);
const pick = a => a[Math.floor(Math.random() * a.length)];
const nm = () => G.s.char.name;
const ev = (titre, img, texte, choix, cb) => hooks.sortieEvent({ titre, img, texte, choix }, cb);

export const PRATIQUES = { pratiquant: 'Pratiquant(e)', occasionnel: 'De temps en temps', non: 'Non pratiquant(e)' };
export const REP_LABELS = [[80, 'Respecté(e)'], [60, 'Bien vu(e)'], [40, 'Correct(e)'], [20, 'Mal vu(e)'], [0, 'Infréquentable']];
export const repLabel = v => REP_LABELS.find(([min]) => v >= min)[1];
export const FAM_LABELS = [[80, 'Très proche'], [60, 'Proche'], [40, 'Normale'], [20, 'Distante'], [0, 'Rompue']];
export const famLabel = v => FAM_LABELS.find(([min]) => v >= min)[1];

export function initSocial(s) {
  if (s.reputation == null) s.reputation = { populaire: 45, moyen: 50, aise: 55 }[s.milieu];
  if (s.famille == null) s.famille = { populaire: 70, moyen: 60, aise: 50 }[s.milieu];
  if (!s.pratique) s.pratique = 'occasionnel';
  if (s.dette == null) s.dette = 0;
  if (!s.faveurs) s.faveurs = {};
  if (!s.social) s.social = { semaine: -1, lastVisite: -1, lastPression: -1 };
}

// ---------- Réputation ----------
export function rep(v, why) {
  const s = G.s, before = s.reputation;
  s.reputation = clampv(s.reputation + v, 0, 100);
  if (v <= -5) toast(`On parle de toi dans le quartier${why ? ' : ' + why : ''}.`, 'bad');
  for (const seuil of [20, 40, 60, 80]) {
    if (before < seuil && s.reputation >= seuil) toast(`Ta réputation grimpe : ${repLabel(s.reputation).toLowerCase()}.`, 'good');
    if (before >= seuil && s.reputation < seuil) toast(`Ta réputation baisse : ${repLabel(s.reputation).toLowerCase()}.`, 'bad');
  }
}
export function fam(v) {
  const s = G.s, before = s.famille;
  s.famille = clampv(s.famille + v, 0, 100);
  for (const seuil of [20, 40, 60, 80]) {
    if (before < seuil && s.famille >= seuil) toast(`Avec ta famille : ${famLabel(s.famille).toLowerCase()}.`, 'good');
    if (before >= seuil && s.famille < seuil) toast(`Avec ta famille : ${famLabel(s.famille).toLowerCase()}.`, 'bad');
  }
}
// Le hanout fait crédit aux gens bien vus, et une remise aux habitués respectés.
export const remiseHanout = () => (G.s.quartier === 'populaire' && G.s.reputation >= 70 ? 0.9 : 1);
export const creditPossible = () => G.s.quartier === 'populaire' && G.s.reputation >= 60 && G.s.dette < 500;
export const evite = () => G.s.reputation < 20; // les voisins t'évitent

// ---------- Les rendez-vous de la semaine ----------
// Dimanche 11 h : l'appel de la mère. Vendredi midi : la prière, selon la pratique. Vendredi soir ou dimanche midi : le repas de famille.
export function socialMinute(T) {
  const s = G.s, d = dayIdx(T), w = d % 7, mm = T % 1440, M = s.milieu;
  if (w === 4 && mm === 12 * 60 + 20 && s.pratique !== 'non') priere();
  if (s.away && s.away.lieu === 'travail') return;
  if (w === 6 && mm === 11 * 60) appelMere();
  const repas = M === 'aise' ? (w === 6 && mm === 13 * 60) : (w === 4 && mm === 19 * 60 && (M === 'populaire' || Math.floor(d / 7) % 2 === 0));
  if (repas) repasFamille();
  if (w === 0 && mm === 6 * 60 + 1) semaine(d);
  if (w === 2 && mm === 20 * 60 && M === 'populaire' && Math.random() < 0.3 && homeHere() && !s.away) visiteSurprise();
  if (mm === 9 * 60 && Math.random() < 0.06 && s.t - s.social.lastPression > 3 * 1440) { s.social.lastPression = s.t; pression(); }
  if (w === 3 && mm === 18 * 60 && Math.random() < 0.3) reseau();
}
function semaine(d) {
  const s = G.s;
  // La dette au hanout se rembourse d'elle-même quand on a de quoi.
  if (s.dette > 0 && s.money >= s.dette) { s.money -= s.dette; toast(`Dette au hanout remboursée : ${fmtDH(s.dette)}.`); s.dette = 0; }
  else if (s.dette > 0) rep(-4, 'tu dois encore de l\'argent au hanout');
  if (s.money < 0) rep(-6, 'les factures impayées');
  else rep(1);
  if (s.famille > 0) fam(-2); // sans nouvelles, le lien se distend doucement
  // Une fois par mois, la famille a besoin d'un coup de main (sauf chez les aisés).
  if (s.milieu !== 'aise' && Math.floor(d / 7) % 4 === 2) aideFamille();
}

function appelMere() {
  const s = G.s, M = s.milieu;
  const sujets = {
    populaire: ['Tu manges bien ? Tu es passé(e) chez le hanout de Ba Lahcen, il m\'a dit que tu avais une petite mine.', 'Ton cousin s\'est marié, lui. Et toi, mta tzewej ?', 'Ton père a mal au dos. Tu viens vendredi ?'],
    moyen: ['Alors, ce travail ? Le chef est content de toi ?', 'Ta tante demande toujours quand tu te maries.', 'On a vu un reportage sur ton quartier. Fais attention le soir.'],
    aise: ['Ton père voudrait que tu passes au bureau dimanche.', 'Tu as réfléchi à l\'appartement d\'Anfa ? On peut aider.', 'Les Benjelloun nous ont invités. Ils ont une fille charmante.'],
  }[M];
  ev('Ta mère appelle', null, `« ${pick(sujets)} »`, [
    { label: 'Prendre le temps de parler (15 min)' }, { label: 'Écourter : tu es occupé(e)' }, { label: 'Ne pas répondre' },
  ], i => {
    if (i === 0) { fam(8); s.needs.moral = clampv(s.needs.moral + 6, 0, 100); s.needs.social = clampv(s.needs.social + 10, 0, 100); toast('Elle t\'a raconté tout le quartier de ton enfance.'); }
    else if (i === 1) { fam(1); toast('« Bon, je te laisse. Mange bien. »'); }
    else { fam(-7); s.needs.moral = clampv(s.needs.moral - 3, 0, 100); toast('Trois appels manqués. Elle va s\'inquiéter.'); }
    save();
  });
}
function priere() {
  const s = G.s, auTravail = s.away && s.away.lieu === 'travail';
  if (s.away && !auTravail) return;
  if (s.pratique === 'occasionnel' && Math.random() < 0.5) return;
  const texte = auTravail ? 'C\'est l\'heure de la prière du vendredi. Des collègues s\'absentent une heure, le chef tolère, sans aimer ça.' : 'C\'est bientôt l\'heure de la prière du vendredi. La mosquée du quartier se remplit.';
  ev('La prière du vendredi', null, texte, [
    { label: auTravail ? 'S\'absenter une heure' : 'Y aller (1 h)' }, { label: 'Pas aujourd\'hui' },
  ], i => {
    if (i === 0) {
      if (auTravail) { s.job.perf = clampv(s.job.perf - 2, 0, 100); s.job.collegues = clampv(s.job.collegues + 3, 0, 100); s.needs.moral = clampv(s.needs.moral + 8, 0, 100); }
      else {
        cancelAll();
        s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 60, label: 'À la mosquée', extra: { moral: 10, social: 8 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw, priere: true };
        if (s.quartier === 'populaire') toast('Les voisins t\'ont vu(e) à la mosquée.');
      }
      if (s.quartier === 'populaire') rep(3);
    } else if (s.pratique === 'pratiquant') { s.needs.moral = clampv(s.needs.moral - 4, 0, 100); if (s.quartier === 'populaire') rep(-2); }
    save();
  });
}
function repasFamille() {
  const s = G.s, M = s.milieu;
  if (s.away) { fam(-4); toast('Tu as manqué le repas de famille.', 'bad'); return; }
  const titre = M === 'aise' ? 'Le déjeuner du dimanche chez tes parents' : 'Le couscous du vendredi chez tes parents';
  ev(titre, 'illu-daret', M === 'aise' ? 'Tes parents t\'attendent pour le déjeuner. Ton père a des choses à te dire.' : 'Toute la famille sera là. Ta mère a fait du couscous.', [
    { label: 'Y aller (3 h)' }, { label: 'Pas cette fois' },
  ], i => {
    if (i === 0) {
      cancelAll();
      s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 180, label: 'En famille', extra: { faim: 25, moral: 12, social: 14 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw, famille: true };
      fam(10);
      if (M === 'aise' && s.job.absences > 0) { toast('Ton père : « On m\'a dit que tu n\'étais pas au bureau cette semaine. » Repas tendu.', 'bad'); fam(-6); }
      if (M === 'populaire') { s.plats.push({ r: 'couscous', q: 1, n: 3 }); toast('Ta mère t\'a donné du couscous pour la semaine.'); }
    } else { fam(M === 'populaire' ? -10 : -6); toast('« Tu nous oublies. »', 'bad'); }
    save();
  });
}
function visiteSurprise() {
  const s = G.s, amb = ambiance(s.home);
  ev('Quelqu\'un frappe', null, 'Ta mère passe à l\'improviste, avec un plat dans les mains. Elle regarde l\'appartement.', [
    { label: 'La faire entrer' }, { label: 'Dire que tu allais sortir' },
  ], i => {
    if (i === 0) {
      s.plats.push({ r: 'tajine', q: 1, n: 4 });
      if (amb >= 12) { fam(6); toast('« C\'est joli chez toi. » Elle laisse un tajine.'); }
      else { fam(2); toast('Elle n\'a rien dit sur l\'appartement, mais elle a tout vu. Elle laisse un tajine.'); }
      s.needs.social = clampv(s.needs.social + 10, 0, 100);
    } else { fam(-8); toast('Elle repart avec son plat. Elle en parlera à ta tante.'); rep(-2); }
    save();
  });
}
function aideFamille() {
  const s = G.s, montant = s.milieu === 'populaire' ? 300 : 500;
  ev('Un coup de main', null, `Ta mère n'ose pas demander, mais ton petit frère a besoin de ${fmtDH(montant)} pour ses fournitures.`, [
    { label: `Envoyer ${fmtDH(montant)}` }, { label: 'Pas ce mois-ci' },
  ], i => {
    if (i === 0) { if (s.money < montant) { toast('Tu n\'as pas cette somme.', 'bad'); fam(-4); return; } s.money -= montant; fam(10); rep(3); toast('« Que Dieu te garde. » Tout le quartier le saura.'); }
    else { fam(-8); toast('Elle a dit que ce n\'était pas grave. Ce n\'était pas vrai.'); }
    save();
  });
}

// ---------- La pression sociale ----------
function pression() {
  const s = G.s;
  const E = [
    { texte: 'Ta tante a trouvé « quelqu\'un de très bien » et veut organiser une rencontre dimanche.', choix: [
      { label: 'Accepter la rencontre', f: () => { fam(6); s.needs.social = clampv(s.needs.social + 12, 0, 100); toast('Un thé poli, des parents qui parlent à votre place. Pas désagréable, finalement.'); } },
      { label: 'Refuser gentiment', f: () => { fam(-4); s.needs.moral = clampv(s.needs.moral + 3, 0, 100); toast('« Tu as le temps, tu as le temps… jusqu\'à quand ? »'); } },
    ] },
    { texte: 'Ton cousin vient d\'acheter une voiture. Toute la famille en parle.', choix: [
      { label: 'Le féliciter sincèrement', f: () => { fam(3); s.needs.moral = clampv(s.needs.moral + (s.vehicule ? 2 : -4), 0, 100); toast(s.vehicule ? 'Tu as la tienne, ça ne te fait rien.' : 'Tu as souri. Ça t\'a quand même piqué.'); } },
      { label: 'Changer de sujet', f: () => { s.needs.moral = clampv(s.needs.moral - 2, 0, 100); toast('Ta mère a remarqué.'); fam(-2); } },
    ] },
    { texte: 'Lalla Khadija demande, devant tout le monde, pourquoi on ne te voit plus beaucoup.', choix: [
      { label: 'Répondre avec humour', f: () => { rep(2); toast('Tout le monde a ri, elle aussi.'); } },
      { label: 'Répondre sèchement', f: () => { rep(-5, 'ta réponse à Lalla Khadija'); const k = getNpc('khadija'); if (k) addRelRaw(k, -6); } },
    ] },
    { texte: 'Un voisin te demande pourquoi tu n\'es pas encore marié(e), « à ton âge ».', choix: [
      { label: 'Sourire et laisser passer', f: () => { s.needs.moral = clampv(s.needs.moral - 3, 0, 100); toast('Tu as l\'habitude.'); } },
      { label: 'Lui demander de s\'occuper de ses affaires', f: () => { rep(-4, 'ton franc-parler'); s.needs.moral = clampv(s.needs.moral + 4, 0, 100); } },
    ] },
  ];
  const e = pick(E);
  ev('Le qu\'en-dira-t-on', null, e.texte, e.choix.map(c => ({ label: c.label })), i => { e.choix[i].f(); save(); });
}

// ---------- Le réseau : un coup de pouce, puis un service à rendre ----------
function reseau() {
  const s = G.s, id = s.quartier === 'anfa' ? 'haj' : 'driss', n = getNpc(id);
  if (!n || relOf(id) < 50) return;
  if (!s.faveurs[id]) {
    ev(n.def.nom, 'portrait-' + id, `« Je connais du monde. Si tu veux, je peux glisser un mot pour toi au travail. Ça ne se refuse pas, ces choses-là. »`, [
      { label: 'Accepter le coup de pouce' }, { label: 'Décliner poliment' },
    ], i => {
      if (i === 0) { s.faveurs[id] = 'due'; s.job.perf = clampv(s.job.perf + 30, 0, 100); toast('Le lendemain, ton chef te regarde autrement. Performance +30. Tu lui dois un service.', 'good'); }
      else { addRelRaw(n, -5); toast('« Comme tu veux. »'); }
      save();
    });
  } else if (s.faveurs[id] === 'due') {
    ev(n.def.nom, 'portrait-' + id, `« Mon neveu cherche un stage. Tu pourrais le faire entrer dans ta boîte ? Tu te souviens, pour toi, je n'ai pas hésité. »`, [
      { label: 'Le faire entrer' }, { label: 'Trouver une excuse' },
    ], i => {
      if (i === 0) { s.faveurs[id] = 'rendu'; s.job.collegues = clampv(s.job.collegues - 8, 0, 100); addRelRaw(n, 12); rep(4); toast('Le neveu est arrivé lundi. Les collègues grincent, mais on sait que tu tiens parole.'); }
      else { s.faveurs[id] = 'trahi'; addRelRaw(n, -25); rep(-8, 'tu n\'as pas renvoyé l\'ascenseur'); toast(`${n.def.nom} ne l'oubliera pas.`, 'bad'); }
      save();
    });
  }
}

// Les voisins remarquent ce que tu fais : une remarque de temps en temps.
export function remarque() {
  const s = G.s;
  if (s.quartier !== 'populaire' || Math.random() > 0.5) return;
  if (s.pratique === 'non') toast(pick(['Lalla Khadija : « On ne te voit jamais à la mosquée, toi. »', 'Si Driss : « Vendredi, viens avec nous, pour une fois. »']));
  if (s.vehicule === 'voiture') toast(pick(['Omar : « Elle consomme beaucoup, ta voiture ? »', 'Un voisin siffle en passant devant ta voiture.']));
}
export const socialInfo = () => {
  const s = G.s;
  return { reputation: s.reputation, repLabel: repLabel(s.reputation), famille: s.famille, famLabel: famLabel(s.famille), pratique: PRATIQUES[s.pratique], dette: s.dette };
};
