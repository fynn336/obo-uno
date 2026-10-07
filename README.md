# OBO Lounge

Spieleabend mit Freunden im Browser, für 2–8 Spieler. Man trifft sich in der Lounge, der Host wählt ein Spiel, und
nach jeder Partie geht es zurück in die Lounge. Es gibt keinen eigenen Server, die Spieler verbinden sich direkt
per WebRTC ([PeerJS](https://peerjs.com/)). Alles läuft als statische Seite, z. B. kostenlos auf GitHub Pages.

**Spiele:** Farbenchaos (Uno-Regeln), Würfelglück (Kniffel-Regeln) und Ludo (Mensch-ärgere-dich-nicht-Regeln).

## Spielen

1. **Lounge eröffnen:** Namen eingeben, auf „Lounge eröffnen“ klicken. Du bist jetzt der Host und bekommst einen
   4-stelligen Code.
2. **Freunde einladen:** In der Lounge auf „Einladungslink kopieren“ klicken und den Link verschicken. Wer ihn
   öffnet, gibt nur noch seinen Namen ein. Alternativ: dieselbe Seite öffnen, Code und Namen eingeben, „Beitreten“.
3. **Avatar wählen:** Jeder sucht sich in der Lounge ein Emoji und eine Farbe aus.
4. **Spiel wählen und starten** (nur der Host): Spiel antippen, Einstellungen wählen, starten. Zu wenige Leute?
   Mit „Computer-Gegner hinzufügen“ setzt der Host Bots an den Tisch.
5. **Nach der Partie** landen alle wieder in der Lounge, mit Ergebnis und Auszeichnungen. Wer während einer Partie
   kommt, wartet in der Lounge und spielt ab der nächsten mit. Der Host kann eine Partie jederzeit beenden.

**Abendwertung:** Für jede Partie gibt es Sterne: Platz 1 = 3 ⭐, Platz 2 = 2 ⭐, Platz 3 = 1 ⭐. Wer vorne liegt, ist
Spieler des Abends 🏆. Mit „Neuer Abend“ setzt der Host die Sterne zurück.

**Zeit pro Zug:** In jedem Spiel kann der Host 30 oder 60 Sekunden einstellen. Läuft die Zeit ab, spielt in
Würfelglück und Ludo der Computer den Zug zu Ende; was in Farbenchaos passiert, steht unten.

> **Wichtig:** Den **Host-Tab nicht schließen.** Der Host hält den einzigen Spielstand. Neu laden ist kein
> Problem: Der Stand liegt im Tab (`sessionStorage`), die Lounge öffnet sich unter demselben Code wieder und alle
> verbinden sich automatisch neu. Schließt der Host den Tab, warten die anderen 30 Sekunden auf ihn, danach endet
> die Lounge für alle („Der Host hat die Lounge verlassen“). Der Browser fragt vor dem Schließen nach.

> **Hinweis zu Netzwerken:** Es wird kein TURN-Server verwendet. In manchen Netzwerken (z. B. Mobilfunk,
> Firmen-WLAN, Hotspots oder streng gefilterte Uni-Netze) kann deshalb keine direkte Verbindung aufgebaut werden.
> Im selben WLAN oder im Heimnetz klappt es in der Regel.

Rechts unten schaltet 🎵 die Musik und 🔊 die Soundeffekte. ⚙️ öffnet die Einstellungen mit Musikstil
(ruhiger Jazz, Funky Jazz oder gemischt), Lautstärke und der Wahl des Raums (Kaminzimmer, Wohnzimmer, Kneipe, Partykeller, Wintergarten); jeder wählt seinen Raum für sich.
Ein Klick auf die Versionsnummer zeigt, was neu ist. Nach einem Update reicht normales Neuladen.

## Farbenchaos (Uno-Regeln)

Eine Partie besteht aus mehreren Runden. Wer in einer Runde zuerst keine Karten mehr hat, gewinnt die Runde.

### Steuerung

| Taste         | Aktion                                         |
| ------------- | ---------------------------------------------- |
| ← / →         | Karte auswählen                                |
| Enter         | ausgewählte Karte legen                        |
| Leertaste     | Karte ziehen bzw. offene Strafkarten ziehen    |
| U             | „UNO!“ rufen                                   |
| R / G / B / Y | Farbe wählen (Rot, Grün, Blau, Gelb); im Blütenzauber-Deck L / O / G / T |

Mit der Maus geht alles ebenso: Karte anklicken legt sie, ein Klick auf den Ziehstapel zieht, die Farbe wählt man
im Farbrad auf dem Ablagestapel. „Weitergeben“, „Anfechten“ und „Erwischt!“ sind Buttons. Links unten zeigt der
Verlauf die letzten Züge, wichtige Momente wie UNO, +4 oder Aussetzen werden groß eingeblendet.

### Regeln

Offizielle Regeln mit 108 Karten und 7 Startkarten.

**Punkte:** Der Rundensieger bekommt die Punkte aller Karten, die die anderen noch auf der Hand haben.
Zahlkarten zählen ihren Wert, Aktionskarten 20, Wild-Karten 50. Wer das Punkteziel erreicht (200, 300 oder 500),
gewinnt die Partie. Bei Punktgleichstand liegt vorne, wer weniger Restpunkte auf der Hand hat. Endet eine Runde,
weil nur noch ein Spieler übrig ist, gibt es keine Punkte. Am Partieende gibt es Auszeichnungen wie „Pechvogel“
oder „UNO-Vergesser“.

**Kartendesign** (vom Host gewählt, gilt für alle): Klassisch oder Blütenzauber. Im Blütenzauber-Deck heißen die
Farben Türkis, Lila, Orange und Grün.

**Zeit pro Zug** (optional, 30 oder 60 Sekunden): Läuft die Zeit ab, zieht der Spieler automatisch eine Karte
bzw. die offene Strafe, eine offene Farbwahl wird zufällig getroffen.

- **Ziehen** ist immer erlaubt. Ist die gezogene Karte spielbar, darf *nur diese* sofort gelegt werden,
  sonst ist der Zug vorbei.
- **Startkarte:** Wild +4 wird zurückgemischt. Bei Wild wählt der Startspieler die Farbe. Aussetzen und +2
  treffen den Startspieler. Bei einem Richtungswechsel beginnt der Spieler vor dem Startspieler gegen den
  Uhrzeigersinn (bei 2 Spielern wirkt die Karte wie Aussetzen).
- **Letzte Karte:** Die Runde endet sofort, eine Aktionskarte wirkt dann nicht mehr.
- **UNO:** Rufen geht nur am eigenen Zug mit genau 2 Karten. Wer mit 1 Karte nicht gerufen hat, kann von
  allen anderen per „Erwischt!“ gemeldet werden, bis der nächste Spieler handelt. Wer erwischt wird, zieht 2.

**Hausregeln** (vom Host in der Lounge einstellbar):

- **Stapeln:** +2 auf +2 und +4 auf +4. Wer nicht stapeln kann oder will, zieht die Summe und setzt aus.
- **Wild-+4-Anfechtung:** Nach einem Wild +4 darf der Nächste anfechten.
  - Hatte der Leger eine Karte der vorherigen Farbe, zieht er 4. Der Anfechter zieht nichts und ist am Zug.
  - Sonst zieht der Anfechter 6 und setzt aus.
  - Zusammen mit Stapeln betrifft die Anfechtung nur das oberste +4:
    - Erfolgreich: Der Leger zieht 4, der Anfechter zieht den Rest des Stapels und setzt aus.
    - Gescheitert: Der Anfechter zieht die Summe + 2.
- **Ziehen bis spielbar:** Man zieht, bis eine spielbare Karte kommt, und darf sie legen. Das gilt nicht für
  Strafkarten.
- **Reinwerfen:** Wer genau die gleiche Karte wie die oberste hat (gleiche Farbe und gleicher Wert), darf sie
  jederzeit legen, auch wenn er nicht dran ist. Danach geht es vom Werfer aus weiter. Nicht während einer offenen
  Strafe oder Farbwahl. Computer-Gegner werfen nicht rein.
- **7-0:** Wer eine 7 legt, tauscht seine Karten mit einem Mitspieler seiner Wahl (zu zweit automatisch). Bei
  einer 0 geben alle ihre Karten an den nächsten Spieler in Spielrichtung weiter. Danach gilt kein UNO-Ruf mehr.

## Würfelglück (Kniffel-Regeln)

Für 1–8 Spieler, auch allein oder gegen Computer-Gegner. Jeder hat pro Zug bis zu drei Würfe mit fünf Würfeln.
Gewürfelt wird mit dem Becher (antippen oder Leertaste). Nach dem ersten Wurf kann man Würfel antippen (oder 1–5
drücken), um sie in die Halteleiste zu legen; alle sehen, was gehalten wird. Danach trägt man im Block in eine
freie Kategorie ein; passt nichts, wird eine Kategorie gestrichen (0 Punkte). Mögliche Punkte stehen direkt im
Block, die beste Kategorie ist mit ★ markiert.

| Kategorie | Punkte |
| --- | --- |
| Einser bis Sechser | Summe dieser Zahl; ab 63 Punkten oben gibt es 35 Bonus |
| Dreierpasch / Viererpasch | Summe aller Würfel, wenn 3 bzw. 4 gleich sind |
| Full House | 25 (drei gleiche und zwei gleiche) |
| Kleine Straße | 30 (vier aufeinanderfolgende) |
| Große Straße | 40 (fünf aufeinanderfolgende) |
| Kniffel | 50 (fünf gleiche) |
| Chance | Summe aller Würfel |

Nach 13 Runden gewinnt, wer die meisten Punkte hat. Sonderregeln für einen zweiten Kniffel gibt es nicht.

## Ludo

Für 2–4 Spieler, zu zweit sitzt man sich gegenüber. Jeder hat vier Figuren im Haus und bringt sie einmal um das
Brett ins eigene Ziel. Das Brett ist für jeden so gedreht, dass die eigene Farbe links unten liegt. Gewürfelt wird
mit dem Würfel in der Brettmitte oder der Leertaste, eine Figur zieht man per Klick oder mit 1–4. Gibt es nur eine
mögliche Figur, zieht auch die Leertaste.

- **Raus nur mit einer 6.** Wer eine 6 würfelt, muss eine Figur herausstellen, solange noch eine im Haus ist und
  das Startfeld frei ist. Nach einer 6 wird noch einmal gewürfelt.
- **Startfeld räumen:** Steht eine eigene Figur auf dem Startfeld und sind noch Figuren im Haus, muss sie zuerst
  weiter.
- **Drei Versuche:** Wer keine Figur auf der Laufbahn hat, darf bis zu dreimal würfeln, um eine 6 zu bekommen.
- **Rauswerfen:** Wer auf einem Feld mit einer fremden Figur landet, schickt sie zurück ins Haus. Eigene Figuren
  blockieren das Feld.
- **Ziel:** Ins Ziel geht es nur mit passender Augenzahl, im Ziel darf man eigene Figuren überspringen.

Der Host wählt, ob die Partie endet, wenn der Erste alle Figuren im Ziel hat, oder erst, wenn alle bis auf einen
fertig sind. Wer nicht fertig ist, wird nach Figuren im Ziel und zurückgelegten Feldern platziert. Auszeichnungen:
Rausschmeißer (die meisten geschlagen) und Pechvogel (am häufigsten rausgeflogen).

## Verbindungsabbrüche

- **Reload eines Spielers:** Wer seinen Tab neu lädt, kommt automatisch auf seinen Platz zurück.
  Das Token liegt im `sessionStorage` des Tabs.
- **In der Lounge:** Wer die Verbindung verliert, verlässt die Lounge sofort und kann einfach neu beitreten.
- **Während einer Partie:** Der Platz bleibt 60 Sekunden reserviert. Ist der Spieler in der Zeit am Zug, wird
  gewartet. Danach fliegt er raus. In Farbenchaos kommen seine Karten unter den Ziehstapel, eine offene Farbwahl
  wird zufällig getroffen, eine offene Strafe verfällt. Bleiben zu wenige Spieler übrig, endet die Partie ohne
  Wertung.
- **Heartbeat:** Host und Spieler pingen sich alle 2 Sekunden an. 8 Sekunden Stille gelten als Abbruch.

## Deployment auf GitHub Pages

1. Auf GitHub ein neues, **öffentliches** Repository anlegen (z. B. `obo-lounge`). Ohne README, das bringt dieses
   Repo mit.
2. Dieses Repo hochladen:

   ```bash
   git remote add origin https://github.com/DEIN-NAME/obo-lounge.git
   git push -u origin main
   ```

3. Im Repository auf **Settings → Pages** gehen. Unter „Build and deployment“ als Source
   **Deploy from a branch** wählen, dann Branch **main** und Ordner **/ (root)**, und speichern.
4. Nach 1–2 Minuten ist die Lounge unter `https://DEIN-NAME.github.io/obo-lounge/` erreichbar.

Es gibt keinen Build-Schritt. Jede gepushte Änderung ist nach kurzer Zeit live.

## Lokal starten und testen

ES-Module laufen nicht über `file://`, deshalb braucht es einen beliebigen statischen Webserver im Projektordner:

```bash
npx serve .
```

Danach `http://localhost:3000/` öffnen. Zum Ausprobieren mehrere Tabs nehmen, ein Tab ist der Host.
Die Tests laufen ohne Framework unter `http://localhost:3000/test.html` und müssen komplett grün sein.

## Aufbau

```
index.html, style.css      Seite und Aussehen (Karten nur per CSS)
test.html, tests/          Tests ohne Framework, mit festen Seeds und Kartenstapeln
assets/                    Räume (Hintergründe), Musik und Kartensound
src/main.js                Ablauf: Start → Lounge → Spiel, Fehlermeldungen
src/changelog.js           Versionsnummer und Changelog (eine Quelle für beides)
src/update.js              holt nach einem Update automatisch die neue Version
src/lounge/                Raum: Spieler, Avatare, Bots, Spielauswahl, Abendwertung (reiner Reducer)
src/games/                 Spiele; jedes beschreibt Name, Spielerzahl, Einstellungen, Züge, Ergebnis, Bot
  index.js, ui.js          Liste aller Spiele und ihrer Oberflächen
  uno/                     Farbenchaos: Regeln (game.js), Sicht, Bot, Auszeichnungen, Oberfläche (ui/)
  kniffel/                 Würfelglück: Wertung (scoring.js), Regeln, Bot, Oberfläche (ui/)
  ludo/                    Ludo: Regeln, Bot, Brett (ui/board.js) und Oberfläche
src/shared/                Zufall per Seed (mulberry32), Prüfung von Aktionsfeldern
src/net/                   Netzwerk
  protocol.js              alle Nachrichtentypen und die Prüfung jeder Client-Nachricht
  host.js                  hält den Spielstand, prüft Aktionen, Reconnect, Rauswurf, Timer und Bots
  client.js                Beitritt, Token, automatischer Reconnect
src/ui/                    Start, Lounge, Avatare, Musik, Räume, Einstellungen, Ecke unten rechts, Konfetti
```

**Host-autoritativ:** Nur der Host führt die Reducer aus. Clients schicken ausschließlich Aktionen. Der Host
setzt den Absender selbst, prüft alles und schickt jedem Spieler nur seine eigene Sicht.

**Neues Spiel hinzufügen:** Ein Ordner unter `src/games/` mit Regeln als Reducer und einer Beschreibung wie in
`src/games/uno/index.js`, dazu die Oberfläche. Anschließend in `src/games/index.js` und `src/games/ui.js`
eintragen.
