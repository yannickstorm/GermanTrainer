/* Sprechstunde — short drills: Karten, Echo, Blitz, Umschreiben, Lücken. */
(function () {
  'use strict';
  const SP = window.SP, C = SP.C, h = SP.h, icon = SP.icon, state = SP.state, CONTENT = SP.CONTENT, Voice = SP.Voice;
  const practice = (SP.practice = SP.practice || {});

  /* ───────── Lücken helpers (used by several exercises) ───────── */
  SP.addGap = function (en, de) {
    en = (en || '').trim(); de = (de || '').trim();
    if (!en && !de) return null;
    const gap = { id: 'gap' + Date.now().toString(36) + Math.floor(Math.random() * 99), en, de, added: SP.today(), cardId: null };
    if (de) SP.gapToCard(gap);
    state.gaps.unshift(gap);
    SP.markDone('luecken'); SP.count('gaps');
    SP.save();
    return gap;
  };
  SP.gapToCard = function (gap) {
    const id = 'g-' + gap.id;
    state.custom.push({ id, de: gap.de, en: gap.en || '(eigene Lücke)', added: gap.added });
    state.cards[id] = C.newCard(SP.today());
    state.cards[id].first = '0000-00-00';     // not counted as "introduced today": the learner wrote it themselves
    gap.cardId = id;
  };

  /* ───────── Karten ───────── */
  practice.karten = function (args) {
    const today = SP.today();
    const order = SP.deck().map((c) => c.id);
    const more = args[0] === 'mehr';
    const base = C.pickSession(order, state.cards, today, { newLimit: 0 });
    const limit = more ? base.introducedToday + 5 : state.settings.newPerDay;
    const sess = C.pickSession(order, state.cards, today, { newLimit: limit });
    const queue = [];
    sess.due.forEach((id) => queue.push({ id, kind: 'recall' }));
    for (let i = 0; i < sess.fresh.length; i += 3) {
      const grp = sess.fresh.slice(i, i + 3);
      grp.forEach((id) => queue.push({ id, kind: 'intro' }));
      grp.forEach((id) => queue.push({ id, kind: 'recall', fresh: true }));
    }
    const head = SP.pageHead({ title: 'Redemittel-Karten', sub: 'Say each phrase out loud before you reveal it. Recalling beats re-reading.', back: '#/ueben', backLabel: 'Üben' });
    if (!queue.length) {
      const unseen = order.filter((id) => !state.cards[id]).length;
      return h('div', { class: 'stack' }, head, h('div', { class: 'card' },
        h('h2', null, 'Alles erledigt für heute'),
        h('p', { class: 'muted' }, 'Keine Karte ist fällig, und die neuen Karten für heute sind schon dran gewesen. Die nächste Wiederholung kommt von selbst.'),
        unseen ? h('a', { class: 'btn primary', href: '#/ueben/karten/mehr' }, 'Noch ' + Math.min(5, unseen) + ' neue Karten lernen') : null,
        h('a', { class: 'btn', href: '#/heute' }, 'Zurück zum Plan')));
    }
    const stats = { good: 0, hard: 0, again: 0 };
    let idx = 0;
    const box = h('div', { class: 'stack' });
    const prog = h('div');

    function summary() {
      SP.markDone('karten'); SP.save();
      const total = stats.good + stats.hard + stats.again;
      const learned = order.filter((id) => state.cards[id] && state.cards[id].box >= C.LEARNED_BOX).length;
      SP.fill(prog, SP.bar(1, 'good'));
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Geschafft'),
        h('h2', null, total ? total + ' Karten geübt' : 'Neue Karten gelesen'),
        h('div', { class: 'row' }, SP.chip(stats.good + ' flüssig', 'good'), SP.chip(stats.hard + ' mit Mühe', 'warn'), SP.chip(stats.again + ' nicht gewusst', stats.again ? 'rec' : '')),
        h('p', { class: 'muted' }, learned + ' Redemittel sind inzwischen fest im Kopf (Box ' + C.LEARNED_BOX + ' oder höher). Was du nicht wusstest, kommt früher wieder.'),
        h('a', { class: 'btn primary', href: '#/heute' }, 'Weiter im Plan'),
        h('a', { class: 'btn', href: '#/ueben/karten/mehr' }, 'Noch 5 neue Karten')));
    }

    function show() {
      if (idx >= queue.length) return summary();
      const item = queue[idx];
      const card = SP.cardById(item.id);
      if (!card) { idx++; return show(); }
      SP.fill(prog, SP.bar(idx / queue.length));
      if (item.kind === 'intro') {
        if (!state.cards[card.id]) { state.cards[card.id] = C.newCard(today); SP.save(); }
        Voice.speak(card.de);
        SP.fill(box, h('div', { class: 'card' },
          h('div', { class: 'row' }, SP.chip('Neu', 'accent'), SP.chip(card.fn || '')),
          SP.phrase(card.de),
          h('div', { class: 'row nowrap' }, SP.speakBtn(card.de), h('p', { class: 'grow' }, card.en)),
          card.ex ? h('div', { class: 'row nowrap' }, SP.speakBtn(card.ex, { small: true }), h('p', { class: 'ex grow' }, card.ex)) : null,
          card.note ? h('p', { class: 'note' }, card.note) : null,
          h('p', { class: 'muted small' }, 'Say it three times out loud, then continue. In a moment you will be asked for it again.'),
          h('button', { class: 'btn primary', type: 'button', onclick: () => { idx++; show(); } }, 'Weiter', icon('right'))));
        return;
      }
      /* recall */
      let revealed = false;
      const answer = h('div', { class: 'stack' });
      const actions = h('div', { class: 'stack' });
      const rec = SP.recorder({ chunks: [card], compact: true, onDone: () => { if (!revealed) reveal(); } });
      function reveal() {
        if (revealed) return; revealed = true;
        Voice.speak(card.de);
        SP.fill(answer, 
          SP.phrase(card.de),
          h('div', { class: 'row' }, SP.speakBtn(card.de, { label: 'Anhören' }), h('span', { class: 'muted small' }, 'Anhören und nachsprechen')),
          card.ex ? h('div', { class: 'row nowrap' }, SP.speakBtn(card.ex, { small: true }), h('p', { class: 'ex grow' }, card.ex)) : null,
          card.note ? h('p', { class: 'note' }, card.note) : null);
        const r = (g, label, sub, cls) => h('button', { type: 'button', class: 'btn ' + cls, onclick: () => rate(g) }, label, h('small', null, sub));
        SP.fill(actions, 
          h('p', { class: 'eyebrow' }, 'Wie war es?'),
          h('div', { class: 'rate' },
            r('again', 'Nicht gewusst', 'heute nochmal', 'again'),
            r('hard', 'Mit Mühe', 'bald wieder', ''),
            r('good', 'Flüssig', 'später wieder', 'good')));
      }
      function rate(g) {
        const wasNew = !state.cards[card.id];
        state.cards[card.id] = C.rate(state.cards[card.id] || C.newCard(today), g, today);
        if (wasNew) state.cards[card.id].first = today;
        stats[g]++;
        if (g === 'again' && (item.retries || 0) < 2) queue.splice(Math.min(queue.length, idx + 4), 0, { id: item.id, kind: 'recall', retries: (item.retries || 0) + 1 });
        SP.count('cards'); SP.save();
        idx++; show();
      }
      actions.append(h('button', { type: 'button', class: 'btn primary', onclick: reveal }, 'Aufdecken'));
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'row' }, SP.chip(item.fresh ? 'Gerade gelernt' : 'Wiederholung', item.fresh ? 'accent' : ''), SP.chip(card.fn || '')),
        h('div', { class: 'eyebrow' }, 'Sag auf Deutsch'),
        h('h2', { style: 'font-size:1.5rem' }, card.en),
        answer, rec.el, actions));
    }
    show();
    return h('div', { class: 'stack' }, head, prog, box);
  };

  /* ───────── Echo (shadowing) ───────── */
  practice.echo = function (args) {
    const stage = SP.stageOf(args[0] || state.settings.stage);
    const sents = C.sentences(stage.echo.text);
    let pass = 1, tempo = state.settings.rate || 0.9, playing = 0;
    const body = h('div', { class: 'stack' });
    const tabs = h('div', { class: 'row' });
    const tempoRow = h('div', { class: 'row' });

    function setTabs() {
      SP.fill(tabs, ...[['1', 'Hören'], ['2', 'Nachsprechen'], ['3', 'Auswendig']].map(([n, l]) =>
        h('button', { type: 'button', class: 'chip ' + (+n === pass ? 'accent' : ''), style: 'border:0;cursor:pointer;min-height:36px;padding:6px 14px', 'aria-pressed': String(+n === pass), onclick: () => { pass = +n; renderPass(); } }, n + ' · ' + l)));
      SP.fill(tempoRow, h('span', { class: 'muted small' }, 'Tempo'), ...[[0.75, 'langsam'], [0.9, 'normal'], [1.0, 'natürlich']].map(([r, l]) =>
        h('button', { type: 'button', class: 'chip ' + (tempo === r ? 'accent' : ''), style: 'border:0;cursor:pointer;min-height:32px', 'aria-pressed': String(tempo === r), onclick: () => { tempo = r; setTabs(); } }, l)));
    }
    async function playAll(rows) {
      const my = ++playing;
      for (let i = 0; i < sents.length; i++) {
        if (my !== playing) return;
        rows.forEach((r, j) => r.classList.toggle('hl', j === i));
        const ok = await Voice.speak(sents[i], { rate: tempo });
        if (!ok && my !== playing) return;
        await SP.sleep(250);
      }
      rows.forEach((r) => r.classList.remove('hl'));
    }
    SP.onLeave(() => { playing++; });

    function renderPass() {
      playing++; Voice.cancel(); setTabs();
      if (pass === 1) {
        const rows = sents.map((s) => h('div', { class: 'row nowrap' }, SP.speakBtn(s, { rate: tempo, small: true }), h('p', { class: 'sentence grow' }, s)));
        SP.fill(body, h('div', { class: 'card' },
          h('div', { class: 'eyebrow' }, 'Schritt 1 · Hören und mitlesen'),
          h('p', { class: 'muted small' }, 'Listen once through while you read. Notice where the voice pauses and which words are stressed.'),
          h('button', { type: 'button', class: 'btn soft', onclick: () => playAll(rows.map((r) => r.querySelector('.sentence'))) }, icon('play'), 'Alles anhören'),
          ...rows,
          h('details', { class: 'acc' }, h('summary', null, 'Übersetzung'), h('div', null, h('p', { class: 'muted' }, stage.echo.en))),
          h('button', { type: 'button', class: 'btn primary', onclick: () => { pass = 2; renderPass(); } }, 'Weiter zu Schritt 2', icon('right'))));
      } else if (pass === 2) {
        const items = sents.map((s) => {
          const rec = SP.recorder({ target: s, compact: true, idleLabel: 'Satz aufnehmen' });
          return h('div', { class: 'stack', style: 'padding:12px 0;border-top:1px solid var(--line)' },
            h('div', { class: 'row nowrap' }, SP.speakBtn(s, { rate: tempo, small: true }), h('p', { class: 'sentence grow' }, s)), rec.el);
        });
        SP.fill(body, h('div', { class: 'card' },
          h('div', { class: 'eyebrow' }, 'Schritt 2 · Hören, dann nachsprechen'),
          h('p', { class: 'muted small' }, 'Press play, then repeat the sentence straight away, copying rhythm and melody, not just the words. Do each sentence twice.'),
          ...items,
          h('button', { type: 'button', class: 'btn primary', onclick: () => { pass = 3; renderPass(); } }, 'Weiter zu Schritt 3', icon('right'))));
      } else {
        const textEl = h('p', { class: 'sentence hide-text' }, stage.echo.text);
        const toggle = h('button', { type: 'button', class: 'btn small', onclick: () => { textEl.classList.toggle('hide-text'); toggle.textContent = textEl.classList.contains('hide-text') ? 'Text zeigen' : 'Text verbergen'; } }, 'Text zeigen');
        const result = h('div', { class: 'stack' });
        const rec = SP.recorder({
          target: stage.echo.text, idleLabel: 'Text aufnehmen',
          noMicLabel: 'Ich habe es erzählt',
          onDone: (res) => {
            const best = res.transcript ? C.diff(stage.echo.text, res.transcript).recall : null;
            state.echo[stage.id] = { last: SP.today(), best: Math.max(best || 0, (state.echo[stage.id] || {}).best || 0) };
            SP.markDone('echo'); SP.count('echo'); SP.save();
            SP.fill(result, h('div', { class: 'banner info' }, h('span', null, best == null
              ? 'Gut gemacht. Beim nächsten Mal versuchst du es mit mehr Tempo und weniger Blick auf den Text.'
              : 'Du hast ' + Math.round(best * 100) + ' % der Wörter wiedergegeben. Wiederhole den Text morgen: beim zweiten Mal wird es spürbar flüssiger.')),
              h('a', { class: 'btn primary', href: '#/heute' }, 'Weiter im Plan'));
          }
        });
        SP.fill(body, h('div', { class: 'card' },
          h('div', { class: 'eyebrow' }, 'Schritt 3 · Aus dem Gedächtnis'),
          h('p', { class: 'muted small' }, 'The text is blurred. Say it in your own words as closely as you can remember. Gaps are fine: keep going.'),
          textEl, toggle, rec.el, result));
      }
    }

    const picker = h('select', { class: 'input', id: 'echo-stage', 'aria-label': 'Text wählen', onchange: (e) => { SP.nav('ueben/echo/' + e.target.value); } },
      CONTENT.stages.map((s) => h('option', { value: s.id, selected: s.id === stage.id }, 'Stufe ' + s.n + ' · ' + s.echo.title)));
    const root = h('div', { class: 'stack' },
      SP.pageHead({ title: 'Echo: ' + stage.echo.title, sub: 'Shadowing: copy a short model text until the rhythm sits. This is a warm-up, not the main workout.', back: '#/ueben', backLabel: 'Üben' }),
      SP.noVoiceBanner(), picker, tempoRow, tabs, body);
    renderPass();
    return root;
  };

  /* ───────── Blitzreaktionen ───────── */
  practice.blitz = function (args) {
    const stage = SP.stageOf(args[0] || state.settings.stage);
    const prev = CONTENT.stages[Math.max(0, stage.n - 2)];
    const pool = SP.shuffle(stage.reactions.concat(prev === stage ? [] : prev.reactions));
    const items = pool.slice(0, 6);
    const SPEAK_WINDOW = 7;
    const results = [];
    const box = h('div', { class: 'stack' });
    let idx = 0, timer = null, dead = false;
    SP.onLeave(() => { dead = true; clearInterval(timer); });

    function intro() {
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, items.length + ' Reaktionen'),
        h('p', null, 'Du hörst einen Satz. Reagiere sofort, in unter drei Sekunden, mit irgendetwas Natürlichem: Überraschung, Nachfrage, Mitgefühl.'),
        h('p', { class: 'muted small' }, 'You hear a sentence and answer straight away. Speed beats perfection here: the goal is to stop freezing. ' + (SP.state.settings.mic === 'asr' ? 'Your reaction time is measured.' : '')),
        SP.noVoiceBanner(),
        h('button', { type: 'button', class: 'btn primary', onclick: () => next() }, 'Los', icon('right'))));
    }
    async function next() {
      if (idx >= items.length) return finish();
      const it = items[idx];
      clearInterval(timer);
      const bar = h('div', { class: 'bar' }, h('i', { style: 'width:100%;transition:none' }));
      const status = h('div', { class: 'eyebrow' }, 'Hör zu …');
      const textP = h('p', { class: 'sentence', hidden: true }, it.say);
      const rec = SP.recorder({
        noMicLabel: 'Ich habe geantwortet',
        onDone: (res) => review(res)
      });
      let phaseDone = false;
      function review(res) {
        if (phaseDone) return; phaseDone = true;
        clearInterval(timer);
        const lat = res && res.firstSpeechMs != null ? res.firstSpeechMs : null;
        const quick = lat != null ? lat <= 3000 : null;
        const rows = it.ok.map((o) => h('div', { class: 'row nowrap' }, SP.speakBtn(o, { small: true }), h('p', { class: 'sentence grow' }, o)));
        const mark = (spont) => { results.push({ spont, lat }); idx++; next(); };
        SP.fill(box, h('div', { class: 'card' },
          h('div', { class: 'row' }, SP.chip((idx + 1) + ' / ' + items.length), lat != null ? SP.chip('Reaktion nach ' + (lat / 1000).toFixed(1).replace('.', ',') + ' s', quick ? 'good' : 'warn') : null),
          h('div', { class: 'eyebrow' }, 'Du hast gehört'), h('p', { class: 'sentence' }, it.say),
          res && res.transcript ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Du hast gesagt'), h('p', { class: 'sentence' }, res.transcript)) : null,
          h('div', { class: 'eyebrow' }, 'Mögliche Reaktionen'), ...rows,
          h('p', { class: 'eyebrow' }, 'Ehrlich: Wie war es?'),
          h('div', { class: 'rate', style: 'grid-template-columns:1fr 1fr' },
            h('button', { type: 'button', class: 'btn good', onclick: () => mark(true) }, 'Spontan'),
            h('button', { type: 'button', class: 'btn', onclick: () => mark(false) }, 'Zu langsam'))));
      }
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'row' }, SP.chip((idx + 1) + ' / ' + items.length), SP.chip('Stufe ' + (it.stage.slice(1)))),
        status, textP,
        h('button', { type: 'button', class: 'btn small', onclick: () => { textP.hidden = !textP.hidden; } }, 'Text zeigen / verbergen'),
        bar, rec.el));
      const heard = await Voice.speak(it.say);
      if (dead || phaseDone) return;
      if (!heard) textP.hidden = false;      // no working voice: show the sentence instead
      status.textContent = 'Sprich jetzt!';
      SP.beep(660, 120);
      const t0 = performance.now();
      if (rec.start) rec.start();
      timer = setInterval(() => {
        const left = Math.max(0, 1 - (performance.now() - t0) / 1000 / SPEAK_WINDOW);
        bar.firstChild.style.width = Math.round(left * 100) + '%';
        if (left <= 0) { clearInterval(timer); if (rec.stop && rec.active) rec.stop(); else review(null); }
      }, 100);
    }
    function finish() {
      const n = results.length, sp = results.filter((r) => r.spont).length;
      const lats = results.map((r) => r.lat).filter((x) => x != null);
      const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : null;
      state.blitz.push({ date: SP.today(), n, spont: sp, avgMs: avg });
      state.blitz = state.blitz.slice(-60);
      SP.markDone('blitz'); SP.count('blitz', n); SP.save();
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Geschafft'),
        h('h2', null, sp + ' von ' + n + ' spontan'),
        avg != null ? h('p', null, 'Durchschnittliche Reaktionszeit: ', h('b', null, (avg / 1000).toFixed(1).replace('.', ',') + ' s'), '. Unter drei Sekunden fühlt sich ein Gespräch flüssig an.') : null,
        h('p', { class: 'muted' }, 'Wiederhole die Runde in ein paar Tagen: Die Sätze sind gemischt, aber die Reaktionen werden vertrauter.'),
        h('a', { class: 'btn primary', href: '#/heute' }, 'Weiter im Plan'),
        h('a', { class: 'btn', href: '#/ueben/blitz/' + stage.id, onclick: () => setTimeout(() => SP.render(), 0) }, 'Noch eine Runde')));
    }
    intro();
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Blitzreaktionen', sub: 'Train spontaneity: react first, polish later.', back: '#/ueben', backLabel: 'Üben' }), box);
  };

  /* ───────── Umschreiben ───────── */
  practice.umschreiben = function () {
    const counts = state.circ;
    const pool = SP.shuffle(CONTENT.circ).sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0)).slice(0, 5);
    let idx = 0, timer = null;
    const results = [];
    const box = h('div', { class: 'stack' });
    SP.onLeave(() => clearInterval(timer));

    function show() {
      clearInterval(timer);
      if (idx >= pool.length) return finish();
      const w = pool[idx];
      let revealed = false;
      const clock = h('div', { class: 'timer' }, '0:30');
      const answer = h('div', { class: 'stack' });
      const actions = h('div', { class: 'stack' });
      const rec = SP.recorder({ onDone: () => reveal() , noMicLabel: 'Ich habe es beschrieben' });
      let left = 30;
      timer = setInterval(() => { left--; clock.textContent = SP.clock(Math.max(0, left)); clock.classList.toggle('low', left <= 5); if (left <= -10) clearInterval(timer); }, 1000);
      function reveal() {
        if (revealed) return; revealed = true; clearInterval(timer);
        const said = rec.last && rec.last.transcript ? C.norm(rec.last.transcript).includes(C.norm(w.word)) : null;
        SP.fill(answer, 
          h('div', { class: 'phrase' }, SP.article(w.art, w.word)),
          h('div', { class: 'row nowrap' }, SP.speakBtn(w.art + ' ' + w.word, { small: true }), h('p', { class: 'muted grow' }, w.en)),
          h('div', { class: 'eyebrow' }, 'Eine mögliche Umschreibung'),
          h('div', { class: 'row nowrap' }, SP.speakBtn(w.sample, { small: true }), h('p', { class: 'ex grow' }, w.sample)),
          said === true ? h('div', { class: 'banner' }, h('span', null, 'Du hast das Wort selbst gesagt. Beim Umschreiben zählt, dass du es ohne das Wort schaffst.')) : (said === false ? h('div', { class: 'banner info' }, h('span', null, 'Du hast das Wort nicht benutzt. Genau das ist die Übung.')) : null));
        const r = (ok, label, sub, cls) => h('button', { type: 'button', class: 'btn ' + cls, onclick: () => { results.push(ok); if (ok !== 'no') counts[w.id] = (counts[w.id] || 0) + 1; SP.count('circ'); SP.save(); idx++; show(); } }, label, h('small', null, sub));
        SP.fill(actions, h('div', { class: 'rate' }, r('no', 'Nicht geklappt', 'bald wieder', 'again'), r('hard', 'Mit Mühe', '', ''), r('yes', 'Hat geklappt', '', 'good')));
      }
      actions.append(h('button', { type: 'button', class: 'btn primary', onclick: reveal }, 'Auflösen'));
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'row' }, SP.chip((idx + 1) + ' / ' + pool.length), SP.chip('30 Sekunden')),
        h('div', { class: 'eyebrow' }, 'Beschreibe dieses Wort, ohne es zu sagen'),
        h('h2', { style: 'font-size:1.8rem' }, w.en),
        h('div', { class: 'used' }, ...CONTENT.circHints.map((t) => SP.chip(t, 'accent'))),
        clock, rec.el, answer, actions));
    }
    function finish() {
      SP.markDone('main'); SP.save();
      const yes = results.filter((r) => r === 'yes').length;
      SP.fill(box, h('div', { class: 'card' },
        h('div', { class: 'eyebrow' }, 'Geschafft'),
        h('h2', null, yes + ' von ' + results.length + ' ohne Probleme umschrieben'),
        h('p', { class: 'muted' }, 'Im echten Gespräch gewinnt, wer um ein Wort herumredet, statt zu verstummen. Notiere neue Wörter, die dir heute gefehlt haben, in der Lückenliste.'),
        h('a', { class: 'btn primary', href: '#/ueben/luecken' }, 'Zur Lückenliste'),
        h('a', { class: 'btn', href: '#/heute' }, 'Weiter im Plan')));
    }
    show();
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Umschreiben', sub: 'A missing word is not a dead end. Describe it, keep talking, look it up afterwards.', back: '#/ueben', backLabel: 'Üben' }), box);
  };

  /* ───────── Lückenliste ───────── */
  practice.luecken = function () {
    const list = h('div', { class: 'stack' });
    const en = h('input', { class: 'input', id: 'gap-en', placeholder: 'z. B. „to get round a word“ oder ein halber Satz', autocomplete: 'off' });
    const de = h('input', { class: 'input', id: 'gap-de', placeholder: 'Deutsch, falls du es schon weißt', autocomplete: 'off' });
    const dict = h('a', { class: 'btn small', href: 'https://www.dict.cc/?s=', target: '_blank', rel: 'noopener' }, 'In dict.cc nachschlagen');
    const dwds = h('a', { class: 'btn small', href: 'https://www.dwds.de/?q=', target: '_blank', rel: 'noopener' }, 'DWDS');
    const upd = () => { const q = encodeURIComponent((en.value || de.value).trim()); dict.href = 'https://www.dict.cc/?s=' + q; dwds.href = 'https://www.dwds.de/?q=' + q; };
    en.addEventListener('input', upd); de.addEventListener('input', upd);

    function draw() {
      if (!state.gaps.length) { SP.fill(list, h('p', { class: 'empty' }, 'Noch keine Einträge. Nach jedem Gespräch oder Flow-Durchgang gehört hier hinein, was du nicht sagen konntest.')); return; }
      SP.fill(list, ...state.gaps.slice(0, 40).map((g) => {
        const deIn = h('input', { class: 'input', placeholder: 'Deutsch ergänzen', 'aria-label': 'Deutsch ergänzen' });
        return h('div', { class: 'card flat' },
          h('div', { class: 'split' }, h('div', { class: 'row' }, g.cardId ? SP.chip('Karte', 'good') : SP.chip('offen', 'warn'), h('span', { class: 'muted small' }, g.added)),
            h('button', { type: 'button', class: 'iconbtn small', 'aria-label': 'Löschen', onclick: () => { state.gaps = state.gaps.filter((x) => x !== g); if (g.cardId) { state.custom = state.custom.filter((c) => c.id !== g.cardId); delete state.cards[g.cardId]; } SP.save(); draw(); } }, icon('trash'))),
          g.en ? h('p', null, g.en) : null,
          g.de ? h('div', { class: 'row nowrap' }, SP.speakBtn(g.de, { small: true }), h('p', { class: 'phrase sm grow' }, g.de)) : h('div', { class: 'row nowrap' }, deIn,
            h('button', { type: 'button', class: 'btn small primary', onclick: () => { if (!deIn.value.trim()) return; g.de = deIn.value.trim(); SP.gapToCard(g); SP.save(); draw(); SP.toast('Als Karte gespeichert'); } }, 'Speichern')));
      }));
    }
    const root = h('div', { class: 'stack' },
      SP.pageHead({ title: 'Lückenliste', sub: 'Pushed output: trying to say something and failing shows you exactly what to learn next.', back: '#/ueben', backLabel: 'Üben' }),
      h('div', { class: 'card' },
        h('h2', null, 'Was konntest du nicht sagen?'),
        h('label', { class: 'field', for: 'gap-en' }, 'Was wolltest du sagen?', en),
        h('label', { class: 'field', for: 'gap-de' }, 'Auf Deutsch', de),
        h('div', { class: 'row' }, dict, dwds),
        h('button', { type: 'button', class: 'btn primary', onclick: () => { if (!en.value.trim() && !de.value.trim()) return; SP.addGap(en.value, de.value); en.value = ''; de.value = ''; upd(); draw(); SP.toast('Notiert'); } }, icon('plus'), 'Hinzufügen'),
        h('p', { class: 'muted small' }, 'Einträge mit deutscher Übersetzung werden automatisch zu Karten und tauchen bei den Wiederholungen auf.')),
      h('button', { type: 'button', class: 'btn', onclick: () => { SP.markDone('luecken'); SP.toast('Okay, für heute abgehakt'); SP.nav('heute'); } }, 'Heute fehlte mir nichts'),
      list);
    draw();
    return root;
  };
})();
