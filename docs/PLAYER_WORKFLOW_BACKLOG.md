# Player Workflow Implementation Backlog

This backlog tracks the player-facing workflow because GitHub Issues are currently disabled for the repository.

## Priority 0 — Multiplayer ownership contract

- [x] Support two-player deployment with two characters assigned to each player.
- [x] Support four-player deployment with one character assigned to each player.
- [x] Require all four field characters to be assigned exactly once.
- [x] Lock the active field roster to Zélia, Lia, Chilindo, and Sócrates.
- [x] Keep Afonso in headquarters and mission narration only.
- [x] Serialize player mode, local player, ownership, and kit assignments in the run state.
- [x] Limit the current local runtime roster to the characters owned by the selected local player.
- [x] Make `Q` swap between the local player's assigned pair in two-player testing.
- [x] Disable ordinary swapping for a one-character four-player local assignment.
- [ ] Add actual remote-player entities and network ownership replication.
- [ ] Preserve each simultaneously present character's independent world position.
- [ ] Add reconnect and temporary AI takeover behavior.

Acceptance test: the deployment validator accepts exactly two characters per player in 2P and exactly one per player in 4P.

## Priority 1 — Character identity versus combat kit

- [x] Separate the four character identities from combat-kit definitions.
- [x] Allow any character to equip any current combat kit.
- [x] Allow duplicate combat kits.
- [x] Remove mandatory melee/ranged balance from validation.
- [x] Show the chosen combat family and kit in deployment.
- [x] Keep character color, name, physical modifiers, and field notes independent from the chosen kit.
- [ ] Add explicit kit tradeoffs to the deployment cards.
- [ ] Add more combat kits without tying them to new characters.
- [ ] Add character-specific passive choices that do not override player-selected combat style.

Acceptance test: an all-ranged or all-melee four-character composition passes validation and reaches the passage confirmation state.

## Priority 2 — Headquarters to field

- [x] Route choice precedes multiplayer deployment.
- [x] Add a deployment screen with player-mode selection.
- [x] Group character slots by player ownership.
- [x] Add a local-player test view selector.
- [x] Show composition without grading it.
- [ ] Add party-ready state and confirmation from every connected player.
- [ ] Add Afonso's concise route-specific briefing after ownership and kits are locked.
- [ ] Add object capacity, recovery allowance, extraction rule, and retention to final confirmation.
- [ ] Target launch-to-field time below 90 seconds for returning players.

## Priority 3 — Two-player swap implementation

- [x] Local prototype only cycles through characters assigned to the local player.
- [x] Character health and cooldown arrays remain attached to the resolved local characters.
- [ ] Maintain both of a player's characters as independent run entities rather than one shared player transform.
- [ ] Define whether the reserve character is present, following, temporarily withdrawn, or swapped through the passage system.
- [ ] Add swap anticipation, transition effect, invulnerability rules, and cooldown.
- [ ] Add incapacitated-reserve restrictions.
- [ ] Add simultaneous swap handling for both players.
- [ ] Add controller and keyboard bindings for Player 1 and Player 2 local testing.

## Priority 4 — Four-player runtime

- [ ] Spawn one directly controlled entity per connected player.
- [ ] Replicate movement, aim, attack, ability, dodge, health, and status.
- [ ] Add teammate markers and ownership-safe HUD.
- [ ] Add revive and recovery states.
- [ ] Add disconnect grace period and AI takeover.
- [ ] Restore ownership cleanly after reconnection.
- [ ] Ensure no player can ordinary-swap into another player's character.

## Priority 5 — First-room teaching sequence

- [ ] Portal-threshold movement teaching occurs in-engine.
- [ ] First stable room teaches exits, map relationship, interaction, and inspection.
- [ ] First combat room teaches attacks, abilities, dodge, teammate reading, and real cover.
- [ ] Two-player tutorial teaches ownership-scoped swapping.
- [ ] Four-player tutorial teaches teammate identification without implying character swapping.
- [ ] Tutorial feedback reacts after successful actions instead of pausing combat.

## Priority 6 — Object meaning and collective decisions

- [x] Object panel shows Institute appraisal.
- [x] Object panel shows network relevance to Celeste or A Chave Geral.
- [x] Object panel shows local human meaning or claim.
- [x] Actions include recover, inspect, leave, mark for return, and contest classification.
- [x] Ordinary collection does not require a vote.
- [x] Consequential object choices can trigger agree, oppose, or abstain responses.
- [x] Unresolved disagreement can use a visible, modified die roll.
- [x] Record the disagreement, initiator, votes, roll, and outcome in activity history.
- [ ] Add later character and relationship reactions to recorded object decisions.

## Priority 7 — Safe-window and interlace choice

- [x] Add an early warning before the final countdown.
- [x] Keep the return route physically available while the team decides.
- [x] Early extraction counts as a successful run.
- [x] Staying late visibly opens the interlace branch and records the choice as stayed.
- [x] Interlace immediately creates one readable opportunity and one readable danger.
- [x] Mark the forecast opportunity and danger on the interlaced minimap.
- [x] Route an immediate hostile vanguard through the forecast danger coordinate.
- [ ] Keep kit composition and teammate status readable during the interlace visual disruption.

## Priority 8 — Debrief and redeployment

- [x] Basic field-result layer.
- [x] Basic Institute-accounting layer.
- [x] Basic object-record layer through the archive.
- [x] Record whether the team returned during the safe window or stayed for interlace.
- [ ] Narrative-contradiction layer.
- [ ] First archive decision: sell, keep, dispute, or mark for return.
- [ ] Primary action after filing: authorize another passage.

## Collectible backstory comics — later progression layer

- [x] Reusable two-page image reader and page-turn mechanic.
- [ ] Define comic series tied to character origins and progression arcs.
- [ ] Drop collectible page fragments through gameplay rewards.
- [ ] Track recovered indices and duplicate handling.
- [ ] Unlock a complete authored image comic when its page requirement is met.
- [ ] Place unlocked comics in the headquarters archive.

The comic reader should not interrupt ordinary dialogue, object decisions, combat, or run consequences.

## Current implementation boundary

The current build implements deployment ownership, unrestricted kit composition, shared player-led interactions, object interpretation and voting, and the safe-window return-versus-interlace choice. It still simulates one locally controlled entity and does not yet provide networked two-player or four-player field presence.

## Do not expand before completion

Until ownership, swapping, four-player runtime, and the first-run workflow play cleanly, do not prioritize:

- additional route names;
- additional major processes;
- more permanent currencies;
- larger procedural room counts;
- more upgrade tiers;
- final backend synchronization beyond what multiplayer ownership requires.
