# ABRIR

**ABRIR** is a browser-first, top-down action-looter built around deterministic Three.js spaces that behave like unstable servers, bureaucratic crime scenes, and impossible rooms.

This branch is the first playable systems prototype. It does not wait for the full character-art pipeline: the player, enemies, rooms, loot, portal, lighting, HUD, and interlace event all render from primitives so the game loop can be tested immediately.

## What is playable now

- A saved deterministic map state generated from a seed.
- Three.js room, corridor, portal, prop, and lighting construction.
- Two switchable Instituto Travessia operatives:
  - **Caio Vilar** — ranged striker / combat medic.
  - **Zélia Amato** — high-health melee breacher.
- Movement, aiming, ranged projectiles, melee area attacks, enemy pursuit, health, partner fallback, and defeat.
- Room semantics: entrance, combat, archive, treasure, shrine, elite, and vault.
- Recovered objects with names, rarity, and market values.
- A 90-second safe window followed by a visible server interlace and a second hostile layer.
- Extraction, the Institute's 15% retention, payout calculation, and local run history.
- Runtime JSON export for any generated map.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` |
| Aim | Mouse |
| Attack | Left click |
| Switch operative | `Q` |
| Interact / recover / extract | `E` |
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

## Current architecture

The procedural generator is not a decorative loading screen. Its serialized output is the level contract consumed by the game. A map state contains rooms, graph depth, room roles, critical-path membership, corridors, difficulty, dressing seeds, extraction location, and the future interlace layer.

The browser can load a committed map state, generate a replacement from the same system, or export the state it is currently running. Backend deployment later only needs to store and distribute this contract; it does not need to recreate the renderer.

See:

- [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
- [`docs/PLAYABLE_SLICE.md`](docs/PLAYABLE_SLICE.md)
- [`docs/MAP_STATE_CONTRACT.md`](docs/MAP_STATE_CONTRACT.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Provenance

This prototype is being developed on top of the deterministic Three.js dungeon-generator repository already owned by the project. The original generator is MIT-licensed. ABRIR preserves the central premise—seeded, reproducible room graphs—but turns the result into an actual game-state contract and playable run.
