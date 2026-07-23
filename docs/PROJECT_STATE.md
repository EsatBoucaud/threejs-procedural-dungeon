# ABRIR Project State

_Last updated: 2026-07-23_

## Working location

The current implementation lives on the `abrir-mvp` branch of `EsatBoucaud/threejs-procedural-dungeon`.

The GitHub connector available in ChatGPT can create branches and files but cannot create or rename a top-level repository. For now, this branch functions as the ABRIR project repository while preserving the original Three.js generator on `main`.

## What exists now

### Map generation

- The original deterministic Three.js generator remains the source of map topology.
- Maps are generated from a seed and stable parameters.
- `scripts/generate-abrir-map.mjs` extracts the generator portion of `src/main.js` without running the browser renderer.
- `src/abrir/map-state.js` converts generator output into a versioned JSON-safe ABRIR state.
- The canonical snapshot is committed under `content/maps/generated/`.
- Validation checks dimensions, layer lengths, connectivity assumptions, room references, and gameplay overlays.

### Gameplay runtime

- `game.html` loads a committed map snapshot rather than generating a fresh map live.
- The runtime reconstructs floor, wall, pool, room, and encounter geometry in Three.js.
- It currently supports a first real-time combat/skirmish experiment and a second tactical encounter experiment.
- Sócrates and Zélia are the initial placeholder field pair.
- Night-pressure/interlacing, recovered value, extraction, staying late, and the Instituto Travessia retention calculation are represented in the slice.

### Hidden-room search

- `search.html` provides a separate hidden-object recovery prototype.
- Search targets are driven by JSON hitboxes and data rather than hard-coded screen coordinates.
- Capacity, value, hints, morality checks, dialogue facts, arena consequences, and card/ability consequences are represented in the data contract.
- Final room artwork is not yet committed.

### Project infrastructure

- Vite is the browser build system.
- Three.js is the rendering foundation.
- Generation and content validation are exposed through npm scripts.
- Final character art remains intentionally external until the user supplies individual assets.

## Canonical MVP direction

The real-time action-looter loop is the main game direction. The tactical/card surface remains an experiment until it proves it strengthens the paired-character structure rather than pulling the project into a separate genre.

The Three.js generator is mandatory to the MVP, but live runtime generation is not. The accepted first implementation is:

1. generate a deterministic floor;
2. save it as a versioned JSON snapshot;
3. load that snapshot into the game runtime;
4. author encounters, loot, and story consequences against stable room IDs.

## Known gaps

- No dedicated top-level `ABRIR` repository yet.
- No final character sprites, portraits, animations, or enemy art.
- No final room-search illustration committed.
- No backend, authentication, cloud saves, inventory service, or run-history service.
- No automated browser smoke test yet.
- No authoritative decision yet on whether the tactical/card encounter remains in the vertical slice.
- No final controller/gamepad input pass.
- No audio implementation.

## Completion definition for the next checkpoint

The next checkpoint is complete when:

- CI runs generation, validation, and build on every branch update;
- the saved Three.js snapshot is reproducible and unchanged when inputs are unchanged;
- the map forge, gameplay runtime, and hidden-room search all build from one repository;
- character asset slots are documented and ready for supplied art;
- a browser-playable staging deployment can be created without the backend.
