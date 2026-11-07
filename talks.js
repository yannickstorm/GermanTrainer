/* Sprechstunde — longer speaking tasks: Rollenspiel, Flow (4·3·2), Argument-Gerüst. */
(function () {
  'use strict';
  const SP = window.SP, C = SP.C, h = SP.h, icon = SP.icon, state = SP.state, CONTENT = SP.CONTENT, Voice = SP.Voice;
  const practice = (SP.practice = SP.practice || {});
  const stagesFromCurrent = () => {
    const i = Math.max(0, CONTENT.stages.findIndex((s) => s.id === state.settings.stage));
    return CONTENT.stages.slice(i).concat(CONTENT.stages.slice(0, i));
  };

  /* ───────── Rollenspiel ───────── */
  practice.rollenspiel = function (args) {
    return args[0] ? playRoleplay(args[0]) : listRoleplays();
  };

  function listRoleplays() {
    const groups = stagesFromCurrent().map((st) => h('div', { class: 'card' },
      h('div', { class: 'split' }, h('h2', null, 'Stufe ' + st.n + ' · ' + st.title), SP.chip(st.level)),
      h('ul', { class: 'list' }, ...st.roleplays.map((rp) => h('li', null,
        h('div', { class: 'grow' }, h('b', null, rp.title), h('div', { class: 'muted small' }, rp.en)),
        (state.rp[rp.id] || 0) > 0 ? SP.chip((state.rp[rp.id]) + '×', 'good') : null,
        h('a', { class: 'btn small primary', href: '#/ueben/rollenspiel/' + rp.id }, 'Start'))))));
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Rollenspiele', sub: 'Short, realistic conversations. You answer out loud first, then compare with model answers. Repeat a scene after a few days: the second take is always better.', back: '#/ueben', backLabel: 'Üben' }),
      SP.noVoiceBanner(), ...groups);
  }

  function playRoleplay(id) {
    const rp = CONTENT.byId[id];
    if (!rp || !rp.steps) return null;
    const stage = SP.stageOf(rp.stage);
    let i = 0, secs = 0, dead = false;
    const history = [];
    const usedAll = new Set();
    const box = h('div', { class: 'stack' });
    SP.onLeave(() => { dead = true; });

    function step() {
      if (i >= rp.steps.length) return finish();
      const st = rp.steps[i];
      const hints = st.hintIds.map((x) => CONTENT.byId[x]);
      let taken = false, hideNpc = false;
      const chat = h('div', { class: 'chat' });
      history.forEach((hs) => {
        chat.append(h('div', { class: 'bubble npc' }, h('span', { class: 'who' }, 'Gegenüber'), hs.npc));
        chat.append(h('div', { class: 'bubble me' }, h('span', { class: 'who' }, 'Du'), hs.me || '(gesprochen)'));
      });
      const npcText = h('span', null, st.npc);
      const npcBubble = h('div', { class: 'bubble npc' }, h('span', { class: 'who' }, 'Gegenüber'), npcText,
        h('div', { class: 'tools' }, SP.speakBtn(st.npc, { small: true, label: 'Nochmal anhören' }),
          h('button', { type: 'button', class: 'btn small', onclick: () => { hideNpc = !hideNpc; npcText.style.filter = hideNpc ? 'blur(6px)' : ''; } }, 'Text ein/aus')));
      chat.append(npcBubble);
      const modelBox = h('div', { class: 'stack', hidden: true },
        h('div', { class: 'eyebrow' }, 'Modellantworten'),
        ...st.model.map((m) => h('div', { class: 'row nowrap' }, SP.speakBtn(m, { small: true }), h('p', { class: 'sentence grow' }, m))));
      const actions = h('div', { class: 'stack' });
      const rec = SP.recorder({
        chunks: hints, maxSecs: 120, noMicLabel: 'Ich habe geantwortet',
        onDone: (res) => {
          taken = true;
          secs += res.secs || 0;
          hints.forEach((c) => { if (res.transcript && C.chunkUsed(c.de, res.transcript)) usedAll.add(c.id); });
          st._last = res.transcript || '';
          modelBox.hidden = false;
          drawActions();
        }
      });
      function drawActions() {
        SP.fill(actions, 
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn', onclick: () => { rec.reset(); st._last = ''; taken = false; modelBox.hidden = true; drawActions(); } }, icon('refresh'), 'Nochmal versuchen'),
            h('button', { type: 'button', class: 'btn primary grow', onclick: () => { history.push({ npc: st.npc, me: st._last || '' }); i++; step(); } }, i === rp.steps.length - 1 ? 'Fertig' : 'Weiter', icon('right'))));
        if (!taken) SP.fill(actions, h('button', { type: 'button', class: 'btn ghost', onclick: () => { modelBox.hidden = false; SP.fill(actions, h('button', { type: 'button', class: 'btn primary', onclick: () => { history.push({ npc: st.npc, me: '' }); i++; step(); } }, 'Weiter', icon('right'))); } }, 'Modellantwort zeigen, ohne zu antworten'));
      }
      drawActions();
      SP.fill(box, 
        SP.bar(i / rp.steps.length),
        i === 0 ? h('div', { class: 'card tint' }, h('div', { class: 'eyebrow' }, 'Situation'), h('p', null, rp.setting)) : null,
        h('div', { class: 'card' },
          h('div', { class: 'row' }, SP.chip('Schritt ' + (i + 1) + ' von ' + rp.steps.length, 'accent')),
          chat,
          h('div', { class: 'card tint', style: 'padding:14px' }, h('div', { class: 'eyebrow' }, 'Deine Aufgabe'), h('p', null, st.task)),
          h('details', { class: 'acc' }, h('summary', null, 'Hilfe: Redemittel für diese Antwort'),
            h('div', null, ...hints.map((c) => h('div', { class: 'row nowrap' }, SP.speakBtn(c.de, { small: true }), SP.phrase(c.de, 'phrase sm'))))),
          rec.el, modelBox, actions));
      Voice.speak(st.npc).then((ok) => { if (!ok && !dead) { npcText.style.filter = ''; } });
    }

    function finish() {
      state.rp[id] = (state.rp[id] || 0) + 1;
      SP.markDone('main'); SP.count('rp'); SP.save();
      const asr = state.settings.mic === 'asr';
      const allHints = new Set(); rp.steps.forEach((s) => s.hintIds.forEach((x) => allHints.add(x)));
      const next = stage.roleplays.find((r) => r.id !== id) || null;
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Geschafft'),
        h('h2', null, rp.title),
        h('div', { class: 'row' }, SP.chip(rp.steps.length + ' Schritte'), secs > 0 ? SP.chip(SP.clock(secs) + ' gesprochen', 'good') : null, asr ? SP.chip(usedAll.size + ' von ' + allHints.size + ' Redemitteln benutzt', usedAll.size ? 'good' : '') : null),
        h('p', { class: 'muted' }, 'Wiederhole dieses Rollenspiel in zwei, drei Tagen. Task repetition makes the second take faster and more accurate, even with the same words.'),
        h('a', { class: 'btn primary', href: '#/ueben/luecken' }, 'Lücken notieren'),
        h('button', { type: 'button', class: 'btn', onclick: () => { i = 0; secs = 0; history.length = 0; usedAll.clear(); step(); window.scrollTo(0, 0); } }, icon('refresh'), 'Noch einmal spielen'),
        next ? h('a', { class: 'btn', href: '#/ueben/rollenspiel/' + next.id }, 'Nächstes: ' + next.title) : null,
        h('a', { class: 'btn ghost', href: '#/heute' }, 'Weiter im Plan')));
    }
    step();
    return h('div', { class: 'stack' },
      SP.pageHead({ title: rp.title, eyebrow: 'Rollenspiel · Stufe ' + stage.n, sub: rp.en, back: '#/ueben/rollenspiel', backLabel: 'Rollenspiele' }),
      SP.noVoiceBanner(), box);
  }

  /* ───────── Flow: the same talk three times, with less time each round ───────── */
  const PERSONAS = [
    { initial: 'L', name: 'Lena', desc: 'eine Freundin, die viel Zeit hat', reg: 'du' },
    { initial: 'B', name: 'Herr Becker', desc: 'ein Kollege, höflich und aufmerksam', reg: 'Sie' },
    { initial: 'K', name: 'Frau Kaya', desc: 'Radiomoderatorin, du hast nur wenig Sendezeit', reg: 'Sie' }
  ];
  const FLOW = { lang: [240, 180, 120], kurz: [120, 90, 60] };
  const modeLabel = { lang: '4 · 3 · 2 Minuten', kurz: '2 · 1½ · 1 Minuten' };

  practice.flow = function (args) {
    if (args[0] && CONTENT.byId[args[0]] && CONTENT.byId[args[0]].points) return runFlow(CONTENT.byId[args[0]], args[1] === 'lang' ? 'lang' : 'kurz');
    return flowPicker();
  };

  function topicRows(filter, hrefFor) {
    return stagesFromCurrent().map((st) => {
      const ts = st.topics.filter(filter);
      if (!ts.length) return null;
      return h('div', { class: 'card' },
        h('div', { class: 'split' }, h('h2', null, 'Stufe ' + st.n + ' · ' + st.title), SP.chip(st.level)),
        h('ul', { class: 'list' }, ...ts.map((tp) => h('li', { style: 'flex-wrap:wrap' },
          h('div', { class: 'grow' }, h('b', null, tp.title), h('div', { class: 'muted small' }, tp.en)),
          (state.topics[tp.id] || 0) > 0 ? SP.chip((state.topics[tp.id]) + '×', 'good') : null,
          hrefFor(tp)))));
    });
  }

  function flowPicker() {
    const rows = topicRows(() => true, (tp) => h('div', { class: 'row' },
      h('a', { class: 'btn small', href: '#/ueben/flow/' + tp.id + '/kurz' }, 'Kurz'),
      h('a', { class: 'btn small primary', href: '#/ueben/flow/' + tp.id + '/lang' }, 'Lang')));
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Flow: 4 · 3 · 2', sub: 'Give the same talk three times, with less time each round. The ideas stay the same, so you can focus on saying them faster and more smoothly.', back: '#/ueben', backLabel: 'Üben' }),
      h('div', { class: 'card tint' }, h('p', null, h('b', null, 'Lang'), ' = 4, 3, 2 Minuten (≈ 10 Min). ', h('b', null, 'Kurz'), ' = 2, 1½, 1 Minute (≈ 5 Min). Pick a topic you can talk about without looking things up.')),
      ...rows);
  }

  function runFlow(topic, mode) {
    const stage = SP.stageOf(topic.stage);
    const durs = FLOW[mode];
    const box = h('div', { class: 'stack' });
    const rounds = [];
    let notes = '', timer = null, dead = false;
    SP.onLeave(() => { dead = true; clearInterval(timer); });

    const head = SP.pageHead({ title: topic.title, eyebrow: 'Flow · ' + modeLabel[mode], sub: topic.en, back: '#/ueben/flow', backLabel: 'Themen' });

    function prep() {
      const notesEl = h('textarea', { class: 'input', id: 'flow-notes', placeholder: 'Nur Stichwörter, keine ganzen Sätze …', rows: 3 });
      const clock = h('span', { class: 'chip' }, '1:00');
      let prepTimer = null;
      SP.onLeave(() => clearInterval(prepTimer));
      const startPrep = h('button', { type: 'button', class: 'btn small', onclick: () => {
        startPrep.disabled = true; let left = 60; clock.textContent = SP.clock(left);
        prepTimer = setInterval(() => { left--; clock.textContent = SP.clock(left); if (left <= 0) { clearInterval(prepTimer); SP.beep(660, 120); } }, 1000);
      } }, icon('timer'), '60 Sekunden Vorbereitung');
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Vorbereitung'),
        h('ul', { class: 'stack', style: 'margin:0;padding-left:20px' }, ...topic.points.map((p) => h('li', null, p))),
        h('label', { class: 'field', for: 'flow-notes' }, 'Stichwörter', notesEl),
        h('div', { class: 'row' }, startPrep, clock),
        h('p', { class: 'muted small' }, 'Planning for about a minute helps content and structure. Write words, not sentences: you want to speak, not read.'),
        h('div', { class: 'banner info' }, h('span', null, 'Drei Runden, dasselbe Thema, jedes Mal ein anderes Gegenüber und weniger Zeit. Unterbrich dich nicht, um Fehler zu korrigieren: Das machen wir danach.')),
        SP.noVoiceBanner(),
        h('button', { type: 'button', class: 'btn primary', onclick: () => { notes = notesEl.value.trim(); round(0); } }, 'Runde 1 starten', icon('right'))));
    }

    function round(n) {
      clearInterval(timer);
      const dur = durs[n], who = PERSONAS[n];
      let finished = false, started = 0;
      const clock = h('div', { class: 'timer', role: 'timer' }, SP.clock(dur));
      const bar = h('div', { class: 'bar' }, h('i', { style: 'width:100%;transition:none' }));
      const status = h('p', { class: 'muted', style: 'text-align:center' }, 'Tippe auf Start, wenn du bereit bist.');
      const startBtn = h('button', { type: 'button', class: 'btn primary block', onclick: begin }, icon('mic'), 'Start');
      const rec = SP.recorder({ controlled: true, noMicLabel: 'Fertig', onDone: (res) => done(res), idleLabel: 'Start' });
      if (!rec.start) rec.el.hidden = true;      // no microphone: the manual "Fertig" appears once the clock runs
      function begin() {
        if (started) return; started = performance.now();
        startBtn.hidden = true; SP.beep(660, 120); rec.el.hidden = false;
        status.textContent = 'Du sprichst. Weiter, auch wenn es holpert.';
        if (rec.start) rec.start();
        timer = setInterval(() => {
          const left = dur - (performance.now() - started) / 1000;
          clock.textContent = SP.clock(Math.ceil(left));
          clock.classList.toggle('low', left <= 10);
          bar.firstChild.style.width = Math.max(0, (left / dur) * 100) + '%';
          if (left <= 0) { clearInterval(timer); SP.beep(440, 250); if (rec.active) rec.stop(); else done({ none: true, secs: dur, transcript: '' }); }
        }, 200);
      }
      function done(res) {
        if (finished || dead) return; finished = true; clearInterval(timer);
        const spoken = res.none ? Math.min(dur, (performance.now() - started) / 1000 || dur) : res.secs;
        if (res.none) SP.addSpeak(spoken);
        const words = res.transcript ? C.wordCount(res.transcript) : null;
        const r = { secs: Math.round(spoken), words, wpm: words != null ? C.wpm(words, spoken) : null, rating: 0, transcript: res.transcript || '' };
        rounds[n] = r;
        const rate = (v, l) => h('button', { type: 'button', class: 'btn ' + (v === 3 ? 'good' : ''), onclick: () => { r.rating = v; (n < 2 ? round(n + 1) : summary()); } }, l);
        SP.fill(box, h('div', { class: 'card' },
          roundsBar(n + 1),
          h('div', { class: 'eyebrow' }, 'Runde ' + (n + 1) + ' geschafft'),
          h('div', { class: 'stats' },
            h('div', { class: 'stat' }, h('b', null, SP.clock(spoken)), h('span', { class: 'muted small' }, 'gesprochen')),
            h('div', { class: 'stat' }, h('b', null, words != null ? words : '–'), h('span', { class: 'muted small' }, 'Wörter')),
            h('div', { class: 'stat' }, h('b', null, r.wpm != null ? r.wpm : '–'), h('span', { class: 'muted small' }, 'Wörter / Min.'))),
          words == null ? h('p', { class: 'muted small' }, 'Ohne Spracherkennung messen wir nur die Zeit. Du kannst sie in den Einstellungen einschalten (Chrome, Edge, Safari).') : null,
          res.url ? h('audio', { controls: true, src: res.url, 'aria-label': 'Meine Aufnahme' }) : null,
          h('p', { class: 'eyebrow' }, n < 2 ? 'Wie flüssig war es? Dann weiter mit Runde ' + (n + 2) : 'Wie flüssig war es? Dann zur Auswertung'),
          h('div', { class: 'rate' }, rate(1, 'Stockend'), rate(2, 'Mal so, mal so'), rate(3, 'Flüssig'))));
      }
      SP.fill(box, h('div', { class: 'card' },
        roundsBar(n, true),
        h('div', { class: 'persona' }, h('div', { class: 'avatar', 'aria-hidden': 'true' }, who.initial),
          h('div', null, h('div', { class: 'eyebrow' }, 'Runde ' + (n + 1) + ' von 3 · ' + SP.clock(dur) + ' Min.'),
            h('div', null, 'Du erzählst ', h('b', null, who.name), ', ' + who.desc + ' (' + who.reg + ').'))),
        clock, bar, status, startBtn, rec.el,
        notes ? h('details', { class: 'acc', open: n === 0 }, h('summary', null, 'Meine Stichwörter'), h('div', null, h('p', { class: 'sentence', style: 'white-space:pre-wrap' }, notes))) : null,
        h('details', { class: 'acc' }, h('summary', null, 'Leitfragen'), h('div', null, ...topic.points.map((p) => h('p', null, '• ' + p))))));
    }

    function roundsBar(done, running) {
      return h('div', { class: 'rounds', 'aria-hidden': 'true' }, [0, 1, 2].map((k) => h('i', { class: k < done ? 'done' : (running && k === done ? 'now' : '') })));
    }

    function summary() {
      clearInterval(timer);
      const asr = rounds.every((r) => r.wpm != null);
      state.flows.push({ date: SP.today(), topic: topic.id, mode, rounds: rounds.map((r) => ({ secs: r.secs, words: r.words, wpm: r.wpm, rating: r.rating })) });
      state.flows = state.flows.slice(-200);
      state.topics[topic.id] = (state.topics[topic.id] || 0) + 1;
      SP.markDone('main'); SP.count('flow'); SP.save();
      const maxW = Math.max(1, ...rounds.map((r) => r.wpm || 0));
      const gain = asr ? rounds[2].wpm - rounds[0].wpm : null;
      const gaps = [0, 1, 2].map((k) => ({ en: h('input', { class: 'input', id: 'fg-en-' + k, placeholder: k === 0 ? 'Was wolltest du sagen, konntest es aber nicht?' : '', 'aria-label': 'Lücke ' + (k + 1) }), de: h('input', { class: 'input', id: 'fg-de-' + k, placeholder: 'Deutsch, falls bekannt', 'aria-label': 'Deutsch ' + (k + 1) }) }));
      const suggest = stage.chunks.filter((c) => c.fn !== 'Abschluss').slice(0, 4);
      SP.fill(box, 
        h('div', { class: 'card' },
          roundsBar(3),
          h('div', { class: 'eyebrow' }, 'Auswertung'),
          h('h2', null, asr ? (gain > 0 ? 'Von ' + rounds[0].wpm + ' auf ' + rounds[2].wpm + ' Wörter pro Minute' : 'Dein Tempo blieb bei etwa ' + rounds[2].wpm + ' Wörtern pro Minute') : 'Drei Runden geschafft'),
          ...rounds.map((r, k) => h('div', { class: 'meta', style: 'grid-template-columns:5.5rem 1fr 6.5rem' },
            h('span', null, 'Runde ' + (k + 1)),
            SP.bar(asr ? (r.wpm || 0) / maxW : r.rating / 3, k === 2 ? 'good' : ''),
            h('span', null, asr ? r.wpm + ' / Min.' : ['', 'stockend', 'mal so, mal so', 'flüssig'][r.rating]))),
          h('p', { class: 'muted small' }, asr ? 'Normal conversation runs at roughly 100–150 words per minute; do not chase the number, watch the direction. A rising line with similar content means retrieval is getting easier.' : 'Turn on speech recognition in the settings to see words per minute here.')),
        h('div', { class: 'card' },
          h('h2', null, 'Was hat gefehlt?'),
          h('p', { class: 'muted small' }, 'Noticing the gap is where learning happens. Write down up to three things you wanted to say but could not.'),
          ...gaps.map((g, k) => h('div', { class: 'stack' }, h('label', { class: 'field', for: 'fg-en-' + k }, 'Lücke ' + (k + 1), g.en), g.de)),
          h('button', { type: 'button', class: 'btn primary', onclick: () => { let n = 0; gaps.forEach((g) => { if (g.en.value.trim() || g.de.value.trim()) { SP.addGap(g.en.value, g.de.value); n++; } }); SP.toast(n ? n + ' Lücke(n) notiert' : 'Nichts notiert'); SP.nav('heute'); } }, 'Speichern und weiter')),
        h('div', { class: 'card flat' },
          h('div', { class: 'eyebrow' }, 'Das hätte vielleicht geholfen'),
          ...suggest.map((c) => h('div', { class: 'row nowrap' }, SP.speakBtn(c.de, { small: true }), SP.phrase(c.de, 'phrase sm')))),
        h('a', { class: 'btn', href: '#/ueben/flow/' + topic.id + '/' + mode, onclick: () => setTimeout(() => SP.render(), 0) }, icon('refresh'), 'Dasselbe Thema morgen nochmal'));
    }
    prep();
    return h('div', { class: 'stack' }, head, box);
  }

  /* ───────── Argument-Gerüst ───────── */
  const FRAME = [
    { fns: ['Standpunkt'], secs: 20, title: 'Standpunkt', en: 'State your position clearly in one or two sentences.' },
    { fns: ['Grund'], secs: 35, title: 'Hauptgrund', en: 'Give your strongest reason.' },
    { fns: ['Beispiel'], secs: 35, title: 'Beispiel', en: 'Make it concrete: a person, a place, a number.' },
    { fns: ['Zugeständnis', 'Gegenargument'], secs: 40, title: 'Einwand und Antwort', en: 'Admit what speaks against you, then answer it.' },
    { fns: ['Fazit'], secs: 20, title: 'Fazit', en: 'Close with a one-sentence conclusion.' }
  ];
  function frameChunks(fns) {
    const pool = [CONTENT.stages[2], CONTENT.stages[5]].flatMap((st) => st.chunks).filter((c) => fns.includes(c.fn));
    return pool;
  }

  practice.argument = function (args) {
    if (args[0] && CONTENT.byId[args[0]] && CONTENT.byId[args[0]].kind === 'opinion') return runArgument(CONTENT.byId[args[0]]);
    const rows = topicRows((tp) => tp.kind === 'opinion', (tp) => h('a', { class: 'btn small primary', href: '#/ueben/argument/' + tp.id }, 'Start'));
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Argument-Gerüst', sub: 'Five steps, about 2½ minutes, one topic. The frame tells you what comes next, so you can spend your attention on the German.', back: '#/ueben', backLabel: 'Üben' }),
      h('div', { class: 'card tint' }, h('ol', { style: 'margin:0;padding-left:20px' }, ...FRAME.map((f) => h('li', null, h('b', null, f.title), ' · ' + f.secs + ' s')))),
      ...rows);
  };

  function runArgument(topic) {
    const box = h('div', { class: 'stack' });
    let timer = null, dead = false;
    SP.onLeave(() => { dead = true; clearInterval(timer); });
    const allChunks = frameChunks(FRAME.flatMap((f) => f.fns));
    const total = FRAME.reduce((a, f) => a + f.secs, 0);

    function intro() {
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Thema'),
        h('h2', null, topic.title),
        h('ul', { style: 'margin:0;padding-left:20px' }, ...topic.points.map((p) => h('li', null, p))),
        h('p', { class: 'muted small' }, 'Take a position even if you are undecided; this is practice, not a vote. Each step shows phrases that fit it.'),
        h('button', { type: 'button', class: 'btn primary', onclick: run }, 'Start (' + SP.clock(total) + ' Min.)', icon('right'))));
    }

    function run() {
      let k = 0, stepStart = 0, spokenStart = performance.now(), finished = false;
      const clock = h('div', { class: 'timer' }, SP.clock(FRAME[0].secs));
      const bar = h('div', { class: 'bar' }, h('i', { style: 'width:100%;transition:none' }));
      const title = h('h2'), hint = h('p', { class: 'muted' });
      const chips = h('div', { class: 'stack' });
      const dots = h('div', { class: 'rounds' }, FRAME.map(() => h('i')));
      const nextBtn = h('button', { type: 'button', class: 'btn', onclick: () => advance() }, 'Weiter');
      const rec = SP.recorder({ controlled: true, chunks: allChunks, noMicLabel: 'Fertig', onDone: (res) => finish(res), idleLabel: 'Start' });
      if (!rec.start) rec.el.hidden = true;      // no microphone: the "Fertig" button below ends the talk

      function draw() {
        const f = FRAME[k];
        title.textContent = (k + 1) + ' · ' + f.title;
        hint.textContent = f.en;
        SP.fill(chips, ...frameChunks(f.fns).slice(0, 3).map((c) => h('div', { class: 'row nowrap' }, SP.speakBtn(c.de, { small: true }), SP.phrase(c.de, 'phrase sm'))));
        dots.childNodes.forEach((d, j) => { d.className = j < k ? 'done' : (j === k ? 'now' : ''); });
        nextBtn.textContent = k === FRAME.length - 1 ? 'Fertig' : 'Weiter';
        stepStart = performance.now();
        SP.beep(k === 0 ? 660 : 520, 100);
      }
      function advance() {
        if (k >= FRAME.length - 1) { clearInterval(timer); if (rec.active) rec.stop(); else finish({ none: true, secs: (performance.now() - spokenStart) / 1000, transcript: '' }); return; }
        k++; draw();
      }
      function finish(res) {
        if (finished || dead) return; finished = true; clearInterval(timer);
        if (res.none) SP.addSpeak(res.secs);
        const words = res.transcript ? C.wordCount(res.transcript) : null;
        state.topics[topic.id] = (state.topics[topic.id] || 0) + 1;
        SP.markDone('main'); SP.count('arg'); SP.save();
        const used = res.transcript ? allChunks.filter((c) => C.chunkUsed(c.de, res.transcript)) : [];
        SP.fill(box, 
          h('div', { class: 'card' },
            h('div', { class: 'eyebrow' }, 'Geschafft'),
            h('h2', null, topic.title),
            h('div', { class: 'row' }, SP.chip(SP.clock(res.secs) + ' gesprochen', 'good'), words != null ? SP.chip(words + ' Wörter · ' + C.wpm(words, res.secs) + ' / Min.') : null, res.transcript ? SP.chip(used.length + ' Redemittel benutzt', used.length ? 'good' : '') : null),
            res.url ? h('audio', { controls: true, src: res.url, 'aria-label': 'Meine Aufnahme' }) : null,
            res.transcript ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Erkannt'), h('p', { class: 'sentence' }, res.transcript)) : null,
            used.length ? h('div', { class: 'used' }, ...used.map((c) => SP.chip('✓ ' + c.de, 'good'))) : null,
            h('p', { class: 'muted small' }, 'Listen back once. Which step was weakest: position, reason, example, objection or conclusion? Do that step again tomorrow with the same topic.')),
          h('a', { class: 'btn primary', href: '#/ueben/luecken' }, 'Lücken notieren'),
          h('a', { class: 'btn', href: '#/ueben/argument/' + topic.id, onclick: () => setTimeout(() => SP.render(), 0) }, icon('refresh'), 'Dasselbe Thema nochmal'),
          h('a', { class: 'btn ghost', href: '#/heute' }, 'Weiter im Plan'));
      }
      SP.fill(box, h('div', { class: 'card' },
        dots, h('div', { class: 'eyebrow' }, topic.title), title, hint, chips, clock, bar,
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary grow', onclick: function () { this.hidden = true; spokenStart = performance.now(); if (rec.start) rec.start(); draw(); tickStart(); } }, icon('mic'), 'Start'), nextBtn),
        rec.el));
      nextBtn.hidden = true;
      function tickStart() {
        nextBtn.hidden = false;
        timer = setInterval(() => {
          const f = FRAME[k];
          const left = f.secs - (performance.now() - stepStart) / 1000;
          clock.textContent = SP.clock(Math.ceil(Math.max(0, left)));
          clock.classList.toggle('low', left <= 5);
          bar.firstChild.style.width = Math.max(0, (left / f.secs) * 100) + '%';
          if (left <= 0) advance();
        }, 200);
      }
      title.textContent = '1 · ' + FRAME[0].title; hint.textContent = FRAME[0].en;
      SP.fill(chips, ...frameChunks(FRAME[0].fns).slice(0, 3).map((c) => h('div', { class: 'row nowrap' }, SP.speakBtn(c.de, { small: true }), SP.phrase(c.de, 'phrase sm'))));
    }
    intro();
    return h('div', { class: 'stack' }, SP.pageHead({ title: 'Argument-Gerüst', eyebrow: 'Stufe ' + SP.stageOf(topic.stage).n, back: '#/ueben/argument', backLabel: 'Themen' }), box);
  }
})();
