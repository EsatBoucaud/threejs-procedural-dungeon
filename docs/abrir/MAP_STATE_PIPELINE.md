# ABRIR Map-State Pipeline

## Principle

Three.js owns procedural map generation and visualization. The gameplay runtime consumes a saved, versioned map state.

The first MVP does not need to regenerate rooms during active play. It needs a reliable provenance chain showing that every playable map came from the Three.js generator.

## Pipeline

```text
seed + generator parameters
        ↓
Three.js procedural generator
        ↓
raw dungeon object
        ↓
ABRIR map-state serializer
        ↓
versioned JSON snapshot
        ↓
gameplay loader
        ↓
combat, loot, interlacing, extraction
```

## Saved state responsibilities

A generated map JSON should preserve:

- schema version;
- generator name and version;
- original seed;
- original generator parameters;
- generated map name;
- width and height;
- semantic room records;
- room graph edges;
- entrance and boss room IDs;
- tile layers needed for collision and navigation;
- doorways and corridor membership;
- prop and enemy-spawn markers;
- generation statistics;
- an ABRIR gameplay overlay for authored encounters and interlacing state.

## Representation rules

Typed arrays from the generator are converted to ordinary arrays before JSON serialization.

The gameplay runtime must not infer room identity solely from visual geometry. Room IDs and semantic roles are authoritative.

Generated data and authored gameplay data remain separate:

```json
{
  "generated": {
    "seed": 12345,
    "rooms": [],
    "edges": [],
    "layers": {}
  },
  "gameplay": {
    "encounterOverrides": {},
    "lootTables": {},
    "interlacing": {}
  }
}
```

## MVP export workflow

1. Run the existing Three.js showcase.
2. Choose seed, room count, loopiness, theme, and decor density.
3. Forge the map.
4. Export the current dungeon through `createMapState()`.
5. Download the JSON.
6. Commit it under `content/maps/generated/`.
7. Run `npm run validate:maps`.
8. Load that file in the ABRIR gameplay scene.

## Long-term options

The same format can later support:

- server-side seed generation;
- rotating daily maps;
- curated map libraries;
- version migrations;
- map hashes and anti-tamper checks;
- server-authored gameplay overlays applied to stable generated geometry.
