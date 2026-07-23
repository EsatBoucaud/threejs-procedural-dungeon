# ABRIR Project State

Updated: 2026-07-23

## Current foundation

ABRIR is being developed on the `abrir-mvp` branch of the existing Three.js procedural dungeon repository so the procedural map system is part of the MVP from the beginning.

The inherited generator provides deterministic seeded layouts, connected room graphs, semantic room roles, tile grids, props, spawns, difficulty depth, and Three.js rendering.

The gameplay runtime loads a saved map snapshot independently from the forge and uses generated room semantics for traversal, combat activation, room locking, and objective placement.

## MVP definition

The first playable slice is a short single-player run with:

- one ranged operative and one melee operative;
- spatial exploration and instant switching between the pair;
- one generated map state loaded from a saved JSON file;
- turn-based card combat inside generated hostile rooms;
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
- [x] GitHub Actions regenerate, validate, and build the saved-map runtime.
- [x] Separate `game.html` runtime reconstructs the saved floor, walls, pools, room semantics, and entrance.
- [x] Two-operative exploration pair with active switching and partner follow.
- [x] Generated combat room activation and visible room barriers.
- [x] Real-time combat experiment removed in favor of the intended turn-based card system.
- [x] Three-lane combat layout added inside the generated room.
- [x] Deterministic draw pile, discard pile, five-card hand, and 3-Time turn economy.
- [x] Enemy intents, Block, Weak, Restrain, healing, card draw, lane movement, and End Turn resolution.
- [x] Sócrates and Zélia receive distinct card identities while sharing neutral tactical cards.
- [x] Chrome-heavy combat HUD follows the supplied card-combat composition.
- [x] Interlacing affects room treatment, hostile count, elite presence, damage, and provisional recovered value.
- [x] CI passes on the card-combat implementation.
- [ ] Extract procedural generation from renderer-heavy `src/main.js` into a clean reusable module.
- [ ] Add browser-side export/download controls to the visual forge.
- [ ] Replace primitive operative geometry and portrait blocks with supplied character assets.
- [ ] Add extraction and post-run results.
- [ ] Turn manual interlacing into a timed extract-or-stay escalation.

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

Complete the first run loop after card combat:

1. designate the generated entrance as the initial extraction point;
2. require the pair to carry the recovered core fragment back through the map;
3. offer extract-or-stay on return;
4. make staying trigger timed interlacing and a harder second card encounter;
5. show a compact post-run result screen with retained and lost value.
