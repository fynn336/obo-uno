const TRACKS = ['assets/music/jazz-1.mp3', 'assets/music/jazz-2.mp3', 'assets/music/jazz-3.mp3'];
const MUSIC_VOLUME = 0.2;
const EFFECT_VOLUME = 0.6;
const STORAGE_KEY = 'dfuno-audio';

const settings = loadSettings();
const cardSound = new Audio('assets/sounds/card.mp3');
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

export function playCardSound(rate = 1) {
  if (!unlocked || !settings.effects) return;
  const sound = cardSound.cloneNode();
  sound.volume = EFFECT_VOLUME;
  sound.preservesPitch = false;
  sound.playbackRate = rate;
  resume(sound);
}

export function playTurnGong() {
  if (!unlocked || !settings.effects) return;
  context ??= new AudioContext();
  const start = context.currentTime;
  [660, 880].forEach((frequency, i) => {
    const at = start + i * 0.13;
    const oscillator = new OscillatorNode(context, { frequency });
    const gain = new GainNode(context, { gain: 0 });
    gain.gain.linearRampToValueAtTime(0.18, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.7);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.75);
  });
}

function playNextTrack() {
  if (playlist.length === 0) playlist = [...TRACKS].sort(() => Math.random() - 0.5);
  track = new Audio(playlist.pop());
  track.volume = MUSIC_VOLUME;
  track.addEventListener('ended', playNextTrack);
  resume(track);
}

// Liefert undefined, wenn es nichts abzuspielen gibt; ein abgelehntes play() (z. B. Autoplay-Sperre) bleibt still.
function resume(audio) {
  if (!audio) return undefined;
  audio.play().catch(() => {});
  return audio;
}

function loadSettings() {
  try {
    return { music: true, effects: true, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { music: true, effects: true };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ohne localStorage gilt die Einstellung nur bis zum Neuladen
  }
}
