# ABRIR Decisions

## 2026-07-23 — Combat mode belongs to the room

ABRIR will retain both combat prototypes.

- Some rooms use real-time action combat.
- Some rooms use turn-based card combat.
- Exploration, current health, party state, interlacing pressure, recovered value, and extraction remain shared across both modes.
- The saved map gameplay overlay will eventually declare each room's encounter mode explicitly.

The first MVP map currently assigns:

- a shallow generated combat room to the real-time skirmish;
- a deeper elite-capable room to card combat;
- the generated entrance to extraction.

This replaces the incorrect assumption that card combat would supersede real-time combat.

## 2026-07-23 — ABRIR has four co-existing modalities

The full modality set is:

1. arena top-down fighting;
2. hidden-room image searching;
3. card-based tactical combat;
4. text-based dialogue decisions.

They are not isolated minigames. Each modality writes structured consequences that another modality can consume.

Examples now represented in the prototype data:

- taking a power regulator during search can disable arena lighting and increase enemy speed;
- finding a warrant, radio, or phone can unlock cards or tactical information;
- taking medicine, family photographs, or heirlooms changes resident trust and dialogue facts;
- the teammate's arena section defines the search timer;
- all recovered value and moral consequences eventually flow into extraction.

Search images are replaceable presentation assets. Object identity, value, normalized hitbox, morality prompt, and cross-modality consequences live in JSON.

Visible dialogue, choices, item text, and narration remain English-only. Portuguese can be used as skippable audio flavor without requiring Portuguese transcripts or a bilingual interface.
