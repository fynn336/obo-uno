# OBO Lounge

Spieleabend mit Freunden im Browser, für 2–8 Spieler. Man trifft sich in der Lounge, der Host wählt ein Spiel, und
nach jeder Partie geht es zurück in die Lounge. Es gibt keinen eigenen Server, die Spieler verbinden sich direkt
per WebRTC ([PeerJS](https://peerjs.com/)). Alles läuft als statische Seite, z. B. kostenlos auf GitHub Pages.

**Spiele:** Farbenchaos (Uno-Regeln). Weitere folgen.

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

> **Wichtig:** Den **Host-Tab nicht schließen oder neu laden.** Der Host hält den einzigen Spielstand. Verlässt er
> die Lounge, endet sie für alle („Der Host hat die Lounge verlassen“). Der Browser fragt deshalb vor dem
> Schließen nach.

> **Hinweis zu Netzwerken:** Es wird kein TURN-Server verwendet. In manchen Netzwerken (z. B. Mobilfunk,
> Firmen-WLAN, Hotspots oder streng gefilterte Uni-Netze) kann deshalb keine direkte Verbindung aufgebaut werden.
> Im selben WLAN oder im Heimnetz klappt es in der Regel.

Rechts unten schaltet 🎵 die Musik und 🔊 die Soundeffekte, der Regler stellt die Lautstärke. Ein Klick auf die
Versionsnummer zeigt, was neu ist. Nach einem Update reicht normales Neuladen.

## Farbenchaos (Uno-Regeln)

Eine Partie besteht aus mehreren Runden. Wer in einer Runde zuerst keine Karten mehr hat, gewinnt die Runde.

### Steuerung

| Taste         | Aktion                                         |
| ------------- | ---------------------------------------------- |
| ← / →         | Karte auswählen                                |
| Enter         | ausgewählte Karte legen                        |
| Leertaste     | Karte ziehen bzw. offene Strafkarten ziehen    |
| U             | „UNO!“ rufen                                   |
| R / G / B / Y | Farbe wählen (Rot, Grün, Blau, Gelb)           |

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
assets/                    Hintergrund, Musik und Kartensound
src/main.js                Ablauf: Start → Lounge → Spiel, Fehlermeldungen
src/changelog.js           Versionsnummer und Changelog (eine Quelle für beides)
src/update.js              holt nach einem Update automatisch die neue Version
src/lounge/                Raum: Spieler, Avatare, Bots, Spielauswahl, Abendwertung (reiner Reducer)
src/games/                 Spiele; jedes beschreibt Name, Spielerzahl, Einstellungen, Züge, Ergebnis, Bot
  index.js, ui.js          Liste aller Spiele und ihrer Oberflächen
  uno/                     Farbenchaos: Regeln (game.js), Sicht, Bot, Auszeichnungen, Oberfläche (ui/)
src/shared/                Zufall per Seed (mulberry32), Prüfung von Aktionsfeldern
src/net/                   Netzwerk
  protocol.js              alle Nachrichtentypen und die Prüfung jeder Client-Nachricht
  host.js                  hält den Spielstand, prüft Aktionen, Reconnect, Rauswurf, Timer und Bots
  client.js                Beitritt, Token, automatischer Reconnect
src/ui/                    Start, Lounge, Avatare, Musik, Ecke unten rechts, Konfetti
```

**Host-autoritativ:** Nur der Host führt die Reducer aus. Clients schicken ausschließlich Aktionen. Der Host
setzt den Absender selbst, prüft alles und schickt jedem Spieler nur seine eigene Sicht.

**Neues Spiel hinzufügen:** Ein Ordner unter `src/games/` mit Regeln als Reducer und einer Beschreibung wie in
`src/games/uno/index.js`, dazu die Oberfläche. Anschließend in `src/games/index.js` und `src/games/ui.js`
eintragen.
