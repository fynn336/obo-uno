import { CHANGELOG, VERSION } from '../src/changelog.js';
import { test, assert, assertEqual } from './testing.js';

const parts = (version) => version.split('.').map(Number);
const compareVersions = (a, b) => {
  const [x, y] = [parts(a), parts(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

test('Changelog: aktuelle Version ist der oberste Eintrag', () => {
  assertEqual(VERSION, CHANGELOG[0].version, 'Version');
});

test('Changelog: gültige Versionen, absteigend, mit Datum und Inhalt', () => {
  for (const [i, entry] of CHANGELOG.entries()) {
    assert(/^\d+\.\d+\.\d+$/.test(entry.version), `Versionsformat ${entry.version}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(entry.date), `Datum bei ${entry.version}`);
    assert(entry.changes.length > 0, `Inhalt bei ${entry.version}`);
    if (i > 0) assert(compareVersions(CHANGELOG[i - 1].version, entry.version) > 0, `Reihenfolge bei ${entry.version}`);
  }
});
