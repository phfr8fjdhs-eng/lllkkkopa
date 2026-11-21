# Feldzug (Levels)

Ein eigener Modus neben dem normalen Spiel. Auf dem Startbildschirm öffnet **«Levels»** (darunter steht das nächste Level und die Sterne) die Levelseite. Das normale Spiel ändert sich dadurch nicht. Der Feldzug läuft nur allein, ohne Mehrspieler, und nur in der klassischen Version (nicht in «Rohstoffe»).

## Ablauf
- **Levelseite:** eine einzige Seite. Oben die 21 Stationen; ein Level ist offen, wenn das vorige geschafft ist, und abgeschlossene kann man jederzeit nochmals spielen. Die Levels 12–21 sind noch gesperrt («kommt bald»). Ein Tipp auf ein Level wählt es nur aus; darunter steht, was man lernt, die Quest, die drei Sterne und was gebaut werden darf. Ganz unten «Spiel starten» und «Zurück». Beim Öffnen ist das nächste offene Level gewählt.
- **Im Level:** Eine eigene, feste Karte, feste Gegner und eine **Quest**. Oben links steht statt der Rangliste die Quest-Leiste mit Fortschritt. Kurze Tipp-Blasen zeigen auf den richtigen Knopf, goldene Nadeln auf die richtige Stelle der Karte (am Handy fehlt die Bauleiste, dann steht die Blase unter der Quest-Leiste). Die Bauleiste zeigt nur, was das Level freigibt.
- **Ende:** Fenster mit Sternen, «Weiter zu Level n» (startet es direkt), «Nochmals spielen», «Zu den Levels». Bei Niederlage der Grund und «Nochmals versuchen». Im Menü gibt es «Level neu starten» und «Zu den Levels».
- **Sterne:** ★ geschafft, ★★ und ★★★ unter einer Zeit (bei Levels zum Durchhalten: wie gut man hält). Der beste Stand jedes Levels wird im Browser gespeichert (`grenzland.feldzug`).
- Im Feldzug gibt es keine Allianzen und keinen Sieg bei 80 % des Landes: Ein Level endet mit seiner Quest, mit dem eigenen Untergang oder wenn die Zeit abläuft.
- Die Schalter vom Startbildschirm (Truppenkonzentration, Netz, Richtungsangriff, Pfeile planen) gelten auch im Feldzug.

## Levels 1–11: Lernen
| Nr. | Name | Lernt | Quest | ★★ / ★★★ |
| --- | --- | --- | --- | --- |
| 1 | Lichtung | Startpunkt, Ausbreiten, Truppenanteil, wo Truppen am schnellsten wachsen | Halte die Hälfte der Insel | 1:30 / 1:00 |
| 2 | Kornkammer | Mehr Land und Städte = mehr Truppen; wer weniger losschickt, wächst schneller | Erreiche 40K Truppen | 1:40 / 1:10 |
| 3 | Hügelland | Bots erobern, Gold | Erobere 4 Bots | 2:10 / 1:30 |
| 4 | Flusstal | Fabrik, Ausbau | 2 Städte, 1 Fabrik, eine Stadt auf Stufe 2 | 2:20 / 1:40 |
| 5 | Engpass | Stoss mit Keil oder Abschnitt | Hauptstadt von Morvanien in 3 Minuten erreichen | 2:20 / 1:40 |
| 6 | Passhöhe | Verteidigungsposten, Gelände, Gegenangriff | Pass 2½ Minuten halten, höchstens 15 % Land verlieren | 95 % / 100 % Land gehalten |
| 7 | Archipel | Boote, Hafen | 75 % der Insel rechts | 1:50 / 1:15 |
| 8 | Meerenge | Kriegsschiffe | Beide Kriegsschiffe von Quellmark versenken | 1:40 / 1:05 |
| 9 | Festung | Raketensilo, Atombombe | Die drei Städte von Rabenstein zerstören | 1:00 / 0:35 |
| 10 | Schutzschirm | Flugabwehr | 3 von 4 Städten 2½ Minuten lang halten, Bomben ab 40 s | alle 4 Städte / keine Bombe getroffen |
| 11 | Raketenkette | Marschflugkörper, Salven | Silo von Tessmark hinter drei Flugabwehren zerstören | 2:30 / 1:30 |

## Tipps: zeigen statt erklären
- Ein Tipp hat höchstens ein paar Worte. Was selbstverständlich ist, wird nur gezeigt, nicht begründet (kein «Doppelklick», keine Prozentzahlen).
- **Nadeln** (goldene Kartennadel als Pixelgrafik, passend zur Karte, mit Pixelring am Boden) zeigen, wo man tippen soll: Startpunkt, freies Land am Rand, Bots, eigene Stadt, feindliche Schiffe. Liegt das Ziel ausserhalb des Bildes, zeigt ein goldener Pixelpfeil am Rand die Richtung (acht Richtungen, nur Vierteldrehungen, damit er scharf bleibt).
- **Markierung am Truppenbalken** (goldenes Pixeldreieck bei 42 %): dort wachsen die Truppen am schnellsten (Höchstwert von `troopGrowth`).
- Tipps hängen am Fortschritt (z. B. bleiben die Nadeln zum Ausbreiten, bis man 5 % der Insel hat), nicht an der Uhr.
- Ein Tipp ohne Text zeigt nur Nadeln. Die Tipps werden nur gezeichnet und ändern nie den Spielstand.

Gedanken dazu:
- 2: Ohne Ausbreiten reicht das Limit nicht (auch nicht mit Stadt); wer dauernd alles losschickt, wächst langsam.
- 5: Mit der ganzen Front reicht die Zeit nicht, mit einem Keil schon (Morvanien spielt auf «Leicht», damit seine Truppen nicht zu stark wachsen).
- 6: Pellgard greift nach Drehbuch bei 18, 65 und 110 s durch den Pass an. Wer nur Posten baut und zuschaut, verliert; wer zusätzlich das eingedrungene Land zurückerobert, hält.
- 8: Quellmarks Schiffe haben keinen Hafen und werden darum nicht repariert. Truppenboote landen bei 40 und 90 s.
- 10: Eine Flugabwehr fängt die einzelnen Bomben, ab 100 s kommen zwei auf einmal; dafür braucht es eine zweite oder einen Ausbau (das Gold reicht für beides).
- 11: Jede Flugabwehr hat eine Abwehrrakete und sieht Marschflugkörper erst auf halber Reichweite. Zwei Schüsse aufs selbe Ziel, von vorne nach hinten.

## Levels 12–21: Können (geplant, noch nicht gebaut)
Keine Hilfen mehr, alles freigeschaltet: 12 Blitzkrieg, 13 Zwei Fronten, 14 Inselhüpfen, 15 Tarnung (Arsenal), 16 Kalter Krieg, 17 Kessel, 18 Wirtschaftswunder, 19 Atomwinter, 20 Verrat, 21 Imperium (Endgegner, ab 30 Sternen).

## Technik
- `src/03d_level.js`: die Levels als Daten (`G.LEVELS`), Karten aus Formen (`G.levelMap`: Kreis, Rechteck, Linie mit ausgefransten Rändern), Aufbau (`levelSetup`: Spieler, Land, fertige Gebäude), Quest-Prüfung und Drehbuch (`levelTick`, alle 5 Ticks). Alles läuft in der Simulation und liest nur den Spielstand, gibt also auf jedem Gerät dasselbe Ergebnis. Am Ende meldet das Spiel `{ k: 'quest', win, stars, secs, why }`.
- Haken im Spielkern (`src/03_game.js`): `setup` gibt an `levelSetup` ab, `tick` ruft `levelTick` statt `checkWin`, `exec` lehnt gesperrte Bauten ab, keine Allianzen.
- `src/07b_level.js`: Levelseite, Quest-Leiste, Tipp-Blasen, Endfenster, gespeicherter Fortschritt. `src/07_ui.js` gibt ihm über `G.ui` Zugriff auf `begin`, `openModal` usw.
- `src/06_view.js`: der goldene Ring um das Ziel eines Levels (`goal`).
- Test: `node test/level.js` baut jedes Level, prüft Startland und Gebäude, lässt zwei Kopien gleich laufen und gewinnt jedes Level mit einem einfachen Skript.
- Ein neues Level: einen Eintrag in `G.LEVELS` anhängen (Felder siehe Kommentar dort), in `test/level.js` eine Spielweise dazuschreiben, Tabelle oben nachführen.

## Tempo
Level-Karten sind klein, darum wäre das Tempo der Fronten an der Untergrenze (`S` = 0.4). Ein Level läuft mindestens mit dem Tempo der Weltkarte: `G.LEVEL_PACE` (0.67) in `src/03d_level.js`.
