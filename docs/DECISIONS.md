# Implementation Decisions

## D-001 — GitHub remains the source of truth

All durable game state, documentation, schemas, temporary assets, and implementation decisions live in the repository. ChatGPT is the primary production interface, but repository history and pull requests remain the authoritative record.

## D-002 — Three.js is part of the playable MVP

The procedural Three.js system is not postponed to a map-production utility. The prototype consumes its serialized output directly and renders the playable space from that state.

## D-003 — The client stays framework-light

The current prototype uses Three.js, Vite, browser modules, HTML, and CSS rather than adding Phaser or React. The decision can be revisited when production tooling creates a concrete need.

## D-004 — Generated states are committed artifacts

At least one generated JSON map ships in the repository. This makes builds reproducible and allows gameplay testing without live generation or backend availability.

## D-005 — Data-driven generated runs

Rooms, corridors, route parameters, contracts, loot, permissions, and interlace geometry are represented as serializable data. Rendering and gameplay derive from those contracts rather than hard-coding a single level.

## D-006 — Independent interlace states

The interlaced world is generated from a separate deterministic seed. It is not a recolored or shifted copy of the local graph. Overlaps and bridges are computed after both states exist.

## D-007 — Headquarters before backend

The Instituto Travessia headquarters is implemented as an interface-first between-run loop. This establishes route selection, profile progression, object filing, appraisal, retention, sale, buyback, and permanent permissions before a final 3D headquarters or backend service is introduced.

## D-008 — Local storage behind explicit systems

Profile and archive persistence currently use browser local storage. Access is isolated inside progression and archive modules so these can later be replaced with API-backed repositories without rewriting combat, generation, or headquarters UI.

## D-009 — Primitive art is acceptable; incomplete loops are not

Character art, animation, and environmental assets can arrive later. Every implementation pass should still preserve a complete loop from authorization through combat, recovery, interlace, extraction, accounting, filing, and redeployment.

## D-010 — Final art remains separate

Procedural geometry and temporary vector interface marks are implementation stand-ins only. They are tracked in `ASSET_MANIFEST.json` and must not become positive reference material for final character, faction, or environment art.

## D-011 — Four active operatives

The current field roster is Sócrates, Zélia Amato, Lia, and Kindred. Caio Vilar is a retired name and must not return to active content.

## D-012 — Kindred remains unspecified

Kindred's identity and background remain deliberately unspecified. Systems and documentation should not fill in biography, nationality, gender identity, or origin without an explicit future decision.

## D-013 — Route names are not finished cultural representation

Current named routes provide gameplay parameter profiles and setting anchors. They do not yet represent finished cultural environment design. Each route requires authored architecture, objects, language, sound, material behavior, and environmental storytelling before being treated as a finished location.

## D-014 — Institute retention is deterministic

Each recovered object receives a deterministic fifteen-percent retention roll, with the number held capped at fifteen percent of the filing. This keeps runs reproducible and makes buyback behavior testable.

## D-015 — Merge aggressively but preserve checks

Large systems additions continue through scoped branches and pull requests. Pull requests may be merged rapidly after generation checks, headquarters/economy checks, repository validation, and production build all pass.
