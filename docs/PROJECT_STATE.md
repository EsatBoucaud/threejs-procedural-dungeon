# Project State

## Current branch

`abrir/game-prototype`

## Working now

- Deterministic map generation and validation.
- Committed generated map state.
- Three.js room and corridor construction.
- Fixed top-down action camera.
- Two switchable playable kits.
- Ranged and melee combat.
- Standard, elite, vault, and interlaced enemies.
- Room clearing and physical loot collection.
- Safe-window timer and forced test trigger.
- Interlaced visual layer and enemy reinforcement.
- Extraction, 15% Institute retention, and local result history.
- Runtime map export.
- Automated project/map validation.
- GitHub Actions build/check workflow.

## Deliberately temporary

- Primitive character and prop geometry.
- Approximate room collision.
- Enemy navigation uses direct pursuit instead of graph/navmesh steering.
- Sound is not yet wired.
- Run results use local storage.
- The interlace uses a transformed subset of the base state rather than a separately generated remote state.

## Immediate engineering risks

- Wall visuals and navigable openings are not yet derived from corridor cuts.
- Enemy pursuit can crowd narrow corridors.
- No pause or settings interface.
- No automated browser-play test yet.
- Mobile controls are not implemented.
