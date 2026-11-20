# Feldzug (Levels)

Ein eigener Modus neben dem normalen Spiel. Auf dem Startbildschirm öffnet **«Feldzug · Levels»** die Levelkarte. Das normale Spiel ändert sich dadurch nicht. Der Feldzug läuft nur allein, ohne Mehrspieler, und nur in der klassischen Version (nicht in «Rohstoffe»).

## Ablauf
- **Levelkarte:** 20 Stationen. Ein Level ist offen, wenn das vorige geschafft ist. Abgeschlossene Levels kann man jederzeit nochmals spielen. Die Levels 11–20 sind noch gesperrt («kommt bald»).
- **Levelkarte eines Levels:** was man lernt, die Quest, die drei Sterne und was in diesem Level gebaut werden darf.
- **Im Level:** Eine eigene, feste Karte, feste Gegner und eine **Quest**. Oben links steht statt der Rangliste die Quest-Leiste mit Fortschritt. Tipp-Blasen zeigen mit einem Pfeil auf den richtigen Knopf (am Handy fehlt die Bauleiste, dann steht die Blase unter der Quest-Leiste). Die Bauleiste zeigt nur, was das Level freigibt.
- **Ende:** Fenster mit Sternen, «Weiter zu Level n», «Nochmals spielen», «Zur Levelkarte». Bei Niederlage der Grund und «Nochmals versuchen». Im Menü gibt es «Level neu starten» und «Zur Levelkarte».
- **Sterne:** ★ geschafft, ★★ und ★★★ unter einer Zeit (bei Levels zum Durchhalten: wie gut man hält). Der beste Stand jedes Levels wird im Browser gespeichert (`grenzland.feldzug`).
- Im Feldzug gibt es keine Allianzen und keinen Sieg bei 80 % des Landes: Ein Level endet mit seiner Quest, mit dem eigenen Untergang oder wenn die Zeit abläuft.
- Die Schalter vom Startbildschirm (Truppenkonzentration, Netz, Richtungsangriff, Pfeile planen) gelten auch im Feldzug.

## Levels 1–10: Lernen
| Nr. | Name | Lernt | Quest | ★★ / ★★★ |
| --- | --- | --- | --- | --- |
| 1 | Lichtung | Startpunkt, freies Land, Truppenanteil | Halte die Hälfte der Insel | 1:30 / 1:00 |
| 2 | Hügelland | Bots erobern, Gold | Erobere 4 Bots | 2:10 / 1:30 |
| 3 | Flusstal | Stadt, Fabrik, Ausbau | 2 Städte, 1 Fabrik, eine Stadt auf Stufe 2 | 2:20 / 1:40 |
| 4 | Engpass | Stoss mit Keil oder Abschnitt | Hauptstadt von Morvanien in 3 Minuten erreichen | 2:20 / 1:40 |
| 5 | Passhöhe | Verteidigungsposten, Gelände, Gegenangriff | Pass 2½ Minuten halten, höchstens 15 % Land verlieren | 95 % / 100 % Land gehalten |
| 6 | Archipel | Boote, Hafen | 75 % der Insel rechts | 1:50 / 1:15 |
| 7 | Meerenge | Kriegsschiffe | Beide Kriegsschiffe von Quellmark versenken | 1:40 / 1:05 |
| 8 | Festung | Raketensilo, Atombombe | Die drei Städte von Rabenstein zerstören | 1:00 / 0:35 |
| 9 | Schutzschirm | Flugabwehr | 3 von 4 Städten 2½ Minuten lang halten, Bomben ab 40 s | alle 4 Städte / keine Bombe getroffen |
| 10 | Raketenkette | Marschflugkörper, Salven | Silo von Tessmark hinter drei Flugabwehren zerstören | 2:30 / 1:30 |

Gedanken dazu:
- 4: Mit der ganzen Front reicht die Zeit nicht, mit einem Keil schon (Morvanien spielt auf «Leicht», damit seine Truppen nicht zu stark wachsen).
- 5: Pellgard greift nach Drehbuch bei 18, 65 und 110 s durch den Pass an. Wer nur Posten baut und zuschaut, verliert; wer zusätzlich das eingedrungene Land zurückerobert, hält.
- 7: Quellmarks Schiffe haben keinen Hafen und werden darum nicht repariert. Truppenboote landen bei 40 und 90 s.
- 9: Eine Flugabwehr fängt die einzelnen Bomben, ab 100 s kommen zwei auf einmal; dafür braucht es eine zweite oder einen Ausbau (das Gold reicht für beides).
- 10: Jede Flugabwehr hat eine Abwehrrakete und sieht Marschflugkörper erst auf halber Reichweite. Zwei Schüsse aufs selbe Ziel, von vorne nach hinten.

## Levels 11–20: Können (geplant, noch nicht gebaut)
Keine Hilfen mehr, alles freigeschaltet: 11 Blitzkrieg, 12 Zwei Fronten, 13 Inselhüpfen, 14 Tarnung (Arsenal), 15 Kalter Krieg, 16 Kessel, 17 Wirtschaftswunder, 18 Atomwinter, 19 Verrat, 20 Imperium (Endgegner, ab 30 Sternen).

## Technik
- `src/03d_level.js`: die Levels als Daten (`G.LEVELS`), Karten aus Formen (`G.levelMap`: Kreis, Rechteck, Linie mit ausgefransten Rändern), Aufbau (`levelSetup`: Spieler, Land, fertige Gebäude), Quest-Prüfung und Drehbuch (`levelTick`, alle 5 Ticks). Alles läuft in der Simulation und liest nur den Spielstand, gibt also auf jedem Gerät dasselbe Ergebnis. Am Ende meldet das Spiel `{ k: 'quest', win, stars, secs, why }`.
- Haken im Spielkern (`src/03_game.js`): `setup` gibt an `levelSetup` ab, `tick` ruft `levelTick` statt `checkWin`, `exec` lehnt gesperrte Bauten ab, keine Allianzen.
- `src/07b_level.js`: Levelkarte, Levelkarte eines Levels, Quest-Leiste, Tipp-Blasen, Endfenster, gespeicherter Fortschritt. `src/07_ui.js` gibt ihm über `G.ui` Zugriff auf `begin`, `openModal` usw.
- `src/06_view.js`: der goldene Ring um das Ziel eines Levels (`goal`).
- Test: `node test/level.js` baut jedes Level, prüft Startland und Gebäude, lässt zwei Kopien gleich laufen und gewinnt jedes Level mit einem einfachen Skript.
- Ein neues Level: einen Eintrag in `G.LEVELS` anhängen (Felder siehe Kommentar dort), in `test/level.js` eine Spielweise dazuschreiben, Tabelle oben nachführen.
