import { test, assert, assertEqual } from './testing.js';
import { act, game, play } from './setup.js';

const DRAW_PILE = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8'];

function eventsAfter(before, after) {
  const lastId = before.events.at(-1)?.id ?? 0;
  return after.events.filter((e) => e.id > lastId).map(({ id, ...event }) => event);
}

test('Ereignisse: Karte legen und Aussetzen', () => {
  const s = game({ hands: [['rS', 'g1'], ['g2'], ['g3']] });
  const events = eventsAfter(s, play(s, 'p0', 'rS'));
  assertEqual(events.map((e) => e.type), ['play', 'skipped'], 'Typen');
  assertEqual(events[0].player, 'P0', 'Leger');
  assertEqual(events[0].card.value, 'skip', 'Karte');
  assertEqual(events[1].player, 'P1', 'setzt aus');
});

test('Ereignisse: Strafkarten mit tatsächlicher Anzahl, Richtungswechsel, Farbwahl', () => {
  // Nur 1 Karte im Stapel plus 1 neu gemischte: Es können nur 2 statt 4 gezogen werden.
  let s = game({ hands: [['W+4', 'g1'], ['g2'], ['g3']], draw: ['y1'] });
  const before = s;
  s = act(play(s, 'p0', 'W+4'), { type: 'chooseColor', playerId: 'p0', color: 'blue' });
  assertEqual(eventsAfter(before, s).map((e) => [e.type, e.player, e.count ?? e.color ?? null]),
    [['play', 'P0', null], ['color', 'P0', 'blue'], ['penalty', 'P1', 2]], 'Ereignisse');
  const reversed = game({ hands: [['rR', 'g1'], ['g2'], ['g3']] });
  assertEqual(eventsAfter(reversed, play(reversed, 'p0', 'rR')).map((e) => e.type), ['play', 'reverse'], 'Richtungswechsel');
});

test('Ereignisse: Ziehen nennt nur die Anzahl, nie die Karte', () => {
  const s = game({ hands: [['g1', 'g2'], ['g3']], draw: ['b1', 'b2', 'r9'], rules: { drawUntilPlayable: true } });
  const after = act(s, { type: 'draw', playerId: 'p0' });
  const events = eventsAfter(s, after);
  assertEqual(events, [{ type: 'draw', player: 'P0', count: 3 }], 'Ereignis');
  const json = JSON.stringify(after.events);
  for (const card of after.players[0].hand.slice(2)) assert(!json.includes(`"id":${card.id},`), 'gezogene Karte verraten');
});

test('Ereignisse: Uno, Erwischt, Weitergeben', () => {
  let s = game({ hands: [['r1', 'r2'], ['g4', 'g5'], ['g3']], draw: DRAW_PILE });
  const start = s;
  s = act(s, { type: 'callUno', playerId: 'p0' });
  s = play(s, 'p0', 'r1');
  s = act(s, { type: 'draw', playerId: 'p1' });
  s = act(s, { type: 'pass', playerId: 'p1' });
  assertEqual(eventsAfter(start, s).map((e) => e.type), ['uno', 'play', 'draw', 'pass'], 'Typen');
  let forgot = play(game({ hands: [['r1', 'g2'], ['g4'], ['g3']], draw: DRAW_PILE }), 'p0', 'r1');
  const before = forgot;
  forgot = act(forgot, { type: 'catchUno', playerId: 'p2', targetId: 'p0' });
  assertEqual(eventsAfter(before, forgot), [{ type: 'caught', player: 'P2', target: 'P0' }], 'Erwischt');
});

test('Ereignisse: Anfechtung erfolgreich und gescheitert', () => {
  const setup = (hand) => act(
    play(game({ hands: [hand, ['b2'], ['g3']], draw: DRAW_PILE, rules: { challenge: true } }), 'p0', 'W+4'),
    { type: 'chooseColor', playerId: 'p0', color: 'blue' });
  const guilty = setup(['W+4', 'r1', 'g1']);
  assertEqual(eventsAfter(guilty, act(guilty, { type: 'challenge', playerId: 'p1' })),
    [{ type: 'challenge', player: 'P1', target: 'P0', success: true }], 'erfolgreich');
  const innocent = setup(['W+4', 'g1']);
  assertEqual(eventsAfter(innocent, act(innocent, { type: 'challenge', playerId: 'p1' })),
    [{ type: 'challenge', player: 'P1', target: 'P0', success: false }, { type: 'penalty', player: 'P1', count: 6 }], 'gescheitert');
});

test('Ereignisse: Rundenstart, Sieg und Rauswurf', () => {
  const won = play(game({ hands: [['r7'], ['g3']] }), 'p0', 'r7');
  assertEqual(won.events.at(-1).type, 'win', 'Sieg');
  assertEqual(won.events.at(-1).player, 'P0', 'Gewinner');
  const restarted = act(won, { type: 'start', playerId: 'p0' });
  assert(eventsAfter(won, restarted)[0].type === 'start', 'Rundenstart zuerst');
  const left = act(game({ hands: [['r1'], ['g2'], ['g3']] }), { type: 'leave', playerId: 'p2' });
  assertEqual(left.events.at(-1), { id: left.events.at(-1).id, type: 'left', player: 'P2' }, 'Rauswurf');
});

test('Ereignisse: fortlaufende IDs, höchstens 30 gespeichert', () => {
  let s = game({ hands: [['g1', 'g2'], ['g3', 'g4']], draw: Array(40).fill('b9') });
  for (let i = 0; i < 40; i++) s = act(s, { type: 'draw', playerId: s.players[s.current].id });
  assertEqual(s.events.length, 30, 'Anzahl');
  assertEqual(s.events.at(-1).id - s.events[0].id, 29, 'lückenlos');
});
