# Änderungen zum Anschauen

Ein eigener Bereich neben dem normalen Spiel und den Levels. Auf dem Startbildschirm öffnet **«Änderungen»** die Liste. Darunter steht, wie viele neu sind und welche zuletzt kam. Das normale Spiel ändert sich dadurch nicht.

## Ablauf
- **Liste:** alle Änderungen, die neueste zuoberst, nach Tag gruppiert. Jede hat einen kurzen Namen, zwei Zeilen Text und ein Zeichen «neu», bis man sie einmal angeschaut hat (gespeichert im Browser unter `grenzland.neu`). Ein Tipp öffnet sie sofort.
- **Szene:** eine kleine eigene Karte, auf der die Änderung gleich passiert: Das Schiff fährt, die Bombe fliegt, die Front bewegt sich. Unten (über der Steuerung) steht die Leiste mit Datum, Name und ein bis zwei Sätzen, was neu ist, dazu «Ältere», «Nochmals», «Liste» und «Neuere». Die Karte wird so gezeigt, dass sie ganz in den freien Teil des Bildschirms passt.
- Man kann jederzeit selbst mitspielen: Alles ist zum Bauen freigegeben, und man hat genug Gold. Eine Szene hat keine Quest und endet nie.
- Im Menü: «Nochmals von vorn» und «Zur Liste der Änderungen».

## Die Szenen (Stand 26.11.2026)
| Nr. | Datum | Name | Was passiert |
| --- | --- | --- | --- |
| 121 | 26.11. | Langes Spiel: das Meer wirkt grösser | Modus «Langes Spiel»; enge Meerenge, Handel läuft, alle 12 s fliegt eine Atombombe langsam übers Meer |
| 120 | 25.11. | Schüsse bereit auf der Bauleiste | Silo auf Stufe 3 feuert alle 8 s; Zahl auf den Bomben sinkt und steigt, Flugabwehr zeigt 4 (Stufe 3 + 1) |
| 119 | 25.11. | Hohe Stufen von weitem | Grosse Karte (900 × 600), damit man weit herauszoomen kann; Städte auf Stufe 3, 5, 10 und 30 |
| 118 | 25.11. | Silo zeigt das Nachladen | Ein Silo auf Stufe 2 feuert alle 14 s eine Atombombe; Ring und Sekunden laufen |
| 117 | 25.11. | Alle Reichweiten auf einen Blick | Drei Flugabwehren, eine Fabrik, zwei Häfen; die Kreise aller Flugabwehren sind gleich zu sehen (`look` tut, als zeige die Maus darauf) |
| 116 | 25.11. | Neue Zeichen für Atom- und Wasserstoffbombe | Tipp zeigt auf die Bomben in der Bauleiste |
| 115 | 24.11. | Knopf «?» mit allen Kürzeln | Tipp zeigt auf den Knopf «?» |
| 114 | 24.11. | Schnell verdichten | Die Front wird alle 8 s dichter und wieder dünner, Tipp zeigt auf den Knopf + |
| 101 | 24.11. | Ruhige Dichte | Die eigene Front ist dicht gestellt und dunkel, die Nation greift alle 25 s leicht an; die Schattierung bleibt ruhig |
| 102 | 24.11. | Schlachtschiff fährt flüssig | Ein Schlachtschiff und ein Zerstörer fahren auf offener See |
| 103 | 24.11. | Reichweite nur beim Antippen | Viele Gebäude, Tipp: Flugabwehr antippen |
| 104 | 23.11. | Transportboot und Bootsspur | Alle 6 s fährt ein Boot zur Insel der Bots |
| 105 | 23.11. | Zerstörer und Schlachtschiff | Eigene Schiffe beider Klassen gegen Schiffe von Quellmark |
| 106 | 23.11. | Handel in drei Klassen | Häfen auf Stufe 1 bis 3 auf beiden Seiten, Handel läuft |
| 107 | 23.11. | Grüne Schienen-Vorschau | Fabrik mit drei Städten und Schienen, Tipp: Fabrik wählen |
| 108 | 23.11. | Kampf wie OpenFront | Angriff alle 20 s durch Gebirge und Hügel |
| 109 | 23.11. | Nationen schlagen nicht sofort zurück | Angriff auf eine Nation alle 30 s |
| 110 | 20.11. | Bots wachsen in Armen | Fünf Bots breiten sich auf leerem Land aus |
| 111 | 19.11. | MIRV | Alle 32 s eine MIRV auf Kaldor (zwei Silos, damit eines immer geladen ist) |
| 112 | 18.11. | Tarnturm | Arsenal-Modus, Tarnturm bei eigenen Gebäuden |
| 113 | 17.11. | Boot auf feindliche Inseln | Nadeln auf drei Bot-Inseln |

Ältere Änderungen, die später ersetzt oder zurückgenommen wurden (3D-Nahansicht, Punktangriff, Gebäude nach Stufe), haben keine Szene. Die Liste zeigt, wie das Spiel heute ist.

## Eine neue Änderung eintragen
Zu jeder Änderung, die man im Spiel sieht, gehört eine Szene:
1. In `src/03e_neu.js` einen Eintrag **zuoberst** in `G.NEUES` einfügen, mit der nächsten freien Nummer (ab 101, nie unter 101, sonst trifft sie ein Level).
2. Felder wie bei einem Level (`map`, `me`, `foes`, `events`, `tips`, `allow`, siehe Kommentar in `src/03d_level.js`), dazu `date`, `title`, `text` (ein bis zwei einfache Sätze: was ist neu) und `loop: [erste Sekunde, alle n Sekunden, function (Q, k)]` für das, was sich wiederholt. Soll man etwas Kleines sehen (einen Ring an einem Gebäude), stellt `cam: [x, y, zoom]` die Ansicht näher. Was nur die Anzeige betrifft (zum Beispiel, als zeige die Maus auf ein Gebäude), geht über `look: function (view, game)`: läuft nur auf der Seite und ändert das Spiel nie.
3. Die Szene muss die Änderung **sofort** zeigen, ohne dass man etwas tun muss. Angriffe und Bomben erst ab Sekunde 6 (Schutzzeit am Anfang).
4. In `test/neu.js` unter `SEEN` prüfen, dass das Gezeigte wirklich passiert, und `node test/neu.js` laufen lassen. Tabelle oben nachführen.

## Technik
- `src/03e_neu.js` (Simulation): die Szenen als Daten (`G.NEUES`, `show: true`). Sie laufen mit dem Feldzug-Gerüst: `levelSetup` baut sie, `levelTick` spielt das Drehbuch und `loop`, beendet eine Szene aber nie. `G.levelDef(n)` findet ein Level oder eine Szene nach der Nummer (auch für den Spiegel im Worker, `src/05b_sync.js`).
- `src/07c_neu.js` (Seite): Liste, Leiste `#nwBar` in `#bottom`, Bildausschnitt (`frame`). Tipps und Nadeln zeichnet der Feldzug (`G.Feldzug.hud` gibt bei `def.show` an `G.Neuheiten.hud` ab).
- Test: `node test/neu.js [nummer]`: jede Szene baut sich, alle haben Land und ihre Gebäude, zwei Kopien bleiben gleich, keine endet, und das Gezeigte passiert in den ersten 90 Sekunden.
