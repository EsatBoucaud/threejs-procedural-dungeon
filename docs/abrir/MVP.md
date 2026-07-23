# ABRIR MVP — The Interlaced Room

## Purpose

The MVP must test the distinctive ABRIR loop rather than merely prove that characters can move and attack.

A successful build demonstrates that a seeded Three.js map can become a playable saved level, that two contrasting character kits can navigate it, and that remaining after nightfall changes the level state and reward pressure.

## Target session

One complete run should take approximately 8–12 minutes.

1. Start at Instituto Travessia.
2. Select a two-person field team.
3. Enter a portal into a saved procedurally generated map.
4. Clear and loot several connected rooms.
5. Reach the first extraction opportunity.
6. Choose whether to leave or stay after the night threshold.
7. Staying triggers server interlacing: altered room state, harder enemies, and rarer loot.
8. Extract successfully or lose part of the haul.
9. Return to a compact results and inventory screen.

## Included

- One ranged operative.
- One melee operative.
- Instant player-controlled character switching.
- Basic partner follow and survival behavior for the inactive character.
- One saved generated map containing entrance, combat, elite, treasure, shrine, and boss-capable room semantics.
- Two standard enemy behaviors and one elite behavior.
- Loot pickup, carried value, extraction, and partial-loss rules.
- A visible night/interlacing meter.
- One interlacing transformation pass.
- Minimal title, run setup, HUD, pause, and result screens.

## Excluded from the first slice

- Online cooperative play.
- All four playable characters.
- Every Lusophone location.
- A complete campaign narrative.
- Full economy balancing.
- Live server-generated rooms.
- Endless procedural runs.
- Final art for every object or animation.

## Acceptance criteria

The MVP is complete when a player can:

- launch the game in a browser;
- load a map JSON that records its original Three.js seed and parameters;
- traverse the generated room and corridor topology;
- switch between one ranged and one melee kit;
- fight, collect loot, and reach extraction;
- remain past the safe threshold and see a meaningful interlacing change;
- finish the run and receive a deterministic result summary;
- restart the same map state without topology drift.
