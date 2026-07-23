# ABRIR Hidden-Room Search

## Runtime

`search.html` proves the image-search modality independently from the Three.js renderer.

The scene is made from two separable layers:

1. a replaceable image asset;
2. a JSON object manifest containing normalized bounding hitboxes and gameplay data.

The current placeholder scene is:

- `public/assets/search/relay-apartment.svg`
- `content/search/relay-apartment.json`

A final AI-generated PNG can replace the SVG without changing the interaction system. Hitboxes use normalized values from 0 to 1 so they scale with the image.

## Object record

Each object can declare:

```json
{
  "id": "power-regulator",
  "name": "Power Regulator",
  "value": 240,
  "category": "utility",
  "target": true,
  "hitbox": { "x": 0.69, "y": 0.655, "w": 0.14, "h": 0.15 },
  "morality": {
    "severity": "medium",
    "prompt": "Removing this component will cut power to another room while your teammate is fighting. Take it anyway?"
  },
  "consequences": {
    "arenaModifiers": ["lights_disabled", "enemy_speed_plus_15"],
    "dialogueFacts": ["power_regulator_removed"]
  }
}
```

## Current mechanics

- 45-second synchronized search window;
- six-item carrying capacity;
- target list and total value;
- three hints;
- decoys that cost time;
- removable selected items;
- moral confirmation prompts;
- post-search resident confrontations;
- structured cross-modality results persisted to local storage.

## Persistence contract

The runtime writes its completed result to:

```text
abrir.search.latestResult
```

The payload contains:

- selected object IDs and metadata;
- gross recovered value;
- resident trust;
- arena modifiers;
- card unlocks;
- dialogue facts;
- moral follow-up choices;
- remaining time;
- teammate combat synchronization status.

The next integration step is for `game.html` to consume this payload through a shared run-state adapter instead of treating the search page as a linked prototype.

## Validation

`npm run validate:search` verifies:

- scene metadata;
- positive duration and capacity;
- unique object IDs;
- normalized hitboxes inside image bounds;
- morality severity and prompts;
- normalized consequence identifiers;
- enough target objects to fill the configured capacity.
