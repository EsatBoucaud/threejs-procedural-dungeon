import assert from 'node:assert/strict';
import { createInterlaceForecast } from '../src/content/interlace-forecast.js';
import { SafeWindowSystem } from '../src/game/safe-window-system.js';

const mapState = {
  seed: 44,
  interlaceAtSeconds: 80,
  route: { id: 'test-route', risk: 5 },
  interlace: {
    seedLabel: 'REMOTE-TEST',
    rooms: [
      { id: 'remote-combat', localId: 1, type: 'combat', difficulty: 0.5, x: 5, z: 5 },
      { id: 'remote-treasure', localId: 2, type: 'treasure', difficulty: 0.82, x: 8, z: 4 },
      { id: 'remote-vault', localId: 3, type: 'vault', difficulty: 0.95, x: 12, z: 9 },
    ],
  },
};
const process = { id: 'warden', name: 'THE WARDEN', role: 'EXTRACTION LOCKDOWN', description: 'Locks extraction.' };
const forecast = createInterlaceForecast(mapState, process, { x: 1, z: 2, id: 'entrance' });

assert.equal(forecast.opportunity.roomId, 'remote-vault', 'The strongest readable remote opportunity should be forecast.');
assert.equal(forecast.danger.processId, 'warden');
assert.equal(forecast.danger.position.roomId, 'entrance');
assert.ok(forecast.warningSeconds > forecast.finalSeconds);
assert.match(forecast.returnOption.description, /successful filing/i);
assert.match(forecast.stayOption.description, /remote branch/i);

const transitions = [];
const updates = [];
const system = new SafeWindowSystem(mapState.interlaceAtSeconds, forecast, {
  onPhase: (transition) => transitions.push(transition.phase),
  onUpdate: (snapshot) => updates.push(snapshot.phase),
});

assert.equal(system.snapshot().phase, 'stable');
system.update(80 - forecast.warningSeconds + 0.1);
assert.equal(system.snapshot().phase, 'warning');
system.update(80 - forecast.finalSeconds + 0.1);
assert.equal(system.snapshot().phase, 'final');
system.update(90);
assert.equal(system.snapshot().decision, 'undecided', 'Countdown expiry alone should not write the decision before the interlace actually opens.');
system.markStayed(80);
assert.equal(system.snapshot().phase, 'interlaced');
assert.equal(system.snapshot().decision, 'stayed');
assert.deepEqual(transitions, ['warning', 'final', 'interlaced']);
assert.ok(updates.includes('warning') && updates.includes('final') && updates.includes('interlaced'));

const returnSystem = new SafeWindowSystem(80, forecast);
returnSystem.update(35);
returnSystem.markReturned(36);
assert.equal(returnSystem.snapshot().decision, 'returned');
assert.equal(returnSystem.snapshot().phase, 'returned');
assert.ok(returnSystem.snapshot().remainingSeconds > 0);
returnSystem.markStayed(80);
assert.equal(returnSystem.snapshot().decision, 'returned', 'A completed early return cannot later become a stay decision.');

const failedSystem = new SafeWindowSystem(80, forecast);
failedSystem.markFailed(22);
assert.equal(failedSystem.snapshot().decision, 'failed');
assert.equal(failedSystem.snapshot().phase, 'failed');

console.log('Safe-window check passed: forecast selection, warning/final phases, successful return, deliberate stay, and failed-run recording.');
