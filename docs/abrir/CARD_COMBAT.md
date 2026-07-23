# ABRIR Dual Combat Prototype

## Combat identity

ABRIR uses **both** real-time action combat and turn-based card combat. The room determines the rules.

Exploration remains spatial and real-time on the saved Three.js map. Entering a hostile room locks it, frames the encounter, and dispatches the correct combat mode from the room's authored gameplay role.

For the current MVP map:

- a shallow generated combat room runs a real-time skirmish;
- a deeper elite-capable room runs tactical card combat;
- both encounters must be cleared and looted before extraction.

The two modes share the same operatives, current health, recovered value, interlacing state, and map topology.

## Real-time room

### Controls

- WASD or arrow keys: move
- Mouse: aim
- Left click or 1: primary attack
- 2: secondary ability
- Shift: dodge with brief invulnerability
- Q or Tab: switch active operative

### Sócrates

- Precision Shot: fast ranged projectile.
- Field Treatment: restores both operatives.

### Zélia

- Heavy Arc: wide close-range strike.
- Ground Break: damages nearby enemies.

The inactive partner follows the active operative. Enemies pursue, attack on contact, display health, and can include an interlaced elite.

## Card combat room

### Current turn structure

1. Begin the player turn with 3 **Time**.
2. Draw to a five-card hand.
3. Spend Time to move operatives, attack, defend, control enemies, recover health, or gain future tempo.
4. Read enemy intents before committing cards.
5. End the turn manually.
6. Enemies resolve their displayed intents.
7. Unplayed cards enter the discard pile and a new player turn begins.

Unused Time expires at the end of the player turn.

### Spatial layer

Card combat uses three lanes:

- Front
- Mid
- Rear

Two operatives occupy the allied side of the generated room. Enemies occupy the opposing side. Lane position affects some card outcomes, including Zélia's Heavy Arc.

### Current deck

- Tactical Advance
- Restrain
- Suppress
- Shield Up
- Investigate
- Field Treatment
- Heavy Arc
- Crossfire

The deck is deterministically shuffled from the saved map seed so the prototype can be reproduced.

### Controls

- Click a card to play it or prepare a targeted card.
- Click a highlighted enemy label to resolve a targeted card.
- Number keys 1–5 select cards in hand.
- Q or Tab changes the active operative.
- Enter or the End Turn button ends the player turn.

## Run loop now implemented

1. Explore the generated map.
2. Clear one real-time skirmish room.
3. Clear one card-combat room.
4. Recover both exposed objects.
5. Return to the generated entrance.
6. Choose **Extract** or **Stay After Night**.
7. Staying interlaces and reopens the tactical room with an elite encounter.
8. Extract to see recovered value, the Instituto Travessia's 15% retention, and secured value.

## Interlacing

Interlacing:

- changes room lighting and floor treatment;
- increases real-time hostile count;
- adds an elite to the card encounter;
- increases hostile damage;
- raises recovered-object value;
- creates the current stay-after-night escalation.

## Deliberate placeholders

- Character and enemy models
- Character portraits
- Card illustrations
- Sound and animation timing
- Final card and action-combat balance
- Final room-mode authoring rules
- Final extraction presentation

The room dispatcher, shared health state, both combat loops, card economy, enemy intents, real-time cooldown abilities, extraction decision, interlacing escalation, and run report are functional MVP systems rather than visual mockups.
