# Spielmodus «Langes Spiel» (seit 26.11.2026)
Ein eigener Modus neben «Klassisch» und «Arsenal», auf dem Startbildschirm unter «Spielmodus». Er ist nicht mit «Arsenal» kombinierbar. Option `opts.lang`, im Spiel `game.lang`. Das klassische Spiel bleibt unverändert: Jede Regel des Modus steht im Code hinter `this.lang`, die Zahlen in `G.LANG` (`src/03_game.js`). Code der eigenen Regeln: `src/04c_lang.js`. Test: `node test/lang.js`, Gleichlauf `node test/det.js lang`, Eingraben `node test/kampf.js lang`.

## Ziel
Ruhiger, mehr Zeit zum Planen, taktischer. Runden von etwa **70 Minuten** (festgelegt am 26.11.2026). Bündnisse, Infrastruktur im eigenen Land und Abschreckung mit Atomwaffen sollen wichtig werden, und Heer, Marine und Luftwaffe sollen gleich gut möglich sein. Das späte Spiel soll nicht aus Stapeln bestehen (Flugabwehr, Truppen), und wer einmal nicht aufpasst, soll nicht sofort verloren haben.

Die Regel aus `doku/vision.md` (Runden höchstens etwa 40 bis 45 Minuten) gilt für das klassische Spiel; dieser Modus ist bewusst länger.

## Pakete
1. Tempo, Vorbereitung, Verteidigung, Abwehr (gebaut 26.11.2026, Teile 1a bis 1f unten)
2. Bomben, Raketen, Bedienung (gebaut 26.11.2026, unten)
3. Nebel, Aufklärung, Bündnisse (gebaut 26.11.2026, unten)
4. Forschung (gebaut 26.11.2026, unten)
5. Luftwaffe (gebaut 26.11.2026, unten)
6. Marine
7. Im eigenen Land
8. Inseln als Stützpunkte

Nach jedem Paket werden ein paar Runden gespielt und die Zahlen abgestimmt. Alle Zahlen hier sind Startwerte.

## Entscheidungen für spätere Pakete (26.11.2026)
- **Nebel (Paket 3):** Namen der Länder sind immer sichtbar. Truppen nur als grobe Schätzung (zum Beispiel beim Darüberfahren); genauer durch Spione (laufend oder als wiederholte Meldungen), gute Bündnisse und Forschung.
- **Tarnbomber (Paket 5):** trägt eine normale Atom- oder Wasserstoffbombe (wirkt auf Truppen und Gebäude). Er darf nicht von einer Flugabwehr der Stufe 2 sofort abgeschossen werden: Regel noch auszuarbeiten (etwa ein toter Winkel direkt über der Flugabwehr, Erfassen braucht Zeit, oder er wirft viele kleine Bomben).
- **Rüstungsindustrie (Paket 7):** ja.
- **Inseln (Paket 8):** Liste vom 26.11.2026 gilt: Malta, Zypern, Kreta, Korsika, Sardinien, Azoren, Kanaren, Kapverden, Bermuda, Ascension, St. Helena, Falklandinseln, Island, Färöer, Diego Garcia, Seychellen, Mauritius, Sri Lanka, Andamanen, Okinawa, Guam, Midway, Hawaii, Wake, Tahiti.

## 1a. Die Welt wirkt grösser (26.11.2026)
Alles auf dem Meer und in der Luft ist langsamer und reicht weniger weit, der Bodenkampf bleibt im Tempo. So wirken Meer und Entfernungen im Verhältnis zum Land grösser, ohne dass die Karte mehr Felder bekommt.

| Was | Faktor | Erde (Massstab S = 1) |
| --- | --- | --- |
| Schiffe: Handel, Transportboote, Kriegsschiffe (`game.pace`) | `G.LANG.world` = 0.5 | 0.5 statt 1 Feld pro Tick, Atlantik etwa 160 s statt 80 s |
| Atombombe, Wasserstoffbombe, Marschflugkörper, MIRV-Sprengköpfe (`R.nukeSpeed`) | `G.LANG.air` = 0.4 | 2.4 statt 6 Felder pro Tick, Atlantik etwa 33 s statt 13 s |
| Abwehrrakete der Flugabwehr (`sammSpeed`) | 0.4 | wie die Bomben, damit das Abfangen gleich aufgeht |
| Reichweite der Flugabwehr (`samRange`) | 0.5 | 35 bis 75 statt 70 bis 150 Felder |
| Kriegsschiffe: Schussweite, Patrouille, Reparatur in Hafennähe | 0.5 | |
| Reichweite der Häfen (Frachter, Massengut, Container) | 0.5 | 175 / 350 / 700 statt 350 / 700 / 1400 |
| Züge, Granaten, Bodenkampf, Gebäudeabstand, Sprengradien | 1 | unverändert |

- Züge und Granaten haben dafür ein eigenes Tempo (`game.pace0`). Sonst würde das Bahngold halbiert, und Granaten wären langsamer als die Schiffe, die sie treffen sollen.
- Silos haben noch keine Reichweite; die kommt mit Paket 2.
- **Beobachten:** Mit der halben Hafenreichweite gibt es weniger Handelswege und damit weniger Seegold. Fehlt das spürbar, wird das Gold pro Fahrt erhöht, nicht die Reichweite (Paket 6 macht Seehandel ohnehin wertvoller).
- Szene «Änderungen» 121.

## 1b. Marsch und Grenze (26.11.2026)
- **Marsch langsamer:** 4 s statt 2 s pro Zelle offenes Land (`G.LANG.march` = 40 Ticks). Schienen helfen weiter, aber weniger: in der Zelle der Schiene 0.3, eine daneben 0.5, zwei daneben 0.8 (klassisch 0.2 / 0.45 / 0.75, `G.LANG.rail`). Grosse Länder brauchen damit von selbst länger, um Truppen über weite Wege zu verlegen.
- **Dichte des Nachbarn nur an der Grenze:** Die dunklere Schattierung dichter Truppen zeigt ein fremdes Reich nur bis 2 Zellen (32 Felder) hinter der eigenen Grenze (`G.LANG.seeCells`), ebenso die Angabe «Truppen … × so dicht» beim Darüberfahren. Verbündete ganz. Nur Anzeige (`shadeScan` in `src/06_view.js`, `shadeNear`); tiefer sieht man mit Aufklärung (Paket 3).
- **Meldung «Truppen sammeln sich an deiner Grenze (X)»** (`langMass` in `src/04c_lang.js`): Alle 5 s misst die Simulation, wie dicht ein Nachbar entlang der gemeinsamen Grenze steht (1 = sein Schnitt). Gemeldet wird, wenn diese Dichte gegenüber dem dünnsten Moment der letzten Minute um mindestens 50 % steigt, über dem 1.5-Fachen seines Schnitts liegt und dort mindestens 3 % der eigenen Armee dazugekommen sind; dann 90 s Ruhe für diesen Nachbarn. Wachstum des ganzen Reichs zählt nicht, es hebt alle Zellen gleich. Nationen stehen gleichmässig und lösen sie darum nicht aus.
- Szene 122.

## 1c. Abnutzung bei Überdichte (26.11.2026)
- `langWear` in `src/04c_lang.js`, alle 5 s je Reich mit Netz. **Front** sind die eigenen Zellen, die an das Land eines Menschen oder einer Nation grenzen, mit der man nicht verbündet ist.
- Ab Minute 20 (`G.LANG.wearFrom`) verliert eine Frontzelle, die mehr als doppelt so dicht steht wie der Schnitt der eigenen Front (`wearOver`), 1 % des Überschusses pro Minute (`wear`):

  Verlust pro Minute = 0.01 · (1 − Versorgung) · (Truppen der Zelle − 2 · Frontschnitt).
- **Versorgung** 0 bis 1 (`langSupply`): Schiene in der Zelle 1, daneben 0.7, zwei daneben 0.3; eigene Stadt in derselben oder der Nachbarzelle 0.4 + 0.15 · Stufe (ab Stufe 4 voll), zwei Zellen weg die Hälfte; Hafen 0.6. Volle Versorgung heisst keine Abnutzung.
- Eine Meldung sagt es, höchstens alle 5 Minuten.
- Gleichmässige Dichte kostet nie etwas, ebenso alles bis zum Doppelten. Ein eigenes Versorgungsdepot kommt mit der Forschung (Ausbau «Infrastruktur», Paket 4).
- Szene 123 (dort gilt die Abnutzung sofort).

## 1d. Eingraben und Verteidigungsposten (26.11.2026)
- **Eingraben** (`digOf`, `digLose`): Jede Zelle eines Reichs mit Netz gräbt sich in 2 Minuten ein (`digTicks`), neues Land beginnt bei 0. Ganz eingegraben verliert ein Angreifer dort 3-mal so viele Truppen (1 + `digLoss` 2) und braucht 1.75-mal so lange (1 + `digTime` 0.75). Jedes verlorene Feld nimmt der Zelle 0.4 % davon (`digDrop`): Ein Durchbruch gräbt die Verteidigung auf.
- **Verteidigungsposten:** Radius 1.5-mal so gross (`postR`), Verluste des Angreifers × (5 + 3 · Stufe) statt × (3 + 2 · Stufe), Zeit × (1 + 3 · Stufe) statt × (1 + 2 · Stufe); ein Feld in seinem Umkreis zählt mindestens doppelt so dicht (`postDens`), auch wenn dort kaum Truppen stehen. Kosten wie bisher in Gold.
- Beim Darüberfahren über eigenes Land steht «eingegraben X %».
- **Gemessen** (`node test/kampf.js lang`, ganze Front mit allen Truppen gegen eine Nation mit 80K auf 3000 Feldern):

| Angreifer | frisch | eingegraben |
| --- | --- | --- |
| 1.5-fach | erobert | steckt bei 23 % |
| 2-fach | erobert | steckt bei 43 % |
| 2.5-fach | erobert | steckt bei 71 % |
| 3-fach | erobert | erobert |

  Erste Fassung (Verluste × 2, Zeit × 1.5, 2 % pro verlorenem Feld): eingegraben reichte schon das Doppelte, weil die breite Front jede Zelle schnell aufgrub.

## 1e. Zwei Flugabwehren (26.11.2026)
Im klassischen Spiel gibt jede Stufe einer Flugabwehr einen Abfangschuss mehr: Eine einzelne der Stufe 10 hält alles auf, verteilte der Stufe 1 bringen nichts. Im Modus gibt es darum zwei Arten (`samCan`, `samShotsOf`, `samReload` in `src/04c_lang.js`; im Spiel Flugabwehr mit `u.cls` 0 oder 1, auf der Seite die Nummer 4.5 für die Raketenabwehr wie 7.5 für das Schlachtschiff):

| | kleine Flugabwehr (Taste `6`) | Raketenabwehr (Taste `J`) |
| --- | --- | --- |
| trifft | Marschflugkörper (später Flugzeuge, Kurzstreckenraketen) | Atombombe, Wasserstoffbombe, MIRV-Sprengköpfe |
| Schüsse pro Salve | 2 pro Stufe (`samShots`) | 1 + ⌊Stufe / 4⌋: Stufe 1: 1, 4: 2, 8: 3, 10: 3 |
| Nachladen | 9 s | 9 s · 8 / (Stufe + 7): Stufe 1: 9 s, 10: 4.2 s |
| Reichweite | wie bisher mit der Stufe, × 0.5 (1a) | ebenso |
| Preis | wie bisher | × 1.5 (`abmCost`), teilt die Preisleiter mit der kleinen |

- **Abnehmender Schutz:** Steht eine eigene Flugabwehr derselben Art schon in Reichweite, lädt die neuere halb so schnell nach, bei zwei älteren ein Viertel so schnell und so weiter (`abmStack` 0.5). Gerechnet nur, wenn eine gebaut, zerstört oder erobert wird (`samSig`).
- Die kleine schiesst auf Bomber später nur auf das Flugzeug, nicht auf seine Bomben (kommt mit Paket 5).
- Bauleiste: Die Zahl auf der Flugabwehr zeigt die Abwehrschüsse dieser Art zusammen. Auf der Karte ist die Raketenabwehr ein Sechseck mit zwei Raketen, die kleine bleibt die Raute.
- Nationen bauen im Modus zuerst eine Raketenabwehr, dann eine kleine.
- Szene 124.

## 1f. Bomben auf Städte, Evakuieren, Schutzräume (26.11.2026)
Eine Stadt trägt die Bevölkerung: Truppen-Limit und Wachstum. Ihre **Bevölkerung** ist ihr Anteil am Truppen-Limit, so voll gefüllt wie das ganze Land: 250K · Stufe · Truppen / Limit (`cityPeople`).
- **Treffer** (`cityHit` in `src/04c_lang.js`, aus `detonate`): Eine Stadt im inneren Sprengring verliert einen Anteil ihrer Stufen (`G.LANG.cityHit`), im äusseren Ring die Hälfte davon, immer mindestens eine. Ihre Bevölkerung stirbt (im äusseren Ring die Hälfte). Das Feld der Stadt bleibt beim Besitzer, solange sie steht.

| Bombe | Stufen weg (innen) |
| --- | --- |
| Sprengkopf (MIRV) | ¼ |
| Atombombe | ½ |
| Wasserstoffbombe | alle (Stadt weg) |

- **Evakuieren:** Fliegt eine feindliche Atombombe, Wasserstoffbombe, ein MIRV oder Sprengkopf auf eine eigene Stadt, erscheint oben eine Zeile mit «Evakuieren» und den Sekunden bis zum Einschlag (`cityThreat`, Befehl `{k:'evac', t}`). Evakuiert sterben nur 33 % der Bevölkerung der Stufe nach dem Treffer (`evacDie`). Dafür trägt die Stadt 60 s nichts zum Wachstum bei (`evacStop`) und kommt danach über 3 Minuten langsam zurück (`evacBack`); gerechnet alle 5 s als Anteil am Wachstum (`langEvacW`, `p.evacW`). Ein Befehl gilt 90 s (`evacHold`).
- **Schutzräume:** ein Ausbau der Stadt in ihrer Ausbaukarte, einmalig 250K (`shelterCost`, Befehl `{k:'shelter', t}`), kein eigenes Gebäude. Halbieren verlorene Stufen und Tote.
- Beispiel (Szene 125, Stadt Stufe 10, Atombombe genau darauf): evakuiert Stufe 10 → 5 und 4.6K Tote; mit Schutzräumen, nicht evakuiert, Stufe 10 → 7 und 15.5K Tote.
- Zivilschutz (automatisches Evakuieren) kommt mit der Forschung (Paket 4). Der **Zweitschlag** kommt mit Paket 2, weil es erst dort eine Vorbereitungszeit für Atomwaffen gibt.
- Marschflugkörper und Satellitenstrahl zerstören eine Stadt noch wie bisher; der Marschflugkörper nimmt mit Paket 2 einen Anteil der Stufen.
- Szene 125.

## Paket 2: Bomben, Raketen, Bedienung (26.11.2026)
Code: `src/04c_lang.js` (Abschnitt «weapons»), Haken in `buildCheck`, `build`, `launch`, `detonate` (`src/04_units.js`), Zahlen in `G.LANG`.

### 2a. Atomwaffen als Abschreckung
- **Preis:** Atombombe und Wasserstoffbombe 8-mal so teuer (6M, 40M), MIRV 4-mal (100M, jeder weitere 60M mehr) (`nukeCost`).
- **Erst spät:** Atombombe ab Minute 30, Wasserstoffbombe ab 45, MIRV ab 60 (`nukeFrom`, `weaponWhy`).
- **Scharfmachen** (`armSilo`, `langArmTick`): Eine Atomwaffe startet nicht sofort. Das Silo macht sie 30 s (Wasserstoffbombe 45 s, MIRV 60 s) scharf (`arm`), solange kann es nichts anderes. Alle sehen das: ein pulsierender roter Ring mit «☢ X s» am Silo und die Meldung «Raketensilo von X macht eine Atombombe scharf». Mit dem Nebel (Paket 3) sieht es nur, wer das Silo sieht.
- **Zweitschlag** (`langNukeHit`): Wer von einer Atomwaffe getroffen wird, dessen Silos, die gerade eine Atomwaffe scharfmachen, feuern sofort.
- **Ächtung** (`langLaunch`): Wer eine Atomwaffe startet, verliert alle Bündnisse, 10 Minuten keinen Handel (`canTrade`), und jeder Angriff auf ihn verliert so lange nur 1 / 1.25 so viele Truppen (`outlawHit`). Hinter seinem Namen steht «✖».
- **Atommacht** (`nuclearPower`): Ab Minute 30 trägt jeder mit einem Silo «☢» hinter dem Namen, für alle sichtbar.
- Atomwaffen werden nicht verbessert (keine Forschung dafür).

### 2b. Konventionelle Waffen
| Waffe | Preis | Reichweite (Erde) | Wirkung | Abfangen |
| --- | --- | --- | --- | --- |
| Marschflugkörper | 350K, +25 % für jeden in den letzten 30 s | 300 | nimmt Gebäuden im Umkreis ¼ ihrer Stufen (mindestens 1, Stufe 1 fällt; Schutzräume halbieren) | kleine Flugabwehr, halbe Reichweite |
| Kurzstreckenrakete | 500K | 150 | wie der Marschflugkörper, 4-mal so schnell wie eine Atombombe | kleine Flugabwehr, nur ein Viertel der Reichweite |
| Streubombe | 400K | 300 | tötet Truppen in einem grossen Gebiet, nimmt kein Land, lässt Gebäude stehen | kleine Flugabwehr, halbe Reichweite |
| Bunkerbrecher | 600K | 300 | zerstört Gebäude in einem kleinen Kreis ganz, auch mit Schutzräumen | ebenso |
| Thermobare Bombe | 1.5M | 300 | mittleres Gebiet, Truppen und Gebäude, Städte verlieren gut ein Drittel ihrer Stufen; keine Verstrahlung, keine Ächtung | ebenso |
| Atombombe | 6M | 800 | wie bisher, Städte siehe 1f | Raketenabwehr |
| Wasserstoffbombe | 40M | 1500 | wie bisher | Raketenabwehr |
| MIRV | 100M | ganze Welt | wie bisher | Sprengköpfe: Raketenabwehr |

- Keine Verstrahlung bei allen konventionellen Waffen. Bunkerbrecher und thermobare Bombe sind in Paket 4 eine «ODER»-Wahl der Forschung; bis dahin gibt es beide.

### 2c. Reichweite ab dem Silo
- Jede Waffe reicht nur so weit vom Silo (`range`, in Feldern der 5600 Felder breiten Erde, umgerechnet auf die Breite der Karte, aber mindestens wie auf einer 2400 breiten Karte, `rangeW`, sonst reicht auf kleinen Karten kaum etwas). Auf einer 320 breiten Karte: Kurzstrecke 64, Marschflugkörper 129, Atombombe 343, Wasserstoffbombe 643 Felder.
- Gewählt wird das nächste geladene Silo in Reichweite; sonst «Kein Silo in Reichweite». Beim Zielen zeigen gestrichelte weisse Kreise die Reichweite jedes eigenen Silos.
- **Silo wählen:** Mit einer Waffe am Mauszeiger ein eigenes Silo antippen wählt es für die nächsten Schüsse (weisser Ring), nochmals antippen nimmt die Wahl zurück. Befehl `build` mit `s` (Silo).
- Ein Silo, das feuert, verrät seinen Standort: gilt mit dem Nebel (Paket 3).

### 2d. Bedienung
- **Waffenleiste:** Taste `R` (oder der erste Knopf der Leiste, «Waffen» / «Bauen») schaltet die Bauleiste auf die Waffen um: `1` Marschflugkörper, `2` Streubombe, `3` Bunkerbrecher, `4` thermobare Bombe, `5` Kurzstreckenrakete, `6` Atombombe, `7` Wasserstoffbombe, `8` MIRV. In der Bauleiste stehen dann nur Gebäude und Schiffe (wie bisher `1` bis `8`, dazu `J` Raketenabwehr).
- **Schläge planen:** Shift + Klick mit einer Waffe setzt ein Ziel (gelbes Fadenkreuz mit Nummer und Linie zum Silo), bis 12. `Enter` feuert alle zusammen, `Backspace` nimmt das letzte weg, `Esc` verwirft alle. Die Simulation (`salvo`, `langSalvoTick`) startet jede Waffe so, dass alle gleichzeitig einschlagen (Scharfmachen eingerechnet); jede wird beim Start geprüft und bezahlt. Das ist die Antwort auf starke Flugabwehr, die pro Salve nur wenige abschiesst.
- Szenen 126 (Abschreckung) und 127 (konventionelle Waffen).

## Paket 3: Nebel, Aufklärung, Bündnisse (26.11.2026)
### 3a. Nebel (nur Anzeige)
- Code: `fogScan`, `fogHides`, `drawFog`, `G.troopsSeen` in `src/06_view.js`. Das Raster ist das der Aufstellung (Zellen 16 × 16 Felder, statt der besprochenen 8 × 8: es ist schon da, und auf der Erde sind es so etwa 60 000 Zellen).
- **In Sicht** ist, was höchstens 3 Zellen (etwa 50 Felder) vom eigenen Land entfernt liegt, in Schritten gezählt, nicht im Kreis (`G.LANG.fogSee`); dazu das Land von Verbündeten nach 5 Minuten samt Rand, der Kreis der eigenen Radare (und derer von Verbündeten nach 15 Minuten) und das ganze Land eines Reichs, in dem ein eigener Spion ist.
- **Im Nebel** sieht man nur, wem das Land gehört, und den Namen. Keine Gebäude, Schiffe, Bomben, keine Dichte (dazu weiterhin nur 2 Zellen hinter der Grenze, 1b). Über dem Nebel liegt ein dunkler Schleier.
- **Truppen** (Namen auf der Karte, Rangliste, Info, Karte beim Darüberfahren, Urteil beim Angriff): genau für sich selbst, Verbündete nach 5 Minuten und Reiche unter Spionage; mit zwei Ziffern («~35K»), wenn der Name des Reichs in Sicht ist; sonst mit einer Ziffer («~40K»), eine grobe Schätzung.
- **Ausnahmen:** Eine Bombe, die auf das eigene Land zielt, erscheint spätestens 10 s vor dem Einschlag. Ein Silo, das feuert, ist eine Minute lang für alle sichtbar (`firedAt`). Ein Boot, das zu einem fährt, ist immer zu sehen.
- Neu gerechnet höchstens einmal pro Sekunde, und nur wenn sich das eigene Land, das eines Verbündeten oder etwa alle 10 s etwas anderes geändert hat. Auf der Seite gerechnet, die Simulation ändert sich dadurch nicht. Bots und Nationen sehen weiter alles (Nebel als Regel in der Simulation erst, wo nötig). Ein Server könnte später jedem Spieler nur seine Sicht schicken.

### 3b. Aufklärung
- **Radar** (Taste `X` in der Bauleiste, 1M, `G.LANG.radarCost`): im Spiel eine Flugabwehr der Klasse 2 (`u.cls` = 2, auf der Seite die Nummer 4.7), schiesst nicht. Sieht im Kreis von (140 + 40 · √Stufe) · S Feldern alles, auch im Nebel und über die Grenze hinaus (`radarRange`). Gezeichnet als Zehneck mit Schüssel.
- **Spion:** in der Info eines anderen Reichs «Spion schicken (500K)» (Befehl `{k:'spy', p}`, `sendSpy`). 5 Minuten lang sieht man dort Truppen genau, die Dichte und alle Gebäude (`spying`). Die Forschung (Paket 4) zeigt er dann auch.
- Satellit, Frühwarnradar und Tarnung erkennen kommen mit der Forschung (Paket 4).

### 3c. Bündnisse werden wertvoller
- Ein Bündnis merkt sich, seit wann es besteht (`al.since`, `allyAge`). Sofort: die Grenzen wie bei jedem. Nach 5 Minuten: die Sicht des Partners (`allySees`) und seine Truppen genau. Nach 15 Minuten: auch sein Radar, und man darf Stützpunkte bauen (`allyRadar`). Die Info des Partners sagt, wie weit das Bündnis ist.
- Wer bricht, verliert alles; ein neues Bündnis beginnt bei null.

### 3d. Stützpunkte
- Hafen, Silo oder Flugabwehr (auch Raketenabwehr und Radar) im Land eines Verbündeten, mit dem man seit 15 Minuten verbündet ist (`baseHost`, `buildCheck`). Ein Mensch muss es erlauben («Stützpunkte erlauben» in der Info des Verbündeten, Befehl `{k:'host', p, on}`), eine Nation erlaubt es immer.
- Der Stützpunkt gehört dem Bauenden (`u.base` = Gastland). Er zahlt dem Gastland 100 Gold pro Tick (60K pro Minute, `rent`), auch wenn ihm das Gold ausgeht, bis zu dem, was er hat.
- Endet das Bündnis, geht der Stützpunkt nach 30 s an das Gastland (`baseLeave`, `langBases`). Erobert ein anderer das Feld, nimmt er ihn wie jedes Gebäude.
- Der Flugplatz als Stützpunkt kommt mit Paket 5.
- **Technik weitergeben** kommt mit der Forschung (Paket 4).
- Szenen 128 (Nebel und Radar) und 129 (Bündnis, Stützpunkt, Spion).

## Paket 4: Forschung (26.11.2026)
Code: `G.TECH`, `research`, `langResearch`, `techWhy`, `techOffer` in `src/04c_lang.js`; das Fenster `showTech` in `src/07_ui.js` (Knopf mit dem Kolben oben).

### Unis
- Ein **Ausbau der Stadt** (`u.uni`), kein eigenes Gebäude: Für Gebäude ist im Spielkern keine Nummer mehr frei, und «nur in Städten ab einer bestimmten Grösse» passt dazu. Ab Stadtstufe 5 (`uniLevel`), höchstens 3 (`uniMax`), Bau 1M (`uniCost`), Unterhalt 50 Gold pro Tick (30K pro Minute, `uniUpkeep`). Ohne Gold steht sie still.
- Jede Uni bringt 0.8 · (1 + Stufe der Stadt / 10) Punkte pro Sekunde (`uniRp`) und forscht an einer Sache. Stufen kosten Punkte, kein Gold: 120, 240, 420, 600, 900 je Stufe 1 bis 5 (`tierCost`).
- Fällt die Stadt, ist die Uni weg; was sie für eine Stufe schon gesammelt hatte, bleibt für den nächsten Versuch (`techPts`), Erforschtes bleibt.
- Stufe 1 und 2 ab dem Start, 3 ab Minute 15, 4 ab 30, 5 ab 45 (`tierFrom`).
- Bei **«oder»** schliesst die Wahl die andere für das ganze Spiel aus (`techDone`).
- **Sichtbar:** In der Info eines Nachbarn, Verbündeten oder Reichs unter Spionage steht «Forscht an: …».
- **Technik weitergeben:** In der Info eines Verbündeten Stufe und Preis wählen («schenken», 500K, 1M, 3M). Geschenktes gilt sofort; ein Verkauf ist 2 Minuten lang ein Angebot, das der Käufer im Forschungsfenster annimmt. Nationen kaufen, wenn sie das Doppelte an Gold haben.
- **Nationen** erhalten jede Stufe, sobald ihre Zeit da ist (bei «oder» die erste), damit sie weiter Flugabwehr und Waffen haben. Sie wählen nicht klug.
- In den Szenen von «Änderungen» ist alles erforscht, ausser in der Szene zur Forschung (`research: true`).

### Was die Forschung freischaltet oder verbessert
Ohne Forschung baut man im Modus weder Flugabwehr noch Radar, feuert keinen Marschflugkörper und keine Atomwaffe und hat keine Schutzräume.

| Zweig | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Doktrin | Blitzkrieg ODER Tiefenverteidigung | | | | |
| Aufklärung | Radarstation | Grösserer Radarkreis (×1.5); Bessere Spione (doppelt so lange, halber Preis) | Tarnung erkennen (wirkt ab Paket 5, Tarnbomber) | Frühwarnradar (Bomben im dreifachen Radarkreis sichtbar) | Satellit (jeder Start sichtbar) |
| Abwehr | Flugabwehr und Raketenabwehr | Mehr Schüsse (3 pro Stufe); Schutzräume | Noch mehr Schüsse ODER Mehr Reichweite (×1.3); Raketenabwehr gegen Atombomben; Stärkere Schutzräume (30 % statt 50 %) | Schneller nachladen (×0.7); Raketenabwehr gegen Wasserstoffbomben; Zivilschutz (Städte evakuieren selbst) | Raketenabwehr gegen MIRV-Sprengköpfe |
| Raketen | Marschflugkörper | Streubombe; Reichweite (×1.25) | Bunkerbrecher ODER Thermobare Bombe; Sprengkraft (35 % der Stufen) | Kurzstreckenrakete; Mehr Sprengkraft (50 %); Tempo (×1.3) | Hyperschall (×1.5 schneller, Flugabwehr erfasst nur in halber Weite) |
| Atomwaffen | | | | Atombombe | Wasserstoffbombe, MIRV |
| Heer | Eingraben (Angreifer bis × 4 Verluste) | Infrastruktur (Städte versorgen im doppelten Umkreis); Schienen (Marsch auf Schienen × 0.7) | Warthog (Keile 15 % billiger) ODER Apache (Feind hinter der Front × 1.3 langsamer); Stärkere Posten (× 1.3) | Panzerkeil (Schwung sinkt 30 % langsamer, braucht Blitzkrieg) | Stärkstes Eingraben (bis × 5, braucht Tiefenverteidigung); Pioniere (Gelände bremst den eigenen Angriff weniger) |

- **Blitzkrieg:** Marsch × 0.8 der Zeit, Stösse starten mit 10 % mehr Schwung. **Tiefenverteidigung:** Eingraben in 72 statt 120 s, Verteidigungsposten × 1.2, halbe Abnutzung bei Überdichte.
- Das «Infrastruktur» ist der besprochene Ausbau für Versorgung; die Schutzräume bleiben ein eigener Ausbau der Stadt.
- Zu jeder Angriffsforschung gibt es eine Gegenforschung: Raketen gegen Abwehr, Hyperschall gegen Frühwarnradar, Eingraben gegen Pioniere und Panzerkeil.
- Keine Forschung bringt mehr Gold.
- Die Zweige **Marine** und **Luftwaffe** kommen mit Paket 5 und 6 (sie brauchen deren Einheiten).
- **Gemessen** (`node test/kampf.js lang`): Nationen haben ab dem Start «Eingraben»; gegen eine ganz eingegrabene Nation braucht der Angreifer darum jetzt das 4-Fache (3-fach: steckt bei 65 %). Ohne diese Forschung bleibt es beim 3-Fachen (1d).
- Szene 130.

## Paket 5: Luftwaffe (26.11.2026)
Code: Abschnitt «the air force» in `src/04c_lang.js` (`planeCheck`, `launchPlane`, `tickPlane`, `tickField`, `tickFighter`, `stealthLocked`), Zeichnen `drawPlane` in `src/06_view.js`. Zahlen in `G.LANG` (`fieldCost`, `airR`, `planeSpeed`, `planeCost`, `stealth*`, `recon*`).

- **Flugplatz** (Taste `9` in der Bauleiste, 2M, Forschung «Flugplatz»): im Spiel ein Silo der Klasse 1 (`u.cls` = 1, auf der Seite 3.5), weil im Spielkern keine Gebäudenummer mehr frei ist; gezeichnet als Quadrat mit Flugzeug. Er schickt so viele Flüge gleichzeitig, wie er Stufen hat. Reichweite 250 Felder der Erde, wie die Waffen auf die Karte umgerechnet, +5 % pro Stufe, mit «Luftbetankung» × 1.5 (`airRange`). Kann als Stützpunkt bei einem Verbündeten stehen (3d).
- **Flugzeuge fliegen selbst** hin und zurück (`tickPlane`); niemand steuert sie. Nach der Landung braucht der Flugplatz den Hin- und Rückflug plus 20 s, bis derselbe Platz wieder startet. Fällt der Flugplatz, ist das Flugzeug bei der Rückkehr weg.
- **Bomber** (Waffenleiste `9`, 600K, Forschung «Bomber»): wirft am Ziel eine Streubombe (Truppen, kein Land, keine Gebäude). Die kleine Flugabwehr schiesst auf das Flugzeug, sobald sie es in Reichweite hat, nicht auf die Bomben (die fallen ungelenkt).
- **Tarnbomber** (Waffenleiste `0`, 2M plus der Preis der Bombe, Forschung «Tarnbomber», erst ab Minute 30): trägt eine Atombombe, mit der Forschung «Wasserstoffbombe» eine Wasserstoffbombe (feste Nutzlast). Wirkt wie die Bombe aus dem Silo, auf Truppen und Gebäude, mit Ächtung. Reicht doppelt so weit wie der Flugplatz. **Schutz gegen das Abschiessen** (deine Vorgabe: nicht von einer Flugabwehr der Stufe 2 sofort weg):
  - Nur die kleine Flugabwehr mit der Forschung «Gegen Tarnbomber» (Abwehr 5) kann überhaupt auf ihn schiessen.
  - Sie sieht ihn erst in einem Viertel ihrer Reichweite (`stealthSeen`) und muss ihn dort 3 s halten, bevor sie schiesst (`stealthLock`).
  - Er hält 2 Treffer aus (`stealthHp`).
  - So überfliegt er Mauern aus Flugabwehr; nur eine Flugabwehr direkt beim Ziel trifft ihn noch, meist auf dem Rückweg.
  - Auf der Karte sehen ihn andere nur im Kreis eines eigenen Radars mit «Tarnung erkennen» (Aufklärung 3).
- **Aufklärungsflugzeug** (Waffenleiste, ohne Taste, 200K, Forschung Aufklärung 2): deckt um sein Ziel 40 Felder eine Minute lang auf (`recon`).
- **Abfangjäger** (Forschung «Abfangjäger»): Ein Flugplatz schickt von selbst einen Jäger gegen feindliche Bomber und Marschflugkörper (und die anderen tief fliegenden Waffen) in seiner Reichweite; der Jäger holt sie ein, schiesst sie ab und fliegt zurück, dann 15 s Pause für diesen Platz.
- **Luftbrücke** (Luftwaffe 3): Ein Kessel in Reichweite eines eigenen Flugplatzes hungert nicht.
- **Warthog** (Heer 3) gilt jetzt im Umkreis eines eigenen Flugplatzes: Angriffe dort verlieren 15 % weniger.
- Forschung Luftwaffe: 1 Flugplatz, 2 Abfangjäger, 3 Luftbetankung und Luftbrücke, 4 Bomber, 5 Tarnbomber (braucht die Atombombe). Dazu Aufklärung 2 Aufklärungsflugzeug und Abwehr 5 «Gegen Tarnbomber».
- Szenen 131 (Luftwaffe) und 132 (Tarnbomber).

## Paket 6: Marine (26.11.2026)
Code: Abschnitt «the navy» in `src/04c_lang.js` (`shipFull`, `shipSpeed`, `langShip`, `subSeen`, `sonarNear`, `mineWhy`, `tickMine`, `shipFlak`, `escort`), Schiffsklassen in `G.SHIP_CLASS` (`src/04_units.js`), Zeichnen `war2`, `war3`, `drawMine`, `subShown` in `src/06_view.js`. Zahlen in `G.LANG` (`shipHp`, `shipUpkeep`, `tradeGold`, `sonarR`, `subShow`, `subQuiet`, `mine*`, `carrierSlots`).

- **Schwerere Schiffe:** Kriegsschiffe halten im Modus 1.5-mal so viel aus und kosten 1.5-mal so viel Unterhalt; langsamer sind sie schon seit Paket 1a (halbes Tempo auf See).
- **Mehr Gold zur See:** Handelsschiffe bringen 1.5-mal so viel (`tradeGold`). Das gleicht die halbe Reichweite der Häfen aus Paket 1a aus (nicht gemessen).
- **Klare Rollen:** Der Zerstörer jagt Boote und, mit Sonar, U-Boote und Minen. Das Schlachtschiff versenkt Kriegsschiffe und schiesst nicht auf Land. Das U-Boot versenkt Kriegs- und Handelsschiffe. Der Flugzeugträger trägt die Luftwaffe übers Meer.
- **U-Boot** (Schiffsklasse 2, auf der Seite 7.2, ohne Taste, Preis × 2, Forschung «U-Boot»):
  - Auf andere Spieler wirkt es unsichtbar: Kein Schiff zielt darauf, und die Karte zeigt es nicht.
  - Feuert es einen Torpedo, sehen es alle für 30 s (`subShow`).
  - Sonst findet es nur ein feindlicher Zerstörer mit der Forschung «Sonar» in 60 Feldern der Erde (`sonarR`, mal Reichweite des Modus); mit «Leise U-Boote» erst in 60 % davon.
  - Ein Torpedo versenkt ein Handelsschiff samt Ladung.
- **Seeminen** (auf der Seite 7.9, 150K, Forschung «Seeminen», höchstens 30):
  - Man legt sie auf Wasser in 120 Feldern um einen eigenen Hafen am selben Gewässer.
  - Andere sehen sie nicht.
  - Fährt ein feindliches Schiff auf eine Mine, versenkt sie Boote und Handelsschiffe und nimmt Kriegsschiffen 1500 Punkte; dabei geht die Mine hoch.
  - Ein feindlicher Zerstörer mit Sonar räumt sie aus 25 Feldern.
  - So lassen sich Häfen und Meerengen sperren.
- **Flugzeugträger** (Schiffsklasse 3, auf der Seite 7.7, Preis × 5, Forschung «Flugzeugträger»):
  - Er ist ein Flugplatz auf See: Bomber, Tarnbomber und Aufklärer starten von ihm, Abfangjäger von selbst.
  - Er hat 2 Startplätze und 0.6 der Reichweite eines Flugplatzes.
  - Er hat keine eigenen Geschütze.
  - Er zählt für Luftbrücke und Warthog wie ein Flugplatz.
  - Mit «Geleitschutz» fährt zu jedem neuen Träger ein Zerstörer mit.
- **Forschung Marine:**
  - Zerstörer: 2 Schnelle Zerstörer (× 1.25), 3 Sonar, 4 Flugabwehr an Bord (schiesst Bomber und Marschflugkörper in Geschützweite ab).
  - Schlachtschiff: 2 Panzerung (× 1.3), 3 Weitreichende Geschütze (× 1.3), 4 Schwere Granaten (× 1.3).
  - U-Boot: 1 U-Boot, 2 Seeminen, 3 Leise U-Boote, 4 Stärkere Torpedos (× 1.5).
  - 4 Flugzeugträger (braucht Flugplatz und Schnelle Zerstörer), 5 Geleitschutz.
- Szene 133 (Marine).

### 6b. Flotte (27.11.2026)
- **Raketen-U-Boot** (Marine 4, `ub3`): Es gibt nur ein U-Boot, und es kommt wie jedes Kriegsschiff aus dem Hafen. Mit dieser Forschung feuert es selbst Marschflugkörper, ohne Silo (`subCan`); ist die Atombombe oder Wasserstoffbombe erforscht, auch diese. Die Reichweite zählt ab dem U-Boot, ein Schuss nach dem anderen (ein Rohr, Nachladen wie im Silo). Wer feuert, ist 30 s sichtbar. Atombomben macht es scharf, ohne dass es jemand sieht; trifft eine Atomwaffe das eigene Land, startet die Bombe sofort (Zweitschlag).
- **Abwehrschiff** (Schiffsklasse 4, auf der Seite 7.3, Preis × 2.5, Marine 3):
  - Es hat keine Geschütze.
  - Alle 1.5 s schiesst es einen Marschflugkörper, eine Kurzstreckenrakete, einen Bomber oder ein Aufklärungsflugzeug in 60 Feldern ab (`flakR`, mal Reichweite des Modus).
  - Gegen Atomwaffen hilft es nicht.
- **Radarschiff** (Schiffsklasse 5, auf der Seite 7.4, Preis × 2, Marine 2, braucht «Radarstation»):
  - Es hat keine Geschütze.
  - Es hebt den Nebel in 80 Feldern um sich auf (`shipRadar`) und zeigt dort Tarnbomber.
- **Marineinfanterie** (Marine 3, `marinf`): Eigene Boote landen mit 1.25-mal so vielen Truppen (`marines`).
- **Nationen** bauen ab «U-Boot» mit einer Flotte ab und zu ein U-Boot und legen mit «Seeminen» bis zu 6 Minen vor ihre Häfen.
- Szene 135 (Flotte).

## Paket 7: Im eigenen Land (26.11.2026)
Code: `momentumStart` in `src/03_game.js`, `armFactory`, `armSilo`, `langArmTick` in `src/04c_lang.js`, `armHaul` in `src/06_view.js`. Zahlen in `G.LANG` (`pushCity`, `pushMass`, `armNoFab`, `armFab`, `armFabMin`, `armLost`).

- **Städte stützen den Stoss:** Ein Stoss bekommt mehr Schwung, wenn er aus Land startet, das eine Stadt versorgt.
  - Es zählt dieselbe Versorgung wie bei der Abnutzung (`langSupply`: Stadt, Hafen oder Schiene in der Nähe, grosse Städte mehr). Bei voller Versorgung sind es + 0.15 (`pushCity`).
  - Eine Kaserne gibt es nicht: Die Stadt ist die Kaserne.
  - Dichte Truppen geben ihren Schwung nur in versorgtem Land ganz, ohne Versorgung 60 % davon (`pushMass`).
  - Gilt nur mit dem Schalter «Schwung», der im Kampfsystem «Grenzland» an ist.
- **Rüstungsindustrie** (Atomwaffen, die im Silo scharfgemacht werden):
  - Die Waffe baut die eigene Fabrik, die dem Silo am nächsten liegt.
  - Eine gestrichelte Spur mit einem roten Punkt zeigt den Weg von der Fabrik zum Silo.
  - Jede Fabrikstufe über der ersten macht es 10 % schneller, bis zur halben Zeit. Ohne Fabrik dauert es doppelt so lange.
  - Fällt die Fabrik während der Arbeit, kommt die Waffe die halbe Zeit später. So werden Fabriken zu Zielen.
  - Vereinfachung: Der Weg folgt nicht den Schienen, und ein Zug fährt nicht wirklich.
  - Konventionelle Waffen starten wie bisher sofort.
- Szene 134 (Rüstungsindustrie).

## Paket 8: Inseln als Stützpunkte (26.11.2026)
Code: `G.ISLES`, `G.ISLE_R` und `buildWorld(def, cls, cost, hgt, { isles: true })` in `src/01_map.js`, `map.isle`, `freeLandNear` in `src/03_game.js`, `loadMap(id, seed, lang)` in `src/07_ui.js`. Test: `test/inseln.js`.

- Nur auf der Erde und nur in diesem Modus. Die Seite baut dafür eine eigene Erde (`erde+lang`) und hält immer nur eine der beiden im Speicher. Die klassische Erde bleibt gleich.
- **Die Liste (deine):** Malta, Zypern, Kreta, Korsika, Sardinien, Azoren, Kanaren, Kapverden, Bermuda, Ascension, St. Helena, Falklandinseln, Island, Färöer, Diego Garcia, Seychellen, Mauritius, Sri Lanka, Andamanen, Okinawa, Guam, Midway, Hawaii, Wake, Tahiti.
- **Bleiben, wie klein sie auch sind:** Sonst fällt jede Insel unter 100 Feldern weg (`G.MIN_ISLAND`). Jede Insel der Liste bekommt mindestens eine Scheibe mit Halbmesser 4 Feldern Land (rund 50 Felder, genug für Hafen und Flugplatz). Wo schon Land ist, ändert sich nichts.
- **Nationen starten nicht dort:** Nationen starten nicht auf den Inseln unter 1000 Feldern (`map.isle`), sondern auf freiem Land in der Nähe. Island und Sri Lanka sind grösser und bleiben offen.
- Keine Szene: Die Szenen laufen auf kleinen eigenen Karten, die Inseln gibt es nur auf der Erde. Geprüft mit `test/inseln.js`.
