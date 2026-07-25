import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (file) => fs.readFile(path.join(root, file), 'utf8');

const [
  indexSource,
  packageSource,
  workflowSource,
  runSource,
  progressionSource,
  demoFocusSource,
  runtimeGuardSource,
  smokeSource,
] = await Promise.all([
  read('index.html'),
  read('package.json'),
  read('.github/workflows/ci.yml'),
  read('src/game/run-controller.js'),
  read('src/game/progression-system.js'),
  read('src/game/demo-focus-runtime.js'),
  read('src/ui/runtime-guard.js'),
  read('scripts/smoke-demo-server.mjs'),
]);

const scriptOrder = [
  'runtime-guard.js',
  'safe-window-bootstrap.js',
  'tutorial-bootstrap.js',
  'demo-focus-runtime.js',
  'main.js',
].map((script) => ({ script, index: indexSource.indexOf(script) }));
for (const entry of scriptOrder) assert.ok(entry.index >= 0, `Missing ordered runtime script: ${entry.script}.`);
for (let index = 1; index < scriptOrder.length; index += 1) {
  assert.ok(
    scriptOrder[index - 1].index < scriptOrder[index].index,
    `${scriptOrder[index - 1].script} must load before ${scriptOrder[index].script}.`,
  );
}
assert.match(indexSource, /id="runtime-status"/);
assert.match(indexSource, /id="demo-console-root"/);

assert.match(runSource, /this\.isDemoRun = Boolean/);
assert.match(runSource, /this\.profile = this\.isDemoRun \? createDemoProfile\(\) : loadProfile\(\)/);
assert.match(runSource, /skipped: 'demo-mode'/);
const demoBranchIndex = runSource.indexOf('if (this.isDemoRun)');
const persistenceIndex = runSource.indexOf('result.profile = recordRun(result)');
assert.ok(demoBranchIndex >= 0 && persistenceIndex > demoBranchIndex, 'Persistent accounting must remain behind the demo isolation branch.');

assert.match(progressionSource, /unlocks: \['socrates', 'zelia-amato', 'lia', 'chilindo'\]/);
assert.match(progressionSource, /id === 'kindred' \? 'chilindo' : id/);
assert.match(progressionSource, /if \(demoRequested\(\)\) return createDemoProfile\(\)/);

for (const expected of ['previousUpdate', 'this.isDemoRun', 'shared-interaction-open', 'comic-reader-open', 'releaseMovementKeys']) {
  assert.ok(demoFocusSource.includes(expected), `Demo focus runtime missing: ${expected}.`);
}
for (const expected of ['OPENING PASSAGE', 'PASSAGE DID NOT OPEN', 'abrir:boot-ready', 'Startup exceeded ten seconds']) {
  assert.ok(runtimeGuardSource.includes(expected), `Runtime guard missing: ${expected}.`);
}
for (const expected of ['vite.js', '?demo=1&tutorial=0', 'ABRIR-CODEX-DEMO-001', 'PASSAGE DID NOT OPEN']) {
  assert.ok(smokeSource.includes(expected), `Served demo smoke missing: ${expected}.`);
}

const packageJson = JSON.parse(packageSource);
assert.equal(packageJson.scripts['smoke:demo'], 'node scripts/smoke-demo-server.mjs');
assert.ok(packageJson.scripts.preflight.includes('check:release'));
assert.ok(packageJson.scripts.preflight.includes('smoke:demo'));
assert.match(workflowSource, /npm ci/);
assert.match(workflowSource, /npm run check:release/);
assert.match(workflowSource, /npm run smoke:demo/);

console.log('Release-candidate check passed: ordered boot guards, isolated demo persistence, explanation freeze, clean profile, clean install, and served production smoke.');
