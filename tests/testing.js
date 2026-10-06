const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function runTests() {
  return tests.map(({ name, fn }) => {
    try {
      fn();
      return { name, ok: true };
    } catch (error) {
      return { name, ok: false, message: error.message };
    }
  });
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function assertEqual(actual, expected, label = 'Wert') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: erwartet ${e}, erhalten ${a}`);
}
