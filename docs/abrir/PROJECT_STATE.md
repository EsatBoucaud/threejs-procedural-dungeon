# ABRIR Project State

Updated: 2026-07-23

## Current foundation

ABRIR is being developed on the `abrir-mvp` branch of the existing Three.js procedural dungeon repository so the procedural map system is part of the MVP from the beginning.

The inherited generator provides deterministic seeded layouts, connected room graphs, semantic room roles, tile grids, props, spawns, difficulty depth, and Three.js rendering.

## MVP definition

The first playable slice is a short single-player run with:

- one ranged operative and one melee operative;
- instant switching between the pair;
- one generated map state loaded from a saved JSON file;
- authored combat and loot rules applied on top of generated room semantics;
- one night/interlacing escalation event;
- one extraction decision and post-run result screen.

## Map requirement

The MVP does not require live procedural generation during every run. It proves that playable maps originate from the Three.js generator and can be reproduced from their saved seed and parameters.

Implemented pipeline:

1. Read the exact deterministic generator section from `src/main.js`.
2. Generate a connected dungeon from a versioned recipe.
3. Serialize gameplay-relevant state through `createMapState()`.
4. Save a stable JSON snapshot under `content/maps/generated/`.
5. Validate dimensions, topology, semantic room IDs, and tile layers.
6. Load the snapshot in a separate Three.js gameplay runtime.

## Current implementation status

- [x] Existing deterministic Three.js generator identified as the map source.
- [x] Dedicated `abrir-mvp` branch created.
- [x] ABRIR MVP and map-state architecture documented.
- [x] Map-state serializer and schema scaffold added.
- [x] Generated-map validation script added.
- [x] Deterministic Node generation bridge added without duplicating the algorithm.
- [x] First generation recipe added: seed `20260723`, 24 rooms, Ancient theme.
- [x] First generated ABRIR map committed as a versioned JSON snapshot.
- [x] GitHub Actions regenerate and validate the saved map when its source changes.
- [x] Separate `game.html` runtime loads the saved state and reconstructs its floor, walls, pools, semantic rooms, and entrance.
- [x] Grey-box player movement and tile collision work against the saved generated grid.
- [x] Manual interlacing visual-state test added with the `I` key.
- [ ] Extract procedural generation from renderer-heavy `src/main.js` into a clean reusable module.
- [ ] Add browser-side export/download controls to the visual forge.
- [ ] Replace the placeholder pawn with the first ranged/melee pair.
- [ ] Add character switching, attacks, enemies, loot, and room-clear state.
- [ ] Add extraction and post-run results.

## Current test map

`content/maps/generated/abrir-mvp-seed-20260723.json`

- Generated name: **The Sunken Reliquary of Ker’esh**
- Dimensions: **77 × 83 cells**
- Rooms: **24**
- Entrance room: **5**
- Boss room: **12**
- Maximum room depth: **7**

The fantasy-facing theme is still inherited placeholder dressing. ABRIR environment art and naming will replace it without changing the proven topology pipeline.

## Immediate next task

Turn the saved-map traversal test into the first combat room: add the ranged/melee pair as data-driven placeholder kits, switch control between them, keep the inactive partner following, and lock one generated combat room until its enemies are cleared.
