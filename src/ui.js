// Interface : barre du haut, besoins, file d'actions, menus et fenêtres.
import {
  JOURS, NEEDS, NEED_ICONS, SKINS, HAIRS, HAIR_COLORS, SCARF_COLORS, OUTFITS, OUTFIT_COLORS, TRAITS,
  LIEUX, MARCHE, RECETTES, QUAL, JOB, LOYER, FACTURE, NPCS, CAFE, relLabel, asset,
} from './data.js';
import {
  G, dow, dayIdx, fmtTime, fmtDH, fmtDur, enqueue, cancel, comeBack, awayPhase, basketCost, progress,
} from './sim.js';
import { ambiance } from './world.js';

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
  $('day').textContent = `${JOURS[dow(s.t)]} · jour ${dayIdx(s.t) + 1}`;
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
    const p = awayPhase(), L = LIEUX[a.lieu], end = a.phases[a.phases.length - 1].until;
    const pct = Math.min(100, (s.t - a.start) / (end - a.start) * 100);
    $('away').innerHTML = `<div class="away-t"><b>${esc(p.label === 'En chemin' ? 'En chemin : ' + L.nom.toLowerCase() : p.label)}</b>
      <span>Retour vers ${fmtTime(end)}</span></div><div class="bar"><i style="width:${pct}%"></i></div>
      ${a.lieu === 'hammam' ? '<button class="btn small" data-back>Rentrer plus tôt</button>' : ''}`;
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
  p.innerHTML = `<div class="pop-h"><b>${esc(data.title)}</b>${data.info ? `<small>${esc(data.info)}</small>` : ''}</div>` +
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
    outfit: pickR(Object.keys(OUTFITS)), outfitColor: pickR(OUTFIT_COLORS), traits: tr,
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
  const n = esc(G.s.char.name);
  const sheet = openModal(`${closeBtn}${banner('ecran-accueil')}
    <h2>Bienvenue à Casablanca, ${n} !</h2>
    <p>Voici ton nouvel appartement, en rez-de-chaussée dans un quartier animé : le café est juste à droite, le hanout à gauche.</p>
    <ul class="tips">
      <li>Touche un meuble pour voir ce que ${n} peut y faire, le sol pour se déplacer.</li>
      <li>Touche la porte d'entrée verte pour sortir dans la rue, ou partir au hammam, au marché, au travail.</li>
      <li>Dehors, touche une chaise de la terrasse pour s'asseoir au café, ou un voisin pour le saluer et discuter. Les voisins ont leurs habitudes : on les croise à certaines heures.</li>
      <li>Garde un œil sur les besoins en bas de l'écran. La vie sociale se remplit au café et en discutant.</li>
      <li>Le travail : du lundi au vendredi de 9 h à 17 h. ${n} part tout(e) seul(e) à 8 h 20.</li>
      <li>Le loyer (${fmtDH(LOYER)}) et la facture d'eau et d'électricité (${fmtDH(FACTURE)}) tombent chaque lundi, le salaire chaque vendredi soir.</li>
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
  const basket = {};
  const sheet = openModal(`${closeBtn}${banner('illu-marche')}<h2>Marché du quartier</h2>
    <p>Choisis tes courses : ${esc(G.s.char.name)} y va à pied depuis le coin de la rue et les range au frigo en rentrant.</p>
    <div class="list">${MARCHE.map(m => `<div class="opt line"><span><b>${esc(m.nom)}</b><small>${esc(m.detail)} · ${fmtDH(m.prix)}</small></span>
      <div class="qty"><button data-m="${m.id}" data-d="-1" aria-label="Moins">−</button><b id="q-${m.id}">0</b><button data-m="${m.id}" data-d="1" aria-label="Plus">+</button></div></div>`).join('')}</div>
    <div class="actions"><button class="btn primary" id="buy" disabled>Partir faire les courses</button></div>`);
  bindClose(sheet);
  const sync = () => {
    for (const m of MARCHE) sheet.querySelector('#q-' + m.id).textContent = basket[m.id] || 0;
    const t = basketCost(basket), b = sheet.querySelector('#buy');
    b.disabled = !t || t > G.s.money;
    b.textContent = t ? `Partir faire les courses (${fmtDH(t)})` : 'Partir faire les courses';
  };
  sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    basket[b.dataset.m] = Math.max(0, Math.min(9, (basket[b.dataset.m] || 0) + +b.dataset.d));
    sync();
  });
  sheet.querySelector('#buy').onclick = () => {
    for (const k in basket) if (!basket[k]) delete basket[k];
    closeModal(); enqueue({ kind: 'out', lieu: 'marche', basket });
  };
}

// Fiche du personnage et du quartier
export function openFiche(tab = 'moi') {
  const s = G.s, J = s.job, sk = s.skills.cuisine, lvl = Math.floor(sk);
  const plats = s.plats.length ? s.plats.map(p => `${RECETTES[p.r].nom} (${QUAL[p.q]}) : ${p.n}`).join('<br>') : 'Aucun';
  const moi = `
    <div class="stat"><span>Cuisine</span><b>Niveau ${lvl}</b><div class="bar"><i style="width:${lvl >= 10 ? 100 : (sk - lvl) * 100}%"></i></div></div>
    <div class="stat"><span>Travail</span><b>${esc(JOB[J.level].titre)}</b><small>${fmtDH(JOB[J.level].salaire)} par semaine · ${J.week} jour${J.week > 1 ? 's' : ''} travaillé${J.week > 1 ? 's' : ''} cette semaine</small>
      <div class="bar"><i style="width:${J.perf}%"></i></div><small>Performance : ${Math.round(J.perf)} / 100 (promotion à 100)</small></div>
    <div class="stat"><span>Argent</span><b>${fmtDH(s.money)}</b></div>
    <div class="stat"><span>Ambiance de la maison</span><b>${ambiance(s.home)} / 30</b><small>Plus elle est belle, mieux on s'y sent.</small></div>
    <div class="stat"><span>Ingrédients au frais</span><small>Thé : ${s.inv.the || 0} · Msemen : ${s.inv.msemen || 0} · Tajine : ${s.inv.tajine || 0} · Casse-croûte : ${s.inv.snack || 0}</small></div>
    <div class="stat"><span>Plats prêts</span><small>${plats}</small></div>`;
  const heures = n => n.sorties.map(([a, b]) => `${fmtH(a)}–${fmtH(b)}`).join(' et ');
  const voisins = `${banner('illu-cafe')}<p class="hint">Le ${CAFE.nom.toLowerCase()} ouvre de ${CAFE.ouvre} h à ${CAFE.ferme} h. Les voisins passent dans la rue à leurs heures.</p>` +
    NPCS.map(n => { const v = s.rel[n.id] || 0, live = G.npcs.find(x => x.id === n.id); return `
    <div class="stat voisin"><span>${esc(n.nom)} · ${relLabel(v)}${live && live.visible ? ' · dans la rue' : ''}</span>
      <div class="bar"><i style="width:${v}%"></i></div><small>${esc(n.desc)} Dehors : ${heures(n)}.</small></div>`; }).join('');
  const sheet = openModal(`${closeBtn}<h2>${esc(s.char.name)}</h2>
    <p class="hint">${s.char.traits.map(t => TRAITS[t].nom).join(' · ') || 'Aucun trait'}</p>
    <nav class="tabs small"><button data-t="moi" class="${tab === 'moi' ? 'on' : ''}">Ma vie</button><button data-t="quartier" class="${tab === 'quartier' ? 'on' : ''}">Le quartier</button></nav>
    ${tab === 'moi' ? moi : voisins}`);
  bindClose(sheet);
  sheet.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => openFiche(b.dataset.t); });
}
const fmtH = h => { const m = Math.round((h % 1) * 60); return Math.floor(h) + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };

// Menu
export function openMenu() {
  const s = G.s;
  const sheet = openModal(`${closeBtn}<h2>Menu</h2>
    <div class="list">
      <button class="opt" id="mAuto"><span><b>Libre arbitre : ${s.autonomy ? 'activé' : 'désactivé'}</b>
        <small>${esc(s.char.name)} mange, dort, se lave et va au café tout(e) seul(e) quand rien n'est prévu.</small></span></button>
      <button class="opt" id="mHelp"><span><b>Comment jouer</b></span></button>
      <button class="opt danger" id="mNew"><span><b>Nouvelle partie</b><small>Efface la partie en cours.</small></span></button>
    </div>
    <div class="actions"><button class="btn primary" data-close>Reprendre</button></div>`);
  bindClose(sheet);
  sheet.querySelector('#mAuto').onclick = () => { s.autonomy = !s.autonomy; openMenu(); };
  sheet.querySelector('#mHelp').onclick = () => welcome();
  const nb = sheet.querySelector('#mNew');
  nb.onclick = () => {
    if (!nb.dataset.sure) { nb.dataset.sure = 1; nb.querySelector('b').textContent = 'Toucher encore pour tout effacer'; return; }
    H.onNewGame();
  };
}
