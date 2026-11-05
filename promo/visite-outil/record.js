// Scripted, deterministic tour of data-dz.com.
// Virtual time: every frame = exactly 1/30 s of page time, captured at 2400x1350.
// Cursor is NOT rendered by the page: its exact path is logged and drawn in post.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'rec';
const LANG = process.argv[3] || 'fr';
const FPS = 30, DT = 1000 / FPS;
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

const log = { fps: FPS, vw: 1600, vh: 900, scale: 1.5, frames: [], clicks: [], cams: [], marks: [] };
let cdp, page, fi = 0;
const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return null; return r.result.value; };
async function realtime(ms, until) {
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance' });
  const t0 = Date.now();
  if (until) { while (Date.now() - t0 < 20000 && !(await ev(until))) await new Promise(r => setTimeout(r, 200)); }
  await new Promise(r => setTimeout(r, ms));
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
}
let cur = { x: 1720, y: 980 }, down = false;

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

async function advance(ms) {
  await new Promise(res => {
    cdp.once('Emulation.virtualTimeBudgetExpired', res);
    cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms });
  });
}
async function frame() {
  await advance(DT);
  const sc = await ev('[scrollX, scrollY]');
  const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: sc[0], y: sc[1], width: 1600, height: 900, scale: 1.5 } });
  fs.writeFileSync(path.join(OUT, 'frames', String(fi).padStart(5, '0') + '.jpg'), Buffer.from(r.data, 'base64'));
  log.frames.push({ x: +cur.x.toFixed(2), y: +cur.y.toFixed(2), d: down ? 1 : 0 });
  fi++;
  if (fi % 30 === 0) { process.stdout.write(`f${fi} `); fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log)); }
}
async function wait(s) { const n = Math.round(s * FPS); for (let i = 0; i < n; i++) await frame(); }
async function mouse(type, extra = {}) {
  await cdp.send('Input.dispatchMouseEvent', { type, x: cur.x, y: cur.y, button: down || type !== 'mouseMoved' ? 'left' : 'none', ...extra });
}
// Smooth arc move, eased, no zigzag.
async function moveTo(x, y, dur = 0.9) {
  const x0 = cur.x, y0 = cur.y, dx = x - x0, dy = y - y0, dist = Math.hypot(dx, dy);
  const n = Math.max(1, Math.round(dur * 1.15 * FPS));
  const bend = Math.min(60, dist * 0.08);           // gentle curvature
  const nx = -dy / (dist || 1), ny = dx / (dist || 1);
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n), arc = Math.sin(Math.PI * t) * bend;
    cur = { x: x0 + dx * t + nx * arc, y: y0 + dy * t + ny * arc };
    await mouse('mouseMoved');
    await frame();
  }
}
async function click(hold = 0.12) {
  log.clicks.push({ f: fi, x: cur.x, y: cur.y });
  down = true; await mouse('mousePressed', { clickCount: 1 });
  await wait(hold / 2);
  down = false; await mouse('mouseReleased', { clickCount: 1 });
  await wait(hold / 2);
}
async function type(text, cps = 9) {
  for (const ch of text) { await cdp.send('Input.insertText', { text: ch }); await wait(1 / cps); }
}
async function wheel(dy, steps, dur) {
  const n = Math.round(dur * FPS), every = Math.max(1, Math.floor(n / steps));
  for (let i = 0; i < n; i++) {
    if (i % every === 0 && i / every < steps) await mouse('mouseWheel', { deltaX: 0, deltaY: dy });
    await frame();
  }
}
async function scrollTo(y, dur = 1.2) {
  const y0 = await ev('scrollY');
  const n = Math.round(dur * FPS);
  for (let i = 1; i <= n; i++) {
    const v = y0 + (y - y0) * ease(i / n);
    await ev(`window.scrollTo({ top: ${v}, behavior: 'instant' })`);
    await frame();
  }
}
// camera keyframe: zoom z centred on CSS point (x,y), reached over dur seconds starting now
function cam(z, x, y, dur = 2.0) { log.cams.push({ f: fi, z, x, y, dur }); }
function mark(name) { log.marks.push({ f: fi, name }); }
async function box(fn, arg) {
  const r = await ev(`(${fn.toString()})(${JSON.stringify(arg)})`);
  if (!r) throw new Error('element not found: ' + fn.toString().slice(0, 80) + ' ' + arg);
  return r;
}
const byText = (sel, txt) => box(([sel, txt]) => {
  const el = [...document.querySelectorAll(sel)].find(e => e.innerText && e.innerText.trim().includes(txt) && e.getBoundingClientRect().width > 0);
  if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
}, [sel, txt]);
const bySel = sel => box(sel => {
  const el = [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0);
  if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
}, sel);
async function waitFor(fn, maxS = 6) {
  for (let i = 0; i < maxS * 5; i++) { try { return await fn(); } catch (e) { await realtime(200); } }
  return fn();
}


// ───────── narration beats: each segment lasts at least as long as its voice line ─────────
const DURS = JSON.parse(fs.readFileSync(process.env.DURS || '/home/claude/voice/durs.json', 'utf8'));
const LEAD = 0.25, GAP = 0.55;           // voice starts LEAD s after the mark; GAP s of air after it
async function beat(name, voice, fn, lead = LEAD) {
  const f0 = fi; mark(name); log.marks[log.marks.length - 1].voice = voice; log.marks[log.marks.length - 1].lead = lead;
  await fn();
  const need = Math.round(((DURS[voice] || 0) + lead + GAP) * FPS) - (fi - f0);
  for (let i = 0; i < need; i++) await frame();
}
const NOREVEAL = 'main section[style*="opacity"], #catalog [style*="opacity"], main article[style*="opacity"]{opacity:1!important;transform:none!important}';

(async () => {
  const b = await chromium.launch({ args: ['--enable-webgl', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5, locale: 'fr-FR', colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });
  page = await ctx.newPage();
  // ── ONE page load only. Everything else is SPA navigation, so caches (React Query, images, tiles, fonts) stay warm.
  await page.goto(`https://www.data-dz.com/?lng=fr`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '::-webkit-scrollbar{display:none} html{scrollbar-width:none} ' + NOREVEAL });
  await page.waitForTimeout(1500);
  const spa = async url => { await page.evaluate(u => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')); }, url); };
  const scrollThrough = async () => { const H = await page.evaluate(() => document.body.scrollHeight); for (let y = 0; y < H; y += 500) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(250); } await page.evaluate(() => scrollTo(0, 0)); };
  await scrollThrough();
  // warm the dataset page (data, map tiles, illustration), the Arabic UI and its fonts
  await spa('/datasets/ferroviaire'); await page.waitForSelector('h1'); await page.waitForTimeout(3500); await scrollThrough();
  await page.click('header button:has-text("FR")'); await page.waitForTimeout(500); await page.click('text=العربية'); await page.waitForTimeout(2500);
  await page.click('header button:has-text("ع")').catch(() => {}); await page.waitForTimeout(500);
  await page.click('text=Français').catch(async () => { await page.evaluate(() => localStorage.setItem('i18nextLng', 'fr')); });
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => document.documentElement.lang) !== 'fr') { console.log('lang reset failed'); process.exit(1); }
  await page.goBack(); await page.waitForTimeout(1500);         // SPA back to home (no reload)
  await page.evaluate(() => scrollTo(0, 0)); await page.mouse.move(1599, 899); await page.waitForTimeout(1500);
  cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  cam(1, 800, 450, 0);

  // 1. HOME — « Tout commence par une recherche. On tape simplement gare… »
  await beat('home', 'v03', async () => {
    await wait(0.9);
    const inp = await bySel('input[placeholder]');
    cam(1.22, inp.x + 80, inp.y - 40, 2.2);
    await moveTo(inp.x - inp.w / 2 + 120, inp.y, 1.2);
    await click(); await wait(0.25);
    await type('gare', 6);
    await wait(0.3);
    const go = await byText('button', 'Chercher');
    await moveTo(go.x, go.y, 0.8);
  }, 0.9);

  // 2. CATALOGUE — « …et le catalogue ne garde que ce qui nous intéresse. Tout est rangé par thème… »
  await beat('catalog', 'v04', async () => {
    await click();
    cam(1, 800, 450, 2.0);
    await wait(1.8);
    const sel = await byText('button,[role=combobox]', 'Toutes les catégories');
    cam(1.18, sel.x - 40, sel.y + 200, 2.0);
    await moveTo(sel.x - 40, sel.y, 1.1);
    await click(); await wait(2.2);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await wait(0.3);
    const card = await bySel('a[href="/datasets/ferroviaire"]');
    cam(1.12, card.x + 60, card.y + 100, 2.0);
    await moveTo(card.x - card.w / 2 + 120, card.y, 1.2);
  });

  // 3. FICHE — « On ouvre les gares ferroviaires. Chaque fiche dit clairement d'où viennent les données… »
  await beat('fiche', 'v05', async () => {
    await click();
    await wait(0.1);
    await realtime(2000, `location.pathname.startsWith('/datasets') && !!document.querySelector('h1') && !!document.querySelector('canvas')`);
    await ev(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    cam(1, 800, 450, 0);
    await wait(0.4);
    const h1 = await bySel('h1');
    cam(1.2, h1.x, h1.y + 60, 2.2);
    await moveTo(h1.x - 250, h1.y + 120, 1.4);
    const badge = await byText('span,div,a', 'Source vérifiée');
    await moveTo(badge.x, badge.y + 4, 1.2);
  });

  // 4. CARTE — « Et surtout, on les voit… Un clic sur un point, et on a le nom de la gare et son exploitant. »
  await beat('map', 'v06', async () => {
    cam(1.15, 820, 640, 2.2);
    await moveTo(900, 640, 1.4);
    await wait(1.6);
    const map = await bySel('canvas');
    await moveTo(map.x - 30, 590, 1.0);
    await wait(0.6);
    await click(0.1);
    await realtime(400);
    await wait(2.2);
  });

  // 5. TÉLÉCHARGER — « Besoin des données ? Un clic sur Télécharger. CSV…, Excel, JSON… ou GeoJSON… »
  await beat('download', 'v07', async () => {
    const x = await bySel('.maplibregl-popup-close-button').catch(() => null);
    if (x) { await moveTo(x.x, x.y, 0.8); await click(); }
    const dl = await byText('button', 'Télécharger');
    cam(1.15, 1050, 380, 2.0);
    await moveTo(dl.x - 80, dl.y, 1.0);
    await click(); await wait(0.5);
    cam(1.2, 800, 450, 2.0);
    const pick = async t => { const o = await byText('[role=dialog] button, [role=dialog] label, [role=dialog] [role=radio]', t); await moveTo(o.x - 20, o.y, 0.8); return o; };
    await pick('CSV'); await wait(0.5);
    await pick('Excel'); await wait(0.5);
    await pick('JSON'); await wait(0.4);
    await pick('GeoJSON'); await click(); await wait(0.5);
    const dlBtn = await box(() => { const bs = [...document.querySelectorAll('[role=dialog] button')]; const el = bs[bs.length - 2] || bs[bs.length - 1]; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await moveTo(dlBtn.x, dlBtn.y, 0.8);
    await wait(0.8);
    const close = await bySel('[role=dialog] button:has(svg.lucide-x), [role=dialog] button[class*="absolute"]');
    await moveTo(close.x, close.y, 0.8);
    await click();
    cam(1, 800, 450, 2.0);
  });

  // 6. API — « Vous êtes développeur ? Copiez l'adresse de l'API… »
  await beat('api', 'v08', async () => {
    const apiB = await byText('button', 'https://api.data-dz.com');
    cam(1.25, apiB.x - 120, apiB.y + 60, 2.2);
    await moveTo(apiB.x + 60, apiB.y, 1.3);
    await wait(0.6);
    await click();
    await wait(0.6);
  });

  // 7. APERÇU — « L'aperçu montre les premières lignes, et chaque colonne avec son type. »
  await beat('preview', 'v09', async () => {
    cam(1, 800, 450, 1.8);
    const tabs = (await ev(`(() => { const t = [...document.querySelectorAll('[role=tablist]')][0]; return t ? t.getBoundingClientRect().top + scrollY : 1300; })()`)) || 1300;
    await scrollTo(tabs - 230, 2.0);
    const tbl = await bySel('table');
    cam(1.18, tbl.x, tbl.y, 2.0);
    await moveTo(tbl.x - 200, tbl.y - 20, 1.2);
    await moveTo(tbl.x + 120, tbl.y + 50, 1.4);
  });

  // 8. LICENCE — « La licence est toujours indiquée… »
  await beat('licence', 'v10', async () => {
    cam(1.18, 1200, 330, 2.0);
    await moveTo(1180, 400, 1.3);
  });

  // 9. LANGUES — « Le site parle français, anglais… et arabe… »
  await beat('lang', 'v11', async () => {
    cam(1, 800, 450, 1.6);
    await scrollTo(0, 1.6);
    const lb = await byText('header button', 'FR');
    cam(1.2, lb.x - 200, lb.y + 120, 2.0);
    await moveTo(lb.x, lb.y, 1.2);
    await click(); await wait(0.5);
    const ar = await byText('[role=menuitem],[role=menuitemradio],[role=option]', 'العربية');
    await moveTo(ar.x, ar.y, 0.8);
    await click();
    await realtime(800);
    cam(1, 800, 450, 2.0);
  });

  // 10. THÈME — « Et il s'adapte à vous : mode sombre pour le soir… mode clair pour la journée. »
  await beat('dark', 'v12', async () => {
    const moon = await box(() => { const bs = [...document.querySelectorAll('header button')].filter(b => b.querySelector('svg') && !b.innerText.trim()); const el = bs[0]; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await moveTo(moon.x, moon.y, 1.0);
    await click();            // → sombre
    await wait(1.6);
    await moveTo(moon.x + 2, moon.y + 1, 0.3);
    await click();            // → clair
    await moveTo(950, 520, 1.4);
  }, 0.1);
  await wait(0.6);
  mark('end');

  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log));
  console.log('\nDONE frames', fi);
  await b.close();
})().catch(e => { console.error('ERR', e); fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log)); process.exit(1); });
