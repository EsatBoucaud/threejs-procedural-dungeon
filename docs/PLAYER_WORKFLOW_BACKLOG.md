# Player Workflow Implementation Backlog

This backlog converts `PLAYER_WORKFLOW.md` into a sequence of player-facing implementation tasks. It exists in the repository because GitHub Issues are currently disabled for this project.

## Priority 0 — Correct the field contract

- [ ] Replace the current all-four-at-once run assumption with exactly two deployed operatives.
- [ ] Lock the active field roster to Zélia, Lia, Chilindo, and Sócrates.
- [ ] Keep Afonso in headquarters and mission narration only.
- [ ] Add a run-level `deployedOperativeIds` field containing exactly two IDs.
- [ ] Preserve health, position, cooldowns, and status per deployed operative.
- [ ] In solo play, swap direct control while the other operative becomes AI-controlled.
- [ ] In cooperative play, assign one operative to each player.

Acceptance test: a run cannot begin with fewer or more than two deployed operatives.

## Priority 1 — Headquarters to field

- [ ] Headquarters opens with one primary action: authorize a passage.
- [ ] Route choice precedes operative choice.
- [ ] Route preview shows safe window, expected Chave Geral response, reward profile, and one known uncertainty.
- [ ] Operative selection shows role, primary behavior, active ability, partner behavior, and pair friction/trust line.
- [ ] First run exposes only the intended melee/ranged tutorial pair while keeping the other two visible as assigned elsewhere.
- [ ] Loadout confirmation states carrying capacity, recovery allowance, extraction rule, and Institute retention before deployment.
- [ ] Afonso briefing is short and optional questions do not block deployment.

Acceptance test: an experienced player can move from launch to field control in under 90 seconds.

## Priority 2 — Solo partner play

- [ ] Follow command.
- [ ] Hold command.
- [ ] Focus-target command.
- [ ] Recover/revive command.
- [ ] Partner avoids known hazards.
- [ ] Partner uses nearby cover.
- [ ] Partner maintains role-appropriate distance.
- [ ] Partner does not make consequential object choices autonomously.
- [ ] Automatic control transfer when the active operative falls.

Acceptance test: the player can deliberately position the partner before entering a combat room and can recover from one operative falling.

## Priority 3 — First-room teaching sequence

- [ ] Portal-threshold movement teaching occurs in-engine.
- [ ] Stable first room contains no enemies.
- [ ] First room teaches interaction, room exits, map relationship, Afonso commentary, and object inspection.
- [ ] First combat room teaches attack, dodge, active ability, partner behavior, and real cover.
- [ ] Tutorial feedback reacts after successful player behavior instead of pausing combat.

Acceptance test: a new player reaches and clears the first combat room without reading an external controls list.

## Priority 4 — Object meaning and recovery

- [ ] Object panel shows Institute appraisal.
- [ ] Object panel shows network relevance to Celeste or A Chave Geral.
- [ ] Object panel shows local human meaning or claim.
- [ ] Actions: recover, inspect further, leave, mark for return.
- [ ] Every action is recorded in the run result.
- [ ] Carried objects remain visible as a limited-capacity manifest.

Acceptance test: the first recovered object is understandable as more than currency.

## Priority 5 — Safe-window choice

- [ ] Add an early warning before the final countdown.
- [ ] Keep the return route physically available during the warning.
- [ ] Early extraction counts as a successful run.
- [ ] Early extraction debrief records unresolved objectives without shaming the player.
- [ ] Staying late visibly opens the interlace branch.

Acceptance test: the player can intentionally complete a safe early run or intentionally stay for the interlace.

## Priority 6 — Interlace and antagonist consequence

- [ ] Interlace immediately creates one readable opportunity.
- [ ] Interlace immediately creates one readable danger.
- [ ] Remote rooms and objects are visually distinct without hiding combat information.
- [ ] First route introduces one major A Chave Geral process.
- [ ] The process demonstrates a mission consequence before functioning as a health-bar encounter.
- [ ] Extraction remains available unless the assigned process explicitly locks it.

Acceptance test: a new player can explain what changed after interlace and why the antagonist matters to the mission.

## Priority 7 — Debrief and redeployment

- [ ] Field result layer.
- [ ] Institute accounting layer.
- [ ] Object record layer.
- [ ] Narrative contradiction layer.
- [ ] First archive decision: sell, keep, dispute classification, or mark for return.
- [ ] Primary action after filing: authorize next passage.

Acceptance test: the player understands what happened, what the Institute claims happened, and what to do next.

## Do not expand before completion

Until the above workflow plays cleanly from beginning to end, do not prioritize:

- additional route names;
- additional major processes;
- more permanent currencies;
- larger procedural room counts;
- more upgrade tiers;
- backend synchronization;
- final art integration beyond what is needed to read the workflow.
