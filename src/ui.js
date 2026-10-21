// Interface : barre du haut, besoins, file d'actions, menus et fenêtres.
import {
  JOURS, NEEDS, NEED_ICONS, SKINS, HAIRS, HAIR_COLORS, SCARF_COLORS, OUTFITS, OUTFIT_COLORS, TRAITS,
  LIEUX, MARCHE, RECETTES, QUAL, NPCS, CAFE, HANOUT, relLabel, asset,
  MILIEUX, MILIEU_IDS, BOULOTS, VENTE, DARET, POCHE, EPARGNE_TAUX, ANIMAUX, SORTIES, TAXI, QUARTIERS, VEHICULES, CAUTION_SEMAINES,
} from './data.js';
import {
  G, dow, dayIdx, fmtTime, fmtDH, fmtDur, enqueue, cancel, comeBack, awayPhase, basketCost, progress, hanoutOuvert, hanoutCost,
  milieu, jobOf, revenu, joinDaret, epargne, enqueueWork, skipWork, animalName, sortieCost, Q, prix, homeHere, loyerHebdo, vehicule, demenager, acheterVehicule, quartierCost, npcDefs,
} from './sim.js';
import { ambiance } from './world.js';
import { PRATIQUES, socialInfo } from './social.js';

export const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = (name, cls = '') => `<img src="${asset(name)}" alt="" class="${cls}" draggable="false">`;

// ---------- Messages ----------
export function toast(msg, kind = '') {
  const box = $('toasts'), d = document.createElement('div');
  const dial = /^[^:]{2,24} : « /.test(msg);
  d.className = 'toast ' + (dial ? 'dial' : kind); d.textContent = msg;
  box.appendChild(d);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => d.classList.add('out'), dial ? 6000 : 4200);
  setTimeout(() => d.remove(), dial ? 6500 : 4700);
}

// ---------- Barre du haut et besoins ----------
let H = {};
export function initHud(handlers) {
  H = handlers;
  $('speeds').addEventListener('click', e => { const b = e.target.closest('[data-speed]'); if (b) H.onSpeed(+b.dataset.speed); });
  $('modeBtn').onclick = () => H.onMode();
  $('wallsBtn').onclick = () => H.onWalls();
  $('menuBtn').onclick = () => openMenu();
  $('portrait').onclick = () => openFiche();
  $('queue').addEventListener('click', e => { const b = e.target.closest('[data-cancel]'); if (b) cancel(+b.dataset.cancel); queueSig = ''; updateHud(); });
  $('away').addEventListener('click', e => { if (e.target.closest('[data-back]')) { comeBack(); updateHud(); } });
  $('needs').innerHTML = Object.entries(NEEDS).map(([k, n]) =>
    `<div class="need">${img(NEED_ICONS[k])}<div><span>${n}</span><div class="bar"><i id="nd-${k}"></i></div></div></div>`).join('');
}
export function showHud(on) { $('hud').hidden = !on; }
export function setMode(mode) {
  $('live').hidden = mode !== 'live';
  $('build').hidden = mode !== 'build';
  $('modeBtn').textContent = mode === 'live' ? 'Construire' : 'Vivre';
  $('modeBtn').classList.toggle('on', mode === 'build');
}
export function setWallsLabel(m) { $('wallsBtn').textContent = { coupes: 'Murs coupés', bas: 'Murs bas', hauts: 'Murs hauts' }[m]; }

const moodOf = m => (m >= 75 ? 'Au top' : m >= 55 ? 'De bonne humeur' : m >= 35 ? 'Ça va' : m >= 15 ? 'Pas en forme' : 'Au plus bas');
const barColor = v => (v > 60 ? '#3f9a5b' : v > 30 ? '#e0a526' : '#c8442f');
let queueSig = '';
export function updateHud() {
  const s = G.s;
  $('day').textContent = `${JOURS[dow(s.t)]} · jour ${dayIdx(s.t) + 1}${s.quartier !== 'populaire' ? ' · ' + Q().nom : ''}`;
  $('time').textContent = fmtTime(s.t);
  $('money').lastChild.textContent = fmtDH(s.money);
  $('money').classList.toggle('neg', s.money < 0);
  for (const b of $('speeds').children) b.classList.toggle('on', +b.dataset.speed === G.speed && G.mode === 'live');
  $('cname').textContent = s.char.name;
  $('mood').textContent = moodOf(s.needs.moral);
  $('portrait').textContent = s.char.name.slice(0, 1).toUpperCase();
  $('portrait').style.background = s.char.outfitColor;
  $('portrait').style.color = isLight(s.char.outfitColor) ? '#2b211b' : '#fff';
  for (const k in NEEDS) {
    const v = s.needs[k], i = $('nd-' + k);
    i.style.width = v + '%'; i.style.background = barColor(v);
  }
  // Sortie en cours
  const a = s.away;
  $('away').hidden = !a;
  $('queue').hidden = !!a;
  if (a) {
    const p = awayPhase(), L = LIEUX[a.lieu] || SORTIES[a.dest] || QUARTIERS[a.to] || { nom: '' }, end = a.phases[a.phases.length - 1].until;
    const pct = Math.min(100, (s.t - a.start) / (end - a.start) * 100);
    $('away').innerHTML = `<div class="away-t"><b>${esc(p.label === 'En chemin' ? 'En chemin : ' + L.nom.toLowerCase() : p.label)}</b>
      <span>Retour vers ${fmtTime(end)}</span></div><div class="bar"><i style="width:${pct}%"></i></div>
      ${a.lieu === 'hammam' || a.lieu === 'sortie' ? '<button class="btn small" data-back>Rentrer plus tôt</button>' : ''}`;
    return;
  }
  const items = (G.cur ? [G.cur.it] : []).concat(G.queue);
  const sig = items.map(i => i.qid).join(',');
  if (sig !== queueSig) {
    queueSig = sig;
    $('queue').innerHTML = items.map((it, n) =>
      `<div class="chip ${n === 0 && G.cur ? 'cur' : ''}"><span>${esc(it.label)}</span>
        <button data-cancel="${it.qid}" aria-label="Annuler">×</button>${n === 0 && G.cur ? '<i class="prog"></i>' : ''}</div>`).join('');
  }
  const pr = $('queue').querySelector('.prog');
  if (pr) pr.style.width = progress() * 100 + '%';
}
function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) > 160;
}

// ---------- Menu d'actions près du doigt ----------
export function showPop(x, y, data, onPick) {
  const p = $('pop');
  const items = data.items || [];
  p.innerHTML = `<div class="pop-h ${data.img ? 'with-img' : ''}">${data.img ? img(data.img, 'pop-img') : ''}<div><b>${esc(data.title)}</b>${data.info ? `<small>${esc(data.info)}</small>` : ''}</div></div>` +
    (items.length ? items.map((it, i) => `<button class="pop-i" data-i="${i}" ${it.disabled ? 'disabled' : ''}>
      <span>${esc(it.label)}</span>${it.disabled && it.why ? `<small>${esc(it.why)}</small>` : it.sub ? `<small>${esc(it.sub)}</small>` : ''}</button>`).join('')
      : '');
  p.hidden = false;
  const r = p.getBoundingClientRect();
  p.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2)) + 'px';
  p.style.top = Math.max(60, Math.min(innerHeight - r.height - 8, y - r.height - 14)) + 'px';
  p.onclick = e => {
    const b = e.target.closest('[data-i]');
    if (!b || b.disabled) return;
    hidePop();
    onPick(items[+b.dataset.i]);
  };
}
export function hidePop() { $('pop').hidden = true; }

// ---------- Fenêtres ----------
export function openModal(html, opts = {}) {
  $('sheet').innerHTML = html;
  $('sheet').className = 'sheet ' + (opts.cls || '');
  $('modal').hidden = false;
  $('modal').classList.toggle('see-through', !!opts.seeThrough);
  G.modal = true;
  hidePop();
  return $('sheet');
}
export function closeModal() { $('modal').hidden = true; G.modal = false; }
const closeBtn = '<button class="x" data-close aria-label="Fermer">×</button>';
const banner = name => `<div class="banner">${img(name)}</div>`;
function bindClose(sheet) { sheet.querySelectorAll('[data-close]').forEach(b => { b.onclick = closeModal; }); }

// Création du personnage
const NAMES = ['Yasmine', 'Karim', 'Salma', 'Mehdi', 'Nora', 'Youssef', 'Imane', 'Omar', 'Hiba', 'Amine', 'Zineb', 'Hamza'];
const pickR = a => a[Math.floor(Math.random() * a.length)];
export function randomLook() {
  const hair = pickR(Object.keys(HAIRS));
  const tr = Object.keys(TRAITS).sort(() => Math.random() - 0.5).slice(0, 2);
  return {
    name: pickR(NAMES), skin: pickR(SKINS), hair, hairColor: pickR(HAIR_COLORS), scarfColor: pickR(SCARF_COLORS),
    outfit: pickR(Object.keys(OUTFITS)), outfitColor: pickR(OUTFIT_COLORS), traits: tr, milieu: pickR(MILIEU_IDS), pratique: pickR(Object.keys(PRATIQUES)),
  };
}
export function openCreation(look, onChange, onDone) {
  const sw = (key, list) => `<div class="sw">${list.map(c => `<button data-k="${key}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
  const chips = (key, obj) => `<div class="chips">${Object.entries(obj).map(([v, n]) => `<button data-k="${key}" data-v="${v}">${esc(n)}</button>`).join('')}</div>`;
  const sheet = openModal(`
    <h2>Ton personnage</h2>
    <label class="field"><span>Prénom</span><input id="cName" maxlength="16" autocomplete="off"></label>
    <div class="row"><span>Teint</span>${sw('skin', SKINS)}</div>
    <div class="row"><span>Coiffure</span>${chips('hair', HAIRS)}</div>
    <div class="row" id="rowHair"><span>Couleur des cheveux</span>${sw('hairColor', HAIR_COLORS)}</div>
    <div class="row" id="rowScarf"><span>Couleur du foulard</span>${sw('scarfColor', SCARF_COLORS)}</div>
    <div class="row"><span>Tenue</span>${chips('outfit', OUTFITS)}</div>
    <div class="row"><span>Couleur de la tenue</span>${sw('outfitColor', OUTFIT_COLORS)}</div>
    <div class="row"><span>Caractère (2 traits au choix)</span>
      <div class="chips">${Object.entries(TRAITS).map(([v, t]) => `<button data-k="traits" data-v="${v}">${esc(t.nom)}</button>`).join('')}</div>
      <p class="hint" id="traitDesc"></p></div>
    <div class="row"><span>Milieu</span>
      <div class="chips icons">${MILIEU_IDS.map(v => `<button data-k="milieu" data-v="${v}">${img('milieu-' + v)}${esc(MILIEUX[v].nom)}</button>`).join('')}</div>
      <p class="hint" id="milieuDesc"></p></div>
    <div class="row"><span>Pratique religieuse</span>
      <div class="chips">${Object.entries(PRATIQUES).map(([v, n]) => `<button data-k="pratique" data-v="${v}">${esc(n)}</button>`).join('')}</div>
      <p class="hint">La mosquée est dans le décor pour tout le monde. Ce choix décide si ton personnage y va le vendredi, et les voisins le remarquent.</p></div>
    <div class="actions"><button class="btn" id="cRand">Au hasard</button><button class="btn primary" id="cGo">Emménager</button></div>
  `, { cls: 'side', seeThrough: true });
  const sync = () => {
    sheet.querySelector('#cName').value = look.name;
    sheet.querySelectorAll('[data-k]').forEach(b => {
      const k = b.dataset.k, v = b.dataset.v;
      b.classList.toggle('on', k === 'traits' ? look.traits.includes(v) : look[k] === v);
    });
    sheet.querySelector('#rowHair').hidden = look.hair === 'foulard';
    sheet.querySelector('#rowScarf').hidden = look.hair !== 'foulard';
    sheet.querySelector('#traitDesc').textContent = look.traits.map(t => `${TRAITS[t].nom} : ${TRAITS[t].desc}`).join(' ');
    const M = MILIEUX[look.milieu];
    sheet.querySelector('#milieuDesc').textContent = `${M.desc} Départ avec ${fmtDH(M.argent)}${M.loyer ? `, loyer ${fmtDH(M.loyer)} par semaine` : ', sans loyer'}.`;
    onChange(look);
  };
  sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k, v = b.dataset.v;
    if (k === 'traits') {
      if (look.traits.includes(v)) look.traits = look.traits.filter(t => t !== v);
      else look.traits = [...look.traits, v].slice(-2);
    } else look[k] = v;
    sync();
  });
  sheet.querySelector('#cName').oninput = e => { look.name = e.target.value; };
  sheet.querySelector('#cRand').onclick = () => { Object.assign(look, randomLook()); sync(); };
  sheet.querySelector('#cGo').onclick = () => {
    look.name = (look.name || '').trim();
    if (!look.name) { toast('Choisis un prénom.'); return; }
    closeModal(); onDone(look);
  };
  sync();
}

export function welcome() {
  const n = esc(G.s.char.name), M = milieu();
  const sheet = openModal(`${closeBtn}${banner('ecran-accueil')}
    <h2>Bienvenue à Casablanca, ${n} !</h2>
    <p>Voici ton appartement, en rez-de-chaussée dans un quartier animé : le café est juste à droite, le hanout à gauche.</p>
    <p><b>${esc(M.nom)}.</b> ${esc(M.desc)} Les façons de gagner de l'argent sont dans ta fiche (touche ton portrait).</p>
    <ul class="tips">
      <li>Un chien et un chat errants traînent dans la rue. Nourris-les (restes de poulet au hanout) et caresse-les plusieurs jours : quand ils te font confiance, tu peux les adopter.</li>
      <li>Chaque matin de semaine, on te demande si tu vas au travail. Sécher a des conséquences. Au bureau, un événement par jour te demande un choix : il joue sur le chef, les collègues, ton moral ou ton portefeuille.</li>
      <li>Avec les voisins : salue, choisis un sujet (chacun a ses goûts), offre un plat fait maison ou invite au café.</li>
      <li>Touche un meuble pour voir ce que ${n} peut y faire, le sol pour se déplacer.</li>
      <li>Touche la porte d'entrée verte pour sortir dans la rue, ou partir au hammam, au marché, au travail.</li>
      <li>Dehors, touche une chaise de la terrasse pour s'asseoir au café, le hanout pour acheter à manger, ou un voisin pour le saluer et discuter. Les voisins ont leurs habitudes : on les croise à certaines heures.</li>
      <li>Garde un œil sur les besoins en bas de l'écran. La vie sociale se remplit au café et en discutant.</li>
      <li>Le travail : du lundi au vendredi de 9 h à 17 h, départ possible de 7 h à midi.</li>
      <li>${M.loyer ? `Le loyer (${fmtDH(M.loyer)}) et la facture d'eau et d'électricité (${fmtDH(M.facture)}) tombent` : `La facture d'eau et d'électricité (${fmtDH(M.facture)}) tombe`} chaque lundi, le salaire chaque vendredi soir.</li>
      <li>« Construire » arrête le temps : murs, sols, meubles et peinture.</li>
    </ul>
    <div class="actions"><button class="btn primary" data-close>C'est parti</button></div>`);
  bindClose(sheet);
}

// Hammam et marché : choix de l'activité
export function openLieu(lieu) {
  if (lieu === 'marche') return openMarche();
  const L = LIEUX[lieu];
  const effTxt = eff => Object.entries(eff).map(([k, v]) => `${NEEDS[k]} ${v > 0 ? '+' : ''}${v}`).join(' · ');
  const sheet = openModal(`${closeBtn}${banner(L.img)}<h2>${esc(L.nom)}</h2><p>${esc(L.desc)}</p>
    <div class="list">${L.options.map((o, i) => `<button class="opt" data-i="${i}" ${o.prix > G.s.money ? 'disabled' : ''}>
      <span><b>${esc(o.nom)}</b><small>${fmtDur(o.dur)} sur place · ${effTxt(o.eff)}</small></span><em>${fmtDH(o.prix)}</em></button>`).join('')}</div>`);
  bindClose(sheet);
  sheet.querySelectorAll('[data-i]').forEach(b => {
    b.onclick = () => { closeModal(); enqueue({ kind: 'out', lieu, opt: L.options[+b.dataset.i].id }); };
  });
}

function openMarche() {
  openCourses({
    titre: 'Marché du quartier', img: 'illu-marche', articles: MARCHE, cost: basketCost, verbe: 'Partir faire les courses',
    intro: `Choisis tes courses : ${esc(G.s.char.name)} y va à pied depuis le coin de la rue et les range au frigo en rentrant.`,
    go: basket => enqueue({ kind: 'out', lieu: 'marche', basket }),
  });
}
export function openHanout() {
  if (!hanoutOuvert(G.s.t)) { toast(`Le hanout est fermé. Il ouvre à ${HANOUT.ouvre} h.`); return; }
  openCourses({
    titre: Q().boutiqueNom, img: 'illu-hanout', articles: HANOUT.articles.map(a => ({ ...a, prix: prix(a.prix) })), cost: hanoutCost, verbe: 'Aller acheter',
    intro: G.s.quartier === 'anfa' ? 'Produits fins, prix fins. Mais c\'est à deux pas.' : `L'épicerie du coin, ouverte de ${HANOUT.ouvre} h à ${HANOUT.ferme} h. Un peu plus cher qu'au marché, mais c'est à deux pas.`,
    go: basket => enqueue({ kind: 'hanout', basket }),
  });
}
function openCourses(o) {
  const basket = {};
  const sheet = openModal(`${closeBtn}${banner(o.img)}<h2>${esc(o.titre)}</h2><p>${o.intro}</p>
    <div class="list">${o.articles.map(m => `<div class="opt line"><span><b>${esc(m.nom)}</b><small>${esc(m.detail)} · ${fmtDH(m.prix)}</small></span>
      <div class="qty"><button data-m="${m.id}" data-d="-1" aria-label="Moins">−</button><b id="q-${m.id}">0</b><button data-m="${m.id}" data-d="1" aria-label="Plus">+</button></div></div>`).join('')}</div>
    <div class="actions"><button class="btn primary" id="buy" disabled>${o.verbe}</button></div>`);
  bindClose(sheet);
  const sync = () => {
    for (const m of o.articles) sheet.querySelector('#q-' + m.id).textContent = basket[m.id] || 0;
    const t = o.cost(basket), b = sheet.querySelector('#buy');
    b.disabled = !t || t > G.s.money;
    b.textContent = t ? `${o.verbe} (${fmtDH(t)})` : o.verbe;
  };
  sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    basket[b.dataset.m] = Math.max(0, Math.min(9, (basket[b.dataset.m] || 0) + +b.dataset.d));
    sync();
  });
  sheet.querySelector('#buy').onclick = () => {
    for (const k in basket) if (!basket[k]) delete basket[k];
    closeModal(); o.go(basket);
  };
}

// Fiche du personnage et du quartier
export function openFiche(tab = 'moi') {
  const s = G.s, J = s.job, sk = s.skills.cuisine, lvl = Math.floor(sk), M = milieu(), job = jobOf();
  const plats = s.plats.length ? s.plats.map(p => `${RECETTES[p.r].nom} (${QUAL[p.q]}) : ${p.n}`).join('<br>') : 'Aucun';
  const animaux = ANIMAUX.filter(a => s.animaux[a.id].adopte).map(a => `${img('animal-' + a.id, 'mini')} ${esc(s.animaux[a.id].nom)} (${a.espece}) · faim ${Math.round(s.animaux[a.id].faim)} / 100`).join('<br>');
  const moi = `
    <div class="stat ico">${img('milieu-' + s.milieu)}<div><span>Milieu</span><b>${esc(M.nom)}</b><small>${M.loyer ? `Loyer ${fmtDH(M.loyer)} + factures ${fmtDH(M.facture)}` : `Sans loyer, factures ${fmtDH(M.facture)}`} par semaine · ${esc(socialInfo().pratique)}</small></div></div>
    <div class="stat"><span>Réputation dans le quartier</span><b>${esc(socialInfo().repLabel)}</b><div class="bar"><i style="width:${s.reputation}%;background:var(--safran)"></i></div><small>Elle monte avec les amitiés, les coups de main et les dettes payées ; elle baisse avec les absences, les factures impayées et les mots de travers. Bien vu(e), le hanout fait crédit ; respecté(e), il fait une remise.${s.dette ? ` Dette au hanout : ${fmtDH(s.dette)}.` : ''}</small></div>
    <div class="stat"><span>Ta famille</span><b>${esc(socialInfo().famLabel)}</b><div class="bar"><i style="width:${s.famille}%;background:var(--terre)"></i></div><small>Les appels du dimanche, le repas de famille${s.milieu === 'aise' ? ' du dimanche midi' : s.milieu === 'populaire' ? ' du vendredi soir' : ', un vendredi sur deux'}, et les coups de main demandés entretiennent le lien.</small></div>
    <div class="stat"><span>Argent</span><b>${fmtDH(s.money)}</b>${s.epargne ? `<small>Épargne : ${fmtDH(s.epargne)}</small>` : ''}</div>
    <div class="stat"><span>Travail</span><b>${esc(job.titre)}</b><small>${fmtDH(job.salaire)} par semaine · ${J.week} jour${J.week > 1 ? 's' : ''} travaillé${J.week > 1 ? 's' : ''} cette semaine</small>
      <div class="bar"><i style="width:${J.perf}%"></i></div><small>Performance (ce qu'en pense le chef) : ${Math.round(J.perf)} / 100. Promotion à 100, si l'équipe te soutient.</small>
      <div class="bar"><i style="width:${J.collegues}%;background:var(--safran)"></i></div><small>Ambiance avec les collègues : ${Math.round(J.collegues)} / 100</small>
      <small>Compétence : ${J.competence.toFixed(1)} / 10. Elle monte avec les jours travaillés, les formations et les livres de métier, et accélère la performance.</small></div>
    <div class="stat"><span>Cuisine</span><b>Niveau ${lvl}</b><div class="bar"><i style="width:${lvl >= 10 ? 100 : (sk - lvl) * 100}%"></i></div></div>
    <div class="stat"><span>Ambiance de la maison</span><b>${ambiance(s.home)} / 30</b><small>Plus elle est belle, mieux on s'y sent.</small></div>
    <div class="stat"><span>Ingrédients au frais</span><small>Thé : ${s.inv.the || 0} · Msemen : ${s.inv.msemen || 0} · Tajine : ${s.inv.tajine || 0} · Casse-croûte : ${s.inv.snack || 0} · Restes pour animaux : ${s.inv.patee || 0}</small></div>
    <div class="stat"><span>Plats prêts</span><small>${plats}</small></div>
    ${animaux ? `<div class="stat"><span>À la maison</span><small>${animaux}</small></div>` : ''}`;
  const argent = moneyWays();
  const heures = n => n.sorties.map(([a, b]) => `${fmtH(a)}–${fmtH(b)}`).join(' et ');
  const voisins = `${banner('illu-cafe')}<p class="hint">Le ${Q().cafeNom.toLowerCase()} ouvre de ${CAFE.ouvre} h à ${CAFE.ferme} h. Les voisins passent dans la rue à leurs heures.</p>` +
    npcDefs().map(n => { const v = s.rel[n.id] || 0, live = G.npcs.find(x => x.id === n.id); return `
    <div class="stat voisin ico">${img('portrait-' + n.id)}<div><span>${esc(n.nom)} · ${relLabel(v)}${live && live.visible ? ' · dans la rue' : ''}</span>
      <div class="bar"><i style="width:${v}%"></i></div><small>${esc(n.desc)} Dehors : ${heures(n)}.</small></div></div>`; }).join('') +
    ANIMAUX.map(a => { const st = s.animaux[a.id]; return `
    <div class="stat voisin ico">${img('animal-' + a.id)}<div><span>${esc(st.adopte ? st.nom : a.nom)} · ${st.adopte ? 'adopté' : 'confiance ' + Math.round(st.confiance)}</span>
      <div class="bar"><i style="width:${st.adopte ? st.faim : st.confiance}%"></i></div><small>${esc(a.desc)}</small></div></div>`; }).join('');
  const sheet = openModal(`${closeBtn}<h2>${esc(s.char.name)}</h2>
    <p class="hint">${s.char.traits.map(t => TRAITS[t].nom).join(' · ') || 'Aucun trait'}</p>
    <nav class="tabs small"><button data-t="moi" class="${tab === 'moi' ? 'on' : ''}">Ma vie</button><button data-t="argent" class="${tab === 'argent' ? 'on' : ''}">Argent</button><button data-t="quartier" class="${tab === 'quartier' ? 'on' : ''}">Le quartier</button></nav>
    ${tab === 'moi' ? moi : tab === 'argent' ? argent : voisins}`);
  bindClose(sheet);
  sheet.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => openFiche(b.dataset.t); });
  const daretBtn = sheet.querySelector('#daretJoin');
  if (daretBtn) daretBtn.onclick = () => { joinDaret(); openFiche('argent'); };
  sheet.querySelectorAll('[data-ep]').forEach(b => { b.onclick = () => { epargne(+b.dataset.ep); openFiche('argent'); }; });
  sheet.querySelectorAll('[data-dem]').forEach(b => { b.onclick = () => { closeModal(); demenager(b.dataset.dem); }; });
  sheet.querySelectorAll('[data-veh]').forEach(b => { b.onclick = () => { closeModal(); acheterVehicule(b.dataset.veh); }; });
}
// L'onglet Argent : comment ce personnage peut gagner sa vie, selon son milieu.
function moneyWays() {
  const s = G.s, M = milieu(), job = jobOf();
  const stat = (icon, inner) => `<div class="stat ico">${img(icon)}<div>${inner}</div></div>`;
  let h = banner(revenu('boulots') ? 'illu-boulots' : revenu('daret') ? 'illu-daret' : 'illu-travail') + `<p class="hint">${esc(M.nom)} : ${esc(M.desc)}</p>` +
    stat('icone-salaire', `<span>Salaire</span><b>${fmtDH(job.salaire)} par semaine</b><small>${esc(job.titre)}. Payé le vendredi soir, au prorata des jours travaillés. Promotion quand la performance atteint 100.</small>`);
  if (revenu('boulots') || revenu('cours')) {
    const list = BOULOTS.filter(b => b.milieux.includes(s.milieu)).map(b => {
      const n = NPCS.find(x => x.id === b.npc), rel = s.rel[b.npc] || 0;
      return `<li><b>${esc(b.nom)}</b> avec ${esc(n.nom)} : ${fmtDur(b.dur)}, ${fmtDH(b.paie)}${b.pourboire ? ' + pourboires' : ''}${b.match ? ', pendant un match' : ''}. ${rel >= b.rel ? 'Disponible : touche-le dans la rue.' : `Il faut une amitié de ${b.rel} (actuelle : ${Math.round(rel)}).`}</li>`;
    }).join('');
    h += stat('icone-boulot', `<span>Petits boulots des voisins</span><small>Une fois par jour chacun. On les propose en touchant le voisin.</small><ul class="tips">${list}</ul>`);
  }
  if (revenu('vente')) {
    h += stat('icone-vente', `<span>Vendre ses plats</span><small>Hamid (café) et Ba Lahcen (hanout) achètent jusqu'à 8 parts par jour chacun. Msemen : ${VENTE.msemen[1]} DH la part (${VENTE.msemen[2]} si délicieux). Tajine : ${VENTE.tajine[1]} DH (${VENTE.tajine[2]} si délicieux). Les plats ratés ne se vendent pas.</small>`);
  }
  if (revenu('daret')) {
    const rel = s.rel.khadija || 0;
    let txt;
    if (s.daret) txt = `Tu en fais partie : ${fmtDH(DARET.part)} chaque lundi. Ton tour (${fmtDH(DARET.part * DARET.membres)}) dans ${(s.daret.pos - s.daret.tour + DARET.membres) % DARET.membres || DARET.membres} semaine(s).`;
    else if (rel >= 20) txt = `Lalla Khadija te propose d'entrer dans la daret : ${DARET.membres} membres, ${fmtDH(DARET.part)} chacun par semaine, et chacun son tour touche la cagnotte. <button class="btn small primary" id="daretJoin">Entrer dans la daret</button>`;
    else txt = `Épargne tournante entre voisins. Lalla Khadija l'organise : il faut d'abord devenir sa connaissance (amitié 20, actuelle : ${Math.round(rel)}).`;
    h += stat('icone-daret', `<span>La daret</span><small>${txt}</small>`);
  }
  if (revenu('poche')) h += stat('icone-poche', `<span>Argent de poche</span><small>Tes parents t'envoient ${fmtDH(POCHE)} chaque dimanche, à condition de ne pas avoir séché le travail dans la semaine.</small>`);
  if (revenu('epargne')) {
    h += stat('icone-epargne', `<span>Compte épargne</span><b>${fmtDH(s.epargne)}</b><small>${EPARGNE_TAUX * 100} % d'intérêts chaque lundi.</small>
      <div class="bacts"><button class="btn small" data-ep="1000" ${s.money < 1000 ? 'disabled' : ''}>Placer 1 000 DH</button><button class="btn small" data-ep="5000" ${s.money < 5000 ? 'disabled' : ''}>Placer 5 000 DH</button><button class="btn small" data-ep="-1" ${s.epargne ? '' : 'disabled'}>Tout retirer</button></div>`);
  }
  // Logement : où l'on habite, et où l'on pourrait déménager.
  const autre = s.chezMoi === 'anfa' ? 'populaire' : 'anfa', loyerAutre = loyerHebdo(autre), caution = loyerAutre * CAUTION_SEMAINES;
  let dem;
  if (!s.visites[autre]) dem = `Pour louer ${QUARTIERS[autre].article}, il faut d'abord y aller voir (taxi depuis le coin de la rue).`;
  else dem = `Loyer ${fmtDH(loyerAutre)} par semaine, caution ${fmtDH(caution)} (${CAUTION_SEMAINES} semaines), première semaine d'avance : ${fmtDH(caution + loyerAutre)} à verser. Tes meubles suivent. <button class="btn small primary" data-dem="${autre}" ${s.money < caution + loyerAutre ? 'disabled' : ''}>Déménager ${QUARTIERS[autre].article}</button>`;
  h += stat('icone-demenagement', `<span>Logement</span><b>Tu habites ${QUARTIERS[s.chezMoi].article}</b><small>${loyerHebdo() ? `Loyer ${fmtDH(loyerHebdo())} par semaine.` : 'Sans loyer.'} ${dem}</small>`);
  // Se déplacer : le véhicule.
  const v = vehicule();
  h += stat(s.vehicule ? 'icone-' + s.vehicule : 'icone-taxi-petit', `<span>Se déplacer</span>${v ? `<b>${esc(v.nom)}</b><small>${esc(v.desc)}</small>` : `<small>Les taxis, en attendant mieux.</small><div class="list">${Object.entries(VEHICULES).map(([k, x]) => `<div class="opt line ico">${img('vehicule-' + k)}<span><b>${esc(x.nom)}</b><small>${esc(x.desc)}</small></span><button class="btn small" data-veh="${k}" ${s.money < x.prix ? 'disabled' : ''}>${fmtDH(x.prix)}</button></div>`).join('')}</div>`}`);
  h += stat('icone-animal', `<span>Et aussi</span><small>Revendre un meuble rapporte 75 % de son prix. Un animal adopté ne rapporte rien, mais il tient compagnie.</small>`);
  return h;
}

// Le matin : aller au travail ou non.
export function askWork() {
  const s = G.s;
  const sheet = openModal(`<h2>C'est l'heure du travail</h2>
    <p>Il est 8 h 20. ${esc(s.char.name)} doit être au bureau à 9 h (25 minutes de tram).${revenu('poche') ? ' Tes parents coupent l\'argent de poche si tu sèches.' : ' Sécher coûte 15 points de performance et une journée de salaire.'}</p>
    <label class="check"><input type="checkbox" id="autoWork"> Ne plus demander : partir automatiquement</label>
    <div class="actions"><button class="btn" id="wNo">Pas aujourd'hui</button><button class="btn primary" id="wYes">Y aller</button></div>`);
  const auto = () => { if (sheet.querySelector('#autoWork').checked) s.autoWork = true; };
  sheet.querySelector('#wYes').onclick = () => { auto(); closeModal(); enqueueWork(); };
  sheet.querySelector('#wNo').onclick = () => { auto(); closeModal(); skipWork(); };
}

// Un événement avec un choix (au travail, en sortie) : les conséquences tombent tout de suite.
export function choiceEvent(titre, image, ev, cb) {
  const portrait = image && image.startsWith('portrait-');
  const sheet = openModal(`${image && !portrait ? banner(image) : ''}<h2>${portrait ? img(image, 'avatar') : ''}${esc(titre)}</h2><p>${esc(ev.texte)}</p>
    <div class="list">${ev.choix.map((c, i) => `<button class="opt" data-i="${i}"><span><b>${esc(c.label)}</b></span></button>`).join('')}</div>`);
  sheet.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => { closeModal(); cb(+b.dataset.i); }; });
}
export const workEvent = (ev, cb) => choiceEvent('Au travail', 'illu-travail', ev, cb);
export const sortieEvent = (ev, cb) => choiceEvent(ev.titre, ev.img, ev, cb);

// Sortir en ville : choisir la destination, puis le taxi et l'activité.
export function openSorties() {
  const s = G.s, autre = s.quartier === 'anfa' ? 'populaire' : 'anfa', A = QUARTIERS[autre], v = vehicule();
  const sheet = openModal(`${closeBtn}<h2>Sortir en ville</h2><p>${v ? `Avec ${v.nom.toLowerCase()}, plus besoin de taxi.` : "Depuis l'arrêt de taxi au coin de la rue."} Chaque sortie prend l'après-midi ou la soirée.</p>
    <div class="list">
      <button class="opt ico" id="goQ">${img(autre === 'anfa' ? 'icone-quartier-californie' : 'icone-quartier-populaire')}<span><b>${autre === 'anfa' ? 'Aller à Anfa' : 'Rentrer au quartier'}${autre === s.chezMoi ? ' (chez toi)' : ''}</b><small>${esc(A.desc)}</small></span><em>${v ? fmtDur(Math.round(A.trajet.petit.dur * v.vitesse)) : `${fmtDH(A.trajet.petit.prix)} / ${fmtDH(A.trajet.grand.prix)}`}</em></button>
      ${Object.entries(SORTIES).map(([k, d]) => `<button class="opt ico" data-d="${k}">${img('icone-' + k)}<span><b>${esc(d.nom)}</b><small>${esc(d.desc)}</small></span></button>`).join('')}</div>`);
  bindClose(sheet);
  sheet.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => openSortie(b.dataset.d); });
  sheet.querySelector('#goQ').onclick = () => {
    if (v) { closeModal(); enqueue({ kind: 'quartier', to: autre, taxi: 'petit' }); return; }
    const sh = openModal(`${closeBtn}<h2>${autre === 'anfa' ? 'Aller à Anfa' : 'Rentrer au quartier'}</h2><p>${esc(A.desc)}</p>
      <div class="list">${['petit', 'grand'].map(t => `<button class="opt ico" data-t="${t}" ${A.trajet[t].prix > s.money ? 'disabled' : ''}>${img('icone-taxi-' + t)}<span><b>${TAXI[t].nom}</b><small>${esc(TAXI[t].desc)} · ${fmtDur(A.trajet[t].dur)}</small></span><em>${fmtDH(A.trajet[t].prix)}</em></button>`).join('')}</div>`);
    bindClose(sh);
    sh.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { closeModal(); enqueue({ kind: 'quartier', to: autre, taxi: b.dataset.t }); }; });
  };
}
function openSortie(dest) {
  const Sd = SORTIES[dest], s = G.s, choix = { taxi: 'petit', act: Sd.activites[0].id };
  const effTxt = eff => Object.entries(eff).map(([k, v]) => `${NEEDS[k]} ${v > 0 ? '+' : ''}${v}`).join(' · ');
  const v = vehicule();
  const sheet = openModal(`${closeBtn}${banner(Sd.img)}<h2>${esc(Sd.nom)}</h2><p>${esc(Sd.desc)}</p>
    ${v ? `<p class="hint">Trajet avec ${v.nom.toLowerCase()} : ${fmtDur(Math.round(Sd.trajet.petit.dur * v.vitesse))}, sans frais.</p><div hidden><button data-taxi="petit"></button><p id="taxiDesc"></p></div>`
      : `<div class="row"><span>Le taxi (aller et retour)</span><div class="chips icons">${['petit', 'grand'].map(t => `<button data-taxi="${t}">${img('icone-taxi-' + t)}${TAXI[t].nom} · ${fmtDH(Sd.trajet[t].prix * 2)} · ${fmtDur(Sd.trajet[t].dur)}</button>`).join('')}</div><p class="hint" id="taxiDesc"></p></div>`}
    <div class="row"><span>Sur place</span><div class="list">${Sd.activites.map(a => `<button class="opt" data-act="${a.id}"><span><b>${esc(a.nom)}</b><small>${fmtDur(a.dur)} · ${a.achat ? 'à marchander' : effTxt(a.eff)}</small></span><em>${a.prix ? fmtDH(a.prix) : 'gratuit'}</em></button>`).join('')}</div></div>
    <div class="actions"><button class="btn" id="sBack">Retour</button><button class="btn primary" id="sGo">Partir</button></div>`);
  bindClose(sheet);
  const sync = () => {
    sheet.querySelectorAll('[data-taxi]').forEach(b => b.classList.toggle('on', b.dataset.taxi === choix.taxi));
    sheet.querySelectorAll('[data-act]').forEach(b => b.classList.toggle('sel', b.dataset.act === choix.act));
    sheet.querySelector('#taxiDesc').textContent = TAXI[choix.taxi].desc;
    const cost = sortieCost(dest, choix.taxi, choix.act), go = sheet.querySelector('#sGo');
    go.textContent = `Partir (${fmtDH(cost)})`; go.disabled = cost > s.money;
  };
  sheet.querySelectorAll('[data-taxi]').forEach(b => { b.onclick = () => { choix.taxi = b.dataset.taxi; sync(); }; });
  sheet.querySelectorAll('[data-act]').forEach(b => { b.onclick = () => { choix.act = b.dataset.act; sync(); }; });
  sheet.querySelector('#sBack').onclick = () => openSorties();
  sheet.querySelector('#sGo').onclick = () => { closeModal(); enqueue({ kind: 'sortie', dest, taxi: choix.taxi, act: choix.act }); };
  sync();
}

// Adopter un animal : lui donner un nom.
export function openAdopt(id) {
  const def = ANIMAUX.find(a => a.id === id);
  const sheet = openModal(`${closeBtn}<h2>Adopter le ${esc(def.nom.toLowerCase())}</h2>
    <p>Il te fait confiance. Comment veux-tu l'appeler ?</p>
    <label class="field"><span>Nom</span><input id="aName" maxlength="16" autocomplete="off" value="${def.espece === 'chat' ? 'Mimi' : 'Rex'}"></label>
    <div class="actions"><button class="btn primary" id="aGo">Ramener à la maison</button></div>`);
  bindClose(sheet);
  sheet.querySelector('#aGo').onclick = () => {
    const nom = sheet.querySelector('#aName').value.trim();
    if (!nom) { toast('Choisis un nom.'); return; }
    closeModal(); enqueue({ kind: 'animal', id, act: 'adopter', nom, label: 'Adopter ' + nom });
  };
}
const fmtH = h => { const m = Math.round((h % 1) * 60); return Math.floor(h) + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };

// Menu
export function openMenu() {
  const s = G.s;
  const sheet = openModal(`${closeBtn}<h2>Menu</h2>
    <div class="list">
      <button class="opt" id="mAuto"><span><b>Libre arbitre : ${s.autonomy ? 'activé' : 'désactivé'}</b>
        <small>${esc(s.char.name)} mange, dort, se lave et va au café tout(e) seul(e) quand rien n'est prévu.</small></span></button>
      <button class="opt" id="mWork"><span><b>Départ au travail : ${s.autoWork ? 'automatique' : 'me demander chaque matin'}</b></span></button>
      <button class="opt" id="mHelp"><span><b>Comment jouer</b></span></button>
      <button class="opt danger" id="mNew"><span><b>Nouvelle partie</b><small>Efface la partie en cours.</small></span></button>
    </div>
    <div class="actions"><button class="btn primary" data-close>Reprendre</button></div>`);
  bindClose(sheet);
  sheet.querySelector('#mAuto').onclick = () => { s.autonomy = !s.autonomy; openMenu(); };
  sheet.querySelector('#mWork').onclick = () => { s.autoWork = !s.autoWork; openMenu(); };
  sheet.querySelector('#mHelp').onclick = () => welcome();
  const nb = sheet.querySelector('#mNew');
  nb.onclick = () => {
    if (!nb.dataset.sure) { nb.dataset.sure = 1; nb.querySelector('b').textContent = 'Toucher encore pour tout effacer'; return; }
    H.onNewGame();
  };
}
