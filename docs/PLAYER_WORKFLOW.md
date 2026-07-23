# ABRIR Player Workflow

Status: implementation-facing design proposal

This document defines what the player does from launch through deployment, combat, extraction, filing, and redeployment. It is intentionally player-facing. It does not expand the procedural generator, backend, economy, or art pipeline.

## Locked player-facing rules

- ABRIR supports one-player play with an AI partner and two-player cooperative play.
- Exactly two operatives enter a passage during a run.
- In solo play, the player directly controls one operative while the second follows as an AI partner. The player can instantly swap direct control between them.
- In cooperative play, each player controls one operative. Direct-control swapping is disabled unless a future accessibility option explicitly allows it.
- The active Instituto Travessia field roster is **Zélia, Lia, Chilindo, and Sócrates**.
- Afonso is headquarters leadership and mission narrator. He is not a selectable field operative.
- The first playable slice uses one melee operative and one ranged operative.
- Combat is real-time. Most noncombat conversations, disputes, inspections, and social encounters use portraits or sprites with concise text choices.
- When two cooperative players choose incompatible noncombat actions, the game resolves the disagreement through a visible die roll modified by relevant character or run conditions.
- Objects are never presented as neutral loot. Important objects should carry at least three readings: their market value, their value to Celeste or A Chave Geral, and their meaning to the people or place from which they are removed.

## The experience ABRIR should create

The player should repeatedly feel this sequence:

1. **Authorization** — choose a route and accept incomplete information.
2. **Traversal** — enter a space that initially appears stable and legible.
3. **Recovery** — fight, investigate, and decide what is worth taking.
4. **Pressure** — the safe window closes while the value of the carried objects increases.
5. **Contradiction** — another server interlaces and changes the meaning of the current map.
6. **Decision** — extract safely, remain for rarer opportunities, or respond to a human consequence.
7. **Accounting** — return to Instituto Travessia and see how the mission is officially recorded.
8. **Memory** — the player, the Institute, Celeste, and the affected community may remember the same event differently.

The game should not feel like a sequence of menus followed by a generic dungeon. Every menu decision should predict something the player later experiences in the field.

# Core gameplay loops

## Ten-second loop

During combat, the player repeatedly:

1. Reads enemy position and room geometry.
2. Attacks, dodges, uses an ability, or repositions.
3. Checks the partner's condition and role.
4. Uses cover, a doorway, a route opening, or an overlap boundary.
5. Decides whether to press the advantage or preserve health for extraction.

The ten-second loop must remain understandable even when the interlace is active. Visual disruption can make the room stranger, but cannot hide essential combat information.

## Two-minute room loop

Each room should usually contain a compact sequence:

1. **Arrival read** — the player identifies the room's function, exits, visible hazards, and any recoverable object.
2. **Engagement** — enemies, an environmental process, or a social obstacle prevents uncomplicated passage.
3. **Resolution** — combat, interaction, or a short decision stabilizes the room.
4. **Recovery choice** — take, inspect, leave, mark, or substitute an object.
5. **Route choice** — continue along the known route, detour, or return toward extraction.

Not every room needs combat. A healthy run should alternate pressure, decision, and movement.

## Twelve-minute run loop

The target first-slice run lasts approximately 10–15 minutes:

- 0:00–1:30 — briefing, operative pair, and entry.
- 1:30–4:30 — stable local rooms and first recoveries.
- 4:30–7:30 — rising pressure, contract progress, and extraction temptation.
- 7:30–10:30 — interlace, rare access, A Chave Geral intervention, or human complication.
- 10:30–13:00 — final objective and return-route pressure.
- 13:00–15:00 — extraction, debrief, filing, and one meaningful between-run decision.

A player should be able to extract before the interlace. Staying late is a voluntary escalation, not a hidden requirement.

## Long-term loop

Across runs, the player:

1. Builds familiarity with the four operatives and their relationships.
2. Learns how routes behave before and after interlace.
3. Builds an archive of recovered, sold, retained, returned, and disputed objects.
4. Gains permissions and field resources.
5. Encounters conflicting accounts of earlier missions.
6. Opens routes, rooms, and decisions rather than only increasing numerical power.
7. Moves closer to Celeste while becoming less certain that Instituto Travessia's official record is complete.

# First-run experience

The first run should teach the complete emotional and mechanical loop without front-loading the entire setting.

## 1. Launch

The game opens on the Instituto Travessia passage desk, not a detached title menu.

Primary actions:

- `Begin first authorization`
- `Settings`
- `Accessibility`

The screen should establish three facts quickly:

- the Institute opens passages;
- the player is part of a small pilot team;
- recovered objects can cross back even when the rooms are described as unreal.

No lore glossary is required before play.

## 2. Afonso's intake

Afonso delivers a short briefing through portrait, voice, and text. He provides known facts, admits uncertainty, and frames the Institute's objective.

The first briefing should contain only:

- where the passage is believed to connect;
- what the Institute wants recovered or verified;
- when the safe window is expected to close;
- one known threat;
- one sentence that reveals the Institute has its own interests.

The player may ask one optional question before continuing. This teaches that Afonso is a source, not an omniscient narrator.

## 3. Choose two operatives

The player selects two from Zélia, Lia, Chilindo, and Sócrates.

For the first run, only the intended melee/ranged tutorial pair is available. The remaining two are visible but marked as assigned elsewhere rather than presented as game-locked strangers.

Each selection card shows only:

- combat role;
- primary attack behavior;
- active ability;
- partner behavior;
- one sentence of personality friction or trust with the other selected operative.

The player chooses who begins under direct control. In solo play, the other becomes the AI partner.

## 4. Loadout confirmation

The first run provides a fixed loadout. The player confirms rather than shops.

Show:

- healing or recovery allowance;
- object carrying capacity;
- current contract;
- safe-window estimate;
- extraction rule;
- Instituto Travessia's retention allowance.

The retention rule must be visible before deployment. It should never appear as a surprise subtraction after the first successful run.

## 5. Portal threshold

The operatives approach the passage in-engine. Movement begins before crossing so the player learns control without a separate tutorial room.

Teach in this order:

1. movement;
2. aim or facing;
3. partner follow/hold command;
4. instant operative swap in solo play;
5. crossing the threshold.

The portal crossing should be brief. The player should be in the first meaningful room within seconds.

## 6. First stable room

The first room contains no enemies.

It teaches:

- room boundary and exits;
- interaction prompt;
- map/minimap relationship;
- how Afonso comments on a room;
- how to inspect an object without taking it.

The object should have a market appraisal and a clearly human use. The player can inspect it, but cannot yet remove it.

## 7. First combat room

The second meaningful room introduces a small enemy group and one piece of real cover.

Teach:

- primary attack;
- dodge;
- active ability;
- partner command or role;
- revive/recovery if applicable;
- room stabilization.

The tutorial should react to behavior instead of freezing play for text. Afonso comments after the player successfully performs an action.

## 8. First recovery decision

After combat, the player may recover an object.

The object panel shows:

- **Institute appraisal** — expected sale or contract value;
- **network relevance** — why Celeste or A Chave Geral may care;
- **local meaning** — who used it, needs it, or claims it.

Available actions:

- `Recover`
- `Inspect further`
- `Leave`
- `Mark for return`

The first run can simplify the consequences, but the choice must be recorded.

## 9. First route fork

The map presents two routes:

- a shorter route toward the contract objective;
- a detour containing a visible but uncertain opportunity.

The player learns that route choice is not only difficulty selection. It changes time, object access, enemy pressure, and what can later overlap.

## 10. Safe-window warning

Afonso warns the player at a readable threshold, not only in the final seconds.

The game presents an explicit choice:

- `Return before interlace`
- `Continue under risk`

This is not a modal pause. The route back remains physically available while the player decides through movement.

## 11. Early extraction path

The player may return and extract before interlace.

An early extraction should still produce:

- a successful debrief;
- reduced but meaningful payout;
- object filing;
- a note about what remained unresolved;
- a clear invitation to authorize another passage.

The game must not shame the player for learning the safety loop.

## 12. Interlace path

When the player stays, the remote state enters the current map.

The transition teaches:

- previously solid or closed routes may change;
- remote rooms and objects have distinct visual language;
- overlap zones can hold contradictory room functions;
- A Chave Geral can enter through the new route logic;
- extraction remains possible unless a specific process blocks it.

The interlace should create one immediately understandable opportunity and one immediate danger.

## 13. A Chave Geral intervention

The first route introduces one major process, not the whole antagonist roster.

The encounter should communicate a mission effect before becoming a health-bar fight. Examples:

- confiscating a recovered object;
- locking the return passage;
- rerouting the map;
- auditing the value of what the player carries.

The player can defeat, evade, outlast, or sometimes negotiate with the process depending on the encounter design.

## 14. Final extraction decision

Near the end of the run, the player should face a clear tension among:

- contract completion;
- carried object value;
- partner survival;
- local consequence;
- A Chave Geral pressure;
- remaining route stability.

The ideal final decision is not simply “fight boss or leave.” The player should understand what is being abandoned, protected, or officially misreported by leaving now.

## 15. Debrief

The debrief has four layers, shown in sequence:

1. **Field result** — survival, rooms, objects, contract, and route events.
2. **Institute accounting** — payout, retention, permissions, and official classification.
3. **Object record** — what was stored, sold, held, lost, returned, or disputed.
4. **Narrative contradiction** — one short line, message, or image suggesting that another party remembers the mission differently.

The player returns to headquarters after the debrief.

## 16. First between-run decision

The first completed run offers one meaningful choice, not a wall of systems.

Recommended first choice:

- sell the first stored object;
- keep it in the archive;
- contest the Institute's classification;
- mark it for return to its place of origin.

Then present `Authorize next passage` as the primary action.

# Returning-player workflow

A returning player should reach deployment quickly.

1. Open at headquarters.
2. See one concise summary of unresolved consequences.
3. Select a route.
4. Review assigned A Chave Geral response and safe-window estimate.
5. Select two operatives.
6. Adjust loadout or permissions.
7. Enter the passage.

Target time from launch to field control for an experienced player: under 90 seconds.

The player should be able to save a preferred operative pair and loadout, but the route preview should still be visible before confirmation.

# Solo partner workflow

The AI partner is not a decorative follower. The player must be able to understand and influence its behavior.

Minimum commands:

- `Follow`
- `Hold`
- `Focus my target`
- `Recover / revive`

The partner should automatically:

- avoid obvious hazards;
- use nearby cover;
- preserve a minimum distance appropriate to its role;
- revive when safe;
- prioritize survival during extraction;
- avoid collecting or committing to major object decisions without the player.

Instant swap transfers direct control and gives the former player character to the AI. Health, cooldowns, position, and status remain attached to the operative.

# Cooperative decision workflow

In two-player play, either player can propose a noncombat action. The second player sees a compact response prompt:

- `Agree`
- `Oppose`
- `Abstain`

If players agree, the choice executes.

If one opposes, the game shows the relevant character positions and resolves the dispute with a visible roll. Conditions may modify the roll, but the result must be legible. The losing player's character can react, remember the disagreement, and affect later dialogue without removing control from that player.

Combat movement, object inspection, and ordinary recovery should not require constant voting. Voting is reserved for consequential choices.

# Required interface states

The player-facing slice needs these states:

1. Headquarters landing state.
2. Route authorization board.
3. Two-operative selection.
4. Loadout and contract confirmation.
5. In-engine portal threshold.
6. Tactical HUD.
7. Object interpretation panel.
8. Cooperative disagreement panel.
9. Safe-window and interlace warning.
10. Extraction interaction.
11. Debrief and accounting.
12. Archive decision.

Each state must have one obvious primary action. Avoid double sidebars, repeated dashboards, and menus that expose systems before they matter.

# HUD priorities

Always visible during ordinary field play:

- active operative health and ability state;
- partner health and state;
- carried-object count or capacity;
- safe-window status;
- current contract sentence;
- interaction prompt when relevant.

Contextual only:

- full object appraisal;
- detailed map;
- relationship state;
- long event history;
- complete archive values;
- permanent progression.

The interlace should alter the HUD's behavior and texture, but not relocate every critical element.

# Failure and recovery

## One operative falls

- The surviving operative remains playable.
- The fallen operative enters a recoverable state when the encounter allows it.
- Solo control automatically transfers when the directly controlled operative falls.
- Extraction with one operative should remain possible, with a major narrative and accounting consequence.

## Both operatives fall

- The run ends.
- The player sees what was lost, what may have been seized, and what information still returned to the Institute.
- Failure should advance some narrative knowledge without granting full economic success.

## Passage collapse

A collapse can remove routes, objects, or access without immediately killing the team. The player should receive a new physical route problem before a failure screen.

## Disconnect in cooperative play

The disconnected operative transfers to AI control after a brief grace period. The remaining player can continue and extract.

# Content requirements for the first complete workflow

The first workflow-complete build needs:

- one headquarters landing state;
- one Afonso briefing;
- one fixed two-operative tutorial pair;
- one stable route with a clear optional detour;
- three to five rooms before interlace;
- two ordinary enemy behaviors;
- one major A Chave Geral process;
- three meaningful recoverable objects;
- one early extraction path;
- one interlace path;
- one post-interlace rare room or object;
- one debrief contradiction;
- one archive choice after the run.

This is enough to test the actual promise of ABRIR. More routes, enemies, rooms, and upgrades do not replace this workflow.

# Instrumentation

Record these events locally now and through the backend later:

- launch-to-deployment time;
- selected route and operative pair;
- direct-control swaps;
- partner commands;
- room entry and exit;
- object inspect, recover, leave, mark, sell, hold, return, and dispute;
- safe-window warning location;
- early extraction versus interlace choice;
- cooperative proposal, response, and roll result;
- A Chave Geral process encounter and outcome;
- extraction attempt, success, block, abandonment, or collapse;
- debrief duration and skipped sections;
- time to next authorization.

Instrumentation should answer where players become confused, overstay, ignore their partner, fail to understand object consequences, or stop before redeploying.

# Workflow acceptance criteria

A first-time player should be able to complete the slice without external instructions and correctly explain:

- why two operatives were selected;
- how to control or command the partner;
- what the safe window means;
- why staying after the warning is tempting;
- how the interlace changes the map;
- why a recovered object matters beyond its price;
- how to extract;
- why the Institute retained or classified something;
- what to do next at headquarters.

A returning player should be able to begin another run in under 90 seconds without skipping information required to make an informed route and pair decision.

# Immediate implementation order

1. Replace the current all-four-at-once field assumption with a two-operative deployment contract.
2. Build the headquarters-to-route-to-pair-to-briefing workflow.
3. Add solo partner commands and instant control swap.
4. Add the first object interpretation panel and recorded recovery choice.
5. Make early extraction fully valid.
6. Add the safe-window decision and interlace branch.
7. Rebuild debrief around field result, Institute accounting, object record, and narrative contradiction.
8. Add the first archive choice and redeployment shortcut.

Do not add more routes or major processes until this sequence can be played from beginning to end.