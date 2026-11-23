# Kessel, Schwung, Bahn, Häfen (22.11.2026)
Kessel und Schwung gehören zum Kampfsystem «Grenzland» (`doku/kampfsysteme.md`); «Bahn: Lieferungen» und «Häfen nach Stufe» sind Schalter auf dem Startbildschirm für beide Systeme, Vorgabe an. Optionen `opts.kessel`, `opts.schwung` (in Tests einzeln), `opts.bahn`, `opts.hafen`. Wohin das führt: `doku/vision.md`.

## Kessel (`G.KESSEL`, `pocketReady` in `src/03_game.js`)
- Eingeschlossenes Land eines Menschen oder einer Nation fällt nicht mehr sofort an den, der es umgibt. Es hält 30 s (`G.KESSEL` = 300 Ticks) und fällt dann. Bots: wie bisher sofort.
- In der Zeit verhungern die Truppen darin, wenn keine Meeresküste dabei ist (`doku/aufstellung.md`), und von aussen sickert nichts hinein.
- Wer eingekesselt wird, bekommt die Meldung «Ein Teil deines Landes ist eingekesselt».
- Gemessen (`node test/kampf.js abwehr`): 1024 eingeschlossene Felder, nach 10 und 25 s noch alle, nach 35 s keins; ohne Schalter sofort weg.

## Schwung (`G.MOMENTUM`, `momentumStart`, Abnahme in `tickAttack`)
- Jeder schmale Angriff (Keil, Abschnitt, Richtung) auf einen Menschen oder eine Nation startet mit Schwung; die ganze Front hat seit 23.11.2026 keinen (wiederholte Klicks liessen sie sonst müde stehen bleiben). Der Start ist 100 %, mehr mit Vorbereitung (höchstens 150 %), weniger, wenn derselbe Abschnitt gerade angegriffen hat (mindestens 55 %).
  - **Erholung:** Ein Abschnitt (16 × 16 Felder), aus dem ein Angriff kam, braucht 30 s bis zum vollen Schwung (`rest`).
  - **Aufmarsch:** Je dichter die eigenen Truppen am Start stehen (Netz), desto mehr: +25 % pro Dichte über dem Schnitt (`mass`).
  - **Schiene:** bis +15 % an einer Schiene (`rail`).
- **Abnahme pro erobertem Feld:** `decay` × Widerstand ÷ Breite der Front. Widerstand = was das Feld an Truppen kostete ÷ 32, zwischen 0.25 und 4. Gegen Bots und freies Land darum kaum, gegen dichte, eingegrabene Nationen schnell. Eine breite Front verliert pro Feld wenig, ein Keil viel. Entlang einer Schiene langsamer (bis auf 60 %, `railFade`).
- **Wirkung:** Verluste pro Feld ÷ √Schwung, Zeit pro Feld ÷ Schwung (Schwung dabei zwischen 50 % und 125 %, `slow`). Unter 25 % bleibt der Angriff stehen (`stop`), die übrigen Truppen bleiben als Verteidiger. Meldung «Der Angriff auf … hat keinen Schwung mehr». Nimmt er 20 s kein Feld (`stall`), hält er ebenso an: «… steckt fest und hält an».
- **Anzeige:** Vorschau beim Ziehen «Keil · 12K · Schwung 120 % · …», Karte eines laufenden Pfeils «Schwung 63 %».
- **Abgestimmt** mit `decay` 0.006 auf einer 40-Minuten-Runde nur mit Computer-Spielern (`node test/sim.js welt 24000`): Ohne Schwung hat der Spitzenreiter nach 10 Minuten 40 % und nach 20 Minuten 59 % (Schneeball, früh entschieden). Mit 0.012 gab es nach 40 Minuten keinen Sieger, mit 0.005 einen Spitzenreiter mit 75 %, mit 0.006 etwa 45 bis 50 %. Die Läufe streuen; Menschen bereiten vor und sollten schneller durchkommen.
- **Gemessen** (`node test/kampf.js schwung`, 400K gegen 100K, 15 %, Stand 23.11.2026): Keil ohne Schwung 283 Felder und 42 % des Wegs, mit Schwung 233 Felder und 36 %; ganze Front 379 Felder (mit und ohne Schwung gleich). Ein zweiter Keil sofort von derselben Stelle: 82 Felder. Nach 60 s Aufmarsch (Netz ×5 am Start) Start-Schwung 136 %, 38 % des Wegs statt 29 % nach 60 s Warten ohne Aufmarsch.

## Bahn: Lieferungen (`G.BAHN`, `tickDeliveries`, `tickDelivery` in `src/04b_rail.js`)
- **Fabriken** stehen dreimal so weit auseinander wie andere Gebäude (`factoryGap`).
- **Gleise** als Baum: Eine Station wird nur angebunden, wenn sie noch gar nicht mit dem Netz verbunden ist.
- **Züge:** Jede Fabrik schickt alle 20 s ÷ √Stufe einen Zug (Stufe 4 alle 10 s, Stufe 16 alle 5 s), der Reihe nach zu jeder Stadt und jedem Hafen ihres Netzes.
- **Lohn bei Ankunft:** 30K × √(Stufe der Stadt) × Weg (1 bis 2 je nach Länge). Stadt Stufe 4 bringt doppelt so viel wie Stufe 1, Stufe 25 fünfmal. In die Stadt eines Verbündeten ×1.5, der Verbündete bekommt einen Drittel davon. Lange Wege zahlen mehr, dauern aber auch länger.
- **Nur eigenes und verbündetes Netz.** Fährt ein Zug durch feindliches Land, ist das Gleis 30 s gesperrt (`cut`).
- **Bau-Vorschau:** Eine Stadt oder ein Hafen zeigt «verbunden, ca. +X/min» mit grüner Linie zur Fabrik oder «nicht verbunden». Eine Fabrik zeigt die Städte in Reichweite und ihren Ertrag. Verbundene eigene Stationen tragen beim Hineinzoomen einen grünen Punkt.
- **Abgestimmt** (Weltkarte, nur Computer-Spieler, Bahn-Gold pro Minute nach 10 / 20 / 30 Minuten): bisher 2.3M / 4.7M / 5.2M, mit Lieferungen 1.7M / 4.5M / 5.5M.

## Häfen nach Stufe (`G.HAFEN`, `tickPort`, `shipKind`, `portRange` in `src/04_units.js`)
- **Takt:** Ein Hafen der Stufe L schickt √L-mal so oft ein Schiff wie einer der Stufe 1.
- **Reichweite:** 480 × (1 + 0.15 × √L), in den Feldern, wie OpenFront sie für den Lohn zählt. Als blauer Kreis zu sehen beim Bauen eines Hafens und bei offener Karte eines Hafens; gestrichelt die doppelte Reichweite der Containerschiffe.
- **Grössere Schiffe**, mit steigender Chance:
  - **Grossfrachter** ab Stufe 5 (4 % pro Stufe, höchstens 60 %): Ladung ×3, muss 4 Mal getroffen werden.
  - **Containerschiff** ab Stufe 25 (3 % pro Stufe, höchstens 50 %): Ladung ×10, 15 Treffer, doppelte Reichweite.
  - Ein Kriegsschiff trifft einmal pro Sekunde, solange es daneben ist. Ein gelber Balken zeigt, was übrig ist.
- **Kapern** bringt nur die Hälfte der Ladung (`loot`).
- **Züge:** Jeder zweite Zug, der einen Hafen erreicht, schickt ein zusätzliches Schiff mit der Hälfte seines Lohns als Ladung (`trainShip`).
- **Gemessen** (Weltkarte, nur Computer-Spieler, die ihre Häfen nicht ausbauen): Handel pro Minute nach 10 / 20 / 30 Minuten bisher 5.5M / 9.6M / 11.2M, nach Stufe 3.7M / 6.6M / 7.0M. Gerechnet für einen Hafen: Stufe 9 bringt etwa viermal, Stufe 25 etwa zwölfmal so viel wie Stufe 1; der Ausbau bis 25 zahlt sich nach etwa 20 Minuten aus.

## Gebäude nach Stufe (entfernt am 23.11.2026)
Vom 22. bis 23.11.2026 änderte sich das Zeichen mit der Stufe (Dorf, Stadt, Grossstadt; Hafen mit Kran; Fabrik mit zwei Kaminen) und trug Ringe ab Stufe 10 und 25. Ersetzt durch einen gleichen Kreis für alle Gebäude mit der Stufe als Zahl darüber, wie OpenFront (`doku/aenderungen.md`).

## Bots
Vorgabe ein Bot je 850 Landfelder (vorher 630), höchstens 600, damit die Erde weniger ruckelt. Eine gespeicherte Zahl wird einmal zurückgesetzt.
