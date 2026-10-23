// Les objectifs : une liste de petites étapes qui donnent une direction au joueur, avec une récompense à chaque fois.
import { MILIEUX, ANIMAUX } from './data.js';
import { G, hooks, dayIdx, fmtDH, save, clampv, isHome, ambiance } from './sim.js';

const toast = (m, k) => hooks.toast(m, k);
const relMax = s => Math.max(0, ...Object.values(s.rel || {}));
const amourEtape = s => (s.vie && s.vie.amour ? s.vie.amour.etape : 0);
const F = () => G.s.obj.flags;

export const OBJECTIFS = [
  // Les premiers pas
  { id: 'dehors', theme: 'Premiers pas', nom: 'Mettre le nez dehors', desc: 'Sortir de l\'appartement et marcher dans la rue.', check: () => F().dehors, prime: { moral: 4 } },
  { id: 'voisin', theme: 'Premiers pas', nom: 'Faire connaissance', desc: 'Atteindre 20 d\'amitié avec quelqu\'un du quartier.', check: s => relMax(s) >= 20, prime: { moral: 6 } },
  { id: 'cafe', theme: 'Premiers pas', nom: 'Un thé à la terrasse', desc: 'Consommer quelque chose au café.', check: () => F().cafe, prime: { moral: 4 } },
  { id: 'hanout', theme: 'Premiers pas', nom: 'Les courses du coin', desc: 'Acheter quelque chose au hanout ou à l\'épicerie.', check: () => F().hanout, prime: { moral: 4 } },
  { id: 'cuisine1', theme: 'Premiers pas', nom: 'Premier plat', desc: 'Préparer quelque chose à la cuisinière.', check: () => F().cuisine, prime: { moral: 6 } },
  // Le travail
  { id: 'semaine', theme: 'Le travail', nom: 'Une semaine pleine', desc: 'Travailler cinq jours dans la même semaine.', check: () => F().semaine, prime: { money: 200, moral: 6, texte: 'une prime du chef' } },
  { id: 'competence', theme: 'Le travail', nom: 'Savoir-faire', desc: 'Atteindre 3 de compétence.', check: s => s.job.competence >= 3, prime: { moral: 8 } },
  { id: 'promotion', theme: 'Le travail', nom: 'Monter d\'un cran', desc: 'Obtenir une promotion.', check: s => s.job.level >= 1, prime: { moral: 12 } },
  { id: 'affaire', theme: 'Le travail', nom: 'À son compte', desc: 'Ouvrir sa propre affaire.', check: s => !!s.affaire, prime: { moral: 12 } },
  // L'argent
  { id: 'argent', theme: 'L\'argent', nom: 'Un matelas', desc: 'Avoir de côté de quoi tenir plusieurs mois.', check: s => s.money >= { populaire: 10000, moyen: 20000, aise: 100000 }[s.milieu], prime: { moral: 8 } },
  { id: 'epargne', theme: 'L\'argent', nom: 'Les intérêts', desc: 'Placer 5 000 DH sur un compte épargne.', check: s => s.epargne >= 5000, prime: { moral: 6 } },
  { id: 'vehicule', theme: 'L\'argent', nom: 'Sur deux ou quatre roues', desc: 'Acheter un scooter ou une voiture.', check: s => !!s.vehicule, prime: { moral: 8 } },
  // La maison
  { id: 'maison15', theme: 'La maison', nom: 'Un chez-soi', desc: 'Atteindre 15 d\'ambiance à la maison.', check: s => ambiance(s.home) >= 15, prime: { moral: 6 } },
  { id: 'maison25', theme: 'La maison', nom: 'La belle maison', desc: 'Atteindre 25 d\'ambiance à la maison.', check: s => ambiance(s.home) >= 25, prime: { moral: 10 } },
  { id: 'cuisine3', theme: 'La maison', nom: 'Cuisinier(ère) du dimanche', desc: 'Atteindre le niveau 3 en cuisine.', check: s => s.skills.cuisine >= 3, prime: { moral: 8 } },
  { id: 'cuisine6', theme: 'La maison', nom: 'Chef(fe)', desc: 'Atteindre le niveau 6 en cuisine.', check: s => s.skills.cuisine >= 6, prime: { moral: 12 } },
  { id: 'animal', theme: 'La maison', nom: 'Un compagnon', desc: 'Adopter un chien ou un chat du quartier.', check: s => ANIMAUX.some(a => s.animaux[a.id] && s.animaux[a.id].adopte), prime: { moral: 10 } },
  { id: 'independance', theme: 'La maison', nom: 'Voler de ses propres ailes', desc: 'Quitter la maison des parents.', milieux: ['aise'], check: s => !!s.independant, prime: { moral: 12 } },
  // Les gens
  { id: 'ami', theme: 'Les gens', nom: 'Un vrai ami', desc: 'Atteindre 50 d\'amitié avec quelqu\'un.', check: s => relMax(s) >= 50, prime: { moral: 8 } },
  { id: 'amiCher', theme: 'Les gens', nom: 'Comme un frère, comme une sœur', desc: 'Atteindre 80 d\'amitié avec quelqu\'un.', check: s => relMax(s) >= 80, prime: { moral: 12 } },
  { id: 'rep60', theme: 'Les gens', nom: 'Bien vu(e)', desc: 'Atteindre 60 de réputation.', check: s => s.reputation >= 60, prime: { moral: 8 } },
  { id: 'rep80', theme: 'Les gens', nom: 'Respecté(e)', desc: 'Atteindre 80 de réputation.', check: s => s.reputation >= 80, prime: { moral: 12 } },
  { id: 'daret', theme: 'Les gens', nom: 'La daret', desc: 'Entrer dans la daret du quartier.', milieux: ['populaire'], check: s => !!s.daret, prime: { moral: 6 } },
  { id: 'parents', theme: 'Les gens', nom: 'Le thé avec les parents', desc: 'Discuter avec ta mère ou ton père.', milieux: ['aise'], check: () => F().parents, prime: { moral: 6 } },
  // L'amour
  { id: 'numero', theme: 'L\'amour', nom: 'Un numéro', desc: 'Obtenir le numéro de quelqu\'un.', check: s => amourEtape(s) >= 2, prime: { moral: 8 } },
  { id: 'couple', theme: 'L\'amour', nom: 'En couple', desc: 'Former un couple.', check: s => amourEtape(s) >= 4, prime: { moral: 12 } },
  { id: 'mariage', theme: 'L\'amour', nom: 'Le mariage', desc: 'Se marier.', check: s => amourEtape(s) >= 6, prime: { moral: 20 } },
  // La ville
  { id: 'anfa', theme: 'La ville', nom: 'Voir Anfa', desc: 'Aller à Anfa au moins une fois.', check: s => !!s.visites.anfa, prime: { moral: 6 } },
  { id: 'corniche', theme: 'La ville', nom: 'L\'air de la mer', desc: 'Aller à la corniche.', check: s => !!s.visites.corniche, prime: { moral: 6 } },
  { id: 'bain', theme: 'La ville', nom: 'Un bain de mer', desc: 'Se baigner à la plage.', check: () => F().bain, prime: { moral: 8 } },
  { id: 'foot', theme: 'La ville', nom: 'Le match sur le sable', desc: 'Jouer au foot à la plage.', check: () => F().foot, prime: { moral: 8 } },
  { id: 'demenager', theme: 'La ville', nom: 'Changer de vie', desc: 'Déménager dans un autre quartier.', check: s => s.chezMoi !== (s.origine || 'populaire'), prime: { moral: 12 } },
];

export function initObjectifs(s) {
  if (!s.obj) s.obj = { done: {}, flags: {} };
}
// Chaque minute, on note ce que le personnage est en train de faire ; chaque soir, on fait le point.
export function objectifsMinute(T) {
  const s = G.s, c = G.cur, f = s.obj.flags;
  if (!s.away && !isHome()) f.dehors = true;
  if (c && c.stage === 'do') {
    if (c.it.kind === 'cafe') f.cafe = true;
    if (c.it.kind === 'hanout') f.hanout = true;
    if (c.it.kind === 'parent') f.parents = true;
    if (c.it.kind === 'plage' && c.it.act === 'bain') f.bain = true;
    if (c.it.kind === 'plage' && c.it.act === 'foot') f.foot = true;
    if (c.it.act === 'cuisiner') f.cuisine = true;
  }
  if (s.job.week >= 5) f.semaine = true;
  if (T % 1440 === 21 * 60) verifierObjectifs();
}
export function verifierObjectifs(silencieux = false) {
  const s = G.s, d = dayIdx(s.t);
  let n = 0;
  for (const o of OBJECTIFS) {
    if (s.obj.done[o.id] != null || (o.milieux && !o.milieux.includes(s.milieu))) continue;
    let ok = false;
    try { ok = !!o.check(s); } catch { ok = false; }
    if (!ok) continue;
    s.obj.done[o.id] = d; n++;
    const p = o.prime || {};
    if (p.money) s.money += p.money;
    if (p.moral) s.needs.moral = clampv(s.needs.moral + p.moral, 0, 100);
    if (!silencieux) toast(`Objectif atteint : ${o.nom}.${p.money ? ` ${p.texte ? p.texte[0].toUpperCase() + p.texte.slice(1) : 'Récompense'} : +${fmtDH(p.money)}.` : ''}${p.moral ? ` Moral +${p.moral}.` : ''}`, 'good');
  }
  if (n) save();
  return n;
}
export const objectifsInfo = () => {
  const s = G.s;
  return OBJECTIFS.filter(o => !o.milieux || o.milieux.includes(s.milieu)).map(o => ({ ...o, fait: s.obj.done[o.id] != null }));
};
