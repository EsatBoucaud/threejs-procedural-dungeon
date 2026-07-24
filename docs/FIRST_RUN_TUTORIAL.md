# First-Run Teaching Sequence

Status: implemented player-facing prototype

## Design rule

ABRIR does not stop the run to explain itself. The first generated rooms become the teaching sequence, and every required instruction clears only after the player performs the corresponding action successfully.

The tutorial is shown once per browser profile. Add `?tutorial=1` to force it on for testing or `?tutorial=0` to suppress it.

## Generated-room plan

The tutorial derives two rooms from the active deterministic map:

1. **Orientation room:** the first non-entrance room on the critical path.
2. **Combat room:** the next available critical-path combat or elite room, with a deterministic fallback when the graph does not contain one.

The orientation room is temporarily stabilized by suppressing its ordinary enemy spawn. It remains part of the actual route graph and keeps its normal architecture, exits, collision, and minimap relationship.

## Teaching sequence

### 1. Cross the threshold

A gold `T` marks the orientation room on the real minimap. The task completes when the player physically crosses into that room.

### 2. Inspect the room

A small field-record marker sits inside the orientation room. The player approaches it and presses `E`. This teaches proximity interaction without opening a modal or assigning the action to a specific character.

Inspection confirms:

- the room and its exits;
- the relationship between world position and minimap;
- the complete deployment roster;
- local ownership versus teammate ownership.

### 3. Read ownership

In two-player mode, the player must press `Q` and successfully swap into the other character in their assigned pair. Swapping outside that pair remains impossible.

In four-player mode, inspection immediately confirms fixed ownership. The guide displays one local assignment and three teammate assignments without asking the player to perform a nonexistent swap.

### 4. Enter live combat

The minimap target moves to the tutorial combat room. That room guarantees at least three hostiles and one gunner while preserving its generated architecture.

The player confirms:

- a successful primary attack;
- a successful dodge outside cooldown;
- a successful active-kit ability outside cooldown;
- room stabilization after the hostiles are cleared.

### 5. Observe real cover

Hostile projectiles use the same architecture collision as the rest of the run. When a hostile shot terminates against generated cover, the guide records the event and confirms it visibly.

Cover observation is rewarded but does not permanently lock completion. The tutorial gunner receives a brief eight-second survival floor when the combat room begins, creating a readable opportunity to break line of sight without making the room unwinnable when the player ignores the lesson.

## Presentation

The guide is a compact non-modal ribbon. It never pauses:

- movement;
- aiming;
- attacks;
- abilities;
- enemy behavior;
- the safe-window countdown.

Shared interactions and comic reading visually de-emphasize the guide but do not create a second tutorial layer.

## Completion

Completion is stored under `abrir.firstRunTutorialComplete`. The deterministic history records phase changes and completed tasks, including whether real cover was observed.

This is still a local-browser teaching prototype. Four-player teammate entities and network ownership replication remain future work, so the four-player lesson teaches roster identity rather than pretending remote bodies already exist.
