// Textures dessinées à la volée (zellige, carrelage, tapis…), sans fichier image.
import * as THREE from 'three';

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

export function carrelage() {
  return make('carrelage', 256, (g, s) => {
    const r = rng(3);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const v = 226 + Math.floor(r() * 12);
      g.fillStyle = `rgb(${v},${v - 12},${v - 32})`; g.fillRect(i * s / 2, j * s / 2, s / 2, s / 2);
    }
    g.strokeStyle = '#b9a98c'; g.lineWidth = 4;
    g.strokeRect(0, 0, s, s); g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
  });
}
export function terreCuite() {
  return make('terre', 256, (g, s) => {
    const r = rng(7), n = 4, st = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = Math.floor(r() * 26);
      g.fillStyle = `rgb(${178 + v},${92 + v / 2},${58 + v / 3})`; g.fillRect(i * st, j * st, st, st);
    }
    g.strokeStyle = '#d9c7ad'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * st, 0); g.lineTo(i * st, s); g.moveTo(0, i * st); g.lineTo(s, i * st); g.stroke(); }
  });
}
export function parquet() {
  return make('parquet', 256, (g, s) => {
    const r = rng(11), rows = 6, h = s / rows;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 120;
      while (x < s) {
        const w = 90 + r() * 80, v = Math.floor(r() * 30);
        g.fillStyle = `rgb(${150 + v},${100 + v * 0.7},${62 + v * 0.4})`; g.fillRect(x, j * h, w, h);
        g.fillStyle = 'rgba(60,35,20,0.5)'; g.fillRect(x, j * h, 2, h);
        x += w;
      }
      g.fillStyle = 'rgba(60,35,20,0.5)'; g.fillRect(0, j * h, s, 2);
    }
  });
}
export function marbre() {
  return make('marbre', 256, (g, s) => {
    const r = rng(5);
    g.fillStyle = '#f1efea'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(120,120,130,0.25)';
    for (let i = 0; i < 7; i++) {
      g.lineWidth = 1 + r() * 2; g.beginPath();
      let x = r() * s, y = 0; g.moveTo(x, y);
      while (y < s) { x += (r() - 0.5) * 40; y += 20 + r() * 20; g.lineTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = 'rgba(150,140,130,0.5)'; g.lineWidth = 2; g.strokeRect(0, 0, s, s);
  });
}
export function floorTex(type) {
  switch (type) {
    case 'zellige_vert': return zellige('#1f6b4f', '#d9a43a');
    case 'zellige_bleu': return zellige('#24508f', '#e2b54a');
    case 'parquet': return parquet();
    case 'terre': return terreCuite();
    case 'marbre': return marbre();
    default: return carrelage();
  }
}

// Tapis berbère (style Beni Ouarain) : fond crème et losanges sombres.
export function tapis() {
  return make('tapis', 256, (g, s) => {
    const r = rng(9);
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(160,140,110,${r() * 0.25})`; g.fillRect(r() * s, r() * s, 2, 2); }
    g.strokeStyle = '#3b2e26'; g.lineWidth = 7; g.lineCap = 'round';
    const k = s / 3;
    for (let i = -3; i <= 6; i++) {
      g.beginPath(); g.moveTo(i * k, 0); g.lineTo(i * k + s, s); g.stroke();
      g.beginPath(); g.moveTo(i * k, s); g.lineTo(i * k + s, 0); g.stroke();
    }
    g.strokeStyle = '#3b2e26'; g.lineWidth = 10; g.strokeRect(12, 12, s - 24, s - 24);
  });
}
// Tissu rayé des banquettes et couvertures.
export function tissu(base, gold) {
  return make('t' + base + gold, 128, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    g.fillStyle = gold;
    for (let y = 8; y < s; y += 32) { g.fillRect(0, y, s, 4); g.fillRect(0, y + 8, s, 2); }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < s; x += 16) for (let y = 20; y < s; y += 32) { diamond(g, x + 8, y, 4); g.fill(); }
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
