# Playable Slice — The Interlaced Room

The current prototype aims at a complete compressed run rather than a movement sandbox.

## Run structure

1. The field team receives a short mission briefing.
2. A committed deterministic map state is loaded.
3. The team enters at the Instituto Travessia passage.
4. Rooms activate by proximity and contain enemies according to semantic role.
5. Cleared rooms release recoverable objects.
6. Objects must be physically collected.
7. The safe window expires after ninety seconds.
8. A second generated layer becomes visible and traversable.
9. Interlaced enemies enter from the second state.
10. The team returns to the entrance and extracts.
11. The run closes with recovered value, Institute retention, and field payout.

## Implemented kits

### Caio Vilar

- Fast movement.
- Repeating ranged projectile.
- Every third successful hit restores a small amount of health.
- Lower maximum health.

### Zélia Amato

- Slower movement.
- Large radial melee strike.
- Higher maximum health.
- Melee eliminations create a short damage-resistance window.

The current characters are represented by procedural stand-ins so kit tuning is not blocked by art delivery.

## Implemented room roles

- **Entrance:** extraction and return point.
- **Combat:** standard hostile room.
- **Archive:** object- and evidence-oriented room with distinct dressing.
- **Treasure:** leaf-node reward room.
- **Shrine:** quiet room used as route punctuation.
- **Elite:** difficult critical-path combat room.
- **Vault:** furthest room and current run climax.

## Success criteria for this slice

The slice succeeds when a player can understand the route, switch characters for a reason, recover at least one memorable object, witness an interlace, and return to extraction without developer explanation.
