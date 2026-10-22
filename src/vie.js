// Les choix de vie : les petites histoires du quotidien selon l'endroit où l'on est, les étiquettes qu'elles
// collent au personnage, les suites qui reviennent des jours plus tard, et l'amour, de la rencontre au mariage.
import { MILIEUX } from './data.js';
import { G, hooks, dayIdx, dow, hour, fmtDH, save, clampv, getNpc, relOf, addRelRaw, jobOf, milieu, vehicule, homeHere, isHome, cancelAll, refreshNpcs } from './sim.js';
import { rep, fam } from './social.js';
import { licencier, nouvelleOffre, AFFAIRES } from './travail.js';
import { ferie } from './fetes.js';
import { spotSit, spotCook } from './parents.js';

const toast = (m, k) => hooks.toast(m, k);
const pick = a => a[Math.floor(Math.random() * a.length)];
const nm = () => G.s.char.name;
const V = () => G.s.vie;
const has = t => G.s.char.traits.includes(t);
const tagN = k => (V().tags[k] || 0);
const d0 = () => dayIdx(G.s.t);

// ---------- Les étiquettes ----------
export const TAGS = {
  genereux: 'Généreux(se)', radin: 'Radin(e)', fiable: 'Fiable', tchatcheur: 'Beau parleur', bagarreur: 'Bagarreur(se)',
  debrouillard: 'Débrouillard(e)', naif: 'Naïf(ve)', ambitieux: 'Ambitieux(se)', famille: 'Proche de sa famille',
};
export const etiquettes = () => Object.entries(V().tags).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => TAGS[k]);
function tag(k, n = 1) {
  const t = V().tags, before = t[k] || 0;
  t[k] = Math.max(0, before + n);
  if (before < 2 && t[k] >= 2) toast(`Dans le quartier, on commence à te trouver ${TAGS[k].toLowerCase()}.`);
}

// ---------- L'amour ----------
export const ETAPES = ['', 'Une rencontre', 'Numéro échangé', 'On se voit', 'En couple', 'Fiancé(e)s', 'Marié(e)s'];
const CANDIDATS = {
  rue: [
    { id: 'salma', nom: 'Salma', genre: 'f', desc: 'Institutrice au quartier, elle passe au café après l\'école.', look: { skin: '#d19e78', hair: 'attachee', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#5b3d6e' }, lignes: ['Mes élèves m\'ont encore fait une surprise. Une grenouille, cette fois.', 'Le soir, le quartier est plus doux. Tu ne trouves pas ?', 'Tu lis, toi ? Je te prêterai quelque chose.', 'Ma mère demande déjà qui tu es.'] },
    { id: 'reda', nom: 'Réda', genre: 'm', desc: 'Il tient la pharmacie à deux rues d\'ici.', look: { skin: '#b07a55', hair: 'courte', hairColor: '#1d1714', outfit: 'costume', outfitColor: '#2f4f7a' }, lignes: ['Tout le quartier me raconte ses maladies. Et ses secrets.', 'Je ferme à 21 h. Après, je suis libre.', 'Tu as une bonne mine aujourd\'hui. Je m\'y connais.', 'Mon père voudrait que je reprenne sa pharmacie à Fès. Je préfère ici.'] },
  ],
  cafe: [
    { id: 'salma', nom: 'Salma', genre: 'f', desc: 'Institutrice au quartier, elle passe au café après l\'école.', look: { skin: '#d19e78', hair: 'attachee', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#5b3d6e' }, lignes: ['Mes élèves m\'ont encore fait une surprise. Une grenouille, cette fois.', 'Le soir, le quartier est plus doux. Tu ne trouves pas ?', 'Tu lis, toi ? Je te prêterai quelque chose.', 'Ma mère demande déjà qui tu es.'] },
    { id: 'reda', nom: 'Réda', genre: 'm', desc: 'Il tient la pharmacie à deux rues d\'ici.', look: { skin: '#b07a55', hair: 'courte', hairColor: '#1d1714', outfit: 'costume', outfitColor: '#2f4f7a' }, lignes: ['Tout le quartier me raconte ses maladies. Et ses secrets.', 'Je ferme à 21 h. Après, je suis libre.', 'Tu as une bonne mine aujourd\'hui. Je m\'y connais.', 'Mon père voudrait que je reprenne sa pharmacie à Fès. Je préfère ici.'] },
  ],
  anfa: [
    { id: 'lina', nom: 'Lina', genre: 'f', desc: 'Architecte, une amie de Sofia. Elle rit fort et conduit vite.', look: { skin: '#e6b994', hair: 'longue', hairColor: '#3b2618', outfit: 'jean', outfitColor: '#3a3a3a' }, lignes: ['J\'ai dessiné la villa d\'en face. Le propriétaire a tout changé.', 'Un jour, je construirai une maison avec vue sur l\'océan. La mienne.', 'Sofia parle trop. Mais elle a bon goût en amis.', 'Tu veux voir le chantier ? Mets des chaussures fermées.'] },
    { id: 'adam', nom: 'Adam', genre: 'm', desc: 'Il travaille à la banque de son père et rêve d\'autre chose.', look: { skin: '#d19e78', hair: 'courte', hairColor: '#1d1714', outfit: 'costume', outfitColor: '#3a3a3a' }, lignes: ['Les chiffres, toute la journée. Le soir, je joue de la guitare.', 'Mon père a un plan pour moi. Je n\'en suis pas sûr.', 'La corniche à 6 h du matin, c\'est le seul moment où elle est à nous.', 'Tu es différent(e) des gens d\'ici. C\'est un compliment.'] },
  ],
  plage: [
    { id: 'nour', nom: 'Nour', genre: 'f', desc: 'Elle court sur la corniche tous les soirs, même l\'hiver.', look: { skin: '#b07a55', hair: 'attachee', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#2e6b57' }, lignes: ['Dix kilomètres ce matin. Tu viens demain ?', 'La mer en hiver, c\'est là qu\'elle est belle.', 'Je suis infirmière. Les gens croient que je ne dors jamais. Ils ont raison.', 'Tu as déjà vu le phare s\'allumer ? Reste jusqu\'au soir.'] },
    { id: 'ayoub', nom: 'Ayoub', genre: 'm', desc: 'Il joue au foot sur le sable le dimanche et répare des bateaux la semaine.', look: { skin: '#8a5a3c', hair: 'courte', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#c99a3a' }, lignes: ['Un bateau, c\'est comme une personne : il faut l\'écouter.', 'Dimanche, on joue contre ceux de Sidi Abderrahmane. Viens nous voir.', 'Mon grand-père pêchait ici quand il n\'y avait pas de corniche.', 'Je ne suis pas riche, mais la mer est à moi.'] },
  ],
};
const MARIAGE_COUT = { populaire: 25000, moyen: 60000, aise: 150000 };
const A = () => V().amour;
const il = a => (a.genre === 'f' ? 'elle' : 'il');
const e = a => (a.genre === 'f' ? 'e' : '');
export const coutMariage = () => { const s = G.s, total = MARIAGE_COUT[s.milieu], part = s.famille >= 60 ? 0.5 : s.famille >= 40 ? 0.75 : 1; return { total, toi: Math.round(total * part), famille: Math.round(total * (1 - part)) }; };
function amourScore(v) { const a = A(); if (!a) return; a.score = clampv(a.score + v, 0, 100); }

// ---------- Le catalogue des histoires ----------
// lieu : où ça peut arriver. cond : quand. Chaque choix a des effets (eff) et parfois une suite différée (apres : { id, jours }).
const EV = [
  // Argent et débrouille
  { id: 'pret_voisin', lieu: ['rue', 'cafe'], q: ['populaire'], poids: 2, titre: 'Un service', img: 'illu-cafe',
    cond: () => relOf('omar') >= 10,
    texte: 'Omar te prend à part : « J\'ai besoin de 200 DH jusqu\'à vendredi, c\'est pour ma mère. Tu me connais. »', choix: [
      { label: 'Prêter 200 DH', cond: s => s.money >= 200, eff: { money: -200, rel: { omar: 8 }, tags: { genereux: 1 } }, suite: 'Il te serre la main deux fois. On verra vendredi.', apres: { id: 'pret_retour', jours: 5 } },
      { label: 'Prêter 100 DH, pas plus', cond: s => s.money >= 100, eff: { money: -100, rel: { omar: 3 } }, suite: '« C\'est déjà ça, merci. »', apres: { id: 'pret_retour', jours: 5, data: { somme: 100 } } },
      { label: 'Refuser', eff: { rel: { omar: -6 }, tags: { radin: 1 } }, suite: 'Il n\'insiste pas. Il ne te regarde plus tout à fait pareil.' },
    ] },
  { id: 'pret_retour', suite: true, lieu: ['rue', 'cafe', 'maison'], titre: 'Vendredi, comme promis ?', img: 'illu-cafe',
    texte: (d) => `Omar devait te rendre ${fmtDH(d.somme || 200)}. Tu le croises.`, choix: [
      { label: 'Lui demander gentiment', chance: () => 0.4 + relOf('omar') / 150 + tagN('fiable') * 0.05, ok: { moneyData: 'somme', rel: { omar: 5 }, rep: 2 }, suiteOk: 'Il sort les billets en s\'excusant du retard. Tout le quartier a vu que tu es réglo, et lui aussi.', ko: { rel: { omar: -2 } }, suiteKo: '« La semaine prochaine, promis. » Tu n\'y crois qu\'à moitié.', apresKo: { id: 'pret_perdu', jours: 7 } },
      { label: 'Ne rien dire', eff: { tags: { genereux: 1 }, rel: { omar: 2 } }, suite: 'Tu laisses couler. Il s\'en souviendra, en bien.' },
      { label: 'Hausser le ton devant tout le monde', eff: { rel: { omar: -12 }, rep: -3, tags: { bagarreur: 1 } }, suite: 'Il te rend 100 DH en pestant. La terrasse a tout entendu.' },
    ] },
  { id: 'pret_perdu', suite: true, lieu: ['rue', 'cafe', 'maison'], titre: 'L\'argent ne reviendra pas', img: 'illu-cafe',
    texte: 'Omar t\'évite depuis une semaine. Tu comprends que l\'argent ne reviendra pas.', choix: [
      { label: 'Tourner la page', eff: { moral: -4, tags: { naif: 1 } }, suite: 'Leçon apprise. Pas chère, finalement.' },
      { label: 'En parler à Si Driss', eff: { rel: { driss: 4 }, rel2: { omar: -5 }, rep: 1 }, suite: 'Si Driss secoue la tête : « Je lui dirai deux mots. » Omar te rendra la moitié, un jour.' },
    ] },
  { id: 'telephone', max: 2, lieu: ['rue'], poids: 2, titre: 'Une occasion', img: 'illu-marche',
    cond: s => s.money >= 600 && hour(s.t) >= 11,
    texte: 'Un type que tu ne connais pas te propose un téléphone neuf, encore dans sa boîte, pour 600 DH. « Vite, j\'ai pas toute la journée. »', choix: [
      { label: 'Acheter', chance: () => 0.5 - tagN('naif') * 0.1, ok: { money: -600, moral: 10, tags: { debrouillard: 1 } }, suiteOk: 'Il marche parfaitement. Une vraie affaire.', ko: { money: -600, rep: -6, tags: { naif: 1 } }, suiteKo: 'Il était volé. La police le récupère chez toi deux jours plus tard, et le quartier l\'apprend.' },
      { label: 'Passer ton chemin', eff: {}, suite: 'Il disparaît au coin de la rue.' },
      { label: 'Prévenir Hamid au café', eff: { rep: 3, tags: { fiable: 1 } }, suite: 'Hamid fait passer le mot. Le type ne reviendra pas dans la rue.' },
    ] },
  { id: 'controle', lieu: ['rue', 'anfa'], poids: 2, titre: 'Contrôle de police', img: 'icone-voiture',
    cond: s => !!s.vehicule,
    texte: 'Un policier t\'arrête : « Papiers, assurance. » Il trouve une ligne qui ne lui plaît pas. Amende : 300 DH.', choix: [
      { label: 'Payer l\'amende', cond: s => s.money >= 300, eff: { money: -300, moral: -4 }, suite: 'Tu paies, tu repars. Dans les règles.' },
      { label: '« On peut s\'arranger ? » (100 DH)', cond: s => s.money >= 100, chance: () => 0.7, ok: { money: -100, tags: { debrouillard: 1 } }, suiteOk: 'Il glisse le billet, te rend tes papiers. « Bonne route. »', ko: { money: -700, rep: -5, tags: { naif: 1 } }, suiteKo: 'Mauvais jour, mauvais policier : amende doublée pour tentative de corruption.' },
      { label: 'Contester', chance: () => 0.3 + tagN('tchatcheur') * 0.15, ok: { moral: 6, tags: { tchatcheur: 1 } }, suiteOk: 'Tu t\'expliques calmement. Il soupire et te laisse partir.', ko: { money: -300, energie: -10 }, suiteKo: 'Une heure au commissariat, et l\'amende quand même.' },
    ] },
  { id: 'mendiant', lieu: ['rue'], poids: 1, titre: 'Devant la mosquée', img: 'illu-cafe',
    cond: s => dow(s.t) === 4 && hour(s.t) >= 12 && hour(s.t) < 15,
    texte: 'Une vieille femme tend la main à la sortie de la prière du vendredi.', choix: [
      { label: 'Donner 20 DH', cond: s => s.money >= 20, eff: { money: -20, moral: 4, rep: 2, tags: { genereux: 1 } }, suite: '« Que Dieu te garde. » Plusieurs voisins t\'ont vu.' },
      { label: 'Donner 5 DH', eff: { money: -5, moral: 1 }, suite: 'Un geste, c\'est déjà ça.' },
      { label: 'Passer', eff: { tags: { radin: 1 } }, suite: 'Tu regardes ailleurs.' },
    ] },
  { id: 'camion', max: 2, lieu: ['cafe'], q: ['populaire'], poids: 1, titre: 'Tombé du camion', img: 'illu-cafe',
    cond: s => s.money >= 1000 && hour(s.t) >= 18,
    texte: 'Un habitué te propose à voix basse : « Des cartons de chaussures, tombés du camion. Tu mets 1 000 DH, tu en ressors 1 800 la semaine prochaine. »', choix: [
      { label: 'Mettre 1 000 DH', eff: { money: -1000, tags: { debrouillard: 1 } }, suite: 'Rendez-vous la semaine prochaine.', apres: { id: 'camion_retour', jours: 6 } },
      { label: 'Non merci', eff: { tags: { fiable: 1 } }, suite: '« Comme tu veux. » Tu dors tranquille.' },
    ] },
  { id: 'camion_retour', suite: true, lieu: ['cafe', 'rue', 'maison'], titre: 'Les cartons', img: 'illu-cafe',
    texte: 'Une semaine est passée. Des nouvelles des cartons de chaussures ?', choix: [
      { label: 'Voir ce que ça donne', chance: () => 0.6, ok: { money: 1800, moral: 10 }, suiteOk: 'Tout est parti. Il te tend une enveloppe : 1 800 DH.', ko: { rep: -10, moral: -10, tags: { naif: 1 } }, suiteKo: 'La police est passée. Les cartons ont été saisis, ton nom a été prononcé. Ton argent est perdu.' },
    ] },
  { id: 'facture', lieu: ['maison'], poids: 1, titre: 'La facture', img: 'icone-demenagement',
    cond: s => dow(s.t) === 0,
    texte: 'La facture d\'électricité est de 250 DH plus élevée que d\'habitude. Une erreur, sûrement.', choix: [
      { label: 'Aller contester à l\'agence (une matinée)', chance: () => 0.6 + tagN('tchatcheur') * 0.1, ok: { money: 250, energie: -10, tags: { debrouillard: 1 } }, suiteOk: 'Après deux heures de file, ils reconnaissent l\'erreur. Remboursé.', ko: { energie: -12, moral: -6 }, suiteKo: '« Le compteur a raison, madame, monsieur. » Tu paies, fatigué(e).' },
      { label: 'Payer sans discuter', eff: { money: -250 }, suite: 'Pas le temps pour ça.' },
    ] },
  // Le regard des autres
  { id: 'tenue', lieu: ['rue'], q: ['populaire'], poids: 1, titre: 'Lalla Khadija', img: 'portrait-khadija',
    cond: s => (s.vehicule || s.char.outfit === 'costume') && relOf('khadija') >= 5,
    texte: 'Lalla Khadija, de son balcon : « Dis donc, on ne te reconnaît plus. Ça gagne bien, là où tu travailles ? »', choix: [
      { label: 'Jouer la modestie', eff: { rep: 3, rel: { khadija: 4 } }, suite: '« C\'est la grâce de Dieu, Lalla. » Elle hoche la tête, satisfaite.' },
      { label: 'Assumer', eff: { moral: 5, rep: -2, tags: { ambitieux: 1 } }, suite: '« On travaille, Lalla, on travaille. » Elle en parlera à tout l\'immeuble.' },
    ] },
  { id: 'rumeur', lieu: ['cafe'], poids: 2, titre: 'Ça se dit', img: 'illu-cafe',
    cond: s => relOf('hamid') >= 5 || relOf('rachid') >= 5,
    texte: () => `À la terrasse, on parle de toi : ${A() ? `on t'aurait vu(e) avec ${A().nom}` : 'on t\'aurait vu(e) à Anfa, à faire le fier ou la fière'}.`, choix: [
      { label: 'En rire', eff: { social: 4, rep: 1 }, suite: 'Tu ris avec eux. Le sujet passe.' },
      { label: 'Mettre les choses au clair', eff: { rep: 3, tags: { fiable: 1 } }, suite: 'Tu expliques calmement. Ceux qui comptent te croient.' },
      { label: 'T\'énerver', eff: { rep: -5, moral: -4, tags: { bagarreur: 1 } }, suite: 'Tu hausses le ton. Ça ne fait qu\'alimenter la rumeur.' },
    ] },
  { id: 'gardien', lieu: ['anfa'], poids: 2, titre: 'Le gardien', img: 'illu-californie',
    cond: s => s.milieu !== 'aise' && s.chezMoi !== 'anfa',
    texte: 'Un gardien de villa te dévisage : « Tu cherches quelque chose, ici ? »', choix: [
      { label: 'Répondre calmement', eff: { rep: 1 }, suite: '« Je me promène, comme tout le monde. » Il te laisse passer.' },
      { label: 'Répliquer sèchement', eff: { rep: -3, moral: 2, tags: { bagarreur: 1 } }, suite: '« Et toi, tu gardes quoi ? » Il note ton visage.' },
      { label: 'Citer Haj Abdellah', cond: () => relOf('haj') >= 25, eff: { rel: { haj: 2 }, moral: 4, tags: { tchatcheur: 1 } }, suite: '« Ah, l\'ami du Haj. » Le ton change tout de suite.' },
    ] },
  { id: 'bruit', lieu: ['maison'], poids: 1, titre: 'Le voisin du dessous', img: 'portrait-khadija',
    cond: s => hour(s.t) >= 21 && s.chezMoi === 'populaire',
    texte: 'On frappe. Le voisin du dessous : « La télé, le bruit, les chaises… il y a des gens qui travaillent demain. »', choix: [
      { label: 'S\'excuser et baisser', eff: { rep: 2, rel: { khadija: 2 } }, suite: 'Il repart apaisé.' },
      { label: 'L\'envoyer promener', eff: { rep: -4, tags: { bagarreur: 1 } }, suite: 'Il claque la porte. L\'immeuble en parlera.' },
    ] },
  { id: 'vlog', lieu: ['anfa'], poids: 2, titre: 'Sofia filme', img: 'portrait-sofia',
    cond: () => relOf('sofia') >= 15,
    texte: 'Sofia te colle son téléphone sous le nez : « Dis un mot pour mes abonnés ! La vraie vie de Casa ! »', choix: [
      { label: 'Jouer le jeu', eff: { social: 8, rel: { sofia: 8 } }, suite: 'Trois prises. Elle est ravie. Elle postera ce soir.', apres: { id: 'vlog_vu', jours: 2 } },
      { label: 'Décliner', eff: { rel: { sofia: -4 } }, suite: '« Oh, dommage. » Elle filme déjà quelqu\'un d\'autre.' },
    ] },
  { id: 'vlog_vu', suite: true, lieu: ['rue', 'cafe', 'maison'], titre: 'La vidéo', img: 'portrait-sofia',
    texte: 'La vidéo de Sofia a tourné. Au quartier, tout le monde l\'a vue.', choix: [
      { label: 'Voir ce qu\'on en dit', chance: s => (s.milieu === 'populaire' ? 0.4 : 0.7), ok: { rep: 4, social: 6 }, suiteOk: '« Tu es une star ! » Les jeunes du café te saluent de loin.', ko: { rep: -5, moral: -4 }, suiteKo: '« Il se prend pour qui ? » Les anciens n\'ont pas aimé te voir faire le malin à Anfa.' },
    ] },
  // La famille
  { id: 'cousin_mariage', lieu: ['maison'], poids: 1, titre: 'Un mariage dans la famille', img: 'illu-cafe',
    cond: s => dow(s.t) === 6,
    texte: 'Ta mère appelle : ton cousin se marie le mois prochain. « Toute la famille participe. Toi aussi, j\'espère. »', choix: [
      { label: 'Donner 500 DH', cond: s => s.money >= 500, eff: { money: -500, fam: 8, tags: { famille: 1 } }, suite: '« Je savais que je pouvais compter sur toi. »' },
      { label: 'Donner 200 DH', cond: s => s.money >= 200, eff: { money: -200, fam: 2 }, suite: '« C\'est bien. » Un silence, puis elle parle d\'autre chose.' },
      { label: 'Ne rien donner', eff: { fam: -10, moral: -3 }, suite: '« Tu as changé. » Elle raccroche vite.' },
    ] },
  { id: 'mere_malade', max: 2, lieu: ['maison', 'rue'], poids: 1, titre: 'Ta mère', img: 'illu-cafe',
    cond: s => s.famille >= 20 && dow(s.t) <= 3,
    texte: 'Ton frère appelle : ta mère est à l\'hôpital, rien de grave, mais elle demande après toi.', choix: [
      { label: 'Y aller demain, tant pis pour le travail', eff: { fam: 14, perf: -10, energie: -8, tags: { famille: 1 } }, suite: 'Tu passes la journée à son chevet. Elle te tient la main. Le chef, lui, a noté ton absence.' },
      { label: 'Envoyer 400 DH pour les frais', cond: s => s.money >= 400, eff: { money: -400, fam: 5 }, suite: '« C\'est gentil. Elle aurait préféré te voir. »' },
      { label: '« Pas le temps cette semaine »', eff: { fam: -15, moral: -8 }, suite: 'Ton frère ne répond pas. Tu dors mal.' },
    ] },
  { id: 'cousin_heberger', max: 2, lieu: ['maison'], q: ['populaire', 'moyen'], poids: 1, titre: 'Un cousin du bled', img: 'illu-cafe',
    cond: s => s.famille >= 30,
    texte: 'Un cousin arrive de Beni Mellal pour des démarches. « Juste une semaine, je dors sur le canapé. »', choix: [
      { label: 'L\'héberger', eff: { fam: 10, social: 6, hygiene: -8, energie: -6, tags: { famille: 1 } }, suite: 'Il ronfle, il mange, il raconte le bled. La semaine sera longue, mais ta mère est fière.', apres: { id: 'cousin_part', jours: 7 } },
      { label: 'Refuser, l\'appartement est trop petit', eff: { fam: -8 }, suite: '« Je comprends. » Il ne comprend pas.' },
    ] },
  { id: 'cousin_part', suite: true, lieu: ['maison'], titre: 'Le cousin repart', img: 'illu-cafe',
    texte: 'Le cousin a fini ses démarches et prend le car ce soir.', choix: [
      { label: 'L\'accompagner à la gare', chance: () => 0.8, ok: { moral: 6, fam: 4, inv: { msemen: 3 } }, suiteOk: 'Il te laisse un sac de msemen de sa mère et une promesse : « Chez nous, c\'est chez toi. »', ko: { money: -300, moral: -8, fam: -4 }, suiteKo: 'Une fois parti, tu remarques que 300 DH manquent dans le tiroir. Tu ne diras rien à ta mère.' },
    ] },
  { id: 'pere_reunion', lieu: ['maison'], q: ['aise'], poids: 2, titre: 'Ton père', img: 'portrait-c_pere',
    cond: s => dow(s.t) === 5,
    texte: 'Ton père : « Demain midi, réunion de famille sur l\'avenir de l\'entreprise. Je compte sur ta présence. »', choix: [
      { label: 'Y aller', eff: { fam: 8, perf: 6, social: 4, tags: { famille: 1 } }, suite: 'Trois heures de chiffres et de reproches à ton oncle. Mais ton père t\'a présenté(e) comme la relève.' },
      { label: 'Trouver une excuse', eff: { fam: -10, moral: 4 }, suite: 'Tu passes le dimanche à la plage. Ton père ne t\'appellera pas cette semaine.' },
    ] },
  // Le travail et les opportunités
  { id: 'investisseur', max: 1, lieu: ['cafe', 'anfa'], poids: 1, titre: 'Une discussion qui compte', img: 'illu-californie',
    cond: s => !s.affaire && !V().flags.startup && (tagN('tchatcheur') >= 1 || s.job.competence >= 2 || relOf('karim') >= 25 || relOf('haj') >= 30),
    texte: 'Un homme d\'une quarantaine d\'années a écouté la discussion. Il te tend sa carte : « Tu as les idées claires. J\'ai un projet d\'application de livraison. Il me manque quelqu\'un comme toi. »', choix: [
      { label: 'Prendre sa carte et le rappeler', eff: { moral: 6, tags: { ambitieux: 1 } }, suite: 'Rendez-vous dans quelques jours pour en parler sérieusement.', apres: { id: 'startup', jours: 3 } },
      { label: 'Rester prudent(e)', eff: {}, suite: 'Tu gardes la carte dans la poche. Peut-être une autre fois.' },
    ] },
  { id: 'startup', suite: true, lieu: ['cafe', 'anfa', 'maison'], titre: 'Le projet', img: 'illu-californie',
    texte: () => `Il te propose d'être associé(e) : il met l'argent, tu mets ${fmtDH(AFFAIRES[G.s.milieu].find(a => a.id === 'startup').capital)} et ton temps. « On lance dans un mois. »`, choix: [
      { label: 'Accepter : ouvrir la start-up (depuis l\'onglet Argent)', eff: { flag: { startup: true }, moral: 8, tags: { ambitieux: 1 } }, suite: 'La start-up apparaît dans l\'onglet Argent, section Monter son affaire. À toi de réunir le capital.' },
      { label: 'Négocier une part plus petite', chance: () => 0.4 + tagN('tchatcheur') * 0.15, ok: { flag: { startup: true, startupRemise: true }, moral: 6, tags: { tchatcheur: 1 } }, suiteOk: 'Il accepte : tu mets 30 % de moins. La start-up apparaît dans l\'onglet Argent.', ko: { moral: -4 }, suiteKo: '« Alors ce n\'est pas toi qu\'il me faut. » Il range sa carte.' },
      { label: 'Refuser', eff: {}, suite: 'Trop risqué pour toi, pour l\'instant.' },
    ] },
  { id: 'presenter', max: 2, lieu: ['cafe', 'anfa', 'plage'], poids: 1, titre: 'Un coup de pouce', img: 'illu-travail',
    cond: s => !s.affaire && (relOf('karim') >= 40 || relOf('yassine') >= 40 || relOf('imane') >= 35),
    texte: () => { const who = relOf('karim') >= 40 ? 'Karim' : relOf('yassine') >= 40 ? 'Yassine' : 'Imane'; return `${who} : « Mon père cherche quelqu'un de confiance pour son entreprise. Je lui ai parlé de toi. Il veut te voir. »`; }, choix: [
      { label: 'Accepter de le rencontrer', eff: { moral: 5, tags: { ambitieux: 1 } }, suite: 'Rendez-vous est pris pour la semaine prochaine.', apres: { id: 'offre_pere', jours: 4 } },
      { label: 'Décliner, tu es bien où tu es', eff: { moral: 2 }, suite: '« Comme tu veux. Mais réfléchis. »' },
    ] },
  { id: 'offre_pere', suite: true, lieu: ['cafe', 'anfa', 'maison', 'rue', 'plage'], titre: 'Le rendez-vous', img: 'illu-travail',
    texte: 'Un bureau, un homme en costume, un café servi par une assistante. « Mon fils dit du bien de vous. Parlez-moi de vous. »', choix: [
      { label: 'Parler de ton travail, sans en rajouter', chance: s => 0.5 + s.job.competence * 0.05 + tagN('fiable') * 0.1, ok: { offre: 1.5, moral: 8 }, suiteOk: 'Il hoche la tête. « Mon assistante vous enverra une proposition. » Elle est dans l\'onglet Argent.', ko: { moral: -5 }, suiteKo: '« Nous vous recontacterons. » Ils ne recontacteront pas.' },
      { label: 'Promettre monts et merveilles', chance: () => 0.35 + tagN('tchatcheur') * 0.15, ok: { offre: 1.7, moral: 8, tags: { tchatcheur: 1 } }, suiteOk: 'Il a l\'air séduit. Une proposition arrive dans l\'onglet Argent, généreuse.', ko: { moral: -6, tags: { tchatcheur: 1 } }, suiteKo: 'Il a vu clair dans ton jeu. « Merci d\'être passé(e). »' },
    ] },
  { id: 'recruteur', lieu: ['plage'], poids: 1, titre: 'Sur le sable', img: 'illu-plage',
    cond: () => true,
    texte: 'Un entraîneur t\'a vu(e) jouer : « Dimanche prochain, tournoi de la corniche. Il me manque un joueur. »', choix: [
      { label: 'Dire oui', eff: { social: 6, moral: 6 }, suite: 'Rendez-vous dimanche, à 10 h, sur le sable.', apres: { id: 'tournoi', jours: 7 } },
      { label: 'Décliner', eff: {}, suite: '« Dommage, tu as un bon pied gauche. »' },
    ] },
  { id: 'tournoi', suite: true, lieu: ['plage', 'rue', 'cafe', 'maison'], titre: 'Le tournoi', img: 'illu-plage',
    texte: 'Le tournoi de la corniche. Six équipes, un trophée en plastique et 1 000 DH pour les gagnants.', choix: [
      { label: 'Tout donner', chance: s => 0.3 + (s.needs.energie > 60 ? 0.2 : 0), ok: { money: 1000, moral: 15, social: 10, rep: 4 }, suiteOk: 'Finale gagnée aux tirs au but. Ta part : 1 000 DH, et ton nom sur la corniche.', ko: { moral: 4, social: 8, energie: -20, hygiene: -15 }, suiteKo: 'Éliminés en demi-finale. Du sable partout, mais quelle journée.' },
    ] },
  // Le quotidien, tout simplement
  { id: 'sucre', lieu: ['maison'], q: ['populaire', 'moyen'], poids: 2, titre: 'La voisine', img: 'portrait-khadija',
    cond: s => hour(s.t) < 21,
    texte: 'Lalla Khadija frappe : « Tu aurais du sucre ? Et tant qu\'à faire, tu m\'aides à monter mes courses ? »', choix: [
      { label: 'Monter les courses', eff: { energie: -5, rel: { khadija: 6 }, rep: 2, tags: { genereux: 1 } }, suite: 'Quatre étages. Elle te glisse un sachet de chebakia en remerciement.' },
      { label: 'Donner le sucre, pas plus', eff: { rel: { khadija: 2 } }, suite: '« Merci, mon fils, ma fille. » Elle montera seule.' },
      { label: 'Faire semblant de ne pas être là', eff: { rel: { khadija: -5 }, tags: { radin: 1 } }, suite: 'Elle a entendu la télé. Elle sait.' },
    ] },
  { id: 'eau', max: 2, lieu: ['maison'], q: ['populaire'], poids: 1, titre: 'Coupure d\'eau', img: 'illu-hammam',
    cond: () => true,
    texte: 'Plus d\'eau dans tout l\'immeuble. « Jusqu\'à ce soir », dit le gardien.', choix: [
      { label: 'Aller remplir des bidons à la fontaine', eff: { energie: -8, social: 5, hygiene: 4, tags: { debrouillard: 1 } }, suite: 'La file à la fontaine, c\'est aussi le journal du quartier. Tu rentres avec de l\'eau et des nouvelles.' },
      { label: 'Attendre', eff: { hygiene: -10, moral: -3 }, suite: 'L\'eau revient à minuit. Douche froide.' },
    ] },
  { id: 'frigo', max: 2, lieu: ['maison'], poids: 1, titre: 'Le frigo', img: 'illu-marche',
    cond: s => s.money >= 400,
    texte: 'Le frigo fait un bruit bizarre, puis plus rien. Tout va fondre.', choix: [
      { label: 'Appeler un réparateur (400 DH)', eff: { money: -400 }, suite: 'Un compresseur, deux heures, et ça repart.' },
      { label: 'Demander à Brahim, le mécano, de jeter un œil', cond: s => s.milieu === 'populaire', chance: () => 0.6 + relOf('c_brahim') / 200, ok: { money: -100, rel: { c_brahim: 5 }, tags: { debrouillard: 1 } }, suiteOk: 'Cent dirhams et un thé. « Les frigos, c\'est comme les moteurs. »', ko: { money: -100, inv: { tajine: -1, msemen: -1 } }, suiteKo: 'Il a essayé. Le frigo est mort, et tes provisions avec.' },
      { label: 'Laisser tomber pour l\'instant', eff: { inv: { tajine: -1, msemen: -1 }, moral: -4 }, suite: 'Les provisions sont perdues. Il faudra bien le réparer un jour.' },
    ] },
  { id: 'match_voisins', lieu: ['maison'], q: ['populaire', 'moyen'], poids: 2, titre: 'Le match', img: 'illu-cafe',
    cond: s => hour(s.t) >= 19 && hour(s.t) < 22,
    texte: 'Yassine crie depuis la rue : « Le match commence au café ! Tu descends ? »', choix: [
      { label: 'Descendre (thé 10 DH)', cond: s => s.money >= 10, eff: { money: -10, social: 12, moral: 8, energie: -5, rel: { yassine: 5 } }, suite: 'Quatre-vingt-dix minutes de cris, un but à la dernière minute, des voisins debout sur les chaises.' },
      { label: 'Rester devant ta télé', eff: { moral: 3 }, suite: 'Tu entends le but depuis chez toi. Tout le quartier a crié.' },
    ] },
  { id: 'colis', lieu: ['maison'], q: ['moyen', 'aise'], poids: 1, titre: 'Un colis', img: 'icone-demenagement',
    cond: () => true,
    texte: 'Le livreur sonne, en sueur, avec ton colis. « Quatrième sans ascenseur, patron… »', choix: [
      { label: 'Lui donner 20 DH', eff: { money: -20, rep: 1, tags: { genereux: 1 } }, suite: '« Que Dieu te le rende. »' },
      { label: 'Merci, au revoir', eff: {}, suite: 'Il repart sans un mot.' },
    ] },
  { id: 'ballon', lieu: ['rue'], poids: 2, titre: 'Un carreau cassé', img: 'illu-cafe',
    cond: s => hour(s.t) >= 15,
    texte: 'Un ballon, un carreau en morceaux, trois gamins qui courent. Le propriétaire sort et te désigne : « C\'est toi qui les laisses jouer là ! »', choix: [
      { label: 'Payer le carreau (150 DH) pour calmer tout le monde', cond: s => s.money >= 150, eff: { money: -150, rep: 4, tags: { genereux: 1 } }, suite: 'Les gamins reviendront te remercier, à leur façon : ils garderont ton scooter.' },
      { label: 'Défendre les gamins', eff: { rep: 2, social: 4, tags: { tchatcheur: 1 } }, suite: '« Ce sont des enfants, pas des voleurs. » La rue est de ton côté.' },
      { label: 'Répondre sur le même ton', eff: { rep: -3, tags: { bagarreur: 1 } }, suite: 'Ça finit en cris. Rien de réglé.' },
    ] },
  { id: 'caisses', lieu: ['rue'], q: ['populaire'], poids: 2, titre: 'Hamid', img: 'portrait-hamid',
    cond: s => hour(s.t) < 12,
    texte: 'Hamid, devant le café, avec un camion de livraison : « Tu me donnes un coup de main pour les caisses ? »', choix: [
      { label: 'Aider', eff: { energie: -10, rel: { hamid: 7 }, rep: 2, tags: { fiable: 1 } }, suite: 'Vingt caisses de bouteilles. Le thé sera gratuit pendant une semaine, dit-il.' },
      { label: 'Pas le temps', eff: { rel: { hamid: -2 } }, suite: 'Il lève les yeux au ciel et appelle un gamin.' },
    ] },
  { id: 'cortege', lieu: ['rue', 'anfa'], poids: 1, titre: 'Un cortège', img: 'illu-cafe',
    cond: s => hour(s.t) >= 17,
    texte: 'Klaxons, youyous : un cortège de mariage traverse la rue, les voitures décorées de rubans.', choix: [
      { label: 'Applaudir et lancer un youyou', eff: { social: 6, moral: 6 }, suite: 'La mariée te fait un signe par la fenêtre. Bonne journée.' },
      { label: 'Passer ton chemin', eff: {}, suite: 'Le bruit s\'éloigne.' },
    ] },
  { id: 'jus', lieu: ['rue', 'plage'], poids: 2, titre: 'Jus d\'orange', img: 'illu-marche',
    cond: s => hour(s.t) >= 10 && s.needs.faim < 70,
    texte: 'Une charrette de jus d\'orange pressé, 5 DH le verre. Le vendeur te sourit.', choix: [
      { label: 'Un verre (5 DH)', cond: s => s.money >= 5, eff: { money: -5, faim: 10, moral: 4 }, suite: 'Frais, sucré, parfait.' },
      { label: 'Deux verres, un pour le gamin à côté (10 DH)', cond: s => s.money >= 10, eff: { money: -10, faim: 10, moral: 6, rep: 1, tags: { genereux: 1 } }, suite: 'Le gamin boit sans dire merci, puis revient le dire.' },
      { label: 'Non merci', eff: {}, suite: 'Une autre fois.' },
    ] },
  { id: 'voiturier', lieu: ['anfa'], poids: 2, titre: 'Le voiturier', img: 'illu-californie',
    cond: s => !!s.vehicule,
    texte: 'Devant le restaurant, un voiturier improvisé : « Je te la garde, 20 DH. » Il n\'a pas l\'air d\'y travailler.', choix: [
      { label: 'Payer 20 DH', eff: { money: -20 }, suite: 'Il te fait un signe de la main. Ta voiture sera là au retour, intacte.' },
      { label: 'Refuser', chance: () => 0.7, ok: { tags: { debrouillard: 1 } }, suiteOk: 'Rien ne s\'est passé. Vingt dirhams de gagnés.', ko: { money: -300, moral: -8 }, suiteKo: 'Au retour, une longue rayure sur la portière. Trois cents dirhams de carrosserie.' },
    ] },
  { id: 'enfant_perdu', lieu: ['plage'], poids: 2, titre: 'Un enfant perdu', img: 'illu-plage',
    cond: s => hour(s.t) < 19,
    texte: 'Un petit garçon pleure seul près des parasols. Il ne retrouve plus sa mère.', choix: [
      { label: 'L\'aider à la retrouver', eff: { energie: -8, social: 8, rep: 4, moral: 8, tags: { fiable: 1 } }, suite: 'Vingt minutes de recherche avec Nabil. La mère, en larmes, te bénit sur trois générations.' },
      { label: 'Prévenir le maître-nageur et repartir', eff: { rel: { nabil: 3 }, rep: 1 }, suite: 'Nabil prend le relais. Tu retournes à ta serviette.' },
      { label: 'Ne pas t\'en mêler', eff: { moral: -4 }, suite: 'Quelqu\'un d\'autre s\'en occupera. Tu y repenses le soir.' },
    ] },
  { id: 'sfenj', lieu: ['plage'], poids: 2, titre: 'Youssef', img: 'portrait-youssef',
    cond: s => s.needs.faim < 75,
    texte: 'Youssef passe avec son plateau : « Sfenj, encore chauds ! Trois pour 10 DH, pour toi. »', choix: [
      { label: 'Trois sfenj (10 DH)', cond: s => s.money >= 10, eff: { money: -10, faim: 18, moral: 6, rel: { youssef: 4 } }, suite: 'Le sucre colle aux doigts. Youssef raconte la plage d\'avant.' },
      { label: 'Juste un thé (3 DH)', cond: s => s.money >= 3, eff: { money: -3, moral: 3, rel: { youssef: 2 } }, suite: 'Un thé brûlant face aux vagues.' },
      { label: 'Non merci', eff: {}, suite: '« Je repasse. »' },
    ] },
  // Encore du quotidien : la rue
  { id: 'gardien_voitures', lieu: ['rue'], q: ['populaire'], poids: 2, titre: 'Le gardien de voitures', img: 'illu-cafe',
    cond: s => !!s.vehicule,
    texte: 'Le gardien de voitures, gilet jaune et sifflet, tend la main : « 5 DH, j\'ai surveillé. » Tu n\'as rien demandé.', choix: [
      { label: 'Donner 5 DH', eff: { money: -5, rep: 1 }, suite: 'C\'est la règle de la rue. Il saluera ton véhicule tous les jours.' },
      { label: 'Discuter', eff: { tags: { tchatcheur: 1 } }, suite: '« Surveillé quoi ? Il n\'a pas bougé. » Il rit. Tu ne paies pas, cette fois.' },
      { label: 'Ignorer', eff: { rep: -2, tags: { radin: 1 } }, suite: 'Il marmonne. Ton rétroviseur sera parfois tourné.' },
    ] },
  { id: 'sacs', lieu: ['rue'], poids: 2, titre: 'Les sacs', img: 'illu-marche',
    cond: s => hour(s.t) < 20,
    texte: 'Une vieille dame avance avec deux sacs de légumes qui traînent par terre.', choix: [
      { label: 'Porter les sacs jusqu\'à chez elle', eff: { energie: -6, rep: 3, moral: 4, tags: { genereux: 1 } }, suite: 'Trois étages. Elle te bénit, et te donne une orange.' },
      { label: 'Passer', eff: {}, suite: 'Quelqu\'un d\'autre l\'aidera.' },
    ] },
  { id: 'cv', lieu: ['rue', 'cafe'], q: ['populaire'], poids: 2, titre: 'Yassine', img: 'portrait-yassine',
    cond: s => relOf('yassine') >= 10 && s.job.competence >= 1,
    texte: 'Yassine : « Tu sais écrire un CV, toi ? J\'ai un entretien samedi et je n\'ai rien. »', choix: [
      { label: 'L\'aider ce soir', eff: { energie: -8, rel: { yassine: 10 }, rep: 2, tags: { fiable: 1 } }, suite: 'Deux heures devant ton téléphone. Il repart avec un CV propre et de l\'espoir.', apres: { id: 'cv_suite', jours: 4 } },
      { label: 'Lui envoyer un modèle', eff: { rel: { yassine: 3 } }, suite: '« Merci, je me débrouille. » Il ne se débrouillera pas.' },
      { label: 'Pas le temps', eff: { rel: { yassine: -4 } }, suite: 'Il hoche la tête. Il demandera à quelqu\'un d\'autre.' },
    ] },
  { id: 'cv_suite', suite: true, lieu: ['rue', 'cafe', 'maison'], titre: 'L\'entretien de Yassine', img: 'portrait-yassine',
    texte: 'Yassine te cherche depuis ce matin. Il a eu son entretien.', choix: [
      { label: 'Alors ?', chance: () => 0.55, ok: { rel: { yassine: 6 }, moral: 6, rep: 2 }, suiteOk: '« Je commence lundi ! » Il te paie le thé pendant un mois.', ko: { rel: { yassine: 2 }, moral: -2 }, suiteKo: '« Ils ont pris le neveu du patron. » Il hausse les épaules. « Merci quand même. »' },
    ] },
  { id: 'collecte', lieu: ['rue'], q: ['populaire'], poids: 1, titre: 'Une collecte', img: 'illu-cafe',
    cond: () => true,
    texte: 'Un voisin passe avec une liste : le père de la famille du troisième est décédé, on cotise pour les funérailles.', choix: [
      { label: 'Donner 100 DH', cond: s => s.money >= 100, eff: { money: -100, rep: 5, fam: 1, tags: { genereux: 1 } }, suite: 'Ton nom est sur la liste, en bonne place.' },
      { label: 'Donner 30 DH', cond: s => s.money >= 30, eff: { money: -30, rep: 2 }, suite: 'Chacun selon ses moyens.' },
      { label: 'Ne rien donner', eff: { rep: -4, tags: { radin: 1 } }, suite: 'La liste passe. On a vu que tu n\'y étais pas.' },
    ] },
  { id: 'chat_blesse', lieu: ['rue', 'anfa'], poids: 1, titre: 'Un chat', img: 'animal-chat',
    cond: () => true,
    texte: 'Un chat de gouttière boite sur le trottoir, une patte en sang. Il te regarde.', choix: [
      { label: 'L\'emmener chez le vétérinaire (150 DH)', cond: s => s.money >= 150, eff: { money: -150, moral: 8, tags: { genereux: 1 } }, suite: 'Une piqûre, un bandage. Il repart en te frôlant la jambe.' },
      { label: 'Lui laisser à manger', eff: { moral: 3 }, suite: 'Un bout de pain, un peu d\'eau. Il mange sans te quitter des yeux.' },
      { label: 'Continuer', eff: { moral: -2 }, suite: 'Tu y repenses dans la soirée.' },
    ] },
  { id: 'voisin_chomage', lieu: ['rue', 'cafe'], poids: 1, titre: 'Un mot pour lui', img: 'illu-travail',
    cond: s => !s.job.chomage && !s.affaire,
    texte: 'Un voisin qui a perdu son travail : « Là où tu bosses, ils cherchent quelqu\'un ? Tu peux glisser mon nom ? »', choix: [
      { label: 'Le recommander', chance: s => 0.4 + s.job.perf / 200, ok: { rep: 5, collegues: 4, tags: { fiable: 1 } }, suiteOk: 'Il a été pris à l\'essai. Il te doit beaucoup, et le chef a aimé ton initiative.', ko: { perf: -6, rep: 2 }, suiteKo: 'Il s\'est présenté en retard, mal habillé. Le chef t\'a regardé(e) de travers.' },
      { label: 'Promettre sans rien faire', eff: { rep: -2, tags: { tchatcheur: 1 } }, suite: 'Il attend un appel. Il attendra longtemps.' },
      { label: 'Dire non franchement', eff: { rep: 0, tags: { fiable: 1 } }, suite: '« Je ne peux pas. » Il apprécie au moins la franchise.' },
    ] },
  { id: 'tombola', lieu: ['rue', 'plage'], poids: 2, titre: 'La tombola', img: 'illu-marche',
    cond: s => s.money >= 10,
    texte: 'Un gamin vend des tickets de tombola pour son école, 10 DH. « Y a un vélo à gagner ! »', choix: [
      { label: 'Un ticket', eff: { money: -10, moral: 2 }, suite: 'Tirage dans quelques jours.', apres: { id: 'tirage', jours: 4 } },
      { label: 'Non merci', eff: {}, suite: 'Il court vers le suivant.' },
    ] },
  { id: 'tirage', suite: true, lieu: ['rue', 'cafe', 'maison', 'plage', 'anfa'], titre: 'Le tirage', img: 'illu-marche',
    texte: 'Le tirage de la tombola de l\'école a eu lieu.', choix: [
      { label: 'Vérifier ton ticket', chance: () => 0.12, ok: { money: 500, moral: 12 }, suiteOk: 'Pas le vélo, mais le deuxième lot : 500 DH en bons d\'achat. Le gamin est plus content que toi.', ko: { moral: -1 }, suiteKo: 'Rien. Mais l\'école a un nouveau tableau.' },
    ] },
  { id: 'cireur', lieu: ['rue', 'anfa'], poids: 1, titre: 'Le cireur', img: 'illu-cafe',
    cond: s => s.char.outfit === 'costume' && s.money >= 10,
    texte: 'Un cireur de chaussures te montre tes souliers du doigt, puis sa boîte. « 10 DH, et tu brilles. »', choix: [
      { label: 'Oui (10 DH)', eff: { money: -10, hygiene: 4, moral: 4 }, suite: 'Cinq minutes, un chiffon qui claque. Tu brilles.' },
      { label: 'Non', eff: {}, suite: 'Il te laisse à tes chaussures ternes.' },
    ] },
  // Le café
  { id: 'addition', lieu: ['cafe'], poids: 2, titre: 'L\'addition', img: 'illu-cafe',
    cond: () => true,
    texte: 'En partant, tu réalises que le serveur a oublié de te faire payer.', choix: [
      { label: 'Le signaler et payer', eff: { money: -10, rep: 3, rel: { hamid: 4, rachid: 2 }, tags: { fiable: 1 } }, suite: '« Il y en a encore des honnêtes. » On s\'en souviendra.' },
      { label: 'Partir sans rien dire', chance: () => 0.7, ok: { money: 0, tags: { radin: 1 } }, suiteOk: 'Personne n\'a rien vu. Dix dirhams de gagnés, et un petit poids.', ko: { rep: -6, rel: { hamid: -6 } }, suiteKo: 'Le serveur te rattrape dans la rue. Toute la terrasse regarde.' },
    ] },
  { id: 'formation', lieu: ['cafe', 'maison'], poids: 1, titre: 'Une annonce', img: 'illu-travail',
    cond: s => !s.job.chomage && s.money >= 300,
    texte: 'Dans le journal, une annonce : formation du soir, deux semaines, 300 DH. Ça correspond à ton métier.', choix: [
      { label: 'S\'inscrire (300 DH)', eff: { money: -300, competence: 0.6, energie: -8, tags: { ambitieux: 1 } }, suite: 'Deux semaines de soirées studieuses. Tu sais des choses que ton chef ignore.' },
      { label: 'Laisser passer', eff: {}, suite: 'Une autre fois.' },
    ] },
  { id: 'vieil_ami', lieu: ['cafe', 'anfa'], poids: 1, titre: 'Un visage connu', img: 'illu-cafe',
    cond: () => true,
    texte: 'Un ancien camarade de lycée, à la table d\'à côté. Costume, montre, téléphone qui sonne tout le temps.', choix: [
      { label: 'Prendre un café ensemble (30 DH)', cond: s => s.money >= 30, eff: { money: -30, social: 8, moral: 2 }, suite: 'Il parle de ses affaires, beaucoup. Il te propose de te rappeler.', apres: { id: 'ami_rappelle', jours: 3 } },
      { label: 'Un bonjour, sans plus', eff: { social: 2 }, suite: 'Chacun sa route.' },
    ] },
  { id: 'ami_rappelle', suite: true, lieu: ['cafe', 'maison', 'rue', 'anfa'], titre: 'Il rappelle', img: 'illu-cafe',
    texte: 'Ton ancien camarade appelle : « J\'ai un plan. Tu mets 2 000 DH, dans un mois tu en as 3 000. Mes associés sont sérieux. »', choix: [
      { label: 'Mettre 2 000 DH', cond: s => s.money >= 2000, chance: () => 0.3 - tagN('naif') * 0.05, ok: { money: 1000, moral: 10, tags: { debrouillard: 1 } }, suiteOk: 'Un mois plus tard, 3 000 DH sur ton compte. Tu n\'as pas tout compris, mais ça a marché.', ko: { money: -2000, moral: -12, tags: { naif: 1 } }, suiteKo: 'Son numéro ne répond plus. Ses « associés » non plus.' },
      { label: 'Refuser poliment', eff: { tags: { fiable: 1 } }, suite: '« Tu rates quelque chose. » Peut-être. Ou pas.' },
    ] },
  { id: 'pari', lieu: ['cafe'], poids: 2, titre: 'Le pari', img: 'illu-cafe',
    cond: s => s.money >= 100 && hour(s.t) >= 18,
    texte: 'Avant le match, les habitués parient. « 100 DH sur le Raja, tu suis ? »', choix: [
      { label: 'Parier 100 DH', chance: () => 0.45, ok: { money: 100, social: 8, moral: 8 }, suiteOk: 'But à la 89e. Tu rafles la mise et les accolades.', ko: { money: -100, social: 4, moral: -6 }, suiteKo: 'Match nul. Tu paies, et on se moque gentiment.' },
      { label: 'Regarder sans parier', eff: { social: 3 }, suite: 'Tu gardes tes 100 DH et tes nerfs.' },
    ] },
  { id: 'telephone_oublie', lieu: ['cafe'], poids: 1, titre: 'Un téléphone oublié', img: 'illu-cafe',
    cond: () => true,
    texte: 'Sur la table d\'à côté, un téléphone oublié. Personne ne le réclame.', choix: [
      { label: 'Le confier au serveur', eff: { rep: 3, tags: { fiable: 1 } }, suite: 'Le propriétaire reviendra en courant une heure plus tard. Il te cherchera pour te remercier.' },
      { label: 'Le garder', chance: () => 0.5, ok: { money: 400, tags: { debrouillard: 1 } }, suiteOk: 'Revendu 400 DH au marché. Personne n\'a rien su.', ko: { rep: -10, moral: -8 }, suiteKo: 'Le propriétaire l\'a localisé. Il est venu avec deux amis. Tu l\'as rendu, devant tout le monde.' },
    ] },
  // La maison
  { id: 'diner_voisins', lieu: ['maison'], q: ['populaire', 'moyen'], poids: 2, titre: 'Invitation', img: 'portrait-khadija',
    cond: s => hour(s.t) >= 18 && hour(s.t) < 21,
    texte: 'Lalla Khadija : « Ce soir on fait un tajine, viens manger avec nous, il y a aussi mon neveu. »', choix: [
      { label: 'Y aller', eff: { faim: 40, social: 12, moral: 6, rel: { khadija: 6 }, energie: -4 }, suite: 'Le tajine, le neveu qui parle de son travail, la télé en fond. Une vraie soirée de quartier.' },
      { label: 'Décliner gentiment', eff: { rel: { khadija: -2 } }, suite: 'Elle t\'envoie quand même une assiette.' },
    ] },
  { id: 'travaux', lieu: ['maison'], poids: 1, titre: 'Les travaux', img: 'icone-demenagement',
    cond: s => hour(s.t) < 10,
    texte: 'Sept heures du matin : le voisin du dessus casse un mur au marteau-piqueur. Depuis trois jours.', choix: [
      { label: 'Monter lui parler', chance: () => 0.6 + tagN('tchatcheur') * 0.1, ok: { moral: 4, rep: 1 }, suiteOk: '« Je finis demain, promis. » Il a fini le surlendemain.', ko: { moral: -4, rep: -2, tags: { bagarreur: 1 } }, suiteKo: 'Ça a fini en cris dans l\'escalier.' },
      { label: 'Supporter', eff: { energie: -8, moral: -4 }, suite: 'Tu te lèves. Le mur aussi.' },
    ] },
  { id: 'frere_examen', lieu: ['maison'], poids: 1, titre: 'Ton frère', img: 'illu-cafe',
    cond: s => s.money >= 300,
    texte: 'Ton petit frère appelle, gêné : « Les frais d\'inscription à l\'examen, 300 DH… Papa ne peut pas ce mois-ci. »', choix: [
      { label: 'Envoyer 300 DH', eff: { money: -300, fam: 8, moral: 4, tags: { famille: 1 } }, suite: '« Je te rembourserai. » Il ne remboursera pas, et ce n\'est pas grave.' },
      { label: 'Envoyer 150 DH', eff: { money: -150, fam: 3 }, suite: '« Merci. » Il trouvera le reste.' },
      { label: 'Pas possible ce mois-ci', eff: { fam: -8, moral: -4 }, suite: 'Il dit qu\'il comprend. Ta mère, moins.' },
    ] },
  { id: 'livre_fz', lieu: ['maison', 'rue'], q: ['populaire'], poids: 1, titre: 'Fatima-Zahra', img: 'portrait-fz',
    cond: () => relOf('fz') >= 10,
    texte: 'Fatima-Zahra te tend un livre : « Tu me diras ce que tu en penses. Il m\'a changé la tête. »', choix: [
      { label: 'Le lire cette semaine', eff: { energie: -4, moral: 8, competence: 0.2, rel: { fz: 8 } }, suite: 'Lu en trois soirs. Vous en parlez une heure, debout dans l\'escalier.' },
      { label: 'Le rendre sans l\'ouvrir', eff: { rel: { fz: -4 } }, suite: '« Tu l\'as lu ? » Tu mens mal.' },
    ] },
  { id: 'fuite', lieu: ['maison'], q: ['populaire'], poids: 1, titre: 'La fuite', img: 'icone-demenagement',
    cond: () => true,
    texte: 'Une tache au plafond, puis une goutte, puis un seau. Le voisin du dessus a une fuite.', choix: [
      { label: 'Appeler le propriétaire', chance: () => 0.5, ok: { moral: 2 }, suiteOk: 'Un plombier passe le lendemain. Pour une fois.', ko: { moral: -6, hygiene: -4 }, suiteKo: '« Je vois ça la semaine prochaine. » Le seau se remplit.' },
      { label: 'Réparer avec le voisin', eff: { energie: -10, rel: { khadija: 3 }, rep: 2, tags: { debrouillard: 1 } }, suite: 'Un joint, du mastic, un thé. Ça tient.' },
    ] },
  // Anfa
  { id: 'brunch', lieu: ['anfa'], poids: 2, titre: 'Brunch', img: 'portrait-sofia',
    cond: s => relOf('sofia') >= 10 && s.money >= 150 && dow(s.t) >= 5,
    texte: 'Sofia : « On fait un brunch dimanche, tout le monde sera là. 150 DH par personne, c\'est rien. »', choix: [
      { label: 'Y aller (150 DH)', eff: { money: -150, social: 12, rel: { sofia: 8, karim: 4, leila: 4 }, faim: 30 }, suite: 'Des avocats, des photos, des prénoms que tu oublies. Tu es dans la boucle.' },
      { label: 'Décliner', eff: { rel: { sofia: -4 } }, suite: '« Oh, dommage. » Les photos tournent sans toi.' },
    ] },
  { id: 'rayure', lieu: ['anfa'], poids: 1, titre: 'La rayure', img: 'illu-californie',
    cond: s => !!s.vehicule,
    texte: 'Un gros 4x4 recule et accroche ton véhicule. Le conducteur descend, pressé : « 200 DH et on oublie, d\'accord ? »', choix: [
      { label: 'Prendre les 200 DH', eff: { money: 200, moral: -2 }, suite: 'La rayure restera. Deux cents dirhams aussi.' },
      { label: 'Exiger le constat', chance: () => 0.5 + tagN('tchatcheur') * 0.1, ok: { money: 600, tags: { debrouillard: 1 } }, suiteOk: 'Il finit par céder : 600 DH, le vrai prix de la carrosserie.', ko: { moral: -8, rep: -1 }, suiteKo: 'Il remonte et démarre. Pas de plaque, pas de constat, pas d\'argent.' },
    ] },
  { id: 'golf', lieu: ['anfa'], poids: 1, titre: 'Haj Abdellah', img: 'portrait-haj',
    cond: () => relOf('haj') >= 30,
    texte: 'Haj Abdellah : « Samedi matin, je joue au golf avec des amis. Viens, tu rencontreras du monde. »', choix: [
      { label: 'Y aller', eff: { energie: -10, rel: { haj: 8 }, social: 8, tags: { ambitieux: 1 } }, suite: 'Tu ne sais pas jouer. Ça n\'a aucune importance : tu as serré six mains qui comptent.', apres: { id: 'golf_suite', jours: 5 } },
      { label: 'Décliner', eff: { rel: { haj: -3 } }, suite: '« Comme tu veux. » Il n\'insiste pas, et il n\'insistera plus.' },
    ] },
  { id: 'golf_suite', suite: true, lieu: ['anfa', 'cafe', 'maison', 'rue'], titre: 'Une carte de visite', img: 'portrait-haj',
    texte: 'Un des amis du Haj t\'appelle : il a un poste à pourvoir, et il se souvient de toi.', choix: [
      { label: 'Écouter sa proposition', eff: { offre: 1.4, moral: 6 }, suite: 'Une offre arrive dans l\'onglet Argent. Le réseau, ça sert à ça.' },
    ] },
  // La plage
  { id: 'volley', lieu: ['plage'], poids: 2, titre: 'Beach-volley', img: 'illu-plage',
    cond: s => s.needs.energie >= 30,
    texte: 'Un groupe cherche un sixième pour le beach-volley. « Tu sais jouer ? Pas grave, viens. »', choix: [
      { label: 'Jouer', eff: { social: 10, moral: 8, energie: -14, hygiene: -8 }, suite: 'Du sable dans les cheveux, des rires, un numéro ou deux échangés.' },
      { label: 'Non merci', eff: {}, suite: 'Tu les regardes jouer depuis ta serviette.' },
    ] },
  { id: 'surf', lieu: ['plage'], poids: 1, titre: 'Imane', img: 'portrait-imane',
    cond: () => relOf('imane') >= 15,
    texte: 'Imane te tend sa planche : « Allez, une vague. Je te tiens. »', choix: [
      { label: 'Essayer', chance: () => 0.5, ok: { moral: 15, social: 6, rel: { imane: 8 }, energie: -10 }, suiteOk: 'Trois secondes debout. Les plus belles de ta semaine.', ko: { moral: -3, hygiene: -10, energie: -12, rel: { imane: 4 } }, suiteKo: 'Tu as bu la tasse quatre fois. Imane rit, gentiment.' },
      { label: 'Une autre fois', eff: { rel: { imane: -2 } }, suite: '« Peureux(se). » Elle repart vers les vagues.' },
    ] },
  { id: 'meduse', lieu: ['plage'], poids: 1, titre: 'Une méduse', img: 'illu-plage',
    cond: () => true,
    texte: 'Une brûlure sur la jambe en sortant de l\'eau : une méduse.', choix: [
      { label: 'Aller voir Nabil', eff: { moral: -3, rel: { nabil: 5 } }, suite: 'Vinaigre, et un sermon sur les drapeaux. Ça passe en une heure.' },
      { label: 'Serrer les dents', eff: { moral: -6, energie: -6 }, suite: 'Ça brûle jusqu\'au soir.' },
    ] },
  { id: 'drapeau', lieu: ['plage'], poids: 1, titre: 'Drapeau rouge', img: 'illu-plage',
    cond: s => hour(s.t) < 18,
    texte: 'Drapeau rouge aujourd\'hui : courant fort. L\'eau a l\'air tellement bonne, pourtant.', choix: [
      { label: 'Se baigner quand même', chance: () => 0.6, ok: { moral: 10, hygiene: 10, rel: { nabil: -4 } }, suiteOk: 'Tu ressors essoufflé(e) mais ravi(e). Nabil te siffle, furieux.', ko: { energie: -30, moral: -10, rel: { nabil: 4 }, rep: -3 }, suiteKo: 'Le courant t\'a emporté(e). Nabil t\'a ramené(e). Toute la plage a regardé.' },
      { label: 'Rester sur le sable', eff: { moral: 1, tags: { fiable: 1 } }, suite: 'Un jour sans baignade. La mer sera là demain.' },
    ] },
  // Quand ça peut mal tourner
  { id: 'bagarre', lieu: ['cafe'], poids: 1, titre: 'Ça chauffe', img: 'illu-cafe',
    cond: s => hour(s.t) >= 20,
    texte: 'Deux tables se disputent à propos du match. Les chaises commencent à bouger.', choix: [
      { label: 'T\'en mêler', chance: () => 0.5, ok: { rep: 3, moral: 5, tags: { bagarreur: 1 } }, suiteOk: 'Tu as pris le parti du quartier et le quartier s\'en souvient.', ko: { hygiene: -20, moral: -15, money: -300, rep: -8, tags: { bagarreur: 1 } }, suiteKo: 'Une chaise, un téléphone cassé, un œil au beurre noir. Hamid te met dehors.' },
      { label: 'Calmer tout le monde', eff: { rep: 4, social: 4, tags: { fiable: 1 } }, suite: 'Deux thés offerts, une blague, et tout le monde se rassoit. Hamid te remercie.' },
      { label: 'Partir', eff: {}, suite: 'Pas ton problème.' },
    ] },
  { id: 'arnaque', max: 1, lieu: ['maison'], poids: 1, titre: 'Un appel', img: 'icone-demenagement',
    cond: s => s.money >= 1500,
    texte: 'Au téléphone, une voix pressée : « Votre compte est bloqué. Donnez-nous votre code pour le débloquer, vite. »', choix: [
      { label: 'Donner le code', eff: { money: -1500, moral: -15, tags: { naif: 2 } }, suite: 'Le lendemain, 1 500 DH ont disparu. La banque ne peut rien faire.' },
      { label: 'Raccrocher', eff: { tags: { fiable: 1 } }, suite: 'Tu raccroches. Ta mère a reçu le même appel, tu la préviens.' },
    ] },
  { id: 'vol_sac', max: 2, lieu: ['plage'], poids: 1, titre: 'Ton sac', img: 'illu-plage',
    cond: s => s.money >= 500,
    texte: 'En sortant de l\'eau, tu vois quelqu\'un s\'éloigner vite avec ton sac.', choix: [
      { label: 'Courir après', chance: s => 0.4 + (s.needs.energie > 50 ? 0.2 : 0), ok: { energie: -10, moral: 6, tags: { debrouillard: 1 } }, suiteOk: 'Tu le rattrapes au muret. Il lâche le sac et file. Nabil applaudit.', ko: { money: -400, energie: -20, moral: -10 }, suiteKo: 'Trop loin, trop vite. Le sac, le portefeuille, 400 DH.' },
      { label: 'Laisser tomber', eff: { money: -400, moral: -8 }, suite: 'Il n\'y avait que 400 DH. Et tes clés, heureusement dans ta poche.' },
    ] },
  { id: 'absence_vu', lieu: ['cafe', 'plage', 'anfa'], poids: 3, titre: 'Mauvaise rencontre', img: 'illu-travail',
    cond: s => dow(s.t) <= 4 && hour(s.t) >= 9 && hour(s.t) < 17 && s.job.day !== dayIdx(s.t) && !s.job.chomage && !s.affaire && !ferie(),
    texte: 'Tu n\'es pas allé(e) travailler aujourd\'hui. Et là, à trois tables de toi : quelqu\'un du bureau, qui t\'a vu(e).', choix: [
      { label: 'Aller le saluer et expliquer', chance: s => 0.5 + s.job.collegues / 200, ok: { collegues: 4 }, suiteOk: '« T\'inquiète, je n\'ai rien vu. » Un service qu\'il te rendra cher un jour.', ko: { perf: -15, collegues: -5 }, suiteKo: 'Il sourit. Le chef est au courant avant ce soir.' },
      { label: 'Faire comme si de rien n\'était', chance: () => 0.5, ok: {}, suiteOk: 'Il ne t\'a peut-être pas reconnu(e).', ko: { perf: -20, licenciement: true }, suiteKo: 'Il t\'a reconnu(e). Le chef a tranché.' },
    ] },
];
// ---------- Les histoires d'amour ----------
const AM = [
  { id: 'rencontre', etape: 0, titre: 'Un regard', texte: (c) => ({ rue: 'Dans la rue, un sourire échangé devant le hanout.', cafe: 'À la terrasse, deux personnes à la table d\'à côté rient d\'une blague que tu as faite.', anfa: 'Au café, Sofia te présente deux amis qui parlent fort et te regardent beaucoup.', plage: 'Sur le sable, quelqu\'un te renvoie le ballon, et quelqu\'un d\'autre te demande l\'heure.' }[c.lieu]),
    choix: (c) => [...c.cands.map(x => ({ label: `Engager la conversation avec ${x.nom}`, cand: x })), { label: 'Rester dans ton coin' }] },
  { id: 'numero', etape: 1, titre: a => `${a.nom}, encore`, texte: a => `Tu recroises ${a.nom}. ${a.desc} La conversation est facile. Un numéro ?`, choix: a => [
    { label: 'Demander son numéro', chance: () => 0.45 + G.s.needs.moral / 400 + tagN('tchatcheur') * 0.15 + (has('sociable') ? 0.1 : 0), ok: { etape: 2, score: 10, moral: 10 }, suiteOk: `${a.nom} tape son numéro dans ton téléphone. « Appelle, cette fois. »`, ko: { score: -5, moral: -5 }, suiteKo: `« On se recroisera. » ${il(a) === 'elle' ? 'Elle' : 'Il'} sourit, mais pas plus.` },
    { label: 'Laisser passer', eff: { moral: -2 }, suite: 'Une autre fois, peut-être.' },
  ] },
  { id: 'sortie', etape: 2, titre: a => `Inviter ${a.nom}`, texte: a => `Tu as le numéro de ${a.nom} depuis quelques jours. Un message ne coûte rien.`, choix: a => [
    { label: 'Un café (60 DH)', cond: s => s.money >= 60, eff: { money: -60, score: 12, social: 8, moral: 8, sortie: 1 }, suite: `Deux heures à parler de tout. ${a.nom} a ri trois fois.` },
    { label: 'Une balade à la corniche (gratuit)', eff: { score: 10, social: 8, moral: 8, energie: -6, sortie: 1 }, suite: 'Le coucher du soleil, les sfenj de Youssef, et une main qui frôle la tienne.' },
    { label: 'Le cinéma au mall (150 DH)', cond: s => s.money >= 150, eff: { money: -150, score: 16, social: 8, moral: 10, sortie: 1 }, suite: `Un film que ni toi ni ${a.nom} n'avez vraiment regardé.` },
    { label: 'Pas cette semaine', eff: { score: -6 }, suite: `${a.nom} attend un message qui ne vient pas.` },
  ] },
  { id: 'couple', etape: 3, min: 50, titre: a => `${a.nom} et toi`, texte: a => `Après plusieurs sorties, ${a.nom} pose la question : « On est quoi, nous deux ? »`, choix: a => [
    { label: 'Un couple, clairement', eff: { etape: 4, score: 10, moral: 15, social: 10 }, suite: `${a.nom} sourit. Vous êtes ensemble, maintenant. Reste à le dire aux familles.` },
    { label: 'Pas encore prêt(e)', eff: { score: -15, moral: -4 }, suite: `${a.nom} ne dit rien. Le silence dure jusqu'au bout de la rue.` },
  ] },
  { id: 'jalousie', etape: 3, titre: 'Un doute', texte: a => `${a.nom} t'a vu(e) rire avec quelqu'un au café. « C'était qui ? »`, choix: a => [
    { label: 'Expliquer, calmement', eff: { score: 4 }, suite: 'Un voisin, rien de plus. Ça passe.' },
    { label: '« Tu me fais une scène ? »', eff: { score: -12, moral: -4, tags: { bagarreur: 1 } }, suite: `${a.nom} raccroche. Deux jours sans nouvelles.` },
  ] },
  { id: 'cadeau', etape: 3, titre: 'Un anniversaire', texte: a => `C'est l'anniversaire de ${a.nom} samedi.`, choix: a => [
    { label: 'Un vrai cadeau (300 DH)', cond: s => s.money >= 300, eff: { money: -300, score: 14, moral: 6, tags: { genereux: 1 } }, suite: `${a.nom} ne s'y attendait pas. Les yeux brillent.` },
    { label: 'Un gâteau fait maison', eff: { score: 8, moral: 6, energie: -6 }, suite: 'Un peu raté, mais fait avec le cœur. Ça compte double.' },
    { label: 'Oublier', eff: { score: -14 }, suite: `${a.nom} ne dit rien. C'est pire.` },
  ] },
  { id: 'famille_apprend', etape: 4, famille: 'inconnue', titre: 'Les familles', texte: a => `Ta mère a entendu parler de ${a.nom}. « Et c'est qui, cette personne ? De quelle famille ? »`, choix: a => [
    { label: 'Tout lui raconter', chance: s => 0.4 + s.famille / 200 + (G.s.milieu === 'aise' && a.lieu !== 'anfa' ? -0.2 : 0), ok: { famille: 'favorable', fam: 8, score: 6 }, suiteOk: `« Amène-${il(a) === 'elle' ? 'la' : 'le'} vendredi. » Ta mère a déjà prévu le menu.`, ko: { famille: 'contre', fam: -6, moral: -8 }, suiteKo: `« Ce n'est pas pour toi. » Elle ne veut rien entendre, pour l'instant.` },
    { label: 'Dire que c\'est sérieux, sans détails', eff: { famille: 'inconnue', fam: 2 }, suite: '« Tu me le diras quand ce sera le moment. » Elle n\'est pas dupe.' },
  ] },
  { id: 'convaincre', etape: 4, famille: 'contre', titre: 'Convaincre', texte: a => `Ta mère campe sur sa position à propos de ${a.nom}. Ton père ne dit rien, ce qui veut tout dire.`, choix: a => [
    { label: 'Organiser une rencontre chez tes parents', chance: s => 0.5 + s.famille / 250 + tagN('famille') * 0.1, ok: { famille: 'favorable', fam: 10, score: 8 }, suiteOk: `${a.nom} a aidé en cuisine, a ri avec ton père. Ta mère : « Bon, on verra. » C'est oui.`, ko: { fam: -4, score: -6, moral: -6 }, suiteKo: 'Repas glacial. Il faudra du temps.' },
    { label: 'Passer outre', eff: { fam: -15, score: 5, tags: { ambitieux: 1 } }, suite: 'Tu choisis ta vie. Tes parents choisissent le silence, pour un moment.' },
  ] },
  { id: 'dispute', etape: 4, titre: 'Une dispute', texte: a => `${a.nom} te reproche de ne jamais avoir de temps : le travail, le café, les amis…`, choix: a => [
    { label: 'S\'excuser et proposer une sortie', eff: { score: 6, money: -60, moral: 2 }, suite: 'Un café, un vrai moment. Ça repart.' },
    { label: 'Tenir tête', eff: { score: -10, moral: -3 }, suite: 'Chacun campe. La soirée finit tôt.' },
    { label: 'Mettre fin à la relation', eff: { rupture: true }, suite: 'Tu as préféré arrêter là.' },
  ] },
  { id: 'demande', etape: 4, min: 75, famille: 'favorable', jours: 14, titre: 'La grande question', texte: a => `Les familles se sont vues, tout le monde attend. ${a.nom} aussi. Demander ${a.genre === 'f' ? 'sa' : 'sa'} main ?`, choix: a => [
    { label: 'Faire la demande', eff: { etape: 5, score: 10, moral: 20, fam: 10, rep: 4 }, suite: () => { const c = coutMariage(); return `C'est oui ! Les fiançailles sont fêtées. Le mariage coûtera ${fmtDH(c.total)}${c.famille ? `, dont ${fmtDH(c.famille)} payés par les familles` : ''} : il te faut ${fmtDH(c.toi)}.`; } },
    { label: 'Attendre encore', eff: { score: -6 }, suite: `${a.nom} comprend. Mais les familles s'impatientent.` },
  ] },
  { id: 'mariage', etape: 5, titre: 'Le mariage', texte: a => `Tu as réuni ${fmtDH(coutMariage().toi)}. ${a.nom} et les deux familles n'attendent que ta parole pour fixer la date.`, cond: s => s.money >= coutMariage().toi, choix: a => [
    { label: 'Fixer la date : le mariage !', eff: { etape: 6, mariage: true }, suite: `Une amariya, une negafa, un orchestre, trois cents invités et ta mère qui pleure. ${a.nom} emménage chez toi.` },
    { label: 'Pas tout de suite', eff: { score: -4 }, suite: 'Encore un peu de temps.' },
  ] },
  { id: 'belle_mere', etape: 6, titre: 'La belle-famille', texte: a => `La mère de ${a.nom} s'installe pour le week-end, avec un sac de provisions et des conseils sur tout.`, choix: a => [
    { label: 'Sourire et servir le thé', eff: { score: 6, fam: 3, energie: -6, tags: { famille: 1 } }, suite: 'Deux jours de remarques sur la cuisine, puis un câlin sur le pas de la porte. Tu as gagné des points.' },
    { label: 'Disparaître au café', eff: { score: -8, social: 6 }, suite: `${a.nom} t'a attendu(e) toute la soirée avec sa mère. Ce sera un sujet, plus tard.` },
  ] },
  { id: 'projet', etape: 6, titre: 'Un projet à deux', texte: a => `${a.nom}, un carnet à la main : « Si on mettait 500 DH par semaine de côté pour un appartement à nous ? »`, choix: a => [
    { label: 'Oui, 500 DH sur le compte épargne', cond: s => s.money >= 500, eff: { money: -500, epargne: 500, score: 8, moral: 4 }, suite: 'Une première brique. Le carnet a une colonne de plus.' },
    { label: 'Pas maintenant', eff: { score: -6 }, suite: `${a.nom} referme le carnet sans rien dire.` },
  ] },
  { id: 'soir', etape: 6, titre: 'Le soir', texte: a => `${a.nom} rentre avec un plat de rfissa de sa mère et une idée : « Et si on prenait quelques jours à Essaouira ? »`, choix: a => [
    { label: 'Oui, trois jours (800 DH)', cond: s => s.money >= 800, eff: { money: -800, score: 10, moral: 20, energie: 15 }, suite: 'Trois jours de vent et de poisson grillé. Vous revenez légers.' },
    { label: 'Plus tard, le travail', eff: { score: -5, moral: -2 }, suite: `${a.nom} range le plat. « Plus tard, toujours plus tard. »` },
  ] },
];

// ---------- L'état ----------
export function initVie(s) {
  if (!s.vie) s.vie = { tags: {}, suites: [], jour: { d: -1, n: 0 }, amour: null, faits: {}, flags: {}, lastAt: -1 };
}

// Où est le personnage, du point de vue des histoires ?
function lieuActuel() {
  const s = G.s, c = G.cur;
  if (s.away) return null;
  if (c && c.stage === 'do' && c.it.kind === 'cafe') return 'cafe';
  if (c && c.it && c.it.kind === 'plage') return 'plage';
  if (homeHere() && isHome()) return 'maison';
  return { populaire: 'rue', anfa: 'anfa', corniche: 'plage' }[s.quartier];
}
const okCond = (c, s) => (!c.cond || c.cond(s));

export function vieMinute(T) {
  const s = G.s, v = V(), d = dayIdx(T), mm = T % 1440, h = hour(T);
  if (v.jour.d !== d) { v.jour = { d, n: 0 }; }
  // Parler à la personne dans la rue fait aussi avancer l'histoire.
  if (v.amour && mm % 60 === 0 && s.rel[v.amour.id] != null) { const r = s.rel[v.amour.id]; if (v.amour.relSync == null) v.amour.relSync = r; if (r > v.amour.relSync) amourScore((r - v.amour.relSync) * 0.5); v.amour.relSync = r; }
  // Les soirées à deux.
  if (v.amour && v.amour.etape >= 4 && mm === 21 * 60 && !s.away) { s.needs.social = clampv(s.needs.social + 8, 0, 100); s.needs.moral = clampv(s.needs.moral + 3, 0, 100); }
  if (v.amour && v.amour.etape >= 6 && mm === 20 * 60 + 30 && !s.away) s.needs.faim = clampv(s.needs.faim + 12, 0, 100);
  // Chaque mois, les histoires du quotidien peuvent recommencer (sauf celles qui n'arrivent qu'une fois).
  if (d % 30 === 0 && mm === 6 * 60 + 4 && v.faits.mois !== d) { v.faits.mois = d; for (const ev of EV) if (ev.max !== 1 && v.faits[ev.id]) v.faits[ev.id] = 0; }
  // Une fois par semaine, les étiquettes pèsent sur la réputation.
  if (d % 7 === 0 && mm === 6 * 60 + 3) { if (tagN('genereux') >= 3 || tagN('fiable') >= 3) rep(1); if (tagN('bagarreur') >= 2) rep(-1); if (v.amour && v.amour.score < 20 && v.amour.etape >= 2 && v.amour.etape < 6) rupture('Le silence a fini par tout dire.'); }
  if (mm % 30 !== 15 || h < 8 || h >= 23 || G.modal || s.away) return;
  const lieu = lieuActuel();
  if (!lieu) return;
  // D'abord les suites arrivées à échéance, puis l'amour, puis une histoire nouvelle (deux par jour au plus).
  const due = v.suites.find(x => d >= x.at && (!x.lieu || x.lieu.includes(lieu)));
  if (due && Math.random() < 0.6) { v.suites.splice(v.suites.indexOf(due), 1); const ev = EV.find(x => x.id === due.id); if (ev) { fire(ev, due.data || {}); return; } }
  if (v.jour.n >= 2) return;
  if (amourTick(lieu, d)) return;
  if (Math.random() > 0.2) return;
  const faits = v.faits;
  const pool = EV.filter(ev => !ev.suite && ev.lieu.includes(lieu) && (!ev.q || ev.q.includes(s.quartier)) && okCond(ev, s) && (faits[ev.id] || 0) < (ev.max || 4) && d - (faits[ev.id + '_d'] ?? -99) >= 3);
  if (!pool.length) return;
  const total = pool.reduce((a, ev) => a + ev.poids, 0);
  let r = Math.random() * total, ev = pool[0];
  for (const x of pool) { r -= x.poids; if (r <= 0) { ev = x; break; } }
  fire(ev, {});
}

function fire(ev, data) {
  const s = G.s, v = V();
  v.jour.n++; v.faits[ev.id] = (v.faits[ev.id] || 0) + 1; v.faits[ev.id + '_d'] = d0();
  const choix = ev.choix.filter(c => okCond(c, s));
  const texte = typeof ev.texte === 'function' ? ev.texte(data) : ev.texte;
  hooks.sortieEvent({ titre: ev.titre, img: ev.img, texte, choix }, i => { appliquer(choix[i], data); save(); });
}
// Applique un choix : d'abord le hasard s'il y en a, puis les effets, puis la phrase de conclusion et l'éventuelle suite.
function appliquer(ch, data) {
  const s = G.s;
  let eff = ch.eff || {}, suite = ch.suite, apres = ch.apres;
  if (ch.chance) {
    const ok = Math.random() < ch.chance(s);
    eff = (ok ? ch.ok : ch.ko) || {}; suite = ok ? ch.suiteOk : ch.suiteKo; apres = ok ? ch.apresOk || ch.apres : ch.apresKo;
  }
  effets(eff, data);
  if (apres) V().suites.push({ id: apres.id, at: d0() + apres.jours, data: { ...(data || {}), ...(apres.data || {}) } });
  if (typeof suite === 'function') suite = suite();
  if (suite) toast(suite, eff.money < 0 || eff.rep < 0 || eff.moral < 0 || eff.licenciement ? '' : 'good');
}
function effets(eff, data = {}) {
  const s = G.s, v = V(), a = v.amour;
  for (const k in eff) {
    const x = eff[k];
    if (k === 'money') s.money += x;
    else if (k === 'moneyData') s.money += data[x] || 200;
    else if (k === 'rep') rep(x);
    else if (k === 'fam') fam(x);
    else if (k === 'rel' || k === 'rel2') for (const id in x) { const n = getNpc(id); if (n) addRelRaw(n, x[id]); else s.rel[id] = clampv((s.rel[id] || 0) + x[id], 0, 100); }
    else if (k === 'tags') for (const t in x) tag(t, x[t]);
    else if (k === 'flag') Object.assign(v.flags, x);
    else if (k === 'epargne') s.epargne += x;
    else if (k === 'inv') for (const i in x) s.inv[i] = (s.inv[i] || 0) + x[i];
    else if (k === 'perf') s.job.perf = clampv(s.job.perf + x, 0, 100);
    else if (k === 'collegues') s.job.collegues = clampv(s.job.collegues + x, 0, 100);
    else if (k === 'competence') s.job.competence = Math.min(10, s.job.competence + x);
    else if (k === 'offre') nouvelleOffre('reseau', x);
    else if (k === 'licenciement') licencier('pour absences répétées');
    else if (k === 'etape' && a) { a.etape = x; a.depuis = d0(); refreshNpcs(); }
    else if (k === 'score') amourScore(x);
    else if (k === 'sortie' && a) a.sorties += x;
    else if (k === 'famille' && a) a.famille = x;
    else if (k === 'rupture') rupture(`C'est fini avec ${a ? a.nom : 'cette personne'}.`);
    else if (k === 'mariage') mariage();
    else if (s.needs[k] != null) s.needs[k] = clampv(s.needs[k] + x, 0, 100);
  }
}

// ---------- L'amour, étape par étape ----------
function amourTick(lieu, d) {
  const s = G.s, v = V(), a = v.amour;
  if (!a) {
    // Une rencontre, parfois, quand le moral est là.
    if (!CANDIDATS[lieu] || s.needs.moral < 40 || Math.random() > 0.05 || d - (v.faits.rencontre_d ?? -99) < 5) return false;
    v.faits.rencontre_d = d; v.jour.n++;
    const c = { lieu, cands: CANDIDATS[lieu] }, def = AM[0];
    const choix = def.choix(c);
    hooks.sortieEvent({ titre: def.titre, img: { rue: 'illu-cafe', cafe: 'illu-cafe', anfa: 'illu-californie', plage: 'illu-plage' }[lieu], texte: def.texte(c), choix }, i => {
      const ch = choix[i];
      if (!ch.cand) { toast('Tu restes dans ton coin.'); return; }
      v.amour = { ...ch.cand, lieu, etape: 1, score: 20, sorties: 0, famille: 'inconnue', depuis: d, next: d + 2 + Math.floor(Math.random() * 3) };
      s.needs.moral = clampv(s.needs.moral + 6, 0, 100);
      refreshNpcs();
      toast(`${ch.cand.nom}. ${ch.cand.desc} Vous avez parlé dix minutes. Tu y repenses le soir.`, 'good');
      save();
    });
    return true;
  }
  if (d < a.next || Math.random() > 0.5) return false;
  // Quelle histoire ? Celle de l'étape, si ses conditions sont remplies, sinon un petit événement de l'étape en cours.
  const cands = AM.filter(x => x.etape === a.etape && (!x.min || a.score >= x.min) && (!x.famille || a.famille === x.famille) && (!x.jours || d - a.depuis >= x.jours) && (!x.cond || x.cond(s)));
  if (!cands.length) { a.next = d + 2; return false; }
  const special = cands.filter(x => ['couple', 'demande', 'mariage', 'famille_apprend', 'convaincre'].includes(x.id));
  const def = special.length && (a.etape !== 4 || Math.random() < 0.6) ? special[0] : pick(cands);
  if (a.etape === 4 && a.famille === 'inconnue' && def.id !== 'famille_apprend' && Math.random() < 0.5) return amourFire(AM.find(x => x.id === 'famille_apprend'), a, d);
  if (a.etape === 3 && a.score >= 50 && a.sorties >= 3) return amourFire(AM.find(x => x.id === 'couple'), a, d);
  if (a.etape === 2 && a.sorties >= 2 && a.score >= 35) { a.etape = 3; a.depuis = d; }
  return amourFire(def, a, d);
}
function amourFire(def, a, d) {
  const s = G.s, v = V();
  v.jour.n++; a.next = d + (a.etape >= 6 ? 5 + Math.floor(Math.random() * 5) : 2 + Math.floor(Math.random() * 3));
  const choix = (typeof def.choix === 'function' ? def.choix(a) : def.choix).filter(c => okCond(c, s));
  const titre = typeof def.titre === 'function' ? def.titre(a) : def.titre;
  hooks.sortieEvent({ titre, img: { rue: 'illu-cafe', cafe: 'illu-cafe', anfa: 'illu-californie', plage: 'illu-plage' }[a.lieu], texte: def.texte(a), choix }, i => { appliquer(choix[i], {}); save(); });
  return true;
}
function rupture(msg) {
  const s = G.s, v = V();
  if (!v.amour) return;
  v.amour = null;
  s.needs.moral = clampv(s.needs.moral - 25, 0, 100);
  refreshNpcs();
  toast(msg + ' Le moral en prend un coup.', 'bad');
}
function mariage() {
  const s = G.s, a = V().amour, c = coutMariage();
  s.money -= c.toi;
  s.needs.moral = 100; s.needs.social = 100;
  rep(10); fam(15); tag('famille', 1);
  a.etape = 6; a.depuis = d0(); a.score = Math.max(a.score, 80);
  cancelAll();
  refreshNpcs();
}

// ---------- Pour la fiche ----------
export const vieInfo = () => {
  const v = V(), a = v.amour, c = a ? coutMariage() : null;
  return {
    etiquettes: etiquettes(),
    amour: a && { nom: a.nom, desc: a.desc, etape: ETAPES[a.etape], score: a.score, famille: { inconnue: 'ne sait rien', favorable: 'approuve', contre: 's\'y oppose' }[a.famille], mariageCout: a.etape === 5 ? c.toi : 0, marie: a.etape >= 6 },
    suites: v.suites.length,
    startup: !!v.flags.startup,
  };
};
// Pour tester depuis la console : où l'on est et quelles histoires peuvent arriver.
export const debugVie = () => {
  const s = G.s, lieu = lieuActuel(), d = d0(), faits = V().faits;
  return { lieu, jour: V().jour, away: !!s.away, modal: G.modal, pool: lieu ? EV.filter(ev => !ev.suite && ev.lieu.includes(lieu) && (!ev.q || ev.q.includes(s.quartier)) && okCond(ev, s) && (faits[ev.id] || 0) < (ev.max || 4) && d - (faits[ev.id + '_d'] ?? -99) >= 3).map(ev => ev.id) : [] };
};

// ---------- La personne qu'on fréquente, en chair et en os ----------
const QUARTIER_DE = { rue: 'populaire', cafe: 'populaire', anfa: 'anfa', plage: 'corniche' };
// Dans le quartier de la rencontre, du numéro jusqu'aux fiançailles : on la croise dans la rue et au café.
export function amourNpcDefs() {
  const a = G.s.vie && G.s.vie.amour;
  if (!a || a.etape < 2 || a.etape >= 6 || QUARTIER_DE[a.lieu] !== G.s.quartier) return [];
  return [{ id: a.id, nom: a.nom, desc: a.desc, look: a.look, porte: { x: a.lieu === 'anfa' ? -8 : 27, z: 9 }, sorties: [[12, 14], [17.5, 20.5]], cafe: 0.7, lignes: a.lignes || ['Content(e) de te voir.'], amour: true }];
}
export const isConjoint = id => { const a = G.s.vie && G.s.vie.amour; return !!a && a.etape >= 6 && a.id === id; };
export const conjointDefs = () => { const a = G.s.vie && G.s.vie.amour; return a && a.etape >= 6 && homeHere() ? [{ id: a.id, nom: a.nom, look: a.look }] : []; };
// À la maison après le mariage : le soir et le week-end, à la cuisine ou au salon.
function conjointOu(h, w) {
  const we = w >= 5, d = dayIdx(G.s.t);
  if (h < 7 || h >= 23) return null;
  if (!we) { if (h < 18) return h < 8 ? spotSit(0, 'eat') : null; return h < 20 && d % 2 ? spotCook() : spotSit(0, null); }
  if (h < 9) return null;
  if (h < 13) return spotSit(0, h < 10 ? 'eat' : null);
  if (h < 15) return spotCook();
  if (h < 19) return null;
  return spotSit(0, null);
}
export const conjointSpot = () => (conjointDefs().length ? conjointOu(hour(G.s.t), dow(G.s.t)) : null);
export function conjointView() {
  const defs = conjointDefs();
  if (!defs.length) return [];
  const p = conjointSpot(), id = defs[0].id;
  return [p ? { id, visible: true, x: p.x, z: p.z, yaw: p.yaw, walkPhase: 0, pose: { base: p.pose, anim: p.anim, h: p.h } } : { id, visible: false, x: 0, z: 0, yaw: 0, walkPhase: 0, pose: { base: 'stand' } }];
}
export const CONJOINT_ACTS = {
  discuter: { label: 'Discuter', dur: 15 },
  cuisiner: { label: 'Cuisiner ensemble', dur: 30 },
  sortir: { label: 'Sortir en amoureux (80 DH)', dur: 60 },
};
export function conjointActions(id) {
  const a = G.s.vie.amour, sp = conjointSpot();
  if (!sp) return { title: a.nom, items: [] };
  const items = [{ act: 'discuter', label: CONJOINT_ACTS.discuter.label, sub: '15 min · la journée de chacun' }];
  if (sp.anim === 'cook') items.push({ act: 'cuisiner', label: CONJOINT_ACTS.cuisiner.label, sub: '30 min · à quatre mains' });
  items.push({ act: 'sortir', label: CONJOINT_ACTS.sortir.label, sub: '1 h · un café, une balade', disabled: G.s.money < 80, why: 'Pas assez d\'argent.' });
  return { title: a.nom, items };
}
export const conjointLabel = it => `${CONJOINT_ACTS[it.act].label.replace(' (80 DH)', '')} : ${G.s.vie.amour ? G.s.vie.amour.nom : ''}`;
export function startConjoint(it, go, home, blocked, fail, approachCells) {
  const sp = conjointSpot();
  if (!sp) return fail(it, `${G.s.vie.amour.nom} n'est pas là en ce moment.`);
  const app = approachCells(home, [{ x: Math.floor(sp.x), z: Math.floor(sp.z) }], blocked);
  if (!app.length || !go(app)) return fail(it, 'Impossible d\'approcher.');
}
export function arriveConjoint(c) {
  const s = G.s, it = c.it, sp = conjointSpot();
  if (!sp) { G.cur = null; toast(`${s.vie.amour.nom} vient de sortir.`); return; }
  if (it.act === 'sortir') s.money -= 80;
  c.dur = CONJOINT_ACTS[it.act].dur;
  c.spot = { x: s.pos.x, z: s.pos.z, yaw: Math.atan2(sp.x - s.pos.x, sp.z - s.pos.z), pose: 'stand', anim: it.act === 'cuisiner' ? 'cook' : 'talk', h: 0 };
  c.stage = 'do'; c.t = 0; G.yaw = c.spot.yaw;
}
export function finishConjoint(it) {
  const s = G.s, a = s.vie.amour, n = s.needs, up = (k, v) => { n[k] = clampv(n[k] + v, 0, 100); };
  if (it.act === 'discuter') { up('social', 10); up('moral', 4); amourScore(4); toast(`${a.nom} : « ${pick(a.lignes || ['Raconte-moi ta journée.'])} »`); }
  else if (it.act === 'cuisiner') { s.skills.cuisine = Math.min(10, s.skills.cuisine + 0.2); up('social', 8); up('moral', 6); amourScore(5); toast(`Cuisiner à quatre mains, avec de la musique. Cuisine +0,2.`, 'good'); }
  else if (it.act === 'sortir') { up('social', 8); up('moral', 10); up('energie', -6); amourScore(8); toast(`Un café, une balade, et la ville qui vous regarde. ${a.nom} rentre en souriant.`, 'good'); }
  save();
}
