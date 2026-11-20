# 3D-Nahansicht (19./20.11.2026)
Ab 2,5 Pixel pro Feld (`G.Z3D`) steht die Welt in 3D da, also bei dem Zoom, mit dem man normal spielt: Nach dem Start fliegt die Kamera auf 2,2 bis 6 (Handy 5,6, Desktop 6). Bis 20.11.2026 begann die Nahansicht erst bei 7, man sah sie beim Spielen fast nie (Rückmeldung des Besitzers: «viel zu klein, man sieht die Hälfte gar nicht»). Nur ganz weit draussen bleiben die flachen Zeichen für den Überblick. Es ist nur ein Bild: Keine Regel ändert sich, die Simulation wird nicht angefasst, Tippen und Klicken treffen dieselben Felder wie vorher. Code: `src/06b_close.js`, eingehängt in `View.draw` und `View.flush` (`src/06_view.js`). Ein- und ausschalten: Taste `J` oder das Menü («3D-Nahansicht beim Hineinzoomen»), gespeichert in `cfg.nah`.

## Was man sieht
| Im Spiel | In der Nahansicht |
| --- | --- |
| Stadt, Stufe 1 bis 4 | Ortschaft: Häuser mit Satteldach (Dächer im Farbton des Besitzers) um eine Kirche mit Turmspitze in der Besitzerfarbe, Feldwege, Bäume; jede Stufe drei Häuser mehr, ab Stufe 3 ein Rathaus |
| Stadt ab Stufe 5 | Häuserblöcke mit Stockwerken, Strassen mit Bäumen, Aufbauten auf den Dächern; wird mit jeder Stufe dichter, höher und breiter (logarithmisch) |
| Stadt ab Stufe 20 / 30 / 50 | Glasturm mit Aufsatz / Landeplatz auf dem Aufsatz / Mast mit Blinklicht |
| Ausbau einer Stadt | Die Stadt wächst sichtbar zur neuen Stufe, solange steht ein Kran auf dem Dach |
| Gebäude im Bau | Fundament, Gerüst bis zum Baufortschritt, Turmdrehkran, dazu der orange Fortschrittsring wie bisher |
| Fabrik | Backsteinhalle mit Sheddach, Schornsteine mit Rauch (ab Stufe 5 drei) |
| Hafen | Kai, Lagerhalle, Container, Portalkran |
| Verteidigungsposten | Bunker mit Sandsäcken, das Geschütz zeigt auf das nächste fremde Land |
| Flugabwehr | Werfer mit drei Raketen, drehendes Radar |
| Silo | Runde Silos (bis drei nach Stufe) mit Kuppel und Band in der Besitzerfarbe |
| Tarnturm | Mast mit Schüssel und violettem Schimmer |
| Eroberte Gebäude | brennen 20 Sekunden |
| Truppen | Panzer, Zug für Zug (siehe unten) |
| Angriff auf ein Reich | Panzerreihe an der Front auf der Seite des Angreifers, feuert auf die Felder, die sie nimmt; die Verteidiger in der Nähe feuern zurück |
| Felder, die im Kampf den Besitzer wechseln | Krater, die nach 18 s verblassen (nicht, wenn ein ganzes Reich auf einmal fällt) |
| Eingraben (`c.e` im Netz) | Sandsäcke an der eigenen Grenze zu anderen Reichen, je tiefer eingegraben, desto deutlicher |
| Kessel (`cut`) | eigene Panzer grau, mit Rauch |
| Gelände | Relief: Licht und Schatten aus den Höhendaten (siehe unten). Wald (auf der Erde aus der Bodenbedeckung, je nach Klima Laub- oder Nadelbäume), Bäume im Flachland, Felsen im Hügelland, Gipfel mit Schnee im Gebirge; nie auf Gebäuden, Schienen oder verstrahltem Land |
| Meer | kleine Lichtreflexe auf den Wellen, die kommen und gehen |
| Kriegsschiff | grauer Rumpf, Deck in der Besitzerfarbe, Brücke, Schornstein, Mast mit Flagge, zwei Geschütztürme, die auf das Ziel schwenken; Bugwelle und Kielwasser |
| Handelsschiff | dunkler Rumpf, gestapelte Container, Brücke am Heck (gekapert: brauner Rumpf) |
| Boot mit Truppen | Landungsboot in der Besitzerfarbe mit Soldaten an Deck |
| Zug | Lok in einem dunklen Ton der Besitzerfarbe mit Führerhaus, Wagen in der Besitzerfarbe |
| Rakete, Bombe im Flug | die bisherigen Raketen, aber 1,5-mal so gross, mit Rauchspur und Schatten am Boden |
| Atombombe, Sprengkopf, Wasserstoffbombe | Pilzwolke: eine Staubwelle rollt über den Boden, Stamm und Hut steigen in 3 s auf, glühen erst rot und gelb, werden dann zu Rauch, treiben ab und verblassen (Atombombe 10 s, Sprengkopf 7 s, Wasserstoffbombe 14 s). Der Boden darunter bleibt eine Minute versengt, in der Mitte glüht er einige Sekunden. Eine Wolke wird nie höher als 40 % des Bildschirms (höchstens 260 Pixel) |
| Marschflugkörper | Feuer und eine Säule schwarzen Rauchs |
| Zerstörtes Gebäude | Trümmer mit Mauerstümpfen, 30 s Rauch, verschwinden nach 90 s |
| Bau-Vorschau | das Gebäude selbst, durchscheinend und heller als die echten, auf einem gestrichelten weissen Ring; rot und blasser, wo es nicht stehen darf. Name und Preis oder der Grund darunter wie bisher |

Eigene Gebäude stehen auf einem weissen Ring, eigene Panzer haben einen weissen Rand, wie die Zeichen in der flachen Karte. Die Stufe steht als Zahl über dem Gebäude.

## Grösse
- Gebäude: 40 + 5·Zoom Pixel breit, mindestens 72, höchstens 210 (`modelSize`), also weit grösser als ihr Feld, wenn man weiter draussen ist (wie die Zeichen). Aber nie mehr als das 2,8-fache des kleinsten erlaubten Abstands zweier Gebäude (`R.structDist`), damit Nachbarn sich nicht ganz verdecken. Grosse Städte brauchen bis 40 % mehr Platz.
- Panzer: 8 + 1,15·Zoom Pixel lang, 16 bis 42 (`tankLen`). Schiffe: Kriegsschiff 32 bis 96, Handelsschiff 24 bis 72, Boot 18 bis 46. Zugwagen 14 bis 42.
- Bäume und Gipfel: weiter draussen steht ein Baum für einen Hain und ein Gipfel für eine Kette, und sie werden grösser. Es wird nur eine Stelle pro Rasterfeld angeschaut, so dass auf dem Bildschirm nie mehr als etwa 4000 Stellen geprüft werden.

## Antippen
Ein Modell steht über und neben seinem Feld. Ein Tipp oder Klick auf das Modell eines eigenen Gebäudes öffnet darum seine Ausbaukarte, auch wenn darunter fremdes Land liegt (`view.structHit`, die Kästen der gezeichneten Modelle, das vorderste gewinnt). Gilt nur in der Nahansicht; in der flachen Karte bleibt alles wie vorher.

## Relief
Einmal pro Karte aus den Höhen berechnet (Erde: das Höhenbild in halber Auflösung; sonst die Durchquerungskosten, zweimal geglättet), Sonne aus Nordwesten: die Nordwestseite eines Bergs hell, die Südostseite im Schatten. Liegt als eigenes Bild über der Karte, weich gestreckt. Nah heran wird es schwächer (ab Zoom 6 bis auf 45 % bei 18), damit ein Berghang nicht als Fleck über jedem Feld liegt.

## Handy
Damit weniger Karte verdeckt ist: Das Tempo unter der Rangliste ohne Balken, die Meldungen kleiner und höchstens die zwei neuesten, von den Angriffen auf dich nur der grösste (dazu «+N weitere Angriffe»). Nach dem Start steht das eigene Land etwas über der Mitte, weil unten die Bedienung liegt.

## Panzer
- Ein Zug (bis 9 Panzer, `PLATOON`) steht für eine Gruppe von Zellen: nah eine Zelle (16 × 16 Felder), weiter draussen 2 × 2, 4 × 4 oder 8 × 8 Zellen, so dass eine Gruppe immer etwa 110 Pixel breit ist (`GROUP_PX`) und sich nichts drängt.
- Ein Panzer steht für eine feste Truppenmenge: so viel, dass eine Gruppe des mittleren Reichs der Welt (Nationen und Menschen, Truppen daheim und im Angriff) etwa drei Panzer zeigt. Die Menge wird höchstens alle 6 s neu bestimmt und nur in Stufen (Faktor 1,5), damit nichts flackert. So sieht man auch, wer stärker steht als man selbst. Höchstens 200 Panzer auf dem Bildschirm (`TANK_CAP`), sonst werden alle gleichmässig weniger.
- Züge stehen in Reihen zu drei hinter dem vordersten Panzer. An der Front steht der Zug etwas hinter der Grenze und schaut zum Nachbarn; im Hinterland parkt er in der Mitte der Zelle, nach aussen gerichtet.
- **Eigene Truppen** stehen so, wie das Netz sie verteilt (`c.u / post.H`). Dicht bedeutet mehr Panzer. Reserven rollen sichtbar dorthin, wo sie gebraucht werden: Die Panzer fahren zu ihrem neuen Platz, statt zu springen.
- **Die anderen** zeigen nur, was ihre Truppenzahl verrät: gleichmässig über ihr Land. Ihr Netz bleibt geheim (Leitsatz «Wissen ist eine Ressource»).
- **Bots** haben keine Armee, nur einzelne Wachen an der Grenze, und die nur an deiner Grenze oder ganz nah (ab 10).
- Wer an einer Front steht, zeigt dort mindestens einen Panzer. Unter 7 Pixel pro Feld (`Z_PARK`) nur, was dich betrifft: deine Züge an Fronten und wer an deiner Grenze steht, dazu alle Angriffe. Die geparkten Panzer im Hinterland und die Armeen der übrigen Welt erst näher. So bleibt es übersichtlich.
- Kein Panzer parkt auf einem Gebäudemodell oder direkt daneben.

## Wachstumstempo
Unter der Rangliste steht, wie viel Land man in der letzten Minute gewonnen hat (in Prozent des ganzen Landes pro Minute), und darunter der Schnellste der anderen, beide mit einem Balken. Wächst man selbst am schnellsten, steht dort grün «Du wächst am schnellsten». Ein Schnappschuss pro Sekunde, die letzte Minute wird behalten (`tempo` in `src/07_ui.js`). Das Ziel: spüren, ob man vorne liegt oder hinterherrennt.

## Grundsätze
- Nur Darstellung. Kein `Math.random`, kein Schreiben in den Spielstand; was zufällig aussieht, kommt aus einem Hash fester Zahlen, Bewegung aus der Uhr des Bildes. `node test/nah.js` prüft, dass 60 gezeichnete Bilder am Spielstand nichts ändern.
- Nur was man wissen darf: versteckte Gebäude (`hiddenFrom`) bleiben versteckt, das Netz der anderen bleibt geheim.
- Projektion: Ein Punkt in der Höhe h wird um 0,3·h nach rechts und h nach oben gezeichnet. Man schaut von Südwesten, sieht Dach, Süd- und Westseite; Licht von Nordwesten, kurze Schatten nach Südosten.
- Tempo: Bäume, Felsen, Gipfel und Panzer (48 Richtungen) sind kleine, einmal gezeichnete Bilder; Städte werden als Bild gespeichert, solange sie nicht wachsen. Panzerplätze werden 2,5-mal pro Sekunde neu bestimmt, die Pflanzen nur, wenn sich die Ansicht weiter verschiebt. Gemessen in Headless-Chrome: 60 Bilder pro Sekunde (Median) bei Zoom 3 bis 16, auf Pangäa und der Erde, Desktop und Handy.

## Tests und Bilder
`node test/nah.js`: aus bei Zoom 1,6, an bei 5,6 (Zoom nach dem Start), Panzer und Front, Modell steht über seinem Feld und ein Tipp darauf öffnet die Ausbaukarte, Spielstand unverändert, Atombombe hinterlässt Wolke, Krater und Trümmer, Bau-Vorschau als Modell, Taste J und Menü, Tempo unter der Rangliste, Zeit für ein Bild auf der Erde. Bilder: `build/nah_front.png`, `nah_city.png`, `nah_bombe.png`, `nah_off.png`, `nah_erde.png`.

## Offen
- Satellitenstrahl, Abschüsse in der Luft und Granaten sind die bisherigen Effekte.
