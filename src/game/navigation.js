import { deriveMapLayout, pointInsideObstacle } from '../core/room-layout.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceToSegment(point, start, end) {
  const ax = point.x - start.x;
  const az = point.z - start.z;
  const bx = end.x - start.x;
  const bz = end.z - start.z;
  const lengthSquared = bx * bx + bz * bz;
  const t = lengthSquared > 0 ? clamp((ax * bx + az * bz) / lengthSquared, 0, 1) : 0;
  return Math.hypot(
    point.x - (start.x + bx * t),
    point.z - (start.z + bz * t),
  );
}

function insideRoom(point, room, margin) {
  return (
    Math.abs(point.x - room.x) <= room.width / 2 - margin
    && Math.abs(point.z - room.z) <= room.depth / 2 - margin
  );
}

function insideConnections(point, connections) {
  for (const connection of connections ?? []) {
    const points = connection.corridor?.points ?? [];
    for (let index = 0; index < points.length - 1; index += 1) {
      if (distanceToSegment(point, points[index], points[index + 1]) <= connection.corridor.width / 2 - 0.1) {
        return true;
      }
    }
  }
  return false;
}

function blocked(point, obstacles, margin) {
  return obstacles.some((obstacle) => pointInsideObstacle(point, obstacle, margin));
}

export function createWalkability(mapState, interlaceActive) {
  const layout = deriveMapLayout(mapState);
  return function isWalkable(point, margin = 0.18) {
    const localSurface = (
      mapState.rooms.some((room) => insideRoom(point, room, 0.45))
      || insideConnections(point, mapState.connections)
    );
    if (localSurface && !blocked(point, layout.local.obstacles, margin)) return true;
    if (!interlaceActive()) return false;

    const remoteSurface = (
      (mapState.interlace?.rooms ?? []).some((room) => insideRoom(point, room, 0.5))
      || insideConnections(point, mapState.interlace?.connections)
      || insideConnections(point, mapState.interlace?.bridges)
      || (mapState.interlace?.overlaps ?? []).some((overlap) => (
        Math.abs(point.x - overlap.x) <= overlap.width / 2
        && Math.abs(point.z - overlap.z) <= overlap.depth / 2
      ))
    );
    if (!remoteSurface) return false;
    return !blocked(point, layout.remote.obstacles, margin);
  };
}
