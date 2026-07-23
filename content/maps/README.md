# ABRIR Maps

Generated map snapshots belong in:

```text
content/maps/generated/
```

Each committed map must:

- use schema version 1;
- preserve its Three.js generator seed and parameters;
- pass `npm run validate:maps`;
- remain unchanged after gameplay tuning unless the geometry itself is intentionally regenerated;
- keep authored encounter and interlacing overrides inside the `gameplay` object.

Do not hand-edit generated geometry arrays. Regenerate the map from the recorded seed or change only the gameplay overlay.
