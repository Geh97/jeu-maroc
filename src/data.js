// Données du jeu : catalogue, recettes, lieux, quartier, voisins et réglages.

export const W = 12, D = 9; // taille de l'appartement en cases (1 case = 1 m)
export const SAVE_KEY = 'jeu-maroc-v1';
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const WALK = 1.8;    // cases parcourues par minute de jeu
export const SPEEDS = [0, 1, 3, 10]; // minutes de jeu par seconde réelle

// Le quartier : l'appartement est à l'origine, la rue passe devant (z croissant).
export const X0 = -20, X1 = 32, Z0 = 0, Z1 = D + 19;
export const RUE = {
  trottoir: [D, D + 3], route: [D + 3, D + 11], trottoirLoin: [D + 11, D + 14],
  coin: { x: X0 + 2, z: D + 1 },          // coin de la rue : on y disparaît pour les sorties
  lampes: [{ x: -10, z: D + 2 }, { x: 3, z: D + 2 }, { x: 26, z: D + 2 }, { x: -4, z: D + 11 }, { x: 22, z: D + 11 }, { x: 30, z: D + 11 }],
  palmiers: [{ x: -3, z: D + 2 }, { x: 23, z: D + 2 }, { x: -8, z: D + 12 }, { x: 20, z: D + 12 }],
  taxi: { x: 8, z: D + 4.5, cells: [] },
  banc: { x: 24, z: D + 12 },
  hanout: { x0: -7, x1: -1, porte: -4, caisses: [{ x: -6, z: D }, { x: -5, z: D }] },
  four: { x0: -16, x1: -10, porte: -13 },            // le four du quartier (boulangerie traditionnelle)
  mahlaba: { x0: 25, x1: 31, porte: 27 },             // la laiterie
  charrette: { x: -15, z: D + 1, cells: [{ x: -15, z: D + 1 }, { x: -14, z: D + 1 }] },
  portes: [{ x: -8, z: D }, { x: 27, z: D }, { x: -12, z: D + 13 }, { x: -4, z: D + 13 }, { x: 22, z: D + 13 }, { x: 30, z: D + 13 }],
  traversee: { x0: 10, x1: 12 },
};
for (let x = 6; x <= 9; x++) for (let z = D + 3; z <= D + 5; z++) RUE.taxi.cells.push({ x, z });
// La placette en face : fontaine en zellige, orangers, bancs, et la mosquée du quartier au fond.
export const PLACE = {
  x0: 2, x1: 18, z0: D + 11, z1: D + 19,
  fontaine: { x: 10, z: D + 15, cells: [] },
  orangers: [{ x: 3, z: D + 12 }, { x: 16, z: D + 12 }, { x: 3, z: D + 17 }, { x: 16, z: D + 17 }],
  bancs: [{ x: 6, z: D + 18, r: 2 }, { x: 12, z: D + 18, r: 2 }],
  mosquee: { x0: 2, x1: 18, z: D + 19, porte: 10 },
};
for (let x = 8; x <= 11; x++) for (let z = D + 13; z <= D + 16; z++) PLACE.fontaine.cells.push({ x, z });

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
    { id: 'the', nom: 'Thé à la menthe', prix: 10, dur: 45, eff: { moral: 14, social: 18, faim: 4 } },
    { id: 'cafe', nom: 'Café noir (nous-nous)', prix: 8, dur: 30, eff: { moral: 8, social: 10, energie: 10 } },
    { id: 'jus', nom: "Jus d'orange pressé", prix: 12, dur: 30, eff: { moral: 10, social: 8, faim: 8, energie: 4 } },
    { id: 'ptidej', nom: 'Petit-déjeuner : café noir et msemen', prix: 25, dur: 45, eff: { faim: 30, moral: 8, social: 10, energie: 6 }, jusqua: 11.5 },
    { id: 'sandwich', nom: 'Sandwich de midi (kefta, frites)', prix: 22, dur: 40, eff: { faim: 40, moral: 6, social: 8 }, de: 11.5, jusqua: 15 },
    { id: 'journal', nom: 'Lire le journal avec un thé', prix: 14, dur: 50, eff: { moral: 16, social: 6, faim: 4 } },
    { id: 'cartes', nom: 'Jouer aux cartes (ronda) avec un voisin', prix: 10, dur: 60, eff: { moral: 18, social: 26, faim: 4 }, voisin: true },
    { id: 'match', nom: 'Regarder le match', prix: 20, dur: 110, eff: { moral: 26, social: 24, energie: -6 }, match: true },
  ],
};
export const matchEnCours = (jour, h) => (jour >= 5 ? h >= 16 && h < 21 : h >= 20 && h < 23);

// Le hanout (épicerie du coin) : un peu plus cher que le marché, mais à deux pas.
export const HANOUT = {
  nom: 'Hanout de Ba Lahcen', ouvre: 7, ferme: 22, porte: { x: RUE.hanout.porte, z: D }, devant: { x: RUE.hanout.porte, z: D + 1 },
  articles: [
    { id: 'the', nom: 'Thé vert, menthe et sucre', detail: 'Pour une théière (3 verres)', prix: 15 },
    { id: 'loubia', nom: 'Haricots blancs, tomates et épices', detail: 'Pour une loubia (4 parts)', prix: 17 },
    { id: 'msemen', nom: 'Farine, semoule et beurre', detail: 'Pour une fournée de msemen (4 parts)', prix: 22 },
    { id: 'harira', nom: 'Lentilles, pois chiches et tomates', detail: 'Pour une marmite de harira (6 parts)', prix: 36 },
    { id: 'tajine', nom: 'Poulet, légumes et olives', detail: 'Pour un tajine (4 parts)', prix: 90 },
    { id: 'snack', nom: 'Pain, fromage et olives', detail: 'Un casse-croûte, sans cuisiner', prix: 24 },
    { id: 'patee', nom: 'Restes de poulet et croquettes', detail: 'Pour nourrir un chien ou un chat', prix: 8 },
  ],
};

// Les animaux errants du quartier. On les apprivoise en les nourrissant, puis on peut les adopter.
export const ANIMAUX = [
  { id: 'chien', espece: 'chien', nom: 'Chien errant', desc: 'Un chien beige qui traîne près du café, la queue basse. Il a faim.', couleur: '#c8a46a', coin: { x: 23, z: D + 1 }, vitesse: 2 },
  { id: 'chat', espece: 'chat', nom: 'Chat de gouttière', desc: 'Un chat gris tigré, méfiant, souvent sous le palmier.', couleur: '#8a8378', coin: { x: -3, z: D + 1 }, vitesse: 1.8 },
];
export const ADOPT_SEUIL = 70;

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
export const MILIEU_IDS = ['populaire', 'moyen', 'aise'];

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

// Sujets de discussion. Chaque voisin a ses goûts : 1 il aime, 0 indifférent, -1 ça l'agace.
export const SUJETS = [
  { id: 'nouvelles', label: 'Demander des nouvelles', rel: 0, dur: 8 },
  { id: 'quartier', label: 'Parler du quartier', rel: 0, dur: 10 },
  { id: 'foot', label: 'Parler foot', rel: 0, dur: 10 },
  { id: 'blague', label: 'Raconter une blague', rel: 10, dur: 5 },
  { id: 'confier', label: 'Se confier', rel: 40, dur: 15 },
];
export const GOUTS = {
  driss: { nouvelles: 1, quartier: 1, foot: 1, blague: 0, confier: 1 },
  khadija: { nouvelles: 1, quartier: 1, foot: -1, blague: -1, confier: 1 },
  yassine: { nouvelles: 0, quartier: 0, foot: 1, blague: 1, confier: 0 },
  fz: { nouvelles: 1, quartier: 0, foot: -1, blague: 0, confier: 1 },
  omar: { nouvelles: 0, quartier: 1, foot: 1, blague: 1, confier: 0 },
  hamid: { nouvelles: 1, quartier: 1, foot: 1, blague: 0, confier: -1 },
  lahcen: { nouvelles: 1, quartier: 1, foot: 0, blague: 1, confier: 0 },
};
// Réponses selon la réaction : [aime, indifférent, agacé].
export const REPONSES = {
  nouvelles: [['Ça va, hamdullah. Et toi, et la famille ?', 'On fait aller ! Raconte-moi plutôt, toi.'], ['Ça va, ça va.'], ['Rien de spécial.']],
  quartier: [['Tu as vu, ils refont le trottoir en bas de la rue.', 'Le nouveau du troisième, tu l\'as croisé ? Bizarre, celui-là.'], ['Bof, rien ne change ici.'], ['Je ne suis pas du genre à parler des gens, moi.']],
  foot: [['Le Raja cette saison, je ne comprends plus rien.', 'Dimanche c\'est le derby. Tu viens le voir au café ?'], ['Je ne suis pas trop foot, tu sais.'], ['Le foot, le foot… il n\'y a que ça qui vous intéresse ?']],
  blague: [['Ha ! Celle-là, je vais la ressortir.', 'Pas mal, pas mal. Tu en as d\'autres ?'], ['Hm. D\'accord.'], ['Ce n\'est pas très drôle, ça.']],
  confier: [['Tu peux me parler, tu sais. Ça va aller.', 'Courage. Si tu as besoin de quoi que ce soit, je suis là.'], ['Je comprends.'], ['Je n\'ai pas trop le temps là, désolé.']],
};

// Événements au travail : un par journée, avec un choix. Les effets touchent la performance (chef),
// l'ambiance avec les collègues, la compétence, le moral, l'énergie, l'argent, et parfois une heure de plus.
export const EVENEMENTS = [
  { id: 'heures_sup', texte: 'Ton chef te demande de rester une heure de plus ce soir pour finir un dossier urgent.', choix: [
    { label: 'Rester', eff: { perf: 8, energie: -10, heures: 1 }, suite: 'Le chef a apprécié. Tu rentres plus tard.' },
    { label: 'Refuser poliment', eff: { perf: -4, moral: 4 }, suite: "Il n'a rien dit, mais il a noté." },
  ] },
  { id: 'erreur', texte: "Un collègue a fait une erreur qui va se voir. Il te demande de ne rien dire.", choix: [
    { label: 'Le couvrir', eff: { collegues: 12, perf: -3 }, suite: 'Il te doit une faveur. Le chef, lui, a trouvé le travail bâclé.' },
    { label: "L'aider à corriger discrètement", eff: { collegues: 8, perf: 2, energie: -6, competence: 0.1 }, suite: 'Deux heures de plus, mais personne n\'a rien vu.' },
    { label: 'Dire la vérité au chef', eff: { perf: 6, collegues: -10, moral: -3 }, suite: 'Le chef te félicite. Le collègue ne te parle plus.' },
  ] },
  { id: 'pause', texte: 'Les collègues descendent prendre un café. Tu as du travail en retard.', choix: [
    { label: 'Y aller avec eux', eff: { social: 12, moral: 6, perf: -3, collegues: 5 }, suite: 'Un bon moment. Le dossier attendra.' },
    { label: 'Rester travailler', eff: { perf: 5, social: -2, collegues: -2 }, suite: 'Le dossier est bouclé. Ils ont parlé de toi, en bas.' },
  ] },
  { id: 'formation', texte: 'On propose une formation le soir, à tes frais : 200 DH.', choix: [
    { label: "S'inscrire (200 DH)", eff: { money: -200, competence: 0.8, energie: -8 }, suite: 'Tu as appris des choses utiles.' },
    { label: 'Non merci', eff: { moral: 1 }, suite: 'Soirée tranquille.' },
  ] },
  { id: 'client', texte: "Un client s'énerve contre toi devant tout le monde.", choix: [
    { label: "Rester calme et s'excuser", eff: { perf: 6, moral: -6 }, suite: 'Le chef a vu que tu gères. Ça t\'a quand même gâché la journée.' },
    { label: 'Répondre sèchement', eff: { perf: -8, moral: 4, collegues: 3 }, suite: 'Les collègues ont ri. Le chef, non.' },
    { label: 'Appeler le chef', eff: { collegues: -2 }, suite: 'Le chef a réglé ça. Les collègues te trouvent un peu mou.' },
  ] },
  { id: 'merite', texte: "Le chef attribue à quelqu'un d'autre le mérite de ton travail.", choix: [
    { label: 'Le faire remarquer calmement', eff: { perf: 3, moral: 2, collegues: -2 }, suite: 'Il a corrigé, un peu gêné.' },
    { label: 'Laisser passer', eff: { moral: -8, perf: 1 }, suite: 'Tu rumines toute la journée.' },
    { label: "S'en plaindre aux collègues", eff: { collegues: 6, moral: 2, perf: -4 }, suite: 'Ça a fini par remonter au chef.' },
  ] },
  { id: 'prime', texte: 'Un collègue te propose de demander ensemble une prime au chef.', choix: [
    { label: 'Y aller ensemble', cond: 'perf70', ok: { money: 300, collegues: 8 }, ko: { perf: -6, collegues: 5 }, suiteOk: 'Avec ta bonne performance, le chef accepte : 300 DH !', suiteKo: 'Le chef le prend mal : « Avec ces résultats ? »' },
    { label: 'Laisser tomber', eff: { collegues: -3 }, suite: 'Il y est allé seul.' },
  ] },
  { id: 'sommeil', texte: 'Après le déjeuner, tu piques du nez.', choix: [
    { label: 'Un café serré (5 DH)', eff: { energie: 8, money: -5 }, suite: 'Ça repart.' },
    { label: 'Vingt minutes de sieste discrète', cond: 'chance50', ok: { energie: 15 }, ko: { energie: 15, perf: -8 }, suiteOk: 'Personne n\'a rien vu.', suiteKo: 'Le chef est passé pile à ce moment-là.' },
  ] },
  { id: 'liquide', milieux: ['populaire'], texte: 'Un client veut payer en liquide, sans facture, moins cher. Tu encaisserais la différence.', choix: [
    { label: 'Accepter', cond: 'chance60', ok: { money: 80 }, ko: { money: 80, perf: -12 }, suiteOk: '80 DH dans la poche.', suiteKo: 'Le patron l\'a appris. Il est furieux.' },
    { label: 'Refuser', eff: { perf: 4, moral: 2 }, suite: 'Le client est parti. Le patron a apprécié ton honnêteté.' },
  ] },
  { id: 'bilan', milieux: ['moyen'], texte: 'Le directeur cherche un volontaire pour présenter le bilan vendredi.', choix: [
    { label: 'Se porter volontaire', eff: { perf: 10, energie: -10, moral: -4, competence: 0.2 }, suite: 'Stressant, mais remarqué.' },
    { label: 'Laisser un collègue y aller', eff: { collegues: 4, perf: -2 }, suite: 'Il t\'a remercié.' },
  ] },
  { id: 'cousin', milieux: ['aise'], texte: "Ton père te demande de superviser ton cousin, qui ne fait pas grand-chose au bureau.", choix: [
    { label: 'Le couvrir', eff: { moral: 4, collegues: -8, perf: -2 }, suite: 'La famille est contente. Les collègues, moins.' },
    { label: 'Le recadrer', eff: { collegues: 8, perf: 6, moral: -4 }, suite: 'Il boude, mais l\'équipe respire.' },
  ] },
  { id: 'cadeau', milieux: ['aise'], texte: 'Un fournisseur t\'offre un beau cadeau pour que tu signes avec lui.', choix: [
    { label: 'Accepter', cond: 'chance50', ok: { money: 500 }, ko: { money: 500, perf: -15, moral: -5 }, suiteOk: 'Personne n\'a rien su.', suiteKo: 'Ton père l\'a appris. La discussion a été longue.' },
    { label: 'Refuser', eff: { perf: 6, moral: 2 }, suite: 'Tu as dormi tranquille.' },
  ] },
];
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
  biblio: { nom: 'Bibliothèque', prix: 800, w: 2, d: 1, cat: 'salon', beaute: 2, actions: ['lire', 'lire_cuisine', 'lire_metier'] },
  plante: { nom: 'Plante en pot', prix: 150, w: 1, d: 1, cat: 'deco', beaute: 1, actions: [], img: 'meuble-plante' },
};

// Actions à la maison. rates : effet par heure, en plus de l'usure normale.
export const ACT = {
  dormir: { label: 'Dormir', pose: 'lie', until: 'energie', rates: { energie: 17, faim: 2.5, hygiene: 1.5, moral: 2 } },
  sieste: { label: 'Faire une sieste (1 h)', pose: 'lie', dur: 60, rates: { energie: 15, moral: 1 } },
  douche: { label: 'Prendre une douche', pose: 'shower', dur: 20, rates: { hygiene: 270, moral: 10 } },
  detente: { label: 'Se détendre (1 h)', pose: 'sit', dur: 60, rates: { energie: 4, moral: 10 } },
  tele: { label: 'Regarder la télé (1 h)', pose: 'sit', anim: 'tv', dur: 60, rates: { moral: 14, energie: -1 } },
  lire: { label: 'Lire un roman (1 h)', pose: 'sit', anim: 'read', dur: 60, rates: { moral: 14, energie: 3 } },
  lire_cuisine: { label: 'Lire un livre de cuisine (1 h)', pose: 'sit', anim: 'read', dur: 60, rates: { moral: 5, energie: 2 }, cuisine: 0.25 },
  lire_metier: { label: 'Étudier pour le travail (1 h)', pose: 'sit', anim: 'read', dur: 60, rates: { moral: -2, energie: -3 }, competence: 0.35 },
  cuisiner: { pose: 'stand', anim: 'cook' },
  manger: { pose: 'stand', anim: 'eat', dur: 25 },
  boire: { pose: 'stand', anim: 'eat', dur: 10 },
  casse: { label: 'Casse-croûte : pain, fromage et olives', pose: 'stand', anim: 'eat', dur: 15 },
  evanoui: { label: 'Endormi sur place', pose: 'lie', dur: 180, rates: { energie: 13, faim: 2.5 } },
};

// Recettes. d : difficulté. faim et moral : effet d'une part.
export const RECETTES = {
  the: { nom: 'Thé à la menthe', d: 0, dur: 15, portions: 3, faim: 4, moral: 6, xp: 0.35 },
  loubia: { nom: 'Loubia (haricots blancs en sauce)', d: 1, dur: 60, portions: 4, faim: 40, moral: 6, xp: 0.5 },
  msemen: { nom: 'Msemen', d: 2, dur: 45, portions: 4, faim: 22, moral: 5, xp: 0.6 },
  harira: { nom: 'Harira', d: 3, dur: 90, portions: 6, faim: 35, moral: 9, xp: 0.8 },
  tajine: { nom: 'Tajine de poulet aux olives', d: 4, dur: 120, portions: 4, faim: 55, moral: 10, xp: 1 },
  couscous: { nom: 'Couscous aux sept légumes', d: 5, dur: 150, portions: 6, faim: 60, moral: 14, xp: 1.2, vendredi: true },
  rfissa: { nom: 'Rfissa', d: 6, dur: 180, portions: 6, faim: 60, moral: 16, xp: 1.4 },
  chebakia: { nom: 'Chebakia', d: 7, dur: 150, portions: 12, faim: 8, moral: 8, xp: 1.6 },
};
export const PLATS_SUCRES = ['the', 'chebakia'];
export const QUAL = ['raté', 'correct', 'délicieux'];
export const QUAL_MORAL = [-6, 2, 10];

export const MARCHE = [
  { id: 'the', nom: 'Thé vert, menthe et sucre', detail: 'Pour une théière (3 verres)', prix: 12 },
  { id: 'loubia', nom: 'Haricots blancs, tomates et épices', detail: 'Pour une loubia (4 parts)', prix: 14 },
  { id: 'msemen', nom: 'Farine, semoule et beurre', detail: 'Pour une fournée de msemen (4 parts)', prix: 18 },
  { id: 'harira', nom: 'Lentilles, pois chiches, tomates et viande', detail: 'Pour une marmite de harira (6 parts)', prix: 30 },
  { id: 'tajine', nom: 'Poulet, légumes, olives et citron confit', detail: 'Pour un tajine (4 parts)', prix: 75 },
  { id: 'couscous', nom: 'Semoule, légumes et viande', detail: 'Pour un couscous (6 parts)', prix: 90 },
  { id: 'rfissa', nom: 'Poulet, lentilles, msemen et fenugrec', detail: 'Pour une rfissa (6 parts)', prix: 110 },
  { id: 'chebakia', nom: 'Farine, miel, sésame et amandes', detail: 'Pour une fournée de chebakia (12 pièces)', prix: 45 },
  { id: 'snack', nom: 'Pain, fromage et olives', detail: 'Un casse-croûte, sans cuisiner', prix: 20 },
  { id: 'patee', nom: 'Restes de poulet et croquettes', detail: 'Pour nourrir un chien ou un chat', prix: 6 },
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

// Les milieux : d'où vient le personnage, et donc comment il gagne sa vie. Loyer et factures à la semaine.
export const MILIEUX = {
  populaire: {
    nom: 'Enfant du quartier', argent: 1500, loyer: 450, facture: 90,
    desc: 'Grandi ici. Peu d\'argent au départ, un petit appartement, mais tout le quartier te connaît : petits boulots, plats à vendre et daret.',
    revenus: ['boulots', 'vente', 'daret'],
    jobs: [
      { titre: 'Apprenti(e) chez le mécanicien', salaire: 900 },
      { titre: 'Mécanicien(ne)', salaire: 1300 },
      { titre: 'Chef(fe) d\'atelier', salaire: 1900 },
    ],
  },
  moyen: {
    nom: 'Classe moyenne', argent: 5000, loyer: 700, facture: 120,
    desc: 'Un emploi de bureau, un loyer à payer, et des voisins qui peuvent te proposer des cours particuliers ou des missions. La daret aide pour les gros achats.',
    revenus: ['cours', 'daret'],
    jobs: [
      { titre: 'Assistant(e) administratif(ve)', salaire: 1300 },
      { titre: 'Employé(e) de bureau', salaire: 1600 },
      { titre: 'Chef(fe) de service', salaire: 2200 },
    ],
  },
  aise: {
    nom: 'Famille aisée', argent: 40000, loyer: 0, facture: 200,
    desc: 'L\'appartement appartient à tes parents, qui t\'envoient de l\'argent de poche tant que tu vas au travail. Un poste dans l\'entreprise familiale et un compte épargne.',
    revenus: ['poche', 'epargne'],
    jobs: [
      { titre: 'Stagiaire dans l\'entreprise familiale', salaire: 1500 },
      { titre: 'Chargé(e) d\'affaires', salaire: 2600 },
      { titre: 'Directeur(rice)', salaire: 4000 },
    ],
  },
};
export const POCHE = 1200;   // argent de poche hebdomadaire (famille aisée)
export const EPARGNE_TAUX = 0.01; // intérêt par semaine
export const DARET = { part: 200, membres: 6, nom: 'daret du quartier' };

// Petits boulots proposés par les voisins, selon le milieu. dur en minutes, rel : amitié minimale.
export const BOULOTS = [
  { id: 'livraisons', npc: 'lahcen', milieux: ['populaire'], nom: 'Livraisons pour le hanout', dur: 60, paie: 60, rel: 10, ici: 'En livraison dans le quartier', eff: { energie: -8, social: 6 } },
  { id: 'service', npc: 'hamid', milieux: ['populaire'], nom: 'Service en terrasse (soir de match)', dur: 180, paie: 120, pourboire: 80, rel: 10, match: true, ici: 'Au service, en terrasse', eff: { energie: -18, social: 15, moral: 4 } },
  { id: 'taxi', npc: 'omar', milieux: ['populaire'], nom: 'Laver et briquer le taxi', dur: 45, paie: 40, rel: 10, ici: 'En train de laver le taxi', eff: { energie: -8, hygiene: -10, social: 4 } },
  { id: 'cours', npc: 'fz', milieux: ['moyen'], nom: 'Cours particuliers chez des voisins', dur: 120, paie: 150, rel: 20, ici: 'En cours particulier', eff: { energie: -8, social: 8 } },
  { id: 'missions', npc: 'yassine', milieux: ['moyen'], nom: 'Mission informatique en ligne', dur: 180, paie: 200, rel: 20, ici: 'Sur une mission en ligne', eff: { energie: -10, social: 4 } },
];
// Vente de plats faits maison (prix par part, selon la qualité : raté, correct, délicieux).
export const VENTE = { msemen: [0, 8, 14], tajine: [0, 25, 40], loubia: [0, 10, 15], harira: [0, 10, 16], couscous: [0, 30, 45], rfissa: [0, 32, 50], chebakia: [0, 7, 12] };
export const VENTE_MAX = 8; // parts achetées par acheteur et par jour
export const ACHETEURS = ['hamid', 'lahcen'];

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

// L'arrêt de taxi au coin de la rue, et les sorties en ville.
export const TAXI = {
  arret: { x: X0 + 3, z: D + 1 },
  petit: { nom: 'Petit taxi', desc: 'Le rouge, pour toi seul(e). Au compteur, en principe.' },
  grand: { nom: 'Grand taxi', desc: 'Le blanc, partagé à six. Moins cher, mais il part quand il est plein.', attente: [5, 25] },
};
// Chaque sortie : trajets (prix et durée par taxi), activités au choix, et un événement avec un choix pendant la sortie.
export const SORTIES = {
  plage: {
    nom: 'La plage et la corniche', img: 'ecran-accueil', ici: 'À la plage', desc: 'Aïn Diab : la corniche, le sable, les cafés avec vue sur l\'océan.',
    trajet: { petit: { prix: 35, dur: 25 }, grand: { prix: 10, dur: 35 } },
    activites: [
      { id: 'bain', nom: 'Se baigner', prix: 0, dur: 120, eff: { moral: 24, hygiene: 20, energie: -12, social: 6 } },
      { id: 'balade', nom: 'Marcher sur la corniche', prix: 0, dur: 90, eff: { moral: 18, energie: -6, social: 8 } },
      { id: 'cafe', nom: 'Un café avec vue sur l\'océan', prix: 30, dur: 90, eff: { moral: 22, social: 10, faim: 6 } },
      { id: 'foot', nom: 'Un match de foot sur le sable', prix: 0, dur: 120, eff: { moral: 26, social: 22, energie: -22, hygiene: -15 } },
    ],
    evenements: [
      { texte: 'Un groupe de jeunes cherche un joueur pour compléter leur équipe.', choix: [
        { label: 'Jouer avec eux', eff: { social: 15, moral: 8, energie: -10 }, suite: 'Ils t\'ont adopté(e). Rendez-vous dimanche prochain.' },
        { label: 'Décliner poliment', eff: { moral: 2 }, suite: 'Tu profites du calme.' },
      ] },
      { texte: 'Un vendeur ambulant passe avec des beignets chauds (sfenj).', choix: [
        { label: 'En prendre trois (10 DH)', eff: { money: -10, faim: 18, moral: 8 }, suite: 'Encore chauds, avec du sucre. Le bonheur.' },
        { label: 'Non merci', eff: {}, suite: 'Il s\'éloigne en criant « sfenj, sfenj ! ».' },
      ] },
      { texte: 'Le soleil tape. Tu n\'as pas de crème solaire.', choix: [
        { label: 'Acheter un parasol (40 DH)', eff: { money: -40, moral: 4 }, suite: 'À l\'ombre, la vie est belle.' },
        { label: 'Rester au soleil', eff: { moral: -6, energie: -8 }, suite: 'Coup de soleil. Tu le sentiras ce soir.' },
      ] },
    ],
  },
  mall: {
    nom: 'Le mall et le cinéma', img: 'illu-travail', ici: 'Au mall', desc: 'Climatisation, escalators, cinéma, fast-food et vitrines. La sortie des jeunes et des familles.',
    trajet: { petit: { prix: 40, dur: 30 }, grand: { prix: 12, dur: 45 } },
    activites: [
      { id: 'cine', nom: 'Une séance de cinéma', prix: 60, dur: 150, eff: { moral: 28, social: 8, energie: 4 } },
      { id: 'fastfood', nom: 'Burger et frites', prix: 55, dur: 60, eff: { faim: 55, moral: 10, social: 6 } },
      { id: 'vitrines', nom: 'Faire les vitrines', prix: 0, dur: 90, eff: { moral: 8, social: 6, energie: -6 } },
      { id: 'tenue', nom: 'S\'acheter une nouvelle tenue', prix: 350, dur: 90, eff: { moral: 20, social: 6 }, tenue: true },
    ],
    evenements: [
      { texte: 'Tu croises un ancien camarade de classe qui réussit très bien, en apparence.', choix: [
        { label: 'Prendre un café ensemble', eff: { social: 14, moral: 4, money: -30 }, suite: 'Il a payé la moitié. Il t\'a parlé d\'une opportunité, à voir.' },
        { label: 'Un bonjour rapide', eff: { social: 4 }, suite: 'Chacun sa route.' },
        { label: 'Faire semblant de ne pas le voir', eff: { moral: -4 }, suite: 'Tu as fait semblant de regarder une vitrine.' },
      ] },
      { texte: 'Soldes : une veste que tu aimes est à moitié prix (200 DH).', choix: [
        { label: 'L\'acheter', eff: { money: -200, moral: 14 }, suite: 'Elle te va très bien.', tenue: true },
        { label: 'Résister', eff: { moral: -2 }, suite: 'Tu y repenses encore dans le taxi.' },
      ] },
      { texte: 'La file au cinéma est interminable.', choix: [
        { label: 'Attendre', eff: { energie: -6, moral: -3 }, suite: 'Quarante minutes debout.' },
        { label: 'Payer le pop-corn pour passer devant (30 DH)', eff: { money: -30, moral: 4 }, suite: 'Le vendeur t\'a fait un clin d\'œil.' },
      ] },
    ],
  },
  medina: {
    nom: 'Le souk et la médina', img: 'illu-marche', ici: 'Dans la médina', desc: 'Les ruelles, les artisans, les tissus et les lanternes. Tout se marchande.',
    trajet: { petit: { prix: 25, dur: 20 }, grand: { prix: 8, dur: 30 } },
    activites: [
      { id: 'flaner', nom: 'Flâner dans les ruelles', prix: 0, dur: 120, eff: { moral: 16, social: 8, energie: -10 } },
      { id: 'tapis', nom: 'Marchander un tapis berbère', prix: 0, dur: 90, eff: { moral: 6, social: 6 }, achat: { type: 'tapis', prix: 1200 } },
      { id: 'lanterne', nom: 'Marchander une lanterne en fer forgé', prix: 0, dur: 60, eff: { moral: 6, social: 6 }, achat: { type: 'lanterne', prix: 420 } },
      { id: 'jarre', nom: 'Marchander une grande jarre', prix: 0, dur: 60, eff: { moral: 6, social: 6 }, achat: { type: 'jarre', prix: 480 } },
      { id: 'the', nom: 'Un thé chez un artisan', prix: 10, dur: 60, eff: { moral: 16, social: 14, faim: 4 } },
    ],
    evenements: [
      { texte: 'Un faux guide insiste pour te montrer « la vraie médina ».', choix: [
        { label: 'Le suivre', cond: 'chance50', ok: { moral: 10, social: 6 }, ko: { money: -50, moral: -8 }, suiteOk: 'Il connaissait des coins magnifiques.', suiteKo: 'Il t\'a laissé(e) devant la boutique de son cousin, et il a fallu payer.' },
        { label: 'Refuser fermement', eff: { moral: 2 }, suite: 'Il est parti chercher un touriste.' },
      ] },
      { texte: 'Une vieille dame vend du pain chaud devant sa porte.', choix: [
        { label: 'En acheter (3 DH)', eff: { money: -3, faim: 12, moral: 6 }, suite: 'Elle t\'a souhaité une longue vie.' },
        { label: 'Passer son chemin', eff: {}, suite: 'L\'odeur te suit jusqu\'au bout de la ruelle.' },
      ] },
    ],
  },
};
// Le marchandage : trois façons d'aborder le prix.
export const MARCHANDAGE = [
  { label: 'Proposer la moitié', chance: 0.35, ok: 0.6, ko: 0.95, suiteOk: 'Il râle, puis il accepte. Belle affaire.', suiteKo: 'Il fait mine de ranger l\'objet. Tu finis par payer presque le prix fort.' },
  { label: 'Proposer 70 %', chance: 0.65, ok: 0.75, ko: 0.9, suiteOk: 'Marché conclu, avec un verre de thé.', suiteKo: 'Il tient bon. Petite remise seulement.' },
  { label: 'Payer sans discuter', chance: 1, ok: 1, ko: 1, suiteOk: 'Il te regarde comme un touriste, mais il est ravi.', suiteKo: '' },
];

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
