/* Sprechstunde — all learning content.
 *
 * IDs are derived from list position (s1-c1, s1-r1, s1-t1, s1-x1 …) so that a learner's saved progress keeps
 * pointing at the right item. Only ever APPEND to a list; never reorder or delete.
 *
 * Chunk text: "…" marks a slot the speaker fills in; (word) is optional. Keep one phrase per chunk — the speech
 * checker looks for the fixed parts in order.
 */
(function (root) {
  'use strict';

  const c = (de, en, fn, ex, note) => ({ de, en, fn, ex: ex || null, note: note || null });
  // role-play step: what the other person says, what you must do (English), which chunks (1-based) help, model answers
  const s = (npc, task, hint, ...model) => ({ npc, task, hint, model });
  // spontaneous reaction: what you hear, suggested reactions
  const x = (say, ...ok) => ({ say, ok });
  const t = (title, en, kind, ...points) => ({ title, en, kind, points });

  const stages = [
    /* ───────────────────────────── Stufe 1 ───────────────────────────── */
    {
      id: 's1', n: 1, level: 'B2', title: 'Ins Gespräch kommen', en: 'Starting, keeping up and ending a conversation',
      intro: 'Small talk is where most B2 speakers freeze: you know the grammar, but the next sentence will not come. This stage gives you ready-made openers, follow-up questions, reactions and exits so that the conversation never has to stop.',
      cando: [
        'I can start a chat with someone I barely know and keep it going for a few minutes.',
        'I answer with more than one word and hand the turn back with a question.',
        'I react to what I hear (surprise, interest, sympathy) instead of going quiet.',
        'I can end a conversation politely and suggest meeting again.'
      ],
      chunks: [
        c("Na, wie läuft's bei dir?", "So, how's it going with you?", 'Einstieg', "Na, wie läuft's bei dir? Wir haben uns ja ewig nicht gesehen!", "Casual opener with du. „Na“ makes it friendly instead of formal."),
        c("Bei mir ist gerade ziemlich viel los.", "Things are pretty hectic for me right now.", 'Antworten', "Bei mir ist gerade ziemlich viel los – wir ziehen nächste Woche um.", "A real answer instead of just „gut“. It gives the other person something to ask about."),
        c("Und was treibst du so?", "And what are you up to these days?", 'Nachfragen', "Und was treibst du so, außer arbeiten?", "„so“ makes the question open and relaxed."),
        c("Was verschlägt dich hierher?", "What brings you here?", 'Nachfragen', "Du bist nicht von hier, oder? Was verschlägt dich hierher?", "Slightly playful. Good for meeting new people."),
        c("Echt? Erzähl mal!", "Really? Tell me about it!", 'Reagieren', "Du warst in Japan? Echt? Erzähl mal!", "The classic way to hand the floor back."),
        c("Wie kommt's?", "How come?", 'Nachfragen', "Du ziehst nach Leipzig? Wie kommt's?", "A short follow-up that works for any surprising news."),
        c("Das kenne ich gut!", "I know that well!", 'Reagieren', "Stau auf der A8? Das kenne ich gut!", "Builds rapport by sharing the experience."),
        c("Das hätte ich nicht gedacht.", "I wouldn't have thought that.", 'Reagieren', "Fünf Sprachen? Das hätte ich nicht gedacht.", "Konjunktiv II of „denken“, very common in speech."),
        c("Apropos …", "Speaking of which …", 'Themenwechsel', "Apropos Urlaub: Wohin fährst du dieses Jahr?"),
        c("Wo wir gerade dabei sind, …", "While we're on the subject, …", 'Themenwechsel', "Wo wir gerade dabei sind: Hast du die Einladung schon bekommen?"),
        c("Du, ich muss gleich weiter, …", "Listen, I've got to head off in a moment, …", 'Abschluss', "Du, ich muss gleich weiter, mein Zug fährt in zehn Minuten.", "„Du,“ at the start signals a polite interruption."),
        c("Wir sollten das bald mal wiederholen.", "We should do this again soon.", 'Abschluss', null, "„bald mal“ keeps it casual and non-binding."),
        c("Lass uns in Kontakt bleiben.", "Let's stay in touch.", 'Abschluss', "Das war ein schöner Abend. Lass uns in Kontakt bleiben!")
      ],
      echo: {
        title: 'Neu in der Gegend',
        text: 'Also, bei mir ist gerade ziemlich viel los. Wir sind vor drei Wochen umgezogen, und ehrlich gesagt sind die Kartons immer noch nicht ausgepackt. Aber die Gegend gefällt mir richtig gut: Es gibt einen kleinen Park um die Ecke, und samstags ist ein Markt. Du, wir sollten uns bald mal treffen. Hast du nächste Woche Zeit?',
        en: 'Well, things are pretty hectic for me right now. We moved three weeks ago and, honestly, the boxes still aren\'t unpacked. But I really like the area: there\'s a little park around the corner and a market on Saturdays. Listen, we should meet up soon. Do you have time next week?'
      },
      reactions: [
        x('Ich habe gestern endlich meine Wohnung gefunden!', 'Echt? Glückwunsch! Wo ist sie denn?', 'Na endlich! Erzähl mal, wie ist sie?'),
        x('Ich war letzte Woche zum ersten Mal beim Bouldern.', 'Cool! Und, wie war\'s?', 'Echt? Das wollte ich auch schon immer mal ausprobieren.'),
        x('Mein Chef hat gesagt, dass ich nächsten Monat nach Hamburg versetzt werde.', 'Ach, wirklich? Und wie findest du das?', 'Wow, das kommt überraschend! Freust du dich?'),
        x('Ich bin so müde, ich habe die ganze Nacht nicht geschlafen.', 'Oje, das tut mir leid. Wie kommt\'s?', 'Das kenne ich gut. Brauchst du einen Kaffee?'),
        x('Wir fahren im Sommer drei Wochen nach Portugal.', 'Wie schön! Wo genau fahrt ihr hin?', 'Beneidenswert! Wie kommt\'s, dass ihr so lange frei habt?')
      ],
      roleplays: [
        {
          title: 'Beim Sommerfest', en: 'At a neighbours\' summer party', setting: 'You are at the summer party in your building. Jana, a neighbour you barely know, comes over. Use du.',
          steps: [
            s('Hallo! Ich glaube, wir haben uns noch nicht richtig kennengelernt. Ich bin Jana, ich wohne im dritten Stock.',
              'Introduce yourself, say how long you have lived here and ask her a question about the building or area.', [4],
              'Hallo Jana, freut mich! Ich wohne seit ein paar Monaten im zweiten Stock. Und du, wie lange wohnst du schon hier? Was verschlägt dich hierher?'),
            s('Schon seit acht Jahren. Ehrlich gesagt gefällt es mir hier sehr gut. Und du, was machst du so?',
              'Say what you do and add one detail about how things are going. Do not stop at one word.', [2],
              'Ich arbeite als Softwareentwickler in einer kleinen Firma. Bei mir ist gerade ziemlich viel los, wir starten ein neues Projekt. Und du?'),
            s('Ich bin Lehrerin, Grundschule. Anstrengend, aber ich liebe es. Du, entschuldige mich kurz, ich glaube, mein Mann winkt mich schon.',
              'React warmly, then end the conversation politely and suggest meeting again.', [8, 12],
              'Echt? Grundschule, das hätte ich nicht gedacht – du wirkst so ruhig! Klar, geh ruhig. Wir sollten das bald mal wiederholen.')
          ]
        },
        {
          title: 'Im Zug', en: 'On a delayed train', setting: 'A stranger next to you comments on the delay. Use Sie.',
          steps: [
            s('Schon wieder Verspätung. Fahren Sie öfter diese Strecke?',
              'Agree, say how often you take this route, and ask something back (Sie).', [7],
              'Ja, leider fast jede Woche. Das kenne ich gut – meistens kommt der Zug irgendwann doch noch an. Und Sie?'),
            s('Ich pendle jeden Tag von Augsburg nach München. Da gewöhnt man sich dran.',
              'Show surprise and ask a follow-up question.', [8, 6],
              'Jeden Tag? Das hätte ich nicht gedacht. Wie kommt es, dass Sie nicht einfach umziehen?'),
            s('Meine Frau arbeitet in Augsburg, und die Kinder gehen dort zur Schule. Und Sie, Sie sind nicht von hier, oder?',
              'Say briefly why you are here, then change the topic smoothly.', [9],
              'Nein, ich bin vor zwei Jahren der Arbeit wegen hierhergezogen. Apropos Schule: Ist das Schulsystem hier wirklich so streng, wie alle sagen?')
          ]
        }
      ],
      topics: [
        t('Meine normale Woche', 'My normal week', 'describe', 'Wie sieht ein typischer Arbeitstag bei dir aus?', 'Was machst du am Wochenende am liebsten?', 'Was würdest du an deinem Alltag gern ändern?'),
        t('Meine letzte Reise', 'My last trip', 'story', 'Wohin bist du gefahren, und mit wem?', 'Was hat dich überrascht?', 'Würdest du noch einmal hinfahren? Warum (nicht)?'),
        t('Meine Gegend', 'My neighbourhood', 'describe', 'Was gefällt dir in deiner Nachbarschaft?', 'Was fehlt dir?', 'Wohin würdest du einen Besucher als Erstes mitnehmen?'),
        t('Ein Hobby, das ich vorstellen möchte', 'A hobby I would like to present', 'describe', 'Wie bist du dazu gekommen?', 'Was braucht man, um anzufangen?', 'Was gefällt dir daran am meisten?')
      ],
      missions: [
        'Talk to one real person for two minutes (neighbour, colleague, café, tandem partner). Ask at least two follow-up questions („Wie kommt\'s?“, „Erzähl mal!“).',
        'Close one conversation actively this week with „Du, ich muss gleich weiter …“ and „Wir sollten das bald mal wiederholen.“'
      ]
    },

    /* ───────────────────────────── Stufe 2 ───────────────────────────── */
    {
      id: 's2', n: 2, level: 'B2', title: 'Natürlich klingen', en: 'Sounding natural: buying time, repairing, softening',
      intro: 'Fluent speakers do not speak without pauses; they fill them with the right small words. Here you learn thinking-time phrases, ways to get round a missing word, and the modal particles (doch, denn, ja, halt) that make German sound like German.',
      cando: [
        'I fill pauses with German (also, na ja, wie soll ich sagen) instead of „ähm“ or English.',
        'When a word is missing I describe it and keep talking.',
        'I can rephrase or correct myself in mid-sentence.',
        'I use doch, denn, ja mal and halt in short sentences and they sound right.'
      ],
      chunks: [
        c("Also, …", "Well, … / So, …", 'Zeit gewinnen', "Also, ich würde sagen, das war eine gute Entscheidung.", "Starts your turn and gives you half a second to plan."),
        c("Na ja, …", "Well, … (hesitant)", 'Zeit gewinnen', "Na ja, so schlimm war es auch nicht.", "Signals mild reservation."),
        c("Wie soll ich sagen …", "How should I put it …", 'Zeit gewinnen', "Wie soll ich sagen … Es war irgendwie komisch."),
        c("Moment, lass mich kurz nachdenken.", "Hang on, let me think for a second.", 'Zeit gewinnen', null, "Honest and natural, much better than silence. With Sie: „Moment, lassen Sie mich kurz nachdenken.“"),
        c("Das Wort liegt mir auf der Zunge.", "The word is on the tip of my tongue.", 'Wort suchen', "Das Wort liegt mir auf der Zunge – es fängt mit „V“ an."),
        c("Wie heißt das noch mal?", "What's it called again?", 'Wort suchen', "Dieses Ding für die Wand, wie heißt das noch mal?"),
        c("Das ist so etwas wie …", "It's something like …", 'Wort suchen', "Das ist so etwas wie eine Powerbank – ein kleiner Akku zum Mitnehmen.", "Your best tool when a word is missing: say what it is similar to."),
        c("Anders gesagt, …", "In other words, …", 'Umformulieren', "Anders gesagt, wir haben kein Geld mehr."),
        c("Oder besser gesagt, …", "Or rather, …", 'Umformulieren', "Ich war gestern im Büro, oder besser gesagt, kurz davor.", "Self-correction in mid-sentence sounds confident, not weak."),
        c("Irgendwie …", "Somehow … / Kind of …", 'Abtönen', "Irgendwie habe ich das Gefühl, dass wir uns missverstanden haben.", "Softens a statement."),
        c("Komm doch einfach vorbei!", "Just come over!", 'Abtönen', null, "„doch“ + „einfach“ = friendly push, not an order."),
        c("Was hast du denn gemacht?", "What did you do, then?", 'Abtönen', "Du bist so spät? Was hast du denn gemacht?", "„denn“ shows genuine curiosity in a question."),
        c("Das ist ja mal interessant!", "Well, that's interesting!", 'Abtönen', "Du hast gekündigt? Das ist ja mal interessant!", "„ja mal“ expresses mild surprise."),
        c("Es ist halt kompliziert.", "It's just complicated.", 'Abtönen', null, "„halt“ = that's simply how it is, nothing to be done.")
      ],
      echo: {
        title: 'Verlaufen',
        text: 'Also, wie soll ich sagen … Ich habe mich neulich total verlaufen. Das Hotel lag irgendwie versteckt, und mein Handy war leer. Na ja, am Ende hat mich eine Passantin angesprochen, oder besser gesagt, sie hat gefragt, ob ich Hilfe brauche. Das war ja mal eine nette Überraschung.',
        en: 'Well, how shall I put it … I got completely lost the other day. The hotel was kind of hidden, and my phone was dead. Well, in the end a passer-by spoke to me, or rather, she asked whether I needed help. That was a nice surprise.'
      },
      reactions: [
        x('Kennst du dieses Ding, mit dem man Eier trennt? Wie heißt das noch mal?', 'Hm, Moment, das Wort liegt mir auf der Zunge … ein Eiertrenner?', 'Ach, du meinst so etwas wie ein kleines Sieb? Keine Ahnung, wie das heißt.'),
        x('Warum bist du eigentlich so spät dran?', 'Na ja, der Bus ist mir vor der Nase weggefahren.', 'Tut mir leid, irgendwie ist heute alles schiefgelaufen.'),
        x('Wie findest du eigentlich den neuen Chef?', 'Hm, wie soll ich sagen … Er ist halt sehr anders.', 'Also, ich kenne ihn noch nicht richtig, aber er wirkt nett.'),
        x('Hast du morgen Zeit? Wir könnten ins Kino gehen.', 'Ja, gern! Was läuft denn?', 'Moment, lass mich kurz in den Kalender schauen.'),
        x('Ich habe gestern meine Schlüssel im Zug vergessen.', 'Das ist ja ärgerlich! Hast du schon beim Fundbüro angerufen?', 'Oje, was hast du denn dann gemacht?')
      ],
      roleplays: [
        {
          title: 'Im Baumarkt', en: 'In the DIY shop (a word is missing)', setting: 'You want to hang a heavy shelf on a wall but do not know the word for the little plugs. The sales assistant, Herr Krüger, is polite (Sie). Describe instead of switching to English.',
          steps: [
            s('Guten Tag, kann ich Ihnen helfen?',
              'Say you need something to fix screws in a wall, but you do not know the word. Describe it.', [7, 6],
              'Ja, bitte. Ich suche etwas für die Wand, das ist so etwas wie ein kleines Plastikstück, das man in die Wand steckt, damit die Schraube hält. Wie heißt das noch mal?'),
            s('Ah, Dübel meinen Sie. Für welche Wand denn? Beton oder Rigips?',
              'Repeat the new word, then buy time: you are not sure about the wall.', [1],
              'Genau, Dübel! Moment, lassen Sie mich kurz nachdenken … Also, ich glaube, es ist Beton, aber so ganz sicher bin ich nicht.'),
            s('Dann nehmen Sie am besten diese hier, und dazu einen Steinbohrer. Haben Sie eine Bohrmaschine?',
              'Say you have a drill but are unsure which bit you need. Ask him to show you.', [1, 10],
              'Also, eine Bohrmaschine habe ich schon, aber irgendwie weiß ich nicht, welchen Bohrer ich dafür brauche. Können Sie mir kurz zeigen, was ich nehmen muss?')
          ]
        },
        {
          title: 'Telefonat mit einer Kollegin', en: 'A phone call with a colleague', setting: 'You call Maria (du) because the report will be late. Practise rephrasing and correcting yourself.',
          steps: [
            s('Hallo, hier ist Maria. Du wolltest mich sprechen – worum geht\'s denn?',
              'Start with „Also“ and say that the deadline on Friday is a problem because figures are missing.', [1],
              'Hallo Maria! Also, es geht um den Bericht. Ich glaube, wir schaffen den Abgabetermin am Freitag nicht, weil mir noch ein paar Zahlen fehlen.'),
            s('Hmm, das ist ungünstig. Was genau fehlt dir denn?',
              'Say what is missing and correct yourself once in the middle of the sentence.', [9, 8],
              'Mir fehlen die Verkaufszahlen vom letzten Quartal, oder besser gesagt, die Zahlen aus der Region Süd. Anders gesagt: ein Drittel der Daten.'),
            s('Okay. Und was schlägst du vor?',
              'Suggest a solution and soften it with „halt“ or „irgendwie“.', [2, 10],
              'Na ja, wir könnten den Termin halt um zwei Tage verschieben. Irgendwie ist ein richtiger Bericht später besser als ein falscher pünktlich.')
          ]
        }
      ],
      topics: [
        t('Ein Gegenstand, den ich nie hergeben würde', 'An object I would never give away', 'describe', 'Wie sieht er aus, und wie benutzt man ihn?', 'Woher hast du ihn?', 'Warum ist er dir wichtig?'),
        t('Mein Beruf – erklärt für ein Kind', 'My job, explained to a child', 'describe', 'Was machst du den ganzen Tag?', 'Welche Fachwörter musst du umschreiben?', 'Wozu ist deine Arbeit gut?'),
        t('Ein Missverständnis', 'A misunderstanding', 'story', 'Was wurde gesagt?', 'Was haben die Beteiligten verstanden?', 'Wie hat sich das aufgeklärt?'),
        t('Mein Lieblingsgericht – und wie man es kocht', 'My favourite dish and how to cook it', 'describe', 'Welche Zutaten braucht man?', 'Wie bereitet man es zu?', 'Wann isst du es am liebsten?')
      ],
      missions: [
        'In a real conversation, get round a missing word once with „Das ist so etwas wie …“ instead of switching to English. Write the word down afterwards.',
        'Use „also“ or „na ja“ instead of „ähm“ at least ten times today. Notice how much time it buys you.'
      ]
    },

    /* ───────────────────────────── Stufe 3 ───────────────────────────── */
    {
      id: 's3', n: 3, level: 'B2+', title: 'Meinung & Argumentation', en: 'Giving opinions, reasons and counterarguments',
      intro: 'Having an opinion in German is easy. Building it in real time is not. Here you practise a five-step frame — Standpunkt, Grund, Beispiel, Zugeständnis, Fazit — so that you always know what comes next while you talk.',
      cando: [
        'I state a position clearly and give at least one reason and one example.',
        'I can concede a point and still hold my position.',
        'I disagree politely and ask the other person for their view.',
        'I can wrap up a short argument with a conclusion.'
      ],
      chunks: [
        c("Meiner Meinung nach …", "In my opinion …", 'Standpunkt', "Meiner Meinung nach ist das Homeoffice für die meisten Berufe ein Gewinn."),
        c("Ich bin davon überzeugt, dass …", "I'm convinced that …", 'Standpunkt', "Ich bin davon überzeugt, dass kleine Klassen besser lernen."),
        c("Das liegt vor allem daran, dass …", "That's mainly because …", 'Grund', "Das liegt vor allem daran, dass man viel Zeit für den Arbeitsweg spart."),
        c("Ein wichtiger Grund dafür ist, dass …", "An important reason for this is that …", 'Grund', "Ein wichtiger Grund dafür ist, dass die Mieten so hoch sind."),
        c("Nehmen wir zum Beispiel …", "Take, for example, …", 'Beispiel', "Nehmen wir zum Beispiel meine Kollegin: Sie spart jeden Tag zwei Stunden Pendelzeit."),
        c("Ein typisches Beispiel dafür ist …", "A typical example of this is …", 'Beispiel', "Ein typisches Beispiel dafür ist die Bahn: Sie ist nie pünktlich."),
        c("Es stimmt zwar, dass …, aber …", "It's true that …, but …", 'Zugeständnis', "Es stimmt zwar, dass es teurer ist, aber die Qualität ist viel besser.", "Concede first, then turn. Two slots."),
        c("Da hast du einen Punkt.", "You've got a point there.", 'Zugeständnis', null, "Shows you listen, and buys goodwill before you disagree."),
        c("Dagegen spricht allerdings, dass …", "Against that, however, is the fact that …", 'Gegenargument', "Dagegen spricht allerdings, dass nicht jeder Beruf von zu Hause funktioniert."),
        c("Man darf nicht vergessen, dass …", "One mustn't forget that …", 'Gegenargument', "Man darf nicht vergessen, dass nicht jeder ein ruhiges Arbeitszimmer hat."),
        c("Das mag sein, trotzdem …", "That may be, but still …", 'Gegenargument', "Das mag sein, trotzdem überwiegen für mich die Vorteile.", "Accepts the point without giving up your position."),
        c("Alles in allem würde ich sagen, dass …", "All in all I'd say that …", 'Fazit', "Alles in allem würde ich sagen, dass sich der Versuch lohnt."),
        c("Unterm Strich …", "Bottom line, …", 'Fazit', "Unterm Strich ist es eine Frage der Organisation."),
        c("Wie siehst du das?", "How do you see it?", 'Nachfragen', null, "Hands the turn over."),
        c("Da muss ich dir widersprechen.", "I have to disagree with you there.", 'Widerspruch', "Da muss ich dir widersprechen. Die Zahlen sagen etwas anderes.")
      ],
      echo: {
        title: 'Homeoffice',
        text: 'Meiner Meinung nach wird das Homeoffice oft unterschätzt. Das liegt vor allem daran, dass viele nur an die Technik denken. Nehmen wir zum Beispiel meine Kollegin: Sie spart jeden Tag zwei Stunden Pendelzeit. Es stimmt zwar, dass der Kontakt zum Team leidet, aber man darf nicht vergessen, dass man sich auch online sehen kann. Alles in allem überwiegen für mich die Vorteile.',
        en: 'In my opinion, working from home is often underrated. That is mainly because many people only think about the technology. Take my colleague, for example: she saves two hours of commuting every day. It is true that contact with the team suffers, but you mustn\'t forget that you can see each other online as well. All in all, the advantages outweigh the disadvantages for me.'
      },
      reactions: [
        x('Ich finde, man sollte Fleisch komplett verbieten.', 'Da muss ich dir widersprechen. Ein Verbot geht mir zu weit.', 'Na ja, ich sehe das ein bisschen anders. Weniger Fleisch wäre gut, aber verbieten?'),
        x('Jeder kann doch von zu Hause arbeiten, das ist doch kein Problem.', 'Es stimmt zwar, dass viele das können, aber nicht jeder Beruf geht von zu Hause.', 'Dagegen spricht allerdings, dass man nicht überall Platz dafür hat.'),
        x('Das Deutschlandticket ist das Beste, was uns passiert ist.', 'Da hast du einen Punkt. Es spart wirklich viel Geld.', 'Meiner Meinung nach ist es gut, aber auf dem Land fehlen Verbindungen.'),
        x('Fernsehen ist reine Zeitverschwendung.', 'Hm, so pauschal würde ich das nicht sagen. Es kommt darauf an, was man schaut.', 'Das mag sein, trotzdem lerne ich durch Dokus viel.'),
        x('Man lernt eine Sprache am besten nur durch Zuhören.', 'Zuhören ist wichtig, aber man darf nicht vergessen, dass man auch sprechen muss.', 'Da muss ich dir widersprechen. Ohne Sprechen bleibt der Wortschatz passiv.')
      ],
      roleplays: [
        {
          title: 'Vier-Tage-Woche', en: 'The four-day week', setting: 'In the office kitchen, your colleague Tim wants to discuss the four-day week. Use du. Build an argument step by step.',
          steps: [
            s('Hast du gelesen, dass unsere Firma über eine Vier-Tage-Woche nachdenkt? Ich finde, das ist die Zukunft. Was meinst du?',
              'State your opinion clearly and give one reason.', [1, 3],
              'Meiner Meinung nach ist das eine gute Idee. Das liegt vor allem daran, dass viele nach fünf Arbeitstagen einfach erschöpft sind und dann weniger produktiv arbeiten.'),
            s('Genau! In Island hat der Test super funktioniert. Aber ob das bei uns im Kundenservice geht, weiß ich nicht.',
              'Concede a point, then give an example.', [7, 5],
              'Es stimmt zwar, dass das im Kundenservice schwieriger ist, aber nehmen wir zum Beispiel Schichtmodelle: Jeder könnte vier längere Tage arbeiten, und das Team wäre trotzdem jeden Tag besetzt.'),
            s('Hm, vier lange Tage … Ich weiß nicht, ob das wirklich besser ist. Zehn Stunden am Stück sind auch anstrengend.',
              'Accept his point, answer it, and close with a conclusion.', [8, 11, 12],
              'Da hast du einen Punkt. Das mag sein, trotzdem überwiegt für mich der Vorteil des langen Wochenendes. Alles in allem würde ich sagen, dass wir es zumindest ausprobieren sollten.')
          ]
        },
        {
          title: 'Urlaubsstreit', en: 'A holiday disagreement', setting: 'Your sister wants a beach holiday, you want a city break. Be friendly, but do not give in too fast. Use du.',
          steps: [
            s('Ich möchte dieses Jahr unbedingt an den Strand. Städtereisen sind doch nur Stress. Was meinst du?',
              'Disagree politely and give a reason.', [15, 2, 3],
              'Da muss ich dir widersprechen. Ich bin davon überzeugt, dass man sich in einer neuen Stadt viel mehr erholt. Das liegt vor allem daran, dass man auf andere Gedanken kommt.'),
            s('Ja, aber nach zehn Stunden Museum bin ich abends fertig. Am Strand kann ich einfach mal nichts tun.',
              'Make a concession and add a counter-argument.', [7, 10],
              'Es stimmt zwar, dass Städtereisen anstrengend sein können, aber man muss ja nicht jeden Tag ins Museum. Man darf nicht vergessen, dass man abends einfach in einem Café sitzen kann.'),
            s('Okay, und wie wäre es mit einem Kompromiss?',
              'Suggest a compromise and hand the turn back.', [14],
              'Dagegen habe ich nichts einzuwenden. Wir könnten eine Stadt am Meer nehmen, zum Beispiel Lissabon oder Valencia. Wie siehst du das?')
          ]
        }
      ],
      topics: [
        t('Sollte man in der Stadt ein Auto besitzen?', 'Should you own a car in the city?', 'opinion', 'Was spricht dafür?', 'Was spricht dagegen?', 'Was zeigt deine eigene Erfahrung?'),
        t('Homeoffice: Gewinn oder Verlust?', 'Working from home: gain or loss?', 'opinion', 'Was spricht dafür?', 'Was spricht dagegen?', 'Was zeigt deine eigene Erfahrung?'),
        t('Sollten Kinder schon in der Grundschule programmieren lernen?', 'Should primary-school children learn to code?', 'opinion', 'Was spricht dafür?', 'Was spricht dagegen?', 'Was würdest du selbst gern früher gelernt haben?'),
        t('Soziale Medien: mehr Nutzen oder mehr Schaden?', 'Social media: more benefit or more harm?', 'opinion', 'Was spricht dafür?', 'Was spricht dagegen?', 'Wie nutzt du selbst soziale Medien?')
      ],
      missions: [
        'Ask a real person „Wie siehst du das?“ about something in the news, then disagree politely once („Da muss ich dir widersprechen“ or „Ich sehe das ein bisschen anders“).',
        'Give a two-minute opinion on a topic of your choice to a tandem partner using the five-step frame. Ask them which step was weakest.'
      ]
    },

    /* ───────────────────────────── Stufe 4 ───────────────────────────── */
    {
      id: 's4', n: 4, level: 'B2+', title: 'Erzählen', en: 'Telling stories and anecdotes',
      intro: 'Stories are the most natural long turns in everyday talk, and the hardest to keep flowing. You get the connectors that move a story forward, the words that add drama, and the phrases that wrap it up.',
      cando: [
        'I can tell a short story with a clear beginning, middle and end.',
        'I use sequence words (gerade als, im selben Moment, am Ende) instead of „und dann“ again and again.',
        'I can add drama or humour with ausgerechnet, kaum zu glauben, zum Glück.',
        'I report what other people said in a natural way.'
      ],
      chunks: [
        c("Neulich ist mir etwas Komisches passiert.", "Something funny happened to me the other day.", 'Einstieg', null, "A classic story opener."),
        c("Stell dir vor, …", "Imagine this, …", 'Einstieg', "Stell dir vor, gestern stand plötzlich mein Chef vor meiner Tür!"),
        c("Das war so: …", "It went like this: …", 'Einstieg', "Das war so: Ich hatte den Zug verpasst und musste zu Fuß gehen."),
        c("Gerade als …, …", "Just as …, …", 'Ablauf', "Gerade als ich losfahren wollte, fing es an zu regnen."),
        c("Im selben Moment …", "At that very moment …", 'Ablauf', "Im selben Moment klingelte mein Handy."),
        c("Ausgerechnet …", "Of all things / people / days …", 'Drama', "Ausgerechnet heute hat der Zug Verspätung.", "Adds irony or bad luck."),
        c("Ich konnte es kaum glauben.", "I could hardly believe it.", 'Drama'),
        c("Mir blieb nichts anderes übrig, als …", "I had no choice but to …", 'Drama', "Mir blieb nichts anderes übrig, als ein Taxi zu nehmen.", "Followed by „zu“ + infinitive."),
        c("Wie sich herausstellte, …", "As it turned out, …", 'Wendung', "Wie sich herausstellte, hatten wir denselben Schirm."),
        c("Zum Glück …", "Luckily …", 'Wendung', "Zum Glück hatte ein Nachbar einen Ersatzschlüssel."),
        c("Am Ende …", "In the end …", 'Schluss', "Am Ende mussten wir beide lachen."),
        c("Rückblickend …", "Looking back, …", 'Schluss', "Rückblickend war es die beste Entscheidung."),
        c("Die Moral von der Geschichte: …", "The moral of the story: …", 'Schluss', "Die Moral von der Geschichte: Gib deinen Ersatzschlüssel rechtzeitig weiter."),
        c("Sie meinte, sie hätte …", "She said she had …", 'Berichten', "Ich habe meine Schwester gefragt, aber sie meinte, sie hätte keine Zeit.", "Spoken indirect speech: „meinen“/„sagen“ + Konjunktiv II.")
      ],
      echo: {
        title: 'Der Schirm',
        text: 'Neulich ist mir etwas Komisches passiert. Ich stand an der Bushaltestelle, als plötzlich ein Mann auf mich zukam und sagte, ich hätte seinen Schirm. Ausgerechnet! Ich konnte es kaum glauben. Wie sich herausstellte, hatten wir tatsächlich denselben Schirm. Am Ende mussten wir beide lachen. Die Moral von der Geschichte: Kauf nie den Schirm, den alle haben.',
        en: 'Something funny happened to me the other day. I was standing at the bus stop when a man suddenly came up to me and said I had his umbrella. Of all things! I could hardly believe it. As it turned out, we really did have the same umbrella. In the end we both had to laugh. The moral of the story: never buy the umbrella everyone has.'
      },
      reactions: [
        x('Du glaubst nicht, wen ich gestern im Supermarkt getroffen habe!', 'Nein, wen denn? Erzähl!', 'Jetzt bin ich aber gespannt!'),
        x('Ich habe mein Handy in den See fallen lassen.', 'Nein! Und, ist es noch zu retten?', 'Das ist ja ärgerlich. Wie ist das denn passiert?'),
        x('Stell dir vor, ich habe im Lotto gewonnen – fünfzig Euro.', 'Haha, immerhin! Was machst du damit?', 'Na, das reicht doch für ein schönes Abendessen!'),
        x('Mein Flug wurde gestrichen, ich saß acht Stunden am Flughafen fest.', 'Oje, wie schrecklich! Und wie ging es weiter?', 'Das ist echt ärgerlich. Hat die Airline wenigstens etwas gezahlt?'),
        x('Gestern hat mich ein Kollege angerufen, den ich seit zehn Jahren nicht gesprochen habe.', 'Wirklich? Das ist ja ein Zufall! Was wollte er denn?', 'Wie schön! Und worüber habt ihr geredet?')
      ],
      roleplays: [
        {
          title: 'Montag im Büro', en: 'Monday at the office', setting: 'Your colleague Sven asks how your weekend was. Tell an anecdote. Use du.',
          steps: [
            s('Na, wie war dein Wochenende? Du siehst müde aus.',
              'Start a story about something unexpected that happened.', [2, 1],
              'Stell dir vor, ich habe am Samstag meinen Schlüssel verloren und stand stundenlang vor der Tür!',
              'Neulich ist mir etwas Komisches passiert: Ich habe am Samstag meinen Schlüssel verloren und stand stundenlang vor der Tür!'),
            s('Nein! Und wie bist du dann reingekommen?',
              'Continue the story with at least two sequence or drama words.', [3, 4, 6],
              'Das war so: Gerade als ich mit dem Einkaufen fertig war, fing es an zu regnen. Ausgerechnet an dem Tag hatte meine Mitbewohnerin ihr Handy zu Hause vergessen, also konnte ich sie nicht anrufen.'),
            s('Oh nein. Und wie ging es aus?',
              'Finish the story and give a takeaway.', [10, 11, 13],
              'Zum Glück hatte ein Nachbar einen Ersatzschlüssel von uns. Am Ende war ich nach zwei Stunden wieder drin. Die Moral von der Geschichte: Gib deinen Ersatzschlüssel rechtzeitig weiter.')
          ]
        },
        {
          title: 'Vorstellungsgespräch', en: 'Job interview', setting: 'In an interview you are asked about a project you are proud of. Use Sie and a more formal tone.',
          steps: [
            s('Erzählen Sie mir doch bitte von einem Projekt, auf das Sie besonders stolz sind.',
              'Set the scene: what was the situation and what was the challenge?', [3],
              'Gern. Das war so: Vor zwei Jahren sollte unser Team in nur drei Monaten eine neue Software einführen, und niemand hatte so etwas vorher gemacht.'),
            s('Das klingt nach einer Herausforderung. Gab es Probleme?',
              'Describe a problem and an unexpected twist.', [9, 8],
              'Ja, gleich zu Beginn. Wie sich herausstellte, war die alte Datenbank viel schlechter dokumentiert, als wir dachten. Mir blieb nichts anderes übrig, als mit den früheren Mitarbeitern zu sprechen.'),
            s('Und wie ging das Projekt aus?',
              'Finish the story and reflect on what you learned.', [11, 12],
              'Am Ende haben wir den Termin sogar eine Woche früher geschafft. Rückblickend war das die wichtigste Erfahrung meiner Laufbahn, weil ich gelernt habe, rechtzeitig um Hilfe zu bitten.')
          ]
        }
      ],
      topics: [
        t('Ein Missgeschick auf Reisen', 'A mishap while travelling', 'story', 'Wo und wann ist es passiert?', 'Was ging schief – und in welcher Reihenfolge?', 'Wie ging es aus, und was hast du gelernt?'),
        t('Ein Moment, in dem ich mich blamiert habe', 'A moment I embarrassed myself', 'story', 'Wie fing der Tag an?', 'Was ist genau passiert?', 'Wie hast du reagiert, und wie siehst du es heute?'),
        t('Wie ich zu meinem Beruf gekommen bin', 'How I got into my line of work', 'story', 'Was wolltest du ursprünglich werden?', 'Welcher Zufall oder welche Entscheidung hat alles verändert?', 'Würdest du es noch einmal so machen?'),
        t('Eine Begegnung, die mich überrascht hat', 'An encounter that surprised me', 'story', 'Wen hast du getroffen, und wo?', 'Was hat dich überrascht?', 'Was ist daraus geworden?')
      ],
      missions: [
        'Tell a real person a 90-second story from your week using at least three story chunks („Gerade als …“, „Ausgerechnet …“, „Die Moral von der Geschichte …“). Ask them to retell it back to check what came across.',
        'Report something someone told you today using „Er/Sie meinte, …“ — in German, to someone else.'
      ]
    },

    /* ───────────────────────────── Stufe 5 ───────────────────────────── */
    {
      id: 's5', n: 5, level: 'B2+ / C1', title: 'Heikle Gespräche', en: 'Refusing, complaining, negotiating, apologising',
      intro: 'The situations where a wrong tone costs you something: saying no, complaining, asking for a better deal, owning a mistake. Speakers at C1 do not just use correct grammar here, they choose the right level of politeness.',
      cando: [
        'I can decline an invitation or request and keep the relationship intact.',
        'I can complain firmly but politely, and stay on topic when challenged.',
        'I can negotiate by proposing a compromise.',
        'I can apologise, accept criticism and give advice with suitable tact.'
      ],
      chunks: [
        c("Leider muss ich absagen, …", "Unfortunately I have to cancel / decline, …", 'Ablehnen', "Leider muss ich absagen, ich bin am Samstag schon verplant."),
        c("Das passt mir leider gar nicht.", "That doesn't suit me at all, I'm afraid.", 'Ablehnen'),
        c("Ich würde gern …, aber …", "I'd love to …, but …", 'Ablehnen', "Ich würde gern kommen, aber ich habe an dem Abend schon etwas vor.", "Softer than a flat „nein“."),
        c("Ich möchte mich über … beschweren.", "I would like to complain about …", 'Beschweren', "Ich möchte mich über die Lautstärke in der Nacht beschweren."),
        c("Das kann ich so nicht hinnehmen.", "I can't accept that.", 'Beschweren', null, "Firm but formal enough to stay polite."),
        c("Es tut mir wirklich leid, dass …", "I'm really sorry that …", 'Entschuldigen', "Es tut mir wirklich leid, dass ich so kurzfristig absage."),
        c("Das war mein Fehler.", "That was my mistake.", 'Entschuldigen', null, "Taking responsibility is a strong move in German business culture."),
        c("Könnten wir uns vielleicht auf … einigen?", "Could we perhaps agree on …?", 'Verhandeln', "Könnten wir uns vielleicht auf die Hälfte einigen?"),
        c("Wären Sie bereit, …?", "Would you be willing to …?", 'Verhandeln', "Wären Sie bereit, uns einen Rabatt zu geben?"),
        c("Mir ist aufgefallen, dass …", "I've noticed that …", 'Kritik', "Mir ist aufgefallen, dass die Berichte in letzter Zeit später kommen.", "Describes instead of accusing."),
        c("Ich verstehe Ihren Standpunkt, aber …", "I understand your point of view, but …", 'Kritik', "Ich verstehe Ihren Standpunkt, aber das liegt über meinem Budget."),
        c("Ich glaube, da liegt ein Missverständnis vor.", "I think there's been a misunderstanding.", 'Klären', null, "Gives the other person a way out without losing face."),
        c("Dürfte ich kurz nachfragen, …?", "May I just ask, …?", 'Klären', "Dürfte ich kurz nachfragen, wann der Techniker kommt?", "Konjunktiv II = very polite."),
        c("An deiner Stelle würde ich …", "If I were you, I would …", 'Raten', "An deiner Stelle würde ich erst einmal mit ihm sprechen."),
        c("Wie wäre es, wenn …?", "How about if …?", 'Raten', "Wie wäre es, wenn wir am Sonntag zusammen brunchen?")
      ],
      echo: {
        title: 'Doppelt abgebucht',
        text: 'Ich verstehe Ihren Standpunkt, aber ich glaube, da liegt ein Missverständnis vor. Mir ist aufgefallen, dass die Rechnung zweimal abgebucht wurde. Das kann ich so nicht hinnehmen. Wären Sie bereit, den Betrag noch heute zu erstatten? Wie wäre es, wenn wir das gleich am Telefon klären?',
        en: 'I understand your point of view, but I think there has been a misunderstanding. I noticed that the invoice was charged twice. I can\'t accept that. Would you be willing to refund the amount today? How about we sort it out right now on the phone?'
      },
      reactions: [
        x('Kannst du mir bis morgen hundert Euro leihen?', 'Das passt mir gerade leider gar nicht. Ich bin selbst knapp bei Kasse.', 'Ich würde gern helfen, aber ich habe diesen Monat selbst nicht viel übrig.'),
        x('Sie haben meine Bestellung falsch eingepackt!', 'Es tut mir wirklich leid. Das war unser Fehler. Wie kann ich das wiedergutmachen?', 'Dürfte ich kurz nachfragen, was genau fehlt?'),
        x('Du bist heute schon zum dritten Mal zu spät gekommen.', 'Es tut mir wirklich leid, das war mein Fehler. Ab morgen fahre ich früher los.', 'Du hast recht, und es tut mir leid. Ich fahre ab morgen früher los.'),
        x('Ich überlege, meinen Job zu kündigen. Was würdest du tun?', 'An deiner Stelle würde ich erst einmal in Ruhe darüber nachdenken.', 'Wie wäre es, wenn du zuerst mit deinem Chef sprichst?'),
        x('Das Angebot ist unser letztes Wort.', 'Könnten wir uns vielleicht auf einen Mittelweg einigen?', 'Ich verstehe Ihren Standpunkt, aber das liegt leider über meinem Budget.')
      ],
      roleplays: [
        {
          title: 'Beschwerde beim Vermieter', en: 'Complaint to the landlord', setting: 'The heating in your flat has been broken for a week. You call the property manager, Herr Hartmann (Sie). Stay polite but firm.',
          steps: [
            s('Hartmann, Hausverwaltung. Was kann ich für Sie tun?',
              'State your complaint politely: the heating has not worked for over a week.', [4],
              'Guten Tag, Herr Hartmann. Ich möchte mich über die Heizung in meiner Wohnung beschweren. Sie funktioniert seit über einer Woche nicht mehr, und nachts wird es richtig kalt.'),
            s('Hm, ich habe dazu keine Meldung bekommen. Ich glaube, das ist eher ein Problem mit Ihrem Thermostat.',
              'Correct the misunderstanding calmly and stay firm.', [12, 5],
              'Ich glaube, da liegt ein Missverständnis vor. Ich habe das Problem schon am vierten per E-Mail gemeldet. Das kann ich so nicht hinnehmen, aber ich schicke Ihnen die Nachricht gern noch einmal.'),
            s('Na gut. Ein Techniker kann frühestens nächste Woche kommen.',
              'Negotiate: ask for an earlier date or a temporary solution.', [13, 9, 15],
              'Dürfte ich kurz nachfragen, ob das auch früher möglich wäre? Wären Sie bereit, mir bis dahin einen Heizlüfter zur Verfügung zu stellen? Wie wäre es, wenn der Techniker am Montag kommt?')
          ]
        },
        {
          title: 'Absage mit Alternative', en: 'Declining with an alternative', setting: 'Your friend Lisa has planned a big birthday party for Saturday. You cannot come. Use du.',
          steps: [
            s('Du kommst doch Samstag zu meiner Geburtstagsfeier, oder? Ich habe schon für zwanzig Leute geplant!',
              'Decline kindly and give a reason.', [3, 1],
              'Ich würde gern kommen, aber leider muss ich absagen. Meine Eltern kommen genau an dem Tag zu Besuch, und das war schon lange geplant.'),
            s('Oh, schade. Kannst du die nicht einfach mitbringen?',
              'Explain why not and apologise.', [6],
              'Eigentlich schon, aber sie sind nicht so die Party-Typen. Es tut mir wirklich leid, dass ich so kurzfristig absage.'),
            s('Na gut, dann feiern wir ohne dich. Aber das nächste Mal sag früher Bescheid!',
              'Accept the criticism and suggest an alternative.', [7, 15],
              'Das war mein Fehler, du hast recht. Wie wäre es, wenn wir am Sonntag zusammen brunchen gehen? Ich lade dich ein.')
          ]
        }
      ],
      topics: [
        t('Eine Situation, in der ich Nein sagen musste', 'A situation where I had to say no', 'story', 'Worum wurde ich gebeten?', 'Wie habe ich abgesagt?', 'Was würde ich heute anders sagen?'),
        t('Ein Service, mit dem ich unzufrieden war', 'A service I was unhappy with', 'story', 'Was war das Problem?', 'Wie habe ich mich beschwert?', 'Wie wurde es gelöst?'),
        t('Ein Rat für einen Freund: Umzug ins Ausland?', 'Advice for a friend: moving abroad?', 'opinion', 'Was würdest du empfehlen?', 'Welche Risiken siehst du?', 'Was würdest du an seiner Stelle tun?'),
        t('Ein Kompromiss, den ich geschlossen habe', 'A compromise I reached', 'story', 'Worum ging der Streit?', 'Wer wollte was?', 'Wie sah die Lösung aus?')
      ],
      missions: [
        'Make one real request or complaint in German this week (restaurant, hotline, shop). Start with „Dürfte ich kurz nachfragen …“ or „Ich möchte mich über … beschweren“.',
        'Say no to something in German with a reason and an alternative („Ich würde gern, aber … Wie wäre es, wenn …?“).'
      ]
    },

    /* ───────────────────────────── Stufe 6 ───────────────────────────── */
    {
      id: 's6', n: 6, level: 'C1', title: 'Diskutieren & Präsentieren', en: 'Abstract discussion and short talks',
      intro: 'C1 means handling abstract topics fluently and structuring longer turns without notes. You practise weighing arguments with nuance, hedging with care, and opening, structuring and closing a short talk. The discussion tasks mirror the format of the Goethe-Zertifikat C1 speaking test.',
      cando: [
        'I can take a position on an abstract topic and defend it for several minutes.',
        'I concede and differentiate instead of just disagreeing.',
        'I hedge claims appropriately (pauschal, tendenziell, zufolge).',
        'I can open, structure and close a three-minute talk and answer follow-up questions.'
      ],
      chunks: [
        c("Ich vertrete die Auffassung, dass …", "I take the view that …", 'Standpunkt', "Ich vertrete die Auffassung, dass ein generelles Verbot zu kurz greift."),
        c("Aus meiner Sicht spricht vieles dafür, dass …", "From my perspective there is a lot to suggest that …", 'Standpunkt', "Aus meiner Sicht spricht vieles dafür, dass Bildung der Schlüssel ist."),
        c("Entscheidend ist in diesem Zusammenhang, dass …", "What is decisive in this context is that …", 'Grund', "Entscheidend ist in diesem Zusammenhang, dass alle Beteiligten mitmachen."),
        c("Das lässt sich gut am Beispiel von … zeigen.", "This can be shown well using … as an example.", 'Beispiel', "Das lässt sich gut am Beispiel von Schulprojekten zeigen."),
        c("Untersuchungen zufolge …", "According to studies …", 'Beispiel', "Untersuchungen zufolge sinken die Mengen im ersten Jahr deutlich.", "„zufolge“ follows its noun: „Untersuchungen zufolge“."),
        c("Natürlich ist nicht von der Hand zu weisen, dass …", "Of course, it can't be dismissed that …", 'Zugeständnis', "Natürlich ist nicht von der Hand zu weisen, dass es Risiken gibt.", "A typical C1 concession."),
        c("Dem steht allerdings entgegen, dass …", "Against this stands, however, that …", 'Gegenargument', "Dem steht allerdings entgegen, dass die Kosten steigen."),
        c("Das greift meiner Ansicht nach zu kurz.", "In my view, that doesn't go far enough.", 'Gegenargument', null, "A polished way to say „that's too simple“."),
        c("Man sollte differenzieren: …", "One should differentiate: …", 'Gegenargument', "Man sollte differenzieren: Nicht jede Nutzung ist schädlich."),
        c("Zusammenfassend lässt sich sagen, dass …", "To sum up, it can be said that …", 'Fazit', "Zusammenfassend lässt sich sagen, dass Bildung wirksamer ist als ein Verbot."),
        c("Letztlich kommt es darauf an, ob …", "Ultimately it depends on whether …", 'Fazit', "Letztlich kommt es darauf an, ob die Regeln auch umgesetzt werden."),
        c("Das lässt sich pauschal nicht sagen.", "You can't say that across the board.", 'Absichern', null, "The standard hedge when a question is too broad."),
        c("Könnten Sie das näher ausführen?", "Could you elaborate on that?", 'Nachfragen', null, "Useful in discussions and in the exam."),
        c("Ich möchte Ihnen heute … vorstellen.", "Today I would like to present … to you.", 'Vortrag', "Ich möchte Ihnen heute unser Projekt zur Müllvermeidung vorstellen."),
        c("Mein Vortrag gliedert sich in drei Teile.", "My talk is divided into three parts.", 'Vortrag'),
        c("Das bringt mich zu meinem nächsten Punkt.", "That brings me to my next point.", 'Vortrag')
      ],
      echo: {
        title: 'Arbeitswelt im Wandel',
        text: 'Zusammenfassend lässt sich sagen, dass die Frage nicht pauschal zu beantworten ist. Natürlich ist nicht von der Hand zu weisen, dass neue Technologien Arbeitsplätze verändern. Man sollte aber differenzieren: Untersuchungen zufolge entstehen auch neue Berufe. Letztlich kommt es darauf an, ob Bildung und Weiterbildung mit dem Wandel Schritt halten.',
        en: 'To sum up, the question cannot be answered across the board. Of course it cannot be dismissed that new technologies change jobs. But one should differentiate: according to studies, new professions emerge as well. Ultimately it depends on whether education and further training keep pace with the change.'
      },
      reactions: [
        x('Wirtschaftswachstum und Klimaschutz schließen sich doch aus.', 'Das greift meiner Ansicht nach zu kurz. Man sollte differenzieren.', 'Das lässt sich pauschal nicht sagen.'),
        x('Künstliche Intelligenz wird die Hälfte aller Jobs vernichten.', 'Dem steht allerdings entgegen, dass auch neue Berufe entstehen.', 'Untersuchungen zufolge verändert sich eher der Inhalt der Arbeit.'),
        x('Eine Vier-Tage-Woche ist für kleine Firmen unbezahlbar.', 'Natürlich ist nicht von der Hand zu weisen, dass das teuer wird. Aber …', 'Könnten Sie das näher ausführen?'),
        x('Die Wahrheit liegt doch immer in der Mitte.', 'Letztlich kommt es darauf an, um welche Frage es geht.', 'Das würde ich so nicht sagen. Manche Positionen sind einfach besser begründet.'),
        x('Fremdsprachen braucht heute keiner mehr, es gibt ja Übersetzer-Apps.', 'Das greift zu kurz – Sprache ist mehr als Übersetzung.', 'Für den Alltag vielleicht, aber nicht für echte Beziehungen. Man sollte differenzieren.')
      ],
      roleplays: [
        {
          title: 'Diskussionsrunde', en: 'Panel discussion: social media for under-16s', setting: 'You are a guest on a radio discussion moderated by Frau Dr. Winkler (Sie). The question: should social media be banned for under-16s? Take a clear position.',
          steps: [
            s('Willkommen zur Diskussion. Die Frage lautet: Sollten soziale Medien für unter Sechzehnjährige verboten werden? Beginnen wir mit Ihrer Einschätzung.',
              'Take a clear position and give your decisive reason.', [1, 3],
              'Ich vertrete die Auffassung, dass ein generelles Verbot zu kurz greift. Entscheidend ist in diesem Zusammenhang, dass Jugendliche den Umgang mit sozialen Medien lernen müssen, statt davon ferngehalten zu werden.'),
            s('Aber Studien deuten doch auf deutliche Risiken für die psychische Gesundheit hin. Wie begegnen Sie diesem Einwand?',
              'Concede the point, then differentiate.', [6, 9],
              'Natürlich ist nicht von der Hand zu weisen, dass es Risiken gibt. Man sollte differenzieren: Nicht jede Nutzung ist schädlich, und es kommt darauf an, wie lange und wozu Jugendliche die Plattformen nutzen.'),
            s('Sie sprechen von Medienkompetenz. Wie soll die denn konkret vermittelt werden?',
              'Give a concrete example and conclude.', [4, 10],
              'Das lässt sich gut am Beispiel von Schulprojekten zeigen, in denen Schüler selbst Beiträge analysieren. Zusammenfassend lässt sich sagen, dass Bildung wirksamer ist als ein Verbot.')
          ]
        },
        {
          title: 'Kurzvortrag mit Fragen', en: 'Short talk with Q&A', setting: 'You present a project to colleagues. Herr Bauer asks questions afterwards. Use Sie.',
          steps: [
            s('Bitte, Sie haben das Wort. Sie haben fünf Minuten für Ihren Vortrag.',
              'Open the talk: say what it is about and how it is structured.', [14, 15],
              'Vielen Dank. Ich möchte Ihnen heute unser Projekt zur Reduzierung von Verpackungsmüll vorstellen. Mein Vortrag gliedert sich in drei Teile: die Ausgangslage, unsere Maßnahmen und die Ergebnisse.'),
            s('Vielen Dank für den Vortrag. Mich würde interessieren, wie sicher Sie sind, dass diese Einsparungen auch dauerhaft sind.',
              'Answer carefully: hedge, cite a source and say what it depends on.', [12, 5, 11],
              'Das lässt sich pauschal nicht sagen. Untersuchungen zufolge sinken die Mengen im ersten Jahr deutlich, aber letztlich kommt es darauf an, ob die Mitarbeiter die Regeln auch langfristig umsetzen.'),
            s('Und was wäre Ihre Empfehlung für Unternehmen mit weniger Budget?',
              'Give a recommendation, say what it ultimately depends on, and invite further questions.', [11],
              'Dann würde ich empfehlen, mit einem kleinen Pilotprojekt zu beginnen. Letztlich kommt es darauf an, ob man klein anfängt und Erfolge sichtbar macht. Haben Sie dazu noch Fragen?')
          ]
        }
      ],
      topics: [
        t('Sollte es ein bedingungsloses Grundeinkommen geben?', 'Should there be an unconditional basic income?', 'opinion', 'Was spricht dafür?', 'Was spricht dagegen?', 'Welche Rolle spielt die Finanzierung?'),
        t('Wie verändert Künstliche Intelligenz die Arbeitswelt?', 'How is AI changing the world of work?', 'opinion', 'Welche Chancen siehst du?', 'Welche Risiken siehst du?', 'Was müsste die Politik tun?'),
        t('Ist Wirtschaftswachstum mit Klimaschutz vereinbar?', 'Is economic growth compatible with climate protection?', 'opinion', 'Welche Argumente gibt es dafür?', 'Welche Argumente gibt es dagegen?', 'Wo liegt für dich der Kompromiss?'),
        t('Kurzvortrag: Mein Fachgebiet in drei Minuten', 'Short talk: my field in three minutes', 'talk', 'Einstieg: Thema und Gliederung ankündigen.', 'Hauptteil: zwei bis drei Kernpunkte mit je einem Beispiel.', 'Schluss: zusammenfassen und zu Fragen einladen.')
      ],
      missions: [
        'Join a real discussion (Stammtisch, language café, online group) and take a position for three minutes. Use at least two of the C1 chunks, then record yourself retelling it and note three gaps.',
        'Give a three-minute talk about your job or field to a native speaker and ask them to interrupt with two questions. Answer with „Das lässt sich pauschal nicht sagen“ or „Letztlich kommt es darauf an …“.'
      ]
    }
  ];

  /* Umschreiben: describe the word without saying it. */
  const circ = [
    { art: 'der', word: 'Korkenzieher', en: 'corkscrew', sample: 'Das ist so ein Ding, mit dem man Weinflaschen aufmacht.' },
    { art: 'die', word: 'Gießkanne', en: 'watering can', sample: 'Das ist ein Behälter mit einem langen Rohr, damit gießt man Blumen.' },
    { art: 'der', word: 'Wasserkocher', en: 'electric kettle', sample: 'Das ist ein Gerät in der Küche, in dem man sehr schnell Wasser heiß macht.' },
    { art: 'das', word: 'Pflaster', en: 'sticking plaster', sample: 'Das klebt man auf eine kleine Wunde, zum Beispiel wenn man sich geschnitten hat.' },
    { art: 'die', word: 'Steckdose', en: 'power socket', sample: 'Das ist die Öffnung in der Wand, aus der man Strom bekommt.' },
    { art: 'der', word: 'Schlüsseldienst', en: 'locksmith service', sample: 'Die Leute, die man anruft, wenn man sich aus der Wohnung ausgesperrt hat.' },
    { art: 'das', word: 'Trinkgeld', en: 'tip (money)', sample: 'Das ist zusätzliches Geld, das man im Restaurant dem Kellner gibt, wenn man zufrieden war.' },
    { art: 'die', word: 'Mülltrennung', en: 'waste separation', sample: 'In Deutschland wirft man Papier, Plastik und Restmüll in verschiedene Tonnen. So etwas wie Ordnung für den Abfall.' },
    { art: 'der', word: 'Kostenvoranschlag', en: 'quotation / estimate', sample: 'Das ist eine Information, wie viel eine Reparatur ungefähr kosten wird, bevor man sie bestellt.' },
    { art: 'die', word: 'Steuererklärung', en: 'tax return', sample: 'Das ist das Formular für das Finanzamt, in dem man angibt, wie viel man verdient hat.' },
    { art: 'die', word: 'Kündigung', en: 'notice of termination', sample: 'Wenn man offiziell sagt, dass man in einer Firma oder Wohnung aufhört, nennt man das so.' },
    { art: 'die', word: 'Vorfahrt', en: 'right of way', sample: 'Das ist die Regel im Verkehr, die sagt, wer zuerst fahren darf.' },
    { art: 'der', word: 'Anrufbeantworter', en: 'answering machine', sample: 'Das ist ein Gerät, das Nachrichten aufnimmt, wenn niemand ans Telefon geht.' },
    { art: 'der', word: 'Reißverschluss', en: 'zip fastener', sample: 'Das ist das Teil an Jacken und Hosen, mit dem man sie zu- und aufmacht, indem man etwas hoch- und runterzieht.' }
  ];

  const circHints = ['Das ist so etwas wie …', 'Man benutzt es, um … zu …', 'Das sieht aus wie …, nur …', 'Das braucht man, wenn …'];

  /* Everyday opening topics for the “real conversation” page and for the AI-partner prompt. */
  const scenarios = [
    'Kennenlernen auf einer Party', 'Ein Gespräch beim Arzt oder in der Apotheke', 'Wohnungssuche und Besichtigung',
    'Ein Streit mit einem Nachbarn', 'Vorstellungsgespräch', 'Eine Reise planen',
    'Smalltalk in der Kaffeeküche', 'Eine Beschwerde im Restaurant', 'Eine Diskussion über Politik oder Gesellschaft'
  ];

  /* ── enrichment: ids, stage back-references, flat lookups ─────────────────────────── */
  const byId = {};
  stages.forEach((st) => {
    st.chunks.forEach((ch, i) => { ch.id = st.id + '-c' + (i + 1); ch.stage = st.id; byId[ch.id] = ch; });
    st.roleplays.forEach((rp, i) => {
      rp.id = st.id + '-r' + (i + 1); rp.stage = st.id; byId[rp.id] = rp;
      rp.steps.forEach((step) => { step.hintIds = step.hint.map((n) => st.id + '-c' + n); });
    });
    st.topics.forEach((tp, i) => { tp.id = st.id + '-t' + (i + 1); tp.stage = st.id; byId[tp.id] = tp; });
    st.reactions.forEach((r, i) => { r.id = st.id + '-x' + (i + 1); r.stage = st.id; byId[r.id] = r; });
    st.echo.id = st.id + '-e'; st.echo.stage = st.id;
    st.missions = st.missions.map((text, i) => ({ id: st.id + '-m' + (i + 1), text }));
  });
  circ.forEach((w, i) => { w.id = 'circ-' + (i + 1); });

  root.CONTENT = { stages, circ, circHints, scenarios, byId };
  if (typeof module === 'object' && module.exports) module.exports = root.CONTENT;
})(typeof self !== 'undefined' ? self : this);
