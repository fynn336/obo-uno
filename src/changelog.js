// Neueste Version zuerst. Die aktuelle Versionsnummer ist immer der oberste Eintrag.
export const CHANGELOG = [
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
