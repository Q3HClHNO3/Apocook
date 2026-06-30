# Recipe Entry Workflow

Use this process before batch-entering new recipes.

1. The user provides natural language or markdown recipes.
2. AI organizes the input into the `data-input/recipeBatchTemplate.json` format.
3. Codex reviews the batch and generates or updates:
   - `data/recipes.json`
   - `data/ingredients.json`
   - `data/cityRoutes.json`
4. New ingredient city stops default to `coordinateStatus: "estimated"`.
5. New ingredients get a default `fridgeZone` based on ingredient type:
   - vegetables, fruits, roots: `vegetable`
   - meat, fish, eggs, bones: `meat`
   - sauces, oils, spices, dry seasoning goods: `seasoning`
   - noodles, rice, grains, staple carbs: `staple`
   - travel-only unlocked products: `travel`
   - unclear cases: `other`
6. After each merge, run:

```bash
node scripts/validateData.js
```

7. If there are fatal errors, fix them before using or committing the data.
8. If there are only warnings, the app can run, but the warnings should be listed in the handoff report.

Recommended order for a 20-recipe batch:

1. Normalize recipe names, categories, methods, descriptions, steps, and stories.
2. Reuse existing ingredient ids where possible.
3. Add missing ingredients with `id`, `name`, `emoji`, `type`, `typeName`, `fridgeZone`, `originCity`, and `desc`.
4. Add estimated city stops for newly introduced collectible ingredients.
5. Run validation.
6. Open the five static entry pages and confirm there are no console errors.
