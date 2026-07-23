# ABRIR Project State

Updated: 2026-07-23

## Current foundation

ABRIR is being developed on the `abrir-mvp` branch of the existing Three.js procedural dungeon repository so the map generator is part of the MVP from the beginning.

The inherited generator already provides deterministic seeded layouts, connected room graphs, semantic room roles, tile grids, props, spawns, difficulty depth, and Three.js rendering.

## MVP definition

The first playable slice is a short single-player run with:

- one ranged operative and one melee operative;
- instant switching between the pair;
- one generated map state loaded from a saved JSON file;
- authored combat and loot rules applied on top of generated room semantics;
- one night/interlacing escalation event;
- one extraction decision and post-run result screen.

## Map requirement

The MVP does not require live procedural generation during every run. It must prove that maps originate from the Three.js generator.

Approved MVP path:

1. Generate a deterministic dungeon from a seed.
2. Serialize the gameplay-relevant state.
3. Save it as versioned JSON under `content/maps/generated/`.
4. Load that saved state in the gameplay runtime.
5. Preserve seed and generator parameters so the original map can be reproduced.

## Current implementation status

- [x] Existing deterministic Three.js generator identified as the map source.
- [x] Dedicated `abrir-mvp` branch created.
- [x] ABRIR MVP and map-state architecture documented.
- [x] Map-state serializer and schema scaffold added.
- [x] Generated-map validation script added.
- [ ] Extract procedural generation from the current renderer-heavy `src/main.js` into a reusable module.
- [ ] Add an export control that downloads a generated map state as JSON.
- [ ] Commit the first generated ABRIR test map.
- [ ] Add the gameplay runtime and character-controller grey box.
- [ ] Load the saved generated state into the gameplay runtime.

## Immediate next task

Refactor only the generator portion of `src/main.js` into `src/generator/` without changing its output. The existing showcase must still render the same seeded maps. Then connect the output to `createMapState()` and add a browser download button.
