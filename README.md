# ABRIR

**ABRIR** is a browser-first, top-down action-looter built around deterministic Three.js spaces that behave like unstable servers, bureaucratic crime scenes, and impossible rooms.

The generated room graph is not a loading-screen trick. It is the serialized level contract used by gameplay, rendering, replay, export, testing, and eventually the backend. Every run combines two independently generated states that can physically overlap after the safe window closes.

## What is playable now

### Multiplayer deployment workflow

ABRIR supports two field ownership structures:

- **Two-player mode:** each player owns two of the four characters and swaps only between their assigned pair.
- **Four-player mode:** each player owns one character and ordinary character swapping is unavailable.

The deployment interface assigns all four field characters exactly once, selects a local player for browser testing, and serializes the ownership contract with the run.

Character identity and combat style are separate decisions. Any character can equip any current combat kit, duplicate kits are valid, and no equal melee/ranged split is enforced. The current local prototype validates the ownership and swapping rules; completed networking, remote-player replication, and reconnect behavior remain future work.

### Shared player-led interactions

Any eligible player may initiate dialogue, inspect or recover objects, negotiate, start or join a card battle, operate a shrine or system, propose a route decision, and request extraction. These activities are not reserved by character identity, combat kit, or player seat.

- Dialogue control can be offered to and accepted by another player.
- Consequential actions expose agree, oppose, and abstain responses.
- Tied decisions resolve through a visible deterministic d20 clash.
- Objects show Institute, network, and local-human readings before recovery.
- Shared card battles rotate turns across participating players.
- The activity log records participation, acting player, acting character, and resolved outcome.

The browser prototype can switch local perspective between players to exercise the workflow without claiming completed online replication.

### Two-page comic reader

ABRIR includes a framework-light port of the page-turn mechanics used by the Atlas project.

- Two portrait comic pages remain visible as one 17:11 spread.
- Page turns advance or retreat one full spread at a time.
- Previous and next controls, left/right arrow keys, and Escape are supported.
- A 3D page turn exposes the next spread while retaining a stable center seam.
- Page changes dispatch a `comicPageFlip` browser event.
- HTML pages and image pages use the same reader API.

Press `C` during a live run to open the current deterministic field-comic test. This imports only the page-spread mechanics—not Atlas's Compass, workbook, assessment, audio, bookshelf, or surrounding UI.

### Instituto Travessia headquarters

The prototype starts and returns at a persistent headquarters interface.

- Six route authorizations across the Lusophone setting, each with distinct room count, graph density, safe-window timing, risk, route payout, architecture profile, and assigned Chave Geral response.
- Persistent field rank, experience, scrip, run totals, remote-object totals, and major-process statistics.
- Object archive with appraisal, provenance, local/remote origin, condition, route identity, run seeds, and status.
- Deterministic Instituto Travessia retention rolls capped at fifteen percent of a filing.
- Stored-object sale and Institute-retention buyback.
- Permanent permissions that alter cooldowns, healing, interlace timing, remote-object value, seizure protection, remote-vault rewards, and Auditor exemptions.

### Generated world and tactical architecture

- Saved and browser-generated deterministic map states.
- Independent local and remote room graphs with different seeds.
- Computed cross-state overlap zones and temporary traversable bridges.
- Corridor-derived doorway openings rather than uninterrupted room walls.
- Segmented walls, doorway frames, room-role floor modules, and deterministic tactical obstacles.
- Route-specific procedural architecture profiles and temporary material palettes for all six current routes.
- A single room-layout contract consumed by both rendering and navigation, keeping visible props and movement collision synchronized.
- Working combat cover: player and hostile projectiles terminate against generated architecture.
- Enemy spawn correction and collision margins reduce the chance of processes appearing inside cover.
- A live minimap showing both graphs, critical paths, cleared rooms, player location, overlaps, and bridges.
- Runtime JSON export for the current generated state, route, deployment, and field contract.

The route palettes and procedural prop forms are implementation systems, not completed cultural environment art. Authored architecture, material research, signage, objects, sound, and environmental storytelling remain future location work.

### Four field characters

- **Zélia Amato**
- **Lia**
- **Chilindo**
- **Sócrates**

Afonso remains headquarters leadership and mission narrator.

Each character retains their own identity, color, physical modifiers, and field notes. Combat kits independently determine the primary attack, active ability, dodge profile, role, and combat family.

Current kits:

- Field Medic
- Breacher
- Route Controller
- Night Skirmisher

Any character may equip any kit. All-ranged, all-melee, repeated-kit, and uneven team compositions are valid.

### A Chave Geral major processes

Each route assigns one of four major enemy processes with a distinct objective and field consequence.

- **The Auditor** materializes inside the largest spatial contradiction and turns the overlap into a sustained ranged accounting battle.
- **The Seizure Chief** removes the highest-value object from the live manifest. The object returns only when the Chief is defeated; extracting early leaves it behind.
- **The Route Runner** teleports among overlap coordinates and temporary bridges, creating mobile firing lanes and accelerating map attention.
- **The Warden** occupies the return passage and suspends extraction until its lock process is destroyed.

The current procedural silhouettes are combat-readable placeholders, not final antagonist designs.

### Combat and pressure

- Ranged projectiles, melee area attacks, pierce, knockback, stagger, weakening, healing, damage resistance, phase movement, and local-character fallback.
- Pursuer and gunner enemy processes with melee and ranged behavior.
- Route-specific major encounters with separate health, movement, attacks, spawn conditions, and mission consequences.
- Tactical architecture that blocks movement and both friendly and hostile projectiles.
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
| Swap assigned character in 2P test | `Q` |
| Active ability | `R` |
| Dodge | `Space` |
| Interact / recover / shrine / extract | `E` |
| Open field comic | `C` |
| Turn comic spread | `←` / `→` |
| Close comic | `Escape` |
| Force interlace for testing | `I` |

## Run locally

```bash
npm install
npm run generate:map
npm run check:generation
npm run check:headquarters
npm run check:processes
npm run check:layout
npm run check:deployment
npm run check:activities
npm run check:shared-interactions
npm run check:comic-reader
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

The procedural generator emits two room graphs, graph depth, room roles, critical-path membership, corridors, difficulty, dressing seeds, extraction locations, overlap geometry, and temporary cross-state bridges. A shared layout pass derives wall openings, route-profile tactical obstacles, and collision bounds. Gameplay then derives contracts, deployment ownership, combat-kit resolution, hazards, enemy pressure, assigned major processes, shrine permissions, loot provenance, archive records, shared interactions, comic packets, and progression from those deterministic states.

The browser can load a committed state, generate a replacement, or export the state it is currently running. A future backend must store and distribute map contracts, player ownership, profiles, archives, inventories, and signed run results; it does not need to recreate the renderer.

```text
src/core/       seeded local/remote generation, room architecture, and map validation
src/content/    characters, combat kits, routes, interactions, comic packets, contracts, upgrades, items, room skins
src/game/       deployment, activity authority, comic spread state, combat, mission, hazards, director, archive, progression, navigation
src/render/     Three.js world, architecture, and entity construction
src/ui/         deployment, shared interactions, comic reader, tactical HUD, minimap, major-process states, and headquarters
public/maps/    committed reproducible map states
public/assets/  temporary UI marks and future authored assets
scripts/        generation, headquarters, process, layout, deployment, interaction, comic, and repository checks
```

See:

- [`docs/PLAYER_WORKFLOW.md`](docs/PLAYER_WORKFLOW.md)
- [`docs/PLAYER_WORKFLOW_BACKLOG.md`](docs/PLAYER_WORKFLOW_BACKLOG.md)
- [`docs/PLAYER_ACTIVITY_AUTHORITY.md`](docs/PLAYER_ACTIVITY_AUTHORITY.md)
- [`docs/COMIC_PAGE_FLIP.md`](docs/COMIC_PAGE_FLIP.md)
- [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
- [`docs/PLAYABLE_SLICE.md`](docs/PLAYABLE_SLICE.md)
- [`docs/MAP_STATE_CONTRACT.md`](docs/MAP_STATE_CONTRACT.md)
- [`docs/HEADQUARTERS_LOOP.md`](docs/HEADQUARTERS_LOOP.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`ASSET_MANIFEST.json`](ASSET_MANIFEST.json)

## Provenance

This project is being developed on top of the deterministic Three.js dungeon-generator repository already owned by the project. The original generator is MIT-licensed. ABRIR preserves the seeded, reproducible room-graph core while turning it into an action-looter with independent interlacing spaces, tactical architecture, rival institutional pressure, recoverable objects, persistent progression, route-specific antagonists, multiplayer character ownership, shared interactions, comic sequences, and a headquarters economy.
