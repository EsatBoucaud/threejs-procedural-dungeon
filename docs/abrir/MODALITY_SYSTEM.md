# ABRIR Modality System

ABRIR is not built around one universal combat screen. A run moves through four co-existing modalities, each asking the player to read a different kind of pressure.

## 1. Arena combat

Real-time top-down action inside a generated room.

Primary pressures:

- positioning;
- aiming and attack timing;
- cooldown management;
- active-operative switching;
- protecting or recovering a partner.

Current MVP proof: projectile attacks, melee arcs, secondary abilities, dodge, pursuit enemies, contact damage, and room locking.

## 2. Hidden-room search

A generated or authored still image contains recoverable objects. A normalized JSON layer supplies each object's bounding hitbox and gameplay data.

Primary pressures:

- limited time synchronized to a teammate's combat section;
- limited carrying capacity;
- sale value versus evidence value;
- decoys and hint usage;
- moral risk.

Current MVP proof: `search.html`, `content/search/relay-apartment.json`, and a replaceable SVG scene. The runtime does not depend on the placeholder image: any AI-generated PNG can replace it while preserving or regenerating the normalized hitbox JSON.

## 3. Card combat

Turn-based tactical combat inside a generated room.

Primary pressures:

- three-lane positioning;
- enemy intents;
- a 3-Time action economy;
- draw and discard management;
- operative-specific cards;
- status effects and future-turn setup.

Current MVP proof: deterministic deck, five-card hand, Time, Block, Weak, Restrain, healing, lane movement, and enemy-turn resolution.

## 4. Dialogue decisions

Text choices determine cooperation, evidence use, trust, escalation, and access to later options.

Primary pressures:

- what the player knows;
- what the player took;
- how the player treated residents;
- whether institutional authority is used, concealed, or challenged;
- which teammate is present.

Current MVP proof: moral object confirmation and post-search resident confrontations. Search outcomes are stored as structured facts rather than only flavor text.

## Shared run state

All modalities should read and write the same run-state categories:

```json
{
  "party": {
    "health": {},
    "status": {},
    "activeOperative": "socrates"
  },
  "inventory": {
    "capacity": 6,
    "objects": [],
    "grossValue": 0
  },
  "relationships": {
    "residentTrust": 0,
    "factionStanding": {}
  },
  "knowledge": {
    "dialogueFacts": [],
    "evidence": []
  },
  "combat": {
    "cardUnlocks": [],
    "arenaModifiers": []
  },
  "world": {
    "interlacing": false,
    "nightPressure": 0,
    "roomsResolved": []
  }
}
```

The hidden-room prototype currently persists its result under `localStorage['abrir.search.latestResult']` using this vocabulary so it can later be consumed by the map runtime or server adapter.

## Overlap examples

### Search → arena

Removing a power regulator adds `lights_disabled` and `enemy_speed_plus_15`. The item is valuable, but the teammate's simultaneous arena fight becomes more dangerous.

Taking a resident's medicine adds `resident_aid_unavailable`, removing a possible civilian assistance event from later action combat.

### Search → cards

Recovering the seizure warrant unlocks a future `present-warrant` card.

Recovering a radio unlocks `intercept-channel`; a phone can unlock `predict-route`.

These are low-value objects with high tactical value, forcing a real inventory decision.

### Search → dialogue

Personal items write facts such as `family_photo_taken` or `family_watch_taken` and reduce resident trust.

Returning an object during the confrontation removes its negative object consequence and records a return fact.

### Dialogue → arena

A trusted resident can reveal a safe entrance, disable an alarm, identify an elite, or provide a recovery window.

A hostile resident can trigger reinforcements or remove an extraction route.

### Dialogue → cards

Presenting evidence can add temporary cards, expose enemy intents, reduce Time costs, or end an encounter without violence.

Poor dialogue outcomes can add dead cards, raise enemy Block, or force a card encounter to begin under Pressure.

### Arena → search

The teammate's arena encounter defines the search timer. Ending the fight early can close the room early; struggling can extend the search while increasing the risk of team injury.

Arena damage can also reduce search hints or carrying capacity if the searching operative must stop to support the teammate.

### Cards → search

A card-combat win can reveal the correct target list, grant extra hints, or identify which objects are evidence rather than ordinary valuables.

A failed or prolonged card encounter can shorten the search window or cause the image state to interlace, changing object positions and hitboxes.

### Any modality → extraction

Every choice eventually becomes extraction math:

- gross recovered value;
- Instituto Travessia retention;
- evidence retained instead of sold;
- relationship consequences;
- items lost after defeat;
- interlacing multipliers;
- future room and dialogue unlocks.

## Authoring rule

Room modality must be explicit data, not inferred permanently from visual room type.

A generated room should receive a gameplay overlay resembling:

```json
{
  "roomId": 17,
  "mode": "search",
  "recipe": "relay-apartment",
  "parallelEncounterId": "arena-room-08",
  "rewardTable": "apartment-recovery-a",
  "interlacingTransform": "apartment-night-b",
  "consequenceChannels": ["arena", "cards", "dialogue", "extraction"]
}
```

This allows the same geometry to host different rules in different runs while preserving deterministic map generation.
