// Le travail en profondeur : collègues et chef, offres et entretiens, licenciement, paie, extras au noir, et son affaire.
import { D, MILIEUX } from './data.js';
import { G, hooks, dayIdx, dow, hour, fmtDH, save, clampv, getNpc, relOf, addRelRaw, jobOf, milieu, cancelAll, homeHere } from './sim.js';
import { rep, fam } from './social.js';

const toast = (m, k) => hooks.toast(m, k);
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const ev = (titre, img, texte, choix, cb) => hooks.sortieEvent({ titre, img, texte, choix }, cb);
const nm = () => G.s.char.name;

// ---------- Les collègues et le chef, selon le milieu ----------
// Ils habitent ailleurs, mais passent prendre un thé dans ton quartier le mardi et le jeudi soir, et le vendredi pour les pots.
export const COLLEGUES = {
  populaire: {
    chef: { id: 'c_hassan', nom: 'Moulay Hassan', desc: 'Le patron du garage. Dur, mais il paie à l\'heure et il défend ses gars.', style: 'dur',
      look: { skin: '#8a5a3c', hair: 'rasee', hairColor: '#9a958f', outfit: 'jean', outfitColor: '#2f4f7a' },
      lignes: ['Au garage, on ne discute pas, on répare.', 'Mon père a ouvert ce garage. Il est enterré derrière.', 'Tu veux une augmentation ? Montre-moi.'] },
    collegues: [
      { id: 'c_brahim', nom: 'Brahim', desc: 'Mécanicien depuis quinze ans. Il connaît tous les bruits de moteur et toutes les blagues de Casa.',
        look: { skin: '#b07a55', hair: 'courte', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#7a2e3a' },
        lignes: ['Le patron a l\'air dur, mais il m\'a prêté de l\'argent pour mon mariage.', 'Samedi, j\'ai un client qui paie bien, si tu veux.', 'Tu as entendu le moteur de la 205 ? Un concert.'] },
      { id: 'c_said', nom: 'Saïd', desc: 'L\'apprenti. Toujours en retard, toujours souriant.',
        look: { skin: '#d19e78', hair: 'courte', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#2e6b57' },
        lignes: ['Je vais finir par être à l\'heure, promis.', 'Tu me montres comment tu fais pour les freins ?', 'Le patron m\'a encore crié dessus. Mais il a raison.'] },
    ],
  },
  moyen: {
    chef: { id: 'c_bennani', nom: 'M. Bennani', desc: 'Le chef de service. Poli, distant, et il a ses têtes.', style: 'favoritisme',
      look: { skin: '#d19e78', hair: 'courte', hairColor: '#9a958f', outfit: 'costume', outfitColor: '#3a3a3a' },
      lignes: ['Le directeur attend des résultats. Moi aussi.', 'Je ne mélange pas le travail et le reste.', 'Vous avez de l\'avenir, si vous savez vous placer.'] },
    collegues: [
      { id: 'c_nadia', nom: 'Nadia', desc: 'Assistante de direction. Efficace, elle sait tout avant tout le monde.',
        look: { skin: '#e6b994', hair: 'attachee', hairColor: '#1d1714', outfit: 'costume', outfitColor: '#7a2e3a' },
        lignes: ['Il y aura une réorganisation en juin. Tu ne le tiens pas de moi.', 'Bennani déjeune avec le directeur jeudi. Fais-toi voir.', 'Mehdi va encore râler, mais il n\'a pas tort.'] },
      { id: 'c_mehdi', nom: 'Mehdi', desc: 'Ton voisin de bureau. Syndiqué, fatigué, honnête.',
        look: { skin: '#b07a55', hair: 'courte', hairColor: '#3b2618', outfit: 'costume', outfitColor: '#2f4f7a' },
        lignes: ['Ils nous demandent toujours plus pour le même salaire.', 'Ne reste pas tard pour rien, ça ne se voit pas sur la fiche de paie.', 'Un café en bas ? J\'ai besoin d\'air.'] },
    ],
  },
  aise: {
    chef: { id: 'c_pere', nom: 'Ton père', desc: 'Le fondateur de l\'entreprise. Exigeant avec tout le monde, et deux fois plus avec toi.', style: 'exigeant',
      look: { skin: '#b07a55', hair: 'rasee', hairColor: '#9a958f', outfit: 'costume', outfitColor: '#1b1b1b' },
      lignes: ['Ici, tu n\'es pas mon fils, tu es un employé.', 'J\'ai commencé avec rien. Toi, tu as tout. Alors travaille.', 'Ghali me dit que tu progresses. Je verrai.'] },
    collegues: [
      { id: 'c_ghali', nom: 'Ghali', desc: 'Directeur financier depuis vingt ans, fidèle à ton père, courtois avec toi.',
        look: { skin: '#d19e78', hair: 'courte', hairColor: '#9a958f', outfit: 'costume', outfitColor: '#3a3a3a' },
        lignes: ['Votre père a bâti tout ça à la force du poignet.', 'Les chiffres ne mentent pas. Les gens, parfois.', 'Je serai franc avec vous, comme avec lui.'] },
      { id: 'c_sara', nom: 'Sara', desc: 'Chargée de clientèle, brillante, sans piston. Elle te juge, et elle a de quoi.',
        look: { skin: '#e6b994', hair: 'longue', hairColor: '#1d1714', outfit: 'costume', outfitColor: '#5b3d6e' },
        lignes: ['J\'ai eu ce poste sur concours. Toi ?', 'Si tu veux qu\'on te respecte ici, bosse deux fois plus.', 'Ton père est juste. Dur, mais juste.'] },
    ],
  },
};
export function collegueDefs(m) {
  const C = COLLEGUES[m];
  return [C.chef, ...C.collegues].map(c => ({ ...c, porte: { x: 27, z: D }, sorties: [[18.5, 20.2]], jours: [1, 3], cafe: 0.95, collegue: true }));
}
const nomChef = () => COLLEGUES[G.s.milieu].chef.nom;
const unCollegue = () => pick(COLLEGUES[G.s.milieu].collegues);

// Remplace {chef} et {collegue} dans le texte d'un événement, et retient le collègue concerné.
export function personnaliser(texte) {
  const c = unCollegue();
  G.evtCollegue = c;
  return texte.replace(/\{chef\}/g, nomChef()).replace(/\{collegue\}/g, c.nom);
}
export function effetCollegue(v) {
  const c = G.evtCollegue;
  if (!c) return;
  const n = getNpc(c.id);
  G.s.rel[c.id] = clampv((G.s.rel[c.id] || 0) + v * 0.6, 0, 100);
  if (n) {}
}

// ---------- Offres, entretiens, licenciement ----------
export function initTravail(s) {
  const J = s.job;
  if (J.mult == null) J.mult = 1;
  if (J.offres == null) J.offres = [];
  if (J.chomage == null) J.chomage = false;
  if (J.retard == null) J.retard = 0;
  if (J.recherche == null) J.recherche = -1;
  if (J.employeur == null) J.employeur = 0;
  if (J.avert == null) J.avert = 0;
  if (s.loyerMult == null) s.loyerMult = 1;
  if (s.affaire === undefined) s.affaire = null;
}
export const salaire = () => (G.s.affaire || G.s.job.chomage ? 0 : Math.round(jobOf().salaire * G.s.job.mult));
const EMPLOYEURS = {
  populaire: ['Garage Atlas', 'Atelier Benali', 'Station-service du rond-point', 'Garage du Port'],
  moyen: ['Cabinet Alami', 'Société Maghreb Services', 'Assurances du Nord', 'Groupe Tazi'],
  aise: ['Holding Bennis', 'Groupe Kettani', 'Banque privée Oualid', 'Cabinet de conseil Lazrak'],
};
export function chercherPoste() {
  const s = G.s, J = s.job, semaine = Math.floor(dayIdx(s.t) / 7);
  if (J.recherche === semaine) return toast('Tu as déjà fait le tour des annonces cette semaine.');
  J.recherche = semaine;
  const n = Math.random() < 0.5 + s.reputation / 200 ? 1 + (Math.random() < 0.3 ? 1 : 0) : 0;
  for (let i = 0; i < n; i++) nouvelleOffre();
  if (!n) toast('Rien d\'intéressant cette semaine. Réessaie la semaine prochaine.');
  save();
}
export function nouvelleOffre(source = 'annonce', multReseau = 0) {
  const s = G.s, J = s.job, base = jobOf().salaire * (J.chomage ? 0.85 : 1);
  const mult = multReseau || (J.chomage ? rand(0.8, 1.05) : rand(1.1, 1.4));
  const o = { id: Date.now() + Math.random(), employeur: pick(EMPLOYEURS[s.milieu]), salaire: Math.round(base * mult / 10) * 10, source, expire: dayIdx(s.t) + 7 };
  J.offres.push(o);
  toast(`${source === 'reseau' ? 'Par le réseau' : 'Une annonce'} : ${o.employeur} cherche quelqu'un, ${fmtDH(o.salaire)} par semaine. Entretien possible depuis l'onglet Argent.`, 'good');
}
export function entretien(id) {
  const s = G.s, J = s.job, o = J.offres.find(x => x.id === id);
  if (!o) return;
  ev(`Entretien chez ${o.employeur}`, 'illu-travail', `« Parlez-moi de vous. Pourquoi voulez-vous nous rejoindre ? »`, [
    { label: 'Mettre en avant tes résultats' }, { label: 'Rester modeste et sincère' }, { label: 'Négocier le salaire d\'entrée' },
  ], i => {
    const base = 0.3 + J.competence * 0.05 + s.reputation / 300 + (J.perf >= 60 ? 0.1 : 0) + (o.source === 'reseau' ? 0.2 : 0);
    const chance = [base + 0.1, base + 0.05, base - 0.1][i];
    const ok = Math.random() < chance;
    J.offres = J.offres.filter(x => x.id !== id);
    if (!ok) { s.needs.moral = clampv(s.needs.moral - 6, 0, 100); toast(`« Nous vous rappellerons. » Ils n'ont pas rappelé.`, 'bad'); save(); return; }
    const sal = i === 2 ? Math.round(o.salaire * 1.15) : o.salaire;
    J.mult = sal / jobOf().salaire; J.perf = 40; J.collegues = 50; J.chomage = false; J.employeur++; J.avert = 0; J.offres = [];
    s.needs.moral = clampv(s.needs.moral + 15, 0, 100);
    for (const c of collegueDefs(s.milieu)) s.rel[c.id] = Math.min(s.rel[c.id] || 0, 10); // nouvelle équipe, on repart presque de zéro
    hooks.quartierChanged();
    toast(`Embauché(e) chez ${o.employeur} : ${fmtDH(sal)} par semaine. Nouvelle équipe, période d'essai.`, 'good');
    rep(3); save();
  });
}
export function licencier(raison) {
  const s = G.s, J = s.job;
  if (J.chomage) return;
  const indemnite = salaire();
  J.chomage = true; J.mult = 1; J.perf = 40; J.offres = []; J.avert = 0;
  s.money += indemnite;
  s.needs.moral = clampv(s.needs.moral - 20, 0, 100);
  rep(-8, 'ton licenciement'); fam(-5);
  toast(`Licencié(e) ${raison}. Une semaine d'indemnité : ${fmtDH(indemnite)}. Cherche un poste depuis l'onglet Argent.`, 'bad');
  save();
}

// ---------- La paie du vendredi : salaire, prime, retard ----------
export function paie() {
  const s = G.s, J = s.job;
  if (s.affaire) return recetteAffaire();
  if (J.chomage) { J.week = 0; return; }
  if (J.perf <= 5) { licencier('pour résultats insuffisants'); J.week = 0; return; }
  J.week = Math.min(J.week, 5);
  let pay = Math.round(salaire() * J.week / 5);
  if (J.retard) { pay += J.retard; toast(`Le salaire en retard est enfin versé (${fmtDH(J.retard)}).`, 'good'); J.retard = 0; }
  if (pay && s.milieu !== 'aise' && Math.random() < 0.12) { J.retard = pay; J.week = 0; toast(`Pas de salaire ce vendredi : « problème de trésorerie, la semaine prochaine ». Il faut tenir.`, 'bad'); return; }
  if (pay) { s.money += pay; toast(`Salaire de la semaine : +${fmtDH(pay)} (${J.week} jour${J.week > 1 ? 's' : ''} travaillé${J.week > 1 ? 's' : ''}).`, 'good'); }
  else toast('Pas de salaire cette semaine : aucun jour travaillé.', 'bad');
  if (J.week === 5 && J.perf >= 80) { const prime = Math.round(salaire() * 0.3); s.money += prime; toast(`${nomChef()} : « Beau travail cette semaine. » Prime : +${fmtDH(prime)}.`, 'good'); }
  if (J.absences >= 3) { J.avert++; toast(J.avert >= 2 ? '' : `${nomChef()} : « Encore une semaine comme ça et c'est la porte. »`, 'bad'); if (J.avert >= 2) licencier('pour absences répétées'); }
  J.week = 0;
}
// Samedi : un extra au noir, proposé par un collègue (pas chez les aisés).
export function extraNoir() {
  const s = G.s, c = unCollegue();
  if (s.milieu === 'aise' || s.job.chomage || s.affaire || Math.random() > 0.3) return;
  const paie = s.milieu === 'populaire' ? 300 : 450;
  ev(c.nom, 'portrait-' + c.id, `« ${s.milieu === 'populaire' ? 'J\'ai un client qui veut faire réparer sa voiture ce samedi, de la main à la main.' : 'Un ami cherche quelqu\'un pour un dossier ce week-end, sans facture.'} ${fmtDH(paie)} pour toi, et le patron n'a pas besoin de le savoir. »`, [
    { label: `Accepter (4 h, ${fmtDH(paie)})` }, { label: 'Refuser' },
  ], i => {
    if (i === 0) {
      cancelAll();
      s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 240, label: 'Un extra, discrètement', extra: { energie: -10 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw, noir: paie };
      addRelRaw({ id: c.id }, 6);
    } else addRelRaw({ id: c.id }, -3);
    save();
  });
}
export function finExtraNoir(a) {
  const s = G.s;
  s.money += a.noir;
  if (Math.random() < 0.3) { s.job.perf = clampv(s.job.perf - 10, 0, 100); toast(`+${fmtDH(a.noir)}. Mais ${nomChef()} l'a appris. Performance -10.`, 'bad'); }
  else toast(`+${fmtDH(a.noir)}, de la main à la main.`, 'good');
}
// Le pot de départ d'un collègue, au café, un vendredi soir : on y va ou pas.
export function potDepart() {
  const s = G.s;
  if (s.job.chomage || s.affaire || !homeHere() || Math.random() > 0.25) return;
  const c = unCollegue();
  ev('Pot de départ', 'illu-cafe', `${c.nom} fête son anniversaire au café de ton quartier ce soir. Toute l'équipe sera là, ${nomChef()} aussi.`, [
    { label: 'Y aller (2 h, 40 DH)' }, { label: 'Décliner' },
  ], i => {
    if (i === 0) {
      if (s.money < 40) return toast('Tu n\'as même pas de quoi payer ta tournée.', 'bad');
      s.money -= 40;
      cancelAll();
      s.away = { lieu: 'boulot', boulot: null, phases: [{ until: s.t + 120, label: 'Au pot avec les collègues', extra: { social: 16, moral: 8, energie: -4 } }], start: s.t, back: { ...s.pos }, backYaw: G.yaw };
      s.job.collegues = clampv(s.job.collegues + 10, 0, 100);
      for (const k of collegueDefs(s.milieu)) addRelRaw({ id: k.id }, 5);
      toast('Une bonne soirée. L\'équipe t\'apprécie.', 'good');
    } else { s.job.collegues = clampv(s.job.collegues - 6, 0, 100); toast('« Toujours pas là, celui-là. »'); }
    save();
  });
}

// ---------- Monter son affaire ----------
export const AFFAIRES = {
  populaire: [
    { id: 'stand', nom: 'Stand de msemen et de thé', capital: 12000, loyer: 300, base: 1500, desc: 'Un stand au coin de la rue. Petit capital, longues journées, clients du quartier.' },
    { id: 'snack', nom: 'Snack du quartier', capital: 40000, loyer: 900, base: 3400, desc: 'Sandwichs, frites, jus. Il faut tenir le rythme et les fournisseurs.' },
    { id: 'startup', cache: true, nom: 'Start-up de livraison, avec ton associé', capital: 15000, loyer: 400, base: 3200, desc: 'Ton associé met le gros de l\'argent, toi ton temps et ta part. Des scooters, une appli, et des restaurants à convaincre.' },
  ],
  moyen: [
    { id: 'domicile', nom: 'Cours et traiteur à domicile', capital: 4000, loyer: 0, base: 1600, desc: 'On part de chez soi : des élèves, des commandes de plats. Ça dépend de ta réputation.' },
    { id: 'cafe', nom: 'Un café', capital: 90000, loyer: 2000, base: 5500, desc: 'Un vrai commerce, un serveur à payer, et les matchs qui remplissent la salle.' },
    { id: 'startup', cache: true, nom: 'Start-up de livraison, avec ton associé', capital: 25000, loyer: 600, base: 4800, desc: 'Ton associé met le gros de l\'argent, toi ton temps et ta part. Une appli, des livreurs, et des restaurants à convaincre.' },
  ],
  aise: [
    { id: 'agence', nom: 'Agence immobilière', capital: 150000, loyer: 3000, base: 9000, desc: 'Un local à Anfa, du réseau, et des commissions qui peuvent tomber… ou pas.' },
    { id: 'cafe', nom: 'Un café branché', capital: 120000, loyer: 2500, base: 7000, desc: 'Parasols crème, latte à 35 DH. La clientèle d\'Anfa est exigeante.' },
    { id: 'startup', cache: true, nom: 'Start-up de livraison, avec ton associé', capital: 60000, loyer: 1200, base: 9500, desc: 'Ton associé met le gros de l\'argent, toi ton temps et ta part. Une appli, une flotte, et les restaurants d\'Anfa à convaincre.' },
  ],
};
export const affaireDef = () => G.s.affaire && AFFAIRES[G.s.milieu].find(a => a.id === G.s.affaire.id);
export const capitalDe = a => (a.id === 'startup' && G.s.vie && G.s.vie.flags.startupRemise ? Math.round(a.capital * 0.7) : a.capital);
export function ouvrirAffaire(id) {
  const s = G.s, a = AFFAIRES[s.milieu].find(x => x.id === id);
  if (!a || s.affaire) return;
  if (a.cache && !(s.vie && s.vie.flags.startup)) return;
  if (s.money < capitalDe(a)) return toast(`Il faut ${fmtDH(capitalDe(a))} de capital.`, 'bad');
  s.money -= capitalDe(a);
  s.affaire = { id, clientele: 25, jours: 0, caisse: 0, ouvert: -1 };
  s.job.chomage = false; s.job.mult = 1;
  rep(4); s.needs.moral = clampv(s.needs.moral + 15, 0, 100);
  toast(`${a.nom} : c'est ouvert ! Chaque matin, tu choisis d'ouvrir ou non. La recette tombe le vendredi.`, 'good');
  save();
}
export function fermerAffaire() {
  const s = G.s, a = affaireDef();
  if (!a) return;
  const revente = Math.round(a.capital * 0.4);
  s.money += revente; s.affaire = null; s.job.chomage = true;
  toast(`${a.nom} fermé. Revente du matériel : ${fmtDH(revente)}. Te voilà sans emploi.`);
  save();
}
export function journeeAffaire() {
  const s = G.s, a = affaireDef();
  cancelAll();
  s.affaire.ouvert = dayIdx(s.t); s.affaire.jours++;
  const fin = dayIdx(s.t) * 1440 + 19 * 60;
  s.away = { lieu: 'affaire', phases: [{ until: s.t + 25, label: 'En route' }, { until: fin, label: a.nom + ' : ouvert', extra: { energie: -3, social: 2, faim: 2.5 }, evtAt: s.t + 180 }, { until: fin + 25, label: 'Retour' }], start: s.t, evt: false, back: { ...s.pos }, backYaw: G.yaw };
  toast(`${a.nom} ouvre pour la journée.`);
}
export function evenementAffaire() {
  const s = G.s, A = s.affaire, a = affaireDef();
  const E = [
    { t: 'Un client exigeant renvoie son plat (ou son dossier) deux fois.', c: [['Refaire avec le sourire', () => { A.clientele += 3; s.needs.moral -= 3; }], ['Lui dire d\'aller voir ailleurs', () => { A.clientele -= 5; s.needs.moral += 2; rep(-2, 'un client mécontent'); }]] },
    { t: 'Le fournisseur livre en retard et augmente ses prix de 10 %.', c: [['Payer', () => { s.money -= Math.round(a.base * 0.1); }], ['Chercher un autre fournisseur', () => { A.clientele -= 2; s.needs.energie -= 8; }]] },
    { t: 'Un contrôle municipal passe « vérifier les autorisations ». L\'agent attend quelque chose.', c: [['Glisser 200 DH', () => { s.money -= 200; }], ['Montrer les papiers et attendre', () => { if (Math.random() < 0.5) { s.money -= 800; toast('Amende : 800 DH.', 'bad'); } else toast('Il est reparti bredouille.'); }]] },
    { t: 'Un jeune du quartier demande un petit boulot chez toi.', c: [['L\'embaucher (150 DH par semaine)', () => { A.employe = true; rep(4); }], ['Pas les moyens', () => { rep(-1); }]] },
    { t: 'Un concurrent ouvre deux rues plus loin, moins cher.', c: [['Baisser tes prix une semaine', () => { A.clientele += 6; A.promo = true; }], ['Miser sur la qualité', () => { A.clientele -= 3; }]] },
    { t: 'Une journée tranquille. Un habitué te raconte sa vie.', c: [['Écouter', () => { A.clientele += 2; s.needs.social += 8; }], ['Ranger derrière', () => { s.needs.energie -= 2; }]] },
  ];
  const e = pick(E);
  ev(a.nom, 'illu-boulots', e.t, e.c.map(([l]) => ({ label: l })), i => { e.c[i][1](); A.clientele = clampv(A.clientele, 0, 100); for (const k in s.needs) s.needs[k] = clampv(s.needs[k], 0, 100); save(); });
}
export function recetteAffaire() {
  const s = G.s, A = s.affaire, a = affaireDef();
  const plafond = 40 + s.reputation * 0.6;
  A.clientele = clampv(A.clientele, 0, plafond);
  const recette = Math.round(a.base * (0.4 + A.clientele / 100 * 1.2) * (A.jours / 5) * rand(0.85, 1.15) * (A.promo ? 0.8 : 1));
  const frais = a.loyer + (A.employe ? 150 : 0);
  s.money += recette - frais;
  toast(`${a.nom} : recette ${fmtDH(recette)}, frais ${fmtDH(frais)}, soit ${recette - frais >= 0 ? '+' : ''}${fmtDH(recette - frais)}. Clientèle : ${Math.round(A.clientele)} / 100.`, recette - frais >= 0 ? 'good' : 'bad');
  if (A.jours === 0) A.clientele -= 8;
  A.jours = 0; A.promo = false;
  if (s.money < -3000) { s.affaire = null; s.job.chomage = true; rep(-15, 'ta faillite'); s.needs.moral = clampv(s.needs.moral - 25, 0, 100); toast(`Faillite. ${a.nom} ferme ses portes. Les dettes restent.`, 'bad'); }
  save();
}
// Chaque jour fermé coûte un peu de clientèle ; chaque jour ouvert en gagne.
export function jourAffaire(d) {
  const s = G.s, A = s.affaire;
  if (!A) return;
  if (A.ouvert === d) A.clientele = clampv(A.clientele + 1.5, 0, 100);
  else if (d % 7 <= 5) A.clientele = clampv(A.clientele - 2, 0, 100);
}
// Le loyer augmente tous les trois mois.
export function hausseLoyer(d) {
  const s = G.s;
  if (d > 0 && d % 84 === 0 && s.chezMoi !== 'populaire' || (d > 0 && d % 84 === 0 && s.milieu !== 'aise')) { s.loyerMult = Math.round(s.loyerMult * 1.1 * 100) / 100; toast('Le propriétaire augmente le loyer de 10 %. « C\'est partout pareil. »', 'bad'); }
}
export const travailInfo = () => {
  const s = G.s, J = s.job, C = COLLEGUES[s.milieu];
  return { chomage: J.chomage, salaire: salaire(), offres: J.offres, employeur: J.employeur, chef: C.chef, collegues: C.collegues, affaire: affaireDef(), etat: s.affaire };
};
