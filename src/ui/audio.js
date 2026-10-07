const JAZZ = ['assets/music/jazz-1.mp3', 'assets/music/jazz-2.mp3', 'assets/music/jazz-3.mp3'];
const FUNKY = ['assets/music/funky-1.mp3', 'assets/music/funky-2.mp3', 'assets/music/funky-3.mp3'];
export const MUSIC_STYLES = [
  { id: 'mix', name: 'Gemischt', tracks: [...JAZZ, ...FUNKY] },
  { id: 'jazz', name: 'Ruhiger Jazz', tracks: JAZZ },
  { id: 'funky', name: 'Funky Jazz', tracks: FUNKY },
];
const EFFECTS = {
  card: new Audio('assets/sounds/card.mp3'),
  dice: new Audio('assets/sounds/dice.mp3'),
  step: new Audio('assets/sounds/step.mp3'),
};
// Grundlautstärken bei Regler auf 100 %
const MUSIC_VOLUME = 0.4;
const EFFECT_VOLUME = 1;
const GONG_VOLUME = 0.36;
const DEFAULT_SETTINGS = { music: true, effects: true, volume: 0.5, style: 'mix' };
const STORAGE_KEY = 'dfuno-audio';

const settings = loadSettings();
let unlocked = false;
let track = null;
let playlist = [];
let context = null;

// Browser erlauben Ton erst nach der ersten Benutzeraktion.
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  if (settings.music) playNextTrack();
}

export function audioSettings() {
  return { ...settings };
}

export function toggleMusic() {
  settings.music = !settings.music;
  saveSettings();
  if (!settings.music) track?.pause();
  else if (unlocked) resume(track) ?? playNextTrack();
}

export function toggleEffects() {
  settings.effects = !settings.effects;
  saveSettings();
}

export function setVolume(volume) {
  settings.volume = volume;
  saveSettings();
  if (track) track.volume = MUSIC_VOLUME * volume;
}

// Neuer Stil: sofort ein Stück daraus spielen
export function setMusicStyle(style) {
  settings.style = style;
  saveSettings();
  playlist = [];
  track?.pause();
  track = null;
  if (settings.music && unlocked) playNextTrack();
}

export function playEffect(name, rate = 1) {
  if (!unlocked || !settings.effects) return;
  const sound = EFFECTS[name].cloneNode();
  sound.volume = EFFECT_VOLUME * settings.volume;
  sound.preservesPitch = false;
  sound.playbackRate = rate;
  resume(sound);
}

export function playTurnGong() {
  if (!unlocked || !settings.effects || settings.volume === 0) return;
  context ??= new AudioContext();
  const start = context.currentTime;
  [660, 880].forEach((frequency, i) => {
    const at = start + i * 0.13;
    const oscillator = new OscillatorNode(context, { frequency });
    const gain = new GainNode(context, { gain: 0 });
    gain.gain.linearRampToValueAtTime(GONG_VOLUME * settings.volume, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.7);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.75);
  });
}

function playNextTrack() {
  if (playlist.length === 0) {
    const style = MUSIC_STYLES.find((s) => s.id === settings.style) ?? MUSIC_STYLES[0];
    playlist = [...style.tracks].sort(() => Math.random() - 0.5);
  }
  const next = new Audio(playlist.pop());
  track = next;
  next.volume = MUSIC_VOLUME * settings.volume;
  next.addEventListener('ended', () => {
    if (track === next) playNextTrack();
  });
  resume(next);
}

// Liefert undefined, wenn es nichts abzuspielen gibt; ein abgelehntes play() (z. B. Autoplay-Sperre) bleibt still.
function resume(audio) {
  if (!audio) return undefined;
  audio.play().catch(() => {});
  return audio;
}

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ohne localStorage gilt die Einstellung nur bis zum Neuladen
  }
}
