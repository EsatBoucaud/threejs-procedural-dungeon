# ABRIR Next Tasks

Keep this list to ten items or fewer. Each task should produce one verifiable result.

1. **Add CI.** Run map generation, map validation, search-scene validation, and the production build on every `abrir-mvp` push.
2. **Add a browser smoke test.** Verify that `index.html`, `game.html`, and `search.html` load without uncaught errors and that required JSON/assets resolve.
3. **Commit one approved hidden-room illustration.** Wire it to the existing normalized hitbox scene data without changing game logic.
4. **Integrate supplied Sócrates art.** Replace only the current placeholder portrait/full-body layer through a central asset manifest.
5. **Integrate supplied Zélia art.** Follow the same manifest and preserve code paths used by Sócrates.
6. **Resolve the tactical experiment.** After testing, decide whether the card encounter becomes a rare room, becomes a command layer, or is removed.
7. **Harden real-time combat.** Separate movement, attacks, cooldowns, damage, partner AI, and encounter state into testable modules.
8. **Implement a run-state adapter.** Store current run, recovered objects, consequences, and extraction result locally behind an interface suitable for later server replacement.
9. **Add controller input.** Provide a first gamepad mapping without removing keyboard/mouse controls.
10. **Prepare static staging deployment.** Publish the built branch so every change can be tested from a browser before server/backend work.
