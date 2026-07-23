import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../content/search/', import.meta.url);
const filenames = (await readdir(root)).filter((name) => name.endsWith('.json'));

if (filenames.length === 0) {
  throw new Error('No hidden-room search scenes were found.');
}

let targetCount = 0;
for (const filename of filenames) {
  const scene = JSON.parse(await readFile(new URL(filename, root), 'utf8'));
  const label = `content/search/${filename}`;

  if (scene.schemaVersion !== 1) throw new Error(`${label}: unsupported schemaVersion.`);
  if (!scene.id || !scene.title || !scene.image) throw new Error(`${label}: missing scene metadata.`);
  if (!Number.isFinite(scene.durationSeconds) || scene.durationSeconds <= 0) {
    throw new Error(`${label}: durationSeconds must be positive.`);
  }
  if (!Number.isInteger(scene.capacity) || scene.capacity <= 0) {
    throw new Error(`${label}: capacity must be a positive integer.`);
  }
  if (!Number.isInteger(scene.hintCount) || scene.hintCount < 0) {
    throw new Error(`${label}: hintCount must be a non-negative integer.`);
  }
  if (!Array.isArray(scene.objects) || scene.objects.length === 0) {
    throw new Error(`${label}: objects must be a non-empty array.`);
  }

  const ids = new Set();
  let sceneTargetCount = 0;
  for (const object of scene.objects) {
    if (!object.id || ids.has(object.id)) throw new Error(`${label}: duplicate or missing object id.`);
    ids.add(object.id);
    if (!object.name || !object.category) throw new Error(`${label}: ${object.id} is missing display metadata.`);
    if (!Number.isFinite(object.value) || object.value < 0) {
      throw new Error(`${label}: ${object.id} has an invalid value.`);
    }
    if (typeof object.target !== 'boolean') throw new Error(`${label}: ${object.id} target must be boolean.`);
    if (object.target) sceneTargetCount += 1;

    const box = object.hitbox;
    if (!box || [box.x, box.y, box.w, box.h].some((value) => !Number.isFinite(value))) {
      throw new Error(`${label}: ${object.id} has an invalid hitbox.`);
    }
    if (box.x < 0 || box.y < 0 || box.w <= 0 || box.h <= 0 || box.x + box.w > 1 || box.y + box.h > 1) {
      throw new Error(`${label}: ${object.id} hitbox leaves normalized image bounds.`);
    }

    if (object.morality) {
      if (!['low', 'medium', 'high'].includes(object.morality.severity)) {
        throw new Error(`${label}: ${object.id} has an invalid morality severity.`);
      }
      if (!object.morality.prompt) throw new Error(`${label}: ${object.id} morality prompt is missing.`);
    }

    const consequences = object.consequences ?? {};
    for (const field of ['arenaModifiers', 'cardUnlocks', 'dialogueFacts']) {
      if (consequences[field] !== undefined && !Array.isArray(consequences[field])) {
        throw new Error(`${label}: ${object.id} consequence ${field} must be an array.`);
      }
      for (const identifier of consequences[field] ?? []) {
        if (!/^[a-z0-9_-]+$/.test(identifier)) {
          throw new Error(`${label}: ${object.id} consequence identifier '${identifier}' is not normalized.`);
        }
      }
    }
  }

  if (sceneTargetCount < scene.capacity) {
    throw new Error(`${label}: target count must be at least capacity.`);
  }
  targetCount += sceneTargetCount;
  console.log(`Validated ${label}: ${scene.objects.length} objects, ${sceneTargetCount} targets, capacity ${scene.capacity}.`);
}

console.log(`Validated ${filenames.length} search scene(s) with ${targetCount} recoverable targets.`);
