# Grenzland (OpenFront 2.0)
Eigene Umsetzung eines Echtzeit-Eroberungsspiels. Allein gegen Bots und Nationen oder mit Freunden über einen Einladungslink. Karten aus Natural Earth (Public Domain).

**Spielen:** https://phfr8fjdhs-eng.github.io/lllkkkopa/

## Schnellstart
Bauen: `python3 tools/build.py` -> build/index.html (einzelne Datei, im Browser öffnen). Für GitHub Pages danach nach docs/index.html kopieren.
Karten neu erzeugen: `python3 tools/build_maps.py geo build`.

## Mehr lesen
| Thema | Datei |
| --- | --- |
| Tasten, Bots, Ausbau, Flugabwehr, Schienen | [doku/spielregeln.md](doku/spielregeln.md) |
| Zusammen spielen übers Netz | [doku/mehrspieler.md](doku/mehrspieler.md) |
| Truppen-Netz (Aufstellung) | [doku/aufstellung.md](doku/aufstellung.md) |
| Karte «Die Erde», Daten und Quellen | [doku/erde.md](doku/erde.md) |
| Vergleich mit OpenFront (Zahlen, Abweichungen) | [doku/openfront-abgleich.md](doku/openfront-abgleich.md) |
| Tests | [doku/tests.md](doku/tests.md) |
| Änderungsprotokoll | [doku/aenderungen.md](doku/aenderungen.md) |
| Aufbau des Codes (zum Einarbeiten, auch für Claude) | [CLAUDE.md](CLAUDE.md) |

## Mitmachen
Jede Person arbeitet auf einem eigenen Branch und führt Änderungen per Pull Request nach `main` zurück. Nach Änderungen in `src/` neu bauen und `build/index.html` nach `docs/index.html` kopieren.

## Lizenz und Quellen
Der Code steht unter der MIT-Lizenz (siehe [LICENSE](LICENSE)). Für die Kartendaten gelten eigene Bedingungen: Natural Earth (gemeinfrei) und Global Map (© Geospatial Information Authority of Japan, Chiba University and Collaborating Organizations). Die Quelle muss genannt werden, Einzelheiten stehen in [doku/erde.md](doku/erde.md).
