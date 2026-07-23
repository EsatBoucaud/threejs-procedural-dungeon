# Project State

## Current branch

`abrir/aggressive-expansion-01`

## Working now

- Deterministic map generation, validation, committed states, browser generation, and JSON export.
- Three.js room, corridor, portal, prop, lighting, hazard, shrine, entity, projectile, and interlace rendering.
- Fixed action camera and live generated-map minimap.
- Four switchable playable kits: **Sócrates, Zélia, Lia, and Kindred**.
- Separate squad health pools, fallback control, active abilities, dodges, traits, healing, pierce, stagger, weakening, knockback, and phase movement.
- Pursuer, gunner, elite, vault, interlaced, and Auditor hostile processes.
- A dynamic threat director that escalates waves and can route The Auditor into the run.
- Room clearing, physical loot collection, named objects, market values, and shrine permissions.
- Deterministic environmental anomalies with damage and movement penalties.
- Field contracts with multi-part objectives, bonuses, risk multipliers, and emergency extraction rates.
- Safe-window timer, interlace transition, second hostile layer, and test trigger.
- Extraction, 15% Institute retention, contract accounting, payout, and local run history.
- Persistent local Institute rank, experience, field scrip, run counts, recovery totals, and best payout.
- Expanded tactical HUD with squad state, cooldowns, contract progress, map attention, boss state, briefing, and debrief.
- Automated project/map validation and GitHub Actions build checks.

## Deliberately temporary

- Primitive character and prop geometry remains in place until the final character-art pipeline lands.
- Approximate room collision and direct enemy navigation are still used.
- Sound is not yet wired.
- Run results and progression use local storage adapters.
- The interlace still uses a transformed subset of the base state rather than a separately generated remote state.
- Gameplay balance values are first-pass and need hands-on tuning.

## Immediate engineering risks

- Wall visuals and navigable openings are not yet fully derived from corridor cuts.
- Enemy navigation can crowd narrow corridors and needs graph-aware steering.
- No automated browser-play test or deterministic combat replay test yet.
- No pause, settings, controller, or mobile-control interface yet.
- Local progression has no migration or backend synchronization layer.
- The director and Auditor encounter need playtesting for pacing, spawn distance, and difficulty.
