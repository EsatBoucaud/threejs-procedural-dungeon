import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

const progression = await import('../src/game/progression-system.js');
const archiveSystem = await import('../src/game/archive-system.js');
const { INSTITUTE_UPGRADES } = await import('../src/content/upgrades.js');
const { FIELD_ROUTES, seedForRoute } = await import('../src/content/routes.js');

let profile = progression.loadProfile();
assert.equal(profile.version, 2);
assert.equal(profile.rank, 1);
assert.equal(profile.scrip, 0);
assert.deepEqual(profile.upgrades, []);

profile = progression.grantScrip(5000);
assert.equal(profile.scrip, 5000);

const rapidPermit = INSTITUTE_UPGRADES.find((upgrade) => upgrade.id === 'rapid-permit');
const purchase = progression.purchaseUpgrade(rapidPermit);
assert.equal(purchase.success, true);
assert.equal(purchase.profile.upgrades.includes('rapid-permit'), true);
assert.equal(purchase.profile.scrip, 5000 - rapidPermit.cost);

const route = FIELD_ROUTES[2];
assert.match(seedForRoute(route, purchase.profile), new RegExp(`^${route.seedPrefix}-`));

const recovered = Array.from({ length: 20 }, (_, index) => ({
  id: `test-object-${index}`,
  instanceId: `test-instance-${index}`,
  name: `Test Object ${index}`,
  value: 80 + index * 11,
  rarity: index % 4 === 0 ? 'rare' : 'common',
  color: 0xffffff,
  origin: index % 3 === 0 ? 'interlace' : 'base',
  condition: ['stable', 'weathered', 'contested', 'unstable'][index % 4],
  provenance: 'Automated headquarters filing fixture.',
}));

const result = {
  seed: 'ABRIR-HQ-CHECK-001',
  remoteSeed: 'REMOTE-HQ-CHECK-001',
  routeId: route.id,
  timestamp: new Date(0).toISOString(),
  recovered,
};
const record = archiveSystem.recordRecoveredObjects(result);
assert.equal(record.entries.length, recovered.length);
assert.ok(record.held.length <= Math.ceil(recovered.length * 0.15));
assert.equal(record.held.length + record.stored.length, recovered.length);

let archive = archiveSystem.loadArchive();
let summary = archiveSystem.archiveSummary(archive);
assert.equal(summary.stored + summary.held, recovered.length);
assert.equal(summary.remote, recovered.filter((item) => item.origin === 'interlace').length);

const storedObject = archive.objects.find((entry) => entry.status === 'stored');
assert.ok(storedObject);
const sale = archiveSystem.sellArchivedObject(storedObject.archiveId);
assert.equal(sale.success, true);
assert.ok(sale.payout > 0);
assert.ok(sale.profile.scrip > purchase.profile.scrip);

archive = archiveSystem.loadArchive();
const heldObject = archive.objects.find((entry) => entry.status === 'institute-held');
if (heldObject) {
  const buyback = archiveSystem.buyBackObject(heldObject.archiveId);
  assert.equal(buyback.success, true);
  assert.equal(buyback.entry.status, 'stored');
}

summary = archiveSystem.archiveSummary();
assert.equal(summary.sold, 1);
assert.ok(summary.totalAppraisal > 0);

console.log(
  `Headquarters economy check passed. routes=${FIELD_ROUTES.length} permissions=${INSTITUTE_UPGRADES.length} filed=${record.entries.length} held=${record.held.length} sold=${summary.sold}.`,
);
