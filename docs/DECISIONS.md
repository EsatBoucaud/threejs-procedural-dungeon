# ABRIR Decision Log

This file records decisions that change the project’s implementation or scope. New entries should state the decision, why it was made, and what remains reversible.

## 2026-07-23 — Build on the existing Three.js generator

**Decision:** The ABRIR MVP will be built directly on the deterministic `threejs-procedural-dungeon` project rather than recreating map generation elsewhere.

**Reason:** The generator is not decorative concept work; it is the source of the room graph and must be tested as part of the game pipeline.

**Implementation:** Work currently lives on the `abrir-mvp` branch. The generator produces committed JSON snapshots consumed by the gameplay runtime.

**Reversible:** The branch can later be moved into or renamed as a dedicated ABRIR repository without changing the map-state contract.

## 2026-07-23 — Generate maps ahead of play

**Decision:** Live procedural generation is not required for the first playable slice.

**Reason:** A saved snapshot gives stable room IDs, reliable testing, reproducible bug reports, and authored encounter placement while preserving deterministic generation.

**Implementation:** `npm run generate:map` generates the canonical state in `content/maps/generated/`.

**Reversible:** Live generation can be added later by calling the same generator and map-state conversion in the browser or on the server.

## 2026-07-23 — Browser-first, backend-later

**Decision:** The MVP must boot, generate, validate, and play without a backend.

**Reason:** The project is being assembled through ChatGPT and GitHub before deployment to the user’s server. Requiring server infrastructure too early would slow iteration and make failures harder to isolate.

**Implementation:** Static JSON and browser-local persistence are used initially. Future persistence must sit behind adapters.

## 2026-07-23 — Real-time combat is canonical

**Decision:** The Overwatch-like, kit-driven real-time action direction remains the primary combat model.

**Reason:** It matches the established character-role concept and the intended looter-action loop.

**Implementation:** The current tactical/card encounter is retained only as an experiment. It should not silently redefine the whole game.

**Open question:** Keep it as a rare room type, convert it into a command phase, or remove it after testing.

## 2026-07-23 — Individual character art arrives later

**Decision:** Do not embed the roster board or invent final character art in the repository.

**Reason:** The user will provide individual character images. Placeholder art should remain obviously replaceable and should not create accidental visual canon.

**Implementation:** Character asset slots and naming rules are documented in `docs/ASSET_HANDOFF.md`.
