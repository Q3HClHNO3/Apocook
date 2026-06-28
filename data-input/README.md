# Data Input

This directory stores raw recipe input and AI-organized intermediate files for future batch entry.

Files here are not read directly by the static pages. Before data becomes part of the app, it should be reviewed and merged into:

- `data/recipes.json`
- `data/ingredients.json`
- `data/cityRoutes.json`

After every merge, run:

```bash
node scripts/validate-data.js
```
