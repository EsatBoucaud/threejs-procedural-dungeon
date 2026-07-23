# ABRIR Player Workflow

Status: active implementation contract

This document defines the player-facing flow from route authorization through deployment, traversal, extraction, accounting, and redeployment.

## Locked multiplayer contract

ABRIR is a multiplayer game with two supported team structures:

### Two-player mode

- Four distinct characters participate in the authorization.
- Player 1 owns two characters.
- Player 2 owns two characters.
- Each player directly controls one of their assigned characters at a time.
- Each player can swap between only their own assigned pair during the run.
- Health, cooldowns, status, carried state, and position remain attached to the character rather than the player slot.
- One player cannot take control of the other player's assigned characters through ordinary swapping.

### Four-player mode

- Four distinct characters participate in the authorization.
- Each player owns one character.
- Character swapping is unavailable because every character is already under direct player control.
- A disconnect may later transfer that character to temporary AI control, but AI partnership is not the primary game mode.

### Field roster

The active Instituto Travessia field roster is:

- Zélia Amato
- Lia
- Chilindo
- Sócrates

Afonso remains headquarters leadership and mission narration. He is not a selectable field character.

## Character identity and combat are separate decisions

Selecting four different characters does **not** require an equal melee/ranged distribution.

Each deployment makes two separate decisions:

1. **Character ownership** — which player controls which character.
2. **Combat kit** — how each character fights during that authorization.

Combat kits are not permanently locked to character identity. Players may create any valid composition, including:

- four ranged kits;
- four melee kits;
- three ranged and one melee;
- one ranged and three melee;
- repeated copies of the same kit;
- any later hybrid or support-heavy composition.

The game may warn players about the consequences of a composition, but it must not silently correct, rebalance, or reject a team because it lacks a conventional role split.

Characters can retain identity-specific attributes, relationships, dialogue, and minor physical differences while the selected kit determines the primary attack, active ability, dodge profile, field role, and combat family.

# Player experience sequence

The repeated ABRIR experience should feel like:

1. **Authorization** — the team chooses a route with incomplete information.
2. **Ownership** — players assign the four characters across two or four player seats.
3. **Composition** — the team chooses combat kits without a required role quota.
4. **Traversal** — the local state initially appears stable and understandable.
5. **Recovery** — players fight, investigate, and decide what should be removed.
6. **Pressure** — the safe window closes while carried value and narrative consequence increase.
7. **Contradiction** — an independent remote state interlaces with the current map.
8. **Collective decision** — the team chooses whether to extract, continue, return an object, oppose the Institute, or pursue a rarer route.
9. **Accounting** — Instituto Travessia produces its official record.
10. **Memory** — Celeste, A Chave Geral, the affected community, and the players may remember the same run differently.

# Core gameplay loops

## Ten-second combat loop

Each player repeatedly:

1. Reads enemy position, room geometry, teammate state, and available cover.
2. Attacks, dodges, uses an ability, repositions, or supports another player.
3. Responds to the team's chosen combat composition.
4. Protects carried objects and the extraction route.
5. Decides whether to spend resources now or preserve them for post-interlace pressure.

A four-ranged team should solve rooms differently from a four-melee team. Encounter design should create consequences for composition rather than enforcing one correct answer before deployment.

## Two-player swap loop

In two-player mode, each player has a personal pair.

A swap should:

- be fast enough to use during ordinary play;
- preserve the outgoing character's health and cooldowns;
- bring in the second assigned character with their own selected kit and state;
- remain unavailable when the second character is incapacitated or otherwise inaccessible;
- never cycle into a character owned by the other player.

The swap is a tactical ownership mechanic, not a global roster carousel.

## Room loop

A typical room contains:

1. **Arrival read** — exits, room function, threats, recoverable objects, and teammate positions.
2. **Approach decision** — direct engagement, split approach, hold position, or bypass.
3. **Resolution** — combat, environmental interaction, investigation, social choice, or a mixture.
4. **Recovery decision** — inspect, recover, leave, substitute, dispute, or mark an object for return.
5. **Route decision** — continue, detour, regroup, or move toward extraction.

Not every room requires combat. The run should alternate movement, pressure, conversation, and recovery.

## Run loop

Target first-slice duration: approximately 10–15 minutes.

- 0:00–2:00 — route, player mode, ownership, combat composition, and briefing.
- 2:00–5:00 — stable rooms, first combat, and first object decision.
- 5:00–8:00 — route fork, rising attention, and early-extraction opportunity.
- 8:00–11:00 — optional interlace, rare access, and A Chave Geral intervention.
- 11:00–14:00 — final collective decision and pressured return.
- 14:00–15:00 — debrief, object accounting, and next authorization.

A team may extract before the interlace and still complete a valid run. Staying late is a voluntary escalation.

# Route-to-field workflow

## 1. Headquarters landing

The team begins at Instituto Travessia headquarters.

Primary action: `Authorize a passage`.

The landing state shows:

- unresolved consequences from previous runs;
- current archive disputes;
- available routes;
- party status;
- one clear path into deployment.

## 2. Route authorization

Players choose a route before assigning combat.

The route preview includes:

- safe-window estimate;
- expected A Chave Geral process;
- local and remote-state tendencies;
- contract objective;
- reward profile;
- known uncertainty.

## 3. Choose player mode

The team selects:

- `2 players — two characters each`
- `4 players — one character each`

The mode changes ownership and swapping rules. It does not change the four-character field roster.

## 4. Assign characters

Every field character must be assigned exactly once.

Two-player mode requires two characters assigned to each player. Four-player mode requires one character assigned to each player.

The UI should make ownership immediately legible through grouping, player labels, and consistent color or icon treatment.

## 5. Choose combat kits

Each character receives a combat kit independently.

The kit card shows:

- combat family;
- primary attack;
- active ability;
- dodge behavior;
- role description;
- one important weakness or tradeoff.

Duplicate kits are allowed. The composition summary reports the team's choices without grading them as correct or incorrect.

## 6. Confirm deployment

Before opening the passage, show:

- player mode;
- character ownership;
- local player's directly controllable character or pair;
- all four selected combat kits;
- object capacity;
- contract;
- safe window;
- extraction rule;
- Instituto Travessia's retention allowance.

## 7. Afonso briefing

Afonso provides only information relevant to the current authorization:

- destination hypothesis;
- requested object or verification;
- expected safe window;
- known threat;
- one statement revealing the Institute's interest.

Players may ask a small number of optional questions. Afonso is a source, not an omniscient narrator.

## 8. Portal threshold

Players gain control before crossing the threshold.

The first authorization teaches:

- movement;
- aiming;
- attack;
- ability;
- interaction;
- teammate identification;
- two-player swapping, when applicable.

# Object workflow

Important objects must carry at least three readings:

1. **Institute appraisal** — contract, sale, or archive value.
2. **Network relevance** — why Celeste or A Chave Geral may care.
3. **Local meaning** — who used it, needs it, made it, or claims it.

Consequential actions may include:

- recover;
- inspect further;
- leave;
- mark for return;
- substitute;
- dispute classification;
- give to another party;
- conceal from the Institute.

Ordinary pickups do not require a full party vote. Consequential object decisions do.

# Multiplayer decision control

Combat style and tactical approach remain under player control.

The game should not force players to distribute melee and ranged kits evenly. It should instead let room geometry, enemy behavior, time pressure, and object protection make the consequences of their decision visible.

For consequential noncombat choices, players may:

- agree;
- oppose;
- abstain.

When the team cannot resolve a decision conversationally, ABRIR can use a visible die roll modified by character position, relationships, relevant objects, prior choices, and field conditions. The roll resolves the in-world action without pretending the disagreement never happened.

# HUD priorities

Always visible:

- the local player's active character;
- the local player's reserve character in two-player mode;
- current health and cooldowns;
- teammate state;
- carried-object capacity;
- safe-window state;
- current contract sentence;
- contextual interaction prompt.

Contextual:

- full deployment composition;
- detailed map;
- object interpretation;
- relationship state;
- vote or disagreement interface;
- complete archive values.

In four-player mode, the HUD should not imply that the local player can swap into teammates' characters.

# Failure and disconnect rules

## Two-player mode

If one of a player's characters falls, that player may continue with their remaining assigned character. They may not swap into the other player's pair.

If both of one player's characters fall, that player's continued participation requires revive, recovery, spectating, or another explicitly designed state. Ownership should not silently migrate.

## Four-player mode

A fallen character remains attached to that player. Revive and recovery systems determine return to play.

## Disconnect

A disconnected player's owned character or characters may transfer temporarily to AI control after a grace period. Reconnection restores the original ownership.

# Instrumentation

Record:

- selected player mode;
- character-to-player assignments;
- combat-kit selection per character;
- composition summary;
- swap attempts and successful swaps;
- time spent controlling each assigned character;
- incapacitation by character and owner;
- route choice;
- room entry and exit;
- object actions;
- party proposals, responses, and roll results;
- early extraction versus interlace;
- A Chave Geral encounter outcome;
- debrief duration;
- time to next authorization.

# Acceptance criteria

## Deployment

- Exactly four unique characters are assigned.
- Two-player mode assigns exactly two characters per player.
- Four-player mode assigns exactly one character per player.
- Every character can select any combat kit.
- Duplicate combat kits are valid.
- No melee/ranged balance rule blocks deployment.

## Runtime ownership

- In two-player mode, a player swaps only within their assigned pair.
- In four-player mode, ordinary character swapping is unavailable.
- Character health and cooldowns survive a swap.
- Ownership is visible in the deployment screen and field HUD.

## Player understanding

After the first run, players can explain:

- who owned each character;
- how two-player swapping worked;
- why four-player mode did not allow swapping;
- how the team chose its combat composition;
- what the safe window meant;
- why staying after the warning was tempting;
- why an object mattered beyond price;
- how to extract and redeploy.

# Immediate implementation order

1. Implement the two-player/four-player deployment schema.
2. Separate character identity from combat kit selection.
3. Build the deployment interface and composition summary.
4. Scope local swapping to the current player's owned pair.
5. Add networked ownership and remote-player entities.
6. Add two-player character-state persistence across swaps.
7. Add four-player revive and disconnect recovery.
8. Add consequential team decisions and visible disagreement resolution.
9. Complete the first route from authorization through archive choice.

Do not add more routes or major antagonists until the multiplayer ownership and first-run workflow are playable end to end.
