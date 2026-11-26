# Vision (15.11.2026)
Ein Eroberungsspiel wie OpenFront, mit einfacher, klarer Grafik, aber mit Tiefe im späten Spiel. Früh schnell, spät wie im Kalten Krieg: dichte Fronten, Bündnisse, Abschreckung und Warten auf den richtigen Moment. Eine Runde dauert höchstens etwa 40 Minuten. Der Spielmodus «Langes Spiel» ist bewusst länger (etwa 70 Minuten) und baut die Teile unten unter «Später» Paket für Paket: `doku/langes-spiel.md`.

## Leitsätze
Jede neue Funktion muss mindestens einen davon erfüllen.
1. **Wo zählt.** Ort des Angriffs, Standort von Silo und Kaserne, Stützpunkte wie Hawaii. Der Schlüssel ist Reichweite und Versorgung.
2. **Entscheiden statt stapeln.** Unterhaltskosten, Magazine und Nachladen, Wahl des Silos, statt 40 Flugabwehren übereinander.
3. **Wissen ist eine Ressource.** Radar, Frühwarnung, Spione: Man sieht nicht alles.

Gegenregel: wenige Gesten. Tiefe kommt aus den Regeln, nicht aus Menüs. Keine einzelnen Einheiten, die man von Hand schiebt.

## Früh schnell, spät taktisch, mit denselben Regeln
Vorbereitung ist ein Bonus, nie eine Pflicht. Ein Stoss geht immer sofort mit dem los, was in der Nähe steht. Am Anfang ist das Land klein, also ist alles in der Nähe, und Bots und freies Land stehen dünn. Später gegen gute Gegner mit dichter Front lohnen sich Sammeln, Schienen und die richtige Stelle. Eine grosse Offensive braucht dann Vorbereitungszeit, und genau daraus entstehen Taktik und Frühwarnung.

## Bodenkampf
- **Kampf am Ort** (gebaut 15.11.2026): Ein Angriff kämpft gegen die Verteidiger an seiner Front, nicht gegen die ganze Armee.
- **Gezielter Stoss** (gebaut 15.11.2026, ohne Antippen der Pfeile): Tippen ins Feindesland, der Angriff stösst als Keil von der nächsten Grenzstelle dorthin vor. «Ganze Front» bleibt als Wahl. Mehrere Stösse gleichzeitig, jeder als Pfeil mit Truppenzahl; antippen verstärkt oder zieht zurück. Urteil am Pfeil: überlegen, ausgeglichen, zu schwach.
- **Bereitschaft:** Truppen, die eine Weile an einem Abschnitt stehen, kämpfen dort besser.
- **Aufstellung:** Das Netz bleibt in der Hand des Menschen (Verbündete können in den Rücken fallen, darum keine Automatik). Nationen setzen ihr Netz selbst. Passiv verteidigt das Netz (Dichte, Eingraben), aktiv der Gegenangriff mit einem Stoss.
- **Durchbruch und Reserven:** Fällt ein dichter Abschnitt, geht es dahinter schnell, bis Reserven ankommen. Verteidigung heisst Tiefe, Posten, Schienen.
- **Versorgung:** Abgeschnittene Truppen werden schwächer, Kessel fallen.

## Später
- **Unterhalt:** Stehendes Heer, volle Silos und Flugabwehren kosten laufend Gold. Aufrüsten wird teuer und sichtbar.
- **Silos:** Wahl, welches Silo schiesst. Abwehr oder Abschuss; wer feuert, verrät seinen Standort.
- **Kaserne:** Neue Truppen entstehen an Städten und Kasernen und marschieren an die Front, auf Schienen schnell.
- **Aufklärung:** Radar, Frühwarnung, Spione; Nebel über dem, was man nicht sieht.
- **Schiffe und Stützpunkte:** Aufträge statt Hinschicken (Patrouille, Blockade, Geleit), Reichweite, Tanken an Stützpunkten.
- **Luftwaffe und Flugzeugträger.**
- **Blöcke:** Bündnisse mit gemeinsamer Frühwarnung, Durchmarsch, Stützpunkten beim Partner.
- **Skill-Tree:** Verbesserungen als Faktoren auf Stoss, Marsch, Verteidigung (zum Beispiel Helikopter an der Front). Idee des Besitzers (23.11.2026): Der Dichte-Puffer ist am Anfang mild und lässt sich später im Spiel über den Skill-Tree verstärken.
- **Karte:** mehr Details, tiefer zoomen. Kann jederzeit nebenher laufen.

## Reihenfolge
1. Messbank für den Kampf (`test/kampf.js`) – erledigt
2. Kampf am Ort für alle – erledigt
3. Gezielter Stoss mit Pfeilen – gebaut 15./16.11.2026 (rechts ziehen, Abschnitt, Keil, Vorschau, Flanken, Pfeil anklicken)
4. Verteidigung: Netz für Nationen, Eingraben, Reserven, Kessel – gebaut 16.11.2026 (das Netz des Menschen bleibt von Hand)
5. Unterhalt und Silo-Wahl
6. Kaserne
7. Aufklärung
8. Blöcke

Nach jedem Schritt ein paar Runden spielen, dann korrigieren.

## Stand 22.11.2026: als Testschalter gebaut
Kessel, Schwung (Angriffe verlieren mit der Tiefe Schwung, Vorbereitung gibt mehr), Bahn mit Lieferungen (grössere Städte bringen mehr), Häfen nach Stufe (Grossfrachter, Containerschiffe, Reichweite), Gebäude sehen nach Stufe anders aus. Siehe `doku/testschalter.md`.

## Als Nächstes geplant (besprochen 22.11.2026, noch nicht gebaut)
- Versorgung: Städte, Häfen und Schienen als Quellen, immer als Vorteil, nie als Sperre; Inseln mit Hafen als Stützpunkt.
- Nationen schneiden Keile ab und bereiten Angriffe vor.
- Kriegsschiffe: Zerstörer, Schlachtschiff, Flugabwehrschiff, Flugzeugträger (sehr spät, nur im Verband); Geleitschutz mit echten Zerstörern; steigende Preise und Unterhalt.
- Flugabwehr in zwei Arten: Kurzstrecke (Marschflugkörper, Flugzeuge, Sprengköpfe) und Raketenabwehr (Atom- und Wasserstoffbombe); abnehmender Schutz beim Stapeln.
- ~~Simulation in einen Worker~~ (gebaut 24.11.2026, mit der Karte auf der Grafikkarte, siehe `leistung.md`), danach eine grössere Erde.

## Was wir weglassen
- Einzeleinheiten, die man von Hand über die Karte schiebt.
- Runden über etwa 45 Minuten (im klassischen Spiel; «Langes Spiel» ist die Ausnahme).
- Die Version «Rohstoffe» bleibt eingefroren, bis der Kampf steht.
