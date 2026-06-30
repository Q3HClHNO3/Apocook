# Apocook Data Contract

This contract documents the static JSON data used by Apocook. The project remains a static frontend: pages load JSON directly from the repository, with no React/Vite/build step required.

## Scope

Current authoritative runtime files:

- `data/ingredients.json`
- `data/recipeCategories.json`
- `data/recipes.json`
- `data/cityRoutes.json`

Primary destination file:

- `data/destinations.json`

Legacy fallback file:

- `data/flights.json`
- `FlightGallery-Airplane/cityData.json`

`data/destinations.json` is the formal city-entry source for the flight board and flight gallery. Add or expand travel entry points there first.

`data/cityRoutes.json` is the map-content source. It owns the city map payload, route center/zoom, and ingredient stops that make a city playable.

`data/flights.json` is a legacy fallback for `SearchMap-City/flightBoard.html` only. It is retained so the static page can still show old rows if `destinations` is missing or empty, but it is no longer the primary expansion entry. `FlightGallery-Airplane/cityData.json` remains as a legacy gallery fallback so old static paths keep working while the project transitions.

## ID Rules

- IDs are stable strings and should not be renamed casually because localStorage, sessionStorage, URL params, and cross-file references may depend on them.
- `ingredientId` must match a key in `data/ingredients.json`.
- `destination.cityRouteId` must resolve to a key or `cityId` in `data/cityRoutes.json.cities`. `cityMapId` is accepted as a legacy alias, but new data should write `cityRouteId`.
- City matching is case-insensitive for existing legacy values like `Guangzhou` vs `guangzhou`, but new data should prefer the city route key style, for example `guangzhou`.

## ingredients

File: `data/ingredients.json`

Root shape: object keyed by ingredient id.

```json
{
  "ginger": {
    "id": "ginger",
    "name": "生姜",
    "emoji": "🫚",
    "type": "food",
    "typeName": "基础香料",
    "fridgeZone": "seasoning",
    "originCity": "Guangzhou",
    "desc": "去腥提香...",
    "story": "阿婆切姜...",
    "defaultShelfLifeDays": 21,
    "storageType": "fridge",
    "source": "market",
    "inventory": "collectible",
    "requires_collection": true,
    "locked": true
  }
}
```

Required fields:

- `id`: string. Must equal the object key.
- `name`: string. Display name.

Recommended fields:

- `emoji`: string. Small visual marker.
- `type`: string. Current values commonly use `food`.
- `typeName`: string. Human-readable ingredient group.
- `fridgeZone`: string. Suggested values: `vegetable`, `meat`, `seasoning`, `staple`, `travel`, `other`.
- `originCity`: string. City/source label for tracing.
- `desc`: string. Short description.
- `story`: string. Narrative copy.
- `defaultShelfLifeDays`: number. Default real-fridge shelf life in days. This is only a default for user state, not a purchase record.
- `storageType`: string. Suggested storage location. Allowed values: `fridge`, `freezer`, `pantry`, `room_temp`.
- `source`: string. Current values include `market` and `pantry`.
- `inventory`: string. Current values include `collectible` and `fridge`.
- `requires_collection`: boolean. Whether map collection is expected.
- `locked`: boolean. Whether initially locked in the kitchen.

## recipes

File: `data/recipes.json`

Root shape: array of recipe objects.

```json
{
  "id": "cantonese_steamed_fish",
  "name": "广式清蒸鱼",
  "cityId": "Guangzhou",
  "category": "home_cooking",
  "method": "蒸",
  "tool": "铁镬+蒸架",
  "description": "在广州吃鱼...",
  "ingredients": [
    {
      "ingredientId": "fresh_bream",
      "amount": "1条"
    }
  ],
  "steps": ["鱼清洗干净..."],
  "story": "阿婆常说..."
}
```

Required fields:

- `id`: string. Stable recipe id.
- `name`: string. Display name.
- `cityId`: string. Should resolve to `data/cityRoutes.json.cities`.
- `category`: string. Must be one id from `data/recipeCategories.json`.
- `description`: string.
- `ingredients`: array.
- `ingredients[].ingredientId`: string. Must exist in `data/ingredients.json`.
- `ingredients[].amount`: string. Human-readable amount.
- `steps`: string array.
- `story`: string.

Recommended fields:

- `method`: string. Current values include `蒸`, `炒/煎/炸`, `煲/炖`, `烤`, `空气炸`, `煮饭/一锅出`, `叮`, `凉拌/白灼`, `待分类`.
- `tool`: string. Cooking tool label.

### Recipe categories

File: `data/recipeCategories.json`

Root shape: array of category objects.

```json
[
  {
    "id": "home_cooking",
    "label": "家常菜",
    "emoji": "🍚",
    "description": "阿婆日常餐桌上的下饭菜。",
    "order": 1
  }
]
```

Current fixed category ids:

- `home_cooking`: 家常菜. Daily table dishes, steamed fish, braised meat, regular rice dishes.
- `soup`: 老火汤. Slow soups, stew-like soups, and soup-water recipes.
- `dim_sum`: 点心. Morning tea, small bites, cakes, buns, steamed dim sum, and teahouse-themed dishes.
- `quick_meal`: 快手菜. Simple dishes suited to fast cooking, including quick stir-fries, poached dishes, steamed egg, and simple noodles or rice.
- `fusion`: 融合菜. Travel ingredients, external ingredients, or cross-regional combinations, including Cantonese methods with travel ingredients.

`今日餐单` is not a recipe category. It is the user's current-day selection state. `早茶` can be a theme in copy, but category-level dim sum recipes should use `dim_sum`. Travel fusion recipes should use `fusion`.

## cityRoutes

File: `data/cityRoutes.json`

Root shape:

```json
{
  "cities": {
    "guangzhou": {
      "cityId": "guangzhou",
      "displayName": "Guangzhou",
      "title": "Guangzhou 行星聚焦漫游",
      "center": [23.1291, 113.2644],
      "zoom": 13,
      "stops": []
    }
  }
}
```

City required fields:

- `cityId`: string. Should match the city key.
- `displayName`: string.
- `title`: string.
- `center`: array with two numbers: `[lat, lng]`.
- `zoom`: number.
- `stops`: array.

Stop shape for ingredient stops:

```json
{
  "id": "gz_ginger_01",
  "kind": "ingredient",
  "ingredientId": "ginger",
  "lat": 23.11555,
  "lng": 113.2389,
  "appearTime": "morning",
  "coordinateStatus": "real",
  "locationHint": "荔湾西关街市片区..."
}
```

Ingredient stop required fields:

- `id`: string.
- `kind`: string. Use `ingredient` for ingredient collection points.
- `ingredientId`: string. Required when `kind` is `ingredient`; must exist in `data/ingredients.json`.
- `lat`: number.
- `lng`: number.

Recommended fields:

- `appearTime`: string. Current values include `morning`, `noon`, `afternoon`.
- `coordinateStatus`: string. Current data uses `real`; older docs may mention `estimated` or `verified`.
- `locationHint`: string. Human-readable sourcing or location note.
- `placeName`, `address`, `sourceType`, `sourceNote`: optional future verification fields.

## destinations

Primary file: `data/destinations.json`

Legacy fallback: `FlightGallery-Airplane/cityData.json`

This is the primary data source for the flight board and flight gallery city entry list. Each destination can appear as an airport-board row through `flightInfo`, and can jump into the map only when its `cityRouteId` exists in `data/cityRoutes.json.cities`.

Root shape:

```json
{
  "generatedAt": "2026-06-29",
  "source": "data/destinations.json",
  "destinations": []
}
```

Destination shape:

```json
{
  "id": "guangzhou",
  "cityId": "guangzhou",
  "cityMapId": "guangzhou",
  "cityRouteId": "guangzhou",
  "city": "Guangzhou",
  "label": "广州",
  "code": "CAN",
  "flight": "珠江晨光航线",
  "flightInfo": {
    "time": "11:25",
    "flightNumber": "CZ352",
    "gate": "E15",
    "status": {
      "en": "Gate Open",
      "zh": "登机口开"
    },
    "statusType": "open"
  },
  "background": "radial-gradient(...)",
  "photos": ["https://..."],
  "guide": ["从西关街市开始找家常香气"],
  "ingredientIds": ["ginger", "scallion"],
  "flavorTags": ["cantonese_market", "white_pepper"],
  "displayTags": ["CZ352", "Gate E15"],
  "decision": "点击舷窗进入广州城市地图..."
}
```

Required fields:

- `id`: string. Stable destination id.
- `cityId`: string. Canonical lower-case city id.
- `cityRouteId`: string. Canonical map route id. Must resolve to `data/cityRoutes.json.cities`.
- `city`: string. Display/source city label.
- `label`: string. UI label.
- `code`: string. Airport-like short code.
- `flight`: string. Route label shown in FlightGallery.
- `photos`: string array.
- `guide`: string array.
- `ingredientIds`: string array. Strong references. Every value must exist in `data/ingredients.json`.
- `decision`: string. CTA/help copy.

Recommended fields:

- `cityMapId`: string. Legacy alias for `cityRouteId`; currently accepted when jumping to `SearchMap-City/citymap.html?city=...`.
- `flightInfo`: object. Optional structured flight-board metadata copied from legacy `data/flights.json`.
- `flightInfo.time`: string.
- `flightInfo.flightNumber`: string.
- `flightInfo.gate`: string.
- `flightInfo.status.en`: string.
- `flightInfo.status.zh`: string.
- `flightInfo.statusType`: string.
- `background`: string. CSS background value used by the current visual design.
- `flavorTags`: string array. Weak display/atmosphere tags. These are not ingredient ids and are not required to exist in `data/ingredients.json`.
- `displayTags`: string array. Weak UI/search tags such as flight numbers, gates, or draft flavor words. These are not ingredient ids and are not required to exist in `data/ingredients.json`.

Use lower-case city ids in new destination data, for example `guangzhou` and `hongkong`. Legacy values such as `Guangzhou` and `HongKong` remain supported by the page fallback and city-map matching code.

## flights

File: `data/flights.json`

`flights` is legacy fallback data for `SearchMap-City/flightBoard.html`. The flight board now prefers `window.APP_DATA.destinations` from `data/destinations.json`; it reads `data/flights.json` only when destinations are missing or empty. Do not use this file as the main way to add new cities.

Root shape: array.

```json
{
  "id": "hongkong",
  "time": "11:20",
  "city": {
    "en": "Hong Kong",
    "zh": "香港"
  },
  "flight": "CX801",
  "gate": "E8",
  "status": {
    "en": "Boarding",
    "zh": "正在登机"
  },
  "statusType": "boarding",
  "sources": ["white_pepper", "scallion"]
}
```

Required fields:

- `id`: string.
- `time`: string.
- `city.en`: string.
- `city.zh`: string.
- `flight`: string.
- `gate`: string.
- `status.en`: string.
- `status.zh`: string.
- `statusType`: string.

Recommended fields:

- `cityRouteId` or `cityMapId`: string. Legacy rows should include one when possible so map jumps can use `citymap.html?city=<cityRouteId>`.
- `sources`: string array. Legacy matching/display values. Some entries are real ingredient ids, while older entries such as `black_pepper`, `cheese`, or `coffee` may only be atmosphere/display tags. New destination data should separate these into `ingredientIds` for strong ingredient references and `flavorTags`/`displayTags` for weak labels.

When a destination or legacy flight has no matching `cityRoutes.cities` entry, the flight board may still render it as `Coming Soon / 即将开放`, but clicking it should not navigate into an empty map.

## Validation

Validation has three levels:

- Strong validation errors: data would break runtime references or loading. Examples include invalid JSON, duplicate or missing ids, recipe/city route/destination `ingredientId` references that do not exist, or required root shapes that are wrong.
- Weak labels: display-only values such as `flavorTags` and `displayTags`. These are not ingredient references and are not checked against `data/ingredients.json`.
- Warnings: content quality or coverage gaps. Examples include unused ingredients, collectible ingredients without route stops, recipes with sparse content, destinations without ingredient ids, destinations whose `cityRouteId`/`cityMapId` has no matching city route, legacy flights without destinations, legacy flights without city routes, or route stops whose ingredients lack `desc`/`story`.

`ingredientId` and `ingredientIds` are strong references. They must exist in `data/ingredients.json`.

`flavorTags` and `displayTags` are weak labels. They are useful for mood, search, future display copy, draft flavors, flight numbers, or gate labels, and do not need ingredient records.

Run:

```sh
node scripts/validateData.js
```

In this local Codex workspace, if `node` is not on PATH, use:

```sh
/Users/q/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/validateData.js
```

The validator checks cross-file references only. It does not rewrite data and does not remove legacy files.

## Templates And Reports

Creative templates live in `data/templates/`:

- `ingredient.template.json`
- `recipe.template.json`
- `city-stop.template.json`
- `destination.template.json`

Templates are reference files only. They are not loaded by the pages and should not be treated as runtime data.

Run `node scripts/reportData.js` for a read-only project overview. It reports counts, flight board available-city coverage, destinations with and without city routes, legacy flights without destinations, fridge-zone distribution, recipe category distribution, recipe method distribution, unused ingredients, missing city route stops, and recipes with missing content. It never modifies JSON.

## Runtime State Helpers

Apocook keeps runtime state in browser storage so the project can stay fully static.

`AppStorage` lives in `scripts/storage.js` and is responsible for raw `localStorage` reads and writes:

- `my_luggage`
- `pantry_collected`
- `today_menu`
- `shopping_list`

`AppRealFridge` lives in `scripts/realFridge.js` and owns the user's real-world fridge inventory:

- `real_fridge_inventory`

Shape:

```json
[
  {
    "ingredientId": "choi_sum",
    "quantity": 1,
    "unit": "把",
    "purchaseDate": "2026-06-29",
    "shelfLifeDays": 3,
    "source": "manual",
    "note": ""
  }
]
```

`real_fridge_inventory` is local browser state only. It is separate from game inventory (`my_luggage` and `pantry_collected`) and should not be used to unlock travel ingredients. Clearing browser storage can erase this real-fridge inventory. Future export/import or cloud sync can build on this state, but this static MVP does not add backend sync, APIs, or AI recognition.

`ingredients.json` stores default shelf-life metadata (`defaultShelfLifeDays`, `storageType`) only. It must never store a user's personal purchase date or real fridge contents.

`AppInventory` lives in `scripts/inventory.js` and is responsible for shared inventory and shopping-list business logic:

- merging luggage and pantry collection state into an owned ingredient set
- checking whether an ingredient is already owned
- reading shopping targets
- syncing shopping-list item statuses to `needed` or `collected`
- summarizing shopping-list progress
- returning luggage to pantry before navigating back to the kitchen
- removing or clearing luggage items

Page scripts should keep their own UI rendering and interaction details. `ApoCHEF-Kitchen/kitchen.js`, `SearchMap-City/citymap.js`, and `FlightGallery-Airplane/FlightGallery.js` should call `AppInventory` for shared inventory facts, then render their own fridge, map, modal, button, animation, and navigation behavior locally.
