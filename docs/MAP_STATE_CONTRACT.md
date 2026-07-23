# Map State Contract

The procedural Three.js system produces a saved state. Rendering is downstream of that state.

## Required top-level fields

```json
{
  "schemaVersion": 1,
  "generator": "abrir-threejs-state-v1",
  "seedLabel": "ABRIR-001",
  "seed": 3537271274,
  "settings": {
    "roomCount": 20,
    "loopChance": 0.3
  },
  "rooms": [],
  "connections": [],
  "entranceRoomId": 4,
  "vaultRoomId": 17,
  "interlaceAtSeconds": 90,
  "interlace": {}
}
```

## Room fields

Each room stores:

- stable identifier;
- center position on the X/Z plane;
- dimensions and ceiling height;
- rough shape classification;
- semantic role;
- graph depth and normalized difficulty;
- graph degree;
- whether it belongs to the critical path;
- deterministic dressing seed.

## Connection fields

Each connection stores:

- endpoint room identifiers;
- edge length;
- whether it is an optional loop;
- whether it lies on the critical route;
- a three-point corridor path and corridor width.

## Interlace fields

The first version stores a transformed subset of the base rooms. This makes the second state visibly related to the first while still producing route collisions and new spaces. Later versions can point to an entirely independent saved state.

## Why this is the backend boundary

A future service can issue a seed, accept generator settings, store the resulting JSON, sign it, associate it with a run, and return it to the client. The gameplay renderer and simulation do not need to know whether the state came from a static file, local generation, a database, or a scheduled event.
