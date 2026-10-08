import { WORDS } from '../sketch/words.js';
import { ALPHABET, isLetter, letterOf } from './game.js';

// Buchstaben nach Häufigkeit im Deutschen
const BY_FREQUENCY = [...'ENISRATDHULCGMOBWFKZPVÜÄÖJYXQß'];

// leicht: rät irgendeinen Buchstaben · mittel: nach Häufigkeit · schwer: gleicht das Muster mit der Wortliste ab
export function botMove(state, botId, level = 'medium') {
  if (state.phase !== 'guess' || state.players[state.current].id !== botId) return null;
  const open = (letter) => !state.guessed.includes(letter);
  if (level === 'easy') {
    const left = ALPHABET.filter(open);
    return { type: 'letter', letter: left[(state.turnNumber * 7) % left.length] };
  }
  if (level === 'hard') {
    const candidates = WORDS.filter((word) => fitsPattern(word, state));
    if (candidates.length === 1) return { type: 'solve', text: candidates[0] };
    const count = (letter) => candidates.filter((word) => [...word].some((char) => letterOf(char) === letter)).length;
    const best = BY_FREQUENCY.filter(open).reduce((a, b) => (count(b) > count(a) ? b : a));
    return { type: 'letter', letter: best };
  }
  return { type: 'letter', letter: BY_FREQUENCY.find(open) };
}

// Passt ein Wort zu dem, was alle sehen: gleiche Länge, aufgedeckte Buchstaben, keine falsch geratenen?
function fitsPattern(word, state) {
  if (word.length !== state.word.length) return false;
  return [...word].every((char, i) => {
    const shown = state.word[i];
    if (!isLetter(shown)) return char === shown;
    const revealed = state.guessed.includes(letterOf(shown));
    return revealed ? letterOf(char) === letterOf(shown) : isLetter(char) && !state.guessed.includes(letterOf(char));
  });
}
