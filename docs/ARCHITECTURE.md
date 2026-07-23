# Architecture

## Current client

- **Three.js** renders rooms, corridors, portal geometry, characters, enemies, effects, lighting, and the interlaced layer.
- **Vite** serves and bundles the browser application.
- **Vanilla ES modules** keep the prototype inspectable and reduce framework overhead during combat and traversal work.
- **JSON map states** are the primary level input.
- **Local storage** temporarily records run outcomes behind a replaceable persistence boundary.

## Source layout

```text
src/
├── content/
│   ├── characters.js
│   ├── items.js
│   └── room-skins.js
├── core/
│   ├── dungeon-generator.js
│   └── rng.js
├── game/
│   ├── combat-system.js
│   ├── mission-system.js
│   ├── navigation.js
│   └── run-controller.js
├── render/
│   ├── entity-factory.js
│   ├── scene-factory.js
│   └── world-renderer.js
├── ui/
│   └── styles.css
└── main.js
```

## Simulation boundary

`RunController` owns the run lifecycle and coordinates the other systems. `CombatSystem` owns enemies, projectiles, damage, and attacks. `MissionSystem` owns room completion, recoverable objects, and extraction. Navigation is derived from rooms and serialized corridor paths.

`WorldRenderer` owns Three.js objects and presentation. It does not decide market value, room completion, damage, or extraction success.

## Generator boundary

`generateMapState()` is deterministic for a given seed label and settings. The game can load its output from `public/maps`, generate it in the browser, or generate it with the Node script.

## Backend direction

The first server deployment should add:

1. authentication;
2. signed run creation;
3. map-state storage;
4. run result submission;
5. inventory and object provenance;
6. rotating route/event definitions.

The client should receive the same map-state format already used by the static prototype.
