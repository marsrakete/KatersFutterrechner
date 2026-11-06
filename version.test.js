import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('App und Service Worker verwenden denselben Versionsstand wie die Remote-Datei', async () => {
  const expected = JSON.parse(await readFile(new URL('./version.json', import.meta.url), 'utf8'));
  const context = vm.createContext({});
  vm.runInContext(await readFile(new URL('./version.js', import.meta.url), 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.APP_VERSION_INFO)), expected);
  assert.match(expected.appVersion, /^\d+\.\d+\.\d+$/);
  assert.ok(expected.cacheVersion.length > 0);
});
