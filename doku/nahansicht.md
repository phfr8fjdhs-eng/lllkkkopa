# 3D-Nahansicht (19.11.2026)
Zoomt man nah heran (ab 7 Pixel pro Feld, `G.Z3D`), steht die Welt in 3D da. Es ist nur ein Bild: Keine Regel ändert sich, die Simulation wird nicht angefasst, Tippen und Klicken treffen dieselben Felder wie vorher. Code: `src/06b_close.js`, eingehängt in `View.draw` und `View.flush` (`src/06_view.js`). Ein- und ausschalten: Taste `J` oder das Menü («3D-Nahansicht beim Hineinzoomen»), gespeichert in `cfg.nah`.

## Was man sieht
| Im Spiel | In der Nahansicht |
| --- | --- |
| Stadt, Stufe 1 und 2 | Dorf mit Häusern, Dächer in der Farbe des Besitzers |
| Stadt ab Stufe 3 | Häuserblöcke mit Strassen und Stockwerken, wird mit jeder Stufe dichter, höher und breiter (logarithmisch) |
| Stadt ab Stufe 20 / 50 | Glasturm mit Aufsatz / dazu ein Mast mit Blinklicht |
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
| Gelände | Wald (auf der Erde aus der Bodenbedeckung, je nach Klima Laub- oder Nadelbäume), Bäume im Flachland, Felsen im Hügelland, Gipfel mit Schnee im Gebirge; nie auf Gebäuden, Schienen oder verstrahltem Land |

Eigene Gebäude stehen auf einem weissen Ring, eigene Panzer haben einen weissen Rand, wie die Zeichen in der flachen Karte. Die Stufe steht als Zahl über dem Gebäude.

## Panzer
- Ein Panzer steht für eine feste Truppenmenge `U`: so viel, dass eine Zelle (16 × 16 Felder) des mittleren Reichs der Welt (Nationen und Menschen, Truppen daheim und im Angriff) etwa drei Panzer zeigt. `U` wird höchstens alle 6 s neu bestimmt und nur in Stufen (Faktor 1,5), damit nichts flackert. So sieht man auch, wer stärker steht als man selbst.
- Pro Zelle und Besitzer ein Zug: in Reihen zu drei hinter dem vordersten Panzer, höchstens 9 (`PLATOON`), höchstens 180 auf dem Bildschirm (`TANK_CAP`), sonst werden alle gleichmässig weniger. An der Front steht der Zug etwas hinter der Grenze und schaut zum Nachbarn; im Hinterland parkt er in der Mitte der Zelle, nach aussen gerichtet.
- **Eigene Truppen** stehen so, wie das Netz sie verteilt (`c.u / post.H`). Dicht bedeutet mehr Panzer. Reserven rollen sichtbar dorthin, wo sie gebraucht werden: Die Panzer fahren zu ihrem neuen Platz, statt zu springen.
- **Die anderen** zeigen nur, was ihre Truppenzahl verrät: gleichmässig über ihr Land. Ihr Netz bleibt geheim (Leitsatz «Wissen ist eine Ressource»).
- **Bots** haben keine Armee, nur einzelne Wachen an der Grenze.
- Wer an einer Front steht, zeigt dort mindestens einen Panzer. Von weiter weg (unter 11 Pixel pro Feld, `Z_PARK`) nur die Züge an den Fronten, damit das Auge sie findet; die geparkten im Hinterland erst näher.
- Kein Panzer parkt auf oder direkt neben einem Gebäude.

## Wachstumstempo
Unter der Rangliste steht, wie viel Land man in der letzten Minute gewonnen hat (in Prozent des ganzen Landes pro Minute), und darunter der Schnellste der anderen, beide mit einem Balken. Wächst man selbst am schnellsten, steht dort grün «Du wächst am schnellsten». Ein Schnappschuss pro Sekunde, die letzte Minute wird behalten (`tempo` in `src/07_ui.js`). Das Ziel: spüren, ob man vorne liegt oder hinterherrennt.

## Grundsätze
- Nur Darstellung. Kein `Math.random`, kein Schreiben in den Spielstand; was zufällig aussieht, kommt aus einem Hash fester Zahlen, Bewegung aus der Uhr des Bildes. `node test/nah.js` prüft, dass 60 gezeichnete Bilder am Spielstand nichts ändern.
- Nur was man wissen darf: versteckte Gebäude (`hiddenFrom`) bleiben versteckt, das Netz der anderen bleibt geheim.
- Projektion: Ein Punkt in der Höhe h wird um 0,3·h nach rechts und h nach oben gezeichnet. Man schaut von Südwesten, sieht Dach, Süd- und Westseite; Licht von Nordwesten, kurze Schatten nach Südosten.
- Tempo: Bäume, Felsen und Gipfel sind kleine, einmal gezeichnete Bilder. Panzerplätze werden 2,5-mal pro Sekunde neu bestimmt, die Pflanzen nur, wenn sich die Ansicht um mehr als 8 Felder verschiebt. Ein Bild auf der Erde: etwa 10 ms in Headless-Chrome.

## Tests und Bilder
`node test/nah.js`: an und aus beim Zoomen, Panzer und Front, Spielstand unverändert, Taste J und Menü, Tempo unter der Rangliste, Zeit für ein Bild auf der Erde. Bilder: `build/nah_front.png`, `nah_city.png`, `nah_off.png`, `nah_erde.png`.

## Offen
- Schiffe, Züge und Raketen sind noch die flachen Zeichen.
- Die Bau-Vorschau am Mauszeiger ist noch das flache Zeichen.
