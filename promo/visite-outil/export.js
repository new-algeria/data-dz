// node export.js out.mp4|dir/ [startFrame endFrame step rec]
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
(async () => {
  const [out, a, b, step, rec] = [process.argv[2], +(process.argv[3]||0), process.argv[4], +(process.argv[5]||1), process.argv[6]||'/home/claude/tour/rec'];
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  // serve local files through request interception (no local server)
  await p.route('http://comp.local/**', r => {
    const fp = decodeURIComponent(new URL(r.request().url()).pathname);
    const ct = fp.endsWith('.html') ? 'text/html' : fp.endsWith('.js') ? 'application/javascript' : fp.endsWith('.json') ? 'application/json' : 'image/jpeg';
    try { r.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(fp) }); } catch (e) { r.fulfill({ status: 404, body: '' }); }
  });
  await p.goto('http://comp.local/home/claude/comp/index.html?rec=' + rec);
  const total = await p.evaluate(() => compInit());
  const end = b ? +b : Math.round(total * 30);
  console.log('total s', total, 'frames', end);
  fs.writeFileSync(out.replace(/\/?$/, '') + '.voices.json', JSON.stringify(await p.evaluate(() => window.VOICES)));
  const still = out.endsWith('/'); if (still) fs.mkdirSync(out, { recursive: true });
  let ff; if (!still) ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', '17', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = a; i < end; i += step) {
    const d = await p.evaluate(async i => { await renderAt(i); return document.getElementById('c').toDataURL('image/jpeg', 0.94); }, i);
    const buf = Buffer.from(d.split(',')[1], 'base64');
    if (still) fs.writeFileSync(out + String(i).padStart(5, '0') + '.jpg', buf);
    else if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(i, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); }
  await br.close();
})();
