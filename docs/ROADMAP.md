# Roadmap

## Build 0.3 — Rooms become places

- Convert corridor intersections into actual wall openings and door states.
- Add authored room modules that skin generated dimensions without replacing the generated graph.
- Add local material kits, object pools, signage layers, weathering, and sound zones.
- Add destructible cover, collision-aware props, elevation changes, and room-specific combat affordances.
- Add room events that can alter, seal, duplicate, or reopen graph connections after generation.

## Build 0.4 — Interlace as the central system

- Generate the second server state independently rather than transforming the base state.
- Compute spatial intersections, temporary bridges, overwritten walls, and unstable shared rooms.
- Introduce rare rooms, objects, enemies, and routes that exist only during overlap.
- Add extraction instability, object loss, emergency rerouting, and split-state objectives.
- Give A Chave Geral processes goals other than direct combat: seizure, audit, route closure, and object substitution.

## Build 0.5 — Character depth

- Replace procedural stand-ins with the incoming final art for **Sócrates, Zélia, Lia, and Kindred**.
- Add animation state machines, hit reactions, expressive portraits, and character-specific effects.
- Add secondary abilities, ultimates, team synergies, revive actions, and lightweight partner AI.
- Add relationship scenes and run commentary without interrupting the action loop.
- Preserve Kindred's deliberately unspecified identity and background in all content systems.

## Build 0.6 — Economy and institution

- Add persistent inventory, provenance, appraisal disputes, and object condition.
- Expand Instituto Travessia retention, resale, buyback, storage, and contested ownership.
- Build the Instituto headquarters as a playable between-run space.
- Add mission selection, loadouts, field permits, risk insurance, and black-market route access.
- Add A Chave Geral offers that can alter contracts, payouts, access, and future map states.

## Build 0.7 — Testing and platform

- Add deterministic combat replay fixtures and automated browser-play smoke tests.
- Add controller support, remapping, accessibility settings, pause, and graphics options.
- Add performance budgets for room count, enemies, lights, particles, and interlaced geometry.
- Add save migration and local-profile recovery.
- Publish a stable static testing build for every merged gameplay PR.

## Build 0.8 — Networked backend

- Deploy map-state service, signed runs, inventory, profiles, and accounts.
- Add server-authoritative loot and result validation without making local development dependent on the server.
- Add route rotations, shared events, seeded daily contracts, and limited-time interlaces.
- Add telemetry for room flow, combat balance, extraction decisions, and run failure causes.
- Preserve offline/static map loading for development, archival builds, and emergency operation.
