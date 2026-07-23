# Next Task — First Combat Room

## Goal

Turn the saved-map traversal runtime into the first playable ABRIR combat test without adding final character art.

## Scope

- Define one ranged placeholder kit and one melee placeholder kit as data.
- Spawn both operatives at the saved entrance room.
- Switch the controlled operative with a single input.
- Make the inactive operative follow while preserving distance and avoiding walls.
- Select the first reachable room with semantic type `combat` as the test encounter.
- Spawn a small deterministic enemy group from that room's saved spawn markers.
- Seal the room while enemies remain and reopen it after clearance.
- Display health, active character, and room-clear state.

## Acceptance criteria

- The same saved map JSON remains the only topology source.
- Both operatives can traverse corridors without crossing wall cells.
- Switching does not teleport or reset either operative.
- The inactive partner follows but does not block the active character.
- Entering the selected combat room begins the encounter once.
- Enemy defeat clears and permanently unlocks that room for the run.
- Reloading the page reproduces the same room, enemy positions, and encounter state reset.

## Excluded

- Final character art or animation.
- Full ability kits.
- Loot economy.
- Boss behavior.
- Online co-op.
