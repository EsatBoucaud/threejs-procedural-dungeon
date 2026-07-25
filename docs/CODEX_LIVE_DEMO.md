# ABRIR Codex Live Demo Runbook

## One-command launch

```bash
npm install
npm run demo
```

`npm run demo` opens a fixed deterministic run at:

```text
/?demo=1&tutorial=0
```

The demo skips headquarters and deployment setup, uses the same two-player ownership contract every time, and generates the same compact Recife route from `ABRIR-CODEX-DEMO-001`.

Before presenting, run the complete release-candidate gate once:

```bash
npm run preflight
```

That command runs every deterministic gameplay check, the demo-specific checks, the repository contract check, a clean production build, and a served-build smoke test against the actual `?demo=1&tutorial=0` URL.

## What the hardened demo mode changes

The speedrun is intentionally isolated from ordinary play:

- it always uses a clean rank-one profile with no inherited upgrades;
- it never writes demo results into the real profile, archive, or run history;
- dialogue and comic explanation overlays freeze the local demo simulation, so enemies and the safe-window clock cannot kill or rush the presenter mid-explanation;
- movement inputs are released when an overlay opens, the browser loses focus, or the tab becomes hidden;
- guarded teleports search a wider walkable radius and fall back safely rather than placing the player inside generated cover;
- object staging searches for an unused eligible room instead of repeatedly targeting a room that already produced loot;
- a startup guard shows an explicit recovery screen rather than leaving a blank canvas when boot fails or exceeds ten seconds.

These protections apply only to the explicit demo URL.

## Three-minute presentation route

### 0:00 — Establish the premise

Say: “ABRIR is a deterministic Three.js action-looter. The room graph is the shared gameplay contract, not decorative procedural generation. Four characters enter every run, with either two-player pair ownership or four-player fixed ownership.”

Point to:

- fixed local and remote seed labels;
- the generated minimap;
- the active contract;
- the four-character roster.

### 0:25 — Prove ordinary play

Press **COMBAT ROOM** in the demo console.

Demonstrate:

- `WASD` movement;
- mouse aim and left-click attack;
- `Space` dodge;
- `R` active ability;
- architecture blocking movement and shots.

Press `Q` once to show that the local player swaps only between their assigned pair.

### 0:55 — Prove player-led social interaction

Press **DIALOGUE**, then press `E`.

Show:

- a player initiates the interaction because they are physically nearby;
- dialogue control can be handed to another player;
- consequential choices expose visible votes;
- tied votes use deterministic visible d20 rolls;
- no character or combat kit owns the “talker” role.

Close the interaction after the result is visible. The demo simulation remains frozen while this overlay is open.

### 1:35 — Prove the object conflict

Press **OBJECT DECISION**, then press `E`.

Show the three readings:

1. Institute and market classification;
2. value to A Chave Geral or the access network;
3. meaning to local people and the place.

Choose recover, recover-and-return, contest classification, or leave. Emphasize that the group decision becomes part of the object record.

### 2:05 — Prove the interlace

Press **INTERLACE NOW**, then **GO TO OVERLAP**.

Point to:

- the independently generated remote graph;
- temporary bridges and overlap coordinates;
- the opportunity and danger forecast;
- A Chave Geral’s immediate remote-state pressure;
- the fact that the team deliberately stayed rather than missing a timer by accident.

### 2:35 — Show the comic mechanic

Press `C` or **COMIC SPREAD**.

Use the left and right arrow keys to turn a complete two-page spread. Clarify that the reader is collectible progression infrastructure for later authored character-origin comics; it is not the full Atlas reading UI.

Press `Escape` to close. The demo simulation and clock remain frozen while the comic is open.

### 2:55 — Clean ending

Press **RETURN PASSAGE**, then `E` when the passage prompt appears. Complete the extraction proposal or end on the debrief.

The debrief shows the run’s projected recovered value, Institute retention, contract outcome, interlace decision, and participation records. Demo accounting is deliberately not written into the real profile or archive.

## Emergency controls

The demo console is explicitly labeled **GUARDED ASSIST** and exists only in `?demo=1`.

- **RESTORE SQUAD:** full health, clear cooldowns, temporary damage protection.
- **COMBAT ROOM:** move directly to live combat.
- **DIALOGUE:** move to an unused shared dialogue.
- **OBJECT DECISION:** reveal or locate a recoverable object in an unused eligible room.
- **INTERLACE NOW:** trigger the remote state immediately.
- **GO TO OVERLAP:** move to the first deterministic overlap.
- **RETURN PASSAGE:** move to extraction; the player still presses `E` and uses the real proposal flow.
- **RESTART FIXED RUN:** reconstruct the same seed and deployment without refreshing the browser.
- `F1`: hide or reveal the demo console.

These controls do not exist in ordinary runs and do not claim to be player progression abilities.

## Screen setup

- Use a Chromium browser at 100% zoom.
- Prefer a 1920×1080 display or browser window.
- Keep the browser console closed during the presentation.
- Disable extensions that alter keyboard shortcuts.
- Do not run the first-time tutorial during the speedrun; the demo command already sets `tutorial=0`.
- Keep one terminal visible only when showing `npm run preflight` or the production build.
- Rehearse once from a fresh page load and once using **RESTART FIXED RUN**.

## Final five-minute checklist

1. `git pull`
2. `npm ci`
3. `npm run preflight`
4. `npm run demo`
5. Confirm the opening status reads **PASSAGE OPEN**, press `F1`, and verify **COMBAT ROOM**, **OBJECT DECISION**, and **INTERLACE NOW** once before screen sharing.

## Honest boundaries

The demo validates deterministic local 2P/4P ownership and shared-interaction workflows. It does not represent completed online transport, simultaneous remote input replication, reconnect, voice chat, or final authored environment and comic art. The production smoke test confirms that the built demo URL and required bundles serve correctly; it is not a substitute for one hands-on browser rehearsal on the presentation machine.
