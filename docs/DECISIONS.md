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

Rooms, corridors, route parameters, contracts, loot, permissions, deployment ownership, combat-kit assignments, field activities, and interlace geometry are represented as serializable data. Rendering and gameplay derive from those contracts rather than hard-coding a single level.

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

## D-011 — Four active field characters

The active field roster is Sócrates, Zélia Amato, Lia, and Chilindo. Caio Vilar and Kindred are retired names and must not return to active character content.

## D-012 — Afonso remains headquarters leadership

Afonso provides briefings, mission context, uncertainty, and Instituto Travessia's official framing. He is not a selectable field character.

## D-013 — Route names are not finished cultural representation

Current named routes provide gameplay parameter profiles and setting anchors. They do not yet represent finished cultural environment design. Each route requires authored architecture, objects, language, sound, material behavior, and environmental storytelling before being treated as a finished location.

## D-014 — Institute retention is deterministic

Each recovered object receives a deterministic fifteen-percent retention roll, with the number held capped at fifteen percent of the filing. This keeps runs reproducible and makes buyback behavior testable.

## D-015 — Merge aggressively but preserve checks

Large systems additions continue through scoped branches and pull requests. Pull requests may be merged rapidly after generation checks, headquarters/economy checks, process checks, room-layout checks, deployment checks, activity-authority checks, repository validation, and production build all pass.

## D-016 — Rendering and collision share one room-layout contract

Wall openings, tactical obstacle placement, movement collision, enemy correction, and projectile cover derive from `src/core/room-layout.js`. A rendered prop must not silently disagree with the collision system. Final authored meshes may replace the primitive forms, but they must preserve or explicitly migrate the shared layout records.

## D-017 — Corridor endpoints create physical openings

Every graph connection must create an opening in each connected room. Wall construction is segmented around those openings instead of drawing uninterrupted perimeter walls over visible corridors.

## D-018 — Current route palettes are implementation scaffolds

The six procedural route palettes and architecture profiles exist to test system divergence, readability, and combat flow. They are not final art direction, architectural research, or cultural representation for their named locations.

## D-019 — Generated architecture is working cover

Tactical obstacles block movement and both friendly and hostile projectiles. Future penetration, destruction, ricochet, and material-class systems must extend this contract rather than bypassing it with renderer-only effects.

## D-020 — ABRIR supports two-player and four-player ownership

In two-player mode, each player owns two of the four field characters and may swap only between that assigned pair. In four-player mode, each player owns one character and ordinary character swapping is unavailable. Ownership is serialized in the deployment contract and must remain stable through the run.

## D-021 — Character identity does not determine combat family

Character selection and combat-kit selection are separate decisions. Any character may equip any available kit. Duplicate kits and uneven melee/ranged compositions are valid. The game may communicate tradeoffs but must not enforce an equal role split.

## D-022 — Local prototype ownership is not finished networking

The current browser prototype can select a local player and resolve only that player's owned character or pair for local control. This validates assignment and swapping rules but does not claim completed two-player or four-player networking. Remote entities, replication, reconnect, and simultaneous control remain explicit implementation work.

## D-023 — No field activity belongs to a fixed role

Any eligible player may loot, inspect, talk, initiate card battles, negotiate, operate puzzles, activate systems, revive, propose route decisions, and request extraction. Character identity and combat kit may change available information, modifiers, animation, or consequences, but they do not reserve an activity for a designated specialist.

Restrictions must come from world state: proximity, incapacitation, disconnection, target claims, mission locks, prerequisites, or unresolved group consequences. They must not come from melee/ranged family, class labels, player seat, or an invisible responsibility assignment.

Consequential actions may require agreement, opposition, abstention, or a visible disagreement roll. That governs how the team resolves a choice; it does not govern which player is allowed to bring the choice forward.
