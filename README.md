# Sprechstunde

A daily speaking workout for German at **B2 → C1**. Static website, no build step, no dependencies, no account.
*Sprechstunde* is the German word for office hours, and literally "speaking hour".

The gap it targets: a B2 learner usually reads and writes better than they speak. Reading more does not fix that.
Speaking out loud, repeatedly, in realistic situations does. Every exercise here ends with you talking.

## Run it

```bash
cd german-speaking
python3 -m http.server 8000      # then open http://localhost:8000
```

Any static host works (GitHub Pages, Netlify, a folder on a web server). The microphone needs **HTTPS or localhost**.
Opening `index.html` straight from disk also works, but browsers ask for the microphone more often.

| | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| German voice (read-aloud) | yes (Edge has the best ones) | yes | depends on the OS |
| Recording and playback | yes | yes | yes |
| Speech recognition (transcript, words per minute, phrase check) | yes | yes | no |

The first screen asks how you want to practise: *recording + speech recognition*, *recording only*, or *no microphone*.
Everything works in all three modes; recognition adds measurements.

## What is in it

**Six stages**, each with 13–16 phrases (*Redemittel*), two role-plays, four talk topics, five quick reactions,
one shadowing text, two real-life missions and a can-do check:

| Stage | Level | Focus |
|---|---|---|
| 1 Ins Gespräch kommen | B2 | small talk: open, answer with more than "gut", react, change topic, close |
| 2 Natürlich klingen | B2 | buying time, getting round a missing word, rephrasing, modal particles (*doch, denn, ja mal, halt*) |
| 3 Meinung & Argumentation | B2+ | position, reason, example, concession, conclusion |
| 4 Erzählen | B2+ | anecdotes: sequence, drama, twist, ending, reported speech |
| 5 Heikle Gespräche | B2+ / C1 | declining, complaining, negotiating, apologising, advising |
| 6 Diskutieren & Präsentieren | C1 | abstract discussion (Goethe-C1 style), hedging, a three-minute talk |

**Eight exercises**, and the idea behind each:

| Exercise | What you do | Idea behind it |
|---|---|---|
| **Redemittel-Karten** | See the meaning, say the phrase aloud, then reveal. Leitner boxes at 1/3/7/16/35 days | formulaic sequences, spaced retrieval |
| **Echo** | Listen, repeat sentence by sentence, retell from memory | shadowing (a warm-up only: the evidence for speaking is thin) |
| **Blitzreaktionen** | Hear a sentence, answer within three seconds. Reaction time is measured with recognition | spontaneity, not freezing |
| **Rollenspiele** | Answer the other person out loud, then compare with model answers. Replay later | task-based practice, task repetition |
| **Flow 4·3·2** | Same talk three times (4, 3, 2 min or 2, 1½, 1), to three different imagined listeners. Words per minute per round | Maurice 1983, Nation 1989 |
| **Argument-Gerüst** | Five timed steps with matching phrases | scaffolded argumentation |
| **Umschreiben** | Describe a word you do not know, without saying it | communication strategies |
| **Lückenliste** | Write down what you could not say; entries with a German version become cards | pushed output and noticing (Swain) |

**Heute** builds a ~20-minute plan from them (warm-up, cards, reactions, one main task that rotates by weekday,
gap list), with streak, speaking time, a words-per-minute chart and stage progress.
**Weg** shows the six stages with progress (phrases recalled, role-plays done, flow topics, can-do ticks); a stage
counts as ready at 70 %, but nothing is locked.
**Echt sprechen** has weekly missions with real people, a prompt generator for a voice-capable AI conversation
partner (German only, no correction mid-sentence, feedback at the end), and tips for finding people to talk to.
**Methode** explains each idea, how it is used, and how strong the evidence is. Short version: the direction is
consistent, the studies are small. The page also lists the limits of the site.

Corrections come after speaking, never during. Speech recognition tells you whether a machine understood you; it
does not score pronunciation or grammar.

## Your data

Progress, settings and the gap list live in this browser's `localStorage` (key `sprechstunde/v1`). Settings →
*Sicherung* exports and imports a JSON backup. Recordings stay in memory and are discarded when you leave an exercise.
With speech recognition on, Chrome and Edge send the audio of that moment to their speech service and Safari to
Apple's; choose recording-only or no microphone to avoid that. The only other network requests are Google Fonts
(optional; fallbacks are built in) and links you click.

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css` | shell and design (light/dark, phone first, tab bar on phones, top bar on desktop) |
| `content.js` | all learning content: stages, phrases, role-plays, topics, reactions, texts, missions |
| `core.js` | pure logic: spaced repetition, phrase matching, word diff, plan, progress. Loaded by the page and by Node tests |
| `lib.js` | DOM helper, storage, German voice, microphone capture, recorder widget, router |
| `drills.js` | Karten, Echo, Blitz, Umschreiben, Lückenliste |
| `talks.js` | Rollenspiele, Flow, Argument-Gerüst |
| `pages.js` | start, Heute, Üben, Weg, Echt sprechen, Methode, Einstellungen, boot |
| `tests/` | see below |

## Adding or changing content

Edit `content.js`. IDs come from list position (`s2-c5`, `s3-r1` …), and a learner's saved progress points at them, so
**only append to a list; never reorder or delete**. Phrase notation: `…` is a slot the speaker fills, `(word)` is
optional. Keep one phrase per entry, and keep the fixed words contiguous: the speech check looks for them in order.
Role-play steps name the phrases they hint at (1-based positions in the stage's phrase list).

## Tests

```bash
node german-speaking/tests/test_core.js          # logic and content integrity, no dependencies
node german-speaking/tests/e2e_happy_path.js     # full browser walkthrough, needs `playwright` + Chromium
node german-speaking/tests/e2e_degraded.js       # no mic / no voice / denied mic / round timing
```

`test_core.js` also checks the content: every phrase example contains its phrase, and every role-play model answer
contains the phrases its step hints at. The browser tests mock the speech services (headless Chromium has none) and
use Chromium's fake microphone. They do not judge how recognition behaves on a real device or how a real German
voice sounds; try those once on your own phone and desktop.
