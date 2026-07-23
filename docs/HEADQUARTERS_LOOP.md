# Instituto Travessia Headquarters Loop

The headquarters is now the primary entry and return point for the playable prototype. It is intentionally implemented as a browser interface rather than a 3D social space so the economy, route-selection, persistence, and progression contracts can stabilize before final environment art is introduced.

## Current loop

1. Open the Instituto Travessia headquarters.
2. Review the field profile, rank, scrip, run statistics, and archive totals.
3. Select a route from the route board.
4. Generate a deterministic local map and an independently seeded remote map.
5. Review the generated contract in the mission briefing.
6. Run the mission, recover objects, survive or exploit the interlace, and extract.
7. Receive contract and route accounting.
8. File recovered objects into the archive.
9. Sell stored objects, buy back retained objects, or purchase permanent permissions.
10. Authorize another route.

## Route board

The route board currently provides six deterministic parameter profiles:

- The Recife Ledger
- Luanda Night Line
- The Glass Office in Maputo
- Porto Reliquary
- The Weather Room in Praia
- The Return Desk in Macau

A route defines its seed prefix, local room count, loop probability, safe-window duration, risk display, and payout multiplier. The named locations are gameplay frameworks, not completed cultural environment kits. Final location-specific architecture, objects, language, sound, and environmental storytelling remain separate authored work.

## Object archive

Every successfully extracted object receives an archive record containing:

- stable instance ID;
- name and rarity;
- local or remote origin;
- condition;
- appraisal;
- provenance statement;
- local and remote run seeds;
- route identity;
- recovery timestamp;
- storage, sale, or Institute-retention status.

The Institute evaluates each recovered object through a deterministic fifteen-percent retention roll. It can hold no more than fifteen percent of the objects in a filing. Held objects can be purchased back at a premium. Stored objects can be sold for field scrip.

## Permissions desk

Permanent upgrades are represented as institutional permissions. This keeps the progression language inside ABRIR's bureaucratic fiction while exposing clear mechanical effects.

Current permissions affect:

- ability and dodge recovery;
- the pre-interlace safe window;
- remote-object appraisal;
- threshold seizure insurance;
- healing and squad fallback;
- remote-vault payouts;
- Auditor timing and health.

## Persistence boundary

The headquarters currently uses browser local storage through explicit profile and archive modules. The gameplay code does not depend on a remote service. When the backend is introduced, these modules can be replaced by API-backed repositories without rewriting the headquarters UI, route generator, combat simulation, or map renderer.

## Art boundary

The headquarters includes only procedural interface treatment and two small vector marks:

- Instituto Travessia seal;
- A Chave Geral audit mark.

Character models, character portraits, final faction logos, room concept art, animation, and location art are deliberately excluded from this implementation pass.
