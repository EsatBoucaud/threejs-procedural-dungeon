# Decisions

## 2026-07-23 — Three.js is part of the playable MVP

The procedural Three.js system is not postponed to a map-production utility. The prototype consumes its serialized output directly and renders the playable space from that state.

## 2026-07-23 — Generated states are committed artifacts

At least one generated JSON map ships in the repository. This makes builds reproducible and allows gameplay testing without live generation or backend availability.

## 2026-07-23 — Primitive art is acceptable; incomplete loops are not

Character art, animation, and environmental assets can arrive later. The first implementation must still contain combat, recovery, interlace, extraction, and payout as one complete loop.

## 2026-07-23 — The client stays framework-light

The current prototype uses Three.js and browser modules rather than adding Phaser or React. The decision can be revisited when UI or production tooling creates a concrete need.
