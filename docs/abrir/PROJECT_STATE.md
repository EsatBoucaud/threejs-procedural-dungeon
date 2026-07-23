# ABRIR Project State

Updated: 2026-07-23

## Current foundation

ABRIR is being developed on the `abrir-mvp` branch of the existing Three.js procedural dungeon repository so the procedural map system is part of the MVP from the beginning.

The inherited generator provides deterministic seeded layouts, connected room graphs, semantic room roles, tile grids, props, spawns, difficulty depth, and Three.js rendering.

The project now has three executable play surfaces:

- `index.html`: the original Three.js procedural map forge;
- `game.html`: spatial exploration, arena combat, card combat, interlacing, and extraction;
- `search.html`: image-based hidden-room collection with normalized JSON hitboxes, moral choices, and cross-modality consequences.

## MVP definition

The first playable slice is a short single-player run with:

- one ranged operative and one melee operative;
- spatial exploration and instant switching between the pair;
- one generated map state loaded from a saved JSON file;
- real-time action combat in one room type;
- turn-based card combat in another room type;
- image-based object collection synchronized to a teammate combat timer;
- text-based consequence decisions linked to recovered objects;
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
- [x] GitHub Actions regenerate, validate, and build all MVP pages.
- [x] Separate `game.html` runtime reconstructs the saved floor, walls, pools, room semantics, and entrance.
- [x] Two-operative exploration pair with active switching and partner follow.
- [x] Generated rooms dispatch different combat modes.
- [x] Real-time skirmish room with aiming, ranged projectiles, melee arcs, secondary abilities, dodge, cooldowns, pursuit enemies, contact attacks, incapacitation, partner follow, and room-clear state.
- [x] Three-lane card-combat room with deterministic draw pile, discard pile, five-card hand, and 3-Time turn economy.
- [x] Card enemy intents, Block, Weak, Restrain, healing, card draw, lane movement, and End Turn resolution.
- [x] Sócrates and Zélia share health across exploration, real-time combat, and card combat.
- [x] Chrome-heavy interfaces support the supplied arena, card, and search UI directions.
- [x] Both combat encounters expose separate recovered objects with shared run value.
- [x] Returning to the generated entrance opens an Extract-or-Stay decision.
- [x] Staying interlaces and reopens the tactical card room with an elite encounter.
- [x] Extraction produces a run report with recovered value, 15% Instituto Travessia retention, and secured value.
- [x] Hidden-room search runtime loads a replaceable scene image and normalized object hitboxes from JSON.
- [x] Search timer is synchronized conceptually to a teammate arena encounter and reports changing teammate pressure.
- [x] Search supports limited capacity, object values, decoys, time penalties, target lists, and hints.
- [x] Moral objects trigger consequence confirmation and post-search dialogue decisions.
- [x] Search results persist structured arena modifiers, card unlocks, dialogue facts, trust, selected objects, and extraction value to local storage.
- [x] Search-scene validation runs as part of `npm run check`.
- [x] CI passes on the multimodal implementation.
- [ ] Extract procedural generation from renderer-heavy `src/main.js` into a clean reusable module.
- [ ] Add browser-side export/download controls to the visual forge.
- [ ] Replace primitive operative geometry and portrait blocks with supplied character assets.
- [ ] Replace placeholder room-mode selection with authored encounter data in the saved map overlay.
- [ ] Make `game.html` consume `abrir.search.latestResult` as shared run state rather than only linking to the search page.
- [ ] Move search dialogue branches from runtime code into authored dialogue JSON.
- [ ] Add sound, hit timing, combat animation, card illustration, and final hidden-room image assets.

## Current test map

`content/maps/generated/abrir-mvp-seed-20260723.json`

- Generated name: **The Sunken Reliquary of Ker’esh**
- Dimensions: **77 × 83 cells**
- Rooms: **24**
- Entrance room: **5**
- Boss room: **12**
- Maximum room depth: **7**

The fantasy-facing theme is still inherited placeholder dressing. ABRIR environment art and naming will replace it without changing the proven topology pipeline.

## Current combat run

1. Start at the generated entrance.
2. Enter the shallow marked combat room for real-time action combat.
3. Enter the deeper marked room for card combat.
4. Recover both objects.
5. Return to the entrance.
6. Extract immediately or stay after night.
7. Staying activates interlacing and reopens the tactical room with an elite card encounter.
8. Return and extract to receive the run report.

## Current hidden-room run

1. Open `search.html` from the map runtime.
2. Search a still scene while the teammate arena timer counts down.
3. Choose up to six objects from JSON-defined hitboxes.
4. Decide whether to take morally sensitive personal or essential objects.
5. Resolve resident confrontation choices after the timer.
6. Persist value and consequences under `abrir.search.latestResult`.

## Immediate next task

Create a shared run-state adapter so the map runtime and hidden-room runtime exchange state directly:

- carry search value into extraction;
- apply arena modifiers to a live fight;
- add unlocked cards to the tactical deck;
- expose dialogue facts to a standalone dialogue room;
- preserve trust and morality outcomes through restart and server persistence.
