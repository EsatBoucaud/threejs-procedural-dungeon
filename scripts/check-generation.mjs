import assert from 'node:assert/strict';
import { generateMapState, validateMapState } from '../src/core/dungeon-generator.js';

const seeds = [
  'ABRIR-001',
  'ABRIR-LUANDA-009',
  'ABRIR-RECIFE-014',
  'ABRIR-MAPUTO-021',
  'ABRIR-SAO-TOME-034',
  'ABRIR-PORTO-055',
  'ABRIR-CABO-VERDE-089',
  'ABRIR-MACAU-144',
];

for (const seed of seeds) {
  const options = { seed, roomCount: 24, loopChance: 0.34, interlaceAtSeconds: 82 };
  const first = generateMapState(options);
  const second = generateMapState(options);
  const validation = validateMapState(first);

  assert.equal(validation.valid, true, `${seed}: ${validation.errors.join(' ')}`);
  assert.equal(first.schemaVersion, 2, `${seed}: schema must be v2.`);
  assert.notEqual(first.seed, first.interlace.seed, `${seed}: independent seed required.`);
  assert.ok(first.interlace.rooms.length >= 10, `${seed}: remote room count too low.`);
  assert.ok(first.interlace.connections.length >= first.interlace.rooms.length - 1, `${seed}: remote graph disconnected.`);
  assert.ok(first.interlace.bridges.length >= 1, `${seed}: no cross-state bridge.`);
  assert.deepEqual(first, second, `${seed}: generation is not deterministic.`);

  const baseIds = new Set(first.rooms.map((room) => String(room.id)));
  const remoteIds = new Set(first.interlace.rooms.map((room) => String(room.id)));
  for (const id of remoteIds) assert.equal(baseIds.has(id), false, `${seed}: room ID collision ${id}.`);
  for (const bridge of first.interlace.bridges) {
    assert.ok(baseIds.has(String(bridge.a)), `${seed}: bridge base endpoint missing.`);
    assert.ok(remoteIds.has(String(bridge.b)), `${seed}: bridge remote endpoint missing.`);
  }
}

console.log(`Independent interlace generation passed for ${seeds.length} deterministic seeds.`);
