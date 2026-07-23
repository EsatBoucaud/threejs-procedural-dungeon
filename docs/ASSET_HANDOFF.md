# ABRIR Asset Handoff

The user will supply individual character images. This document defines how those files enter the project without coupling gameplay code to temporary filenames or dimensions.

## Character asset IDs

Initial playable characters:

- `socrates`
- `zelia`
- `lia`
- `chilindo`

The masked character should remain identified as **Kindred** in narrative-facing material unless the current character list is intentionally revised.

Antagonist and faction art should use the same lowercase-kebab naming rule.

## Preferred file package per character

```text
public/assets/characters/<character-id>/
├── portrait.webp
├── full-body.webp
├── combat-idle.webp
├── silhouette.webp
└── metadata.json
```

Only `portrait.webp` and `full-body.webp` are required for the first integration pass. Additional files can arrive later.

## Image requirements

### Portrait

- Square or 4:5 composition.
- Face and identifying silhouette remain readable at 96–160 px.
- Transparent background preferred.
- No printed name, role label, border, rarity frame, or UI baked into the image.

### Full body

- Transparent background.
- Entire silhouette visible with breathing room around hands, hair, weapons, and clothing.
- Neutral or lightly expressive standing pose.
- Do not crop the feet.
- Avoid perspective so extreme that later animation or sprite derivation becomes difficult.

### Combat idle

- Optional for the MVP.
- Clear facing direction.
- Weapon/tool placement consistent with the kit.
- Leave enough limb separation for later animation segmentation.

## File formats

- Preferred runtime format: WebP with transparency.
- Accepted source formats: PNG, PSD, TIFF, or high-quality WebP.
- Keep source art outside generated build folders.
- Do not convert small source files repeatedly; retain the highest-quality original supplied.

## Metadata contract

Example:

```json
{
  "id": "socrates",
  "displayName": "Sócrates",
  "faction": "instituto-travessia",
  "combatRole": "ranged-medic",
  "portrait": "/assets/characters/socrates/portrait.webp",
  "fullBody": "/assets/characters/socrates/full-body.webp",
  "status": "provided"
}
```

`status` may be `placeholder`, `provided`, `approved`, or `deprecated`.

## Integration rule

Gameplay code loads characters through metadata or a central manifest. It must not scatter hard-coded image paths across components.

The first art-integration task should replace only the placeholder portrait/silhouette layer. It should not simultaneously alter character balance, combat logic, UI layout, or map generation.

## Search-room artwork

Hidden-room scenes use a separate contract:

```text
public/assets/search-scenes/<scene-id>/scene.webp
content/search-scenes/<scene-id>.json
```

The illustration contains no UI. Interactions live in JSON as normalized hitboxes so the art can be revised without rewriting the search system.
