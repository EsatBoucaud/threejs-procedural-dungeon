# Player Activity Authority

Status: active gameplay contract

ABRIR does not assign field activities to fixed character roles. Combat kit, character identity, and player ownership affect how a player approaches a situation, but they do not determine who is allowed to interact with it.

## Core rule

Any connected player controlling an assigned, available character may attempt any ordinary field activity when the world-state requirements are satisfied.

This includes:

- recovering loot;
- inspecting objects;
- initiating dialogue;
- speaking for the group;
- beginning a card battle;
- joining a card battle;
- negotiating;
- activating a shrine or machine;
- solving a puzzle;
- hacking or rerouting a system;
- reviving another character;
- proposing a route choice;
- requesting extraction;
- initiating a consequential object decision.

There is no permanent “looter,” “talker,” “card player,” “puzzle character,” “medic player,” or “decision leader.” Players decide who handles each situation during play.

## What may restrict an activity

Activities may be restricted by physical or mission conditions:

- the acting character is not close enough;
- the acting character is incapacitated;
- the player is disconnected;
- the object or NPC is already engaged by another player;
- the room is locked or unstable;
- an enemy process is blocking the interaction;
- the activity requires a prerequisite object or known fact;
- a consequential action is awaiting the other players' responses.

Activities may **not** be restricted because:

- the character is melee or ranged;
- the selected kit is not considered the ideal role;
- another character has a higher dialogue, loot, card, puzzle, or technology label;
- the player occupies a particular numbered seat;
- the game wants an even distribution of responsibilities.

## Activity initiation versus activity resolution

Any eligible player may initiate an activity. Initiating it does not always grant unilateral authority over the final consequence.

### Ordinary activities

Ordinary activities execute immediately or use a short exclusive claim:

- inspect an object;
- collect routine loot;
- activate a nonconsequential shrine;
- begin an optional card encounter;
- speak to a noncritical NPC;
- revive a teammate;
- operate a local puzzle component.

The first eligible player to begin an exclusive interaction temporarily owns that target. Other players remain free to do something else.

### Consequential activities

Consequential activities begin as a player proposal:

- extract the team;
- remain after the safe window;
- surrender or conceal a major object;
- return an object to a local claimant;
- accept a faction deal;
- lock in a route that closes another route;
- make a conversation choice that changes a relationship or mission result.

The initiating player chooses what to propose. Other players may agree, oppose, or abstain. The game can resolve unresolved disagreement through the established visible roll system while preserving who proposed and opposed the decision.

## Dialogue

Any player may approach and begin a conversation.

The initiating player becomes the active speaker for that exchange unless:

- they yield the floor;
- another player uses an allowed interruption;
- the NPC addresses a specific character for narrative reasons;
- the conversation moves to a collective decision.

An NPC preferring or recognizing a character affects the conversation's content and modifiers. It does not transform dialogue into an activity only that character is allowed to perform.

## Card battles

Any player may initiate a card battle when the encounter is available.

Card encounters should define:

- whether one player pilots the shared deck;
- whether multiple players contribute cards or actions;
- whether control rotates by round;
- how spectators influence or advise;
- whether the result belongs to the initiating player or the whole team.

These are encounter rules, not permanent character-role restrictions. A character's relationships, items, or history may alter available cards without assigning one player as the mandatory card-battle specialist.

## Loot and object handling

Any player may inspect or recover an available object.

The recovered record stores:

- player who initiated recovery;
- character used at the moment of recovery;
- room and server-state of origin;
- later holder or carrier when carrying becomes physical;
- players involved in any consequential disposition decision.

Who physically recovers an object does not automatically determine who owns its narrative decision. A major object may still require a collective choice before extraction, sale, concealment, or return.

## Shared activities

Some activities allow multiple simultaneous participants:

- searching a room;
- contributing to a card battle;
- operating different puzzle components;
- defending a speaker;
- carrying a large object;
- stabilizing an overlap;
- reviving under pressure.

The activity record should distinguish:

- initiator;
- participants;
- final decision maker or resolution method;
- contribution by player and character;
- outcome.

## Interaction claims

An exclusive target uses a temporary interaction claim so two players cannot independently resolve the same object, NPC, shrine, or card table at the same moment.

A claim is not a role assignment. It ends when the activity:

- completes;
- is cancelled;
- times out;
- becomes invalid;
- transfers through an explicit player action.

## Runtime record

Each activity record includes:

- activity type;
- target;
- initiating player;
- active character;
- selected combat kit for context only;
- participants;
- proposal responses when relevant;
- status;
- denial reason when blocked by world state;
- resolution.

Run results include a participation summary by player, activity type, and character. This is for narrative memory, debugging, and future adaptive content—not for forcing players into permanent jobs.

## Current implementation

`src/game/activity-authority.js` provides:

- shared activity types;
- activity policies;
- ownership validation;
- proximity, incapacitation, disconnect, and world-lock checks;
- temporary exclusive claims;
- consequential proposals;
- agree, oppose, and abstain responses;
- participant tracking;
- per-player activity summaries.

`MissionSystem` now routes loot, shrine, and extraction interactions through this authority layer and exposes the same path for dialogue, card battles, negotiation, puzzles, hacking, route actions, and future interaction systems.

## Acceptance criteria

- Every assigned player can initiate every ordinary activity type.
- Changing a character's combat kit does not change activity permission.
- Duplicate kits do not reserve or remove interaction authority.
- Any player may recover an object when eligible.
- Any player may initiate dialogue or a card battle when eligible.
- Consequential actions remember who proposed, agreed, opposed, or abstained.
- Simultaneous attempts are resolved through target claims rather than hidden role priority.
- The run result attributes activities to the acting player and character.
