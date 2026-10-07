// Neueste Version zuerst. Die aktuelle Versionsnummer ist immer der oberste Eintrag.
export const CHANGELOG = [
  {
    version: '2.1.0',
    date: '2026-10-07',
    changes: [
      'Neues Spiel: Würfelglück (Kniffel-Regeln) für 1–8 Spieler, auch gegen Computer-Gegner',
      'Würfel antippen oder 1–5 drücken zum Halten, Leertaste würfelt; mögliche Punkte stehen direkt im Block',
      'Auszeichnungen: Glückspilz (Kniffel gewürfelt) und Pechvogel (meiste Streichungen)',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-10-07',
    changes: [
      'Die OBO Lounge: erst treffen, dann spielen – der Raum bleibt für den ganzen Abend',
      'Spielauswahl in der Lounge, Uno heißt dort „Farbenchaos“',
      'Abendwertung über alle Partien: Platz 1/2/3 bringt 3/2/1 ⭐, 🏆 für den Spieler des Abends',
      'Wer während einer Partie kommt, wartet in der Lounge und spielt ab der nächsten mit',
      'Host kann eine laufende Partie beenden und zurück in die Lounge',
      'Farbenchaos: Bei Punktgleichstand entscheiden die Restpunkte auf der Hand',
      '„Du bist dran“ im Tab-Titel hört auf zu blinken, sobald man nicht mehr dran ist',
    ],
  },
  {
    version: '1.10.1',
    date: '2026-10-07',
    changes: ['Automatisches Update: Nach einer neuen Version reicht normales Neuladen (F5), kein Strg+F5 mehr nötig'],
  },
  {
    version: '1.10.0',
    date: '2026-10-07',
    changes: ['Lautstärkeregler unten rechts für Musik und Effekte'],
  },
  {
    version: '1.9.0',
    date: '2026-10-07',
    changes: [
      'Gemütliches Wohnzimmer als Hintergrund in Start, Lobby und Spiel',
      'In schmalen Fenstern überdeckt die Hand nicht mehr den Verlauf',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-07',
    changes: [
      'Computer-Gegner: Der Host kann in der Lobby Bots hinzufügen und entfernen',
      'Bots stapeln, sparen Wild-Karten auf und vergessen nie UNO',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-07',
    changes: ['Abend-Auszeichnungen bei der Siegerehrung: Fiesling, Pechvogel, UNO-Vergesser, Adlerauge'],
  },
  {
    version: '1.6.0',
    date: '2026-10-07',
    changes: [
      'Zug-Timer als Einstellung in der Lobby: unbegrenzt, 30 oder 60 Sekunden',
      'Läuft die Zeit ab, wird automatisch gezogen bzw. die offene Strafe genommen',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-07',
    changes: ['Gezogene Karten fliegen sichtbar vom Stapel zum Platz des Mitspielers'],
  },
  {
    version: '1.4.0',
    date: '2026-10-07',
    changes: [
      'Hintergrundmusik (Jazz), an- und ausschaltbar mit 🎵',
      'Kartensound beim Legen und Ziehen, an- und ausschaltbar mit 🔊',
      '„Du bist dran“: kurzer Gong, blinkender Tab-Titel im Hintergrund',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-07',
    changes: [
      'Changelog im Spiel: Klick auf die Versionsnummer unten rechts',
      'Versionsprüfung beim Beitreten: veraltete Browser-Version wird erkannt',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-07',
    changes: [
      'Große Einblendungen für UNO, Erwischt, +2/+4, Aussetzen, Richtungswechsel',
      'Verlauf der letzten Züge',
      'Punkte nach offizieller Wertung, Punkteziel 200/300/500, Abendsieger',
      'Siegerehrung mit Konfetti und Ergebnisliste',
      'Avatar wählen: Emoji und Farbe',
      'Farbrad auf dem Ablagestapel',
      'Einladungslink mit Code',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-07',
    changes: [
      'Neues Design: ovaler Spieltisch mit Holzrand, Mitspieler rundherum',
      'Eigene Hand als Fächer, spielbare Karten heben sich an',
      'Animationen: Karten fliegen auf den Stapel und in die Hand, Austeilen',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-07',
    changes: [
      'Erste spielbare Version online auf GitHub Pages',
      'Hausregeln: Stapeln, Wild-+4-Anfechtung, Ziehen bis spielbar',
      'Reconnect per Reload, 60 Sekunden reservierter Platz',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-07',
    changes: ['Oberfläche: Start, Lobby, Spieltisch, Tastatursteuerung'],
  },
  {
    version: '0.2.0',
    date: '2026-10-07',
    changes: ['Netzwerk: Peer-to-Peer mit PeerJS, Host hält den Spielstand, Heartbeat'],
  },
  {
    version: '0.1.0',
    date: '2026-10-06',
    changes: ['Spiellogik nach offiziellen UNO-Regeln mit Tests'],
  },
];

export const VERSION = CHANGELOG[0].version;
