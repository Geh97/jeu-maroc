// Modèles 3D faits de formes simples : meubles, murs, personnages, la rue et le café.
import * as THREE from 'three';
import * as T from './textures.js';
import { W, D, X0, X1, Z1, RUE, CAFE } from './data.js';

const mats = {};
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }));
}
const texMat = (key, map, o = {}) => mats[key] || (mats[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o }));
const BRASS = () => mat('#c9a24a', { metalness: 0.6, roughness: 0.35 });
const SILVER = () => mat('#d8d8dc', { metalness: 0.8, roughness: 0.25 });
const GLASS = () => mat('#9fc9e8', { transparent: true, opacity: 0.3, roughness: 0.1 });

function add(g, m, shadow = true) { m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; }
function box(g, w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return add(g, m);
}
function cyl(g, rt, rb, h, material, x = 0, y = 0, z = 0, seg = 18) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); m.position.set(x, y, z); return add(g, m);
}
function sph(g, r, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), material); m.position.set(x, y, z); return add(g, m);
}

// ---------- Meubles (face avant vers +z, centrés sur leur emprise) ----------
const BUILD = {
  banquette(g) {
    const wood = mat('#5a3423'), fab = texMat('tissu-banquette', T.tissuBanquette());
    box(g, 1.96, 0.3, 0.84, wood, 0, 0.15, 0);
    box(g, 1.96, 0.03, 0.86, BRASS(), 0, 0.3, 0);
    box(g, 1.9, 0.14, 0.76, fab, 0, 0.38, 0.02);
    box(g, 1.9, 0.44, 0.16, fab, 0, 0.66, -0.32);
    const c1 = box(g, 0.4, 0.3, 0.1, mat('#c9a24a'), -0.55, 0.62, -0.2); c1.rotation.x = -0.2;
    const c2 = box(g, 0.4, 0.3, 0.1, mat('#1f6b4f'), 0.55, 0.62, -0.2); c2.rotation.x = -0.2;
  },
  mida(g) {
    cyl(g, 0.38, 0.32, 0.32, mat('#4a2a1c'), 0, 0.16, 0, 8);
    cyl(g, 0.42, 0.42, 0.025, BRASS(), 0, 0.335, 0, 28);
    sph(g, 0.065, SILVER(), 0.08, 0.41, 0);
    cyl(g, 0.03, 0.05, 0.05, SILVER(), 0.08, 0.48, 0);
    const sp = cyl(g, 0.01, 0.015, 0.12, SILVER(), 0.15, 0.43, 0); sp.rotation.z = -0.9;
    for (const [x, z] of [[-0.14, 0.12], [-0.18, -0.06], [-0.02, -0.18]]) cyl(g, 0.025, 0.02, 0.07, mat('#8fd0a6', { transparent: true, opacity: 0.75 }), x, 0.385, z, 10);
  },
  pouf(g) {
    cyl(g, 0.3, 0.32, 0.34, mat('#b06a35'), 0, 0.17, 0, 20);
    cyl(g, 0.2, 0.2, 0.006, mat('#7a4220'), 0, 0.344, 0, 20);
  },
  tv(g) {
    box(g, 0.92, 0.42, 0.42, mat('#6b4430'), 0, 0.21, 0);
    box(g, 0.9, 0.55, 0.05, mat('#151515', { roughness: 0.4 }), 0, 0.76, -0.04);
    box(g, 0.2, 0.04, 0.16, mat('#151515'), 0, 0.44, -0.04);
    const screen = new THREE.MeshStandardMaterial({ color: '#0d0d10', emissive: '#000000', roughness: 0.3 });
    box(g, 0.84, 0.49, 0.01, screen, 0, 0.76, -0.01);
    g.userData.screen = screen;
  },
  tapis(g) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), texMat('tapis-berbere', T.tapisBerbere()));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.receiveShadow = true; g.add(m);
  },
  lit(g, w = 1.8) {
    const wood = mat('#8b5a3c'), blanket = texMat('fab-bleu', T.tissu('#2e5c8a', '#e8d9b0'));
    box(g, w, 0.3, 1.9, wood, 0, 0.15, 0);
    box(g, w - 0.1, 0.2, 1.8, mat('#f3f0ea'), 0, 0.4, 0);
    box(g, w - 0.06, 0.08, 1.2, blanket, 0, 0.53, 0.3);
    const pw = w > 1 ? 0.6 : 0.5;
    for (const x of w > 1 ? [-0.4, 0.4] : [0]) box(g, pw, 0.12, 0.3, mat('#ffffff'), x, 0.56, -0.66);
    box(g, w + 0.1, 0.95, 0.08, wood, 0, 0.47, -0.95);
    box(g, w + 0.14, 0.06, 0.12, BRASS(), 0, 0.97, -0.95);
  },
  lit1(g) { BUILD.lit(g, 0.9); },
  armoire(g) {
    const wood = mat('#7a4a2c');
    box(g, 1.8, 2, 0.58, wood, 0, 1, 0);
    box(g, 1.88, 0.08, 0.64, mat('#5a3423'), 0, 2.02, 0);
    box(g, 0.02, 1.8, 0.01, mat('#3d2416'), 0, 1, 0.295);
    for (const x of [-0.08, 0.08]) sph(g, 0.03, BRASS(), x, 1, 0.31);
  },
  cuisiniere(g) {
    box(g, 0.8, 0.86, 0.66, mat('#ecebe6', { roughness: 0.5 }), 0, 0.43, 0);
    box(g, 0.8, 0.02, 0.66, mat('#222222'), 0, 0.87, 0);
    for (const [x, z] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) cyl(g, 0.09, 0.09, 0.02, mat('#333333'), x, 0.89, z);
    box(g, 0.55, 0.3, 0.01, mat('#1a1a1a', { roughness: 0.3 }), 0, 0.45, 0.335);
    for (const x of [-0.27, -0.09, 0.09, 0.27]) { const k = cyl(g, 0.025, 0.025, 0.03, mat('#555555'), x, 0.75, 0.34, 10); k.rotation.x = Math.PI / 2; }
    sph(g, 0.08, SILVER(), 0.2, 0.97, 0.15);
    cyl(g, 0.035, 0.055, 0.06, SILVER(), 0.2, 1.06, 0.15);
    const sp = cyl(g, 0.012, 0.018, 0.14, SILVER(), 0.29, 1, 0.15); sp.rotation.z = -0.9;
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.08, 12), new THREE.MeshBasicMaterial({ color: '#4aa3ff', transparent: true, opacity: 0.8 }));
    fire.position.set(-0.2, 0.93, -0.15); fire.visible = false; g.add(fire);
    g.userData.fire = fire;
  },
  frigo(g) {
    box(g, 0.78, 1.8, 0.68, mat('#f4f4f2', { roughness: 0.4 }), 0, 0.9, 0);
    box(g, 0.79, 0.012, 0.012, mat('#999999'), 0, 1.25, 0.345);
    for (const y of [1.5, 0.9]) box(g, 0.03, 0.3, 0.04, mat('#b8b8b8', { metalness: 0.5 }), 0.3, y, 0.36);
    box(g, 0.08, 0.08, 0.01, mat('#d9a43a'), -0.15, 1.5, 0.345);
    box(g, 0.06, 0.09, 0.01, mat('#1f6b4f'), -0.05, 1.42, 0.345);
  },
  plan(g) {
    box(g, 0.96, 0.82, 0.62, mat('#c79a68'), 0, 0.41, 0);
    box(g, 0.98, 0.05, 0.66, mat('#efeae0', { roughness: 0.4 }), 0, 0.845, 0);
    box(g, 0.01, 0.6, 0.01, mat('#8b6440'), 0, 0.42, 0.315);
    cyl(g, 0.21, 0.19, 0.04, mat('#a94f2b'), 0, 0.89, 0, 24);
    cyl(g, 0.01, 0.17, 0.26, mat('#c0643a'), 0, 1.04, 0, 24);
    sph(g, 0.025, mat('#c0643a'), 0, 1.18, 0);
  },
  table(g) {
    const wood = mat('#8a5a3b');
    box(g, 1.5, 0.05, 0.82, wood, 0, 0.75, 0);
    for (const [x, z] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) box(g, 0.06, 0.73, 0.06, wood, x, 0.365, z);
    for (const x of [-0.4, 0.4]) { cyl(g, 0.17, 0.17, 0.04, mat('#5a3423'), x, 0.45, 0.32); cyl(g, 0.03, 0.05, 0.43, mat('#5a3423'), x, 0.215, 0.32, 8); }
    cyl(g, 0.13, 0.13, 0.03, mat('#d7a35c'), 0.2, 0.79, 0, 20);
  },
  douche(g) {
    box(g, 0.92, 0.07, 0.92, mat('#f4f4f2', { roughness: 0.4 }), 0, 0.035, 0);
    box(g, 0.92, 1.9, 0.02, texMat('zel-bleu-mur', T.imgTex('sol-zellige-bleu', '#5a7aa8')), 0, 1.02, -0.45);
    box(g, 0.02, 1.9, 0.92, GLASS(), 0.45, 1.02, 0);
    box(g, 0.02, 1.9, 0.92, GLASS(), -0.45, 1.02, 0);
    cyl(g, 0.015, 0.015, 1.7, SILVER(), 0.25, 1.1, -0.42, 8);
    const hd = cyl(g, 0.08, 0.08, 0.03, SILVER(), 0.25, 1.95, -0.3); hd.rotation.x = 0.4;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.3, 1.8, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
    water.position.set(0.25, 1.02, -0.2); water.visible = false; g.add(water);
    g.userData.water = water;
  },
  lanterne(g) {
    const iron = mat('#2a2a2a', { metalness: 0.4, roughness: 0.5 });
    cyl(g, 0.15, 0.18, 0.05, iron, 0, 0.025, 0);
    cyl(g, 0.025, 0.025, 1.3, iron, 0, 0.675, 0, 8);
    const glow = new THREE.MeshStandardMaterial({ color: '#ffcf86', emissive: '#ffb347', emissiveIntensity: 0.5, roughness: 0.6 });
    cyl(g, 0.15, 0.12, 0.36, glow, 0, 1.42, 0, 6);
    cyl(g, 0.0, 0.17, 0.18, BRASS(), 0, 1.69, 0, 6);
    cyl(g, 0.12, 0.0, 0.1, BRASS(), 0, 1.19, 0, 6);
    sph(g, 0.03, BRASS(), 0, 1.8, 0);
    g.userData.glow = glow;
    g.userData.lightY = 1.42;
  },
  jarre(g) {
    const pts = [[0.05, 0], [0.2, 0.06], [0.3, 0.35], [0.27, 0.65], [0.14, 0.86], [0.12, 0.92], [0.16, 0.98]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat('#b9643f'));
    add(g, m);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.012, 6, 32), mat('#3b2418'));
    band.rotation.x = Math.PI / 2; band.position.y = 0.45; g.add(band);
  },
  biblio(g) {
    const wood = mat('#7a4a2c');
    box(g, 1.9, 2, 0.36, wood, 0, 1, 0);
    box(g, 1.8, 1.9, 0.02, mat('#4a2c18'), 0, 1, -0.16);
    const cols = ['#7a2e3a', '#2f4f7a', '#2e6b57', '#c99a3a', '#e8e1d3', '#5b3d6e', '#b5562e', '#3a3a3a'];
    for (let s = 0; s < 4; s++) {
      box(g, 1.8, 0.04, 0.34, wood, 0, 0.42 + s * 0.46, 0);
      let x = -0.82;
      for (let i = 0; i < 9 && x < 0.8; i++) {
        const w = 0.09 + ((s * 7 + i * 3) % 4) * 0.03, h = 0.26 + ((s + i) % 3) * 0.05;
        box(g, w, h, 0.26, mat(cols[(s * 3 + i) % cols.length]), x + w / 2, 0.44 + s * 0.46 + h / 2, -0.02);
        x += w + 0.015;
      }
    }
  },
  plante(g) {
    cyl(g, 0.2, 0.15, 0.36, mat('#b5562e'), 0, 0.18, 0);
    cyl(g, 0.18, 0.18, 0.02, mat('#4a3324'), 0, 0.35, 0);
    const greens = [mat('#3f7a3a'), mat('#4f8f45'), mat('#2f6b33')];
    [[0, 0.62, 0, 0.2], [0.12, 0.78, 0.05, 0.16], [-0.1, 0.82, -0.06, 0.15], [0.02, 0.98, 0.02, 0.13], [-0.06, 0.6, 0.12, 0.13]]
      .forEach(([x, y, z, r], i) => sph(g, r, greens[i % 3], x, y, z));
  },
};
export function makeFurniture(type) {
  const g = new THREE.Group();
  BUILD[type](g);
  return g;
}

// ---------- Murs (segment de 1 m le long de X, centré) ----------
export const WALL_H = 2.6;
const T_W = 0.12;
function archShape(open = 0.8, spring = 1.75) {
  const s = new THREE.Shape(), r = open / 2;
  s.moveTo(-0.5, 0); s.lineTo(-r, 0); s.lineTo(-r, spring);
  s.absarc(0, spring, r, Math.PI, 0, true);
  s.lineTo(r, 0); s.lineTo(0.5, 0); s.lineTo(0.5, WALL_H); s.lineTo(-0.5, WALL_H); s.closePath();
  return s;
}
function archFill(open = 0.8, spring = 1.75) {
  const s = new THREE.Shape(), r = open / 2;
  s.moveTo(-r, 0); s.lineTo(-r, spring); s.absarc(0, spring, r, Math.PI, 0, true); s.lineTo(r, 0); s.closePath();
  return s;
}
let archGeo, fillGeo;
export function makeWall(type, wallMat, wsMat) {
  const g = new THREE.Group();
  if (type === 'wall') {
    box(g, 1, WALL_H - 0.6, T_W, wallMat, 0, 0.6 + (WALL_H - 0.6) / 2, 0);
    box(g, 1, 0.6, T_W + 0.01, wsMat, 0, 0.3, 0);
  } else if (type === 'window') {
    box(g, 1, 0.6, T_W + 0.01, wsMat, 0, 0.3, 0);
    box(g, 1, 0.3, T_W, wallMat, 0, 0.75, 0);
    box(g, 1, WALL_H - 2, T_W, wallMat, 0, 2 + (WALL_H - 2) / 2, 0);
    for (const x of [-0.45, 0.45]) box(g, 0.1, 1.1, T_W, wallMat, x, 1.45, 0);
    box(g, 0.8, 1.1, 0.02, GLASS(), 0, 1.45, 0);
    const grid = mat('#5a3423');
    for (const x of [-0.2, 0, 0.2]) box(g, 0.025, 1.1, 0.03, grid, x, 1.45, 0);
    for (const y of [1.1, 1.45, 1.8]) box(g, 0.8, 0.025, 0.03, grid, 0, y, 0);
    box(g, 1.02, 0.05, 0.22, mat('#e9e2d4'), 0, 0.92, 0);
  } else {
    archGeo = archGeo || new THREE.ExtrudeGeometry(archShape(), { depth: T_W, bevelEnabled: false, curveSegments: 16 });
    const m = new THREE.Mesh(archGeo, wallMat); m.position.z = -T_W / 2; add(g, m);
    for (const x of [-0.45, 0.45]) box(g, 0.1, 0.6, T_W + 0.01, wsMat, x, 0.3, 0);
    if (type === 'entree') {
      fillGeo = fillGeo || new THREE.ExtrudeGeometry(archFill(), { depth: 0.05, bevelEnabled: false, curveSegments: 16 });
      const door = new THREE.Mesh(fillGeo, mat('#1f5a45')); door.position.z = -0.025; add(g, door);
      for (const y of [0.4, 0.8, 1.2, 1.6]) for (const x of [-0.25, 0, 0.25]) {
        for (const z of [0.03, -0.03]) sph(g, 0.018, BRASS(), x, y, z);
      }
      for (const z of [0.04, -0.04]) {
        const k = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), BRASS()); k.position.set(0.22, 1.05, z); g.add(k);
      }
    }
  }
  return g;
}
export function makePillar(wallMat, wsMat) {
  const g = new THREE.Group();
  box(g, 0.13, WALL_H, 0.13, wallMat, 0, WALL_H / 2, 0);
  box(g, 0.14, 0.6, 0.14, wsMat, 0, 0.3, 0);
  return g;
}

// ---------- Personnage ----------
export function makeCharacter(c) {
  const root = new THREE.Group(), inner = new THREE.Group();
  root.add(inner);
  const skin = mat(c.skin, { roughness: 0.7 }), hairM = mat(c.hairColor || '#1d1714', { roughness: 0.9 }), cloth = mat(c.outfitColor, { roughness: 0.85 });
  const long = c.outfit === 'djellaba' || c.outfit === 'caftan';
  const legM = mat(c.outfit === 'jean' ? '#3d5a85' : c.outfit === 'costume' ? '#26262e' : '#d9cfc0');
  const shoeM = mat(long ? '#e2bd4a' : '#2a2420');
  const mkLeg = x => {
    const p = new THREE.Group(); p.position.set(x, 0.8, 0); inner.add(p);
    cyl(p, 0.075, 0.065, 0.74, legM, 0, -0.37, 0, 12);
    box(p, 0.11, 0.07, 0.22, shoeM, 0, -0.765, 0.04);
    return p;
  };
  const legL = mkLeg(0.1), legR = mkLeg(-0.1);
  if (c.outfit === 'jean') {
    cyl(inner, 0.16, 0.15, 0.56, cloth, 0, 1.08, 0, 16);
    cyl(inner, 0.155, 0.155, 0.14, legM, 0, 0.8, 0, 16);
  } else if (c.outfit === 'costume') {
    cyl(inner, 0.17, 0.155, 0.6, cloth, 0, 1.08, 0, 16);
    box(inner, 0.12, 0.1, 0.02, mat('#ffffff'), 0, 1.3, 0.15);
    box(inner, 0.04, 0.22, 0.02, mat('#7a2e3a'), 0, 1.18, 0.16);
  } else if (c.outfit === 'djellaba') {
    cyl(inner, 0.17, 0.29, 1.27, cloth, 0, 0.74, 0, 18);
    const hood = sph(inner, 0.12, cloth, 0, 1.36, -0.15); hood.scale.set(1, 0.9, 0.7);
    const tip = cyl(inner, 0, 0.05, 0.16, cloth, 0, 1.3, -0.24, 8); tip.rotation.x = -2.6;
    box(inner, 0.025, 0.9, 0.01, mat('#c9a24a'), 0, 0.95, 0.2).rotation.x = -0.1;
  } else {
    cyl(inner, 0.16, 0.36, 1.27, cloth, 0, 0.74, 0, 22);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.035, 8, 24), BRASS());
    belt.rotation.x = Math.PI / 2; belt.position.y = 1.0; inner.add(belt);
    box(inner, 0.03, 1.1, 0.01, mat('#c9a24a'), 0, 0.62, 0.27).rotation.x = -0.16;
  }
  const mkArm = x => {
    const p = new THREE.Group(); p.position.set(x, 1.34, 0); inner.add(p);
    if (c.outfit === 'jean') {
      cyl(p, 0.065, 0.06, 0.16, cloth, 0, -0.08, 0, 10);
      cyl(p, 0.045, 0.042, 0.46, skin, 0, -0.36, 0, 10);
    } else if (c.outfit === 'caftan') cyl(p, 0.06, 0.11, 0.56, cloth, 0, -0.28, 0, 12);
    else cyl(p, 0.055, 0.05, 0.56, cloth, 0, -0.28, 0, 10);
    sph(p, 0.05, skin, 0, -0.6, 0);
    return p;
  };
  const armL = mkArm(0.21), armR = mkArm(-0.21);
  sph(inner, 0.1, cloth, 0, 1.32, 0).scale.set(2.1, 0.7, 1.3);
  cyl(inner, 0.055, 0.06, 0.12, skin, 0, 1.42, 0, 10);
  const head = sph(inner, 0.135, skin, 0, 1.6, 0); head.scale.set(1, 1.08, 1);
  for (const x of [0.048, -0.048]) {
    sph(inner, 0.018, mat('#1a1a1a', { roughness: 0.3 }), x, 1.62, 0.122);
    box(inner, 0.05, 0.012, 0.01, hairM, x, 1.665, 0.128);
  }
  sph(inner, 0.022, skin, 0, 1.585, 0.137);
  box(inner, 0.05, 0.01, 0.01, mat('#9a4a3c'), 0, 1.535, 0.128);
  const cap = (theta = 0.55) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.146, 20, 12, 0, Math.PI * 2, 0, Math.PI * theta), hairM);
    m.position.set(0, 1.61, -0.008); m.scale.set(1, 1.1, 1.04); m.rotation.x = -0.25; return add(inner, m);
  };
  if (c.hair === 'courte') cap(0.5);
  if (c.hair === 'rasee') cap(0.42);
  if (c.hair === 'longue') { cap(0.55); box(inner, 0.27, 0.4, 0.09, hairM, 0, 1.45, -0.1); }
  if (c.hair === 'attachee') { cap(0.55); sph(inner, 0.07, hairM, 0, 1.68, -0.15); }
  if (c.hair === 'foulard') {
    const sc = mat(c.scarfColor || '#2f4f7a', { roughness: 0.9, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.162, 22, 14, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.68), sc);
    m.position.set(0, 1.6, -0.005); m.scale.set(1, 1.1, 1.05); add(inner, m);
    cyl(inner, 0.13, 0.24, 0.26, sc, 0, 1.38, -0.01, 20);
  }
  return { root, inner, legL, legR, armL, armR };
}

// Applique une posture (debout, marche, assis, couché) et une petite animation.
export function pose(ch, p, t, walkPhase) {
  const { inner, legL, legR, armL, armR } = ch;
  inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0);
  for (const l of [legL, legR, armL, armR]) l.rotation.set(0, 0, 0);
  inner.scale.y = 1 + Math.sin(t * 2.2) * 0.006;
  if (p.base === 'walk') {
    const a = Math.sin(walkPhase) * 0.55;
    legL.rotation.x = a; legR.rotation.x = -a; armL.rotation.x = -a * 0.8; armR.rotation.x = a * 0.8;
    inner.position.y = Math.abs(Math.cos(walkPhase)) * 0.03;
  } else if (p.base === 'sit') {
    inner.position.y = (p.h || 0.45) - 0.8;
    legL.rotation.x = legR.rotation.x = -1.45;
    armL.rotation.x = armR.rotation.x = -0.35;
  } else if (p.base === 'lie') {
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(0, (p.h || 0) + 0.17, 0.87);
    inner.scale.y = 1;
  }
  if (p.anim === 'cook') { armL.rotation.x = -0.9 + Math.sin(t * 5) * 0.15; armR.rotation.x = -0.9 - Math.sin(t * 5) * 0.15; }
  if (p.anim === 'eat') armR.rotation.x = -1.2 + Math.max(0, Math.sin(t * 3)) * 0.7;
  if (p.anim === 'talk') { armR.rotation.x = -0.7 + Math.sin(t * 4) * 0.3; armR.rotation.z = -0.3; inner.rotation.x = Math.sin(t * 2.5) * 0.02; }
  if (p.anim === 'read') { armL.rotation.x = armR.rotation.x = -1.3; armL.rotation.z = 0.45; armR.rotation.z = -0.45; inner.rotation.x = 0.12 + Math.sin(t * 1.5) * 0.01; }
  if (p.anim === 'pet') { inner.rotation.x = 0.35; armR.rotation.x = -1.1 + Math.sin(t * 4) * 0.2; armL.rotation.x = -0.6; }
  if (p.anim === 'shower') { armL.rotation.x = armR.rotation.x = -2.6 + Math.sin(t * 4) * 0.2; inner.position.y = p.h || 0; }
}

// ---------- Animaux (chien, chat), tête vers +z ----------
export function makeAnimal(def) {
  const root = new THREE.Group(), inner = new THREE.Group(), chat = def.espece === 'chat';
  root.add(inner);
  const fur = mat(def.couleur, { roughness: 0.95 }), dark = mat('#4a3f35', { roughness: 0.9 });
  const k = chat ? 0.55 : 1, legH = 0.3 * k, bodyY = legH + 0.16 * k;
  const body = box(inner, 0.26 * k, 0.28 * k, 0.62 * k, fur, 0, bodyY, 0);
  if (chat) for (let i = -2; i <= 2; i++) box(inner, 0.27 * k, 0.29 * k, 0.05 * k, dark, 0, bodyY, i * 0.12 * k);
  const head = box(inner, 0.24 * k, 0.24 * k, 0.26 * k, fur, 0, bodyY + 0.14 * k, 0.38 * k);
  box(inner, 0.14 * k, 0.12 * k, 0.16 * k, chat ? fur : mat('#8a6a4a'), 0, bodyY + 0.08 * k, 0.52 * k);
  sph(inner, 0.035 * k, dark, 0, bodyY + 0.1 * k, 0.6 * k);
  for (const x of [-0.07, 0.07]) sph(inner, 0.025 * k, dark, x * k, bodyY + 0.18 * k, 0.5 * k);
  for (const x of [-0.09, 0.09]) {
    const ear = chat ? cyl(inner, 0, 0.05 * k, 0.1 * k, fur, x * k, bodyY + 0.3 * k, 0.36 * k, 4) : box(inner, 0.07 * k, 0.16 * k, 0.04 * k, dark, x * 1.4 * k, bodyY + 0.14 * k, 0.33 * k);
    if (!chat) ear.rotation.x = 0.3;
  }
  const legs = [];
  for (const [x, z] of [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]]) {
    const p = new THREE.Group(); p.position.set(x * k, legH, z * k); inner.add(p);
    box(p, 0.08 * k, legH, 0.09 * k, fur, 0, -legH / 2, 0);
    legs.push(p);
  }
  const tail = new THREE.Group(); tail.position.set(0, bodyY + 0.08 * k, -0.31 * k); inner.add(tail);
  const tb = box(tail, 0.05 * k, 0.05 * k, 0.32 * k, fur, 0, 0.06 * k, -0.14 * k); tb.rotation.x = chat ? 0.3 : -0.6;
  root.traverse(o => { o.userData.animal = def.id; });
  return { root, inner, legs, tail, body, head };
}
export function poseAnimal(a, p, t, walkPhase) {
  const { inner, legs, tail } = a;
  inner.position.y = 0; inner.rotation.set(0, 0, 0);
  for (const l of legs) l.rotation.x = 0;
  if (p === 'walk') {
    const s = Math.sin(walkPhase * 1.4) * 0.6;
    legs[0].rotation.x = s; legs[3].rotation.x = s; legs[1].rotation.x = -s; legs[2].rotation.x = -s;
    tail.rotation.y = Math.sin(t * 6) * 0.3;
  } else if (p === 'lie') {
    inner.position.y = -0.14; inner.rotation.z = 0.08;
    for (const l of legs) l.rotation.x = 1.4;
  } else tail.rotation.y = Math.sin(t * 3) * 0.5;
}

// ---------- La rue, le café et le hanout ----------
const white = () => mat('#f1eee6'), cream = () => mat('#e8dfcc');
const shutters = ['#2e6b57', '#2f4f7a', '#7a2e3a', '#4f5bd5'];
// Immeuble blanc de Casablanca, volets colorés et paraboles. face : +1 si la façade regarde +z, -1 sinon.
function building(g, x, z, w, d, h, face, seed, y0 = 0) {
  const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
  box(b, w, h - y0, d, seed % 2 ? white() : cream(), 0, y0 + (h - y0) / 2, 0);
  box(b, w + 0.2, 0.25, d + 0.2, mat('#d9d2c2'), 0, h + 0.1, 0);
  const fz = face * (d / 2 + 0.02);
  for (let fy = y0 + 1.6; fy < h - 1; fy += 3) for (let fx = -w / 2 + 1; fx < w / 2 - 0.5; fx += 2) {
    box(b, 0.9, 1.2, 0.04, mat('#3a3d44', { roughness: 0.3 }), fx, fy, fz);
    box(b, 0.3, 1.2, 0.05, mat(shutters[(seed + Math.round(fx)) % 4]), fx - 0.6, fy, fz);
    box(b, 0.3, 1.2, 0.05, mat(shutters[(seed + Math.round(fx)) % 4]), fx + 0.6, fy, fz);
    box(b, 1.5, 0.08, 0.3, mat('#d9d2c2'), fx, fy - 0.65, fz + face * 0.1);
  }
  for (let i = 0; i < 2; i++) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.5), mat('#d6d6d6', { side: THREE.DoubleSide }));
    dish.position.set(-w / 2 + 1.5 + i * 2.2 + (seed % 3), h + 0.6, fz * 0.6); dish.rotation.x = face * 1.1; b.add(dish);
  }
  return b;
}
// Porte d'immeuble ou de boutique dans une façade regardant +z, centrée sur la case x.
function facadeDoor(g, x, z, color, wide = 1, tag) {
  const m = mat(color, { roughness: 0.6 }), d = new THREE.Group();
  g.add(d);
  box(d, wide, 2.2, 0.08, m, x + 0.5, 1.1, z + 0.02);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(wide / 2, wide / 2, 0.08, 18, 1, false, 0, Math.PI), m);
  top.rotation.x = Math.PI / 2; top.rotation.z = 0; top.position.set(x + 0.5, 2.2, z + 0.02); add(d, top);
  box(d, wide + 0.3, 0.12, 0.14, mat('#d9d2c2'), x + 0.5, 2.2 + wide / 2 + 0.06, z + 0.05);
  sph(d, 0.035, BRASS(), x + 0.5 + wide * 0.3, 1.05, z + 0.08);
  if (tag) d.traverse(o => { o.userData[tag] = true; });
  return d;
}
function lampPost(g, x, z) {
  const iron = mat('#2a2f36', { metalness: 0.4, roughness: 0.5 });
  cyl(g, 0.12, 0.16, 0.3, iron, x, 0.15, z, 10);
  cyl(g, 0.05, 0.07, 4.2, iron, x, 2.25, z, 8);
  const head = new THREE.MeshStandardMaterial({ color: '#fff2cc', emissive: '#ffd27a', emissiveIntensity: 0.3 });
  box(g, 0.5, 0.3, 0.5, head, x, 4.45, z);
  cyl(g, 0, 0.36, 0.25, iron, x, 4.72, z, 4);
  g.userData.lamps = g.userData.lamps || [];
  g.userData.lamps.push({ mat: head, x, y: 4.3, z });
}
function palm(g, x, z) {
  const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
  cyl(p, 0.12, 0.2, 4.2, mat('#8a6a48'), 0, 2.1, 0, 10);
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Group(); leaf.position.y = 4.2; leaf.rotation.y = i * Math.PI / 4; p.add(leaf);
    const l = box(leaf, 0.35, 0.04, 1.8, mat(i % 2 ? '#3d7a35' : '#4b8c3f'), 0, -0.25, 0.85); l.rotation.x = 0.45;
  }
}
function cafeTable(g, x, z) {
  const iron = mat('#2a2f36', { metalness: 0.4, roughness: 0.5 });
  cyl(g, 0.4, 0.4, 0.04, mat('#e9e3d6', { roughness: 0.5 }), x, 0.72, z, 20);
  cyl(g, 0.03, 0.03, 0.7, iron, x, 0.36, z, 8);
  cyl(g, 0.3, 0.3, 0.03, iron, x, 0.015, z, 14);
  for (const [dx, dz] of [[-0.12, 0.08], [0.1, -0.1]]) cyl(g, 0.03, 0.025, 0.09, mat('#8fd0a6', { transparent: true, opacity: 0.75 }), x + dx, 0.79, z + dz, 10);
}
function cafeChair(g, x, z, r, i) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = r * Math.PI / 2; g.add(c);
  const wood = mat('#8a5a3b'), straw = mat('#d7a35c');
  box(c, 0.44, 0.04, 0.44, straw, 0, 0.45, 0);
  for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(c, 0.04, 0.45, 0.04, wood, dx, 0.225, dz);
  box(c, 0.44, 0.5, 0.04, wood, 0, 0.72, -0.2);
  c.traverse(o => { o.userData.chair = i; });
  return c;
}
// Store de boutique. Il se replie contre la façade quand les murs sont coupés, pour voir la terrasse.
function awning(g, x0, x1, z, depth, y, tex) {
  const w = x1 - x0, a = new THREE.Group(), poles = new THREE.Group();
  a.position.set(0, 0, z); poles.position.set(0, 0, z); g.add(a, poles);
  const m = box(a, w, 0.04, depth, texMat('awn' + tex.uuid, tex, { side: THREE.DoubleSide }), (x0 + x1) / 2, y, depth / 2);
  m.rotation.x = 0.22;
  box(a, w, 0.18, 0.03, texMat('awn' + tex.uuid, tex), (x0 + x1) / 2, y - depth * 0.11 - 0.1, depth * 0.97);
  const iron = mat('#2a2f36', { metalness: 0.4 });
  for (const x of [x0 + 0.15, x1 - 0.15]) cyl(poles, 0.03, 0.03, y - depth * 0.11, iron, x, (y - depth * 0.11) / 2, depth * 0.95, 8);
  g.userData.awnings = g.userData.awnings || [];
  g.userData.awnings.push({ a, poles });
}
function crate(g, x, z, fruit) {
  const c = new THREE.Group(); g.add(c);
  box(c, 0.8, 0.3, 0.6, mat('#b8905c'), x + 0.5, 0.15, z + 0.5);
  for (let i = 0; i < 12; i++) sph(c, 0.07, mat(fruit), x + 0.2 + (i % 4) * 0.2, 0.33 + Math.floor(i / 4) * 0.02, z + 0.25 + Math.floor(i / 4) * 0.2);
  c.traverse(o => { o.userData.hanout = true; });
}

export function makeStreet() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#cdbfa6'));
  ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, -0.02, D / 2); ground.receiveShadow = true; g.add(ground);
  const plane = (w, d, m, x, z, y = 0) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; g.add(p); return p;
  };
  const cx = (X0 + X1) / 2, len = X1 - X0 + 40;
  const tr = T.trottoir().clone(); tr.repeat.set(len / 2, 3); tr.needsUpdate = true;
  const trM = new THREE.MeshStandardMaterial({ map: tr, roughness: 0.9 });
  plane(len, 3, trM, cx, D + 1.5, 0.005);
  box(g, len, 0.15, 0.25, mat('#bdb5a6'), cx, 0.06, D + 3);
  const as = T.asphalte().clone(); as.repeat.set(len / 2, 4); as.needsUpdate = true;
  plane(len, 8, new THREE.MeshStandardMaterial({ map: as, roughness: 0.95 }), cx, D + 7, 0.004);
  for (let x = X0 - 20; x < X1 + 20; x += 3) plane(1.4, 0.15, mat('#f2f0e6'), x, D + 7, 0.01);
  for (let z = D + 3.5; z < D + 11; z += 1) plane(2.4, 0.5, mat('#f2f0e6'), RUE.traversee.x0 + 1, z, 0.012);
  plane(len, 3, trM, cx, D + 12.5, 0.005);
  box(g, len, 0.15, 0.25, mat('#bdb5a6'), cx, 0.06, D + 11);

  // Notre pâté de maisons : immeubles de part et d'autre de l'appartement, avec les boutiques au rez-de-chaussée.
  const lw = 12 - X0, rw = X1 + 12 - W; // de X0-12 à 0, et de W à X1+12
  building(g, -lw / 2, 1.5, lw, 15, 7.6, 1, 3, 3.1);
  building(g, W + rw / 2, 1.5, rw, 15, 7.6, 1, 4, 3.1);
  // Rez-de-chaussée : murs des boutiques (de 0 à 3.1 m).
  box(g, lw, 3.1, 15, mat('#efe6d4'), -lw / 2, 1.55, 1.5);
  box(g, rw, 3.1, 15, mat('#efe6d4'), W + rw / 2, 1.55, 1.5);
  // Le hanout (épicerie) à gauche : store bleu, porte, caisses de fruits.
  const H = RUE.hanout;
  awning(g, H.x0 + 4, H.x1, D, 1.3, 2.75, T.rayures('#2f4f7a', '#f2ede3'));
  facadeDoor(g, H.porte, D, '#2f4f7a', 1.2, 'hanout');
  const vitrine = new THREE.Group(); g.add(vitrine);
  box(vitrine, 2.2, 1.3, 0.06, mat('#3a3d44', { roughness: 0.3 }), H.porte - 1.6, 1.6, D + 0.03);
  for (let i = 0; i < 6; i++) box(vitrine, 0.25, 0.4, 0.05, mat(['#d9a43a', '#c8102e', '#2e6b57', '#f2ede3', '#e0a526', '#7a2e3a'][i]), H.porte - 2.5 + i * 0.35, 1.3 + (i % 2) * 0.5, D + 0.05);
  vitrine.traverse(o => { o.userData.hanout = true; });
  crate(g, H.caisses[0].x, H.caisses[0].z, '#e8641a');
  crate(g, H.caisses[1].x, H.caisses[1].z, '#c8102e');
  facadeDoor(g, RUE.portes[0].x, D, '#5a3423');
  // Le café à droite : store vert, bandeau, grande porte en arc, fenêtres, lanternes et terrasse.
  const C = CAFE;
  box(g, C.x1 - C.x0, 0.5, 0.1, mat('#1f5a45'), (C.x0 + C.x1) / 2, 2.85, D + 0.04);
  box(g, C.x1 - C.x0 + 0.1, 0.06, 0.14, BRASS(), (C.x0 + C.x1) / 2, 3.1, D + 0.04);
  awning(g, C.x0, C.porte.x - 0.5, D, 2.2, 2.6, T.rayures('#2e7d5b', '#f2ede3'));
  facadeDoor(g, C.porte.x, D, '#5a3423', 1.4);
  for (const x of [15.5, 19]) {
    box(g, 2.6, 1.5, 0.06, mat('#2b3440', { roughness: 0.2 }), x, 1.55, D + 0.03);
    box(g, 2.8, 0.1, 0.12, mat('#5a3423'), x, 0.75, D + 0.05);
  }
  for (const x of [13.4, 23.6]) {
    const glow = new THREE.MeshStandardMaterial({ color: '#ffcf86', emissive: '#ffb347', emissiveIntensity: 0.5 });
    cyl(g, 0.12, 0.09, 0.3, glow, x, 2.3, D + 0.2, 6);
    cyl(g, 0, 0.14, 0.14, BRASS(), x, 2.52, D + 0.2, 6);
    box(g, 0.04, 0.04, 0.3, BRASS(), x, 2.62, D + 0.12);
    g.userData.lamps = g.userData.lamps || [];
    g.userData.lamps.push({ mat: glow, x, y: 2.3, z: D + 0.3, small: true });
  }
  for (const t of C.tables) cafeTable(g, t.x + 0.5, t.z + 0.5);
  C.chaises.forEach((c, i) => cafeChair(g, c.x + 0.5, c.z + 0.5, c.r, i));
  const board = box(g, 0.6, 0.9, 0.04, mat('#2a2a2a'), C.x0 + 0.5, 0.5, D + 2.4); board.rotation.x = -0.2;
  for (const [x, z] of [[C.x1 - 0.6, D + 0.5], [C.x0 - 0.5, D + 0.5]]) { const p = makeFurniture('plante'); p.position.set(x, 0, z); g.add(p); }
  facadeDoor(g, RUE.portes[1].x, D, '#2e6b57');
  // Immeubles d'en face et derrière, palmiers, lampadaires, banc, petit taxi.
  let seed = 7;
  for (let x = X0 - 10; x < X1 + 10; x += 7) building(g, x, D + 18, 6.6, 8, 8 + ((seed * 5) % 4) * 2, -1, seed++);
  for (let x = X0 - 10; x < X1 + 10; x += 7) building(g, x, -12, 6.6, 12, 11 + ((seed * 3) % 4) * 2, 1, seed++);
  for (const p of RUE.portes.slice(2)) facadeDoor(g, p.x, D + 14 - 0.1, ['#2f4f7a', '#7a2e3a', '#5a3423', '#2e6b57'][seed++ % 4]);
  for (const p of RUE.palmiers) palm(g, p.x + 0.5, p.z + 0.5);
  for (const l of RUE.lampes) lampPost(g, l.x + 0.5, l.z + 0.5);
  const B = RUE.banc;
  box(g, 1.9, 0.06, 0.45, mat('#8a5a3b'), B.x + 1, 0.45, B.z + 0.5);
  box(g, 1.9, 0.4, 0.05, mat('#8a5a3b'), B.x + 1, 0.7, B.z + 0.72);
  for (const x of [B.x + 0.2, B.x + 1.8]) box(g, 0.06, 0.45, 0.4, mat('#2a2f36'), x, 0.22, B.z + 0.5);
  const taxi = new THREE.Group(); taxi.position.set(RUE.taxi.x, 0, RUE.taxi.z); g.add(taxi);
  box(taxi, 3.6, 0.6, 1.6, mat('#c8102e', { roughness: 0.4 }), 0, 0.55, 0);
  box(taxi, 2, 0.55, 1.45, mat('#c8102e', { roughness: 0.4 }), -0.2, 1.1, 0);
  box(taxi, 1.9, 0.42, 1.47, mat('#2b3440', { roughness: 0.2 }), -0.2, 1.1, 0);
  box(taxi, 0.5, 0.18, 0.25, mat('#f2f0e6'), -0.2, 1.47, 0);
  for (const [x, z] of [[-1.15, 0.8], [1.15, 0.8], [-1.15, -0.8], [1.15, -0.8]]) {
    const w = cyl(taxi, 0.32, 0.32, 0.22, mat('#1b1b1b'), x, 0.32, z, 16); w.rotation.x = Math.PI / 2;
  }
  // Au loin : la silhouette d'un grand minaret.
  const m = new THREE.Group(); m.position.set(X1 + 30, 0, -50); g.add(m);
  box(m, 4, 34, 4, mat('#e3d6bd'), 0, 17, 0);
  box(m, 4.1, 2.4, 4.1, mat('#2e6b57'), 0, 30, 0);
  box(m, 2.4, 5, 2.4, mat('#e3d6bd'), 0, 36.5, 0);
  box(m, 2.5, 0.8, 2.5, mat('#2e6b57'), 0, 38.5, 0);
  cyl(m, 0.08, 0.08, 2.4, BRASS(), 0, 40, 0, 6);
  return g;
}
