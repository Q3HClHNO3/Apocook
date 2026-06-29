# Current Data Status

Snapshot after `cantonese_batch_001_reviewed` authority cleanup:

- recipes: 15
- ingredients: 62
- Guangzhou cityStops: 59
- flights: 10
- galleryDestinations: 2

Known warnings:

- none

Next stage:

The current authoritative data is the reviewed 15-dish Cantonese batch. Future recipe batches should start from a new file under `data-input/batches/`, then Codex can merge reviewed entries into `data/recipes.json`, `data/ingredients.json`, and `data/cityRoutes.json`.
