# ABRIR Technical Architecture

## Architectural goal

ABRIR must be buildable and testable as a static browser project before any server is required. The backend should later replace persistence adapters without forcing a rewrite of combat, maps, rooms, or content.

## System boundaries

```text
┌──────────────────────────────────────┐
│ Three.js Map Forge                   │
│ seed + parameters → generated floor  │
└──────────────────┬───────────────────┘
                   │ createMapState()
                   ▼
┌──────────────────────────────────────┐
│ Versioned ABRIR Map Snapshot         │
│ content/maps/generated/*.json        │
└───────────────┬──────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌───────────────┐  ┌──────────────────┐
│ Game Runtime  │  │ Authoring Tools  │
│ Three.js      │  │ encounter data   │
│ combat/loot   │  │ validation       │
└───────┬───────┘  └──────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ Persistence Adapters                 │
│ local first → HTTP/server later      │
└──────────────────────────────────────┘
```

## 1. Generator layer

The map generator owns only spatial generation:

- seeded room scatter and separation;
- Delaunay candidate graph;
- minimum spanning tree plus loops;
- room semantics and difficulty depth;
- rasterized floors, walls, corridors, pools, and doorways;
- generated spawn and decoration markers.

It must not own character progression, permanent inventory, narrative state, prices, or account data.

## 2. Map-state boundary

`src/abrir/map-state.js` is the stability boundary between the generator and the game.

The exported state includes:

- `schemaVersion`;
- generator identity, version, seed, and parameters;
- dimensions and raster layers;
- rooms and graph edges;
- entrance and terminal room identifiers;
- generated markers;
- authored gameplay overlays.

Typed arrays are converted to ordinary JSON arrays so snapshots can be committed, diffed, validated, and served from any static host.

Breaking changes require a schema-version increment and migration notes. Gameplay code should never depend on undocumented fields from the raw generator object.

## 3. Content layer

Content remains data-driven wherever practical:

```text
content/
├── maps/
│   ├── abrir-mvp.config.json
│   └── generated/*.json
├── search-scenes/
├── characters/
├── enemies/
├── items/
└── encounters/
```

The current branch has only the content needed by the slice. Future directories should be introduced when their schemas are implemented, not as empty architecture theater.

## 4. Gameplay layer

The gameplay runtime consumes a saved map snapshot and reconstructs the playable space in Three.js.

Canonical responsibilities:

- player and partner movement;
- enemy behavior;
- attacks, abilities, damage, healing, stagger, and recovery;
- room entry and encounter activation;
- loot selection and recovered-value accounting;
- night pressure and interlacing;
- extraction and run resolution;
- presentation of story and moral consequences.

The real-time combat implementation is canonical. Any tactical/card implementation is an experiment behind a clear mode boundary until retained or removed by design decision.

## 5. Hidden-room layer

Hidden-room search uses a rendered room illustration plus normalized hitboxes. This keeps the image replaceable without rewriting the interaction logic.

Each target record should contain:

- stable item ID;
- display name;
- normalized `x`, `y`, `width`, and `height`;
- value and capacity cost;
- discoverability/hint data;
- moral classification;
- dialogue facts;
- effects emitted to the combat/run layer.

Search results should return a plain consequence object. The search scene should not directly mutate combat entities.

## 6. Asset layer

Runtime code refers to stable asset IDs and manifest paths. Character images, enemy art, room illustrations, sound effects, and music are replaceable files.

No gameplay rule should depend on pixel dimensions, filenames chosen ad hoc, or artwork being embedded directly into JavaScript.

## 7. Persistence layer

During static MVP testing:

- settings use browser storage;
- run results may use browser storage;
- canonical content ships as repository JSON;
- generated maps are committed snapshots.

Later server wiring should implement the same conceptual interfaces for:

- identity/session;
- save slot;
- inventory;
- run history;
- unlocks;
- economy;
- rotating content.

The server must not become the only way to boot the game during development.

## 8. Validation and CI

Every change should verify:

1. deterministic map generation;
2. map-state schema integrity;
3. authored search-scene integrity;
4. production build completion.

A later browser smoke test should load all three entry points and fail on uncaught exceptions or missing assets.

## 9. Deployment sequence

1. Build and validate entirely in GitHub.
2. Publish a static staging build for browser testing.
3. Stabilize the vertical slice and content contracts.
4. Deploy the static client to the user’s server.
5. Add backend services behind adapters.
6. Move persistence from local storage to server storage without changing core gameplay APIs.
