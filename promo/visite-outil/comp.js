// Compositor: render(t) is a pure function of time -> 1920x1080 canvas.
(function () {
const W = 1920, H = 1080, FPS = 30;
const S0 = 0.84, CW = 1600 * S0, CH = 900 * S0, BH = 44;
const X0 = (W - CW) / 2, Y0 = 66, CT = Y0 + BH;           // window position at rest
const C = { x: W / 2, y: CT + CH / 2 };
const GREEN = '#0e9f6e', GREEN_D = '#087a53', INK = '#0f172a', GREY = '#5b6472';

const T_HOOK = 2.6, T_REC = 11.5, REC_IN = 0.9, REC_OUT = 0.7, OUTRO = 7.6;
const V_INTRO = [['v01', 2.7], ['v02', 4.8]], V_OUTRO = ['v13', 0.4];

const CAPTIONS = {
  home: 'Cherchez une donnée en un mot',
  catalog: 'Un catalogue classé par thème',
  fiche: 'Une fiche claire pour chaque donnée',
  map: 'Visualisez-la sur une carte',
  download: 'Téléchargez en CSV, Excel, JSON ou GeoJSON',
  api: 'Ou branchez-vous directement sur l’API',
  preview: 'Aperçu des lignes et des colonnes',
  licence: 'Source et licence toujours indiquées',
  lang: 'En français, en anglais et en arabe',
  dark: 'Mode sombre… ou clair',
};
const URLS = { home: 'data-dz.com', catalog: 'data-dz.com/?q=gare#catalog', fiche: 'data-dz.com/datasets/ferroviaire' };

let LOG, N, NO, M, OUT, camF = [], caps = [], urlAt = [], logo, canvas, ctx;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eout = t => 1 - Math.pow(1 - t, 3);
const backOut = t => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const prog = (t, a, d) => clamp((t - a) / d, 0, 1);

async function init() {
  canvas = document.getElementById('c'); ctx = canvas.getContext('2d');
  LOG = await (await fetch(window.REC + '/log.json')).json();
  N = LOG.frames.length;
  // drop frames showing the loading skeleton after the catalogue card click
  const fiche = (LOG.marks.find(m => m.name === 'fiche') || { f: -99 }).f;
  const SK = window.SKIP || [0, 0];
  M = []; for (let f = 0; f < N; f++) if (!(f >= SK[0] && f < SK[1])) M.push(f);
  NO = M.length;
  OUT = sf => { let i = M.findIndex(v => v >= sf); return i < 0 ? NO : i; };
  logo = new Image(); logo.src = 'data:image/png;base64,' + window.LOGO; await logo.decode();
  await document.fonts.load('900 40px Cairo'); await document.fonts.load('700 40px Cairo'); await document.fonts.load('800 40px Cairo'); await document.fonts.load('600 40px Cairo');
  // camera per source frame
  let st = { z: 1, x: 800, y: 450 }, tr = null;
  const byF = {}; LOG.cams.forEach(k => byF[k.f] = k);
  for (let f = 0; f < N; f++) {
    if (byF[f]) { const k = byF[f]; tr = { f0: f, from: { ...st }, to: k, n: Math.max(1, k.dur * FPS) }; }
    if (tr) { const u = 0.5 - 0.5 * Math.cos(Math.PI * clamp((f - tr.f0) / tr.n, 0, 1)); st = { z: lerp(tr.from.z, tr.to.z, u), x: lerp(tr.from.x, tr.to.x, u), y: lerp(tr.from.y, tr.to.y, u) }; }
    camF.push({ ...st });
  }
  // captions
  const ms = LOG.marks.filter(m => CAPTIONS[m.name]);
  ms.forEach((m, i) => caps.push({ a: OUT(m.f) / FPS + 0.15, b: (i + 1 < ms.length ? OUT(ms[i + 1].f) / FPS : NO / FPS + 0.3) - 0.1, txt: CAPTIONS[m.name] }));
  urlAt = LOG.marks.filter(m => URLS[m.name]).map(m => ({ f: m.f, u: URLS[m.name] }));
  window.TOTAL = T_REC + NO / FPS + OUTRO - 0.2;
  window.VOICES = [...V_INTRO.map(([v, t]) => ({ v, t })), ...LOG.marks.filter(m => m.voice).map(m => ({ v: m.voice, t: +(T_REC + OUT(m.f) / FPS + m.lead).toFixed(3) })), { v: V_OUTRO[0], t: +(T_REC + NO / FPS - 0.15 + V_OUTRO[1]).toFixed(3) }];
  return window.TOTAL;
}

// ---------- frame cache ----------
const cache = new Map();
function loadFrame(i) {
  i = clamp(i, 0, N - 1);
  if (cache.has(i)) return cache.get(i);
  const img = new Image(); img.src = window.REC + '/frames/' + String(i).padStart(5, '0') + '.jpg';
  const p = img.decode().then(() => img);
  cache.set(i, p);
  if (cache.size > 12) cache.delete(cache.keys().next().value);
  return p;
}

// ---------- drawing helpers ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function font(w, s) { ctx.font = `${w} ${s}px Cairo`; }
// draw a centred line made of [text, color] parts
function line(parts, cx, y, weight, size, alpha = 1, dy = 0, blur = 0) {
  if (alpha <= 0.001) return;
  ctx.save(); ctx.globalAlpha = alpha; if (blur > 0.2) ctx.filter = `blur(${blur}px)`;
  font(weight, size); ctx.textBaseline = 'alphabetic';
  const ws = parts.map(p => ctx.measureText(p[0]).width), tot = ws.reduce((a, b) => a + b, 0);
  let x = cx - tot / 2;
  parts.forEach((p, i) => { ctx.fillStyle = p[1]; ctx.fillText(p[0], x, y + dy); x += ws[i]; });
  ctx.restore();
  return tot;
}
function anim(t, a, d = 0.45, out = Infinity, od = 0.3) {
  const i = eout(prog(t, a, d)), o = 1 - eio(prog(t, out, od));
  return { a: i * o, dy: (1 - i) * 26 - (1 - o) * 14, blur: (1 - i) * 8 + (1 - o) * 8 };
}
function flag(x, y, h) {
  const w = h * 1.5;
  ctx.save(); rr(x, y, w, h, h * 0.12); ctx.clip();
  ctx.fillStyle = '#006233'; ctx.fillRect(x, y, w / 2, h); ctx.fillStyle = '#fff'; ctx.fillRect(x + w / 2, y, w / 2, h);
  const cx = x + w / 2, cy = y + h / 2;
  ctx.fillStyle = '#d21034'; ctx.beginPath(); ctx.arc(cx, cy, h * 0.25, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + h * 0.0625, cy, h * 0.2, 0, 7); ctx.fill();
  ctx.save(); ctx.fillStyle = ctx.fillStyle; ctx.fillStyle = '#d21034'; ctx.beginPath();
  const sx = cx + h * 0.1, R = h * 0.125, r = R * 0.38;
  for (let k = 0; k < 10; k++) { const ang = Math.PI * k / 5 + Math.PI; const rad = k % 2 ? r : R; ctx.lineTo(sx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad); }
  ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
  ctx.save(); rr(x, y, w, h, h * 0.12); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

function background(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#effaf5'); g.addColorStop(1, '#f8fafc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const blob = (x, y, r, col) => { const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); };
  blob(260 + 60 * Math.sin(t * .25), -40 + 30 * Math.cos(t * .3), 950, 'rgba(140,232,190,.55)');
  blob(1150 + 90 * Math.sin(t * .2 + 1), 1130, 720, 'rgba(252,196,204,.42)');
  blob(1960, 520 + 60 * Math.sin(t * .22), 640, 'rgba(178,232,244,.40)');
  // faint grid
  ctx.save(); ctx.strokeStyle = 'rgba(14,90,60,.045)'; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
  ctx.restore();
}

function drawLogo(cx, cy, size, t0, t) {
  const p = prog(t, t0, 0.7); if (p <= 0) return;
  const s = backOut(p) * size, rot = (1 - eout(p)) * -0.5 + Math.sin(t * 1.2) * 0.02;
  ctx.save(); ctx.globalAlpha = eout(Math.min(1, p * 2));
  ctx.translate(cx, cy + Math.sin(t * 1.6) * 4); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(14,159,110,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.drawImage(logo, -s / 2, -s / 2, s, s * logo.height / logo.width);
  ctx.restore();
}

// ---------- scenes ----------
function intro(t) {
  const out = T_HOOK - 0.35;
  ctx.save(); const o = 1 - eio(prog(t, out, 0.35)); ctx.globalAlpha = o;
  ctx.translate(W / 2, H / 2); ctx.scale(1 + (1 - o) * 0.06, 1 + (1 - o) * 0.06); ctx.translate(-W / 2, -H / 2);
  drawLogo(W / 2, 330, 190, 0.15, t);
  let a = anim(t, 0.6, 0.5); line([['data', INK], ['-dz', GREEN]], W / 2, 560, 900, 150, a.a, a.dy, a.blur);
  a = anim(t, 1.0, 0.45); line([['Les données ouvertes sur l’Algérie', '#1f2937']], W / 2, 650, 700, 46, a.a, a.dy, a.blur);
  a = anim(t, 1.3, 0.45); if (a.a > 0) { ctx.save(); ctx.globalAlpha = a.a; flag(W / 2 - 33, 700 + a.dy, 44); ctx.restore(); }
  ctx.restore();
}
function hook(t) {
  if (t < T_HOOK - 0.1 || t > T_REC + 0.6) return;
  const out = T_REC - 0.35;
  let a = anim(t, T_HOOK, 0.4, out); line([['Vous cherchez des données', INK]], W / 2, 330, 800, 66, a.a, a.dy, a.blur);
  a = anim(t, T_HOOK + 0.2, 0.45, out);
  if (a.a > 0) { ctx.save(); ctx.shadowColor = 'rgba(14,159,110,.25)'; ctx.shadowBlur = 30; line([['fiables', GREEN]], W / 2, 500, 900, 170, a.a, a.dy, a.blur); ctx.restore(); }
  a = anim(t, T_HOOK + 0.45, 0.4, out);
  const w = line([['sur l’Algérie ?', INK]], W / 2 + 40, 610, 800, 66, a.a, a.dy, a.blur);
  if (a.a > 0) { ctx.save(); ctx.globalAlpha = a.a; flag(W / 2 + 40 - w / 2 - 82, 568 + a.dy, 44); ctx.restore(); }
  a = anim(t, 6.0, 0.4, out); line([['Éparpillées ? Incomplètes ? Sans source ?', GREY]], W / 2, 720, 600, 36, a.a, a.dy, a.blur);
  a = anim(t, 9.7, 0.4, out); line([['On a la solution.', GREEN_D]], W / 2, 810, 800, 48, a.a, a.dy, a.blur);
}

function sceneTransform(f) {
  const cam = camF[clamp(f, 0, N - 1)], z = cam.z;
  const F = { x: X0 + cam.x * S0, y: CT + cam.y * S0 };
  const k = sstep(1, 1.3, z) * 0.6;
  const G = { x: lerp(F.x, C.x, k), y: lerp(F.y, C.y, k) };
  let tx = G.x - z * F.x, ty = G.y - z * F.y;
  // cover clamp (background always fills)
  tx = clamp(tx, W - W * z, 0); ty = clamp(ty, H - H * z, 0);
  // content clamp when zoomed: never show beyond the window edges
  const cb = sstep(1.1, 1.3, z);
  const clampAxis = (t, off, size, screen) => {
    const lo = screen - z * (off + size), hi = -z * off;
    return lo <= hi ? clamp(t, lo, hi) : (lo + hi) / 2;
  };
  tx = lerp(tx, clampAxis(tx, X0, CW, W), cb);
  ty = lerp(ty, clampAxis(ty, Y0, CH + BH, H), cb * 0.7);
  return { z, tx, ty };
}

function windowFrame(img, f, t) {
  // chrome
  ctx.save(); ctx.shadowColor = 'rgba(10,60,40,.20)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 28;
  rr(X0, Y0, CW, CH + BH, 18); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  ctx.save(); rr(X0, Y0, CW, CH + BH, 18); ctx.clip();
  ctx.fillStyle = '#f3f5f7'; ctx.fillRect(X0, Y0, CW, BH);
  ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(X0, CT - 1, CW, 1);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X0 + 26 + i * 22, Y0 + BH / 2, 7, 0, 7); ctx.fill(); });
  rr(X0 + 110, Y0 + 9, CW - 220, BH - 18, 8); ctx.fillStyle = '#fff'; ctx.fill();
  let u = 'data-dz.com'; urlAt.forEach(m => { if (f >= m.f) u = m.u; });
  // lock
  ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.6; const lx = X0 + 128, ly = Y0 + BH / 2;
  rr(lx - 5, ly - 1, 10, 8, 2); ctx.stroke(); ctx.beginPath(); ctx.arc(lx, ly - 2, 3.5, Math.PI, 0); ctx.stroke();
  font(600, 17); ctx.fillStyle = '#374151'; ctx.textBaseline = 'middle'; ctx.fillText(u, lx + 14, ly + 1);
  ctx.drawImage(img, X0, CT, CW, CH);
  ctx.restore();
}

function cursor(f, t) {
  const fr = LOG.frames[clamp(f, 0, N - 1)];
  const x = X0 + fr.x * S0, y = CT + fr.y * S0;
  // click ripples
  LOG.clicks.forEach(c => {
    const dt = (f - c.f) / FPS; if (dt < 0 || dt > 0.55) return;
    const p = dt / 0.55, cx = X0 + c.x * S0, cy = CT + c.y * S0;
    ctx.save(); ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = GREEN; ctx.lineWidth = 3.5 * (1 - p) + 1;
    ctx.beginPath(); ctx.arc(cx, cy, 8 + eout(p) * 30, 0, 7); ctx.stroke();
    ctx.globalAlpha = (1 - p) * 0.25; ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(cx, cy, 8 + eout(p) * 22, 0, 7); ctx.fill();
    ctx.restore();
  });
  let press = 0; LOG.clicks.forEach(c => { const dt = (f - c.f) / FPS; if (dt >= -0.05 && dt < 0.2) press = Math.max(press, Math.sin(clamp((dt + 0.05) / 0.25, 0, 1) * Math.PI)); });
  const s = 1.25 * (1 - press * 0.16);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.30)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.lineTo(5.2, 17); ctx.lineTo(9, 25.5); ctx.lineTo(12.6, 24); ctx.lineTo(8.9, 15.6); ctx.lineTo(15.8, 15.6); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.lineJoin = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.moveTo(1.6, 3.6); ctx.lineTo(1.6, 18.4); ctx.lineTo(5.6, 14.5); ctx.lineTo(9.6, 23.4); ctx.lineTo(10.9, 22.8); ctx.lineTo(7, 14); ctx.lineTo(12.4, 14); ctx.closePath();
  ctx.fillStyle = '#111'; ctx.fill();
  ctx.restore();
}

function caption(t) {
  const tr = t - T_REC;
  caps.forEach(c => {
    if (tr < c.a - 0.05 || tr > c.b + 0.4) return;
    const i = eout(prog(tr, c.a, 0.4)), o = 1 - eio(prog(tr, c.b, 0.3));
    const a = i * o; if (a <= 0) return;
    font(700, 32); const tw = ctx.measureText(c.txt).width;
    const w = tw + 110, h = 70, x = W / 2 - w / 2, y = 950 - h / 2 + (1 - i) * 24 + (1 - o) * 10;
    ctx.save(); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(10,60,40,.18)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rr(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(14,159,110,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    const bx = x + 40, by = y + h / 2;
    ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(bx, by, 16, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 7, by + 0.5); ctx.lineTo(bx - 2, by + 5.5); ctx.lineTo(bx + 7.5, by - 5); ctx.stroke();
    ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.fillText(c.txt, x + 74, by + 2);
    ctx.restore();
  });
}

function outro(t) {
  const t0 = T_REC + NO / FPS - 0.15; if (t < t0) return;
  const tt = t - t0;
  drawLogo(W / 2, 270, 170, t0 + 0.1, t);
  let a = anim(tt, 0.35, 0.5); line([['data', INK], ['-dz', GREEN], ['.com', '#3fbf8f']], W / 2, 480, 900, 130, a.a, a.dy, a.blur);
  a = anim(tt, 0.7, 0.45); line([['Les données ouvertes sur l’Algérie, ', '#1f2937'], ['en un seul endroit', GREEN]], W / 2, 570, 700, 44, a.a, a.dy, a.blur);
  a = anim(tt, 1.05, 0.45);
  if (a.a > 0) {
    font(800, 36); const bw = ctx.measureText('Commencer l\u2019exploration').width + 150, bh = 88, bx = W / 2 - bw / 2, by = 640 + a.dy, pulse = 1 + 0.025 * Math.sin(Math.max(0, tt - 1.6) * 4);
    ctx.save(); ctx.globalAlpha = a.a; ctx.translate(W / 2, by + bh / 2); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -(by + bh / 2));
    ctx.shadowColor = 'rgba(14,159,110,.45)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
    const g = ctx.createLinearGradient(bx, by, bx, by + bh); g.addColorStop(0, '#12a873'); g.addColorStop(1, '#0a7f56');
    rr(bx, by, bw, bh, 18); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(bx + 62, by + bh / 2 - 3, 11, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 70, by + bh / 2 + 5); ctx.lineTo(bx + 78, by + bh / 2 + 13); ctx.stroke();
    font(800, 36); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText('Commencer l’exploration', bx + 96, by + bh / 2 + 3);
    ctx.restore();
  }
  a = anim(tt, 1.4, 0.45);
  const fw = line([['Gratuit · Open source · 3 langues · Un projet ', GREY], ['New Algeria', INK]], W / 2 + 28, 820, 600, 28, a.a, a.dy, a.blur);
  if (a.a > 0) { ctx.save(); ctx.globalAlpha = a.a; flag(W / 2 + 28 - fw / 2 - 52, 798 + a.dy, 28); ctx.restore(); }
}

async function render(t) {
  const fRec = Math.round((t - T_REC) * FPS);
  const img = (t > T_REC - 0.8 && t < T_REC + NO / FPS + REC_OUT) ? await loadFrame(M[clamp(fRec, 0, NO - 1)]) : null;
  if (img) loadFrame(M[clamp(fRec + 1, 0, NO - 1)]); // prefetch
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const f = M[clamp(fRec, 0, NO - 1)];
  const recOn = img && t > T_REC - 0.8;
  const tf = recOn ? sceneTransform(f) : { z: 1, tx: 0, ty: 0 };
  ctx.save(); ctx.setTransform(tf.z, 0, 0, tf.z, tf.tx, tf.ty);
  background(t);
  if (recOn) {
    // window enter / exit
    const pin = eout(prog(t, T_REC - 0.1, REC_IN)), tEnd = T_REC + NO / FPS - 0.3, pout = eio(prog(t, tEnd, REC_OUT));
    const a = pin * (1 - pout);
    if (a > 0) {
      const s = lerp(0.92, 1, pin) * lerp(1, 0.9, pout), dy = (1 - pin) * 80 - pout * 40;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(W / 2, H / 2 + dy); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
      windowFrame(img, f, t);
      ctx.save(); rr(X0, CT, CW, CH, [0, 0, 18, 18]); ctx.clip(); cursor(f, t); ctx.restore();
      ctx.restore();
    }
  }
  ctx.restore();
  if (t < T_HOOK + 0.1) intro(t);
  hook(t);
  if (recOn) caption(t);
  outro(t);
}

window.compInit = init;
window.renderAt = async i => { await render(i / FPS); };
window.dbg = f => ({ cam: camF[f], tf: sceneTransform(f) });
})();
