// Données du jeu : catalogue, recettes, lieux, quartier, voisins et réglages.

export const W = 12, D = 9; // taille de l'appartement en cases (1 case = 1 m)
export const SAVE_KEY = 'jeu-maroc-v1';
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const START_MONEY = 5000;
export const LOYER = 700;   // par semaine (environ 2 800 DH par mois)
export const FACTURE = 120; // eau et électricité, par semaine
export const WALK = 1.8;    // cases parcourues par minute de jeu
export const SPEEDS = [0, 1, 3, 10]; // minutes de jeu par seconde réelle

// Le quartier : l'appartement est à l'origine, la rue passe devant (z croissant).
export const X0 = -20, X1 = 32, Z0 = 0, Z1 = D + 14;
export const RUE = {
  trottoir: [D, D + 3], route: [D + 3, D + 11], trottoirLoin: [D + 11, D + 14],
  coin: { x: X0 + 2, z: D + 1 },          // coin de la rue : on y disparaît pour les sorties
  lampes: [{ x: -10, z: D + 2 }, { x: 3, z: D + 2 }, { x: 26, z: D + 2 }, { x: -4, z: D + 11 }, { x: 14, z: D + 11 }, { x: 30, z: D + 11 }],
  palmiers: [{ x: -3, z: D + 2 }, { x: 23, z: D + 2 }, { x: -8, z: D + 12 }, { x: 20, z: D + 12 }],
  taxi: { x: 8, z: D + 4.5, cells: [] },
  banc: { x: 6, z: D + 12 },
  hanout: { x0: -11, x1: -1, porte: -4, caisses: [{ x: -6, z: D }, { x: -5, z: D }] },
  portes: [{ x: -8, z: D }, { x: 27, z: D }, { x: -12, z: D + 13 }, { x: 2, z: D + 13 }, { x: 16, z: D + 13 }, { x: 30, z: D + 13 }],
  traversee: { x0: 10, x1: 12 },
};
for (let x = 6; x <= 9; x++) for (let z = D + 3; z <= D + 5; z++) RUE.taxi.cells.push({ x, z });

// Le café du quartier : une terrasse devant la façade, à droite de l'appartement.
export const CAFE = {
  nom: 'Café du quartier', x0: 13, x1: 24, porte: { x: 22, z: D }, poste: { x: 22, z: D + 1 },
  ouvre: 7, ferme: 23,
  tables: [{ x: 14, z: D }, { x: 17, z: D }, { x: 20, z: D }],
  poteaux: [{ x: 13, z: D + 2 }, { x: 21, z: D + 2 }],
  // r : orientation de la chaise (0 regarde +z, 1 regarde +x, 3 regarde -x). table : index de la table.
  chaises: [
    { x: 13, z: D, r: 1, table: 0 }, { x: 15, z: D, r: 3, table: 0 },
    { x: 16, z: D, r: 1, table: 1 }, { x: 18, z: D, r: 3, table: 1 },
    { x: 19, z: D, r: 1, table: 2 }, { x: 21, z: D, r: 3, table: 2 },
  ],
  options: [
    { id: 'the', nom: 'Boire un thé à la menthe', prix: 10, dur: 45, eff: { moral: 14, social: 18, faim: 4 } },
    { id: 'ptidej', nom: 'Petit-déjeuner : café noir et msemen', prix: 25, dur: 45, eff: { faim: 30, moral: 8, social: 10, energie: 6 }, jusqua: 11.5 },
    { id: 'match', nom: 'Regarder le match', prix: 20, dur: 110, eff: { moral: 26, social: 24, energie: -6 }, match: true },
  ],
};
export const matchEnCours = (jour, h) => (jour >= 5 ? h >= 16 && h < 21 : h >= 20 && h < 23);

// Le hanout (épicerie du coin) : un peu plus cher que le marché, mais à deux pas.
export const HANOUT = {
  nom: 'Hanout de Ba Lahcen', ouvre: 7, ferme: 22, porte: { x: RUE.hanout.porte, z: D }, devant: { x: RUE.hanout.porte, z: D + 1 },
  articles: [
    { id: 'the', nom: 'Thé vert, menthe et sucre', detail: 'Pour une théière (3 verres)', prix: 15 },
    { id: 'msemen', nom: 'Farine, semoule et beurre', detail: 'Pour une fournée de msemen (4 parts)', prix: 22 },
    { id: 'tajine', nom: 'Poulet, légumes et olives', detail: 'Pour un tajine (4 parts)', prix: 90 },
    { id: 'snack', nom: 'Pain, fromage et olives', detail: 'Un casse-croûte, sans cuisiner', prix: 24 },
  ],
};

// Création du personnage
export const SKINS = ['#f3d2b3', '#e6b994', '#d19e78', '#b07a55', '#8a5a3c', '#5e3b26'];
export const HAIRS = { courte: 'Courte', longue: 'Longue', attachee: 'Attachée', foulard: 'Foulard', rasee: 'Rasée' };
export const HAIR_COLORS = ['#1d1714', '#3b2618', '#6b4426', '#8e3b1c', '#9a958f'];
export const SCARF_COLORS = ['#2f4f7a', '#7a2e3a', '#2e6b57', '#c99a3a', '#e8e1d3', '#3a3a3a'];
export const OUTFITS = { djellaba: 'Djellaba', caftan: 'Caftan', jean: 'Jean et t-shirt', costume: 'Costume' };
export const OUTFIT_COLORS = ['#f2ede3', '#8c6a4f', '#2f4f7a', '#2e6b57', '#7a2e3a', '#c99a3a', '#5b3d6e', '#3a3a3a'];
export const TRAITS = {
  gourmand: { nom: 'Gourmand', desc: 'A faim plus vite, mais un bon plat lui fait très plaisir.' },
  travailleur: { nom: 'Travailleur', desc: 'Progresse plus vite au travail.' },
  sociable: { nom: 'Sociable', desc: 'Les discussions et le café lui font bien plus de bien, mais la solitude lui pèse.' },
  soigne: { nom: 'Soigné', desc: "Adore être propre, mais déprime vite quand ce n'est pas le cas." },
  cuisinier: { nom: 'Doué en cuisine', desc: 'Apprend les recettes plus vite.' },
};
export const NEEDS = { faim: 'Faim', energie: 'Énergie', hygiene: 'Hygiène', social: 'Vie sociale', moral: 'Moral' };
export const NEED_ICONS = { faim: 'besoin-faim', energie: 'besoin-energie', hygiene: 'besoin-hygiene', social: 'lieu-cafe', moral: 'besoin-moral' };

// Les voisins. sorties : heures où ils sont dehors. cafe : goût pour la terrasse (0 à 1).
export const NPCS = [
  {
    id: 'driss', nom: 'Si Driss', desc: 'Retraité, habitué de la terrasse. Il connaît le quartier depuis cinquante ans.',
    look: { skin: '#b07a55', hair: 'rasee', hairColor: '#9a958f', outfit: 'djellaba', outfitColor: '#8c6a4f' },
    porte: { x: -8, z: D }, sorties: [[8, 11.5], [16, 19.5]], cafe: 0.85,
    lignes: ["Avant, tout ça c'était des champs, tu sais.", 'Le thé de Hamid, il n\'y a pas mieux dans tout Casa.', 'Tu as vu le match hier ? Quel arbitre…', 'Passe le bonjour à ta famille.'],
  },
  {
    id: 'khadija', nom: 'Lalla Khadija', desc: "Voisine du dessus. Rien de ce qui se passe dans l'immeuble ne lui échappe.",
    look: { skin: '#d19e78', hair: 'foulard', scarfColor: '#7a2e3a', outfit: 'djellaba', outfitColor: '#2e6b57' },
    porte: { x: -8, z: D }, sorties: [[9, 11], [17, 19]], cafe: 0,
    lignes: ['Tu manges bien au moins ? Tu as une petite mine.', "J'ai fait des msemen, je t'en garderai.", 'Il y avait du bruit dans l\'escalier hier soir, ce n\'était pas toi ?', 'Mon fils est à Paris, il appelle tous les dimanches.'],
  },
  {
    id: 'yassine', nom: 'Yassine', desc: 'Étudiant en informatique. Il travaille souvent à la terrasse, un thé à côté de son ordinateur.',
    look: { skin: '#e6b994', hair: 'courte', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#3a3a3a' },
    porte: { x: 27, z: D }, sorties: [[10, 13.5], [18, 22]], cafe: 0.7,
    lignes: ['Je bosse sur une appli, je te montrerai.', 'Le wifi du café est meilleur que celui de la fac.', 'Tu joues au foot ? On cherche quelqu\'un pour dimanche.', 'Examens dans deux semaines, je ne dors plus.'],
  },
  {
    id: 'fz', nom: 'Fatima-Zahra', desc: 'Enseignante dans un collège. Elle part tôt et rentre tard.',
    look: { skin: '#d19e78', hair: 'attachee', hairColor: '#3b2618', outfit: 'costume', outfitColor: '#2f4f7a' },
    porte: { x: -12, z: D + 13 }, sorties: [[7.3, 8], [17.2, 18.6]], cafe: 0.25,
    lignes: ['Mes élèves me fatiguent, mais je les adore.', 'Le tram était encore bondé ce matin.', "Tu sais s'il y a un bon plombier dans le quartier ?", 'Bon courage pour le travail !'],
  },
  {
    id: 'omar', nom: 'Omar', desc: 'Chauffeur de petit taxi. Le rouge garé devant, c\'est le sien.',
    look: { skin: '#8a5a3c', hair: 'courte', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#7a2e3a' },
    porte: { x: 2, z: D + 13 }, sorties: [[12, 14.2], [19, 21.5]], cafe: 0.35, poste: { x: 8, z: D + 2 },
    lignes: ['Je t\'emmène quelque part ? Je rigole, je suis en pause.', 'La circulation à Casa, je ne te raconte pas.', "Le compteur, je le mets toujours, moi.", 'Un jour je m\'achète un grand taxi.'],
  },
  {
    id: 'lahcen', nom: 'Ba Lahcen', desc: "L'épicier. Son hanout est ouvert de 7 h à 22 h, et il fait crédit aux habitués.",
    look: { skin: '#8a5a3c', hair: 'rasee', hairColor: '#9a958f', outfit: 'djellaba', outfitColor: '#f2ede3' },
    porte: { x: RUE.hanout.porte, z: D }, sorties: [[7, 22]], boutique: true,
    lignes: ['Il me reste du pain chaud, tu en veux ?', 'Tu paieras la prochaine fois, je te connais.', 'La menthe est arrivée ce matin, elle sent bon.', 'Dis bonjour à ta mère de ma part.'],
  },
  {
    id: 'hamid', nom: 'Hamid', desc: 'Serveur du café depuis quinze ans. Il connaît la commande de chacun.',
    look: { skin: '#b07a55', hair: 'courte', hairColor: '#3b2618', outfit: 'costume', outfitColor: '#1b1b1b' },
    porte: { x: 22, z: D }, sorties: [[7, 23]], serveur: true,
    lignes: ['Un thé ? Je te l\'apporte tout de suite.', 'Assieds-toi, il y a de la place.', 'Le match commence bientôt, prends une bonne place.', 'Si Driss est déjà là, comme tous les jours.'],
  },
];
export const PASSANTS = [
  { skin: '#e6b994', hair: 'longue', hairColor: '#1d1714', outfit: 'jean', outfitColor: '#2e6b57' },
  { skin: '#b07a55', hair: 'courte', hairColor: '#1d1714', outfit: 'costume', outfitColor: '#3a3a3a' },
  { skin: '#d19e78', hair: 'foulard', scarfColor: '#c99a3a', outfit: 'caftan', outfitColor: '#5b3d6e' },
  { skin: '#5e3b26', hair: 'rasee', hairColor: '#1d1714', outfit: 'djellaba', outfitColor: '#f2ede3' },
];
export const SALUTS = ['Salam ! Ça va ?', 'Labas ? Et la famille ?', 'Bonjour ! Quelle chaleur aujourd\'hui.', 'Ah, te voilà ! Ça va ?'];
export const REL_LABELS = [[80, 'Proche'], [50, 'Ami(e)'], [20, 'Connaissance'], [1, 'Voisin(e)'], [0, 'Inconnu(e)']];
export const relLabel = v => REL_LABELS.find(([min]) => v >= min)[1];

// Meubles. w et d : taille en cases. assise : hauteur du siège. img : vignette dans assets/.
export const CATS = { salon: 'Salon', chambre: 'Chambre', cuisine: 'Cuisine', eau: "Salle d'eau", deco: 'Déco' };
export const FURN = {
  banquette: { nom: 'Banquette de salon marocain', prix: 1500, w: 2, d: 1, cat: 'salon', beaute: 2, assise: 0.45, actions: ['detente', 'manger', 'boire'], img: 'meuble-banquette' },
  mida: { nom: 'Table basse ronde (mida)', prix: 450, w: 1, d: 1, cat: 'salon', beaute: 1, actions: ['manger', 'boire'], img: 'meuble-mida' },
  pouf: { nom: 'Pouf en cuir', prix: 250, w: 1, d: 1, cat: 'salon', beaute: 1, assise: 0.35, actions: ['detente', 'manger', 'boire'], img: 'meuble-pouf' },
  tv: { nom: 'Télévision', prix: 2500, w: 1, d: 1, cat: 'salon', beaute: 0, actions: ['tele'], img: 'meuble-tv' },
  tapis: { nom: 'Tapis berbère', prix: 900, w: 2, d: 2, cat: 'salon', beaute: 3, sol: true, actions: [], img: 'meuble-tapis' },
  lit: { nom: 'Lit double', prix: 1800, w: 2, d: 2, cat: 'chambre', beaute: 1, actions: ['dormir', 'sieste'], img: 'meuble-lit' },
  lit1: { nom: 'Lit simple', prix: 900, w: 1, d: 2, cat: 'chambre', beaute: 0, actions: ['dormir', 'sieste'], img: 'meuble-lit-simple' },
  armoire: { nom: 'Armoire en bois', prix: 1400, w: 2, d: 1, cat: 'chambre', beaute: 1, actions: [], img: 'meuble-armoire' },
  cuisiniere: { nom: 'Cuisinière à gaz', prix: 1500, w: 1, d: 1, cat: 'cuisine', beaute: 0, actions: ['cuisiner'], img: 'meuble-cuisiniere' },
  frigo: { nom: 'Réfrigérateur', prix: 2800, w: 1, d: 1, cat: 'cuisine', beaute: 0, actions: ['manger', 'boire', 'casse'], img: 'meuble-frigo' },
  plan: { nom: 'Plan de travail', prix: 600, w: 1, d: 1, cat: 'cuisine', beaute: 0, actions: [], img: 'meuble-plan' },
  table: { nom: 'Table et tabourets', prix: 1200, w: 2, d: 1, cat: 'cuisine', beaute: 1, actions: ['manger', 'boire'], img: 'meuble-table' },
  douche: { nom: 'Douche', prix: 1200, w: 1, d: 1, cat: 'eau', beaute: 0, actions: ['douche'], img: 'meuble-douche' },
  lanterne: { nom: 'Lanterne en fer forgé', prix: 300, w: 1, d: 1, cat: 'deco', beaute: 2, lumiere: true, actions: [], img: 'meuble-lanterne' },
  jarre: { nom: 'Grande jarre en terre cuite', prix: 350, w: 1, d: 1, cat: 'deco', beaute: 2, actions: [], img: 'meuble-jarre' },
  plante: { nom: 'Plante en pot', prix: 150, w: 1, d: 1, cat: 'deco', beaute: 1, actions: [], img: 'meuble-plante' },
};

// Actions à la maison. rates : effet par heure, en plus de l'usure normale.
export const ACT = {
  dormir: { label: 'Dormir', pose: 'lie', until: 'energie', rates: { energie: 17, faim: 2.5, hygiene: 1.5, moral: 2 } },
  sieste: { label: 'Faire une sieste (1 h)', pose: 'lie', dur: 60, rates: { energie: 15, moral: 1 } },
  douche: { label: 'Prendre une douche', pose: 'shower', dur: 20, rates: { hygiene: 270, moral: 10 } },
  detente: { label: 'Se détendre (1 h)', pose: 'sit', dur: 60, rates: { energie: 4, moral: 10 } },
  tele: { label: 'Regarder la télé (1 h)', pose: 'sit', anim: 'tv', dur: 60, rates: { moral: 14, energie: -1 } },
  cuisiner: { pose: 'stand', anim: 'cook' },
  manger: { pose: 'stand', anim: 'eat', dur: 25 },
  boire: { pose: 'stand', anim: 'eat', dur: 10 },
  casse: { label: 'Casse-croûte : pain, fromage et olives', pose: 'stand', anim: 'eat', dur: 15 },
  evanoui: { label: 'Endormi sur place', pose: 'lie', dur: 180, rates: { energie: 13, faim: 2.5 } },
};

// Recettes. d : difficulté. faim et moral : effet d'une part.
export const RECETTES = {
  the: { nom: 'Thé à la menthe', d: 0, dur: 15, portions: 3, faim: 4, moral: 6, xp: 0.35 },
  msemen: { nom: 'Msemen', d: 2, dur: 45, portions: 4, faim: 22, moral: 5, xp: 0.6 },
  tajine: { nom: 'Tajine de poulet aux olives', d: 4, dur: 120, portions: 4, faim: 55, moral: 10, xp: 1 },
};
export const QUAL = ['raté', 'correct', 'délicieux'];
export const QUAL_MORAL = [-6, 2, 10];

export const MARCHE = [
  { id: 'the', nom: 'Thé vert, menthe et sucre', detail: 'Pour une théière (3 verres)', prix: 12 },
  { id: 'msemen', nom: 'Farine, semoule et beurre', detail: 'Pour une fournée de msemen (4 parts)', prix: 18 },
  { id: 'tajine', nom: 'Poulet, légumes, olives et citron confit', detail: 'Pour un tajine (4 parts)', prix: 75 },
  { id: 'snack', nom: 'Pain, fromage et olives', detail: 'Un casse-croûte, sans cuisiner', prix: 20 },
];

// Sorties hors du quartier (on part depuis le coin de la rue). trajet : minutes, aller simple.
export const LIEUX = {
  hammam: {
    nom: 'Hammam du quartier', trajet: 8, ici: 'Au hammam', img: 'illu-hammam',
    desc: 'Vapeur, savon noir et discussions. À deux rues d\'ici.',
    options: [
      { id: 'simple', nom: 'Hammam', prix: 20, dur: 90, eff: { hygiene: 100, moral: 12, social: 10, energie: -4 }, social: true },
      { id: 'gommage', nom: 'Hammam avec gommage au savon noir', prix: 70, dur: 120, eff: { hygiene: 100, moral: 28, social: 12 }, social: true },
    ],
  },
  marche: { nom: 'Marché du quartier', trajet: 8, ici: 'Au marché', dur: 30, img: 'illu-marche' },
  travail: { nom: 'Travail', trajet: 25, ici: 'Au travail', img: 'illu-travail' },
};

export const JOB = [
  { titre: 'Assistant(e) administratif(ve)', salaire: 1300 },
  { titre: 'Employé(e) de bureau', salaire: 1600 },
  { titre: 'Chef(fe) de service', salaire: 2200 },
];

// Construction
export const FLOORS = {
  carrelage: { nom: 'Carrelage beige', prix: 60, beaute: 0, img: 'sol-carrelage-beige' },
  terre: { nom: 'Terre cuite', prix: 90, beaute: 0.5, img: 'sol-terre-cuite' },
  parquet: { nom: 'Parquet', prix: 120, beaute: 0.5, img: 'sol-parquet' },
  zellige_vert: { nom: 'Zellige vert', prix: 250, beaute: 1, img: 'sol-zellige-vert' },
  zellige_bleu: { nom: 'Zellige bleu', prix: 250, beaute: 1, img: 'sol-zellige-bleu' },
  marbre: { nom: 'Marbre blanc', prix: 350, beaute: 1, img: 'sol-marbre' },
};
export const WALL_COLORS = {
  chaux: { nom: 'Blanc chaux', c: '#f1ece2' },
  sable: { nom: 'Sable', c: '#e4d3b4' },
  ocre: { nom: 'Ocre de Marrakech', c: '#d08c5b' },
  terre: { nom: 'Terre cuite', c: '#b9674a' },
  menthe: { nom: 'Vert menthe', c: '#a9cdb5' },
  majorelle: { nom: 'Bleu Majorelle', c: '#4f5bd5' },
};
export const WAINSCOTS = { vert: 'Zellige vert', bleu: 'Zellige bleu', aucun: 'Sans zellige' };
export const PAINT_PRICE = 300;
export const WAINSCOT_PRICE = 400;
export const WALL_PRICES = { wall: 80, door: 350, window: 500 };

// Images fournies (dossier assets/). crop : bords à rogner (gauche, haut, droite, bas), en fraction.
export const IMG = {
  'sol-carrelage-beige': { crop: [0.065, 0.012, 0.01, 0.01] },
  'sol-terre-cuite': { crop: [0.02, 0.02, 0.02, 0.02] },
  'sol-parquet': { crop: [0.035, 0.02, 0.008, 0.008] },
  'sol-zellige-vert': { crop: [0.01, 0.01, 0.01, 0.01] },
  'sol-zellige-bleu': { crop: [0.01, 0.01, 0.01, 0.01] },
  'sol-marbre': { crop: [0.06, 0.03, 0.006, 0.006] },
  'mur-tadelakt': { crop: [0.01, 0.065, 0.01, 0.01] },
  'tissu-banquette': { crop: [0.03, 0.07, 0.02, 0.02] },
  'tapis-berbere': { crop: [0, 0.07, 0.01, 0.01] },
};
export const asset = name => `assets/${name}.png`;
