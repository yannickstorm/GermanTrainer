// Browser test: correction of what the learner said. The Claude API is intercepted (no real requests, no cost):
// checks the request (model, fallback, structured output, Swiss Standard German, exercise context), the panel,
// the "add to gap list" button, error handling, and that the key never appears in an export.
// Run: node tests/e2e_correction.js     (needs the 'playwright' package and a Chromium)
const { chromium } = require('playwright');
const results = [], problems = [];
function ok(name, cond, extra) { results.push([cond ? 'ok  ' : 'FAIL', name, extra || '']); if (!cond) problems.push(name + (extra ? ' — ' + extra : '')); }

const MOCKS = () => {
  const voice = { name: 'Fake', lang: 'de-CH', voiceURI: 'f', localService: true };
  Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [voice], addEventListener() {}, speak(u) { setTimeout(() => u.onend && u.onend({}), 20); }, cancel() {} }, configurable: true });
  class SR {
    start() { this._on = true; setTimeout(() => this._on && this.onspeechstart && this.onspeechstart(), 200);
      setTimeout(() => { if (!this._on) return; const r = Object.assign([{ transcript: 'ich wohne seit drei monate in diesem haus und ich arbeite bei eine bank' }], { isFinal: true }); this.onresult && this.onresult({ resultIndex: 0, results: [r] }); }, 400); }
    stop() { this._on = false; setTimeout(() => this.onend && this.onend(), 10); }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = SR; window.webkitSpeechRecognition = SR;
};
const CORRECTION = {
  verdict: 'kleine Fehler',
  corrected: 'Ich wohne seit drei Monaten in diesem Haus und arbeite bei einer Bank.',
  errors: [
    { wrong: 'seit drei Monate', right: 'seit drei Monaten', why: 'Après « seit », le datif pluriel prend -n.', kind: 'grammatik' },
    { wrong: 'bei eine Bank', right: 'bei einer Bank', why: '« bei » demande le datif : einer.', kind: 'grammatik' }
  ],
  natural: 'Ich wohne seit drei Monaten hier im Haus und arbeite bei einer Bank.',
  tip: 'Entraîne le datif après seit, bei, mit.'
};
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-expose-headers': '*' };

(async () => {
  const srv = await require('./serve').start();
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  await ctx.addInitScript(MOCKS);
  await ctx.addInitScript(() => { if (!localStorage.getItem('sprechstunde/v1')) localStorage.setItem('sprechstunde/v1', JSON.stringify({ v: 1, settings: { mic: 'asr', stage: 's1', lang: 'fr' } })); });
  const requests = [];
  let mode = 'ok';
  await ctx.route('https://api.anthropic.com/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = req.url();
    if (url.includes('/v1/models')) {
      if (mode === 'badkey') return route.fulfill({ status: 401, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ data: [], has_more: false, first_id: null, last_id: null }) });
    }
    requests.push({ url, headers: await req.allHeaders(), body: JSON.parse(req.postData() || '{}') });
    if (mode === 'badkey') return route.fulfill({ status: 401, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
    return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json', 'request-id': 'req_test' }, body: JSON.stringify({
      id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
      content: [{ type: 'text', text: JSON.stringify(CORRECTION) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 400, output_tokens: 200 } }) });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(150); };
  const text = () => page.locator('#view').innerText();
  const record = async () => { await page.locator('.recbtn').first().click(); await page.waitForTimeout(700); await page.locator('.recbtn.on').first().click(); await page.waitForTimeout(500); };
  await page.goto(srv.url); await page.waitForTimeout(300);

  // 1. no key: a hint instead of a correction, and no request
  await go('#/ueben/rollenspiel/s1-r1');
  await record();
  ok('without a key: hint to add one in the settings', /clé d’API Claude dans les réglages/.test(await text()));
  ok('without a key: nothing is sent', requests.length === 0);

  // 2. a rejected key is reported and not kept
  mode = 'badkey';
  await go('#/einstellungen');
  await page.locator('#set-key').fill('sk-ant-wrong');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.waitForSelector('text=/a été refusée/', { timeout: 5000 });
  ok('a rejected key is reported and removed', !(await page.evaluate(() => SP.correctionReady())));

  // 3. a working key
  mode = 'ok';
  await page.locator('#set-key').fill('sk-ant-test-key');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.waitForSelector('text=/enregistrée et fonctionnelle/', { timeout: 5000 });
  ok('a working key is saved', await page.evaluate(() => SP.correctionReady()));

  // 4. role-play: automatic correction after recording
  await go('#/ueben/rollenspiel/s1-r1');
  await record();
  await page.waitForSelector('.correction >> text=/seit drei Monaten/', { timeout: 8000 });
  const t = await text();
  ok('panel shows the corrected sentence', t.includes('Ich wohne seit drei Monaten in diesem Haus und arbeite bei einer Bank.'));
  ok('panel lists the mistakes with explanations', t.includes('bei einer Bank') && t.includes('« bei » demande le datif'));
  ok('panel shows a more natural version and a tip', /So klingt es natürlich/i.test(t) && t.includes('Entraîne le datif'));
  await page.screenshot({ path: require('path').join(process.env.SHOTS || require('os').tmpdir(), 'correction-rp.png'), fullPage: true });
  const r0 = requests[0];
  ok('one request per recording', requests.length === 1, String(requests.length));
  ok('request uses Claude Opus 5.5', r0 && r0.body.model === 'claude-opus-5-5', r0 && r0.body.model);
  ok('request asks for the default refusal fallback', r0 && r0.body.fallbacks === 'default' && /server-side-fallback-2026-07-01/.test(r0.headers['anthropic-beta'] || ''), r0 && r0.headers['anthropic-beta']);
  ok('request uses structured output', r0 && r0.body.output_config && r0.body.output_config.format && r0.body.output_config.format.type === 'json_schema');
  ok('system prompt: Swiss Standard German, explanations in French', r0 && /Swiss Standard German/.test(r0.body.system) && /in French/.test(r0.body.system));
  const um = r0 && r0.body.messages[0].content;
  ok('user message carries the exercise context and the transcript', typeof um === 'string' && um.includes('Situation:') && um.includes('The other person said:') && um.includes('bei eine bank'), String(um).slice(0, 120));
  ok('the learner\'s key authenticates the request', r0 && (r0.headers['x-api-key'] === 'sk-ant-test-key' || r0.headers['authorization'] === 'Bearer sk-ant-test-key'));

  // 5. add a mistake to the gap list
  const gaps0 = await page.evaluate(() => SP.state.gaps.length);
  await page.locator('.correction button', { hasText: 'Lücke' }).first().click();
  const gaps1 = await page.evaluate(() => SP.state.gaps.length);
  const card = await page.evaluate(() => SP.state.custom[SP.state.custom.length - 1]);
  ok('"Lücke" adds the correction to the gap list as a card', gaps1 === gaps0 + 1 && card && card.de === 'seit drei Monaten', JSON.stringify(card));

  // 6. the same transcript is not corrected twice (cache); retry after an error asks again
  await page.evaluate(() => SP.correct('ich wohne seit drei monate in diesem haus und ich arbeite bei eine bank', { kind: 'x' }));
  const n1 = requests.length;
  await page.evaluate(() => SP.correct('ich wohne seit drei monate in diesem haus und ich arbeite bei eine bank', { kind: 'x' }));
  ok('identical requests are cached', requests.length === n1);

  // 7. other exercises get a panel too
  await go('#/ueben/karten');
  for (let i = 0; i < 6 && !/sag auf deutsch/i.test(await text()); i++) await page.getByRole('button', { name: /^Weiter/ }).first().click();   // skip intros, if any
  await record();
  await page.waitForSelector('.correction', { timeout: 8000 });
  const kreq = requests[requests.length - 1];
  ok('phrase cards: corrected with the expected phrase as context', /Expected phrase:/.test(kreq.body.messages[0].content));
  await go('#/ueben/blitz/s1');
  await page.getByRole('button', { name: 'Los' }).click();
  await page.waitForSelector('.recbtn.on', { timeout: 6000 }); await page.waitForTimeout(600);
  await page.locator('.recbtn.on').first().click();
  await page.waitForSelector('.correction', { timeout: 8000 });
  ok('quick reactions: correction shown in the review', (await page.locator('.correction').count()) === 1);
  await go('#/ueben/flow/s1-t1/kurz');
  await page.getByRole('button', { name: /Runde 1 starten/ }).click();
  await page.getByRole('button', { name: /^Start$/ }).click(); await page.waitForTimeout(900);
  await page.locator('.recbtn.on').first().click();
  await page.waitForSelector('.correction', { timeout: 8000 });
  ok('flow: each round can be corrected', (await page.locator('.correction').count()) === 1);

  // 8. errors are explained and can be retried
  mode = 'badkey';
  await go('#/ueben/rollenspiel/s1-r2');
  await page.evaluate(() => { window.SpeechRecognition.prototype.__x = 1; });
  await record();
  await page.waitForSelector('.correction >> text=/a été refusée/', { timeout: 8000 });
  ok('a rejected key during correction is explained, with a retry button', (await page.locator('.correction button', { hasText: 'Nochmal' }).count()) === 1);

  // 9. turning automatic correction off shows a button instead
  mode = 'ok';
  await page.evaluate(() => { SP.state.settings.autoCorrect = false; });
  const before = requests.length;
  await go('#/ueben/rollenspiel/s2-r1');
  await record();
  ok('manual mode: no request until the button is pressed', requests.length === before && (await page.locator('.correction button', { hasText: 'Korrigieren' }).count()) === 1);
  await page.locator('.correction button', { hasText: 'Korrigieren' }).click();
  await page.waitForSelector('.correction >> text=/seit drei Monaten/', { timeout: 8000 });
  ok('manual mode: the button corrects', requests.length === before + 1);

  // 10. the key never leaves through an export
  const exported = await page.evaluate(() => { SP.flush(); return localStorage.getItem('sprechstunde/v1'); });
  ok('progress export does not contain the key', !exported.includes('sk-ant-test-key'));
  ok('no page errors', errors.length === 0, errors.join(' | '));

  console.log(results.map((r) => r.join(' ')).join('\n'));
  console.log('\n' + (problems.length ? problems.length + ' PROBLEMS' : 'ALL GOOD') + ' · ' + results.length + ' checks');
  await browser.close(); srv.close();
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.log(results.map((r) => r.join(' ')).join('\n')); console.error('CRASH', e.message.split('\n')[0]); process.exit(2); });
