import { VERSION } from './changelog.js';

const TRIED_KEY = 'dfuno-update-tried';
const CODE_FILE = /\.(js|css|html)(\?|$)/;

// GitHub Pages lässt Dateien 10 Minuten im Browser-Cache. Gibt es online eine neuere Version,
// werden alle geladenen Code-Dateien frisch geholt und die Seite neu geladen.
// Liefert true, wenn neu geladen wird.
export async function updateIfOutdated() {
  try {
    const response = await fetch('src/changelog.js', { cache: 'no-store' });
    // Der erste Versionseintrag im Changelog ist die aktuelle Version.
    const latest = (await response.text()).match(/version: '([\d.]+)'/)?.[1];
    if (!latest || latest === VERSION || sessionStorage.getItem(TRIED_KEY) === latest) return false;
    sessionStorage.setItem(TRIED_KEY, latest);
    const files = performance.getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((url) => url.startsWith(location.origin) && CODE_FILE.test(url));
    await Promise.all([location.href, ...files].map((url) => fetch(url, { cache: 'reload' })));
    location.reload();
    return true;
  } catch {
    return false;
  }
}
