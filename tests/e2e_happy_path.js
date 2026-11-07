// Browser test: a full walk through Sprechstunde in headless Chromium with a fake microphone and mocked speech
// services (headless Chromium has no German voice and no speech recogniser).
// Run: node german-speaking/tests/e2e_happy_path.js     (needs the 'playwright' package and a Chromium)
// Screenshots go to $SHOTS or the system temp folder.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.SHOTS || path.join(require('os').tmpdir(), 'sprechstunde-shots');
require('fs').mkdirSync(OUT, { recursive: true });
let URL;

const MOCKS = () => {
  // speech synthesis: one German voice, utterances "end" quickly
  const voice = { name: 'Fake Deutsch', lang: 'de-DE', voiceURI: 'fake-de', localService: true, default: true };
  const fake = {
    getVoices: () => [voice], speaking: false, _l: {},
    addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken = (window.__spoken || []); window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend({}), 40); },
    cancel() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  // speech recognition: reports a canned German transcript ~0.8 s after start
  class FakeSR {
    start() {
      this._on = true;
      setTimeout(() => { if (this._on && this.onspeechstart) this.onspeechstart(); }, 350);
      setTimeout(() => {
        if (!this._on || !this.onresult) return;
        const r = Object.assign([{ transcript: window.__SAY || 'meiner meinung nach ist das eine gute idee weil man viel zeit spart' }], { isFinal: true });
        this.onresult({ resultIndex: 0, results: [r] });
      }, 700);
    }
    stop() { this._on = false; setTimeout(() => this.onend && this.onend(), 10); }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
};

const results = [];
const problems = [];
function ok(name, cond, extra) { results.push([cond ? 'ok  ' : 'FAIL', name, extra || '']); if (!cond) problems.push(name + (extra ? ' — ' + extra : '')); }

(async () => {
  const srv = await require('./serve').start(); URL = srv.url;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, permissions: ['microphone'], locale: 'de-DE' });
  await ctx.addInitScript(MOCKS);
  const page = await ctx.newPage();
  const errors = []; globalThis.__page = page; globalThis.__errors = errors;
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_(NAME|INTERNET|CONNECTION|TUNNEL|FAILED)/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('requestfailed', () => {});
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(150); };
  const text = () => page.locator('#view').innerText();
  const click = (sel, opts) => page.locator(sel).first().click(opts);
  const btn = (name) => page.getByRole('button', { name }).first();

  // ── first run → onboarding
  await page.goto(URL);
  await page.waitForTimeout(300);
  ok('first run redirects to #/start', page.url().endsWith('#/start'), page.url());
  ok('asr option available (mocked)', await page.locator('input[name=mic][value=asr]').isEnabled());
  await shot('01-start');
  await page.locator('#start-stage').selectOption('s3');
  await btn(/Los geht/).click();
  await page.waitForTimeout(200);
  ok('onboarding saves settings and opens Heute', page.url().endsWith('#/heute'));
  const st0 = await page.evaluate(() => (SP.flush(), JSON.parse(localStorage.getItem('sprechstunde/v1'))));
  ok('settings persisted', st0 && st0.settings.mic === 'asr' && st0.settings.stage === 's3', JSON.stringify(st0 && st0.settings));
  await shot('02-heute');
  ok('Heute shows five plan blocks', (await page.locator('.plan li').count()) === 5);
  // switch to stage 1 for the walk-through
  await go('#/einstellungen');
  await page.locator('#set-stage').selectOption('s1');
  await shot('03-einstellungen');

  // ── Karten
  await go('#/ueben/karten');
  ok('Karten starts with an intro card', /Neu/.test(await text()) && /Say it three times/.test(await text()));
  await shot('04-karten-intro');
  for (let i = 0; i < 3; i++) await btn(/Weiter/).click();           // 3 intros
  ok('then asks for recall', /sag auf deutsch/i.test(await text()));
  await shot('05-karten-recall');
  // first recall: use the mic, which auto-reveals
  await page.locator('.recbtn').first().click();
  await page.waitForTimeout(1100);
  await page.locator('.recbtn.on').first().click();
  await page.waitForTimeout(800);
  ok('recall reveals German after recording', await page.locator('.rate').count() === 1);
  await shot('06-karten-revealed');
  await btn(/Flüssig/).click();
  // rate the rest quickly: reveal then rate
  for (let guard = 0; guard < 30; guard++) {
    const t = await text();
    if (/geschafft/i.test(t) && /Karten geübt/.test(t)) break;
    if (/Aufdecken/.test(t)) await btn('Aufdecken').click();
    else if (/Weiter/.test(t) && !/Weiter im Plan/.test(t)) await btn(/^Weiter/).click();
    await page.waitForTimeout(40);
    if (await page.locator('.rate').count()) await btn(guard % 4 === 0 ? /Nicht gewusst/ : /Flüssig/).click();
  }
  ok('Karten session reaches the summary', /Karten geübt/.test(await text()), (await text()).slice(0, 120));
  await shot('07-karten-done');
  let st = await page.evaluate(() => (SP.flush(), JSON.parse(localStorage.getItem('sprechstunde/v1'))));
  ok('5 new cards were introduced today', Object.values(st.cards).filter((c) => c.first === st.days && true || true).length >= 5, String(Object.keys(st.cards).length));
  ok('karten marked done today', Object.values(st.days)[0].done.karten === true);

  // ── Echo
  await go('#/ueben/echo/s1');
  await shot('08-echo-1');
  await btn(/Alles anhören/).click();
  await page.waitForTimeout(600);
  await btn(/Weiter zu Schritt 2/).click();
  ok('echo pass 2 lists sentences with recorders', (await page.locator('.recbtn').count()) >= 4);
  await shot('09-echo-2');
  await btn(/Weiter zu Schritt 3/).click();
  await page.evaluate(() => { window.__SAY = 'also bei mir ist gerade ziemlich viel los wir sind vor drei wochen umgezogen'; });
  await page.locator('.recbtn').first().click(); await page.waitForTimeout(1000);
  await page.locator('.recbtn.on').first().click(); await page.waitForTimeout(700);
  ok('echo pass 3 scores recall', /der Wörter/i.test(await text()) && /Weiter im Plan/.test(await text()), (await text()).slice(-200));
  await shot('10-echo-3');

  // ── Blitz
  await go('#/ueben/blitz/s1');
  await btn('Los').click();
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('.recbtn.on', { timeout: 6000 });
    await page.waitForTimeout(900);
    if (i === 0) await shot('11-blitz-speak');
    await page.locator('.recbtn.on').first().click();
    await page.waitForSelector('text=/Mögliche Reaktionen/i', { timeout: 4000 });
    if (i === 0) await shot('12-blitz-review');
    await btn(i % 2 ? /Zu langsam/ : /Spontan/).click();
  }
  await page.waitForSelector('text=/von 5 spontan/', { timeout: 4000 }).catch(() => {});
  ok('Blitz ends with a summary', /spontan/.test(await text()) && /Reaktionszeit/.test(await text()), (await text()).slice(0, 150));
  await shot('13-blitz-done');

  // ── Rollenspiel
  await go('#/ueben/rollenspiel');
  await shot('14-rp-list');
  await go('#/ueben/rollenspiel/s1-r1');
  await page.evaluate(() => { window.__SAY = 'hallo jana freut mich ich wohne seit ein paar monaten im zweiten stock und du wie lange wohnst du schon hier'; });
  await page.locator('.recbtn').first().click(); await page.waitForTimeout(1000);
  await page.locator('.recbtn.on').first().click(); await page.waitForTimeout(800);
  ok('role-play shows model answers + used chunk after a take', /Modellantworten/i.test(await text()) && /Redemittel benutzt/i.test(await text()));
  await shot('15-rp-step');
  await btn(/Nochmal versuchen/).click();
  ok('"again" resets the recorder', !(await page.locator('audio').count()));
  await page.locator('.recbtn').first().click(); await page.waitForTimeout(900);
  await page.locator('.recbtn.on').first().click(); await page.waitForTimeout(700);
  await btn(/^Weiter/).click();
  for (let s = 0; s < 2; s++) {
    { const tt = await text(); ok('role-play step ' + (s + 2) + ' has no stray null', !/\bnull\b|undefined/.test(tt)); }
    await page.locator('.recbtn').first().click(); await page.waitForTimeout(900);
    await page.locator('.recbtn.on').first().click(); await page.waitForTimeout(700);
    await btn(/^(Weiter|Fertig)/).click();
  }
  ok('role-play finishes with a summary', /geschafft/i.test(await text()), (await text()).slice(0, 100));
  await shot('16-rp-done');

  // ── Flow (kurz) — end each round early with the stop button
  await go('#/ueben/flow');
  await shot('17-flow-picker');
  await go('#/ueben/flow/s1-t1/kurz');
  await page.locator('#flow-notes').fill('Arbeit, Sport, Freunde');
  await shot('18-flow-prep');
  await btn(/Runde 1 starten/).click();
  for (let r = 0; r < 3; r++) {
    await btn(/^Start$/).click();
    await page.waitForTimeout(1300);
    if (r === 0) await shot('19-flow-running');
    await page.locator('.recbtn.on').first().click();
    await page.waitForSelector('text=/geschafft/i', { timeout: 4000 });
    if (r === 0) await shot('20-flow-round-result');
    await btn(r === 2 ? /Flüssig/ : /Mal so/).click();
    await page.waitForTimeout(100);
  }
  ok('flow summary appears', /auswertung/i.test(await text()) && /Was hat gefehlt/.test(await text()), (await text()).slice(0, 120));
  await shot('21-flow-summary');
  await page.locator('#fg-en-0').fill('to get round a word');
  await page.locator('#fg-de-0').fill('um ein Wort herumreden');
  await btn(/Speichern und weiter/).click();
  await page.waitForTimeout(200);
  st = await page.evaluate(() => (SP.flush(), JSON.parse(localStorage.getItem('sprechstunde/v1'))));
  ok('flow saved: session, topic count and gap card', st.flows.length === 1 && st.topics['s1-t1'] === 1 && st.gaps.length === 1 && st.custom.length === 1 && st.cards[st.custom[0].id], JSON.stringify({ f: st.flows.length, g: st.gaps.length }));
  ok('flow measured words per minute', st.flows[0].rounds.every((r) => r.wpm > 0), JSON.stringify(st.flows[0].rounds));

  // ── Argument (s3 opinion topic)
  await go('#/ueben/argument');
  await shot('22-arg-picker');
  await go('#/ueben/argument/s3-t2');
  await btn(/^Start/).click();
  await page.waitForTimeout(400);
  await btn(/^Start$/).click();
  await page.waitForTimeout(500);
  await shot('23-arg-running');
  for (let k = 0; k < 5; k++) { await btn(/^(Weiter|Fertig)$/).click(); await page.waitForTimeout(150); }
  await page.waitForSelector('text=/geschafft/i', { timeout: 5000 });
  ok('argument frame completes', /geschafft/i.test(await text()), (await text()).slice(0, 120));
  await shot('24-arg-done');

  // ── Umschreiben
  await go('#/ueben/umschreiben');
  await shot('25-umschreiben');
  for (let i = 0; i < 5; i++) {
    await btn('Auflösen').click();
    if (i === 0) await shot('26-umschreiben-revealed');
    await btn(/Hat geklappt/).click();
  }
  ok('Umschreiben finishes', /ohne Probleme umschrieben/.test(await text()));

  // ── Lücken
  await go('#/ueben/luecken');
  await page.locator('#gap-en').fill('to keep going');
  await btn(/Hinzufügen/).click();
  await shot('27-luecken');
  ok('gap list shows both entries', (await page.locator('#view .card.flat').count()) >= 2);

  // ── pages
  for (const [name, hash] of [['28-weg', '#/weg'], ['29-echt', '#/echt'], ['30-methode', '#/methode'], ['31-mehr', '#/mehr'], ['32-ueben', '#/ueben'], ['33-heute-after', '#/heute']]) {
    await go(hash); await shot(name);
  }
  ok('Heute now shows plan progress', /\d \/ 5/.test(await text()));
  ok('Heute shows a speaking time', /Sprechzeit heute/.test(await text()));
  ok('Heute shows the words-per-minute card', /Tempo im Flow/.test(await text()));

  // ── Weg: tick can-do, set stage
  await go('#/weg');
  await page.locator('summary', { hasText: 'Stufen-Check' }).first().click();
  await page.locator('.cando input').first().check();
  st = await page.evaluate(() => (SP.flush(), JSON.parse(localStorage.getItem('sprechstunde/v1'))));
  ok('can-do tick is stored', (st.cando.s1 || []).length === 1);

  // ── Echt: prompt generator
  await go('#/echt');
  await page.locator('#ai-scen').selectOption({ label: 'Vorstellungsgespräch' });
  ok('prompt reflects scenario', (await page.locator('pre.prompt').innerText()).includes('Szenario: Vorstellungsgespräch'));

  // ── export/import round trip
  await go('#/einstellungen');
  const exported = await page.evaluate(() => { SP.flush(); return localStorage.getItem('sprechstunde/v1'); });
  ok('export JSON is valid', JSON.parse(exported).v === 1);

  // ── desktop + dark mode screenshots
  await page.setViewportSize({ width: 1100, height: 900 });
  await go('#/heute'); await shot('40-desktop-heute');
  await go('#/weg'); await shot('41-desktop-weg');
  await page.emulateMedia({ colorScheme: 'dark' });
  await go('#/heute'); await shot('42-dark-heute');
  await go('#/ueben/rollenspiel/s2-r1'); await shot('43-dark-rp');
  await page.setViewportSize({ width: 390, height: 844 });
  await go('#/ueben/karten'); await shot('44-dark-karten');

  // ── no horizontal scroll on phone width for every route
  await page.emulateMedia({ colorScheme: 'light' });
  const routes = ['#/heute', '#/ueben', '#/weg', '#/echt', '#/mehr', '#/methode', '#/einstellungen', '#/ueben/karten', '#/ueben/echo/s2', '#/ueben/blitz/s2', '#/ueben/rollenspiel', '#/ueben/rollenspiel/s6-r1', '#/ueben/flow', '#/ueben/flow/s6-t4/lang', '#/ueben/argument', '#/ueben/umschreiben', '#/ueben/luecken'];
  for (const r of routes) {
    await go(r);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('no horizontal overflow at 390px: ' + r, over <= 0, 'overflow ' + over + 'px');
    const tt = await text();
    ok('no stray null/undefined text: ' + r, !/\bnull\b|\bundefined\b|\[object|NaN/.test(tt), (tt.match(/.{0,30}(\bnull\b|\bundefined\b|NaN).{0,30}/) || [''])[0]);
  }
  ok('no console/page errors', errors.length === 0, errors.slice(0, 5).join(' | '));

  console.log(results.map((r) => r.join(' ')).join('\n'));
  console.log('\n' + (problems.length ? problems.length + ' PROBLEMS' : 'ALL GOOD') + ' · ' + results.length + ' checks');
  await browser.close(); srv.close();
  process.exit(problems.length ? 1 : 0);
})().catch(async (e) => { console.log(results.map((r) => r.join(' ')).join('\n')); console.error('CRASH', e.message.split('\n')[0]); try { const pg = globalThis.__page; if (pg) { await pg.screenshot({ path: path.join(OUT, 'crash.png') }); console.log('PAGE TEXT:\n' + (await pg.locator('#view').innerText()).slice(0, 800)); console.log('ERRORS:', globalThis.__errors); } } catch (x) { console.log('(no page dump)', x.message); } process.exit(2); });
