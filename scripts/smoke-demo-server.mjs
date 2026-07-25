import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const port = 4179;
const origin = `http://127.0.0.1:${port}`;

await fs.access(path.join(root, 'dist', 'index.html'));
await fs.access(viteBin);

const server = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  env: { ...process.env, BROWSER: 'none' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
server.stdout.on('data', (chunk) => { output += chunk.toString(); });
server.stderr.on('data', (chunk) => { output += chunk.toString(); });

async function waitForServer() {
  let lastError = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Preview server exited early (${server.exitCode}). ${output}`);
    try {
      const response = await fetch(`${origin}/?demo=1&tutorial=0`, { redirect: 'manual' });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Preview server did not become ready: ${lastError?.message ?? 'unknown error'}\n${output}`);
}

try {
  const response = await waitForServer();
  const html = await response.text();
  assert.match(html, /id="runtime-status"/, 'Production HTML must include the startup recovery mount.');
  assert.match(html, /id="demo-console-root"/, 'Production HTML must include the guarded demo console mount.');
  assert.match(html, /type="module"/, 'Production HTML must load a module bundle.');

  const assetPaths = [...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)]
    .map((match) => match[1]);
  assert.ok(assetPaths.some((entry) => entry.endsWith('.js')), 'Production HTML must reference a JavaScript bundle.');
  assert.ok(assetPaths.some((entry) => entry.endsWith('.css')), 'Production HTML must reference a stylesheet bundle.');

  const assetBodies = [];
  for (const assetPath of [...new Set(assetPaths)]) {
    const assetUrl = new URL(assetPath, origin);
    const assetResponse = await fetch(assetUrl);
    assert.equal(assetResponse.ok, true, `Built asset failed to serve: ${assetUrl.pathname} (${assetResponse.status}).`);
    const body = await assetResponse.text();
    assert.ok(body.length > 0, `Built asset was empty: ${assetUrl.pathname}.`);
    assetBodies.push(body);
  }

  const builtSource = assetBodies.join('\n');
  assert.match(builtSource, /ABRIR-CODEX-DEMO-001/, 'The fixed demo seed must survive production bundling.');
  assert.match(builtSource, /CODEX LIVE \/\/ GUARDED ASSIST/, 'The guarded assist label must survive production bundling.');
  assert.match(builtSource, /PASSAGE DID NOT OPEN/, 'The runtime recovery guard must survive production bundling.');

  console.log(`Production demo smoke passed at ${origin}/?demo=1&tutorial=0 with ${assetPaths.length} served assets.`);
} finally {
  if (server.exitCode === null) server.kill('SIGTERM');
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    const timeout = setTimeout(() => {
      if (server.exitCode === null) server.kill('SIGKILL');
      resolve();
    }, 2000);
    server.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
