// Données du jeu : catalogue, recettes, lieux et réglages.

export const W = 12, D = 9; // taille de l'appartement en cases (1 case = 1 m)
export const SAVE_KEY = 'jeu-maroc-v1';
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const START_MONEY = 5000;
export const LOYER = 700;   // par semaine (environ 2 800 DH par mois)
export const FACTURE = 120; // eau et électricité, par semaine
export const WALK = 1.6;    // cases parcourues par minute de jeu
export const SPEEDS = [0, 1, 3, 10]; // minutes de jeu par seconde réelle

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
  sociable: { nom: 'Sociable', desc: 'Le café et le hammam lui remontent bien plus le moral.' },
  soigne: { nom: 'Soigné', desc: "Adore être propre, mais déprime vite quand ce n'est pas le cas." },
  cuisinier: { nom: 'Doué en cuisine', desc: 'Apprend les recettes plus vite.' },
};
export const NEEDS = { faim: 'Faim', energie: 'Énergie', hygiene: 'Hygiène', moral: 'Moral' };

// Meubles. w et d : taille en cases. assise : hauteur du siège.
export const CATS = { salon: 'Salon', chambre: 'Chambre', cuisine: 'Cuisine', eau: "Salle d'eau", deco: 'Déco' };
export const FURN = {
  banquette: { nom: 'Banquette de salon marocain', prix: 1500, w: 2, d: 1, cat: 'salon', beaute: 2, assise: 0.45, actions: ['detente', 'manger', 'boire'] },
  mida: { nom: 'Table basse ronde (mida)', prix: 450, w: 1, d: 1, cat: 'salon', beaute: 1, actions: ['manger', 'boire'] },
  pouf: { nom: 'Pouf en cuir', prix: 250, w: 1, d: 1, cat: 'salon', beaute: 1, assise: 0.35, actions: ['detente', 'manger', 'boire'] },
  tv: { nom: 'Télévision', prix: 2500, w: 1, d: 1, cat: 'salon', beaute: 0, actions: ['tele'] },
  tapis: { nom: 'Tapis berbère', prix: 900, w: 2, d: 2, cat: 'salon', beaute: 3, sol: true, actions: [] },
  lit: { nom: 'Lit double', prix: 1800, w: 2, d: 2, cat: 'chambre', beaute: 1, actions: ['dormir', 'sieste'] },
  lit1: { nom: 'Lit simple', prix: 900, w: 1, d: 2, cat: 'chambre', beaute: 0, actions: ['dormir', 'sieste'] },
  armoire: { nom: 'Armoire en bois', prix: 1400, w: 2, d: 1, cat: 'chambre', beaute: 1, actions: [] },
  cuisiniere: { nom: 'Cuisinière à gaz', prix: 1500, w: 1, d: 1, cat: 'cuisine', beaute: 0, actions: ['cuisiner'] },
  frigo: { nom: 'Réfrigérateur', prix: 2800, w: 1, d: 1, cat: 'cuisine', beaute: 0, actions: ['manger', 'boire', 'casse'] },
  plan: { nom: 'Plan de travail', prix: 600, w: 1, d: 1, cat: 'cuisine', beaute: 0, actions: [] },
  table: { nom: 'Table et tabourets', prix: 1200, w: 2, d: 1, cat: 'cuisine', beaute: 1, actions: ['manger', 'boire'] },
  douche: { nom: 'Douche', prix: 1200, w: 1, d: 1, cat: 'eau', beaute: 0, actions: ['douche'] },
  lanterne: { nom: 'Lanterne en fer forgé', prix: 300, w: 1, d: 1, cat: 'deco', beaute: 2, lumiere: true, actions: [] },
  jarre: { nom: 'Grande jarre en terre cuite', prix: 350, w: 1, d: 1, cat: 'deco', beaute: 2, actions: [] },
  plante: { nom: 'Plante en pot', prix: 150, w: 1, d: 1, cat: 'deco', beaute: 1, actions: [] },
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

// Sorties. trajet : minutes à pied ou en tram, aller simple. eff : effet total de l'activité.
export const LIEUX = {
  cafe: {
    nom: 'Café du quartier', trajet: 5, ici: 'Au café du quartier',
    desc: 'Le café du coin, ses habitués, son thé et ses matchs.',
    options: [
      { id: 'the', nom: 'Boire un thé à la menthe', prix: 10, dur: 45, eff: { moral: 15, faim: 4 }, social: true },
      { id: 'ptidej', nom: 'Petit-déjeuner : café noir et msemen', prix: 25, dur: 45, eff: { faim: 30, moral: 8, energie: 6 } },
      { id: 'match', nom: 'Regarder le match avec les habitués', prix: 20, dur: 120, eff: { moral: 30, energie: -6 }, social: true },
    ],
  },
  hammam: {
    nom: 'Hammam du quartier', trajet: 10, ici: 'Au hammam',
    desc: 'Vapeur, savon noir et discussions.',
    options: [
      { id: 'simple', nom: 'Hammam', prix: 20, dur: 90, eff: { hygiene: 100, moral: 12, energie: -4 }, social: true },
      { id: 'gommage', nom: 'Hammam avec gommage au savon noir', prix: 70, dur: 120, eff: { hygiene: 100, moral: 28 }, social: true },
    ],
  },
  marche: { nom: 'Marché du quartier', trajet: 10, ici: 'Au marché', dur: 30 },
  travail: { nom: 'Travail', trajet: 30, ici: 'Au travail' },
};

export const JOB = [
  { titre: 'Assistant(e) administratif(ve)', salaire: 1300 },
  { titre: 'Employé(e) de bureau', salaire: 1600 },
  { titre: 'Chef(fe) de service', salaire: 2200 },
];

// Construction
export const FLOORS = {
  carrelage: { nom: 'Carrelage beige', prix: 60, beaute: 0 },
  terre: { nom: 'Terre cuite', prix: 90, beaute: 0.5 },
  parquet: { nom: 'Parquet', prix: 120, beaute: 0.5 },
  zellige_vert: { nom: 'Zellige vert', prix: 250, beaute: 1 },
  zellige_bleu: { nom: 'Zellige bleu', prix: 250, beaute: 1 },
  marbre: { nom: 'Marbre blanc', prix: 350, beaute: 1 },
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
