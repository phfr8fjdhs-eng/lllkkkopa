# Forschung mit Punkten: Entwurf (28.11.2026, noch nicht gebaut)
Für den Modus «Langes Spiel». Ersetzt später die Unis als Quelle der Forschung (`G.TECH`, `research`, `langResearch` in `src/04c_lang.js`). Alle Zahlen sind Startwerte und werden nach ein paar Runden abgestimmt. Heute (Stand Branch `claude/langes-spiel-feedback-us7ay0`) forschen Unis mit Punkten pro Sekunde an je einer Sache.

## Ziel
- Wie in Plague Inc: Man bekommt **Forschungspunkte** und kauft damit Kästchen im Baum, sofort, ohne Wartezeit.
- Die Punkte **kommen von selbst**. Man sammelt nichts ein und klickt nichts an.
- **Eine Punktezahl für alles.** Jeder Punkt geht in jeden Zweig, die Richtung zu wechseln kostet nichts extra. (Verworfen: Erfahrung je Bereich. Sie belohnt doppelt, was man schon tut, und macht den Wechsel doppelt schwer.)
- **Kein Schneeball:** Ein grosses Reich bekommt mehr, aber nicht viel mehr. Gold ist keine Quelle, sonst wird der Reiche nur reicher.
- Jeder wählt seinen Weg nach seiner Lage (Insel: Marine; Binnenland: Heer; später Rohstoffe). Der Baum wird so gross, dass niemand alles hat.

## Woher die Punkte kommen
### 1. Grundstrom (der grösste Teil)
Pro Minute, gerechnet alle 5 s (`(T + id) % 50` wie die anderen Langes-Spiel-Rechnungen):

  Punkte pro Minute = 2 + √(Summe der Stufen aller eigenen Städte)

- Die **Wurzel** sorgt dafür, dass mehr Städte helfen, aber immer weniger: 0 Stadtstufen 2 pro Minute, 4 → 4, 16 → 6, 36 → 8, 100 → 12.
- **Bevölkerung:** Eine evakuierte oder getroffene Stadt zählt mit ihrem Anteil an Bevölkerung (wie beim Wachstum, `p.evacW`). Wer bombardiert wird, forscht langsamer, aber nie unter 2 pro Minute.
- Optional später: Die Uni bleibt als Ausbau der Stadt und zählt deren Stufen doppelt. Das macht sie zu einer Wahl (Gold gegen etwas schnellere Forschung) statt zur einzigen Quelle.

### 2. Meilensteine (von selbst, je einmal)
Sie kommen automatisch mit einer Meldung («+10 Forschung: erster Hafen»). Aus allen Bereichen, jeder gleich viel wert, damit jede Lage etwa gleich viel holt:

| Bereich | Meilenstein | Punkte |
| --- | --- | --- |
| Land | 5 %, 10 %, 20 % der Welt | je 10 |
| Land | erster neuer Kontinent oder Insel betreten | 10 |
| Meer | erster Hafen, erste Handelsfahrt, erstes Kriegsschiff | je 5 |
| Industrie | erste Fabrik mit Schiene, erste Stadt auf Stufe 5 | je 5 |
| Kampf | erstes Schiff versenkt, erstes Flugzeug abgeschossen, erste Rakete abgefangen | je 5 |
| Diplomatie | erstes Bündnis, erster Stützpunkt, erster Spion | je 5 |

Zusammen höchstens etwa 100 Punkte; ein normales Spiel holt 50 bis 70.

### 3. Aufholen
- Wer in 5 Minuten mehr als 10 % seines Landes verliert, bekommt einmal 10 Punkte (höchstens alle 10 Minuten).
- Wer von einer Atomwaffe getroffen wird, bekommt 10 Punkte.
So bleibt der Schwächere im Spiel, statt dass der Starke davonzieht.

### Nicht
- Keine Punkte pro erobertem Feld, pro Gold oder pro Sieg (Schneeball).
- Keine Punkte, die an einen Zweig gebunden sind.

## Was es kostet
- **Grundpreis nach Stufe:** 5, 9, 15, 22, 32 Punkte (Stufe 1 bis 5).
- **Aufschlag:** Jedes gekaufte Kästchen macht alle weiteren 2 % teurer (auf den Grundpreis, gerundet).
- **Zeit bleibt der Takt:** Stufe 1 und 2 ab dem Start, 3 ab Minute 15, 4 ab 30, 5 ab 45 (`G.LANG.tierFrom`, wie heute). Atomwaffen behalten ihre eigenen Zeiten (Atombombe 30, Wasserstoffbombe 45, MIRV 60).
- «oder» und «braucht zuerst» bleiben wie heute.
- Kein Zurückgeben.

## Was man damit bekommt (gerechnet für 70 Minuten, heutiger Baum mit 65 Kästchen)
Annahme: Die Stadtstufen wachsen in 40 Minuten auf ihren Endwert, dazu 60 Punkte aus Meilensteinen, gekauft quer über die Stufen.

| Reich | Stadtstufen am Ende | Punkte | Kästchen |
| --- | --- | --- | --- |
| klein | 10 | etwa 380 | etwa 19 (30 %) |
| mittel | 30 | etwa 510 | etwa 24 (37 %) |
| gross | 60 | etwa 640 | etwa 29 (45 %) |

- Das grosse Reich hat am Ende etwa die Hälfte mehr als das kleine, nicht das Vielfache. Keiner kommt durch den ganzen Baum; mit einem grösseren Baum sinkt der Anteil weiter, die Preise bleiben.
- Zum Vergleich heute: 3 Unis auf Stufe-5-Städten bringen in 70 Minuten etwa die Hälfte des Baums.

## Nationen
- Dieselben Regeln, dieselben Punkte.
- Sie kaufen der Reihe nach nach einer festen Liste pro Nation (ein «Charakter»: zum Beispiel Seemacht, Landmacht, Raketen), damit sie nicht alle gleich sind. Eine kluge Wahl treffen sie nicht.

## Anzeige
- Oben im Forschungsfenster: Punkte jetzt, «+X pro Minute», nächster Meilenstein nicht (die kommen überraschend).
- Ein Kästchen, das man sich leisten kann, ist gelb; antippen erklärt, ein zweites Antippen («Kaufen, N Punkte») kauft.

## Später: Rohstoffe
- Ein Vorkommen im eigenen Land ist ein Meilenstein («erstes Öl»).
- Es senkt den Preis passender Kästchen um ein Viertel (Stahl: Panzerung, Öl: Luftwaffe, Häfen an tiefem Wasser: Marine). Das hilft der eigenen Lage, ohne einen Zweig doppelt zu belohnen.

## Offene Fragen
- Uni ganz weg oder als Ausbau, der die Stufen der Stadt doppelt zählt?
- Stimmen 2 + √(Stadtstufen) und die Preise? Nach den ersten Runden messen: Wie viele Kästchen hat man in Minute 15, 30, 45?
- Welche neuen Zweige (Industrie, Wirtschaft) kommen dazu, wenn der Baum grösser wird?
