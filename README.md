# ABRIR

**ABRIR** is a browser-first, top-down action-looter built around deterministic Three.js spaces that behave like unstable servers, bureaucratic crime scenes, and impossible rooms.

The game is being built directly on top of a seeded procedural-room generator. The generated room graph is not a loading-screen trick: it is the serialized level contract used by gameplay, rendering, replay, export, and eventually the backend.

## What is playable now

### Generated world

- Saved and browser-generated deterministic map states.
- Three.js rooms, corridors, portals, props, lighting, critical routes, room semantics, and a second interlaced layer.
- A live minimap showing room roles, cleared rooms, critical connections, player location, and overlap markers.
- Runtime JSON export for the current generated state and field contract.

### Four-operative squad

- **Sócrates** — ranged striker / combat medic.
- **Zélia Amato** — high-health melee breacher.
- **Lia** — ranged route controller with piercing fire and spatial movement.
- **Kindred** — fast melee night skirmisher with phase movement.

Every operative has an individual health pool, primary attack, active ability, dodge profile, movement speed, and field trait. Final character models and authored art remain deliberately separate from the systems prototype.

### Combat and pressure

- Ranged projectiles, melee area attacks, pierce, knockback, stagger, weakening, healing, damage resistance, phase movement, and squad fallback.
- Pursuer and gunner enemy processes with melee and ranged behavior.
- Elite encounters and a major Chave Geral incursion: **The Auditor**.
- A threat director that escalates pressure based on elapsed time, recovered value, interlace status, and map attention.
- Deterministic environmental anomalies that damage and slow the squad.

### Run structure

- Combat, archive, treasure, shrine, elite, entrance, and vault rooms.
- Recoverable objects with names, rarity, and market values.
- Shrines that grant medical, timing, salvage, or cooldown permissions.
- Generated field contracts with multiple requirements, bonuses, risk multipliers, and emergency-extraction penalties.
- A safe window followed by a visible server interlace and hostile second layer.
- Extraction, Instituto Travessia's 15% retention, contract accounting, and final field payout.
- Persistent local rank, experience, field scrip, successful and failed run counts, recovered-object totals, and best payout.

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

The procedural generator emits rooms, graph depth, room roles, critical-path membership, corridors, difficulty, dressing seeds, extraction location, and a transformed interlace layer. Gameplay systems derive contracts, hazards, enemy pressure, shrine permissions, and progression from that deterministic state.

The browser can load a committed state, generate a replacement, or export the state it is currently running. A future backend only needs to store and distribute these contracts, player profiles, and run results; it does not need to recreate the renderer.

Key directories:

```text
src/core/       seeded generation and map validation
src/content/    operatives, contracts, items, and room skins
src/game/       combat, mission, hazards, director, progression, navigation
src/render/     Three.js world and entity construction
src/ui/         tactical HUD and minimap
public/maps/    committed reproducible map states
scripts/        generation and repository checks
```

See:

- [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
- [`docs/PLAYABLE_SLICE.md`](docs/PLAYABLE_SLICE.md)
- [`docs/MAP_STATE_CONTRACT.md`](docs/MAP_STATE_CONTRACT.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Provenance

This project is being developed on top of the deterministic Three.js dungeon-generator repository already owned by the project. The original generator is MIT-licensed. ABRIR preserves the seeded, reproducible room-graph core while turning it into an action-looter with unstable interlacing spaces, rival institutional pressure, recoverable objects, and persistent field progression.
