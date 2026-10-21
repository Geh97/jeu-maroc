// Le quartier : rue, pâté de maisons marocain, café, hanout, four, laiterie, placette avec fontaine et mosquée.
import * as THREE from 'three';
import * as T from './textures.js';
import { mat, box, cyl, sph, add, BRASS, GLASS, texMat, makeFurniture } from './models.js';
import { W, D, X0, X1, Z1, RUE, CAFE, PLACE } from './data.js';

// Palette des façades : crème, sable, ocre clair ; socles terre cuite, tuiles vertes, bois sombre.
const FACADES = ['#f1e9d8', '#e9d8b8', '#f4ecdf', '#e4cfae'];
const TERRE = '#b9674a', VERT = '#2e6b57', BOIS = '#4a2c18', FER = '#2a2f36';
const VOLETS = ['#2e6b57', '#2f4f7a', '#7a2e3a', '#c99a3a'];
const iron = () => mat(FER, { metalness: 0.4, roughness: 0.5 });
const zelMat = () => texMat('zel-vert-mur', T.imgTex('sol-zellige-vert', '#5f8f78'), { roughness: 0.5 });
const zelBleu = () => texMat('zel-bleu-mur', T.imgTex('sol-zellige-bleu', '#5a7aa8'), { roughness: 0.5 });
const mouchMat = () => texMat('mouch', T.moucharabieh(), { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });

// Fenêtre marocaine : encadrement clair, petit arc, vitre sombre, et selon les cas moucharabieh ou volets.
function fenetre(g, x, y, z, face, style) {
  const fz = z + face * 0.03;
  box(g, 1.1, 1.5, 0.06, mat('#f8f3e8'), x, y, fz);
  box(g, 0.9, 1.3, 0.06, mat('#2b3440', { roughness: 0.25 }), x, y - 0.05, fz + face * 0.01);
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 18, 1, false, 0, Math.PI), mat('#f8f3e8'));
  arc.rotation.x = Math.PI / 2; arc.rotation.z = 0; arc.position.set(x, y + 0.75, fz); add(g, arc);
  if (style === 'mouch') box(g, 0.9, 1.0, 0.02, mouchMat(), x, y - 0.1, fz + face * 0.05);
  else if (style === 'volets') for (const dx of [-0.62, 0.62]) box(g, 0.3, 1.3, 0.05, mat(VOLETS[Math.abs(Math.round(x * 3) + Math.round(y)) % 4]), x + dx, y - 0.05, fz + face * 0.02);
  box(g, 1.3, 0.08, 0.3, mat('#e3dccd'), x, y - 0.8, fz + face * 0.1);
}
// Balcon en fer forgé sous une fenêtre.
function balcony(g, x, y, z, face, w = 1.5) {
  const out = face * 0.3;
  box(g, w, 0.1, 0.6, mat('#e3dccd'), x, y, z + out);
  for (let i = 0; i <= 6; i++) box(g, 0.03, 0.9, 0.03, iron(), x - w / 2 + (w / 6) * i, y + 0.5, z + out + face * 0.28);
  box(g, w, 0.04, 0.04, iron(), x, y + 0.95, z + out + face * 0.28);
  box(g, w, 0.03, 0.03, iron(), x, y + 0.5, z + out + face * 0.28);
  for (const dx of [-w / 2 + 0.3, w / 2 - 0.3]) { const p = makeFurniture('plante'); p.scale.set(0.5, 0.5, 0.5); p.position.set(x + dx, y + 0.05, z + out); g.add(p); }
}
// Toit-terrasse : parapet, paraboles, réservoir d'eau, linge qui sèche.
function rooftop(g, x, z, w, d, h, seed) {
  box(g, w + 0.2, 0.5, 0.15, mat('#e3dccd'), x, h + 0.25, z + d / 2);
  box(g, w + 0.2, 0.5, 0.15, mat('#e3dccd'), x, h + 0.25, z - d / 2);
  box(g, 0.15, 0.5, d, mat('#e3dccd'), x - w / 2, h + 0.25, z);
  box(g, 0.15, 0.5, d, mat('#e3dccd'), x + w / 2, h + 0.25, z);
  for (let i = 0; i < 2; i++) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.5), mat('#d6d6d6', { side: THREE.DoubleSide }));
    dish.position.set(x - w / 2 + 1.2 + i * 2.6 + (seed % 3), h + 0.7, z - d / 2 + 1 + (seed % 2)); dish.rotation.x = 1.1; g.add(dish);
  }
  cyl(g, 0.5, 0.5, 0.9, mat('#f4f4f2'), x + w / 2 - 1.2, h + 0.45, z - d / 2 + 1.5, 14);
  if (seed % 2) {
    const lx = x - w / 2 + 1, ly = h + 1.6, lz = z + d / 2 - 1;
    for (const dx of [0, 3.5]) cyl(g, 0.03, 0.03, 1.7, iron(), lx + dx, h + 0.85, lz, 6);
    box(g, 3.5, 0.02, 0.02, mat('#eeeeee'), lx + 1.75, ly, lz);
    ['#f2ede3', '#2f4f7a', '#c99a3a', '#7a2e3a', '#ffffff'].forEach((c, i) => { const cl = box(g, 0.4, 0.6, 0.02, mat(c, { side: THREE.DoubleSide }), lx + 0.5 + i * 0.65, ly - 0.32, lz); cl.rotation.y = 0.1 * (i % 2 ? 1 : -1); });
  }
}
// Immeuble du quartier : façade claire, socle terre cuite, fenêtres en arc, balcons, corniche de tuiles vertes, toit-terrasse.
function building(g, x, z, w, d, h, face, seed, y0 = 0) {
  const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
  box(b, w, h - y0, d, mat(FACADES[seed % FACADES.length]), 0, y0 + (h - y0) / 2, 0);
  const fz = face * (d / 2);
  if (!y0) box(b, w, 0.7, 0.08, mat(TERRE), 0, 0.35, fz);
  let row = 0;
  for (let fy = y0 + 1.7; fy < h - 1; fy += 3, row++) {
    let col = 0;
    for (let fx = -w / 2 + 1.3; fx < w / 2 - 0.8; fx += 2.4, col++) {
      const style = (seed + row + col) % 3 === 0 ? 'mouch' : (seed + col) % 2 ? 'volets' : 'simple';
      fenetre(b, fx, fy, fz, face, style);
      if (row > 0 && (seed + col) % 3 !== 1) balcony(b, fx, fy - 0.85, fz, face);
    }
    if (row === 0 && y0) { const c = box(b, w, 0.12, 0.6, mat(VERT), 0, y0 + 0.05, fz + face * 0.2); c.rotation.x = -face * 0.35; }
  }
  rooftop(b, 0, 0, w, d, h, seed);
  return b;
}
// Porte en arc outrepassé, encadrée de zellige, avec heurtoir en laiton.
function door(g, x, z, color, wide = 1, tag, zel = true) {
  const m = mat(color, { roughness: 0.6 }), d = new THREE.Group();
  g.add(d);
  if (zel) {
    box(d, wide + 0.7, 0.35, 0.06, zelMat(), x + 0.5, 2.2 + wide / 2 + 0.3, z + 0.03);
    for (const dx of [-wide / 2 - 0.2, wide / 2 + 0.2]) box(d, 0.3, 2.2 + wide / 2 + 0.2, 0.06, zelMat(), x + 0.5 + dx, (2.2 + wide / 2 + 0.2) / 2, z + 0.03);
  }
  box(d, wide, 2.2, 0.08, m, x + 0.5, 1.1, z + 0.04);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(wide / 2 * 1.08, wide / 2 * 1.08, 0.08, 18, 1, false, 0, Math.PI), m);
  top.rotation.x = Math.PI / 2; top.position.set(x + 0.5, 2.2, z + 0.04); add(d, top);
  for (const dy of [0.5, 1.1, 1.7]) for (const dx of [-0.25, 0.25]) sph(d, 0.03, BRASS(), x + 0.5 + dx * wide, dy, z + 0.09);
  const k = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 20), BRASS()); k.position.set(x + 0.5 + wide * 0.25, 1.1, z + 0.1); d.add(k);
  if (tag) d.traverse(o => { o.userData[tag] = true; });
  return d;
}
// Lanterne de rue en fer forgé.
function lantern(g, x, z, h = 3.6) {
  cyl(g, 0.16, 0.2, 0.25, iron(), x, 0.12, z, 8);
  cyl(g, 0.05, 0.07, h, iron(), x, h / 2, z, 8);
  const glow = new THREE.MeshStandardMaterial({ color: '#ffe3a8', emissive: '#ffb347', emissiveIntensity: 0.3 });
  cyl(g, 0.22, 0.16, 0.5, glow, x, h + 0.25, z, 6);
  cyl(g, 0, 0.26, 0.22, iron(), x, h + 0.6, z, 6);
  cyl(g, 0.18, 0, 0.12, iron(), x, h - 0.05, z, 6);
  g.userData.lamps = g.userData.lamps || [];
  g.userData.lamps.push({ mat: glow, x, y: h + 0.25, z });
}
// Lanterne murale au-dessus d'une porte.
function wallLantern(g, x, y, z) {
  const glow = new THREE.MeshStandardMaterial({ color: '#ffcf86', emissive: '#ffb347', emissiveIntensity: 0.5 });
  cyl(g, 0.12, 0.09, 0.3, glow, x, y, z + 0.2, 6);
  cyl(g, 0, 0.14, 0.14, BRASS(), x, y + 0.22, z + 0.2, 6);
  box(g, 0.04, 0.04, 0.3, BRASS(), x, y + 0.32, z + 0.12);
  g.userData.lamps = g.userData.lamps || [];
  g.userData.lamps.push({ mat: glow, x, y, z: z + 0.3, small: true });
}
function palm(g, x, z) {
  const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
  cyl(p, 0.12, 0.2, 4.2, mat('#8a6a48'), 0, 2.1, 0, 10);
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Group(); leaf.position.y = 4.2; leaf.rotation.y = i * Math.PI / 4; p.add(leaf);
    const l = box(leaf, 0.35, 0.04, 1.8, mat(i % 2 ? '#3d7a35' : '#4b8c3f'), 0, -0.25, 0.85); l.rotation.x = 0.45;
  }
  sph(p, 0.35, mat('#c99a3a'), 0, 4.1, 0);
}
function orangeTree(g, x, z) {
  box(g, 1, 0.5, 1, zelBleu(), x, 0.25, z);
  cyl(g, 0.09, 0.12, 1.3, mat('#6b4a2c'), x, 1.1, z, 8);
  sph(g, 0.75, mat('#3f7a3a'), x, 2.2, z);
  sph(g, 0.5, mat('#4b8c3f'), x + 0.3, 2.6, z - 0.2);
  for (let i = 0; i < 7; i++) sph(g, 0.08, mat('#e8641a'), x + Math.cos(i * 0.9) * 0.6, 2 + (i % 3) * 0.3, z + Math.sin(i * 0.9) * 0.6);
}
function bench(g, x, z, r = 0) {
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = r * Math.PI / 2; g.add(b);
  box(b, 1.9, 0.06, 0.45, mat('#8a5a3b'), 0, 0.45, 0);
  box(b, 1.9, 0.4, 0.05, mat('#8a5a3b'), 0, 0.7, -0.22);
  for (const dx of [-0.8, 0.8]) box(b, 0.06, 0.45, 0.4, iron(), dx, 0.22, 0);
}
// Fontaine en zellige : bassin octogonal, vasque, jet d'eau.
function fountain(g, x, z) {
  const f = new THREE.Group(); f.position.set(x, 0, z); g.add(f);
  cyl(f, 2.1, 2.2, 0.7, zelMat(), 0, 0.35, 0, 8);
  cyl(f, 2.0, 2.0, 0.04, mat('#f4efe3'), 0, 0.72, 0, 8);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#7fc3d8', transparent: true, opacity: 0.7, roughness: 0.1 }));
  water.position.y = 0.66; f.add(water);
  cyl(f, 0.25, 0.35, 1.0, zelMat(), 0, 1.2, 0, 8);
  cyl(f, 0.9, 0.7, 0.2, mat('#f4efe3'), 0, 1.75, 0, 8);
  const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.04, 8), water.material); w2.position.y = 1.86; f.add(w2);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.8, 8), new THREE.MeshBasicMaterial({ color: '#dff3fb', transparent: true, opacity: 0.6 }));
  jet.position.y = 2.2; f.add(jet);
  f.userData.water = [water.material];
}
// La mosquée du quartier : façade en arcs, toit de tuiles vertes, minaret carré.
function mosque(g, x0, x1, z) {
  const w = x1 - x0, cx = (x0 + x1) / 2, depth = 10, h = 7;
  const m = new THREE.Group(); m.position.set(cx, 0, z + depth / 2); g.add(m);
  box(m, w, h, depth, mat('#f4ecdf'), 0, h / 2, 0);
  box(m, w, 0.7, 0.1, mat(TERRE), 0, 0.35, -depth / 2);
  box(m, w + 0.4, 0.5, depth + 0.4, mat(VERT), 0, h + 0.2, 0);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.42, 2.4, 4), mat(VERT)); roof.rotation.y = Math.PI / 4; roof.position.set(0, h + 1.6, 0); add(m, roof);
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const ax = i * 2.8;
    box(m, 1.2, 2.6, 0.1, mat('#2b3440', { roughness: 0.3 }), ax, 1.9, -depth / 2 - 0.02);
    const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 18, 1, false, 0, Math.PI), mat('#2b3440', { roughness: 0.3 }));
    arc.rotation.x = Math.PI / 2; arc.position.set(ax, 3.2, -depth / 2 - 0.02); add(m, arc);
    box(m, 1.6, 3.6, 0.06, zelMat(), ax, 2.2, -depth / 2 - 0.01);
  }
  const porte = new THREE.Group(); porte.position.set(0, 0, -depth / 2); m.add(porte);
  box(porte, 2.4, 3.6, 0.1, mat(BOIS), 0, 1.8, -0.03);
  const big = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.1, 24, 1, false, 0, Math.PI), mat(BOIS)); big.rotation.x = Math.PI / 2; big.position.set(0, 3.6, -0.03); add(porte, big);
  box(porte, 3.4, 5.6, 0.06, zelMat(), 0, 2.8, -0.01);
  for (let y = 0.6; y < 3.4; y += 0.6) for (let x = -0.8; x <= 0.8; x += 0.4) sph(porte, 0.04, BRASS(), x, y, -0.09);
  const minaret = new THREE.Group(); minaret.position.set(w / 2 - 2, 0, 2); m.add(minaret);
  box(minaret, 2.6, 16, 2.6, mat('#f4ecdf'), 0, 8, 0);
  for (let y = 4; y < 15; y += 3.5) box(minaret, 2.7, 0.9, 2.7, zelMat(), 0, y, 0);
  box(minaret, 3.2, 0.6, 3.2, mat(VERT), 0, 16.3, 0);
  box(minaret, 1.6, 2.6, 1.6, mat('#f4ecdf'), 0, 17.9, 0);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.4, 4), mat(VERT)); top.rotation.y = Math.PI / 4; top.position.set(0, 19.9, 0); add(minaret, top);
  for (const [r, y] of [[0.2, 20.9], [0.15, 21.3], [0.1, 21.65]]) sph(minaret, r, BRASS(), 0, y, 0);
}
function awning(g, x0, x1, z, depth, y, tex) {
  const w = x1 - x0, a = new THREE.Group(), poles = new THREE.Group();
  a.position.set(0, 0, z); poles.position.set(0, 0, z); g.add(a, poles);
  const m = box(a, w, 0.04, depth, texMat('awn' + tex.uuid, tex, { side: THREE.DoubleSide }), (x0 + x1) / 2, y, depth / 2);
  m.rotation.x = 0.22;
  box(a, w, 0.18, 0.03, texMat('awn' + tex.uuid, tex), (x0 + x1) / 2, y - depth * 0.11 - 0.1, depth * 0.97);
  for (const x of [x0 + 0.15, x1 - 0.15]) cyl(poles, 0.03, 0.03, y - depth * 0.11, iron(), x, (y - depth * 0.11) / 2, depth * 0.95, 8);
  g.userData.awnings = g.userData.awnings || [];
  g.userData.awnings.push({ a, poles });
}
function crate(g, x, z, fruit, tag = 'hanout') {
  const c = new THREE.Group(); g.add(c);
  box(c, 0.8, 0.3, 0.6, mat('#b8905c'), x + 0.5, 0.15, z + 0.5);
  for (let i = 0; i < 12; i++) sph(c, 0.07, mat(fruit), x + 0.2 + (i % 4) * 0.2, 0.33 + Math.floor(i / 4) * 0.02, z + 0.25 + Math.floor(i / 4) * 0.2);
  if (tag) c.traverse(o => { o.userData[tag] = true; });
}
// Charrette d'oranges du marchand ambulant.
function cart(g, x, z) {
  const c = new THREE.Group(); c.position.set(x + 1, 0, z + 0.5); g.add(c);
  box(c, 1.9, 0.3, 0.9, mat('#8a5a3b'), 0, 0.75, 0);
  for (const dx of [-0.6, 0.6]) { const w = cyl(c, 0.38, 0.38, 0.08, mat('#5a3423'), dx, 0.38, 0.5, 14); w.rotation.x = Math.PI / 2; }
  for (const dx of [-0.85, 0.85]) box(c, 0.08, 0.7, 0.08, mat('#8a5a3b'), dx, 0.35, -0.35);
  for (let i = 0; i < 24; i++) sph(c, 0.1, mat('#e8641a'), -0.8 + (i % 8) * 0.23, 0.98 + Math.floor(i / 8) * 0.12, -0.25 + Math.floor(i / 8) * 0.25);
  box(c, 0.06, 1.6, 0.06, mat('#8a5a3b'), -0.9, 1.5, 0.4);
  box(c, 1.9, 0.04, 1.2, texMat('awn-cart', T.rayures('#c8102e', '#f2ede3')), 0, 2.3, 0);
}
function bougainvillea(g, x, y, z) {
  for (let i = 0; i < 9; i++) sph(g, 0.3 + (i % 3) * 0.1, mat(i % 3 ? '#c2185b' : '#3f7a3a'), x + (i % 3) * 0.5 - 0.5, y + Math.floor(i / 3) * 0.5, z + ((i * 7) % 3) * 0.15);
}

export function makeStreet() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#cdbfa6'));
  ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, -0.02, D / 2); ground.receiveShadow = true; g.add(ground);
  const plane = (w, d, m, x, z, y = 0) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; g.add(p); return p;
  };
  const cx = (X0 + X1) / 2, len = X1 - X0 + 40;
  const tr = T.dallage().clone(); tr.repeat.set(len / 2, 1.5); tr.needsUpdate = true;
  const trM = new THREE.MeshStandardMaterial({ map: tr, roughness: 0.9 });
  plane(len, 3, trM, cx, D + 1.5, 0.005);
  box(g, len, 0.15, 0.25, mat('#bdb5a6'), cx, 0.06, D + 3);
  const as = T.asphalte().clone(); as.repeat.set(len / 2, 4); as.needsUpdate = true;
  plane(len, 8, new THREE.MeshStandardMaterial({ map: as, roughness: 0.95 }), cx, D + 7, 0.004);
  for (let x = X0 - 20; x < X1 + 20; x += 3) plane(1.4, 0.15, mat('#f2f0e6'), x, D + 7, 0.01);
  for (let z = D + 3.5; z < D + 11; z += 1) plane(2.4, 0.5, mat('#f2f0e6'), RUE.traversee.x0 + 1, z, 0.012);
  plane(len, 3, trM, cx, D + 12.5, 0.005);
  box(g, len, 0.15, 0.25, mat('#bdb5a6'), cx, 0.06, D + 11);

  // Notre pâté de maisons : deux immeubles de part et d'autre de l'appartement, boutiques au rez-de-chaussée.
  const lw = 12 - X0, rw = X1 + 12 - W;
  building(g, -lw / 2, 1.5, lw, 15, 7.6, 1, 3, 3.1);
  building(g, W + rw / 2, 1.5, rw, 15, 7.6, 1, 4, 3.1);
  box(g, lw, 3.1, 15, mat('#efe6d4'), -lw / 2, 1.55, 1.5);
  box(g, rw, 3.1, 15, mat('#efe6d4'), W + rw / 2, 1.55, 1.5);
  box(g, lw, 0.7, 0.08, mat(TERRE), -lw / 2, 0.35, D);
  box(g, rw, 0.7, 0.08, mat(TERRE), W + rw / 2, 0.35, D);
  // Le four du quartier : porte en bois, cheminée qui fume, sacs de farine.
  const F = RUE.four;
  door(g, F.porte, D, BOIS, 1.4, null, false);
  box(g, 2, 0.9, 0.06, mat('#2b3440', { roughness: 0.3 }), F.porte - 1.2, 1.7, D + 0.03);
  for (let i = 0; i < 5; i++) cyl(g, 0.16, 0.16, 0.05, mat('#d7a35c'), F.porte - 1.9 + i * 0.35, 1.5 + (i % 2) * 0.35, D + 0.06, 12);
  cyl(g, 0.35, 0.35, 1.4, mat('#8a6a48'), F.x0 + 2, 8.3, 2, 8);
  for (let i = 0; i < 4; i++) sph(g, 0.35 + i * 0.12, mat('#d9d2c2', { transparent: true, opacity: 0.55 - i * 0.1 }), F.x0 + 2 + i * 0.25, 9.3 + i * 0.6, 2 - i * 0.15);
  wallLantern(g, F.porte + 0.5, 2.9, D);
  cart(g, RUE.charrette.x, RUE.charrette.z);
  // Le hanout : store bleu, porte, vitrine et caisses de fruits.
  const H = RUE.hanout;
  awning(g, H.x0, H.x1, D, 1.3, 2.75, T.rayures('#2f4f7a', '#f2ede3'));
  door(g, H.porte, D, '#2f4f7a', 1.2, 'hanout', false);
  const vitrine = new THREE.Group(); g.add(vitrine);
  box(vitrine, 2.2, 1.3, 0.06, mat('#3a3d44', { roughness: 0.3 }), H.porte - 1.6, 1.6, D + 0.03);
  for (let i = 0; i < 6; i++) box(vitrine, 0.25, 0.4, 0.05, mat(['#d9a43a', '#c8102e', '#2e6b57', '#f2ede3', '#e0a526', '#7a2e3a'][i]), H.porte - 2.5 + i * 0.35, 1.3 + (i % 2) * 0.5, D + 0.05);
  vitrine.traverse(o => { o.userData.hanout = true; });
  crate(g, H.caisses[0].x, H.caisses[0].z, '#e8641a');
  crate(g, H.caisses[1].x, H.caisses[1].z, '#c8102e');
  door(g, RUE.portes[0].x, D, '#5a3423');
  wallLantern(g, RUE.portes[0].x + 0.5, 2.9, D);
  // Le café : bandeau vert et laiton, store, grande porte en arc, fenêtres, lanternes, terrasse.
  const C = CAFE;
  box(g, C.x1 - C.x0, 0.5, 0.1, mat('#1f5a45'), (C.x0 + C.x1) / 2, 2.85, D + 0.04);
  box(g, C.x1 - C.x0 + 0.1, 0.06, 0.14, BRASS(), (C.x0 + C.x1) / 2, 3.1, D + 0.04);
  awning(g, C.x0, C.porte.x - 0.5, D, 2.2, 2.6, T.rayures('#2e7d5b', '#f2ede3'));
  door(g, C.porte.x, D, '#5a3423', 1.4);
  for (const x of [15.5, 19]) {
    box(g, 2.6, 1.5, 0.06, mat('#2b3440', { roughness: 0.2 }), x, 1.55, D + 0.03);
    box(g, 2.6, 0.9, 0.02, mouchMat(), x, 1.35, D + 0.07);
    box(g, 2.8, 0.1, 0.12, mat('#5a3423'), x, 0.75, D + 0.05);
  }
  for (const x of [13.4, 23.6]) wallLantern(g, x, 2.3, D);
  for (const t of C.tables) {
    cyl(g, 0.4, 0.4, 0.04, mat('#e9e3d6', { roughness: 0.5 }), t.x + 0.5, 0.72, t.z + 0.5, 20);
    cyl(g, 0.03, 0.03, 0.7, iron(), t.x + 0.5, 0.36, t.z + 0.5, 8);
    cyl(g, 0.3, 0.3, 0.03, iron(), t.x + 0.5, 0.015, t.z + 0.5, 14);
    for (const [dx, dz] of [[-0.12, 0.08], [0.1, -0.1]]) cyl(g, 0.03, 0.025, 0.09, mat('#8fd0a6', { transparent: true, opacity: 0.75 }), t.x + 0.5 + dx, 0.79, t.z + 0.5 + dz, 10);
  }
  C.chaises.forEach((c, i) => {
    const ch = new THREE.Group(); ch.position.set(c.x + 0.5, 0, c.z + 0.5); ch.rotation.y = c.r * Math.PI / 2; g.add(ch);
    box(ch, 0.44, 0.04, 0.44, mat('#d7a35c'), 0, 0.45, 0);
    for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(ch, 0.04, 0.45, 0.04, mat('#8a5a3b'), dx, 0.225, dz);
    box(ch, 0.44, 0.5, 0.04, mat('#8a5a3b'), 0, 0.72, -0.2);
    ch.traverse(o => { o.userData.chair = i; });
  });
  const board = box(g, 0.6, 0.9, 0.04, mat('#2a2a2a'), C.x0 + 0.5, 0.5, D + 2.4); board.rotation.x = -0.2;
  for (const [x, z] of [[C.x1 - 0.6, D + 0.5], [C.x0 - 0.5, D + 0.5]]) { const p = makeFurniture('plante'); p.position.set(x, 0, z); g.add(p); }
  // La mahlaba (laiterie) : façade blanc et bleu, porte, bouteilles en vitrine.
  const M = RUE.mahlaba;
  awning(g, M.x0, M.x1, D, 1.2, 2.75, T.rayures('#f2ede3', '#4f5bd5'));
  door(g, M.porte, D, '#4f5bd5', 1.2, null, false);
  box(g, 2.4, 1.3, 0.06, mat('#3a3d44', { roughness: 0.3 }), M.porte + 2.2, 1.6, D + 0.03);
  for (let i = 0; i < 6; i++) cyl(g, 0.08, 0.08, 0.3, mat(i % 2 ? '#ffffff' : '#f5e6b8'), M.porte + 1.4 + i * 0.3, 1.45, D + 0.06, 8);
  wallLantern(g, M.porte + 0.5, 2.9, D);
  bougainvillea(g, M.x1 + 0.6, 3.6, D + 0.3);
  bougainvillea(g, F.x0 - 0.5, 3.6, D + 0.3);

  // En face : la placette avec sa fontaine, ses orangers et ses bancs, et la mosquée au fond.
  const P = PLACE;
  const dal = T.dallage().clone(); dal.repeat.set((P.x1 - P.x0) / 2, (P.z1 - P.z0) / 2); dal.needsUpdate = true;
  plane(P.x1 - P.x0, P.z1 - P.z0, new THREE.MeshStandardMaterial({ map: dal, roughness: 0.9 }), (P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2, 0.006);
  for (let x = P.x0; x < P.x1; x++) plane(1, 1, zelMat(), x + 0.5, P.z0 + 0.5, 0.008);
  fountain(g, P.fontaine.x, P.fontaine.z);
  for (const o of P.orangers) orangeTree(g, o.x + 0.5, o.z + 0.5);
  for (const b of P.bancs) bench(g, b.x + 1, b.z + 0.5, b.r);
  mosque(g, P.mosquee.x0, P.mosquee.x1, P.mosquee.z);
  // Les immeubles d'en face et derrière.
  let seed = 7;
  for (let x = X0 - 10; x < X1 + 10; x += 7) {
    if (x + 3.3 > P.x0 && x - 3.3 < P.x1) continue;
    building(g, x, D + 18, 6.6, 8, 8 + ((seed * 5) % 4) * 2, -1, seed++);
  }
  for (let x = X0 - 10; x < X1 + 10; x += 7) building(g, x, -12, 6.6, 12, 11 + ((seed * 3) % 4) * 2, 1, seed++);
  for (const p of RUE.portes.slice(2)) door(g, p.x, D + 14 - 0.1, ['#2f4f7a', '#7a2e3a', '#5a3423', '#2e6b57'][seed++ % 4]);
  for (const p of RUE.palmiers) palm(g, p.x + 0.5, p.z + 0.5);
  for (const l of RUE.lampes) lantern(g, l.x + 0.5, l.z + 0.5);
  const B = RUE.banc;
  bench(g, B.x + 1, B.z + 0.5, 0);
  const taxi = new THREE.Group(); taxi.position.set(RUE.taxi.x, 0, RUE.taxi.z); g.add(taxi);
  box(taxi, 3.6, 0.6, 1.6, mat('#c8102e', { roughness: 0.4 }), 0, 0.55, 0);
  box(taxi, 2, 0.55, 1.45, mat('#c8102e', { roughness: 0.4 }), -0.2, 1.1, 0);
  box(taxi, 1.9, 0.42, 1.47, mat('#2b3440', { roughness: 0.2 }), -0.2, 1.1, 0);
  box(taxi, 0.5, 0.18, 0.25, mat('#f2f0e6'), -0.2, 1.47, 0);
  for (const [x, z] of [[-1.15, 0.8], [1.15, 0.8], [-1.15, -0.8], [1.15, -0.8]]) {
    const w = cyl(taxi, 0.32, 0.32, 0.22, mat('#1b1b1b'), x, 0.32, z, 16); w.rotation.x = Math.PI / 2;
  }
  // Au loin : un grand minaret à la Hassan II.
  const m = new THREE.Group(); m.position.set(X1 + 30, 0, -50); g.add(m);
  box(m, 4, 34, 4, mat('#e3d6bd'), 0, 17, 0);
  box(m, 4.1, 2.4, 4.1, mat(VERT), 0, 30, 0);
  box(m, 2.4, 5, 2.4, mat('#e3d6bd'), 0, 36.5, 0);
  box(m, 2.5, 0.8, 2.5, mat(VERT), 0, 38.5, 0);
  cyl(m, 0.08, 0.08, 2.4, BRASS(), 0, 40, 0, 6);
  return g;
}
