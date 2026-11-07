#!/usr/bin/env node
/* Sprechstunde: logic and content checks. Run: node german-speaking/tests/test_core.js */
'use strict';
const assert = require('assert');
const path = require('path');
const Core = require(path.join(__dirname, '..', 'core.js'));
const CONTENT = require(path.join(__dirname, '..', 'content.js'));

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { console.error('FAIL ' + name + '\n     ' + (e && e.message)); process.exitCode = 1; }
}

/* ───────── dates ───────── */
test('addDays crosses month and year ends', () => {
  assert.strictEqual(Core.addDays('2026-01-31', 1), '2026-02-01');
  assert.strictEqual(Core.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(Core.addDays('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(Core.daysBetween('2026-11-01', '2026-11-08'), 7);
});

/* ───────── spaced repetition ───────── */
test('rate: good moves up a box with growing intervals', () => {
  let c = Core.newCard('2026-11-07');
  c = Core.rate(c, 'good', '2026-11-07');
  assert.strictEqual(c.box, 1); assert.strictEqual(c.due, '2026-11-08');
  c = Core.rate(c, 'good', '2026-11-08');
  assert.strictEqual(c.box, 2); assert.strictEqual(c.due, '2026-11-11');
  c = Core.rate(c, 'good', '2026-11-11');
  assert.strictEqual(c.box, 3); assert.strictEqual(c.due, '2026-11-18');
});
test('rate: box is capped and again resets', () => {
  let c = { box: 5, due: '2026-11-07', first: '2026-10-01', seen: 9, lapses: 0 };
  c = Core.rate(c, 'good', '2026-11-07');
  assert.strictEqual(c.box, 5);
  c = Core.rate(c, 'again', '2026-11-07');
  assert.strictEqual(c.box, 0); assert.strictEqual(c.due, '2026-11-07'); assert.strictEqual(c.lapses, 1);
});
test('rate: hard keeps the box and waits at least a day', () => {
  const c = Core.rate({ box: 0, due: '2026-11-07', first: '2026-11-07', seen: 1, lapses: 0 }, 'hard', '2026-11-07');
  assert.strictEqual(c.box, 0); assert.strictEqual(c.due, '2026-11-08');
  const d = Core.rate({ box: 4, due: '2026-11-07', first: '2026-10-01', seen: 4, lapses: 0 }, 'hard', '2026-11-07');
  assert.strictEqual(d.box, 4); assert.strictEqual(d.due, '2026-11-17');   // 16 * 0.6 ≈ 10
});
test('pickSession: due first, new capped by the daily limit', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const cards = {
    a: { box: 2, due: '2026-11-05', first: '2026-11-01' },
    b: { box: 1, due: '2026-11-09', first: '2026-11-01' },       // not due
    c: { box: 0, due: '2026-11-07', first: '2026-11-07' }        // introduced today
  };
  const s = Core.pickSession(order, cards, '2026-11-07', { newLimit: 3 });
  assert.deepStrictEqual(s.due, ['a', 'c']);
  assert.strictEqual(s.introducedToday, 1);
  assert.deepStrictEqual(s.fresh, ['d', 'e']);                    // 3 - 1 already introduced
});
test('mastery weights boxes up to the learned box', () => {
  const m = Core.mastery(['a', 'b', 'c', 'd'], { a: { box: 3 }, b: { box: 5 }, c: { box: 1 } });
  assert.ok(Math.abs(m - (1 + 1 + 1 / 3 + 0) / 4) < 1e-9);
});

/* ───────── text matching ───────── */
test('norm handles contractions, ß and punctuation', () => {
  assert.strictEqual(Core.norm('Na, wie läuft\'s bei dir?'), 'na wie läuft es bei dir');
  assert.strictEqual(Core.norm('Wie kommt’s?'), 'wie kommt es');
  assert.strictEqual(Core.norm('Das ist groß – wirklich!'), 'das ist gross wirklich');
});
test('chunkUsed: fixed phrase, slots, optional words', () => {
  assert.ok(Core.chunkUsed('Meiner Meinung nach …', 'ich glaube meiner meinung nach ist das gut'));
  assert.ok(!Core.chunkUsed('Meiner Meinung nach …', 'ich glaube meine meinung ist das gut'));
  assert.ok(Core.chunkUsed('Es stimmt zwar, dass …, aber …', 'Es stimmt zwar, dass es teuer ist, aber es lohnt sich'));
  assert.ok(!Core.chunkUsed('Es stimmt zwar, dass …, aber …', 'aber es stimmt zwar, dass es teuer ist'));   // order matters
  assert.ok(Core.chunkUsed('Das kommt (ganz) darauf an', 'das kommt darauf an'));
  assert.ok(Core.chunkUsed('Das kommt (ganz) darauf an', 'das kommt ganz darauf an'));
  assert.ok(Core.chunkUsed("Na, wie läuft's bei dir?", 'Na wie läuft es bei dir'));
  assert.ok(!Core.chunkUsed('Apropos …', 'das ist ein apropos'.replace('apropos', 'aprop')));   // whole words only
});
test('diff reports misses and extras', () => {
  const d = Core.diff('Ich bin gestern nach Hause gegangen', 'ich bin nach Hause gegangen gestern');
  assert.ok(d.recall >= 5 / 6 - 1e-9);
  assert.ok(d.ops.some((o) => o.t === 'extra' || o.t === 'miss'));
  const perfect = Core.diff('Guten Tag!', 'guten tag');
  assert.strictEqual(perfect.recall, 1);
  assert.strictEqual(Core.diff('', 'x').recall, 0);
});
test('wpm and word counts', () => {
  assert.strictEqual(Core.wpm(120, 60), 120);
  assert.strictEqual(Core.wpm(50, 0), 0);
  assert.strictEqual(Core.wordCount('Also, wie soll ich sagen …'), 5);
});
test('sentences keep an ellipsis inside a sentence', () => {
  const s = Core.sentences(CONTENT.stages[1].echo.text);
  assert.ok(s.length >= 4);
  assert.ok(s[0].startsWith('Also, wie soll ich sagen …'));
});

/* ───────── progress ───────── */
test('streak counts back from today or yesterday', () => {
  const days = { '2026-11-05': { min: 5 }, '2026-11-06': { min: 3 }, '2026-11-07': { min: 0, speak: 0 } };
  assert.strictEqual(Core.streak(days, '2026-11-07'), 2);   // today still open
  days['2026-11-07'] = { min: 1 };
  assert.strictEqual(Core.streak(days, '2026-11-07'), 3);
  assert.strictEqual(Core.streak({}, '2026-11-07'), 0);
});
test('stageProgress and recommendedStage', () => {
  const st1 = CONTENT.stages[0];
  const empty = { cards: {}, rp: {}, topics: {}, cando: {} };
  assert.strictEqual(Core.stageProgress(st1, empty).total, 0);
  const cards = {};
  st1.chunks.forEach((c) => { cards[c.id] = { box: 3 }; });
  const full = { cards, rp: { [st1.roleplays[0].id]: 1, [st1.roleplays[1].id]: 1 }, topics: { [st1.topics[0].id]: 1, [st1.topics[1].id]: 2 }, cando: { s1: [0, 1, 2, 3] } };
  assert.ok(Math.abs(Core.stageProgress(st1, full).total - 1) < 1e-9);
  assert.strictEqual(Core.recommendedStage(CONTENT.stages, empty), 's1');
  assert.strictEqual(Core.recommendedStage(CONTENT.stages, full), 's2');
});
test('dailyPlan is complete for every stage and weekday', () => {
  CONTENT.stages.forEach((stage) => {
    for (let wd = 0; wd < 7; wd++) {
      const p = Core.dailyPlan(stage, { rp: {}, topics: {} }, wd);
      assert.deepStrictEqual(p.map((x) => x.id), ['echo', 'karten', 'blitz', 'main', 'luecken']);
      p.forEach((x) => { assert.ok(x.href.startsWith('#/')); assert.ok(x.min > 0); });
      if (p[3].href.includes('rollenspiel/')) assert.ok(CONTENT.byId[p[3].href.split('/').pop()], 'unknown roleplay in ' + p[3].href);
      if (p[3].href.includes('/flow/') || p[3].href.includes('/argument/')) {
        const id = p[3].href.split('/')[3];
        assert.ok(CONTENT.byId[id] && CONTENT.byId[id].kind, 'unknown topic in ' + p[3].href);
      }
    }
  });
});
test('fmtClock', () => { assert.strictEqual(Core.fmtClock(245), '4:05'); assert.strictEqual(Core.fmtClock(-3), '0:00'); });

/* ───────── content integrity ───────── */
const FN_STAGE_36 = ['Standpunkt', 'Grund', 'Beispiel', 'Zugeständnis', 'Gegenargument', 'Fazit'];

test('content: counts and unique ids', () => {
  assert.strictEqual(CONTENT.stages.length, 6);
  const ids = new Set();
  CONTENT.stages.forEach((st) => {
    assert.ok(st.chunks.length >= 12, st.id + ' has too few chunks');
    assert.strictEqual(st.roleplays.length, 2, st.id + ' role-plays');
    assert.strictEqual(st.topics.length, 4, st.id + ' topics');
    assert.strictEqual(st.reactions.length, 5, st.id + ' reactions');
    assert.strictEqual(st.cando.length, 4, st.id + ' can-do');
    assert.strictEqual(st.missions.length, 2, st.id + ' missions');
    [...st.chunks, ...st.roleplays, ...st.topics, ...st.reactions].forEach((x) => {
      assert.ok(!ids.has(x.id), 'duplicate id ' + x.id); ids.add(x.id);
    });
  });
});
test('content: every chunk has German, English and a function label', () => {
  CONTENT.stages.forEach((st) => st.chunks.forEach((c) => {
    assert.ok(c.de && c.en && c.fn, c.id);
    assert.ok(Core.chunkRegexes(c.de).length > 0, 'no fixed words in ' + c.id);
    if (c.ex) assert.ok(Core.chunkUsed(c.de, c.ex), 'example of ' + c.id + ' does not contain its chunk: ' + c.ex);
  }));
});
test('content: role-play model answers use the chunks they hint at', () => {
  const misses = [];
  CONTENT.stages.forEach((st) => st.roleplays.forEach((rp) => rp.steps.forEach((step, i) => {
    assert.ok(step.npc && step.task && step.model.length >= 1, rp.id + ' step ' + (i + 1));
    assert.ok(step.hintIds.length >= 1, rp.id + ' step ' + (i + 1) + ' has no hints');
    step.hintIds.forEach((id) => {
      const ch = CONTENT.byId[id];
      assert.ok(ch && ch.stage === st.id, rp.id + ' step ' + (i + 1) + ' hints at unknown chunk ' + id);
      if (!step.model.some((m) => Core.chunkUsed(ch.de, m))) misses.push(rp.id + ' step ' + (i + 1) + ' → ' + id + ' “' + ch.de + '”');
    });
  })));
  assert.deepStrictEqual(misses, [], 'model answers missing their hinted chunk:\n     ' + misses.join('\n     '));
});
test('content: reactions, topics, echo texts and missions are filled in', () => {
  CONTENT.stages.forEach((st) => {
    st.reactions.forEach((r) => assert.ok(r.say && r.ok.length >= 2, r.id));
    st.topics.forEach((tp) => { assert.ok(tp.title && tp.en && tp.points.length === 3, tp.id); assert.ok(['story', 'describe', 'opinion', 'talk'].includes(tp.kind), tp.id); });
    assert.ok(Core.sentences(st.echo.text).length >= 4, st.id + ' echo too short');
    assert.ok(Core.wordCount(st.echo.text) >= 45 && Core.wordCount(st.echo.text) <= 90, st.id + ' echo length ' + Core.wordCount(st.echo.text));
    assert.ok(st.echo.en, st.id + ' echo translation');
  });
});
test('content: argument stages cover every step of the five-step frame', () => {
  [CONTENT.stages[2], CONTENT.stages[5]].forEach((st) => {
    FN_STAGE_36.forEach((fn) => assert.ok(st.chunks.some((c) => c.fn === fn), st.id + ' lacks a chunk for ' + fn));
    assert.ok(st.topics.some((t) => t.kind === 'opinion'), st.id + ' has no opinion topic');
  });
});
test('content: Umschreiben items', () => {
  assert.ok(CONTENT.circ.length >= 12);
  CONTENT.circ.forEach((w) => {
    assert.ok(['der', 'die', 'das'].includes(w.art), w.word);
    assert.ok(w.en && w.sample && w.id, w.word);
    assert.ok(!Core.norm(w.sample).includes(Core.norm(w.word)), 'sample gives away the word: ' + w.word);
  });
});

console.log('\n' + passed + ' checks passed' + (process.exitCode ? ', some FAILED' : ''));
