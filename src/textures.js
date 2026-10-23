// Textures : images fournies (dossier assets/) et motifs dessinés à la volée en attendant qu'elles chargent.
import * as THREE from 'three';
import { IMG, asset } from './data.js';

const cache = {};
function make(key, size, draw) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return (cache[key] = t);
}
// Petit générateur pseudo-aléatoire, pour que les motifs soient toujours les mêmes.
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

// Image fournie, rognée de ses bords blancs, en 512 px. Le canvas est d'abord rempli d'une couleur unie.
export function imgTex(name, fill = '#d9cdb6', size = 512, rx = 1, ry = 1) {
  const key = 'img:' + name + ':' + rx + 'x' + ry;
  if (cache[key]) return cache[key];
  const t = make(key, size, (g, s) => { g.fillStyle = fill; g.fillRect(0, 0, s, s); });
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.repeat.set(rx, ry);
  const im = new Image();
  im.onload = () => {
    const [l, tp, r, b] = (IMG[name] && IMG[name].crop) || [0, 0, 0, 0];
    const sx = im.width * l, sy = im.height * tp, sw = im.width * (1 - l - r), sh = im.height * (1 - tp - b);
    t.image.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, size, size);
    t.needsUpdate = true;
  };
  im.src = asset(name);
  return t;
}

function star(g, cx, cy, r, inner = 0.72) {
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8 + Math.PI / 8, rr = i % 2 ? r * inner : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}
function diamond(g, cx, cy, r) {
  g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath();
}

export function zellige(main, accent, bg = '#f4efe3') {
  return make('z' + main + accent + bg, 256, (g, s) => {
    g.fillStyle = bg; g.fillRect(0, 0, s, s);
    const step = s / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const cx = (i + 0.5) * step, cy = (j + 0.5) * step;
      g.fillStyle = main; star(g, cx, cy, step * 0.44); g.fill();
      g.fillStyle = bg; star(g, cx, cy, step * 0.24); g.fill();
      g.fillStyle = accent; star(g, cx, cy, step * 0.15); g.fill();
    }
    g.fillStyle = accent;
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) { diamond(g, i * step, j * step, step * 0.16); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { star(g, (i + 0.5) * step, (j + 0.5) * step, step * 0.44); g.stroke(); }
  });
}
// Carreaux de ciment : un motif à quatre pétales, comme dans les maisons de la médina.
export function ciment(a, b, bg = '#efe6d2') {
  return make('cim' + a + b + bg, 256, (g, s) => {
    g.fillStyle = bg; g.fillRect(0, 0, s, s);
    const h = s / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const cx = i * h + h / 2, cy = j * h + h / 2;
      g.fillStyle = a;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { g.beginPath(); g.ellipse(cx + dx * h * 0.22, cy + dy * h * 0.22, h * 0.17, h * 0.26, dx ? Math.PI / 2 : 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = b; g.beginPath(); g.arc(cx, cy, h * 0.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = b; for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.arc(cx + dx * h * 0.5, cy + dy * h * 0.5, h * 0.11, 0, Math.PI * 2); g.fill(); }
    }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(h, 0); g.lineTo(h, s); g.moveTo(0, h); g.lineTo(s, h); g.stroke();
  });
}
// Bejmat : petites briques de terre cuite, posées en quinconce.
export function bejmat() {
  return make('bejmat', 256, (g, s) => {
    const r = rng(77), bw = s / 4, bh = s / 8;
    g.fillStyle = '#9a6a4a'; g.fillRect(0, 0, s, s);
    for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) {
      const v = r(); g.fillStyle = `rgb(${190 + Math.floor(v * 30)},${120 + Math.floor(v * 25)},${85 + Math.floor(v * 20)})`;
      g.fillRect(i * bw + (j % 2) * bw / 2 + 2, j * bh + 2, bw - 4, bh - 4);
    }
  });
}
// Un tableau : la corniche au coucher du soleil, en quelques aplats.
export function peinture() {
  return make('peinture', 256, (g, s) => {
    const sky = g.createLinearGradient(0, 0, 0, s * 0.55); sky.addColorStop(0, '#f2a65a'); sky.addColorStop(1, '#f7d9a8');
    g.fillStyle = sky; g.fillRect(0, 0, s, s * 0.55);
    g.fillStyle = '#f6c15a'; g.beginPath(); g.arc(s * 0.68, s * 0.42, s * 0.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2d8fc4'; g.fillRect(0, s * 0.55, s, s * 0.25);
    g.fillStyle = '#eadcb4'; g.fillRect(0, s * 0.8, s, s * 0.2);
    g.fillStyle = '#4b3a2a'; g.fillRect(s * 0.2, s * 0.3, s * 0.03, s * 0.55);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(s * 0.21 + Math.cos(i) * s * 0.08, s * 0.3 + Math.sin(i) * s * 0.05, s * 0.11, s * 0.03, i, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#f7f4ee'; g.fillRect(s * 0.86, s * 0.38, s * 0.03, s * 0.2);
  });
}
export const floorSwatch = type => floorTex(type).image.toDataURL();
export function floorTex(type) {
  switch (type) {
    case 'zellige_vert': return imgTex('sol-zellige-vert', '#5f8f78');
    case 'zellige_bleu': return imgTex('sol-zellige-bleu', '#5a7aa8');
    case 'parquet': return imgTex('sol-parquet', '#b07a4c');
    case 'terre': return imgTex('sol-terre-cuite', '#c48a5e');
    case 'marbre': return imgTex('sol-marbre', '#efece6');
    case 'ciment': return ciment('#2f4f7a', '#c99a3a');
    case 'bejmat': return bejmat();
    case 'zellige_rouge': return zellige('#9b2d2d', '#c99a3a');
    default: return imgTex('sol-carrelage-beige', '#e3d6bd');
  }
}
export const tadelakt = () => imgTex('mur-tadelakt', '#f1ece2');
export const tissuBanquette = () => imgTex('tissu-banquette', '#8a1f28');
export const tapisBerbere = () => imgTex('tapis-berbere', '#efe6d2');

// Tissu rayé des couvertures.
export function tissu(base, gold) {
  return make('t' + base + gold, 128, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    g.fillStyle = gold;
    for (let y = 8; y < s; y += 32) { g.fillRect(0, y, s, 4); g.fillRect(0, y + 8, s, 2); }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < s; x += 16) for (let y = 20; y < s; y += 32) { diamond(g, x + 8, y, 4); g.fill(); }
  });
}
// Toile rayée des stores de café et de hanout.
export function rayures(a, b) {
  return make('r' + a + b, 128, (g, s) => {
    for (let x = 0; x < s; x += 32) { g.fillStyle = a; g.fillRect(x, 0, 16, s); g.fillStyle = b; g.fillRect(x + 16, 0, 16, s); }
  });
}
// Moucharabieh : claustra de bois ajouré devant une fenêtre (transparent entre les lattes).
export function moucharabieh() {
  return make('mouch', 128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = '#5a3423'; g.lineWidth = 5;
    const k = s / 4;
    for (let i = -4; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * k, 0); g.lineTo(i * k + s, s); g.stroke();
      g.beginPath(); g.moveTo(i * k, s); g.lineTo(i * k + s, 0); g.stroke();
    }
    g.lineWidth = 8; g.strokeRect(0, 0, s, s);
  });
}
// Dallage de trottoir en pierre beige.
export function dallage() {
  return make('dallage', 128, (g, s) => {
    const r = rng(21);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const v = 214 + Math.floor(r() * 14);
      g.fillStyle = `rgb(${v},${v - 10},${v - 34})`; g.fillRect(i * s / 2, j * s / 2, s / 2, s / 2);
    }
    g.strokeStyle = '#b8a888'; g.lineWidth = 3;
    g.strokeRect(0, 0, s, s); g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
  });
}
export function asphalte() {
  return make('asphalte', 128, (g, s) => {
    const r = rng(13);
    g.fillStyle = '#4b4b50'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { const v = 60 + Math.floor(r() * 40); g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(r() * s, r() * s, 1.5, 1.5); }
  });
}
export function trottoir() {
  return make('trottoir', 128, (g, s) => {
    g.fillStyle = '#cfc7b8'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#a99f8e'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
    g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.stroke();
  });
}
