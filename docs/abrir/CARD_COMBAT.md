# ABRIR Card Combat Prototype

## Combat identity

ABRIR exploration remains spatial and real-time on the saved Three.js map. Entering a hostile room changes the rules: the room locks, the camera frames the encounter, and combat becomes turn-based and card-driven.

The card system is the MVP combat foundation. The previous real-time attack test was replaced rather than extended.

## Current turn structure

1. Begin the player turn with 3 **Time**.
2. Draw to a five-card hand.
3. Spend Time to move operatives, attack, defend, control enemies, recover health, or gain future tempo.
4. Read enemy intents before committing cards.
5. End the turn manually.
6. Enemies resolve their displayed intents.
7. Unplayed cards enter the discard pile and a new player turn begins.

Unused Time expires at the end of the player turn.

## Spatial layer

Combat uses three lanes:

- Front
- Mid
- Rear

Two operatives occupy the allied side of the generated room. Enemies occupy the opposing side. Lane position affects some card outcomes, including Zélia's Heavy Arc.

## MVP operatives

### Sócrates — Field Medic

- Suppress: ranged damage and Weak.
- Investigate: card draw and future Time.
- Field Treatment: heals the most injured operative.

### Zélia — Vanguard

- Restrain: removes an enemy action.
- Heavy Arc: increased damage when sharing the enemy's lane.

Neutral cards can be played by the currently active operative.

## Current deck

- Tactical Advance
- Restrain
- Suppress
- Shield Up
- Investigate
- Field Treatment
- Heavy Arc
- Crossfire

The deck is deterministically shuffled from the saved map seed so the prototype can be reproduced.

## Interlacing test

The `I` key still toggles the provisional interlacing state. In combat it:

- changes the room lighting and floor treatment;
- adds an additional hostile unit;
- upgrades the final unit to an elite;
- increases hostile attack damage;
- raises the recovered object's provisional value.

## Current controls

### Exploration

- WASD or arrow keys: move
- Q or Tab: switch active operative
- I: toggle interlacing test

### Combat

- Click a card to play it or prepare a targeted card.
- Click a highlighted enemy label to resolve a targeted card.
- Number keys 1–5 select cards in hand.
- Q or Tab changes the active operative.
- Enter or the End Turn button ends the player turn.

## Deliberate placeholders

- Character and enemy models
- Character portraits
- Card illustrations
- Sound and animation timing
- Final card balance
- Extraction and post-run valuation

The UI composition, lane model, Time economy, card flow, enemy intents, draw/discard system, and deterministic encounter are functional MVP systems rather than visual mockups.
