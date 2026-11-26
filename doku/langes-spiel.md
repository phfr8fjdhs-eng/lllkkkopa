# Spielmodus «Langes Spiel» (seit 26.11.2026)
Ein eigener Modus neben «Klassisch» und «Arsenal», auf dem Startbildschirm unter «Spielmodus». Er ist nicht mit «Arsenal» kombinierbar. Option `opts.lang`, im Spiel `game.lang`. Das klassische Spiel bleibt unverändert: Jede Regel des Modus steht im Code hinter `this.lang`, die Zahlen in `G.LANG` (`src/03_game.js`). Test: `node test/lang.js`, Gleichlauf `node test/det.js lang`.

## Ziel
Ruhiger, mehr Zeit zum Planen, taktischer. Runden von etwa **70 Minuten** (festgelegt am 26.11.2026). Bündnisse, Infrastruktur im eigenen Land und Abschreckung mit Atomwaffen sollen wichtig werden, und Heer, Marine und Luftwaffe sollen gleich gut möglich sein. Das späte Spiel soll nicht aus Stapeln bestehen (Flugabwehr, Truppen), und wer einmal nicht aufpasst, soll nicht sofort verloren haben.

Die Regel aus `doku/vision.md` (Runden höchstens etwa 40 bis 45 Minuten) gilt für das klassische Spiel; dieser Modus ist bewusst länger.

## Pakete
1. Tempo, Vorbereitung, Verteidigung, Abwehr (in Arbeit)
2. Bomben, Raketen, Bedienung (Atomwaffen als Abschreckung, Reichweite ab dem Silo, Waffenleiste, Schläge planen, Zweitschlag)
3. Nebel, Aufklärung, Bündnisse
4. Forschung (Unis, Stufen, Doktrin; dazu ein Ausbau «Infrastruktur» für Versorgung und Schutz der Städte)
5. Luftwaffe
6. Marine
7. Im eigenen Land
8. Inseln als Stützpunkte

Nach jedem Paket werden ein paar Runden gespielt und die Zahlen abgestimmt. Alle Zahlen hier sind Startwerte.

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

## Geplant für Paket 1 (abgesprochen 26.11.2026, noch nicht gebaut)
- **1b Marsch und Grenze:** Truppen marschieren langsamer (`BASE` 20 → 40 Ticks pro Zelle), Schienen schneller, aber nicht sofort (Faktor 0.2 → 0.3). Die Dichte eines Nachbarn sieht man nur bis etwa 2 Zellen hinter der eigenen Grenze (nur Anzeige). Meldung «Truppen sammeln sich an deiner Grenze (X)», wenn die Truppen eines Nachbarn an der gemeinsamen Grenze in einer Minute um mindestens 50 % und um mindestens 10 % der eigenen Armee steigen; danach 90 s Ruhe pro Nachbar.
- **1c Abnutzung bei Überdichte:** ab Minute 20 verliert eine Frontzelle mit mehr als der doppelten Dichte des Frontschnitts 1 % des Überschusses pro Minute, gemildert durch Versorgung (Stadt, Schiene, Hafen in der Nähe). Ein eigenes Versorgungsdepot gibt es erst mit der Forschung (Ausbau «Infrastruktur», Paket 4).
- **1d Eingraben und Verteidigungsposten:** Eine ruhige Frontzelle gräbt sich in 2 Minuten ein (Verluste des Angreifers bis ×2, Zeit bis ×1.5, sichtbar als dunkler Saum). Verteidigungsposten mit grösserem Radius und stärker, Felder in ihrem Umkreis zählen mindestens mit Dichte 2. Ziel: Der Angreifer braucht gegen eingegrabene, normal dichte Truppen etwa die dreifache Stärke.
- **1e Zwei Flugabwehren:** kleine Flugabwehr (Taste `6`, gegen Marschflugkörper, 2 Schüsse pro Stufe) und Raketenabwehr (Taste `J`, nur gegen Atombombe, Wasserstoffbombe, Sprengköpfe, 1 + ⌊Stufe / 4⌋ Schüsse, Nachladen 9 s · 8 / (Stufe + 7)). Abnehmender Schutz bei mehreren eigenen nahe beieinander: Nachladen ×1, ×2, ×4 …
- **1f Evakuieren und Schutzräume:** Bombe auf eine Stadt nimmt ihr Stufen (Sprengkopf ¼, Atombombe ½, Wasserstoffbombe alle, mindestens eine), ihre Bevölkerung (ihr Anteil am Truppen-Limit, so voll wie das Land) stirbt. Evakuiert sterben nur 33 % der Bevölkerung der neuen Stufe; dafür wächst die Stadt 60 s nicht, danach kommt ihr Wachstum über 3 Minuten langsam zurück. Schutzräume (Ausbau der Stadt) halbieren verlorene Stufen und Tote.
