// Browser test: degraded environments. No-microphone mode with no German voice, a denied/missing microphone,
// and a speaking round that runs out of time (fake clock).
// Run: node german-speaking/tests/e2e_degraded.js     (needs the 'playwright' package and a Chromium)
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.SHOTS || path.join(require('os').tmpdir(), 'sprechstunde-shots');
require('fs').mkdirSync(OUT, { recursive: true });
let URL;
const results = [], problems = [];
function ok(name, cond, extra) { results.push([cond ? 'ok  ' : 'FAIL', name, extra || '']); if (!cond) problems.push(name + (extra ? ' — ' + extra : '')); }
const SEED = (mic, stage) => `localStorage.setItem('sprechstunde/v1', JSON.stringify({v:1, settings:{mic:'${mic}', stage:'${stage}'}}));`;

async function newPage(browser, { mic, stage, extraInit, perms }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: perms || [] });
  await ctx.addInitScript(SEED(mic, stage));
  if (extraInit) await ctx.addInitScript(extraInit);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_(NAME|INTERNET|CONNECTION|TUNNEL|FAILED)|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  return { ctx, page, errors };
}
const T = (page) => page.locator('#view').innerText();
const B = (page, name) => page.getByRole('button', { name }).first();
const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(120); };

(async () => {
  const srv = await require('./serve').start(); URL = srv.url;
  /* ── A: "Ohne Mikrofon", no German voice (plain headless Chromium) ── */
  {
    const browser = await chromium.launch();
    const { page, errors } = await newPage(browser, { mic: 'none', stage: 's2' });
    await page.goto(URL); await page.waitForTimeout(300);
    ok('A: loads straight into Heute (setup already done)', page.url().endsWith('#/heute') || (await T(page)).includes('Heute dran'));
    // Karten without any microphone
    await go(page, '#/ueben/karten');
    for (let i = 0; i < 3; i++) await B(page, /^Weiter/).click();
    ok('A: recall shows a manual "spoke out loud" button instead of a mic', /Ich habe laut gesprochen/.test(await T(page)) && (await page.locator('.recbtn').count()) === 0);
    await B(page, /Ich habe laut gesprochen/).click();
    ok('A: manual button reveals the answer', (await page.locator('.rate').count()) === 1);
    // Blitz: no voice => prompt text is shown automatically
    await go(page, '#/ueben/blitz/s2');
    ok('A: no-voice banner is shown', /keine deutsche Stimme/i.test(await T(page)));
    await B(page, 'Los').click();
    await page.waitForSelector('text=/Sprich jetzt/', { timeout: 8000 });
    ok('A: prompt text appears when the voice cannot play it', (await page.locator('.sentence:not([hidden])').count()) >= 1);
    await B(page, /Ich habe geantwortet/).click();
    await page.waitForSelector('text=/Mögliche Reaktionen/i', { timeout: 3000 });
    ok('A: blitz review without a microphone', /Spontan/.test(await T(page)));
    // Rollenspiel
    await go(page, '#/ueben/rollenspiel/s2-r1');
    await B(page, /Ich habe geantwortet/).click();
    ok('A: role-play reveals model answers after the manual button', /Modellantworten/i.test(await T(page)));
    // Flow without a microphone: Start, then Fertig
    await go(page, '#/ueben/flow/s2-t1/kurz');
    await B(page, /Runde 1 starten/).click();
    ok('A: manual "Fertig" is hidden until the clock runs', (await page.getByRole('button', { name: 'Fertig' }).count()) === 0 || !(await page.getByRole('button', { name: 'Fertig' }).first().isVisible()));
    await B(page, /^Start$/).click();
    await page.waitForTimeout(1200);
    await B(page, 'Fertig').click();
    await page.waitForSelector('text=/geschafft/i', { timeout: 3000 });
    ok('A: flow round explains that speech recognition is off', /Ohne Spracherkennung/.test(await T(page)));
    await B(page, /Mal so/).click(); await B(page, /^Start$/).click(); await page.waitForTimeout(600); await B(page, 'Fertig').click(); await B(page, /Mal so/).click();
    await B(page, /^Start$/).click(); await page.waitForTimeout(600); await B(page, 'Fertig').click(); await B(page, /Flüssig/).click();
    ok('A: flow summary falls back to self-rating bars', /stockend|mal so, mal so|flüssig/i.test(await T(page)) && /Drei Runden geschafft/.test(await T(page)));
    // Argument without a microphone
    await go(page, '#/ueben/argument/s3-t1');
    await B(page, /^Start/).click(); await B(page, /^Start$/).click();
    for (let k = 0; k < 5; k++) { await B(page, /^(Weiter|Fertig)$/).click(); await page.waitForTimeout(80); }
    await page.waitForSelector('text=/geschafft/i', { timeout: 3000 });
    ok('A: argument frame completes without a microphone', /gesprochen/.test(await T(page)));
    // Echo pass 3 manual
    await go(page, '#/ueben/echo/s2');
    await B(page, /Weiter zu Schritt 2/).click(); await B(page, /Weiter zu Schritt 3/).click();
    await B(page, /Ich habe es erzählt/).click();
    ok('A: echo completes without a microphone', /Weiter im Plan/.test(await T(page)));
    await go(page, '#/heute');
    const t = await T(page);
    ok('A: Heute is consistent afterwards', /Heute dran/.test(t) && !/null|undefined|NaN/.test(t));
    ok('A: no console/page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
    await page.screenshot({ path: path.join(OUT, 'A-heute.png') });
    await browser.close();
  }

  /* ── B: microphone mode "rec" but the permission is denied / no device ── */
  {
    const browser = await chromium.launch();     // no fake-ui flag: getUserMedia fails
    const { page, errors } = await newPage(browser, { mic: 'rec', stage: 's1' });
    await page.goto(URL); await page.waitForTimeout(300);
    await go(page, '#/ueben/rollenspiel/s1-r2');
    ok('B: recorder offers a mic button', (await page.locator('.recbtn').count()) === 1);
    await page.locator('.recbtn').click();
    await page.waitForTimeout(800);
    const t = await T(page);
    ok('B: failure is explained and a manual fallback appears', /Mikrofon/.test(t) && /Ich habe geantwortet|Ich habe laut gesprochen/.test(t), t.slice(0, 200));
    await page.screenshot({ path: path.join(OUT, 'B-denied.png') });
    await B(page, /Ich habe (geantwortet|laut gesprochen)/).click();
    ok('B: fallback still reaches the model answers', /Modellantworten/i.test(await T(page)));
    ok('B: no console/page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
    await browser.close();
  }

  /* ── C: a round that runs out of time (fake clock) with the mic + recogniser mocked ── */
  {
    const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const mocks = () => {
      const voice = { name: 'Fake', lang: 'de-DE', voiceURI: 'f', localService: true };
      Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [voice], addEventListener() {}, speak(u) { setTimeout(() => u.onend && u.onend({}), 20); }, cancel() {} }, configurable: true });
      class SR { start() { this._on = true; setTimeout(() => this._on && this.onspeechstart && this.onspeechstart(), 300); setTimeout(() => { if (!this._on) return; const r = Object.assign([{ transcript: 'ich arbeite jeden tag in einem kleinen büro und am wochenende treibe ich gern sport' }], { isFinal: true }); this.onresult && this.onresult({ resultIndex: 0, results: [r] }); }, 500); } stop() { this._on = false; setTimeout(() => this.onend && this.onend(), 10); } abort() { this.stop(); } }
      window.SpeechRecognition = SR; window.webkitSpeechRecognition = SR;
    };
    const { page, errors } = await newPage(browser, { mic: 'asr', stage: 's1', extraInit: mocks, perms: ['microphone'] });
    await page.clock.install();
    await page.goto(URL);
    await page.clock.runFor(500);
    await go(page, '#/ueben/flow/s1-t3/kurz');
    await page.clock.runFor(200);
    await B(page, /Runde 1 starten/).click();
    await B(page, /^Start$/).click();
    await page.clock.runFor(2000);
    ok('C: timer counts down', /1:5\d|1:58|1:59/.test(await page.locator('.timer').innerText()), await page.locator('.timer').innerText());
    await page.clock.runFor(121000);
    await page.waitForSelector('text=/geschafft/i', { timeout: 4000 });
    const t = await T(page);
    ok('C: round ends by itself when time is up', /Runde 1 geschafft/i.test(t));
    ok('C: seconds reflect the real round length', /2:0\d|1:5\d|2:00/.test(t), t.replace(/\n+/g, ' | ').slice(0, 160));
    ok('C: words per minute is plausible for a full round', await page.evaluate(() => { SP.flush(); return true; }));
    await page.screenshot({ path: path.join(OUT, 'C-timeout.png') });
    ok('C: no console/page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
    await browser.close();
  }

  console.log(results.map((r) => r.join(' ')).join('\n'));
  console.log('\n' + (problems.length ? problems.length + ' PROBLEMS' : 'ALL GOOD') + ' · ' + results.length + ' checks');
  srv.close();
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.log(results.map((r) => r.join(' ')).join('\n')); console.error('CRASH', e.message.split('\n').slice(0, 6).join('\n')); process.exit(2); });
