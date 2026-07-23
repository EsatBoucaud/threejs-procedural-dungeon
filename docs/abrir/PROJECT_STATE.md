# ABRIR Project State

Updated: 2026-07-23

## Current foundation

ABRIR is being developed on the `abrir-mvp` branch of the existing Three.js procedural dungeon repository so the procedural map system is part of the MVP from the beginning.

The inherited generator provides deterministic seeded layouts, connected room graphs, semantic room roles, tile grids, props, spawns, difficulty depth, and Three.js rendering.

The gameplay runtime loads a saved map snapshot independently from the forge and uses generated room semantics for traversal, room-mode dispatch, combat activation, room locking, objective placement, extraction, and interlacing.

## MVP definition

The first playable slice is a short single-player run with:

- one ranged operative and one melee operative;
- spatial exploration and instant switching between the pair;
- one generated map state loaded from a saved JSON file;
- real-time action combat in one room type;
- turn-based card combat in another room type;
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
- [x] Generated rooms dispatch different combat modes.
- [x] Real-time skirmish room with aiming, ranged projectiles, melee arcs, secondary abilities, dodge, cooldowns, pursuit enemies, contact attacks, incapacitation, partner follow, and room-clear state.
- [x] Three-lane card-combat room with deterministic draw pile, discard pile, five-card hand, and 3-Time turn economy.
- [x] Card enemy intents, Block, Weak, Restrain, healing, card draw, lane movement, and End Turn resolution.
- [x] Sócrates and Zélia share health across exploration, real-time combat, and card combat.
- [x] Chrome-heavy interfaces support both supplied UI directions.
- [x] Both encounters expose separate recovered objects with shared run value.
- [x] Returning to the generated entrance opens an Extract-or-Stay decision.
- [x] Staying interlaces and reopens the tactical card room with an elite encounter.
- [x] Extraction produces a run report with recovered value, 15% Instituto Travessia retention, and secured value.
- [x] CI passes on the dual-combat implementation.
- [ ] Extract procedural generation from renderer-heavy `src/main.js` into a clean reusable module.
- [ ] Add browser-side export/download controls to the visual forge.
- [ ] Replace primitive operative geometry and portrait blocks with supplied character assets.
- [ ] Replace placeholder room-mode selection with authored encounter data in the saved map overlay.
- [ ] Add sound, hit timing, combat animation, and card illustration assets.

## Current test map

`content/maps/generated/abrir-mvp-seed-20260723.json`

- Generated name: **The Sunken Reliquary of Ker’esh**
- Dimensions: **77 × 83 cells**
- Rooms: **24**
- Entrance room: **5**
- Boss room: **12**
- Maximum room depth: **7**

The fantasy-facing theme is still inherited placeholder dressing. ABRIR environment art and naming will replace it without changing the proven topology pipeline.

## Current run

1. Start at the generated entrance.
2. Enter the shallow marked combat room for real-time action combat.
3. Enter the deeper marked room for card combat.
4. Recover both objects.
5. Return to the entrance.
6. Extract immediately or stay after night.
7. Staying activates interlacing and reopens the tactical room with an elite card encounter.
8. Return and extract to receive the run report.

## Immediate next task

Move encounter type and reward rules out of `src/game/main.js` and into the saved map's `gameplay` overlay so each generated room explicitly declares:

- encounter mode: exploration, real-time, card, dialogue, or objective;
- encounter recipe;
- reward table;
- interlacing transformation;
- extraction eligibility.
