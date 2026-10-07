# UNO mit Freunden

Multiplayer-UNO für 2–8 Spieler im Browser. Es gibt keinen eigenen Server, die Spieler verbinden sich direkt
per WebRTC ([PeerJS](https://peerjs.com/)). Das Spiel läuft als statische Seite, z. B. kostenlos auf GitHub Pages.

## Spielen

1. **Lobby erstellen:** Namen eingeben, auf „Lobby erstellen“ klicken. Du bist jetzt der Host und bekommst einen
   4-stelligen Code.
2. **Freunde einladen:** In der Lobby auf „Einladungslink kopieren“ klicken und den Link verschicken. Wer ihn
   öffnet, gibt nur noch seinen Namen ein. Alternativ: dieselbe Seite öffnen, Code und Namen eingeben, „Beitreten“.
3. **Avatar wählen:** Jeder sucht sich in der Lobby ein Emoji und eine Farbe aus.
4. **Hausregeln, Punkteziel und Zeit pro Zug wählen** (nur der Host, alle aus = offizielle Regeln). Zu wenige
   Leute? Mit „Computer-Gegner hinzufügen“ setzt der Host Bots an den Tisch. Dann **Runde starten**
   (ab 2 Spielern).
5. Nach jeder Runde landen alle wieder in der Lobby, mit Ergebnis und Punktestand. Der Host kann Regeln ändern,
   neue Spieler können beitreten.

> **Wichtig:** Den **Host-Tab nicht schließen oder neu laden.** Der Host hält den einzigen Spielstand. Verlässt er
> das Spiel, endet es für alle („Der Host hat das Spiel verlassen“). Der Browser fragt deshalb vor dem Schließen nach.

> **Hinweis zu Netzwerken:** Es wird kein TURN-Server verwendet. In manchen Netzwerken (z. B. Firmen-WLAN,
> Hotspots oder streng gefilterte Uni-Netze) kann deshalb keine direkte Verbindung aufgebaut werden.
> Dann hilft meist ein anderes Netz, etwa das Heimnetz oder ein Handy-Hotspot.

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
Rechts unten schaltet 🎵 die Musik und 🔊 die Soundeffekte; ein Klick auf die Versionsnummer zeigt, was neu ist.

### Regeln

Offizielle Regeln mit 108 Karten und 7 Startkarten. Wer zuerst keine Karten mehr hat, gewinnt die Runde.

**Punkte:** Der Rundensieger bekommt die Punkte aller Karten, die die anderen noch auf der Hand haben.
Zahlkarten zählen ihren Wert, Aktionskarten 20, Wild-Karten 50. Wer das Punkteziel erreicht (200, 300 oder 500,
wählt der Host), gewinnt den Abend. Danach beginnen alle wieder bei 0. Endet eine Runde, weil nur noch ein
Spieler übrig ist, gibt es keine Punkte. Am Ende des Abends gibt es Auszeichnungen wie „Pechvogel“ oder
„UNO-Vergesser“.

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

**Hausregeln** (vom Host in der Lobby einstellbar):

- **Stapeln:** +2 auf +2 und +4 auf +4. Wer nicht stapeln kann oder will, zieht die Summe und setzt aus.
- **Wild-+4-Anfechtung:** Nach einem Wild +4 darf der Nächste anfechten.
  - Hatte der Leger eine Karte der vorherigen Farbe, zieht er 4. Der Anfechter zieht nichts und ist am Zug.
  - Sonst zieht der Anfechter 6 und setzt aus.
  - Zusammen mit Stapeln betrifft die Anfechtung nur das oberste +4:
    - Erfolgreich: Der Leger zieht 4, der Anfechter zieht den Rest des Stapels und setzt aus.
    - Gescheitert: Der Anfechter zieht die Summe + 2.
- **Ziehen bis spielbar:** Man zieht, bis eine spielbare Karte kommt, und darf sie legen. Das gilt nicht für
  Strafkarten.

### Verbindungsabbrüche

- **Reload eines Spielers:** Wer seinen Tab neu lädt, kommt automatisch auf seinen Platz zurück.
  Das Token liegt im `sessionStorage` des Tabs.
- **Verbindungsabbruch:** Der Platz bleibt 60 Sekunden reserviert. Ist der Spieler in der Zeit am Zug, wird
  gewartet.
- **Nach 60 Sekunden** fliegt der Spieler raus und seine Karten kommen unter den Ziehstapel:
  - Eine offene Farbwahl wird zufällig getroffen.
  - Eine offene Strafe verfällt.
  - Bleibt nur ein Spieler übrig, endet die Runde mit diesem als Gewinner.
- **Heartbeat:** Host und Spieler pingen sich alle 2 Sekunden an. 8 Sekunden Stille gelten als Abbruch.

## Deployment auf GitHub Pages

1. Auf GitHub ein neues, **öffentliches** Repository anlegen (z. B. `uno`). Ohne README, das bringt dieses Repo mit.
2. Dieses Repo hochladen:

   ```bash
   git remote add origin https://github.com/DEIN-NAME/uno.git
   git push -u origin main
   ```

3. Im Repository auf **Settings → Pages** gehen. Unter „Build and deployment“ als Source
   **Deploy from a branch** wählen, dann Branch **main** und Ordner **/ (root)**, und speichern.
4. Nach 1–2 Minuten ist das Spiel unter `https://DEIN-NAME.github.io/uno/` erreichbar. Diesen Link mit
   Freunden teilen.

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
index.html, style.css     Seite und Aussehen (Karten nur per CSS)
test.html, tests/         Tests ohne Framework, mit festen Seeds und Kartenstapeln
src/main.js               Ablauf: Start → Lobby → Tisch, Fehlermeldungen
src/game/                 reine Spiellogik, kein DOM, kein Netzwerk
  game.js                 Reducer (state, action) → { state, error }
  deck.js, rng.js         Kartensatz, isPlayable, Punktwerte, Zufall per Seed (mulberry32)
  avatars.js              erlaubte Avatar-Emojis und -Farben
  awards.js, bot.js       Abend-Auszeichnungen, Strategie der Computer-Gegner
src/changelog.js          Versionsnummer und Changelog (eine Quelle für beides)
assets/                   Hintergrundmusik und Kartensound
  view.js                 Sicht pro Spieler: eigene Hand, von anderen nur die Anzahl
src/net/                  Netzwerk
  protocol.js             alle Nachrichtentypen und die Prüfung jeder Client-Nachricht
  host.js                 hält den Spielstand, prüft Aktionen, Reconnect und Rauswurf
  client.js               Beitritt, Token, automatischer Reconnect
src/ui/                   Oberfläche: lobby.js, table.js, cards.js, avatar.js, events.js, audio.js, corner.js, dom.js
```

**Host-autoritativ:** Nur der Host führt den Reducer aus. Clients schicken ausschließlich Aktionen. Der Host
setzt den Absender selbst, prüft alles und schickt jedem Spieler nur seine eigene Sicht.
