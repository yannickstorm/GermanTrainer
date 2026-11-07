/* Sprechstunde — infrastructure: DOM helper, storage, German voice, microphone capture, router, shared widgets. */
(function () {
  'use strict';
  const C = window.Core;
  const SP = (window.SP = { C, CONTENT: window.CONTENT, routes: {}, leave: [], view: null });

  /* ───────── DOM ───────── */
  function add(el, kids) {
    for (const k of kids) {
      if (k == null || k === false) continue;
      if (Array.isArray(k)) add(el, k);
      else el.append(k.nodeType ? k : document.createTextNode(String(k)));
    }
  }
  /** Replace an element's children. Unlike replaceChildren(), skips null/false/undefined instead of printing "null". */
  SP.fill = function (el, ...kids) { el.replaceChildren(); add(el, kids); return el; };
  const h = (SP.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style' || k === 'for' || k === 'role' || k.startsWith('aria-') || k.startsWith('data-')) el.setAttribute(k, v === true ? '' : v);
        else if (k in el) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    add(el, kids);
    return el;
  });
  const ICONS = {
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    speaker: '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    today: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    cards: '<rect x="4" y="7" width="13" height="12" rx="2.5"/><path d="M8 4h11a1 1 0 0 1 1 1v11"/>',
    path: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.5"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/>',
    scale: '<path d="M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z"/>',
    words: '<path d="M4 6h16M4 12h10M4 18h13"/>',
    pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'
  };
  SP.icon = function (name) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  };
  const icon = SP.icon;

  /* ───────── storage ───────── */
  const KEY = 'sprechstunde/v1';
  function defaults() {
    return {
      v: 1,
      settings: { mic: null, rate: 0.9, voice: '', goal: 20, newPerDay: 5, stage: 's1', theme: 'auto' },
      cards: {}, custom: [], days: {}, flows: [], rp: {}, topics: {}, cando: {}, missions: {}, circ: {}, blitz: [], echo: {}, gaps: []
    };
  }
  function merge(raw) {
    const d = defaults();
    const out = Object.assign(d, raw || {});
    out.settings = Object.assign(defaults().settings, (raw && raw.settings) || {});
    return out;
  }
  SP.storageOK = true;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return merge(JSON.parse(raw)); } catch (e) { SP.storageOK = false; }
    return defaults();
  }
  const state = (SP.state = load());
  let saveTimer = null;
  function flush() {
    clearTimeout(saveTimer); saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(SP.state)); } catch (e) { SP.storageOK = false; }
  }
  SP.save = function () { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 120); };
  SP.flush = flush;
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  SP.replaceState = function (obj) { for (const k of Object.keys(SP.state)) delete SP.state[k]; Object.assign(SP.state, merge(obj)); flush(); };
  SP.resetState = function () { SP.replaceState(defaults()); };

  SP.today = () => C.dayKey();
  SP.peekDay = (key) => state.days[key || SP.today()] || { min: 0, speak: 0, done: {}, n: {} };
  SP.day = function (key) {
    key = key || SP.today();
    const d = state.days[key] || (state.days[key] = { min: 0, speak: 0, done: {}, n: {} });
    d.done = d.done || {}; d.n = d.n || {};
    return d;
  };
  SP.markDone = function (kind) { SP.day().done[kind] = true; SP.save(); };
  SP.count = function (kind, n) { const d = SP.day(); d.n[kind] = (d.n[kind] || 0) + (n || 1); SP.save(); };
  SP.addSpeak = function (secs) { if (secs > 0 && secs < 3600) { SP.day().speak += secs; SP.save(); } };
  SP.stage = () => SP.CONTENT.stages.find((s) => s.id === state.settings.stage) || SP.CONTENT.stages[0];
  SP.stageOf = (id) => SP.CONTENT.stages.find((s) => s.id === id) || SP.stage();

  /* all phrase cards, starting at the learner's stage */
  SP.deck = function () {
    const stages = SP.CONTENT.stages;
    const i = Math.max(0, stages.findIndex((s) => s.id === state.settings.stage));
    const ordered = stages.slice(i).concat(stages.slice(0, i));
    const out = [];
    ordered.forEach((s) => s.chunks.forEach((c) => out.push(c)));
    state.custom.forEach((c) => out.push(Object.assign({ fn: 'Meine Lücke', stage: 'custom' }, c)));
    return out;
  };
  SP.cardById = (id) => SP.CONTENT.byId[id] || state.custom.find((c) => c.id === id) || null;

  /* ───────── small helpers ───────── */
  SP.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  SP.clock = C.fmtClock;
  SP.shuffle = function (a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  SP.onLeave = function (fn) { SP.leave.push(fn); };
  SP.bar = (frac, cls) => h('div', { class: 'bar ' + (cls || ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(frac * 100) }, h('i', { style: 'width:' + Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%' }));
  SP.meta = (label, frac, cls) => h('div', { class: 'meta' }, h('span', null, label), SP.bar(frac, cls), h('span', null, Math.round(frac * 100) + ' %'));
  SP.chip = (text, cls) => h('span', { class: 'chip ' + (cls || '') }, text);
  SP.toast = function (msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  };
  SP.copy = async function (text, source) {
    try { await navigator.clipboard.writeText(text); SP.toast('Kopiert'); return; } catch (e) { /* fall through */ }
    if (source) { source.focus(); source.select && source.select(); try { document.execCommand('copy'); SP.toast('Kopiert'); return; } catch (e) { /* ignore */ } }
    SP.toast('Bitte von Hand kopieren');
  };
  SP.pageHead = function (o) {
    return h('div', { class: 'page-head' },
      o.back ? h('a', { class: 'back', href: o.back }, icon('left'), o.backLabel || 'Zurück') : null,
      o.eyebrow ? h('div', { class: 'eyebrow' }, o.eyebrow) : null,
      h('h1', null, o.title),
      o.sub ? h('p', { class: 'muted' }, o.sub) : null);
  };
  /* German text with “…” slots drawn as dotted gaps */
  SP.phrase = function (de, cls) {
    const el = h('span', { class: cls || 'phrase' });
    de.split('…').forEach((part, i) => { if (i) el.append(h('span', { class: 'slot', 'aria-label': 'Lücke' }, '   ')); el.append(part); });
    return el;
  };
  SP.article = (a, word) => h('span', null, h('span', { class: 'art-' + a }, a), ' ', word);
  SP.diffEl = function (ops) {
    const el = h('p', { class: 'diff' });
    ops.forEach((o) => el.append(h('span', { class: o.t }, o.w), ' '));
    return el;
  };
  SP.noVoiceBanner = () => (SP.Voice.supported && SP.Voice.hasGerman()) ? null :
    h('div', { class: 'banner' }, h('span', null, 'Dein Browser hat keine deutsche Stimme, deshalb bleibt das Vorlesen stumm. Du kannst trotzdem alles lesen und laut sprechen. Tipp: Installiere in den Systemeinstellungen eine deutsche Sprachausgabe (Chrome und Edge auf Windows und Android haben meist gute Stimmen). / No German voice found on this device.'));

  /* ───────── German voice (speech synthesis) ───────── */
  const Voice = (SP.Voice = {
    supported: 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined',
    voices: [],
    token: 0,
    init() {
      if (!this.supported) return;
      const load = () => { this.voices = speechSynthesis.getVoices().filter((v) => /^de/i.test(v.lang)); };
      load();
      if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', load);
    },
    hasGerman() { return this.voices.length > 0; },
    pick() {
      const want = state.settings.voice;
      if (want) { const v = this.voices.find((x) => x.voiceURI === want); if (v) return v; }
      const score = (v) => (/de[-_]DE/i.test(v.lang) ? 4 : 0) + (/natural|neural|online/i.test(v.name) ? 5 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/premium|enhanced/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1);
      return this.voices.slice().sort((a, b) => score(b) - score(a))[0] || null;
    },
    clean(text) { return String(text).replace(/…/g, ', ').replace(/\s*,\s*,/g, ',').replace(/\(([^)]*)\)/g, '$1'); },
    /** Resolves true when finished, false if cancelled or unsupported. */
    speak(text, opts) {
      opts = opts || {};
      return new Promise((resolve) => {
        if (!this.supported) return resolve(false);
        try {
          this.cancel();
          const my = ++this.token;
          const u = new SpeechSynthesisUtterance(this.clean(text));
          u.lang = 'de-DE';
          const v = this.pick();
          if (v) { try { u.voice = v; u.lang = v.lang; } catch (e) { /* a stale voice: fall back to the language tag */ } }
          u.rate = opts.rate || state.settings.rate || 0.9;
          let done = false;
          const fin = (ok) => { if (done) return; done = true; clearTimeout(wd); resolve(ok && my === this.token); };
          u.onend = () => fin(true);
          u.onerror = () => fin(false);
          const wd = setTimeout(() => fin(false), 3000 + (String(text).length * 140) / u.rate);
          speechSynthesis.speak(u);
        } catch (e) { resolve(false); }
      });
    },
    cancel() { this.token++; if (this.supported) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } } }
  });
  Voice.init();

  SP.speakBtn = function (text, o) {
    o = o || {};
    const b = h('button', { type: 'button', class: o.cls || 'iconbtn' + (o.small ? ' small' : ''), 'aria-label': o.label || 'Anhören', title: o.label || 'Anhören' }, icon('speaker'));
    b.addEventListener('click', () => { Voice.speak(text, { rate: o.rate }); });
    return b;
  };
  let audioCtx = null;
  SP.beep = function (freq, ms) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq || 880; g.gain.value = 0.06;
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + (ms || 150) / 1000);
    } catch (e) { /* silent */ }
  };

  /* ───────── microphone capture (recording + optional speech recognition) ───────── */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const Capture = (SP.Capture = {
    canRecord: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
    canRecognize: !!SR,
    live: new Set(),
    urls: [],
    pickMime() {
      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
      return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    },
    async start(o) {
      o = o || {};
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const ctl = { startedAt: performance.now(), firstSpeechAt: null, finals: [], interim: '', active: true, asrError: null, result: null };
      let rec = null; const parts = [];
      try {
        const mt = this.pickMime();
        rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
        rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
        rec.start(1000);
      } catch (e) { rec = null; }
      let ac = null, raf = 0;
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
        an.fftSize = 512; src.connect(an);
        const buf = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; }
          if (o.onLevel) o.onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 5));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { ac = null; }
      let recog = null, recogEnded = Promise.resolve();
      if (o.asr && SR) {
        let resolveEnd; recogEnded = new Promise((r) => { resolveEnd = r; });
        recog = new SR();
        recog.lang = 'de-DE'; recog.continuous = true; recog.interimResults = true;
        recog.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) ctl.finals.push(r[0].transcript.trim()); else interim += r[0].transcript;
          }
          ctl.interim = interim;
          if (o.onInterim) o.onInterim((ctl.finals.join(' ') + ' ' + interim).replace(/\s+/g, ' ').trim());
        };
        recog.onspeechstart = () => { if (ctl.firstSpeechAt == null) ctl.firstSpeechAt = performance.now(); };
        recog.onerror = (ev) => { if (ev.error !== 'no-speech' && ev.error !== 'aborted') ctl.asrError = ev.error; };
        recog.onend = () => {
          if (ctl.active && !ctl.asrError) { try { recog.start(); return; } catch (e) { ctl.asrError = 'restart'; } }
          resolveEnd();
        };
        try { recog.start(); } catch (e) { ctl.asrError = 'start'; resolveEnd(); }
      }
      const finish = async (keep) => {
        if (!ctl.active) return ctl.result;
        ctl.active = false;
        const t1 = performance.now();
        if (recog) { try { recog.stop(); } catch (e) { /* ignore */ } }
        await Promise.race([recogEnded, SP.sleep(1500)]);
        if (rec && rec.state !== 'inactive') await new Promise((res) => { rec.onstop = res; try { rec.stop(); } catch (e) { res(); } });
        cancelAnimationFrame(raf);
        if (ac) ac.close().catch(() => {});
        stream.getTracks().forEach((t) => t.stop());
        Capture.live.delete(ctl);
        if (!keep) return null;
        const blob = parts.length ? new Blob(parts, { type: (rec && rec.mimeType) || 'audio/webm' }) : null;
        const url = blob ? URL.createObjectURL(blob) : null;
        if (url) Capture.urls.push(url);
        ctl.result = {
          blob, url,
          transcript: (ctl.finals.join(' ') + ' ' + ctl.interim).replace(/\s+/g, ' ').trim(),
          secs: (t1 - ctl.startedAt) / 1000,
          firstSpeechMs: ctl.firstSpeechAt == null ? null : Math.round(ctl.firstSpeechAt - ctl.startedAt),
          asr: !!recog && !ctl.asrError, asrError: ctl.asrError, none: false
        };
        return ctl.result;
      };
      ctl.stop = () => finish(true);
      ctl.cancel = () => finish(false);
      Capture.live.add(ctl);
      return ctl;
    },
    cancelAll() { Array.from(this.live).forEach((c) => c.cancel()); },
    revokeUrls() { this.urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); }
  });

  /* ───────── recorder widget ─────────
   * o.onDone(result, outEl)  called after every take; result = {url, transcript, secs, firstSpeechMs, asr, none}
   * o.target   string: show a word-level diff of what was said against it
   * o.chunks   [chunk]: show which of these phrases were used
   * o.maxSecs  auto-stop
   * o.idleLabel/noMicLabel   button texts
   */
  SP.recorder = function (o) {
    o = o || {};
    const mode = state.settings.mic || 'none';
    const out = h('div', { class: 'stack' });
    const root = h('div', { class: 'recorder' + (o.compact ? ' compact' : '') + (o.controlled ? ' controlled' : '') });
    const api = { el: root, reset: null, stop: null, active: false, last: null };
    let usable = mode !== 'none' && Capture.canRecord;

    function showResult(res) {
      api.last = res;
      SP.fill(out, );
      if (res.url) out.append(h('audio', { controls: true, src: res.url, 'aria-label': 'Meine Aufnahme' }));
      if (res.asrError && mode === 'asr') out.append(h('div', { class: 'banner' }, h('span', null, 'Die Spracherkennung war nicht erreichbar. Deine Aufnahme ist trotzdem gespeichert. (' + res.asrError + ')')));
      if (res.transcript) {
        if (o.target) {
          const d = C.diff(o.target, res.transcript);
          out.append(h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Erkannt · ' + Math.round(d.recall * 100) + ' % der Wörter'), SP.diffEl(d.ops)));
        } else {
          out.append(h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Erkannt'), h('p', { class: 'sentence' }, res.transcript)));
        }
        if (o.chunks && o.chunks.length) {
          const pills = h('div', { class: 'used' });
          let n = 0;
          o.chunks.forEach((c) => { const used = C.chunkUsed(c.de, res.transcript); if (used) n++; pills.append(h('span', { class: 'chip ' + (used ? 'good' : '') }, (used ? '✓ ' : '') + c.de)); });
          out.append(h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Redemittel benutzt · ' + n + ' von ' + o.chunks.length), pills));
        }
      } else if (res.url && mode === 'asr') {
        out.append(h('p', { class: 'muted small' }, 'Nichts erkannt. Sprich etwas lauter oder prüfe das Mikrofon.'));
      }
      if (o.onDone) o.onDone(res, out);
    }

    if (!usable) {
      const done = h('button', { type: 'button', class: 'btn soft block' }, icon('check'), o.noMicLabel || 'Ich habe laut gesprochen');
      done.addEventListener('click', () => { showResult({ url: null, transcript: '', secs: 0, none: true }); done.disabled = true; });
      SP.fill(root, mode !== 'none' && !Capture.canRecord ? h('p', { class: 'muted small' }, 'Aufnahme ist in diesem Browser nicht möglich. Sprich laut und tippe danach.') : null, done, out);
      api.reset = () => { done.disabled = false; SP.fill(out, ); api.last = null; };
      return api;
    }

    const btn = h('button', { type: 'button', class: 'recbtn', 'aria-label': o.idleLabel || 'Aufnahme starten' }, icon('mic'));
    const bars = Array.from({ length: 18 }, () => h('i'));
    const meter = h('div', { class: 'meter', 'aria-hidden': 'true' }, bars);
    const timeChip = h('span', { class: 'chip' }, '0:00');
    const live = h('div', { class: 'live-text', 'aria-live': 'off' });
    root.append(h('div', { class: 'recbar' }, btn, meter, timeChip), live, out);
    let ctl = null, tick = null, started = 0;

    function setLevel(l) {
      const n = Math.round(l * bars.length);
      bars.forEach((b, i) => { b.style.height = (6 + (i < n ? 6 + Math.abs(Math.sin(i * 1.7)) * 20 : 0)) + 'px'; b.classList.toggle('lit', i < n); });
      meter.classList.add('live');
    }
    function setIdle() {
      btn.classList.remove('on'); SP.fill(btn, icon('mic')); btn.setAttribute('aria-label', o.idleLabel || 'Aufnahme starten');
      meter.classList.remove('live'); bars.forEach((b) => { b.style.height = '6px'; b.classList.remove('lit'); });
      clearInterval(tick);
    }
    async function start() {
      if (SP.activeRecorder && SP.activeRecorder !== api) await SP.activeRecorder.stop();
      Voice.cancel();
      SP.fill(out, ); live.textContent = '';
      try {
        ctl = await Capture.start({ asr: mode === 'asr', onLevel: setLevel, onInterim: (t) => { live.textContent = t; } });
      } catch (e) {
        usable = false;
        SP.fill(out, h('div', { class: 'banner' }, h('span', null, (e && e.name === 'NotAllowedError' ? 'Das Mikrofon ist blockiert. Erlaube es in der Adressleiste deines Browsers und lade die Seite neu. ' : 'Kein Mikrofon gefunden. ') + 'Bis dahin: Sprich laut und tippe danach auf den Knopf darunter.')));
        const done = h('button', { type: 'button', class: 'btn soft block' }, icon('check'), o.noMicLabel || 'Ich habe laut gesprochen');
        done.addEventListener('click', () => { showResult({ url: null, transcript: '', secs: 0, none: true }); done.disabled = true; });
        out.append(done);
        return;
      }
      api.active = true; SP.activeRecorder = api;
      started = performance.now();
      btn.classList.add('on'); SP.fill(btn, icon('stop')); btn.setAttribute('aria-label', 'Aufnahme beenden');
      tick = setInterval(() => {
        const s = (performance.now() - started) / 1000;
        timeChip.textContent = SP.clock(s);
        if (o.maxSecs && s >= o.maxSecs) stop();
      }, 250);
      if (o.onStart) o.onStart();
    }
    async function stop() {
      if (!ctl || !api.active) return api.last;
      const c = ctl; ctl = null; api.active = false;
      if (SP.activeRecorder === api) SP.activeRecorder = null;
      const res = await c.stop();
      setIdle(); live.textContent = '';
      if (res) { SP.addSpeak(res.secs); showResult(res); }
      return res;
    }
    btn.addEventListener('click', () => (api.active ? stop() : start()));
    api.stop = stop;
    api.start = start;
    api.reset = () => { SP.fill(out, ); live.textContent = ''; api.last = null; timeChip.textContent = '0:00'; };
    return api;
  };

  /* ───────── router ───────── */
  const TAB_ICONS = { heute: 'today', ueben: 'cards', weg: 'path', echt: 'chat', mehr: 'more' };
  const TAB_LABELS = { heute: 'Heute', ueben: 'Üben', weg: 'Weg', echt: 'Echt sprechen', mehr: 'Mehr' };
  let tracking = null;

  function runLeave() {
    if (tracking) {
      const mins = Math.min(25, (Date.now() - tracking) / 60000);
      if (mins * 60 >= 15) { SP.day().min += mins; SP.save(); }
      tracking = null;
    }
    // every view starts silent: no speech, no open microphone, no stale recordings
    Voice.cancel(); Capture.cancelAll(); Capture.revokeUrls(); SP.activeRecorder = null;
    const fns = SP.leave.splice(0);
    fns.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
  }
  SP.parts = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  SP.nav = (path) => { location.hash = '#/' + path; };

  function renderTabs(active) {
    const nav = document.getElementById('tabs');
    SP.fill(nav, ...Object.keys(TAB_LABELS).map((k) => {
      const a = h('a', { href: '#/' + k }, icon(TAB_ICONS[k]), TAB_LABELS[k]);
      if (k === active) a.setAttribute('aria-current', 'page');
      return a;
    }));
  }
  SP.render = function () {
    runLeave();
    let parts = SP.parts();
    if (!state.settings.mic && parts[0] !== 'start') { location.replace('#/start'); return; }
    const root = parts[0] || 'heute';
    const tabOf = { heute: 'heute', ueben: 'ueben', weg: 'weg', echt: 'echt', mehr: 'mehr', methode: 'mehr', einstellungen: 'mehr', start: '' };
    const fn = SP.routes[root];
    const main = document.getElementById('view');
    let el;
    try { el = fn ? fn(parts.slice(1)) : null; } catch (e) { console.error(e); el = h('div', { class: 'card' }, h('h2', null, 'Etwas ist schiefgegangen'), h('p', { class: 'muted' }, String(e && e.message || e)), h('a', { class: 'btn', href: '#/heute' }, 'Zur Startseite')); }
    if (!el) el = h('div', { class: 'card' }, h('h2', null, 'Seite nicht gefunden'), h('a', { class: 'btn primary', href: '#/heute' }, 'Zur Startseite'));
    SP.fill(main, el);
    window.scrollTo(0, 0);
    renderTabs(tabOf[root] === undefined ? '' : tabOf[root]);
    const pill = document.getElementById('stage-pill');
    pill.hidden = root === 'start';
    pill.textContent = 'Stufe ' + SP.stage().n + ' · ' + SP.stage().level;
    if (root === 'ueben' || root === 'echt') tracking = Date.now();
    document.title = 'Sprechstunde';
  };
  SP.start = function () {
    window.addEventListener('hashchange', SP.render);
    SP.render();
  };
})();
