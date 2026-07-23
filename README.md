# ABRIR

**ABRIR** is a browser-first, top-down action-looter built around deterministic Three.js spaces that behave like unstable servers, bureaucratic crime scenes, and impossible rooms.

The generated room graph is not a loading-screen trick. It is the serialized level contract used by gameplay, rendering, replay, export, testing, and eventually the backend. Every run combines two independently generated states that can physically overlap after the safe window closes.

## What is playable now

### Instituto Travessia headquarters

The prototype starts and returns at a persistent headquarters interface.

- Six route authorizations across the Lusophone setting, each with distinct room count, graph density, safe-window timing, risk, route payout, and assigned Chave Geral response.
- Persistent field rank, experience, scrip, run totals, remote-object totals, and major-process statistics.
- Object archive with appraisal, provenance, local/remote origin, condition, route identity, run seeds, and status.
- Deterministic Instituto Travessia retention rolls capped at fifteen percent of a filing.
- Stored-object sale and Institute-retention buyback.
- Permanent permissions that alter cooldowns, healing, interlace timing, remote-object value, seizure protection, remote-vault rewards, and Auditor exemptions.

### Generated world

- Saved and browser-generated deterministic map states.
- Independent local and remote room graphs with different seeds.
- Computed cross-state overlap zones and temporary traversable bridges.
- Three.js rooms, corridors, portals, props, lighting, critical routes, room semantics, hazards, and remote-state geometry.
- A live minimap showing both graphs, critical paths, cleared rooms, player location, overlaps, and bridges.
- Runtime JSON export for the current generated state, route, and field contract.

### Four-operative squad

- **Sócrates** — ranged striker / combat medic.
- **Zélia Amato** — high-health melee breacher.
- **Lia** — ranged route controller with piercing fire and spatial movement.
- **Kindred** — fast melee night skirmisher with phase movement.

Every operative has an individual health pool, primary attack, active ability, dodge profile, movement speed, and field trait. Final character models and authored art remain deliberately separate from the systems prototype.

### A Chave Geral major processes

Each route assigns one of four major enemy processes with a distinct objective and field consequence.

- **The Auditor** materializes inside the largest spatial contradiction and turns the overlap into a sustained ranged accounting battle.
- **The Seizure Chief** removes the highest-value object from the live manifest. The object returns only when the Chief is defeated; extracting early leaves it behind.
- **The Route Runner** teleports among overlap coordinates and temporary bridges, creating mobile firing lanes and accelerating map attention.
- **The Warden** occupies the return passage and suspends extraction until its lock process is destroyed.

The current procedural silhouettes are combat-readable placeholders, not final antagonist designs.

### Combat and pressure

- Ranged projectiles, melee area attacks, pierce, knockback, stagger, weakening, healing, damage resistance, phase movement, and squad fallback.
- Pursuer and gunner enemy processes with melee and ranged behavior.
- Route-specific major encounters with separate health, movement, attacks, spawn conditions, and mission consequences.
- A threat director that escalates pressure based on elapsed time, recovered value, interlace status, remote recovery, and map attention.
- Dynamic hostile waves routed through either generated graph.
- Deterministic environmental anomalies that damage and slow the squad.

### Run structure

- Combat, archive, treasure, shrine, elite, entrance, breach, and vault rooms.
- Local and interlace-only recoverable objects with names, rarity, condition, provenance, and market value.
- Shrines that grant medical, timing, salvage, remote-value, or cooldown permissions.
- Generated field contracts with local-room, remote-room, overlap, vault, remote-vault, object, value, interlace, and assigned-process requirements.
- A safe window followed by an independently generated server interlace.
- Active confiscation, extraction lockdown, mobile route interference, and threshold seizure consequences.
- Contract accounting, route multipliers, Institute retention, persistent filing, and final field payout.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` |
| Aim | Mouse |
| Attack | Left click |
| Switch operative | `Q` |
| Active ability | `R` |
| Dodge | `Space` |
| Interact / recover / shrine / extract | `E` |
| Force interlace for testing | `I` |

## Run locally

```bash
npm install
npm run generate:map
npm run check:generation
npm run check:headquarters
npm run check:processes
npm run check
npm run dev
```

Create another deterministic state:

```bash
npm run generate:map -- ABRIR-PORTO-004 public/maps/porto-004.json
```

Create a production build:

```bash
npm run build
npm run preview
```

## Current architecture

The procedural generator emits two room graphs, graph depth, room roles, critical-path membership, corridors, difficulty, dressing seeds, extraction locations, overlap geometry, and temporary cross-state bridges. Gameplay derives contracts, hazards, enemy pressure, assigned major processes, shrine permissions, loot provenance, archive records, and progression from those deterministic states.

The browser can load a committed state, generate a replacement, or export the state it is currently running. A future backend only needs to store and distribute map contracts, profiles, archives, inventories, and signed run results; it does not need to recreate the renderer.

```text
src/core/       seeded local/remote generation and map validation
src/content/    operatives, routes, Chave processes, contracts, upgrades, items, room skins
src/game/       combat, mission, hazards, director, archive, progression, navigation
src/render/     Three.js world and entity construction
src/ui/         tactical HUD, minimap, major-process states, and headquarters
public/maps/    committed reproducible map states
public/assets/  temporary UI marks and future authored assets
scripts/        generation, headquarters, process, and repository checks
```

See:

- [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
- [`docs/PLAYABLE_SLICE.md`](docs/PLAYABLE_SLICE.md)
- [`docs/MAP_STATE_CONTRACT.md`](docs/MAP_STATE_CONTRACT.md)
- [`docs/HEADQUARTERS_LOOP.md`](docs/HEADQUARTERS_LOOP.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`ASSET_MANIFEST.json`](ASSET_MANIFEST.json)

## Provenance

This project is being developed on top of the deterministic Three.js dungeon-generator repository already owned by the project. The original generator is MIT-licensed. ABRIR preserves the seeded, reproducible room-graph core while turning it into an action-looter with independent interlacing spaces, rival institutional pressure, recoverable objects, persistent progression, route-specific antagonists, and a headquarters economy.
