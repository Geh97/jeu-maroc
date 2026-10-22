// Affichage 3D : caméra, lumière du jour, quartier, appartement, personnages, aperçus du mode construction.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { W, D, X0, X1, Z1, FURN, WALL_COLORS, NPCS, PASSANTS, ANIMAUX } from './data.js';
import * as T from './textures.js';
import * as M from './models.js';
import { makeStreet, guirlandes } from './street.js';
import { parseEdge, furnCenter, footprint } from './world.js';

let renderer, scene, camera, controls, sun, hemi, amb, floorPlane, street;
const homeG = new THREE.Group(), helpers = new THREE.Group();
let segs = [], furnGroups = new Map(), lampLights = [], streetLights = [], ch = null, look = null;
const npcs = new Map(), animaux = new Map();
let wallMode = 'coupes', clock = 0, savedCam = null, userMovedAt = -10, follow = false;
const wallMat = new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.9 });
const sky = { day: new THREE.Color('#a8d8f0'), dusk: new THREE.Color('#f2a65a'), night: new THREE.Color('#0f1830') };

export function initScene(canvas) {
  const mobile = matchMedia('(pointer: coarse)').matches;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.background = sky.day.clone();
  scene.fog = new THREE.Fog(scene.background, 60, 150);
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const far = innerWidth < innerHeight ? 1.8 : 1; // écran en hauteur : on recule pour tout voir
  camera.position.set(W / 2 + 7 * far, 14 * far, D / 2 + 14 * far);
  controls = new OrbitControls(camera, canvas);
  controls.target.set(W / 2, 0, D / 2);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 48;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.3;
  controls.screenSpacePanning = false;
  controls.addEventListener('start', () => { userMovedAt = clock; });
  controls.update();

  hemi = new THREE.HemisphereLight('#e4f1ff', '#b39a7a', 1.1);
  sun = new THREE.DirectionalLight('#fff1d6', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 20, bottom: -20, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  sun.target.position.set(W / 2, 0, D / 2 + 4);
  amb = new THREE.AmbientLight('#ffd49a', 0);
  wallMat.map = T.tadelakt();
  scene.add(hemi, sun, sun.target, amb, homeG, helpers);
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight('#ffb35c', 0, 6, 2);
    scene.add(l); lampLights.push(l);
  }
  setQuartier({ quartier: 'populaire', withHome: true, vehicule: null, npcs: [] });
  floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 60, Z1 + 60), new THREE.MeshBasicMaterial({ visible: false }));
  floorPlane.rotation.x = -Math.PI / 2;
  floorPlane.position.set((X0 + X1) / 2, 0, Z1 / 2);
  floorPlane.userData.floor = true;
  scene.add(floorPlane);
  PASSANTS.forEach((look, i) => addNpc('p' + i, look));
  for (const def of ANIMAUX) {
    const a = M.makeAnimal(def);
    a.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(a.root); animaux.set(def.id, a);
  }
  addEventListener('resize', resize);
  resize();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
export const setControls = on => { controls.enabled = on; };

// ---------- Appartement ----------
function disposeGroup(g) {
  g.traverse(o => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); });
  g.clear();
}
// Un carreau de sol par case ; les cases voisines sont en miroir pour cacher les raccords.
const tileGeos = [];
function tileGeo(x, z) {
  const k = (x & 1) + (z & 1) * 2;
  if (tileGeos[k]) return tileGeos[k];
  const g = new THREE.PlaneGeometry(1, 1), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    if (x & 1) uv.setX(i, 1 - uv.getX(i));
    if (z & 1) uv.setY(i, 1 - uv.getY(i));
  }
  g.userData.keep = true;
  return (tileGeos[k] = g);
}
export function rebuildHome(home) {
  disposeGroup(homeG);
  segs = []; furnGroups = new Map();
  wallMat.color.set(WALL_COLORS[home.wall].c);
  const wsMat = home.wainscot === 'aucun' ? wallMat : wainscotMat(home.wainscot);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const m = new THREE.Mesh(tileGeo(x, z), floorMat(home.floors[z * W + x]));
    m.rotation.x = -Math.PI / 2; m.position.set(x + 0.5, 0.002, z + 0.5); m.receiveShadow = true;
    homeG.add(m);
  }
  const pillars = new Set();
  for (const k in home.edges) {
    const type = home.edges[k];
    if (type === 'none') continue;
    const e = parseEdge(k), g = M.makeWall(type, wallMat, wsMat);
    if (e.t === 'h') { g.position.set(e.x + 0.5, 0, e.z); pillars.add(e.x + ',' + e.z).add(e.x + 1 + ',' + e.z); }
    else { g.position.set(e.x, 0, e.z + 0.5); g.rotation.y = Math.PI / 2; pillars.add(e.x + ',' + e.z).add(e.x + ',' + (e.z + 1)); }
    g.traverse(o => { o.userData.edge = k; if (type === 'entree') o.userData.door = true; });
    homeG.add(g);
    segs.push({ g, x: g.position.x, z: g.position.z });
  }
  for (const p of pillars) {
    const [x, z] = p.split(',').map(Number), g = M.makePillar(wallMat, wsMat);
    g.position.set(x, 0, z); homeG.add(g);
    segs.push({ g, x, z });
  }
  let li = 0;
  for (const l of lampLights) l.userData.on = false;
  for (const f of home.furn) {
    const g = M.makeFurniture(f.type), c = furnCenter(f);
    g.position.set(c.x, 0, c.z); g.rotation.y = f.r * Math.PI / 2;
    g.traverse(o => { o.userData.fid = f.id; });
    homeG.add(g); furnGroups.set(f.id, g);
    if (g.userData.glow && li < lampLights.length) {
      const l = lampLights[li++]; l.position.set(c.x, g.userData.lightY, c.z); l.userData.on = true;
    }
  }
}
const fmats = {};
function floorMat(type) {
  return fmats[type] || (fmats[type] = new THREE.MeshStandardMaterial({ map: T.floorTex(type), roughness: type === 'marbre' ? 0.35 : 0.8 }));
}
const wsm = {};
function wainscotMat(kind) {
  return wsm[kind] || (wsm[kind] = new THREE.MeshStandardMaterial({
    map: kind === 'bleu' ? T.imgTex('sol-zellige-bleu', '#5a7aa8') : T.imgTex('sol-zellige-vert', '#5f8f78'), roughness: 0.5,
  }));
}

// ---------- Personnages ----------
export function setCharLook(c) {
  look = c;
  if (ch) scene.remove(ch.root);
  ch = M.makeCharacter(c);
  ch.root.traverse(o => { if (o.isMesh) o.castShadow = true; o.userData.char = true; });
  scene.add(ch.root);
}
// Changer de quartier : on reconstruit la rue, ses lumières et ses habitants.
export function setQuartier(ctx) {
  if (street) { disposeGroup(street); scene.remove(street); }
  for (const l of streetLights) scene.remove(l);
  streetLights = []; chairMeshes = null;
  street = makeStreet({ quartier: ctx.quartier, withHome: ctx.withHome, vehicule: ctx.vehicule });
  scene.add(street);
  for (const l of (street.userData.lamps || []).filter(l => !l.small)) {
    const p = new THREE.PointLight('#ffd27a', 0, 12, 1.6);
    p.position.set(l.x, l.y, l.z); scene.add(p); streetLights.push(p);
  }
  homeG.visible = ctx.withHome;
  if (ctx.ramadan) street.add(guirlandes());
  for (const [id, n] of [...npcs]) if (!id.startsWith('p')) { scene.remove(n.root); npcs.delete(id); }
  for (const def of ctx.npcs) addNpc(def.id, def.look);
}
function addNpc(id, lookDef) {
  const n = M.makeCharacter(lookDef);
  n.root.traverse(o => { if (o.isMesh) o.castShadow = true; o.userData.npc = id; });
  n.root.visible = false;
  scene.add(n.root);
  npcs.set(id, n);
}

// ---------- Caméra ----------
export function focusChar(on) {
  if (on) {
    savedCam = { p: camera.position.clone(), t: controls.target.clone() };
    // La fenêtre de création occupe la droite (ordinateur) ou le bas (téléphone).
    const p = ch.root.position, narrow = innerWidth < 700;
    controls.target.set(p.x + (narrow ? 0 : 0.55), narrow ? -0.4 : 1, p.z);
    camera.position.set(p.x + (narrow ? 0.5 : 0.95), narrow ? 1.6 : 1.8, p.z + (narrow ? 6 : 3.4));
  } else if (savedCam) {
    camera.position.copy(savedCam.p); controls.target.copy(savedCam.t); savedCam = null;
  }
  controls.update();
}
export function setWallMode(m) { wallMode = m; }
export const setFollow = on => { follow = on; };
export const debugCam = () => ({ cam: camera.position.toArray(), target: controls.target.toArray() });
export const debugChar = () => ch;
export const setCam = (x, y, z, tx, ty, tz) => { camera.position.set(x, y, z); controls.target.set(tx, ty, tz); userMovedAt = clock; controls.update(); };

// ---------- Image par image ----------
const tmpV = new THREE.Vector3();
export function updateFrame(dt, v) {
  clock += dt;
  if (v && ch) {
    ch.root.visible = v.visible;
    ch.root.position.set(v.x, 0, v.z);
    ch.root.rotation.y = v.yaw;
    M.pose(ch, v.pose, clock, v.walkPhase);
    for (const [id, g] of furnGroups) {
      const on = v.active && v.active.fid === id;
      if (g.userData.screen) {
        g.userData.screen.emissive.set(on && v.active.act === 'tele' ? '#6fa8ff' : '#000000');
        g.userData.screen.emissiveIntensity = 0.7 + Math.sin(clock * 9) * 0.15;
      }
      if (g.userData.fire) g.userData.fire.visible = on && v.active.act === 'cuisiner';
      if (g.userData.water) g.userData.water.visible = on && v.active.act === 'douche';
    }
    for (const nv of v.npcs || []) {
      const n = npcs.get(nv.id);
      if (!n) continue;
      n.root.visible = nv.visible;
      if (!nv.visible) continue;
      n.root.position.set(nv.x, 0, nv.z); n.root.rotation.y = nv.yaw;
      M.pose(n, nv.pose, clock + nv.x, nv.walkPhase);
    }
    for (const av of v.animaux || []) {
      const a = animaux.get(av.id);
      if (!a) continue;
      a.root.visible = av.visible !== false;
      a.root.position.set(av.x, 0, av.z); a.root.rotation.y = av.yaw;
      M.poseAnimal(a, av.pose, clock + av.x, av.walkPhase);
    }
    daylight(v.t);
    // Dehors, la caméra suit le personnage (sauf juste après un geste du joueur).
    if (follow && v.visible && v.outside && clock - userMovedAt > 2.5) {
      tmpV.set(v.x, 0.4, v.z).sub(controls.target).multiplyScalar(Math.min(1, dt * 2.5));
      controls.target.add(tmpV); camera.position.add(tmpV);
    }
  }
  const t = controls.target;
  const dx = Math.max(X0 + 2, Math.min(X1 - 2, t.x)) - t.x, dz = Math.max(-3, Math.min(Z1, t.z)) - t.z, dy = Math.max(0, Math.min(2, t.y)) - t.y;
  t.x += dx; t.z += dz; t.y += dy; camera.position.x += dx; camera.position.z += dz;
  controls.update();
  cutaway();
  renderer.render(scene, camera);
}

function daylight(t) {
  const h = (t / 60) % 24, p = (h - 6) / 14;
  const day = p > 0 && p < 1 ? Math.min(1, Math.sin(p * Math.PI) * 1.8) : 0;
  const a = Math.min(1, Math.max(0, p)) * Math.PI;
  sun.position.set(W / 2 - Math.cos(a) * 30, 6 + Math.sin(a) * 30, D / 2 + 18);
  sun.intensity = 2.4 * day;
  hemi.intensity = 0.35 + 0.8 * day;
  amb.intensity = (1 - day) * 0.9;
  const col = scene.background;
  if (day >= 1) col.copy(sky.day);
  else if (p > 0 && p < 1) col.copy(sky.night).lerp(sky.dusk, Math.min(1, day * 2)).lerp(sky.day, Math.max(0, day * 2 - 1));
  else col.copy(sky.night);
  scene.fog.color.copy(col);
  for (const l of lampLights) l.intensity = l.userData.on ? (1 - day) * 6 + 0.4 : 0;
  for (const l of streetLights) l.intensity = (1 - day) * 14;
  for (const g of furnGroups.values()) if (g.userData.glow) g.userData.glow.emissiveIntensity = 0.5 + (1 - day) * 1.8;
  for (const l of street.userData.lamps || []) l.mat.emissiveIntensity = (0.3 + (1 - day) * 1.6) * (l.k || 1);
}

// Murs coupés : on abaisse les murs du côté de la caméra pour voir dedans.
const tmp = new THREE.Vector3();
function cutaway() {
  tmp.subVectors(camera.position, controls.target); tmp.y = 0; tmp.normalize();
  const cx = W / 2, cz = D / 2;
  if (homeG.visible) for (const s of segs) {
    let low = wallMode === 'bas';
    if (wallMode === 'coupes') low = (s.x - cx) * tmp.x + (s.z - cz) * tmp.z > -1.2;
    s.g.scale.y = low ? 0.24 : 1;
  }
  for (const { a, poles } of street.userData.awnings || []) {
    const full = wallMode === 'hauts';
    a.scale.z = full ? 1 : 0.18; poles.visible = full;
  }
}

// ---------- Sélection à l'écran ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let chairMeshes = null;
export function pick(px, py, opts = {}) {
  ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!chairMeshes) { chairMeshes = []; street.traverse(o => { if (o.isMesh && (o.userData.chair != null || o.userData.hanout || o.userData.taxi || o.userData.agence || o.userData.plage)) chairMeshes.push(o); }); }
  const objs = [...(homeG.visible ? [...furnGroups.values(), ...segs.map(s => s.g)] : []), ...chairMeshes, floorPlane];
  if (!opts.build) {
    for (const n of npcs.values()) if (n.root.visible) objs.unshift(n.root);
    for (const a of animaux.values()) if (a.root.visible) objs.unshift(a.root);
  }
  if (ch && ch.root.visible) objs.unshift(ch.root);
  for (const h of ray.intersectObjects(objs, true)) {
    const u = h.object.userData;
    if (u.char) return { type: 'char' };
    if (u.npc) return { type: 'npc', id: u.npc };
    if (u.animal) return { type: 'animal', id: u.animal };
    if (u.chair != null) return { type: 'chair', id: u.chair };
    if (u.hanout && !opts.build) return { type: 'hanout' };
    if (u.taxi && !opts.build) return { type: 'taxi' };
    if (u.agence && !opts.build) return { type: 'agence' };
    if (u.plage && !opts.build) return { type: 'plage', act: u.plage, x: Math.floor(h.point.x), z: Math.floor(h.point.z), px: u.px, pz: u.pz };
    if (u.fid != null) {
      if (!opts.build && FURN[typeOf(u.fid)].sol) return floorHit(h.point);
      return { type: 'furn', id: u.fid, point: h.point };
    }
    if (u.door && !opts.build) return { type: 'door', edge: u.edge };
    if (u.edge) { if (opts.build) return { type: 'edge', key: u.edge, ...floorHit(h.point) }; continue; }
    if (u.floor) return floorHit(h.point);
  }
  return null;
}
let typeOf = () => 'plante';
export function setTypeLookup(fn) { typeOf = fn; }
function floorHit(p) {
  return { type: 'floor', x: Math.floor(p.x), z: Math.floor(p.z), px: p.x, pz: p.z, inside: p.x >= 0 && p.z >= 0 && p.x < W && p.z < D };
}

// ---------- Aperçus du mode construction ----------
let ghost = null, ghostType = null;
const ghostOk = new THREE.MeshStandardMaterial({ color: '#5fd17a', transparent: true, opacity: 0.55, depthWrite: false });
const ghostBad = new THREE.MeshStandardMaterial({ color: '#e35d5d', transparent: true, opacity: 0.55, depthWrite: false });
export function showGhost(type, x, z, r, ok) {
  if (ghostType !== type) {
    if (ghost) helpers.remove(ghost);
    ghost = M.makeFurniture(type); ghostType = type;
    helpers.add(ghost);
  }
  ghost.traverse(o => { if (o.isMesh) { o.material = ok ? ghostOk : ghostBad; o.castShadow = false; } });
  const { w, d } = footprint(type, r);
  ghost.position.set(x + w / 2, 0.01, z + d / 2);
  ghost.rotation.y = r * Math.PI / 2;
  ghost.visible = true;
}
export function hideGhost() { if (ghost) ghost.visible = false; }

const marks = new THREE.Group(); helpers.add(marks);
const markOk = new THREE.MeshBasicMaterial({ color: '#f4c542', transparent: true, opacity: 0.85, depthTest: false });
const markBad = new THREE.MeshBasicMaterial({ color: '#e35d5d', transparent: true, opacity: 0.85, depthTest: false });
export function clearMarks() { disposeGroup(marks); }
export function markEdges(list, ok = true) {
  for (const e of list) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.16), ok ? markOk : markBad);
    m.renderOrder = 10;
    if (e.t === 'h') m.position.set(e.x + 0.5, 0.7, e.z);
    else { m.position.set(e.x, 0.7, e.z + 0.5); m.rotation.y = Math.PI / 2; }
    marks.add(m);
  }
}
export function markCorner(x, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 16), markOk);
  m.renderOrder = 10; m.position.set(x, 0.45, z); marks.add(m);
}
export function markTiles(list, ok = true) {
  for (const t of list) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.94), ok ? markOk : markBad);
    m.material.opacity = 0.45; m.renderOrder = 10;
    m.rotation.x = -Math.PI / 2; m.position.set(t.x + 0.5, 0.03, t.z + 0.5); marks.add(m);
  }
}
export function markFurn(id) {
  const g = furnGroups.get(id);
  if (!g) return;
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 16), markOk);
  m.rotation.x = Math.PI; m.renderOrder = 10;
  const b = new THREE.Box3().setFromObject(g);
  m.position.set(g.position.x, b.max.y + 0.4, g.position.z);
  marks.add(m);
}
export function markGoto(x, z) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.3, 24), markOk);
  m.rotation.x = -Math.PI / 2; m.position.set(x + 0.5, 0.04, z + 0.5); m.renderOrder = 10;
  marks.add(m);
  setTimeout(() => { marks.remove(m); m.geometry.dispose(); }, 700);
}
