# ABRIR

ABRIR is a browser-first action-looter prototype about operatives entering unstable generated rooms, fighting through local resistance, recovering objects that are supposedly “not real,” and deciding whether to extract safely or remain after night as other servers begin to interlace.

This working branch is built directly on the existing deterministic Three.js procedural-dungeon project so the map generator is part of the MVP rather than a disconnected concept demo.

## Current playable surfaces

| Route | Purpose |
| --- | --- |
| `index.html` | **ABRIR Map Forge.** Generate and inspect deterministic Three.js room graphs. |
| `game.html` | **Saved-map gameplay test.** Loads a generated JSON state into an exploratory combat/extraction runtime. |
| `search.html` | **Hidden-room search test.** Uses authored image hitboxes for object recovery, moral choices, and synchronized consequences. |

The visual character art is intentionally placeholder-only. Final individual character assets will be supplied separately and wired through the asset manifest.

## The MVP contract

The generator does not need to run live during every play session. Instead, it produces a deterministic, versioned map snapshot:

```text
Three.js Map Forge
        ↓
content/maps/generated/*.json
        ↓
ABRIR gameplay runtime
        ↓
combat · loot · interlacing · extraction
```

A seed and parameter set can always rebuild the same map. The saved state contains the room graph, semantic room roles, rasterized navigation layers, spawn markers, decoration markers, and authored ABRIR encounter overlays.

## Quick start

Requires a current Node.js release compatible with Vite 8.

```bash
npm install
npm run generate:map
npm run dev
```

Then open:

- `http://localhost:5173/` for the map forge
- `http://localhost:5173/game.html` for the saved-map gameplay test
- `http://localhost:5173/search.html` for the hidden-room search test

## Verification

```bash
npm run check
```

That command:

1. regenerates the canonical MVP map from the Three.js generator;
2. validates generated map-state contracts;
3. validates hidden-room search-scene data;
4. builds the production bundle.

## Current vertical slice

The first slice is deliberately narrow:

- one deterministic generated floor;
- Sócrates and Zélia as the initial field pair;
- an exploratory real-time skirmish room;
- a second tactical encounter experiment;
- a hidden-room object-recovery scene;
- night-pressure/interlacing state;
- extraction versus staying late;
- a basic recovered-value ledger with the Instituto Travessia retention cut.

This is not yet the full game. Online co-op, all four protagonists, final enemy kits, final art, persistent accounts, server-backed inventory, and the broader Lusophone location set remain outside the present slice.

## Repository structure

```text
.
├── index.html                       # Three.js map forge
├── game.html                        # saved-map gameplay runtime
├── search.html                      # hidden-room object search
├── content/
│   ├── maps/                        # generator config + committed snapshots
│   └── search-scenes/               # hitboxes, targets, consequences
├── docs/                            # source-of-truth project documentation
├── scripts/                         # generation and validation scripts
├── src/
│   ├── abrir/                       # stable map-state boundary
│   ├── game/                        # gameplay runtime
│   ├── search/                      # hidden-room runtime
│   └── main.js                      # original generator + Three.js showcase
└── public/assets/                   # replaceable art/audio asset slots
```

## Important project rules

- GitHub is the source of truth; decisions belong in `docs/DECISIONS.md`.
- Generated map snapshots are committed so gameplay tests remain reproducible.
- Runtime systems consume the versioned JSON contract, not private generator internals.
- Final character art is added as replaceable assets rather than embedded into gameplay code.
- The backend will be wired only after the browser slice is stable; persistence must remain behind adapters.

## Upstream foundation

The procedural generator began from **Dungeon Forge**, an MIT-licensed deterministic Three.js generator by Majid Manzarpour. ABRIR retains that license and attribution while adapting the generator into its own map-state and gameplay pipeline. See `LICENSE` and the original project history for details.
