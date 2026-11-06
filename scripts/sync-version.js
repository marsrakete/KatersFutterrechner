import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const version = JSON.parse(await readFile(new URL('version.json', root), 'utf8'));
if (!version.appVersion || !version.cacheVersion || typeof version.label !== 'string') {
  throw Error('version.json must contain appVersion, cacheVersion and label.');
}
await writeFile(new URL('version.js', root), `// Generated from version.json by npm run version:sync.\nglobalThis.APP_VERSION_INFO = Object.freeze(${JSON.stringify(version, null, 2)});\n`);
