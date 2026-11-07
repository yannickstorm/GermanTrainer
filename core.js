/* Sprechstunde — pure logic (no DOM, no storage). Loaded by the page and by tests/test_core.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────── dates (local calendar days as 'YYYY-MM-DD') ───────── */
  const pad = (n) => String(n).padStart(2, '0');
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDay(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function addDays(key, n) { const d = parseDay(key); d.setDate(d.getDate() + n); return dayKey(d); }
  function daysBetween(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }

  /* ───────── spaced repetition (Leitner boxes) ─────────
   * box 0 = new or forgotten; intervals in days for boxes 0..5. A phrase counts as "learned" from box 3 (7-day gap). */
  const INTERVALS = [0, 1, 3, 7, 16, 35];
  const LEARNED_BOX = 3;

  function newCard(today) { return { box: 0, due: today, first: today, seen: 0, lapses: 0 }; }

  /** grade: 'again' | 'hard' | 'good'. Returns a new card state. */
  function rate(card, grade, today) {
    const c = Object.assign({}, card || newCard(today));
    c.seen = (c.seen || 0) + 1;
    c.last = today;
    if (grade === 'again') {
      c.lapses = (c.lapses || 0) + 1;
      c.box = 0;
      c.due = today;
    } else if (grade === 'hard') {
      c.due = addDays(today, Math.max(1, Math.round(INTERVALS[c.box] * 0.6)));
    } else {
      c.box = Math.min(INTERVALS.length - 1, c.box + 1);
      c.due = addDays(today, INTERVALS[c.box]);
    }
    return c;
  }

  /** Cards to show today. `order` is the full deck in curriculum order (already starting at the learner's stage). */
  function pickSession(order, cards, today, opts) {
    opts = opts || {};
    const maxDue = opts.maxDue || 20;
    const newLimit = opts.newLimit == null ? 5 : opts.newLimit;
    const introducedToday = order.filter((id) => cards[id] && cards[id].first === today).length;
    const due = order
      .filter((id) => cards[id] && cards[id].due <= today)
      .sort((a, b) => (cards[a].due < cards[b].due ? -1 : cards[a].due > cards[b].due ? 1 : cards[a].box - cards[b].box))
      .slice(0, maxDue);
    const room = Math.max(0, newLimit - introducedToday);
    const fresh = order.filter((id) => !cards[id]).slice(0, room);
    return { due, fresh, introducedToday };
  }

  /** Mastery 0..1 of a list of card ids: each card contributes min(box, LEARNED_BOX) / LEARNED_BOX. */
  function mastery(ids, cards) {
    if (!ids.length) return 0;
    let s = 0;
    ids.forEach((id) => { const c = cards[id]; if (c) s += Math.min(c.box, LEARNED_BOX) / LEARNED_BOX; });
    return s / ids.length;
  }

  /* ───────── text normalisation, matching, diff ───────── */
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .replace(/(\p{L})['’]s\b/gu, '$1 es')     // läuft's -> läuft es, kommt's -> kommt es
      .replace(/['’`´]/g, '')
      .replace(/[„“”"‚‘.,;:!?¡¿()[\]{}…–—\-/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function tokens(s) { const n = norm(s); return n ? n.split(' ') : []; }
  function wordCount(s) { return tokens(s).length; }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** Compile a chunk ("Es stimmt zwar, dass …, aber …", "Das kommt (ganz) darauf an") into ordered regexes. */
  function chunkRegexes(de) {
    return String(de).split(/…|\.\.\./).map((frag) => {
      const parts = [];
      frag.replace(/\(([^)]*)\)|([^()\s]+)/g, (m, opt, word) => {
        if (opt != null) { const t = tokens(opt); if (t.length) parts.push({ t: t.join(' '), opt: true }); }
        else { tokens(word).forEach((t) => parts.push({ t, opt: false })); }
        return m;
      });
      return parts;
    }).filter((p) => p.length).map((parts) =>
      new RegExp(' ' + parts.map((p) => (p.opt ? '(?:' + esc(p.t) + ' )?' : esc(p.t) + ' ')).join(''), 'g'));
  }

  /** Did the transcript contain the fixed parts of the chunk, in order? */
  function chunkUsed(de, transcript) {
    const t = ' ' + norm(transcript) + ' ';
    const res = chunkRegexes(de);
    if (!res.length) return false;
    let pos = 0;
    for (const re of res) {
      re.lastIndex = pos;
      const m = re.exec(t);
      if (!m) return false;
      pos = m.index + m[0].length - 1;
    }
    return true;
  }

  /** Word-level diff of target vs. what was said (LCS). ops: {w, t:'ok'|'miss'|'extra'} */
  function diff(target, said) {
    const a = tokens(target), b = tokens(said);
    const n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ops = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { ops.push({ w: a[i], t: 'ok' }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { ops.push({ w: a[i], t: 'miss' }); i++; }
      else { ops.push({ w: b[j], t: 'extra' }); j++; }
    }
    while (i < n) ops.push({ w: a[i++], t: 'miss' });
    while (j < m) ops.push({ w: b[j++], t: 'extra' });
    const ok = ops.filter((o) => o.t === 'ok').length;
    return { ops, recall: n ? ok / n : 0, ok, total: n };
  }

  function wpm(words, secs) { return secs > 0 ? Math.round((words / secs) * 60) : 0; }

  /** Split a monologue into sentences for shadowing. Keeps "…" inside a sentence. */
  function sentences(text) {
    return (text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text]).map((s) => s.trim()).filter(Boolean);
  }

  /* ───────── progress ───────── */
  function streak(days, today) {
    let n = 0;
    let k = today;
    const active = (key) => days[key] && (days[key].min > 0 || days[key].speak > 0);
    if (!active(k)) k = addDays(k, -1);          // today may still be to come
    while (active(k)) { n++; k = addDays(k, -1); }
    return n;
  }

  /** Progress of one stage, each part 0..1, plus a weighted total. */
  function stageProgress(stage, st) {
    const chunks = mastery(stage.chunks.map((c) => c.id), st.cards || {});
    const rps = stage.roleplays.length ? stage.roleplays.filter((r) => (st.rp || {})[r.id] > 0).length / stage.roleplays.length : 0;
    const flowGoal = Math.min(2, stage.topics.length);
    const flows = flowGoal ? Math.min(1, stage.topics.filter((t) => (st.topics || {})[t.id] > 0).length / flowGoal) : 0;
    const done = ((st.cando || {})[stage.id] || []).length;
    const cando = stage.cando.length ? done / stage.cando.length : 0;
    const total = chunks * 0.45 + rps * 0.2 + flows * 0.2 + cando * 0.15;
    return { chunks, rps, flows, cando, total };
  }
  const READY = 0.7;
  function recommendedStage(stages, st) {
    for (const s of stages) if (stageProgress(s, st).total < READY) return s.id;
    return stages[stages.length - 1].id;
  }

  /* ───────── daily plan ───────── */
  const MAIN_BY_WEEKDAY = { 0: 'echt', 1: 'rollenspiel', 2: 'flow-kurz', 3: 'umschreiben', 4: 'argument', 5: 'rollenspiel', 6: 'flow' };

  function leastDone(items, counts) {
    return items.slice().sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0))[0] || null;
  }

  function dailyPlan(stage, st, weekday) {
    let main = MAIN_BY_WEEKDAY[weekday];
    const hasOpinion = stage.topics.some((t) => t.kind === 'opinion');
    if (main === 'argument' && !hasOpinion) main = 'flow-kurz';
    if (main === 'umschreiben' && stage.n > 3) main = 'rollenspiel';
    const rp = leastDone(stage.roleplays, st.rp || {});
    const topicPool = main === 'argument' ? stage.topics.filter((t) => t.kind === 'opinion') : stage.topics;
    const topic = leastDone(topicPool, st.topics || {});
    const steps = [
      { id: 'echo', title: 'Aufwärmen: Echo', en: 'Warm up by shadowing one short text', min: 3, href: '#/ueben/echo/' + stage.id },
      { id: 'karten', title: 'Redemittel-Karten', en: 'Recall phrases out loud', min: 5, href: '#/ueben/karten' },
      { id: 'blitz', title: 'Blitzreaktionen', en: 'Six quick, spontaneous reactions', min: 3, href: '#/ueben/blitz/' + stage.id }
    ];
    if (main === 'rollenspiel') steps.push({ id: 'main', title: 'Rollenspiel: ' + rp.title, en: 'A short conversation with a model answer', min: 8, href: '#/ueben/rollenspiel/' + rp.id });
    else if (main === 'flow-kurz') steps.push({ id: 'main', title: 'Flow 2·1½·1: ' + topic.title, en: 'Same talk three times, less time each', min: 5, href: '#/ueben/flow/' + topic.id + '/kurz' });
    else if (main === 'flow') steps.push({ id: 'main', title: 'Flow 4·3·2: ' + topic.title, en: 'Same talk three times, less time each', min: 10, href: '#/ueben/flow/' + topic.id + '/lang' });
    else if (main === 'argument') steps.push({ id: 'main', title: 'Argument-Gerüst: ' + topic.title, en: 'Five-step frame for an opinion', min: 6, href: '#/ueben/argument/' + topic.id });
    else if (main === 'umschreiben') steps.push({ id: 'main', title: 'Umschreiben', en: 'Describe words you do not know', min: 6, href: '#/ueben/umschreiben' });
    else steps.push({ id: 'main', title: 'Echtes Gespräch', en: 'This week\'s mission with a real person', min: 10, href: '#/echt' });
    steps.push({ id: 'luecken', title: 'Lücken notieren', en: 'Write down what you could not say', min: 1, href: '#/ueben/luecken' });
    return steps;
  }

  function fmtClock(secs) {
    secs = Math.max(0, Math.round(secs));
    return Math.floor(secs / 60) + ':' + pad(secs % 60);
  }

  return {
    dayKey, parseDay, addDays, daysBetween,
    INTERVALS, LEARNED_BOX, newCard, rate, pickSession, mastery,
    norm, tokens, wordCount, chunkRegexes, chunkUsed, diff, wpm, sentences,
    streak, stageProgress, recommendedStage, READY, dailyPlan, fmtClock
  };
});
