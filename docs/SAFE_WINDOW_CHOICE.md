# Safe-Window Choice

Status: implemented player-facing prototype

## Core rule

The interlace is not merely a timer penalty. It is the run's central risk decision.

Before the countdown reaches zero, the team can return to the entrance and request extraction. That closes the run successfully with the objects and consequences already carried. Remaining in the field past zero records the team's decision as `stayed` and opens the independently generated remote state.

## Warning sequence

The route derives two deterministic thresholds from its safe-window duration:

1. **Warning phase:** Afonso identifies the return option, the strongest readable remote opportunity, and the assigned Chave Geral danger.
2. **Final phase:** the entrance pulses again and the interface makes clear that zero means the team has chosen the interlace by remaining in the field.
3. **Interlaced phase:** the remote branch becomes traversable, the opportunity and danger are marked, and a hostile vanguard arrives immediately at the forecast danger coordinate.

The warning is informational rather than modal. Movement, combat, object recovery, and the physically available entrance remain active while the team decides.

## Opportunity forecast

The remote graph is ranked by room role and difficulty. The strongest current candidate is presented before collision, generally favoring:

- remote vault;
- remote treasure;
- remote archive;
- remote elite room;
- remote shrine;
- remote combat room;
- breach fallback.

After interlace, the opportunity receives a gold `O` marker on the minimap and a world pulse.

## Danger forecast

The assigned major process determines the danger language and coordinate:

- Auditor: largest contradiction;
- Seizure Chief: remote vault or equivalent high-value coordinate;
- Route Runner: overlap or temporary-route coordinate;
- Warden: return passage.

After interlace, the coordinate receives a red minimap mark, a process-colored world pulse, and an immediate vanguard. The full major process still follows its existing activation condition.

## Result record

Completed runs now record:

- safe-window phase history;
- warning and final thresholds;
- forecast opportunity and danger;
- `returned`, `stayed`, or `failed` decision;
- whether interlace occurred.

This gives later progression, relationships, contracts, and debrief writing a stable fact to react to without adding another currency or mandatory vote screen.
