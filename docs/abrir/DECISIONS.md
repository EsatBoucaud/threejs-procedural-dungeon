# ABRIR Decisions

## 2026-07-23 — Combat mode belongs to the room

ABRIR will retain both combat prototypes.

- Some rooms use real-time action combat.
- Some rooms use turn-based card combat.
- Exploration, current health, party state, interlacing pressure, recovered value, and extraction remain shared across both modes.
- The saved map gameplay overlay will eventually declare each room's encounter mode explicitly.

The first MVP map currently assigns:

- a shallow generated combat room to the real-time skirmish;
- a deeper elite-capable room to card combat;
- the generated entrance to extraction.

This replaces the incorrect assumption that card combat would supersede real-time combat.
