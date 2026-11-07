/* Sprechstunde — pages: start, heute, üben, weg, echt, methode, mehr, einstellungen; then boot. */
(function () {
  'use strict';
  const SP = window.SP, C = SP.C, h = SP.h, icon = SP.icon, state = SP.state, CONTENT = SP.CONTENT, Voice = SP.Voice, Capture = SP.Capture;
  const routes = SP.routes;

  function applyTheme() {
    const t = state.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme();

  const svgNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, ...kids) {
    const el = document.createElementNS(svgNS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    kids.forEach((k) => { if (k != null) el.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return el;
  }

  /* ───────── Start (first run) ───────── */
  routes.start = function () {
    const stageSel = h('select', { class: 'input', id: 'start-stage' }, CONTENT.stages.map((s) => h('option', { value: s.id, selected: s.id === state.settings.stage }, 'Stufe ' + s.n + ' · ' + s.title + ' (' + s.level + ')')));
    const opts = [
      { v: 'asr', title: 'Aufnehmen und Spracherkennung', ok: Capture.canRecord && Capture.canRecognize, text: 'Records you, shows what the recogniser understood, counts words per minute and which phrases you used. Chrome and Edge send the audio to the browser maker\'s speech service for this. Nothing else leaves your device.' },
      { v: 'rec', title: 'Nur aufnehmen', ok: Capture.canRecord, text: 'Records and plays back. No transcript, no measurements. Audio stays on your device.' },
      { v: 'none', title: 'Ohne Mikrofon', ok: true, text: 'You speak out loud and tap when done. Everything works, with fewer measurements.' }
    ];
    const def = opts.find((o) => o.ok) ? opts.find((o) => o.ok).v : 'none';
    const radios = opts.map((o) => h('label', { class: 'choice' },
      h('input', { type: 'radio', name: 'mic', value: o.v, checked: o.v === def, disabled: !o.ok }),
      h('div', null, h('b', null, o.title + (o.ok ? '' : ' (in diesem Browser nicht möglich)')), h('div', { class: 'muted small' }, o.text))));
    const testMsg = h('span', { class: 'muted small' });
    return h('div', { class: 'stack' },
      h('div', { class: 'page-head' }, h('div', { class: 'eyebrow' }, 'Willkommen'), h('h1', null, 'Jeden Tag ein bisschen flüssiger.'),
        h('p', { class: 'muted' }, 'Sprechstunde is a daily speaking workout for German at B2 to C1. About 20 minutes, almost all of it spoken out loud.')),
      h('div', { class: 'card' },
        h('h2', null, 'So funktioniert es'),
        h('ul', { class: 'stack', style: 'margin:0;padding-left:20px' },
          h('li', null, h('b', null, 'Ganze Wörter-Gruppen statt Einzelwörter. '), 'You learn complete phrases (chunks) and recall them out loud on a spaced schedule.'),
          h('li', null, h('b', null, 'Wiederholen, um schneller zu werden. '), 'Give the same talk three times with less time. Fluency comes from repetition, not from new material.'),
          h('li', null, h('b', null, 'Reagieren, nicht übersetzen. '), 'Quick-fire reactions and role-plays train you to answer before you have the perfect sentence.'),
          h('li', null, h('b', null, 'Lücken bemerken. '), 'After each talk you write down what you could not say. Those gaps become your next cards.'))),
      h('div', { class: 'card' }, h('h2', null, 'Wie möchtest du üben?'), h('div', { class: 'stack' }, radios),
        h('p', { class: 'muted small' }, 'The browser asks for the microphone the first time you record, not now. You can change this later in the settings.')),
      h('div', { class: 'card' }, h('h2', null, 'Wo startest du?'),
        h('label', { class: 'field', for: 'start-stage' }, 'Startstufe', stageSel),
        h('p', { class: 'muted small' }, 'Not sure? Take Stufe 1. The phrases are quick to learn, and you move on as soon as the progress bar says you are ready.')),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: async () => { testMsg.textContent = ''; const ok = await Voice.speak('Hallo! Schön, dass du da bist.'); if (!Voice.supported || !Voice.hasGerman()) testMsg.textContent = 'Keine deutsche Stimme gefunden. / No German voice found.'; else if (!ok) testMsg.textContent = ''; } }, icon('speaker'), 'Stimme testen'), testMsg),
      h('button', { type: 'button', class: 'btn primary', onclick: () => {
        state.settings.mic = (document.querySelector('input[name="mic"]:checked') || {}).value || 'none';
        state.settings.stage = stageSel.value;
        SP.save(); SP.flush(); SP.nav('heute');
      } }, 'Los geht\'s', icon('right')));
  };

  /* ───────── Heute ───────── */
  function last7() {
    const out = [];
    for (let i = 6; i >= 0; i--) { const k = C.addDays(SP.today(), -i); out.push({ key: k, min: SP.peekDay(k).min || 0, speak: SP.peekDay(k).speak || 0, wd: C.parseDay(k).getDay() }); }
    return out;
  }
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  function wpmChart(pairs) {
    const W = 320, H = 150, padL = 30, padB = 22, padT = 16;
    const max = Math.max(60, ...pairs.flatMap((p) => [p.r1, p.r3]));
    const top = Math.ceil(max / 20) * 20;
    const y = (v) => padT + (H - padT - padB) * (1 - v / top);
    const slot = (W - padL - 6) / pairs.length, bw = Math.min(14, slot / 2.6);
    const s = svg('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Wörter pro Minute in Runde 1 und Runde 3 der letzten Flow-Übungen' });
    [0, top / 2, top].forEach((v) => {
      s.append(svg('line', { class: 'grid', x1: padL, x2: W - 4, y1: y(v), y2: y(v) }));
      s.append(svg('text', { x: padL - 6, y: y(v) + 4, 'text-anchor': 'end' }, Math.round(v)));
    });
    pairs.forEach((p, i) => {
      const cx = padL + slot * i + slot / 2;
      s.append(svg('rect', { class: 'b1', x: cx - bw - 1.5, y: y(p.r1), width: bw, height: Math.max(1, y(0) - y(p.r1)), rx: 3 }));
      s.append(svg('rect', { class: 'b3', x: cx + 1.5, y: y(p.r3), width: bw, height: Math.max(1, y(0) - y(p.r3)), rx: 3 }));
      s.append(svg('text', { class: 'val', x: cx + 1.5 + bw / 2, y: y(p.r3) - 4, 'text-anchor': 'middle' }, p.r3));
      const d = C.parseDay(p.date);
      s.append(svg('text', { x: cx, y: H - 6, 'text-anchor': 'middle' }, d.getDate() + '.' + (d.getMonth() + 1) + '.'));
    });
    return s;
  }

  routes.heute = function () {
    const today = SP.today(), d = SP.peekDay(today), stage = SP.stage();
    const plan = C.dailyPlan(stage, state, new Date().getDay());
    const doneN = plan.filter((p) => d.done[p.id]).length;
    const next = plan.find((p) => !d.done[p.id]);
    const hour = new Date().getHours();
    const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
    const streak = C.streak(state.days, today);
    const week = last7();
    const weekMin = Math.round(week.reduce((a, x) => a + x.min, 0));
    const goal = state.settings.goal;
    const prog = C.stageProgress(stage, state);
    const nextStage = CONTENT.stages[stage.n] || null;
    const totalMin = plan.reduce((a, p) => a + p.min, 0);
    const maxBar = Math.max(goal, ...week.map((x) => x.min), 1);
    const due = C.pickSession(SP.deck().map((c) => c.id), state.cards, today, { newLimit: state.settings.newPerDay });
    const pairs = state.flows.filter((f) => f.rounds.length === 3 && f.rounds.every((r) => r.wpm != null && r.wpm > 0)).slice(-8).map((f) => ({ date: f.date, r1: f.rounds[0].wpm, r3: f.rounds[2].wpm }));
    const learned = Object.values(state.cards).filter((c) => c.box >= C.LEARNED_BOX).length;

    return h('div', { class: 'stack' },
      h('div', { class: 'page-head' },
        h('div', { class: 'eyebrow' }, new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })),
        h('h1', null, greet + '!'),
        h('p', { class: 'muted' }, doneN === plan.length ? 'Plan erfüllt. Mehr geht immer, aber morgen zählt auch.' : 'Dein Plan für heute braucht etwa ' + totalMin + ' Minuten.')),
      !SP.storageOK ? h('div', { class: 'banner' }, h('span', null, 'Dein Browser speichert nichts (privates Fenster?). Fortschritt geht beim Schließen verloren. Exportiere ihn unter Mehr → Einstellungen.')) : null,
      h('div', { class: 'card' },
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', null, streak), h('span', { class: 'muted small' }, streak === 1 ? 'Tag in Folge' : 'Tage in Folge')),
          h('div', { class: 'stat' }, h('b', null, SP.clock(d.speak || 0)), h('span', { class: 'muted small' }, 'Sprechzeit heute')),
          h('div', { class: 'stat' }, h('b', null, learned), h('span', { class: 'muted small' }, 'Redemittel fest'))),
        h('div', { class: 'week', role: 'img', 'aria-label': 'Übungsminuten der letzten sieben Tage' },
          week.map((x, i) => h('div', { class: i === 6 ? 'today' : '' }, h('i', { class: x.min >= 1 ? 'has' : '', style: 'height:' + Math.max(4, Math.round((x.min / maxBar) * 56)) + 'px' }), h('b', { style: 'font-weight:600' }, WD[x.wd])))),
        h('p', { class: 'muted small' }, weekMin + ' von ' + (goal * 7) + ' Minuten diese Woche')),
      h('div', { class: 'card' },
        h('div', { class: 'split' }, h('h2', null, 'Heute dran'), SP.chip(doneN + ' / ' + plan.length, doneN === plan.length ? 'good' : 'accent')),
        h('ul', { class: 'plan' }, plan.map((p) => h('li', { class: d.done[p.id] ? 'done' : (p === next ? 'next' : '') },
          h('a', { href: p.href },
            h('span', { class: 'tick' }, icon('check')),
            h('span', { class: 'grow' }, h('div', { class: 't' }, p.title + (p.id === 'karten' && !d.done.karten ? ' · ' + due.due.length + ' fällig, ' + due.fresh.length + ' neu' : '')), h('div', { class: 'muted small' }, p.en)),
            h('span', { class: 'chip' }, p.min + ' Min.'),
            h('span', { class: 'go' }, icon('right')))))),
        next ? h('a', { class: 'btn primary', href: next.href }, 'Weiter: ' + next.title.split(':')[0], icon('right')) : h('a', { class: 'btn', href: '#/echt' }, 'Bonus: echtes Gespräch führen')),
      h('div', { class: 'card' },
        h('div', { class: 'split' }, h('div', null, h('div', { class: 'eyebrow' }, 'Aktuelle Stufe · ' + stage.level), h('h2', null, 'Stufe ' + stage.n + ' · ' + stage.title)), h('a', { class: 'btn small', href: '#/weg' }, 'Weg')),
        SP.meta('Redemittel', prog.chunks), SP.meta('Rollenspiele', prog.rps), SP.meta('Flow-Themen', prog.flows), SP.meta('Stufen-Check', prog.cando),
        prog.total >= C.READY && nextStage ? h('div', { class: 'banner info' }, h('span', { class: 'grow' }, 'Du bist bereit für Stufe ' + nextStage.n + ': ' + nextStage.title + '.'), h('button', { type: 'button', class: 'btn small primary', onclick: () => { state.settings.stage = nextStage.id; SP.save(); SP.render(); } }, 'Wechseln')) : null),
      h('div', { class: 'card' },
        h('h2', null, 'Tempo im Flow'),
        pairs.length >= 2
          ? h('div', { class: 'stack' }, wpmChart(pairs), h('div', { class: 'row small muted' }, h('span', null, h('i', { style: 'display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--ink-2);opacity:.4;margin-right:6px' }), 'Runde 1'), h('span', null, h('i', { style: 'display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--accent);margin-right:6px' }), 'Runde 3 · Wörter pro Minute')))
          : h('p', { class: 'empty' }, state.settings.mic === 'asr' ? 'Mach zwei Flow-Übungen, dann erscheint hier dein Tempo in Wörtern pro Minute.' : 'Mit Spracherkennung (Mehr → Einstellungen) misst Sprechstunde deine Wörter pro Minute im Flow.')));
  };

  /* ───────── Üben ───────── */
  routes.ueben = function (parts) {
    if (parts[0]) { const fn = SP.practice[parts[0]]; return fn ? fn(parts.slice(1)) : null; }
    const today = SP.today();
    const sess = C.pickSession(SP.deck().map((c) => c.id), state.cards, today, { newLimit: state.settings.newPerDay });
    const stageId = state.settings.stage;
    const tile = (href, ic, title, text, chip) => h('a', { class: 'tile', href }, h('div', { class: 'split' }, h('div', { class: 'ic' }, icon(ic)), chip ? SP.chip(chip, 'accent') : null), h('b', null, title), h('span', null, text));
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Üben', sub: 'Every exercise ends with you speaking. Pick one, or follow the plan on Heute.' }),
      h('div', { class: 'grid2' },
        tile('#/ueben/karten', 'cards', 'Redemittel-Karten', 'Recall whole phrases out loud, on a spaced schedule.', sess.due.length + sess.fresh.length ? sess.due.length + ' fällig · ' + sess.fresh.length + ' neu' : 'erledigt'),
        tile('#/ueben/echo/' + stageId, 'wave', 'Echo', 'Shadow a short model text to get rhythm and melody.'),
        tile('#/ueben/blitz/' + stageId, 'bolt', 'Blitzreaktionen', 'React to a sentence in under three seconds.'),
        tile('#/ueben/rollenspiel', 'chat', 'Rollenspiele', 'Realistic short conversations with model answers.'),
        tile('#/ueben/flow', 'timer', 'Flow: 4 · 3 · 2', 'Same talk three times, less time each time.'),
        tile('#/ueben/argument', 'scale', 'Argument-Gerüst', 'Five steps to build and deliver an opinion.'),
        tile('#/ueben/umschreiben', 'words', 'Umschreiben', 'Describe a word you do not know and keep talking.'),
        tile('#/ueben/luecken', 'pen', 'Lückenliste', 'Write down what you could not say. It becomes new cards.', state.gaps.length ? String(state.gaps.length) : null)));
  };

  /* ───────── Weg ───────── */
  routes.weg = function () {
    const items = CONTENT.stages.map((st) => {
      const holder = h('div', { class: 'stack' });
      function draw() {
        const prog = C.stageProgress(st, state);
        const cur = state.settings.stage === st.id;
        li.className = (cur ? 'current ' : '') + (prog.total >= C.READY ? 'ready' : '');
        SP.fill(node, prog.total >= C.READY ? icon('check') : String(st.n));
        const checked = state.cando[st.id] || [];
        SP.fill(holder, 
          h('div', { class: 'split' }, h('div', null, h('div', { class: 'eyebrow' }, st.level), h('h2', null, st.title)), cur ? SP.chip('aktuell', 'accent') : null),
          h('p', { class: 'muted' }, st.en),
          SP.bar(prog.total, prog.total >= C.READY ? 'good' : ''),
          h('p', { class: 'small muted' }, Math.round(prog.total * 100) + ' % · bereit ab ' + Math.round(C.READY * 100) + ' %'),
          h('details', { class: 'acc' }, h('summary', null, 'Was du hier lernst'),
            h('div', null, h('p', { class: 'muted' }, st.intro),
              SP.meta('Redemittel', prog.chunks), SP.meta('Rollenspiele', prog.rps), SP.meta('Flow-Themen', prog.flows))),
          h('details', { class: 'acc' }, h('summary', null, 'Stufen-Check: das kann ich'),
            h('div', null, h('p', { class: 'muted small' }, 'Tick a statement only when you did it in a real or practised conversation.'),
              h('ul', { class: 'cando' }, st.cando.map((t, k) => h('li', null, h('label', null,
                h('input', { type: 'checkbox', checked: checked.includes(k), onchange: (e) => { const set = new Set(state.cando[st.id] || []); if (e.target.checked) set.add(k); else set.delete(k); state.cando[st.id] = Array.from(set).sort(); SP.save(); draw(); } }), h('span', null, t))))))),
          cur ? null : h('button', { type: 'button', class: 'btn small', onclick: () => { state.settings.stage = st.id; SP.save(); SP.render(); } }, 'Hier weiterüben'));
        // keep the details the user had open
      }
      const node = h('div', { class: 'node' });
      const li = h('li', null, node, h('div', { class: 'card' }, holder));
      draw();
      return li;
    });
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Dein Weg', sub: 'Six stages from solid B2 to C1 conversation. A stage is "ready" at 70 %: mostly phrases you can recall, plus role-plays, flows and the can-do check. You can always jump ahead or back.' }),
      h('ol', { class: 'path' }, items));
  };

  /* ───────── Echt sprechen ───────── */
  routes.echt = function () {
    const stage = SP.stage();
    const scen = h('select', { class: 'input', id: 'ai-scen' }, CONTENT.scenarios.map((s) => h('option', { value: s }, s)).concat([h('option', { value: '' }, 'Eigenes Thema …')]));
    const custom = h('input', { class: 'input', id: 'ai-custom', placeholder: 'Worüber willst du sprechen?', hidden: true });
    const lvl = h('select', { class: 'input', id: 'ai-level' }, ['B2+', 'C1'].map((l) => h('option', { value: l, selected: l === (stage.n >= 5 ? 'C1' : 'B2+') }, l)));
    const useChunks = h('input', { type: 'checkbox', id: 'ai-chunks', checked: true, style: 'width:22px;height:22px;accent-color:var(--accent)' });
    const out = h('pre', { class: 'prompt' });
    const ta = h('textarea', { class: 'input', id: 'ai-text', hidden: true, rows: 6 });
    function build() {
      const topic = scen.value || custom.value.trim() || 'ein Alltagsgespräch';
      const chunks = stage.chunks.slice(0, 6).map((c) => '„' + c.de + '“').join(', ');
      const text = [
        'Du bist mein Gesprächspartner für Deutsch. Mein Niveau ist B2, ich möchte C1 erreichen.',
        '',
        'Regeln:',
        '- Sprich ausschließlich Deutsch, natürlich und gesprochen (mit Füllwörtern und Partikeln wie „also“, „halt“, „eigentlich“), auf Niveau ' + lvl.value + '.',
        '- Fasse dich kurz (zwei bis drei Sätze) und beende jeden Beitrag mit einer Frage oder einem Haken, damit ich viel sprechen muss.',
        '- Unterbrich mich nicht und korrigiere mich NICHT während des Gesprächs.',
        '- Wenn ich „Hilfe“ sage, gib mir einen Hinweis auf Deutsch, nicht die fertige Antwort.',
        '- Nach etwa zehn Wechseln oder wenn ich „Feedback“ sage: nenne (1) die drei wichtigsten Fehler mit Korrektur, (2) drei Formulierungen, mit denen ich natürlicher geklungen hätte, (3) einen Ausdruck, den ich morgen üben soll.',
        '',
        'Szenario: ' + topic,
        useChunks.checked ? 'Führe das Gespräch so, dass ich Gelegenheit habe, diese Redemittel zu benutzen: ' + chunks + '.' : '',
        '',
        'Beginne jetzt mit deiner ersten Frage.'
      ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
      out.textContent = text; ta.value = text;
    }
    [scen, custom, lvl, useChunks].forEach((el) => el.addEventListener('input', build));
    scen.addEventListener('input', () => { custom.hidden = scen.value !== ''; if (scen.value === '') custom.focus(); });
    custom.hidden = true;
    build();

    const missions = stage.missions.map((m) => h('li', null, h('label', { style: 'display:flex;gap:12px;align-items:flex-start;cursor:pointer' },
      h('input', { type: 'checkbox', checked: !!state.missions[m.id], style: 'width:22px;height:22px;margin-top:2px;accent-color:var(--accent);flex:none', onchange: (e) => { state.missions[m.id] = e.target.checked; if (e.target.checked) { SP.markDone('main'); SP.count('mission'); } SP.save(); } }),
      h('span', null, m.text))));

    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Echt sprechen', sub: 'Everything else on this site is rehearsal. Learning to talk also needs real people who answer back, interrupt and surprise you.' }),
      h('div', { class: 'card' },
        h('div', { class: 'split' }, h('h2', null, 'Mission der Woche'), SP.chip('Stufe ' + stage.n, 'accent')),
        h('ul', { class: 'list' }, missions),
        h('p', { class: 'muted small' }, 'Afterwards: write down 2–3 things you could not say in the Lückenliste.'),
        h('a', { class: 'btn', href: '#/ueben/luecken' }, 'Lücken notieren')),
      h('div', { class: 'card' },
        h('h2', null, 'KI als Gesprächspartner'),
        h('p', { class: 'muted' }, 'Copy this prompt into a voice-capable AI assistant (for example Claude or ChatGPT voice mode) and talk. It will speak German at your level, not correct you mid-sentence and give feedback at the end.'),
        h('label', { class: 'field', for: 'ai-scen' }, 'Szenario', scen), custom,
        h('label', { class: 'field', for: 'ai-level' }, 'Niveau der KI', lvl),
        h('label', { style: 'display:flex;gap:10px;align-items:center;cursor:pointer' }, useChunks, h('span', null, 'Redemittel dieser Stufe einbauen')),
        out, ta,
        h('button', { type: 'button', class: 'btn primary', onclick: () => SP.copy(ta.value, (ta.hidden = false, ta)) }, icon('copy'), 'Prompt kopieren')),
      h('div', { class: 'card' },
        h('h2', null, 'Menschen zum Reden finden'),
        h('ul', { class: 'stack', style: 'margin:0;padding-left:20px' },
          h('li', null, h('b', null, 'Tandem. '), 'Swap 30 minutes German / 30 minutes your language with a partner, in person or online. Agree beforehand that you want to be corrected after, not during.'),
          h('li', null, h('b', null, 'Sprachcafé oder Stammtisch. '), 'Many cities, libraries and adult-education centres (Volkshochschule) run free conversation evenings.'),
          h('li', null, h('b', null, 'Bezahlte Gespräche. '), 'Online tutors for conversation only: tell them to talk less than you and to note your gaps.'),
          h('li', null, h('b', null, 'Alltag. '), 'Ask for the bill in German, ask a colleague about their weekend, join a club: any repeated, low-stakes contact counts.'))),
      h('div', { class: 'card flat' },
        h('h2', null, 'Nach jedem Gespräch'),
        h('ol', { class: 'stack', style: 'margin:0;padding-left:20px' },
          h('li', null, 'Was habe ich gut ausgedrückt? (Notiere einen Satz.)'),
          h('li', null, 'Wo bin ich stecken geblieben, oder auf Englisch ausgewichen?'),
          h('li', null, 'Welches Wort oder welche Wendung brauche ich als Nächstes?'))));
  };

  /* ───────── Methode ───────── */
  const PRINCIPLES = [
    { t: 'Ausgewogenes Training (die vier Stränge)', what: 'Paul Nation\'s "four strands": a balanced course gives roughly equal time to meaning-focused input, meaning-focused output, deliberate language learning and fluency development.', use: 'Each daily plan mixes all four: Echo and Blitz (input and fluency), Karten (deliberate learning), Rollenspiel and Argument-Gerüst (output), Flow (fluency).', ev: 'A planning framework used widely in course design (Nation 2007), not a single experiment. It explains why the plan is varied instead of being all vocabulary or all conversation.' },
    { t: 'Redemittel statt Einzelwörter', what: 'Fluent speech leans on ready-made multi-word units that are retrieved whole, which saves planning time while you talk.', use: 'Every stage is built around 13–16 phrases that do a job in conversation (open, react, disagree, close). The microphone check looks for them in what you say.', ev: 'Several small intervention studies report gains in speaking fluency after explicit chunk teaching (for example Albelihi 2022, Frontiers in Psychology; Mohammadi & Enayati 2018). Studies differ in how they define chunks and fluency, so treat the effect as likely, not precisely known.' },
    { t: 'Abrufen und verteilen', what: 'Recalling an item from memory, with gaps between sessions, beats re-reading it.', use: 'Karten ask for the German phrase from its meaning before showing it. Correct answers return after 1, 3, 7, 16 and 35 days; misses come back today.', ev: 'Kim & Webb (2022, Language Learning) found a medium-to-large benefit of spaced practice in a meta-analysis of L2 studies, with longer gaps helping delayed retention. Most studies used single words; applying the schedule to phrases is an extension.' },
    { t: 'Dieselbe Aufgabe, weniger Zeit (4 · 3 · 2)', what: 'You give the same talk three times, each shorter than the last, to a different imagined listener. Content is fixed, so attention moves to delivery.', use: 'Flow uses 4, 3, 2 minutes (or a 2, 1½, 1 shortcut). With speech recognition it shows your words per minute round by round. Rollenspiele are also meant to be repeated.', ev: 'Maurice (1983) devised it; Nation (1989) reported higher speech rate by the third talk. Tran & Saito (2021, Language Teaching Research) tested adding delayed correction. Task-repetition research mostly finds fluency gains, with mixed results for accuracy and complexity. Evidence comes from small classroom studies.' },
    { t: 'Nachsprechen (Shadowing)', what: 'Repeating a model speaker straight after hearing them to copy rhythm, stress and melody.', use: 'Echo is a three-step warm-up: listen, repeat sentence by sentence, then retell from memory. It is a warm-up, not the main workout.', ev: 'Small studies suggest gains in pronunciation and some fluency measures, while others find it helps listening more than speaking. A 2025 review calls it under-researched for speaking. That is why it gets only a few minutes.' },
    { t: 'Lücken bemerken (Output-Hypothese)', what: 'Trying to say something and failing makes you notice what you are missing.', use: 'After Flow and role-plays you write down what you could not say. Entries with a German version become cards. Corrections come after speaking, never during.', ev: 'Merrill Swain\'s output hypothesis (1985, 1995) names noticing as its best-supported function. Delayed correction after 4/3/2 talks is tested by Tran & Saito (2021).' },
    { t: 'Spontaneität und Umschreiben', what: 'Fluency also means coping when you do not know a word: buying time, describing, rephrasing.', use: 'Blitzreaktionen train fast answers and measure your reaction time with speech recognition. Umschreiben trains describing a word you do not know. Stufe 2 teaches the phrases for both.', ev: 'Communication-strategy training (Dörnyei 1995, TESOL Quarterly) found that such strategies can be taught. The CEFR descriptors for B2 to C1 stress fluency and spontaneity in interaction.' },
    { t: 'Partikeln und Klang', what: 'Words like halt, doch, denn, ja make German sound natural, and are hard to learn from rules alone.', use: 'They appear inside whole sentences in Stufe 2 so you learn when to use them, not definitions.', ev: 'Didactic research (for example Montag 2014; Li 2017) describes them as among the hardest and least taught features. This site\'s approach, short examples in context, is a pragmatic choice.' }
  ];

  routes.methode = function () {
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Warum diese Übungen?', sub: 'What the research says, how each idea is used here, and how strong the evidence is.', back: '#/mehr', backLabel: 'Mehr' }),
      h('div', { class: 'card' }, PRINCIPLES.map((p) => h('details', { class: 'acc' },
        h('summary', null, p.t),
        h('div', null, h('p', null, p.what), h('p', null, h('b', null, 'In Sprechstunde: '), p.use), h('p', { class: 'muted' }, h('b', null, 'Belege: '), p.ev))))),
      h('div', { class: 'card flat' },
        h('h2', null, 'Grenzen'),
        h('ul', { class: 'stack', style: 'margin:0;padding-left:20px' },
          h('li', null, 'Most supporting studies are small, short and in classrooms, mostly for English. The direction is consistent; the size of the effect for you is not known.'),
          h('li', null, 'Speech recognition tells you whether a machine understood you. It does not score pronunciation or grammar.'),
          h('li', null, 'Words per minute include pauses. Compare only with your own earlier sessions.'),
          h('li', null, 'A website cannot answer back like a person. Use "Echt sprechen" every week.'))),
      h('div', { class: 'card flat' },
        h('h2', null, 'Quellen'),
        h('ul', { class: 'stack small', style: 'margin:0;padding-left:20px' },
          h('li', null, 'Nation, I.S.P. (2007). The four strands. Innovation in Language Learning and Teaching, 1(1).'),
          h('li', null, 'Maurice, K. (1983). The fluency workshop. TESOL Newsletter. · Nation, P. (1989). Improving speaking fluency. System, 17(3).'),
          h('li', null, 'Tran, T.L. & Saito, K. (2021). Effects of delayed corrective feedback on 4/3/2 repeated speaking. Language Teaching Research.'),
          h('li', null, 'Kim, S.K. & Webb, S. (2022). The effects of spaced practice on second language learning: a meta-analysis. Language Learning.'),
          h('li', null, 'Swain, M. (1985, 1995). Communicative competence / Three functions of output in second language learning.'),
          h('li', null, 'Dörnyei, Z. (1995). On the teachability of communication strategies. TESOL Quarterly, 29(1).'),
          h('li', null, 'Albelihi, H. (2022). Lexical chunk training and speaking fluency. Frontiers in Psychology.'),
          h('li', null, h('a', { href: 'https://journal.uia.no/index.php/NJLTL/article/view/1139', target: '_blank', rel: 'noopener' }, 'Shadowing as a Language Learning Method: Theory, Research, and Practical Applications'), ' (Nordic Journal of Language Teaching and Learning)'),
          h('li', null, h('a', { href: 'https://tereomaori.tki.org.nz/Teacher-tools/Te-Whakaipurangi-Rauemi/Examples-of-second-language-learning-tasks/4-3-2-Maurice-1983', target: '_blank', rel: 'noopener' }, '4-3-2 (Maurice 1983)'), ' (NZ Ministry of Education task description)'),
          h('li', null, h('a', { href: 'https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2018/1680787989', target: '_blank', rel: 'noopener' }, 'CEFR Companion Volume'), ' (Council of Europe)'),
          h('li', null, h('a', { href: 'https://www.goethe.de/pro/relaunch/prf/materialien/C1_modular/c1-modular_modellsatz.pdf', target: '_blank', rel: 'noopener' }, 'Goethe-Zertifikat C1 modular, Modellsatz'), ' (format of the C1 speaking test)')),
        h('p', { class: 'muted small' }, 'Citations were compiled from web searches; check the originals before relying on specific numbers.')));
  };

  /* ───────── Mehr ───────── */
  routes.mehr = function () {
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Mehr' }),
      h('div', { class: 'grid2' },
        h('a', { class: 'tile', href: '#/methode' }, h('div', { class: 'ic' }, icon('book')), h('b', null, 'Warum diese Übungen?'), h('span', null, 'The research behind the method, and its limits.')),
        h('a', { class: 'tile', href: '#/einstellungen' }, h('div', { class: 'ic' }, icon('gear')), h('b', null, 'Einstellungen'), h('span', null, 'Microphone, voice, goals, backup.'))),
      h('div', { class: 'card flat' },
        h('h2', null, 'Datenschutz'),
        h('p', { class: 'muted' }, 'Progress and gap list are kept in this browser only. Recordings stay in memory and disappear when you leave the exercise. If you turn on speech recognition, Chrome and Edge send the audio of that moment to their speech service; Safari uses Apple\'s. Choose "Nur aufnehmen" or "Ohne Mikrofon" to avoid that.')));
  };

  /* ───────── Einstellungen ───────── */
  routes.einstellungen = function () {
    const s = state.settings;
    const set = (k, v) => { s[k] = v; SP.save(); };
    const voiceOpts = Voice.voices.length
      ? [h('option', { value: '' }, 'Automatisch (beste verfügbare)')].concat(Voice.voices.map((v) => h('option', { value: v.voiceURI, selected: v.voiceURI === s.voice }, v.name + ' (' + v.lang + ')')))
      : [h('option', { value: '' }, 'Keine deutsche Stimme gefunden')];
    const rateOut = h('output', { class: 'chip' }, s.rate.toFixed(2).replace('.', ','));
    const rate = h('input', { type: 'range', id: 'set-rate', min: 0.6, max: 1.1, step: 0.05, value: s.rate, style: 'width:100%;accent-color:var(--accent)', oninput: (e) => { set('rate', +e.target.value); rateOut.textContent = (+e.target.value).toFixed(2).replace('.', ','); } });
    const micOpts = [['asr', 'Aufnehmen und Spracherkennung', Capture.canRecord && Capture.canRecognize], ['rec', 'Nur aufnehmen', Capture.canRecord], ['none', 'Ohne Mikrofon', true]];
    const sel = (id, value, options, onchange) => h('select', { class: 'input', id, onchange: (e) => onchange(e.target.value) }, options.map(([v, l, ok]) => h('option', { value: v, selected: String(v) === String(value), disabled: ok === false }, l + (ok === false ? ' (nicht verfügbar)' : ''))));
    const importMsg = h('p', { class: 'small muted' });
    const resetBtn = h('button', { type: 'button', class: 'btn danger', onclick: () => {
      if (resetBtn.dataset.sure !== '1') { resetBtn.dataset.sure = '1'; resetBtn.textContent = 'Wirklich alles löschen? Nochmal tippen'; return; }
      SP.resetState(); SP.nav('start'); SP.render();
    } }, icon('trash'), 'Fortschritt löschen');
    return h('div', { class: 'stack' },
      SP.pageHead({ title: 'Einstellungen', back: '#/mehr', backLabel: 'Mehr' }),
      h('div', { class: 'card' }, h('h2', null, 'Sprechen'),
        h('label', { class: 'field', for: 'set-mic' }, 'Mikrofon', sel('set-mic', s.mic || 'none', micOpts, (v) => set('mic', v))),
        h('p', { class: 'muted small' }, 'Speech recognition works in Chrome, Edge and Safari and sends audio to the browser maker\'s service. Firefox only offers recording.'),
        h('label', { class: 'field', for: 'set-voice' }, 'Stimme zum Vorlesen', h('select', { class: 'input', id: 'set-voice', onchange: (e) => set('voice', e.target.value) }, voiceOpts)),
        h('label', { class: 'field', for: 'set-rate' }, 'Sprechtempo ', rateOut, rate),
        h('button', { type: 'button', class: 'btn', onclick: () => Voice.speak('Wie läuft es bei dir? Ich hoffe, du hast heute schon etwas gesprochen.') }, icon('speaker'), 'Testen'),
        SP.noVoiceBanner()),
      h('div', { class: 'card' }, h('h2', null, 'Lernen'),
        h('label', { class: 'field', for: 'set-goal' }, 'Tagesziel', sel('set-goal', s.goal, [[10, '10 Minuten'], [20, '20 Minuten'], [30, '30 Minuten'], [45, '45 Minuten']], (v) => set('goal', +v))),
        h('label', { class: 'field', for: 'set-new' }, 'Neue Karten pro Tag', sel('set-new', s.newPerDay, [[3, '3'], [5, '5'], [8, '8'], [12, '12']], (v) => set('newPerDay', +v))),
        h('label', { class: 'field', for: 'set-stage' }, 'Aktuelle Stufe', sel('set-stage', s.stage, CONTENT.stages.map((st) => [st.id, 'Stufe ' + st.n + ' · ' + st.title]), (v) => set('stage', v))),
        h('label', { class: 'field', for: 'set-theme' }, 'Darstellung', sel('set-theme', s.theme, [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']], (v) => { set('theme', v); applyTheme(); }))),
      h('div', { class: 'card' }, h('h2', null, 'Sicherung'),
        h('p', { class: 'muted small' }, 'Your progress lives in this browser. Export it to move to another device or to keep a backup.'),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn', onclick: () => {
            SP.flush();
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: 'sprechstunde-' + SP.today() + '.json' });
            document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
          } }, 'Exportieren'),
          h('label', { class: 'btn', style: 'cursor:pointer' }, 'Importieren',
            h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
              const f = e.target.files[0]; if (!f) return;
              try { const obj = JSON.parse(await f.text()); if (!obj || obj.v !== 1 || typeof obj.cards !== 'object') throw new Error('Kein gültiger Sprechstunde-Export.'); SP.replaceState(obj); applyTheme(); importMsg.textContent = 'Importiert.'; SP.render(); }
              catch (err) { importMsg.textContent = 'Import fehlgeschlagen: ' + err.message; }
            } }))),
        importMsg, resetBtn));
  };

  /* ───────── boot ───────── */
  SP.start();
})();
