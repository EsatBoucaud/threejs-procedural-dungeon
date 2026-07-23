import assert from 'node:assert/strict';
import { CHAVE_PROCESSES, processForMap } from '../src/content/chave-processes.js';
import { contractForSeed, contractProgress } from '../src/content/contracts.js';
import { FIELD_ROUTES } from '../src/content/routes.js';
import { generateMapState } from '../src/core/dungeon-generator.js';

const expectedIds = ['auditor', 'seizure-chief', 'route-runner', 'warden'];
assert.deepEqual(Object.keys(CHAVE_PROCESSES).sort(), [...expectedIds].sort());

const covered = new Set();
for (const [index, route] of FIELD_ROUTES.entries()) {
  assert.ok(expectedIds.includes(route.chaveProcess), `${route.id}: invalid process ${route.chaveProcess}.`);
  covered.add(route.chaveProcess);

  const state = generateMapState({
    seed: `${route.seedPrefix}-PROCESS-CHECK`,
    roomCount: route.roomCount,
    loopChance: route.loopChance,
    interlaceAtSeconds: route.interlaceAtSeconds,
  });
  state.route = structuredClone(route);
  const process = processForMap(state);
  assert.equal(process.id, route.chaveProcess, `${route.id}: process assignment drifted.`);

  let hostileContract = null;
  for (let offset = 0; offset < 24; offset += 1) {
    const contract = contractForSeed((state.seed + offset + index * 97) >>> 0, process.id);
    if (contract.id === 'hostile-intervention') {
      hostileContract = contract;
      break;
    }
  }
  assert.ok(hostileContract, `${route.id}: could not produce hostile intervention contract fixture.`);
  assert.equal(hostileContract.majorProcessId, process.id);
  assert.equal(hostileContract.majorProcessName, process.name);
  assert.equal(hostileContract.requirements.majorProcess, true);
  assert.equal('auditor' in hostileContract.requirements, false);

  const incomplete = contractProgress(hostileContract, {
    objects: 99,
    remoteObjects: 99,
    value: 99999,
    rooms: 99,
    remoteRooms: 99,
    overlaps: 99,
    vault: true,
    remoteVault: true,
    interlace: true,
    majorProcess: false,
    auditor: false,
  });
  assert.equal(incomplete.complete, false, `${route.id}: major process requirement is not enforced.`);

  const complete = contractProgress(hostileContract, {
    objects: 99,
    remoteObjects: 99,
    value: 99999,
    rooms: 99,
    remoteRooms: 99,
    overlaps: 99,
    vault: true,
    remoteVault: true,
    interlace: true,
    majorProcess: true,
    auditor: process.id === 'auditor',
  });
  assert.equal(complete.complete, true, `${route.id}: compatible hostile contract cannot complete.`);
}

for (const id of expectedIds) assert.equal(covered.has(id), true, `No route currently exposes ${id}.`);

console.log(`Chave Geral process check passed. routes=${FIELD_ROUTES.length} processes=${expectedIds.length}.`);
