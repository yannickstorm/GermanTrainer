// Browser test: the interface in French. Opens every page with the native language set to French and fails on any
// visible English sentence (bibliography marked lang="en" excepted), then switches the language in the settings.
// Run: node tests/e2e_i18n.js     (needs the 'playwright' package and a Chromium)
const { chromium } = require('playwright');
const results = [], problems = [];
function ok(name, cond, extra) { results.push([cond ? 'ok  ' : 'FAIL', name, extra || '']); if (!cond) problems.push(name + (extra ? ' — ' + extra : '')); }
const EN = new Set('the you your and to of is it this not are be when what how can will then before after each one more from that which with for your only but do does any than less words talk phrase phrases loud'.split(' '));
function englishSentences(text) {
  return text.split(/(?<=[.!?:])\s+|\n+/).map((x) => x.trim()).filter((x) => {
    const w = x.toLowerCase().match(/[a-zäöüßéèàùâêîôûç’']+/g) || [];
    if (w.length < 4) return false;
    const en = w.filter((y) => EN.has(y)).length;
    return en >= 3 && en / w.length > 0.2;
  });
}

(async () => {
  const srv = await require('./serve').start();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-CH' });
  await ctx.addInitScript(() => { if (!localStorage.getItem('sprechstunde/v1')) localStorage.setItem('sprechstunde/v1', JSON.stringify({ v: 1, settings: { mic: 'none', stage: 's1' } })); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(srv.url); await page.waitForTimeout(300);
  ok('language is guessed from the browser (fr-CH → fr)', await page.evaluate(() => SP.lang()) === 'fr');
  const visibleText = () => page.evaluate(() => {
    const v = document.getElementById('view').cloneNode(true);
    v.querySelectorAll('[lang]:not([lang="fr"])').forEach((el) => el.remove());
    v.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
    document.body.append(v); v.style.position = 'absolute'; v.style.left = '-9999px';
    const t = v.innerText; v.remove(); return t;
  });
  const routes = ['#/start', '#/heute', '#/ueben', '#/ueben/karten', '#/ueben/echo/s2', '#/ueben/blitz/s3', '#/ueben/rollenspiel', '#/ueben/rollenspiel/s5-r1',
    '#/ueben/flow', '#/ueben/flow/s4-t1/lang', '#/ueben/argument', '#/ueben/argument/s6-t1', '#/ueben/umschreiben', '#/ueben/luecken', '#/weg', '#/echt',
    '#/methode', '#/mehr', '#/einstellungen'];
  for (const r of routes) {
    await page.evaluate((h) => { location.hash = h; }, r); await page.waitForTimeout(150);
    const left = englishSentences(await visibleText());
    ok('no English left in French mode: ' + r, left.length === 0, left.slice(0, 3).join(' | '));
  }
  // French glosses really appear
  await page.evaluate(() => { location.hash = '#/ueben/karten'; }); await page.waitForTimeout(150);
  ok('Karten show the French meaning', (await page.locator('#view').innerText()).includes('Alors, comment ça va chez toi ?'));
  await page.evaluate(() => { location.hash = '#/ueben/rollenspiel/s1-r1'; }); await page.waitForTimeout(150);
  ok('role-play task is in French', (await page.locator('#view').innerText()).includes('Présente-toi'));
  await page.evaluate(() => { location.hash = '#/echt'; }); await page.waitForTimeout(150);
  ok('AI prompt names French as the native language', (await page.locator('pre.prompt').innerText()).includes('Meine Muttersprache ist Französisch'));
  await page.evaluate(() => { location.hash = '#/ueben/luecken'; }); await page.waitForTimeout(150);
  ok('gap list links a German–French dictionary', (await page.locator('a[href^="https://defr.dict.cc"]').count()) === 1);
  // switch to English in the settings: the page reloads in English
  await page.evaluate(() => { location.hash = '#/einstellungen'; }); await page.waitForTimeout(150);
  await Promise.all([page.waitForEvent('load'), page.locator('#set-lang').selectOption('en')]);
  await page.waitForTimeout(300);
  ok('switching to English reloads in English', (await page.locator('#view').innerText()).includes('Your progress lives in this browser'));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  console.log(results.map((r) => r.join(' ')).join('\n'));
  console.log('\n' + (problems.length ? problems.length + ' PROBLEMS' : 'ALL GOOD') + ' · ' + results.length + ' checks');
  await browser.close(); srv.close();
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.log(results.map((r) => r.join(' ')).join('\n')); console.error('CRASH', e.message); process.exit(2); });
