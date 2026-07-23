# Roadmap

## Build 0.4 — Rooms become places

- Convert corridor intersections into actual wall openings, doors, seals, and breach states.
- Add authored room modules that skin generated dimensions without replacing the generated graph.
- Add route-specific material kits, object pools, signage layers, weathering, and sound zones.
- Add destructible cover, collision-aware props, elevation changes, and room-specific combat affordances.
- Add room events that alter, seal, duplicate, or reopen graph connections after generation.
- Give each current route a small authored environment kit before adding more route names.

## Build 0.5 — Combat depth and encounter logic

- Add secondary abilities, ultimates, team synergies, revive actions, and lightweight partner AI.
- Add graph-aware enemy steering, formations, flanking, retreat, and objective behavior.
- Add A Chave Geral process roles for seizure, route closure, object substitution, and remote-vault occupation.
- Add additional major processes: The Seizure Chief, The Route Runner, and The Warden.
- Add room-specific encounter templates and deterministic encounter replay fixtures.
- Tune The Auditor and pressure director across route risk and profile progression.

## Build 0.6 — Character and faction art integration

- Replace procedural stand-ins with incoming final art for **Sócrates, Zélia, Lia, and Kindred**.
- Add animation state machines, hit reactions, expressive portraits, and character-specific effects.
- Add final Instituto Travessia and A Chave Geral marks without using temporary UI vectors as positive character references.
- Add weapon, ability, loot, enemy-process, and environmental effect assets.
- Preserve Kindred's deliberately unspecified identity and background in all content systems.

## Build 0.7 — Headquarters expansion

- Turn the functional headquarters interface into an authored between-run space while preserving the current route, archive, and permissions APIs.
- Add loadouts, field permits, insurance selection, object display, appraisal disputes, and storage limits.
- Add route previews based on generated graph metrics before authorization.
- Add A Chave Geral offers that alter contracts, payouts, access, and future map states.
- Add staff dialogue, operative relationships, and post-run commentary without blocking repeated deployment.
- Add archive filtering, comparison, provenance search, bulk sale, and collection sets.

## Build 0.8 — Testing and platform

- Add automated browser-play smoke tests and deterministic combat replay tests.
- Add controller support, remapping, accessibility settings, pause, and graphics options.
- Add performance budgets for room count, enemies, lights, particles, bridges, and interlaced geometry.
- Add profile and archive export/import, recovery, and migration fixtures.
- Publish a stable static testing build for every merged gameplay pull request.
- Add release notes and build identifiers to the headquarters interface.

## Build 0.9 — Networked backend

- Deploy map-state service, signed runs, inventory, profiles, archives, and accounts.
- Add server-authoritative loot and result validation without making local development dependent on the server.
- Add route rotations, shared events, seeded daily contracts, and limited-time interlaces.
- Add cross-device profile and archive synchronization with conflict handling.
- Add telemetry for room flow, combat balance, extraction decisions, archive behavior, and failure causes.
- Preserve offline/static map loading for development, archival builds, and emergency operation.
