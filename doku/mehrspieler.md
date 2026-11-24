# Zusammen spielen
Alle Geräte rechnen dasselbe Spiel aus demselben Startwert. Übertragen werden nur die Befehle der Spieler: der Gastgeber sammelt sie, nummeriert sie in Zügen und schickt sie an alle (`src/08_net.js`). Die Nachrichten laufen über einen öffentlichen MQTT-Vermittler (Liste `G.RELAYS`), weil die Seite keinen eigenen Server hat. Die Simulation rechnet mit `G.M` statt `Math`, damit jedes Gerät auf dieselben Zahlen kommt. Noch nicht geprüft: die echten öffentlichen Vermittler und gemischte Geräte (iPhone mit Android oder Computer).

## Simulation im Worker (24.11.2026)
Jedes Gerät rechnet das Spiel in einem Web Worker (`src/08b_host.js`). Die Züge des Raums gehen als Befehle an den Worker, die Prüfsumme jedes 100. Ticks kommt von dort zurück (`mp.sum`). Ein Gerät mit Worker und eines ohne (`?worker=0`) rechnen dasselbe Spiel, das prüft `test/net.js`.

Gefunden dabei: Die Dichte-Schattierung der Karte rief `postDens` auf. Diese Funktion gleicht ein Reich ohne Einheiten nebenbei aus und verändert damit das Spiel. Das geschah nach der Uhr, also auf jedem Gerät zu einer anderen Zeit, und konnte zwei Geräte auseinanderbringen. Die Anzeige nutzt jetzt `postDensSeen`, das nur liest. Allgemein gilt: Die Anzeige darf das Spiel nie verändern. Im Worker kann sie es auch nicht mehr, sie liest nur den Spiegel.
