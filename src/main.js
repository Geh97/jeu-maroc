// Démarrage, boucle de jeu et gestion du toucher / de la souris.
import { SPEEDS } from './data.js';
import {
  G, hooks, newGame, load, save, wipe, advance, view, enqueue, enqueueWork, cancelAll,
  availableActions, doorActions,
} from './sim.js';
import { defaultHome } from './world.js';
import * as S from './scene.js';
import * as UI from './ui.js';
import * as BLD from './build.js';

const canvas = document.getElementById('c');
S.initScene(canvas);
S.setTypeLookup(id => (G.s && G.s.home.furn.find(f => f.id === id) || { type: 'plante' }).type);
hooks.toast = UI.toast;
window.jeu = { G, advance }; // pour tester depuis la console du navigateur

const walls = ['coupes', 'bas', 'hauts'];
let wallIdx = 0, preview = null;

UI.initHud({
  onSpeed: n => { if (G.mode === 'live') G.speed = n; UI.updateHud(); },
  onMode: () => toggleMode(),
  onWalls: () => { wallIdx = (wallIdx + 1) % 3; S.setWallMode(walls[wallIdx]); UI.setWallsLabel(walls[wallIdx]); },
  onNewGame: () => { UI.closeModal(); if (G.mode === 'build') toggleMode(); wipe(); creation(); },
});
BLD.initPanel();

function toggleMode() {
  UI.hidePop();
  if (G.mode === 'live') { G.mode = 'build'; BLD.enter(); }
  else { BLD.exit(); G.mode = 'live'; }
  UI.setMode(G.mode);
  UI.updateHud();
}

function start() {
  preview = null;
  S.rebuildHome(G.s.home);
  S.setCharLook(G.s.char);
  UI.showHud(true);
  UI.setMode('live');
  UI.updateHud();
}

// Création du personnage, devant le salon de l'appartement.
function creation() {
  UI.showHud(false);
  const home = defaultHome();
  S.rebuildHome(home);
  const look = UI.randomLook();
  S.setCharLook(look);
  preview = { visible: true, x: 4.5, z: 6.2, yaw: 0, pose: { base: 'stand' }, walkPhase: 0, t: 11 * 60, active: null };
  S.updateFrame(0, preview);
  S.focusChar(true);
  UI.openCreation(look, l => S.setCharLook(l), l => {
    S.focusChar(false);
    newGame({ ...l, traits: [...l.traits] });
    start();
    UI.welcome();
  });
}

if (load()) start(); else creation();

// ---------- Boucle ----------
let last = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let v = preview;
  if (G.s) {
    if (G.mode === 'live' && !G.modal) advance(dt * SPEEDS[G.speed]);
    if (G.s) v = view();
  }
  S.updateFrame(dt, v);
  hudT += dt;
  if (G.s && hudT > 0.2) { hudT = 0; UI.updateHud(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Toucher et clics ----------
const pointers = new Map();
let down = null;
canvas.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, e);
  if (pointers.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false, type: e.pointerType, button: e.button };
  else if (down) down.multi = true;
});
canvas.addEventListener('pointerup', e => {
  pointers.delete(e.pointerId);
  if (down && !down.multi && down.button === 0 && performance.now() - down.t < 600 &&
      Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) onTap(e.clientX, e.clientY, down.type);
  if (!pointers.size) down = null;
});
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); down = null; });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && !e.buttons && G.s && G.mode === 'build' && !G.modal) BLD.hover(e.clientX, e.clientY);
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

function onTap(x, y, type) {
  if (!G.s || G.modal) return;
  if (!UI.$('pop').hidden) { UI.hidePop(); return; }
  if (G.mode === 'build') return BLD.tap(x, y, type);
  if (G.s.away) return;
  const h = S.pick(x, y);
  if (!h) return;
  if (h.type === 'furn') {
    UI.showPop(x, y, availableActions(h.id), it => enqueue({ kind: 'act', fid: h.id, act: it.act, param: it.param }));
  } else if (h.type === 'door') {
    UI.showPop(x, y, doorActions(), it => (it.act === 'travail' ? enqueueWork() : UI.openLieu(it.param)));
  } else if (h.type === 'char') {
    const busy = G.cur || G.queue.length;
    UI.showPop(x, y, {
      title: G.s.char.name,
      items: [{ act: 'fiche', label: 'Voir la fiche' }, { act: 'stop', label: 'Tout annuler', disabled: !busy }],
    }, it => (it.act === 'fiche' ? UI.openFiche() : cancelAll()));
  } else if (h.type === 'floor' && h.inside) {
    enqueue({ kind: 'goto', x: h.x, z: h.z });
    S.markGoto(h.x, h.z);
  }
}
document.addEventListener('pointerdown', e => {
  if (!UI.$('pop').hidden && !e.target.closest('#pop') && e.target !== canvas) UI.hidePop();
});

addEventListener('keydown', e => {
  if (!G.s || G.modal || e.target.tagName === 'INPUT') return;
  if (e.key === ' ') { e.preventDefault(); G.speed = G.speed ? 0 : 1; }
  if (['1', '2', '3'].includes(e.key) && G.mode === 'live') G.speed = +e.key;
  if (G.mode === 'build') BLD.key(e.key);
  UI.updateHud();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);
