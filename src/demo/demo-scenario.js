import { routeById } from '../content/routes.js';
import { generateMapState, validateMapState } from '../core/dungeon-generator.js';
import { createDefaultDeployment, validateDeployment } from '../game/deployment-system.js';

export const CODEX_DEMO = Object.freeze({
  id: 'codex-live-demo',
  routeId: 'recife-ledger',
  seed: 'ABRIR-CODEX-DEMO-001',
  roomCount: 18,
  loopChance: 0.36,
  interlaceAtSeconds: 180,
});

export function isDemoRequested(search = globalThis.location?.search ?? '') {
  const value = new URLSearchParams(search).get('demo');
  return value === '1' || value === 'true' || value === 'codex';
}

export function createDemoDeployment() {
  const deployment = createDefaultDeployment('two-player');
  const validation = validateDeployment(deployment);
  if (!validation.valid) throw new Error(`Demo deployment invalid: ${validation.errors.join(' ')}`);
  return validation.deployment;
}

export function createDemoState(overrides = {}) {
  const config = { ...CODEX_DEMO, ...overrides };
  const route = routeById(config.routeId);
  const state = generateMapState({
    seed: config.seed,
    roomCount: config.roomCount,
    loopChance: config.loopChance,
    interlaceAtSeconds: config.interlaceAtSeconds,
  });
  state.route = structuredClone(route);
  state.deployment = createDemoDeployment();
  state.demoMode = {
    id: config.id,
    routeId: route.id,
    fixedSeed: config.seed,
    assistEnabled: true,
  };

  const validation = validateMapState(state);
  if (!validation.valid) throw new Error(`Demo map invalid: ${validation.errors.join(' ')}`);
  return state;
}

export function demoUrl(pathname = globalThis.location?.pathname ?? '/') {
  const url = new URL(pathname, 'http://abrir.local');
  url.searchParams.set('demo', '1');
  return `${url.pathname}${url.search}`;
}
