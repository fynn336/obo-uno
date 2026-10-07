// Übernimmt aus raw nur eine bekannte Aktion mit korrekt typisierten Feldern, sonst null.
// schemas: { aktionstyp: { feld: 'typ' | ['typ', ...] } }
export function readFields(raw, schemas) {
  if (!isObject(raw) || !Object.hasOwn(schemas, raw.type)) return null;
  const action = { type: raw.type };
  for (const [key, types] of Object.entries(schemas[raw.type])) {
    const value = raw[key];
    const type = value === null ? 'null' : typeof value;
    if (![types].flat().includes(type)) return null;
    action[key] = value;
  }
  return action;
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}
