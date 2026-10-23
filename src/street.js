// Le quartier : rue, pâté de maisons marocain, café, hanout, four, laiterie, placette avec fontaine et mosquée.
import * as THREE from 'three';
import * as T from './textures.js';
import { mat, box, cyl, sph, add, BRASS, GLASS, texMat, makeFurniture } from './models.js';
import { W, D, X0, X1, Z1, RUE, CAFE, PLACE, TAXI, PLAGE } from './data.js';

// Palette des façades : crème, sable, ocre clair ; socles terre cuite, tuiles vertes, bois sombre.
const FACADES = ['#f1e9d8', '#e9d8b8', '#f4ecdf', '#e4cfae'];
const TERRE = '#b9674a', VERT = '#2e6b57', BOIS = '#4a2c18', FER = '#2a2f36';
const VOLETS = ['#2e6b57', '#2f4f7a', '#7a2e3a', '#c99a3a'];
const iron = () => mat(FER, { metalness: 0.4, roughness: 0.5 });
// Enduit des façades : la texture tadelakt teintée, pour que les murs ne soient plus plats.
const platre = (color, rx, ry) => texMat('facade-' + color + '-' + Math.round(rx * 10) + '-' + Math.round(ry * 10), T.imgTex('mur-tadelakt', '#f1ece2', 512, rx, ry), { color, roughness: 0.95 });
const CREME = '#f4eee2';
const zelMat = () => texMat('zel-vert-mur', T.imgTex('sol-zellige-vert', '#5f8f78'), { roughness: 0.5 });
const zelBleu = () => texMat('zel-bleu-mur', T.imgTex('sol-zellige-bleu', '#5a7aa8'), { roughness: 0.5 });
const mouchMat = () => texMat('mouch', T.moucharabieh(), { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
// Matériaux de Californie, à partir des textures fournies.
const murVilla = (rx = 2, ry = 1) => texMat('mur-villa' + rx + ry, T.imgTex('mur-villa', '#f7f4ee', 512, rx, ry), { roughness: 0.9 });
const haieMat = () => texMat('haie', T.imgTex('haie', '#3f7a3a', 512, 2, 2), { roughness: 0.95 });
const pelouseMat = (rx, ry) => texMat('pelouse' + rx + ry, T.imgTex('pelouse', '#5f9a4a', 512, rx, ry), { roughness: 0.95 });
const dallageChic = (rx, ry) => texMat('dallage-chic' + rx + ry, T.imgTex('dallage-chic', '#e3d6bd', 512, rx, ry), { roughness: 0.85 });
const eauMat = () => new THREE.MeshStandardMaterial({ map: T.imgTex('eau-piscine', '#3fb1d9', 512, 2, 4), roughness: 0.1, metalness: 0.1 });
const boisPergola = () => texMat('bois-pergola', T.imgTex('bois-pergola', '#b07a4c', 512, 1, 0.12), { roughness: 0.8 });
const storeMat = (nom, rx = 4) => texMat('store-' + nom + rx, T.imgTex('store-' + nom, nom === 'rose' ? '#f5c6d6' : '#f2ede3', 512, rx, 1), { roughness: 0.8, side: THREE.DoubleSide });

// Fenêtre marocaine : encadrement clair, petit arc, vitre sombre, et selon les cas moucharabieh ou volets.
function fenetre(g, x, y, z, face, style, grille = false) {
  const fz = z + face * 0.03;
  box(g, 1.1, 1.5, 0.06, mat('#f8f3e8'), x, y, fz);
  box(g, 1.3, 0.1, 0.14, mat('#e3dccd'), x, y + 1.36, fz + face * 0.04);                 // le linteau
  box(g, 1.16, 1.56, 0.03, mat('#e3dccd'), x, y + 0.02, fz - face * 0.01);               // l'encadrement en relief
  if (grille) { for (let i = -2; i <= 2; i++) box(g, 0.025, 1.3, 0.025, iron(), x + i * 0.18, y - 0.05, fz + face * 0.12); for (const dy of [-0.5, 0, 0.5]) box(g, 0.9, 0.025, 0.025, iron(), x, y - 0.05 + dy, fz + face * 0.12); }
  box(g, 0.9, 1.3, 0.06, mat('#2b3440', { roughness: 0.25 }), x, y - 0.05, fz + face * 0.01);
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 18, 1, false, 0, Math.PI), mat('#f8f3e8'));
  arc.rotation.x = Math.PI / 2; arc.rotation.z = 0; arc.position.set(x, y + 0.75, fz); add(g, arc);
  if (style === 'mouch') box(g, 0.9, 1.0, 0.02, mouchMat(), x, y - 0.1, fz + face * 0.05);
  else if (style === 'volets') for (const dx of [-0.62, 0.62]) box(g, 0.3, 1.3, 0.05, mat(VOLETS[Math.abs(Math.round(x * 3) + Math.round(y)) % 4]), x + dx, y - 0.05, fz + face * 0.02);
  box(g, 1.3, 0.1, 0.36, mat('#e3dccd'), x, y - 0.8, fz + face * 0.12);
  box(g, 1.3, 0.04, 0.4, mat('#d1c8b5'), x, y - 0.86, fz + face * 0.1);
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
  const col0 = FACADES[seed % FACADES.length];
  box(b, w, h - y0, d, platre(col0, w / 3, (h - y0) / 3), 0, y0 + (h - y0) / 2, 0);
  const fz = face * (d / 2), cream = mat(CREME);
  if (!y0) box(b, w, 0.7, 0.08, mat(TERRE), 0, 0.35, fz);
  // Pilastres aux angles, bandeau à chaque étage, frise de zellige sous le parapet, gouttière.
  for (const dx of [-w / 2 + 0.15, w / 2 - 0.15]) box(b, 0.3, h - y0, 0.14, cream, dx, y0 + (h - y0) / 2, fz + face * 0.04);
  box(b, w + 0.1, 0.35, 0.1, zelMat(), 0, h - 0.6, fz + face * 0.04);
  cyl(b, 0.07, 0.07, h - y0 - 0.4, mat('#6b6b6b'), -w / 2 + 0.55, y0 + (h - y0) / 2, fz + face * 0.1, 8);
  let row = 0;
  for (let fy = y0 + 1.7; fy < h - 1; fy += 3, row++) {
    if (row > 0) box(b, w + 0.1, 0.14, 0.12, cream, 0, fy - 1.7, fz + face * 0.03);
    let col = 0;
    for (let fx = -w / 2 + 1.3; fx < w / 2 - 0.8; fx += 2.4, col++) {
      const style = (seed + row + col) % 3 === 0 ? 'mouch' : (seed + col) % 2 ? 'volets' : 'simple';
      fenetre(b, fx, fy, fz, face, style, row === 0 && !y0);
      if (row > 0 && (seed + col) % 3 !== 1) balcony(b, fx, fy - 0.85, fz, face);
      else if (row > 0 && (seed + col + row) % 4 === 0) { box(b, 0.7, 0.5, 0.3, mat('#d9d9d6'), fx + 0.9, fy - 0.3, fz + face * 0.2); box(b, 0.6, 0.4, 0.02, mat('#b9b9b6'), fx + 0.9, fy - 0.3, fz + face * 0.36); }
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
  if (tag) { const [k, v] = tag.split(':'); d.traverse(o => { o.userData[k] = v || true; }); }
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
  if (tag) { const [k, v] = tag.split(':'); c.traverse(o => { o.userData[k] = v || true; }); }
}
// Charrette d'oranges du marchand ambulant.
function cart(g, x, z, tag) {
  const c = new THREE.Group(); c.position.set(x + 1, 0, z + 0.5); g.add(c);
  if (tag) c.userData.tag = tag;
  box(c, 1.9, 0.3, 0.9, mat('#8a5a3b'), 0, 0.75, 0);
  for (const dx of [-0.6, 0.6]) { const w = cyl(c, 0.38, 0.38, 0.08, mat('#5a3423'), dx, 0.38, 0.5, 14); w.rotation.x = Math.PI / 2; }
  for (const dx of [-0.85, 0.85]) box(c, 0.08, 0.7, 0.08, mat('#8a5a3b'), dx, 0.35, -0.35);
  for (let i = 0; i < 24; i++) sph(c, 0.1, mat('#e8641a'), -0.8 + (i % 8) * 0.23, 0.98 + Math.floor(i / 8) * 0.12, -0.25 + Math.floor(i / 8) * 0.25);
  box(c, 0.06, 1.6, 0.06, mat('#8a5a3b'), -0.9, 1.5, 0.4);
  box(c, 1.9, 0.04, 1.2, texMat('awn-cart', T.rayures('#c8102e', '#f2ede3')), 0, 2.3, 0);
  // Des cagettes de légumes à côté, et une balance.
  for (let i = 0; i < 3; i++) { box(c, 0.5, 0.25, 0.4, mat('#b8905c'), -1.25, 0.12 + i * 0.27, -0.2 + (i % 2) * 0.1); for (let j = 0; j < 6; j++) sph(c, 0.06, mat(['#c8102e', '#2e6b57', '#e0a526'][i]), -1.45 + (j % 3) * 0.2, 0.3 + i * 0.27, -0.3 + Math.floor(j / 3) * 0.2); }
  box(c, 0.3, 0.05, 0.3, mat('#9aa3ad', { metalness: 0.5 }), 0.7, 0.93, -0.2); cyl(c, 0.12, 0.12, 0.08, mat('#9aa3ad', { metalness: 0.5 }), 0.7, 1.0, -0.2, 10);
  if (tag) { const [k, v] = tag.split(':'); c.traverse(o => { o.userData[k] = v || true; }); }
}
function bougainvillea(g, x, y, z) {
  for (let i = 0; i < 9; i++) sph(g, 0.3 + (i % 3) * 0.1, mat(i % 3 ? '#c2185b' : '#3f7a3a'), x + (i % 3) * 0.5 - 0.5, y + Math.floor(i / 3) * 0.5, z + ((i * 7) % 3) * 0.15);
}

// ---------- Californie : éléments modernes ----------
// Baie vitrée à cadre sombre ; l'intérieur s'éclaire d'une lumière chaude le soir.
function vitrage(g, w, h, x, y, z, nb = 4) {
  const m = new THREE.MeshStandardMaterial({ color: '#34414f', emissive: '#ffb062', emissiveIntensity: 0.1, roughness: 0.15, metalness: 0.2 });
  box(g, w, h, 0.06, m, x, y, z);
  for (const dy of [-h / 2, h / 2]) box(g, w + 0.12, 0.09, 0.12, mat('#1f232a'), x, y + dy, z);
  for (let i = 0; i <= nb; i++) box(g, 0.08, h, 0.12, mat('#1f232a'), x - w / 2 + i * w / nb, y, z);
  g.userData.lamps = g.userData.lamps || []; g.userData.lamps.push({ mat: m, small: true, k: 0.35 });
}
// Claustra : des lames de bois horizontales, comme sur les villas modernes.
function claustra(g, w, h, x, y, z) {
  const n = Math.max(2, Math.round(h / 0.22));
  for (let i = 0; i < n; i++) box(g, w, 0.12, 0.1, mat('#8a5a3b'), x, y - h / 2 + 0.11 + i * 0.22, z);
}
// Lampadaire moderne : un mât noir et une tête carrée qui s'allume le soir.
function lampadaire(g, x, z, h = 4.2) {
  cyl(g, 0.14, 0.18, 0.3, mat('#1f232a'), x, 0.15, z, 8);
  box(g, 0.1, h, 0.1, mat('#1f232a'), x, h / 2, z);
  const glow = new THREE.MeshStandardMaterial({ color: '#ffe3a8', emissive: '#ffb347', emissiveIntensity: 0.3 });
  box(g, 0.34, 0.5, 0.34, glow, x, h + 0.25, z);
  box(g, 0.44, 0.06, 0.44, mat('#1f232a'), x, h + 0.53, z);
  box(g, 0.44, 0.06, 0.44, mat('#1f232a'), x, h - 0.03, z);
  g.userData.lamps = g.userData.lamps || []; g.userData.lamps.push({ mat: glow, x, y: h + 0.25, z });
}
// Jardinière blanche : avec un petit arbre, ou des fleurs roses.
function jardiniere(g, x, z, fleurs = false) {
  box(g, 1, 0.7, 1, mat('#f7f4ee'), x, 0.35, z);
  box(g, 0.9, 0.05, 0.9, mat('#4a3a2a'), x, 0.7, z);
  if (fleurs) for (let i = 0; i < 6; i++) sph(g, 0.22, mat(i % 2 ? '#c2185b' : '#3f7a3a'), x - 0.3 + (i % 3) * 0.3, 0.85 + (i % 2) * 0.1, z - 0.2 + Math.floor(i / 3) * 0.4);
  else { cyl(g, 0.06, 0.08, 1.2, mat('#6b4a2c'), x, 1.3, z, 6); sph(g, 0.6, mat('#3f7a3a'), x, 2.2, z); sph(g, 0.4, mat('#4b8c3f'), x + 0.25, 2.5, z - 0.1); }
}
function cypres(g, x, z, h = 4.5) {
  cyl(g, 0.05, 0.08, 0.6, mat('#5a4030'), x, 0.3, z, 6);
  cyl(g, 0, 0.55, h, mat('#2f5f33'), x, 0.5 + h / 2, z, 7);
}
function parasol(g, x, z, h = 2.4, r = 1.2) {
  cyl(g, 0.03, 0.03, h, iron(), x, h / 2, z, 8);
  cyl(g, 0, r, 0.45, storeMat('creme', 3), x, h + 0.2, z, 8);
}
function transat(g, x, z, r = 0) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = r; g.add(t);
  box(t, 0.6, 0.08, 1.6, mat('#f2ede3'), 0, 0.35, 0);
  const d = box(t, 0.6, 0.08, 0.7, mat('#f2ede3'), 0, 0.55, -0.95); d.rotation.x = -0.7;
  for (const [dx, dz] of [[-0.25, -0.6], [0.25, -0.6], [-0.25, 0.6], [0.25, 0.6]]) box(t, 0.04, 0.3, 0.04, mat('#8a5a3b'), dx, 0.15, dz);
}
// Chaise de terrasse en rotin clair.
function chaiseRotin(g, x, z, r = 0) {
  const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = r; g.add(ch);
  box(ch, 0.44, 0.05, 0.44, mat('#c9a06a'), 0, 0.45, 0);
  box(ch, 0.44, 0.5, 0.04, mat('#c9a06a'), 0, 0.72, -0.2);
  for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(ch, 0.03, 0.45, 0.03, mat('#8a5a3b'), dx, 0.225, dz);
  return ch;
}

// Villa de Californie : mur de clôture bas couvert de haie et de bougainvilliers, portail à barreaux sombres entre deux
// piliers éclairés, pelouse, palmier et cyprès ; maison blanche en deux volumes cubiques, baies vitrées à cadres sombres,
// claustra en bois, dalles de toit crème, terrasse de toit avec parasol et transats, et une piscine pour certaines.
function villa(g, x0, x1, z, seed, face = 1) {
  const w = x1 - x0, cx = (x0 + x1) / 2, v = new THREE.Group(); v.position.set(cx, 0, z); g.add(v);
  const back = -face, white = murVilla(2, 1), cream = mat('#e9e2d3'), fer = mat('#1f232a');
  // La clôture.
  box(v, w, 1.9, 0.3, murVilla(3, 1), 0, 0.95, 0);
  box(v, w + 0.1, 0.12, 0.42, cream, 0, 1.96, 0);
  box(v, w - 6, 0.8, 0.9, haieMat(), -2.5, 2.3, back * 0.5);
  bougainvillea(v, -w / 2 + 2.5, 1.8, face * 0.25);
  if (w > 13) bougainvillea(v, w / 2 - 6.5, 1.6, face * 0.25);
  const gx = w / 2 - 2.4;
  for (const dx of [-1.5, 1.5]) {
    box(v, 0.5, 2.4, 0.5, white, gx + dx, 1.2, 0);
    const lamp = new THREE.MeshStandardMaterial({ color: '#ffcf86', emissive: '#ffb347', emissiveIntensity: 0.5 });
    box(v, 0.16, 0.22, 0.12, lamp, gx + dx, 1.7, face * 0.3);
    v.userData.lamps = v.userData.lamps || []; v.userData.lamps.push({ mat: lamp, small: true });
  }
  for (const y of [0.12, 2.3]) box(v, 2.5, 0.1, 0.1, fer, gx, y, 0);
  for (let i = -5; i <= 5; i++) box(v, 0.06, 2.2, 0.06, fer, gx + i * 0.23, 1.2, 0);
  jardiniere(v, gx - 2.3, face * 0.9, true);
  // Le jardin.
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, 2.4), pelouseMat(3, 1)); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 0.01, back * 1.6); v.add(lawn);
  const allee = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), dallageChic(1, 1)); allee.rotation.x = -Math.PI / 2; allee.position.set(gx, 0.02, back * 1.6); v.add(allee);
  palm(v, -w / 2 + 3.2, back * 1.8);
  cypres(v, -w / 2 + 1, back * 2.4, 4.5 + (seed % 3) * 0.5);
  cypres(v, -w / 2 + 1, back * 6.5, 5.2);
  cypres(v, w / 2 - 0.8, back * 10, 5.6);
  // La maison.
  const depth = 8, zc = back * (depth / 2 + 3), h1 = 3.6, h2 = 6.6 + (seed % 2) * 0.6;
  const w1 = w - 5, xc = -1.5, w2 = w1 * 0.55, x2 = xc - w1 * 0.2, z2 = zc + back * depth * 0.1;
  box(v, w1, h1, depth, white, xc, h1 / 2, zc);
  box(v, w2, h2, depth * 0.7, white, x2, h2 / 2, z2);
  box(v, w1 + 0.5, 0.22, depth + 0.5, cream, xc, h1 + 0.1, zc);
  box(v, w2 + 0.5, 0.22, depth * 0.7 + 0.5, cream, x2, h2 + 0.1, z2);
  const front = back * 3 + face * 0.04, front2 = back * 5 + face * 0.04;
  vitrage(v, w1 * 0.8, 2.6, xc, 1.5, front, 4);
  vitrage(v, w2 * 0.55, 1.9, x2 - w2 * 0.18, h1 + 1.6, front2, 2);
  claustra(v, w2 * 0.3, 2.3, x2 + w2 * 0.3, h1 + 1.6, front2 + face * 0.03);
  // La terrasse de toit, sur le volume bas.
  const yt = h1 + 0.21;
  box(v, w1 * 0.8, 0.03, 0.03, iron(), xc, yt + 1, back * 3.1);
  for (let i = 0; i <= 8; i++) box(v, 0.03, 1, 0.03, iron(), xc - w1 * 0.4 + i * w1 * 0.1, yt + 0.5, back * 3.1);
  const tg = new THREE.Group(); tg.position.set(xc + w1 * 0.22, yt, back * 4.1); v.add(tg);
  parasol(tg, 0, 0, 2.2, 1.1); transat(tg, -0.75, 0); transat(tg, 0.75, 0);
  const pots = makeFurniture('plante'); pots.position.set(xc - w1 * 0.4, yt, back * 4); v.add(pots);
  // La piscine, le long du mur latéral.
  if (seed % 2) {
    box(v, 2.4, 0.08, 5.4, mat('#f7f4ee'), w / 2 - 2.2, 0.04, back * 7.5);
    box(v, 2, 0.06, 5, eauMat(), w / 2 - 2.2, 0.08, back * 7.5);
    transat(v, w / 2 - 0.6, back * 6.2, Math.PI / 2); transat(v, w / 2 - 0.6, back * 8.2, Math.PI / 2);
    parasol(v, w / 2 - 0.6, back * 4.6, 2.3, 1);
  }
  return v;
}
// Restaurant ou café d'Anfa, face à la rue : façade basse et blanche, grande vitrine, bandeau de bois, terrasse avec
// tables blanches, chaises en rotin, parasols crème ou pergola, et des jardinières fleuries en bordure.
function restaurant(g, x0, x1, z, style, o = {}) {
  const w = x1 - x0, cx = (x0 + x1) / 2, r = new THREE.Group(); r.position.set(cx, 0, z); g.add(r);
  const terrasse = o.terrasse !== false, cream = mat('#e9e2d3');
  box(r, w, 4.6, 9, murVilla(2, 1), 0, 2.3, 4.5);
  box(r, w + 0.4, 0.22, 9.4, cream, 0, 4.71, 4.5);
  vitrage(r, w - 1.6, 2.3, 0, 1.45, -0.04, 4);
  claustra(r, w - 0.4, 1.0, 0, 3.4, -0.06);
  const accent = { glacier: '#c2185b', lounge: '#1f232a', cafe: '#8a5a3b', epicerie: '#1f5a45', agence: '#2f4f7a', pergola: '#2e6b57' }[style];
  box(r, w - 0.4, 0.12, 0.14, mat(accent), 0, 2.78, -0.06);
  if (style === 'pergola' || style === 'lounge') {
    for (const dx of [-w / 2 + 0.4, w / 2 - 0.4]) for (const dz of [-0.3, -2.6]) box(r, 0.14, 3, 0.14, mat('#8a5a3b'), dx, 1.5, dz);
    for (let i = 0; i < 7; i++) box(r, w, 0.08, 0.12, boisPergola(), 0, 3, -0.3 - i * 0.38);
    if (style === 'pergola') for (let i = 0; i < 12; i++) sph(r, 0.3, mat(i % 3 ? '#3f7a3a' : '#c2185b'), -w / 2 + 0.6 + i * (w - 1.2) / 11, 3.15, -0.3 - (i % 4) * 0.6);
    else for (let i = 0; i < 9; i++) sph(r, 0.06, new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 1.2 }), -w / 2 + 0.6 + i * (w - 1.2) / 8, 2.7 - (i % 2) * 0.2, -1.4);
  }
  if (terrasse) {
    for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 2) {
      cyl(r, 0.4, 0.4, 0.04, mat('#f7f4ee', { roughness: 0.4 }), x, 0.72, -1.4, 18);
      cyl(r, 0.03, 0.03, 0.7, iron(), x, 0.36, -1.4, 8);
      chaiseRotin(r, x - 0.6, -1.4, -Math.PI / 2); chaiseRotin(r, x + 0.6, -1.4, Math.PI / 2);
      if (style !== 'pergola' && style !== 'lounge') parasol(r, x, -1.4, 2.4, 1.2);
    }
    for (let x = -w / 2 + 0.8; x < w / 2 - 0.5; x += 2.4) jardiniere(r, x, -2.75, true);
  } else for (const dx of [-w / 2 + 0.7, w / 2 - 0.7]) jardiniere(r, dx, -0.8, dx < 0);
  return r;
}
// Berline blanche qui passe sur la route.
function voitureBlanche(g, x, z) {
  const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c);
  box(c, 4.2, 0.6, 1.7, mat('#f2f0e6', { roughness: 0.35 }), 0, 0.5, 0);
  box(c, 2.3, 0.55, 1.5, mat('#f2f0e6', { roughness: 0.35 }), -0.2, 1.05, 0);
  box(c, 2.2, 0.4, 1.52, mat('#2b3440', { roughness: 0.2 }), -0.2, 1.05, 0);
  for (const [dx, dz] of [[-1.35, 0.85], [1.35, 0.85], [-1.35, -0.85], [1.35, -0.85]]) { const w = cyl(c, 0.32, 0.32, 0.22, mat('#1b1b1b'), dx, 0.32, dz, 16); w.rotation.x = Math.PI / 2; }
}
function suv(g, x, z, color) {
  const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c);
  box(c, 4.4, 0.9, 1.9, mat(color, { roughness: 0.35 }), 0, 0.75, 0);
  box(c, 2.8, 0.75, 1.75, mat(color, { roughness: 0.35 }), -0.2, 1.55, 0);
  box(c, 2.7, 0.5, 1.78, mat('#1d2630', { roughness: 0.15 }), -0.2, 1.55, 0);
  for (const [dx, dz] of [[-1.5, 0.95], [1.5, 0.95], [-1.5, -0.95], [1.5, -0.95]]) { const w = cyl(c, 0.4, 0.4, 0.26, mat('#1b1b1b'), dx, 0.4, dz, 16); w.rotation.x = Math.PI / 2; }
}
function voiture(g, x, z) {
  const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c);
  box(c, 3.5, 0.6, 1.6, mat('#2f4f7a', { roughness: 0.4 }), 0, 0.5, 0);
  box(c, 2, 0.55, 1.45, mat('#2f4f7a', { roughness: 0.4 }), -0.2, 1.05, 0);
  box(c, 1.9, 0.4, 1.47, mat('#2b3440', { roughness: 0.2 }), -0.2, 1.05, 0);
  for (const [dx, dz] of [[-1.1, 0.8], [1.1, 0.8], [-1.1, -0.8], [1.1, -0.8]]) { const w = cyl(c, 0.3, 0.3, 0.22, mat('#1b1b1b'), dx, 0.3, dz, 16); w.rotation.x = Math.PI / 2; }
}
function scooter(g, x, z) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = 0.4; g.add(c);
  for (const dz of [-0.55, 0.55]) { const w = cyl(c, 0.22, 0.22, 0.1, mat('#1b1b1b'), 0, 0.22, dz, 14); w.rotation.z = Math.PI / 2; }
  box(c, 0.3, 0.3, 1.1, mat('#c8102e', { roughness: 0.4 }), 0, 0.45, 0);
  box(c, 0.32, 0.12, 0.5, mat('#2a2a2a'), 0, 0.75, -0.1);
  box(c, 0.5, 0.04, 0.04, mat('#d8d8dc', { metalness: 0.7 }), 0, 0.95, 0.45);
  cyl(c, 0.03, 0.03, 0.5, mat('#d8d8dc', { metalness: 0.7 }), 0, 0.7, 0.45, 8);
}
function parc(g, P) {
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0), pelouseMat(4, 2));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set((P.x0 + P.x1) / 2, 0.006, (P.z0 + P.z1) / 2); lawn.receiveShadow = true; g.add(lawn);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0 - 2, 1.2), dallageChic(6, 0.5));
  path.rotation.x = -Math.PI / 2; path.position.set((P.x0 + P.x1) / 2, 0.008, P.fontaine.z + 0.5); g.add(path);
  const path2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, P.z1 - P.z0 - 1), dallageChic(0.5, 3));
  path2.rotation.x = -Math.PI / 2; path2.position.set(P.fontaine.x, 0.008, (P.z0 + P.z1) / 2); g.add(path2);
  for (const o of P.orangers) { cyl(g, 0.12, 0.16, 2.2, mat('#6b4a2c'), o.x + 0.5, 1.1, o.z + 0.5, 8); sph(g, 1.1, mat('#3f7a3a'), o.x + 0.5, 2.9, o.z + 0.5); sph(g, 0.7, mat('#4b8c3f'), o.x + 0.9, 3.4, o.z + 0.2); }
  for (const c of P.fontaine.cells) if ((c.x + c.z) % 2) sph(g, 0.3, mat(['#c2185b', '#e0a526', '#f2ede3'][(c.x * 3 + c.z) % 3]), c.x + 0.5, 0.3, c.z + 0.5);
  for (const b of P.bancs) bench(g, b.x + 1, b.z + 0.5, b.r);
  for (const x of [P.x0 + 1, P.x1 - 1]) palm(g, x, P.z1 - 1);
}
// La corniche : promenade, plage de sable, rochers, océan, phare blanc et, au loin, les immeubles blancs de la ville.
function ocean(g, z) {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 90), new THREE.MeshStandardMaterial({ color: '#2d8fc4', roughness: 0.2, metalness: 0.15 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(W / 2, -0.01, z + 68); g.add(sea);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(300, 14), mat('#eadcb4'));
  sand.rotation.x = -Math.PI / 2; sand.position.set(W / 2, 0, z + 18); g.add(sand);
  const ecume = new THREE.Mesh(new THREE.PlaneGeometry(300, 1.2), mat('#dff3fb'));
  ecume.rotation.x = -Math.PI / 2; ecume.position.set(W / 2, 0.005, z + 24.5); g.add(ecume);
  // La promenade : un muret blanc, des palmiers et des lampadaires.
  const prom = new THREE.Mesh(new THREE.PlaneGeometry(300, 9), dallageChic(60, 2));
  prom.rotation.x = -Math.PI / 2; prom.position.set(W / 2, 0.004, z + 6.5); g.add(prom);
  box(g, 300, 0.9, 0.6, mat('#f7f4ee'), W / 2, 0.45, z + 10.8);
  for (let x = -70; x < 90; x += 8) { palm(g, x, z + 9.2); if ((x / 8) % 2 === 0) lampadaire(g, x + 4, z + 9.6, 3.8); }
  // Les rochers de la pointe, et le phare.
  const roc = mat('#7d7366', { roughness: 1 });
  for (let i = 0; i < 9; i++) { const s = 1.2 + (i % 3) * 0.8; box(g, s * 2, s * 0.8, s * 1.3, roc, W / 2 + 30 + i * 3.4, s * 0.3, z + 27 + (i % 3) * 3).rotation.y = i * 0.6; }
  box(g, 14, 1.4, 10, roc, W / 2 + 48, 0.7, z + 42);
  const phare = new THREE.Group(); phare.position.set(W / 2 + 48, 1.4, z + 42); g.add(phare);
  box(phare, 5, 1.2, 5, mat('#f7f4ee'), 0, 0.6, 0);
  cyl(phare, 1.3, 1.9, 19, mat('#f7f4ee'), 0, 10.5, 0, 12);
  for (const y of [6, 12]) cyl(phare, 1.7, 1.7, 0.4, mat('#1f232a'), 0, y, 0, 12);
  cyl(phare, 1.9, 1.9, 0.5, mat('#1f232a'), 0, 20, 0, 12);
  cyl(phare, 1.1, 1.1, 2, GLASS(), 0, 21.2, 0, 12);
  cyl(phare, 0, 1.4, 1.2, mat('#2a2f36'), 0, 22.8, 0, 12);
  // Les immeubles blancs de la ville, loin derrière les villas.
  for (let i = 0; i < 14; i++) {
    const x = -110 + i * 17 + (i % 3) * 4, h = 10 + (i * 7) % 16, w = 7 + (i % 4) * 2;
    if (x > -40 && x < 60) continue;
    box(g, w, h, w, mat(i % 2 ? '#f1ece2' : '#e7e0d0'), x, h / 2, z + 20 + (i % 4) * 8);
    box(g, w + 0.4, 0.3, w + 0.4, mat('#d9d2c2'), x, h + 0.1, z + 20 + (i % 4) * 8);
  }
}

// Les guirlandes du Ramadan : des lanternes de couleur tendues au-dessus de la rue.
export function guirlandes() {
  const g = new THREE.Group();
  const cols = ['#ffd27a', '#c2185b', '#2e7d5b', '#4f5bd5', '#e0a526'];
  for (let x = X0 - 6; x < X1 + 6; x += 3) {
    box(g, 0.02, 0.02, 15, mat('#2a2a2a'), x, 4.6, D + 7);
    for (let i = 0; i < 7; i++) {
      const m = new THREE.MeshStandardMaterial({ color: cols[(i + x) % 5], emissive: cols[(i + x) % 5], emissiveIntensity: 0.8 });
      cyl(g, 0.12, 0.09, 0.22, m, x, 4.45, D + 0.5 + i * 2.2, 6);
    }
  }
  return g;
}
export function makeStreet(opts = {}) {
  const quartier = opts.quartier || 'populaire', anfa = quartier === 'anfa', corniche = quartier === 'corniche', chic = anfa || corniche, withHome = opts.withHome !== false;
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat(chic ? '#e4dac4' : '#cdbfa6'));
  ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, -0.02, D / 2); ground.receiveShadow = true; g.add(ground);
  const plane = (w, d, m, x, z, y = 0) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; g.add(p); return p;
  };
  const cx = (X0 + X1) / 2, len = X1 - X0 + 40;
  const tr = T.dallage().clone(); tr.repeat.set(len / 2, 1.5); tr.needsUpdate = true;
  const trM = chic ? dallageChic(len / 2, 1) : new THREE.MeshStandardMaterial({ map: tr, roughness: 0.9 });
  plane(len, 3, trM, cx, D + 1.5, 0.005);
  box(g, len, 0.15, 0.25, mat(chic ? '#e9e2d3' : '#bdb5a6'), cx, 0.06, D + 3);
  const as = T.asphalte().clone(); as.repeat.set(len / 2, 4); as.needsUpdate = true;
  plane(len, 8, new THREE.MeshStandardMaterial({ map: as, roughness: 0.95 }), cx, D + 7, 0.004);
  for (let x = X0 - 20; x < X1 + 20; x += 3) plane(1.4, 0.15, mat('#f2f0e6'), x, D + 7, 0.01);
  for (let z = D + 3.5; z < D + 11; z += 1) plane(2.4, 0.5, mat('#f2f0e6'), RUE.traversee.x0 + 1, z, 0.012);
  plane(len, 3, trM, cx, D + 12.5, 0.005);
  box(g, len, 0.15, 0.25, mat(chic ? '#e9e2d3' : '#bdb5a6'), cx, 0.06, D + 11);
  // Le véhicule du personnage, garé devant chez lui.
  if (opts.vehicule === 'voiture' && withHome) voiture(g, 2.5, D + 4);
  if (opts.vehicule === 'scooter' && withHome) scooter(g, 7.5, D + 0.5);
  // Quand on n'habite pas ici, l'emplacement de l'appartement est un immeuble comme les autres.
  if (!withHome) {
    if (chic) villa(g, 0, W, D, 6);
    else { building(g, W / 2, 1.5, W, 15, 7.6, 1, 5, 0); door(g, 5, D, '#5a3423', 1.2); }
  }
  if (anfa) return anfaStreet(g, opts, plane);
  if (corniche) return cornicheStreet(g, opts, plane);

  // Notre pâté de maisons : deux immeubles de part et d'autre de l'appartement, boutiques au rez-de-chaussée.
  const lw = 12 - X0, rw = X1 + 12 - W;
  building(g, -lw / 2, 1.5, lw, 15, 7.6, 1, 3, 3.1);
  building(g, W + rw / 2, 1.5, rw, 15, 7.6, 1, 4, 3.1);
  box(g, lw, 3.1, 15, platre('#efe6d4', lw / 3, 1), -lw / 2, 1.55, 1.5);
  box(g, rw, 3.1, 15, platre('#efe6d4', rw / 3, 1), W + rw / 2, 1.55, 1.5);
  for (const [x0, x1] of [[X0 - 12, 0], [W, X1 + 12]]) box(g, x1 - x0, 0.16, 0.14, mat(CREME), (x0 + x1) / 2, 3.05, D + 0.05); // le bandeau au-dessus des boutiques
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
  cart(g, RUE.charrette.x, RUE.charrette.z, 'hanout:fruits');
  // Le hanout : store bleu, porte, vitrine et caisses de fruits.
  const H = RUE.hanout;
  awning(g, H.x0, H.x1, D, 1.3, 2.75, T.rayures('#2f4f7a', '#f2ede3'));
  door(g, H.porte, D, '#2f4f7a', 1.2, 'hanout:hanout', false);
  const vitrine = new THREE.Group(); g.add(vitrine);
  box(vitrine, 2.2, 1.3, 0.06, mat('#3a3d44', { roughness: 0.3 }), H.porte - 1.6, 1.6, D + 0.03);
  for (let i = 0; i < 6; i++) box(vitrine, 0.25, 0.4, 0.05, mat(['#d9a43a', '#c8102e', '#2e6b57', '#f2ede3', '#e0a526', '#7a2e3a'][i]), H.porte - 2.5 + i * 0.35, 1.3 + (i % 2) * 0.5, D + 0.05);
  vitrine.traverse(o => { o.userData.hanout = 'hanout'; });
  crate(g, H.caisses[0].x, H.caisses[0].z, '#e8641a', 'hanout:hanout');
  crate(g, H.caisses[1].x, H.caisses[1].z, '#c8102e', 'hanout:hanout');
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
  // La boucherie de Si Mustapha.
  const M = RUE.mahlaba;
  boucherie(g, { x0: M.x0, x1: M.x1, porte: M.porte });
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
  // L'arrêt de taxi au coin de la rue : panneau, et un grand taxi blanc qui attend.
  const A = TAXI.arret, arret = new THREE.Group(); g.add(arret);
  cyl(arret, 0.04, 0.05, 2.6, iron(), A.x + 0.5, 1.3, A.z + 0.5, 8);
  box(arret, 0.9, 0.5, 0.06, mat('#f2ede3'), A.x + 0.5, 2.45, A.z + 0.5);
  box(arret, 0.9, 0.16, 0.07, mat('#c8102e'), A.x + 0.5, 2.6, A.z + 0.5);
  box(arret, 0.9, 0.16, 0.07, mat('#2f4f7a'), A.x + 0.5, 2.3, A.z + 0.5);
  const gt = new THREE.Group(); gt.position.set(A.x + 3.5, 0, D + 4.5); g.add(gt);
  box(gt, 4.6, 0.65, 1.7, mat('#f2f0e6', { roughness: 0.35 }), 0, 0.55, 0);
  box(gt, 2.6, 0.6, 1.55, mat('#f2f0e6', { roughness: 0.35 }), -0.3, 1.15, 0);
  box(gt, 2.5, 0.42, 1.57, mat('#2b3440', { roughness: 0.2 }), -0.3, 1.15, 0);
  box(gt, 0.6, 0.18, 0.3, mat('#2f4f7a'), -0.3, 1.55, 0);
  for (const [x, z] of [[-1.5, 0.85], [1.5, 0.85], [-1.5, -0.85], [1.5, -0.85]]) { const w = cyl(gt, 0.33, 0.33, 0.22, mat('#1b1b1b'), x, 0.33, z, 16); w.rotation.x = Math.PI / 2; }
  arret.traverse(o => { o.userData.taxi = true; }); gt.traverse(o => { o.userData.taxi = true; });
  // Au loin : un grand minaret à la Hassan II.
  const m = new THREE.Group(); m.position.set(X1 + 30, 0, -50); g.add(m);
  box(m, 4, 34, 4, mat('#e3d6bd'), 0, 17, 0);
  box(m, 4.1, 2.4, 4.1, mat(VERT), 0, 30, 0);
  box(m, 2.4, 5, 2.4, mat('#e3d6bd'), 0, 36.5, 0);
  box(m, 2.5, 0.8, 2.5, mat(VERT), 0, 38.5, 0);
  cyl(m, 0.08, 0.08, 2.4, BRASS(), 0, 40, 0, 6);
  return g;
}

// Anfa (Californie) : rien que des villas, des cafés et des restaurants, un parc, et l'océan au bout de la rue.
function anfaStreet(g, opts, plane) {
  // Notre côté : une villa, le glacier, l'épicerie fine, l'appartement, le café La Corniche, l'agence, une villa.
  villa(g, X0 - 12, -17, D, 1);
  restaurant(g, -17, -9, D + 0.2, 'glacier').rotation.y = Math.PI;
  supermarche(g, -9, 0);
  restaurant(g, W, 24, D + 0.2, 'cafe', { terrasse: false }).rotation.y = Math.PI;
  restaurant(g, 24, 32, D + 0.2, 'agence', { terrasse: false }).rotation.y = Math.PI;
  villa(g, 32, X1 + 12, D, 4);
  cafeChic(g);
  // L'agence immobilière : porte bleue et vitrine d'annonces (on la touche pour déménager).
  const M = RUE.mahlaba, ag = new THREE.Group(); g.add(ag);
  box(ag, 4, 1.8, 0.06, mat('#1d2630', { roughness: 0.15 }), M.porte - 1.5, 1.5, D + 0.3);
  for (let i = 0; i < 6; i++) box(ag, 0.5, 0.35, 0.02, mat('#f7f4ee'), M.porte - 2.9 + (i % 3) * 0.8, 1.3 + Math.floor(i / 3) * 0.5, D + 0.36);
  door(ag, M.porte, D + 0.28, '#2f4f7a', 1.2, null, false);
  ag.traverse(o => { o.userData.agence = true; });
  // Lampadaires, jardinières le long des trottoirs, et les grosses voitures.
  for (const l of RUE.lampes) lampadaire(g, l.x + 0.5, l.z + 0.5);
  for (let x = X0 - 10; x < X1 + 12; x += 5) {
    if (x < 5 || x > 13) jardiniere(g, x, D + 2.55, x % 2 === 0);
    if (x < 1 || x > 19) jardiniere(g, x + 2, D + 11.45, x % 2 !== 0);
  }
  for (const p of RUE.palmiers) if (p.z > D + 10) palm(g, p.x + 0.5, p.z + 0.5);
  suv(g, RUE.taxi.x, RUE.taxi.z, '#1b1b1b');
  suv(g, RUE.taxi.x + 14, RUE.taxi.z, '#f7f4ee');
  voitureBlanche(g, RUE.taxi.x - 9, D + 9.2);
  arretTaxi(g);
  // En face : un restaurant à pergola, le parc, un lounge, et des villas aux deux bouts ; la corniche et l'océan derrière.
  parc(g, PLACE);
  restaurant(g, -18, -2, D + 14, 'pergola');
  restaurant(g, 18, 32, D + 14, 'lounge');
  villa(g, X0 - 14, -18, D + 14, 7, -1); villa(g, 32, X1 + 14, D + 14, 8, -1);
  ocean(g, PLACE.z1 + 1);
  collectLamps(g);
  return g;
}

// ---------- Ce que partagent Anfa et la corniche ----------
// Le café chic : sa porte, sa pergola, ses tables blanches, ses chaises en rotin et ses parasols crème.
function cafeChic(g) {
  const C = CAFE;
  door(g, C.porte.x, D + 0.28, '#1b1b1b', 1.4, null, false);
  for (const p of C.poteaux) box(g, 0.14, 3, 0.14, mat('#8a5a3b'), p.x + 0.5, 1.5, p.z + 0.5);
  for (let i = 0; i < 6; i++) box(g, C.poteaux[1].x - C.poteaux[0].x + 0.4, 0.08, 0.12, boisPergola(), (C.poteaux[0].x + C.poteaux[1].x) / 2 + 0.5, 3, D + 0.6 + i * 0.4);
  for (const t of C.tables) {
    cyl(g, 0.45, 0.45, 0.04, mat('#f7f4ee', { roughness: 0.4 }), t.x + 0.5, 0.72, t.z + 0.5, 20);
    cyl(g, 0.03, 0.03, 0.7, iron(), t.x + 0.5, 0.36, t.z + 0.5, 8);
    parasol(g, t.x + 0.5, t.z + 0.5, 2.5, 1.3);
  }
  C.chaises.forEach((c, i) => {
    const ch = chaiseRotin(g, c.x + 0.5, c.z + 0.5, c.r * Math.PI / 2);
    ch.traverse(o => { o.userData.chair = i; });
  });
  for (const x of [C.x0 + 0.5, C.x1 - 0.5]) jardiniere(g, x, D + 2.5, true);
}
// L'arrêt de taxi et le grand taxi blanc qui attend au coin.
function arretTaxi(g) {
  const A = TAXI.arret, arret = new THREE.Group(); g.add(arret);
  cyl(arret, 0.04, 0.05, 2.6, iron(), A.x + 0.5, 1.3, A.z + 0.5, 8);
  box(arret, 0.9, 0.5, 0.06, mat('#f2ede3'), A.x + 0.5, 2.45, A.z + 0.5);
  box(arret, 0.9, 0.16, 0.07, mat('#c8102e'), A.x + 0.5, 2.6, A.z + 0.5);
  box(arret, 0.9, 0.16, 0.07, mat('#2f4f7a'), A.x + 0.5, 2.3, A.z + 0.5);
  arret.traverse(o => { o.userData.taxi = true; });
  const gt = new THREE.Group(); gt.position.set(A.x + 3.5, 0, D + 4.5); g.add(gt);
  box(gt, 4.6, 0.65, 1.7, mat('#f2f0e6', { roughness: 0.35 }), 0, 0.55, 0);
  box(gt, 2.6, 0.6, 1.55, mat('#f2f0e6', { roughness: 0.35 }), -0.3, 1.15, 0);
  box(gt, 2.5, 0.42, 1.57, mat('#2b3440', { roughness: 0.2 }), -0.3, 1.15, 0);
  for (const [x, z] of [[-1.5, 0.85], [1.5, 0.85], [-1.5, -0.85], [1.5, -0.85]]) { const w = cyl(gt, 0.33, 0.33, 0.22, mat('#1b1b1b'), x, 0.33, z, 16); w.rotation.x = Math.PI / 2; }
  gt.traverse(o => { o.userData.taxi = true; });
}
// Les petites lumières des villas et des vitrines sont rassemblées au niveau de la rue pour s'allumer le soir.
function collectLamps(g) {
  g.userData.lamps = g.userData.lamps || [];
  g.traverse(o => { if (o !== g && o.userData.lamps) { g.userData.lamps.push(...o.userData.lamps); o.userData.lamps = null; } });
}

// ---------- La corniche ----------
// Un parasol de plage avec sa serviette : on le touche pour s'allonger au soleil.
function parasolPlage(g, p) {
  const cols = { creme: null, bleu: '#2f4f7a', rouge: '#c8102e' }, x = p.x + 0.5, z = p.z + 0.5;
  const grp = new THREE.Group(); g.add(grp);
  cyl(grp, 0.03, 0.03, 2.2, iron(), x, 1.1, z, 8);
  cyl(grp, 0, 1.3, 0.5, cols[p.c] ? mat(cols[p.c], { side: THREE.DoubleSide }) : storeMat('creme', 3), x, 2.4, z, 8);
  box(grp, 0.9, 0.03, 1.7, mat(['#f2ede3', '#e0a526', '#2e6b57', '#c2185b'][(p.x + p.z) % 4]), x, 0.015, z + 1);
  sph(grp, 0.18, mat('#2f4f7a'), x + 0.55, 0.16, z + 0.3);
  grp.traverse(o => { o.userData.plage = 'bronzer'; o.userData.px = p.x; o.userData.pz = p.z; });
}
// La tour du maître-nageur : pieds en bois, plate-forme, toit rouge et blanc, planches de surf appuyées dessous.
function tourSauvetage(g, x, z) {
  const bois = mat('#b08a5a');
  for (const [dx, dz] of [[0.3, 0.3], [1.7, 0.3], [0.3, 1.7], [1.7, 1.7]]) box(g, 0.14, 2.6, 0.14, bois, x + dx, 1.3, z + dz);
  box(g, 2.2, 0.12, 2.2, bois, x + 1, 2.6, z + 1);
  for (const [dx, dz, w, d] of [[1, 0.1, 2.2, 0.06], [1, 1.9, 2.2, 0.06], [0.1, 1, 0.06, 2.2], [1.9, 1, 0.06, 2.2]]) box(g, w, 0.9, d, mat('#f7f4ee'), x + dx, 3.1, z + dz);
  for (const [dx, dz] of [[0.3, 0.3], [1.7, 0.3], [0.3, 1.7], [1.7, 1.7]]) box(g, 0.08, 1.6, 0.08, bois, x + dx, 4.2, z + dz);
  box(g, 2.6, 0.1, 2.6, mat('#c8102e'), x + 1, 5.05, z + 1);
  box(g, 2.6, 0.1, 1.3, mat('#f7f4ee'), x + 1, 5.06, z + 0.35);
  for (let i = 0; i < 5; i++) box(g, 0.5, 0.04, 0.04, bois, x - 0.1, 0.4 + i * 0.5, z + 1);
  for (let i = 0; i < 2; i++) { const s = box(g, 0.45, 2, 0.06, mat(i ? '#e0a526' : '#2f4f7a'), x + 2.4 + i * 0.5, 1, z + 0.4); s.rotation.x = -0.35; }
}
// Un but de foot en tubes blancs, ouvert vers +x ou -x.
function butFoot(g, b) {
  const t = mat('#f7f4ee');
  for (const dz of [-1, 2]) cyl(g, 0.04, 0.04, 1.8, t, b.x + 0.5, 0.9, b.z + dz, 8);
  const bar = cyl(g, 0.04, 0.04, 3, t, b.x + 0.5, 1.8, b.z + 0.5, 8); bar.rotation.x = Math.PI / 2;
}
// La plage : le muret de la promenade et ses escaliers, le sable, les parasols, le terrain de foot, la tour, l'eau, les rochers et le phare.
function plage(g) {
  const P = PLAGE, len = X1 - X0 + 120, cx = (X0 + X1) / 2;
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(len, P.eau - P.z0 + 2), mat('#ecd7a6', { roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(cx, 0.003, (P.z0 + P.eau) / 2 + 1); sand.receiveShadow = true; g.add(sand);
  // Le muret blanc, ouvert aux escaliers.
  const ouvert = x => P.escaliers.some(([a, b]) => x >= a && x < b);
  for (let x = X0 - 60; x < X1 + 60; x++) if (!ouvert(x)) box(g, 1.02, 0.9, 0.3, mat('#f7f4ee'), x + 0.5, 0.45, P.muret + 0.15);
  for (const [a, b] of P.escaliers) for (let i = 0; i < 3; i++) box(g, b - a, 0.06, 0.4, dallageChic(2, 0.3), (a + b) / 2, 0.03 + i * 0.0, P.muret + 0.2 + i * 0.4);
  // Le sable un peu plus foncé là où l'on joue, et les lignes du terrain.
  const F = P.foot, pitch = new THREE.Mesh(new THREE.PlaneGeometry(F.x1 - F.x0, F.z1 - F.z0), mat('#e2c993', { roughness: 1 }));
  pitch.rotation.x = -Math.PI / 2; pitch.position.set((F.x0 + F.x1) / 2, 0.006, (F.z0 + F.z1) / 2); pitch.userData.plage = 'foot'; g.add(pitch);
  for (const [w, d, x, z] of [[F.x1 - F.x0, 0.08, (F.x0 + F.x1) / 2, F.z0], [F.x1 - F.x0, 0.08, (F.x0 + F.x1) / 2, F.z1], [0.08, F.z1 - F.z0, F.x0, (F.z0 + F.z1) / 2], [0.08, F.z1 - F.z0, F.x1, (F.z0 + F.z1) / 2], [0.08, F.z1 - F.z0, (F.x0 + F.x1) / 2, (F.z0 + F.z1) / 2]]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat('#f7f4ee')); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.009, z); l.userData.plage = 'foot'; g.add(l);
  }
  for (const b of P.buts) butFoot(g, b);
  sph(g, 0.16, mat('#f7f4ee'), (F.x0 + F.x1) / 2 + 1.5, 0.16, (F.z0 + F.z1) / 2 - 0.8);
  for (const p of P.parasols) parasolPlage(g, p);
  tourSauvetage(g, P.tour.x, P.tour.z);
  // Quelques seaux, sacs et ballons oubliés sur le sable.
  for (let i = 0; i < 8; i++) sph(g, 0.14, mat(['#c8102e', '#e0a526', '#2f4f7a', '#2e6b57'][i % 4]), X0 + 3 + i * 6.3, 0.13, P.z0 + 2 + (i * 5) % 9);
  // L'eau : turquoise près du bord, plus sombre au large, une ligne d'écume, et des vagues.
  const eau = m => { const w = new THREE.Mesh(new THREE.PlaneGeometry(len + 200, 1), m); w.rotation.x = -Math.PI / 2; w.userData.plage = 'bain'; g.add(w); return w; };
  const shallow = eau(new THREE.MeshStandardMaterial({ color: '#5cc3d6', roughness: 0.25, metalness: 0.1 })); shallow.scale.y = 6; shallow.position.set(cx, 0.012, P.eau + 3);
  const deep = eau(new THREE.MeshStandardMaterial({ color: '#2a86bd', roughness: 0.2, metalness: 0.15 })); deep.scale.y = 110; deep.position.set(cx, 0.011, P.eau + 6 + 55);
  const foam = eau(mat('#eaf7fb')); foam.scale.y = 0.7; foam.position.set(cx, 0.02, P.eau + 0.3);
  for (let i = 0; i < 24; i++) { const v = eau(mat('#eaf7fb')); v.scale.set(0.02 + (i % 4) * 0.012, 0.25, 1); v.position.set(X0 - 50 + i * 7 + (i % 3) * 2, 0.02, P.eau + 3 + (i % 5) * 1.4); }
  // La jetée de rochers à gauche, et son phare ; des rochers dans l'eau à droite.
  const roc = mat('#6e6458', { roughness: 1 });
  for (let i = 0; i < 12; i++) { const s = 1.4 + (i % 3) * 0.6; box(g, s * 2.2, s * 0.9, s * 1.6, roc, X0 - 12 - (i % 2) * 3, s * 0.35, P.z0 + 9 + i * 1.6).rotation.y = i * 0.5; }
  box(g, 10, 1.6, 9, roc, X0 - 13, 0.8, P.eau + 1);
  const phare = new THREE.Group(); phare.position.set(X0 - 13, 1.6, P.eau + 1); g.add(phare);
  box(phare, 5, 1.2, 5, mat('#f7f4ee'), 0, 0.6, 0);
  cyl(phare, 1.2, 1.8, 17, mat('#f7f4ee'), 0, 9.5, 0, 12);
  for (const y of [5, 10.5] ) cyl(phare, 1.6, 1.6, 0.4, mat('#1f232a'), 0, y, 0, 12);
  cyl(phare, 1.8, 1.8, 0.5, mat('#1f232a'), 0, 18, 0, 12);
  cyl(phare, 1, 1, 1.8, GLASS(), 0, 19.1, 0, 12);
  cyl(phare, 0, 1.3, 1.1, mat('#2a2f36'), 0, 20.5, 0, 12);
  for (let i = 0; i < 7; i++) { const s = 1 + (i % 3) * 0.7; box(g, s * 2, s * 0.8, s * 1.4, roc, X1 + 10 + i * 4, s * 0.25, P.eau + 2 + (i % 2) * 4).rotation.y = i * 0.7; }
  // Au loin à gauche, la ville sur sa colline : des immeubles blancs et des palmiers.
  const col = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), mat('#d8ccb0')); col.rotation.x = -Math.PI / 2; col.position.set(X0 - 70, 0.004, P.z0 + 25); g.add(col);
  for (let i = 0; i < 10; i++) {
    const x = X0 - 100 + i * 8 + (i % 3) * 2, h = 8 + (i * 7) % 14, w = 6 + (i % 3) * 2, z = P.z0 + 4 + (i % 4) * 9;
    box(g, w, h, w, mat(i % 2 ? '#f1ece2' : '#e7e0d0'), x, h / 2, z);
    box(g, w + 0.4, 0.3, w + 0.4, mat('#d9d2c2'), x, h + 0.1, z);
    palm(g, x + w / 2 + 1.5, z + w / 2 + 1);
  }
  // Deux petites barques au large.
  for (const [x, z] of [[-6, P.eau + 14], [26, P.eau + 20]]) { box(g, 2.4, 0.5, 1, mat('#2f4f7a'), x, 0.3, z); box(g, 2.2, 0.08, 0.8, mat('#d9d2c2'), x, 0.56, z); }
}
function cornicheStreet(g, opts, plane) {
  // Notre côté : des villas, un glacier, un restaurant à pergola, le café de la plage et un lounge.
  villa(g, X0 - 12, -17, D, 2);
  restaurant(g, -17, -9, D + 0.2, 'glacier').rotation.y = Math.PI;
  kiosque(g, -9, 0);
  restaurant(g, W, 24, D + 0.2, 'cafe', { terrasse: false }).rotation.y = Math.PI;
  restaurant(g, 24, 32, D + 0.2, 'lounge', { terrasse: false }).rotation.y = Math.PI;
  villa(g, 32, X1 + 12, D, 5);
  cafeChic(g);
  arretTaxi(g);
  // La promenade : lampadaires, palmiers, bancs face à la mer, jardinières.
  for (const l of RUE.lampes) lampadaire(g, l.x + 0.5, l.z + 0.5);
  for (const p of RUE.palmiers) palm(g, p.x + 0.5, p.z + 0.5);
  for (let x = X0 - 40; x < X1 + 40; x += 8) { if (x < X0 || x >= X1) { palm(g, x, D + 12.5); lampadaire(g, x + 4, D + 12.5); } }
  for (let x = X0 - 10; x < X1 + 12; x += 5) if (x < 5 || x > 13) jardiniere(g, x, D + 2.55, x % 2 === 0);
  bench(g, RUE.banc.x + 1, RUE.banc.z + 0.5, 0); bench(g, -12, D + 12.5, 0); bench(g, 4, D + 12.5, 0);
  suv(g, RUE.taxi.x, RUE.taxi.z, '#1b1b1b');
  voitureBlanche(g, -2, D + 9.2);
  plage(g);
  collectLamps(g);
  return g;
}

// ---------- Les commerces ----------
// La boucherie : store rouge et blanc, porte, vitrine avec les pièces suspendues et le billot.
function boucherie(g, B) {
  awning(g, B.x0, B.x1, D, 1.2, 2.75, T.rayures('#c8102e', '#f2ede3'));
  box(g, B.x1 - B.x0 - 0.4, 0.45, 0.08, mat('#8f1d22'), (B.x0 + B.x1) / 2, 3.25, D + 0.04);
  box(g, B.x1 - B.x0 - 0.3, 0.05, 0.1, BRASS(), (B.x0 + B.x1) / 2, 3.5, D + 0.04);
  door(g, B.porte, D, '#8f1d22', 1.2, 'hanout:boucher', false);
  const vit = new THREE.Group(); g.add(vit);
  box(vit, 2.6, 1.4, 0.06, mat('#3a3d44', { roughness: 0.3 }), B.porte + 2.3, 1.55, D + 0.03);
  box(vit, 2.6, 0.12, 0.3, mat('#f8f3e8'), B.porte + 2.3, 0.85, D + 0.12);
  for (let i = 0; i < 4; i++) { cyl(vit, 0.08, 0.1, 0.5, mat(i % 2 ? '#c94a4a' : '#e38b8b'), B.porte + 1.4 + i * 0.6, 1.85, D + 0.07, 8); box(vit, 0.02, 0.3, 0.02, iron(), B.porte + 1.4 + i * 0.6, 2.2, D + 0.07); }
  for (let i = 0; i < 5; i++) box(vit, 0.3, 0.12, 0.2, mat(i % 2 ? '#d85a5a' : '#f0a0a0'), B.porte + 1.3 + i * 0.5, 0.98, D + 0.14);
  vit.traverse(o => { o.userData.hanout = 'boucher'; });
  cyl(g, 0.3, 0.3, 0.5, mat('#8a6a48'), B.porte - 1.5, 0.25, D + 0.5, 12);
  wallLantern(g, B.porte + 0.5, 2.9, D);
}
// Le supermarché d'Anfa : grande vitrine, bandeau orange, portes vitrées, chariots et rayon de fruits derrière la vitre.
function supermarche(g, x0, x1) {
  const w = x1 - x0, cx = (x0 + x1) / 2, H = RUE.hanout;
  box(g, w, 4.8, 9, murVilla(2, 1), cx, 2.4, D - 4.5);
  box(g, w + 0.4, 0.22, 9.4, mat('#e9e2d3'), cx, 4.91, D - 4.5);
  box(g, w - 0.2, 0.7, 0.1, mat('#e8641a'), cx, 3.6, D + 0.06);
  box(g, w - 0.2, 0.05, 0.14, mat('#f7f4ee'), cx, 3.25, D + 0.07);
  const vit = new THREE.Group(); g.add(vit);
  box(vit, w - 0.6, 2.6, 0.06, new THREE.MeshStandardMaterial({ color: '#34414f', emissive: '#ffe3b0', emissiveIntensity: 0.18, roughness: 0.15, metalness: 0.2 }), cx, 1.55, D + 0.04);
  for (let i = 0; i <= 4; i++) box(vit, 0.08, 2.6, 0.12, mat('#1f232a'), x0 + 0.3 + i * (w - 0.6) / 4, 1.55, D + 0.05);
  box(vit, 2.6, 0.09, 0.12, mat('#1f232a'), H.porte + 0.5, 2.7, D + 0.06);
  box(vit, 1.2, 2.3, 0.05, mat('#1f232a', { roughness: 0.2 }), H.porte + 0.5, 1.2, D + 0.08);
  box(vit, 0.04, 2.3, 0.08, mat('#f7f4ee'), H.porte + 0.5, 1.2, D + 0.1);
  // Les rayons derrière la vitre.
  for (let i = 0; i < 3; i++) {
    box(vit, w - 1.4, 0.04, 0.5, mat('#d9d2c2'), cx, 0.7 + i * 0.65, D - 0.5);
    for (let j = 0; j < 8; j++) box(vit, 0.35, 0.45, 0.3, mat(['#e8641a', '#c8102e', '#2e6b57', '#e0a526', '#2f4f7a', '#f2ede3'][(i + j) % 6]), x0 + 1 + j * (w - 2) / 7, 0.95 + i * 0.65, D - 0.5);
  }
  vit.traverse(o => { o.userData.hanout = 'supermarche'; });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Group(); c.position.set(x1 - 0.8, 0, D + 0.8 + i * 0.5); g.add(c);
    box(c, 0.5, 0.45, 0.7, mat('#9aa3ad', { metalness: 0.5, roughness: 0.4 }), 0, 0.6, 0);
    box(c, 0.5, 0.04, 0.04, mat('#c8102e'), 0, 0.95, -0.35);
    for (const [dx, dz] of [[-0.2, 0.3], [0.2, 0.3], [-0.2, -0.3], [0.2, -0.3]]) sph(c, 0.05, mat('#1b1b1b'), dx, 0.06, dz);
  }
  lampadaire(g, x0 + 0.6, D + 2.5, 3.6);
}
// Le kiosque de la plage : façade blanche, store bleu, frigo à boissons et jouets de plage devant.
function kiosque(g, x0, x1) {
  const w = x1 - x0, cx = (x0 + x1) / 2, H = RUE.hanout;
  box(g, w, 4.2, 9, murVilla(2, 1), cx, 2.1, D - 4.5);
  box(g, w + 0.4, 0.22, 9.4, mat('#e9e2d3'), cx, 4.31, D - 4.5);
  awning(g, x0 + 0.4, x1 - 0.4, D, 1.4, 2.9, T.rayures('#2f4f7a', '#f2ede3'));
  door(g, H.porte, D, '#2f4f7a', 1.2, 'hanout:kiosque', false);
  const vit = new THREE.Group(); g.add(vit);
  box(vit, 1.4, 1.9, 0.6, mat('#2f6fb3'), H.porte - 1.6, 0.95, D + 0.35);
  box(vit, 1.2, 1.5, 0.05, new THREE.MeshStandardMaterial({ color: '#cde9f7', emissive: '#bfe6ff', emissiveIntensity: 0.3, roughness: 0.1 }), H.porte - 1.6, 1.05, D + 0.06);
  for (let i = 0; i < 6; i++) cyl(vit, 0.06, 0.06, 0.25, mat(['#e8641a', '#2e6b57', '#c8102e', '#e0a526', '#2f4f7a', '#f2ede3'][i]), H.porte - 2.05 + (i % 3) * 0.45, 0.6 + Math.floor(i / 3) * 0.6, D + 0.12, 8);
  box(vit, 1.6, 1.3, 0.06, mat('#3a3d44', { roughness: 0.3 }), H.porte + 2.4, 1.55, D + 0.03);
  for (let i = 0; i < 5; i++) sph(vit, 0.16, mat(['#c8102e', '#e0a526', '#2f4f7a', '#2e6b57', '#c2185b'][i]), H.porte + 1.8 + i * 0.3, 1.3 + (i % 2) * 0.4, D + 0.1);
  vit.traverse(o => { o.userData.hanout = 'kiosque'; });
  for (const dx of [-0.6, 0.6]) { const b = box(g, 0.08, 1.8, 0.08, mat('#f7f4ee'), x1 - 1.2 + dx, 0.9, D + 0.6); const p = box(g, 0.45, 1.4, 0.06, mat(dx < 0 ? '#e0a526' : '#2f4f7a'), x1 - 1.2 + dx, 0.9, D + 0.66); p.rotation.x = -0.25; }
  parasol(g, x0 + 1, D + 1.2, 2.3, 1.1);
  jardiniere(g, x1 - 0.6, D + 2.5, true);
}
