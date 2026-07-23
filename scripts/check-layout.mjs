import assert from 'node:assert/strict';
import { FIELD_ROUTES } from '../src/content/routes.js';
import { deriveMapLayout } from '../src/core/room-layout.js';
import { generateMapState } from '../src/core/dungeon-generator.js';

function countOpenings(layer) {
  let total = 0;
  for (const sides of layer.openings.values()) {
    for (const openings of Object.values(sides)) total += openings.length;
  }
  return total;
}

for (const route of FIELD_ROUTES) {
  const options = {
    seed: `${route.seedPrefix}-LAYOUT-CHECK`,
    roomCount: route.roomCount,
    loopChance: route.loopChance,
    interlaceAtSeconds: route.interlaceAtSeconds,
  };
  const stateA = generateMapState(options);
  const stateB = generateMapState(options);
  stateA.route = structuredClone(route);
  stateB.route = structuredClone(route);
  const layoutA = deriveMapLayout(stateA);
  const layoutB = deriveMapLayout(stateB);

  assert.deepEqual(layoutA.local.obstacles, layoutB.local.obstacles, `${route.id}: local layout drift.`);
  assert.deepEqual(layoutA.remote.obstacles, layoutB.remote.obstacles, `${route.id}: remote layout drift.`);
  assert.ok(countOpenings(layoutA.local) >= stateA.connections.length, `${route.id}: local openings missing.`);
  assert.ok(countOpenings(layoutA.remote) >= stateA.interlace.connections.length, `${route.id}: remote openings missing.`);

  const localRooms = new Map(stateA.rooms.map((room) => [room.id, room]));
  const remoteRooms = new Map(stateA.interlace.rooms.map((room) => [room.id, room]));
  for (const [layer, rooms] of [[layoutA.local, localRooms], [layoutA.remote, remoteRooms]]) {
    for (const object of layer.obstacles) {
      const room = rooms.get(object.roomId);
      assert.ok(room, `${route.id}: object room missing.`);
      assert.ok(object.collision.left >= room.x - room.width / 2, `${route.id}: object left bound invalid.`);
      assert.ok(object.collision.right <= room.x + room.width / 2, `${route.id}: object right bound invalid.`);
      assert.ok(object.collision.top >= room.z - room.depth / 2, `${route.id}: object top bound invalid.`);
      assert.ok(object.collision.bottom <= room.z + room.depth / 2, `${route.id}: object bottom bound invalid.`);
      const centerBlocked = room.x >= object.collision.left && room.x <= object.collision.right
        && room.z >= object.collision.top && room.z <= object.collision.bottom;
      assert.equal(centerBlocked, false, `${route.id}: room center blocked.`);
    }
  }
}

console.log(`Room architecture check passed for ${FIELD_ROUTES.length} routes.`);
