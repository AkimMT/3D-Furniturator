import * as THREE from 'three';
import { getFinish, getCushionColor } from './config';

/* ---------- helpers ---------- */

const hash = (str) => {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 2147483646) + 1;
};
const rng = (seed) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const makeCanvas = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

/* ---------- procedural wood ---------- */
// Generated in code so the demo needs no image files.
// Later you can replace this with real photographed textures.

const woodCanvasCache = new Map();
export function woodCanvas(finish) {
  if (woodCanvasCache.has(finish.id)) return woodCanvasCache.get(finish.id);
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const rand = rng(hash(finish.id));

  ctx.fillStyle = finish.base;
  ctx.fillRect(0, 0, size, size);

  // broad tonal bands
  for (let i = 0; i < 14; i++) {
    const x = rand() * size;
    const w = 20 + rand() * 60;
    ctx.globalAlpha = 0.05 + rand() * 0.08;
    ctx.fillStyle = rand() > 0.5 ? finish.grain : '#ffffff';
    for (const dx of [-size, 0, size]) ctx.fillRect(x + dx, 0, w, size);
  }

  // fine wavy grain lines (tileable vertically and horizontally)
  ctx.strokeStyle = finish.grain;
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x0 = rand() * size;
    const cycles = 1 + Math.floor(rand() * 3);
    const amp = 1 + rand() * 7;
    const phase = rand() * Math.PI * 2;
    ctx.globalAlpha = 0.05 + rand() * 0.25;
    ctx.lineWidth = 0.5 + rand() * 1.8;
    for (const dx of [-size, 0, size]) {
      ctx.beginPath();
      for (let y = 0; y <= size; y += 8) {
        const x = x0 + dx + Math.sin((y / size) * cycles * Math.PI * 2 + phase) * amp;
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  woodCanvasCache.set(finish.id, c);
  return c;
}

const swatchCache = new Map();
export function woodSwatchURL(finish) {
  if (!swatchCache.has(finish.id)) swatchCache.set(finish.id, woodCanvas(finish).toDataURL('image/jpeg', 0.8));
  return swatchCache.get(finish.id);
}

const woodTexCache = new Map();
function woodTexture(finish, alongLength) {
  const key = `${finish.id}:${alongLength ? 'h' : 'v'}`;
  if (woodTexCache.has(key)) return woodTexCache.get(key);
  const t = new THREE.CanvasTexture(woodCanvas(finish));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (alongLength) {
    // for horizontal rails: turn the grain 90 degrees
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
    t.repeat.set(1, 0.35);
  } else {
    t.repeat.set(0.35, 1);
  }
  woodTexCache.set(key, t);
  return t;
}

/** hex colour of a finish, used for UI dots and the exported spec sheet */
export function finishedHex(finishId) {
  return getFinish(finishId).base;
}

/**
 * @param horizontal true for rails that run sideways (grain follows their length)
 */
export function makeWoodMaterial(finishId, horizontal = false, doubleSide = false) {
  const finish = getFinish(finishId);
  return new THREE.MeshStandardMaterial({
    map: woodTexture(finish, horizontal),
    roughness: 0.58,
    metalness: 0,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

/* ---------- upholstery ---------- */
// UVs on the seat pad are ~ metres * 2.3, so "repeat" below is per ~43 cm.

function noiseTexture({ size = 256, dots = 2000, minR = 1, maxR = 3, seed = 7, repeat = 6 }) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const rand = rng(seed);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) {
    const v = Math.floor(60 + rand() * 140);
    ctx.fillStyle = `rgba(${v},${v},${v},0.55)`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, minR + rand() * (maxR - minR), 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

// plain-weave pattern, like the fabric on the real seat
function weaveTexture({ base = 128, contrast, srgb, repeat }) {
  const c = makeCanvas(32);
  const ctx = c.getContext('2d');
  const hi = Math.min(255, Math.round(base + contrast));
  const lo = Math.max(0, Math.round(base - contrast));
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, 32, 32);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const warpOver = (x + y) % 2 === 0;
      const v = warpOver ? hi : lo;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x * 4, y * 4, 4, 4);
      const v2 = warpOver ? Math.min(255, hi + contrast * 0.2) : Math.max(0, lo - contrast * 0.15);
      ctx.fillStyle = `rgb(${v2},${v2},${v2})`;
      if (warpOver) ctx.fillRect(x * 4 + 1, y * 4, 2, 4);
      else ctx.fillRect(x * 4, y * 4 + 1, 4, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let leatherBump;

/** The cushion (and upholstered back pad) is always leather now -- just pick the colour. */
export function makeCushionMaterial(colorId) {
  const color = new THREE.Color(getCushionColor(colorId).hex);
  leatherBump ||= noiseTexture({ dots: 3500, minR: 0.6, maxR: 1.6, seed: 23, repeat: 10 });
  return new THREE.MeshStandardMaterial({
    color, bumpMap: leatherBump, bumpScale: 0.6, roughness: 0.42, envMapIntensity: 1.3,
  });
}
