# Project State

## Current branch

`abrir/room-architecture-05`

## Working now

- Deterministic local and remote map generation, validation, committed states, browser generation, and JSON export.
- Independently seeded interlace graph with computed overlap zones and temporary traversable bridges.
- A shared deterministic room-layout pass consumed by both rendering and navigation.
- Corridor-derived wall openings, segmented walls, doorway frames, room-role floor modules, and tactical obstacle records.
- Six route-specific procedural architecture profiles and temporary local/remote material palettes.
- Movement collision matched to visible architecture in both generated states.
- Player and hostile projectiles blocked by generated cover.
- Enemy correction and variable collision margins reduce blocked process spawns.
- Three.js room, corridor, portal, prop, lighting, hazard, shrine, entity, projectile, bridge, overlap, and interlace rendering.
- Fixed action camera and live dual-state minimap.
- Four switchable playable kits: **Sócrates, Zélia, Lia, and Kindred**.
- Separate squad health pools, fallback control, active abilities, dodges, traits, healing, pierce, stagger, weakening, knockback, and phase movement.
- Pursuer, gunner, elite, local-vault, remote-vault, and interlaced hostile processes.
- Four route-specific A Chave Geral major encounters:
  - The Auditor materializes inside a major contradiction.
  - The Seizure Chief removes the highest-value object from the active manifest.
  - The Route Runner relocates through overlaps and bridges while raising map attention.
  - The Warden locks the return passage and blocks extraction.
- Distinct process health, speed, attacks, procedural silhouettes, spawn conditions, field effects, defeat consequences, and persistence statistics.
- A dynamic threat director that routes pressure through either generated graph.
- Local and remote room clearing, physical loot collection, named objects, rarity, condition, provenance, market values, and shrine permissions.
- Deterministic environmental anomalies with damage and movement penalties.
- Field contracts with local-room, remote-room, overlap, vault, remote-vault, value, object, interlace, and assigned-major-process requirements.
- Safe-window timer, independent interlace transition, second playable graph, cross-state routes, and testing trigger.
- Active field confiscation, extraction lockdown, mobile route interference, threshold seizure, contract accounting, route multipliers, and run history.
- Persistent Instituto Travessia headquarters as the primary startup and return loop.
- Six route authorizations with distinct graph, payout, architecture, and major-process assignments.
- Persistent profile migration, rank, experience, field scrip, all-process statistics, and permanent permissions.
- Persistent object archive with appraisal, storage, sale, deterministic retention, and buyback.
- Tactical HUD with squad state, cooldowns, contract progress, map attention, boss state, briefing, and debrief.
- Temporary original interface marks, procedural process silhouettes, and route architecture systems tracked in the asset manifest.
- Automated multi-seed generation, headquarters economy, route/process compatibility, room-layout, repository, and production-build checks in GitHub Actions.

## Deliberately temporary

- Primitive character, enemy, weapon, loot, and many prop forms remain in place until the final art pipeline lands.
- The four major-process silhouettes communicate mechanics and collision only; they are not antagonist concept art.
- Route palettes and procedural architecture profiles are implementation scaffolds, not finished cultural environment design.
- The headquarters is a functional interface rather than a final authored 3D location.
- Enemy navigation uses local steering and correction rather than graph-aware pathfinding.
- Doors are open architectural cuts; no dynamic seals, locked doors, or destructible states exist yet.
- Sound and music are not wired.
- Run results, profile, archive, and purchases use browser-local storage adapters.
- Gameplay balance, process timing, appraisal values, route rewards, cover density, and upgrade costs are first-pass.

## Immediate engineering risks

- Generated obstacle density requires hands-on testing for movement flow, sightlines, and room readability.
- Large process silhouettes may still need more robust spawn reservation around narrow remote rooms.
- Enemy navigation can crowd corridors and cover edges and needs graph-aware steering.
- Projectiles collide with cover rectangles, but there is no ricochet, penetration class, destructibility, or line-of-sight query yet.
- No automated browser-play test or deterministic combat replay test exists yet.
- No pause, settings, controller, mobile-control, or accessibility interface exists yet.
- Local storage has migration but no cloud synchronization, conflict resolution, or recovery export.
- Headquarters transactions need UI playtesting for readability and economic pacing.
- Route parameters and architecture profiles require hands-on evaluation to ensure they produce meaningfully different runs.
- All four major processes need full encounter tuning across early and late profile states.
