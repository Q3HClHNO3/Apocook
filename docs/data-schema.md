# Data Schema

Apocook is a static HTML project. Runtime data is loaded from JSON files through `database.js`; no build step or npm package is required.

## Recipe Data Structure

Recipes live in `data/recipes.json` as an array.

Recommended shape:

```json
{
  "id": "cantonese_steamed_fish",
  "name": "广式清蒸鱼",
  "cityId": "Guangzhou",
  "category": ["粤菜", "家常菜", "蒸菜"],
  "method": "蒸",
  "description": "...",
  "ingredients": [
    {
      "ingredientId": "fresh_sea_bass",
      "amount": "1条"
    }
  ],
  "steps": ["..."],
  "story": "..."
}
```

Required fields enforced by `scripts/validateData.js`:

- `id`
- `name`
- `cityId`
- `category`
- `description`
- `ingredients`
- `steps`
- `story`

Recommended field:

- `method`

Missing `method` is a warning, not a fatal error, so older data can still load.

## Recipe Method Enum

Use one of:

- `蒸`
- `炒/煎/炸`
- `煲/炖`
- `烤`
- `空气炸`
- `煮饭/一锅出`
- `叮`
- `凉拌/白灼`
- `待分类`

## Ingredient Data Structure

Ingredients live in `data/ingredients.json` as an object keyed by ingredient id. The object key must match the internal `id`.

Recommended shape:

```json
{
  "id": "ginger",
  "name": "生姜",
  "emoji": "🫚",
  "type": "food",
  "typeName": "基础香料",
  "fridgeZone": "seasoning",
  "originCity": "Guangzhou",
  "desc": "...",
  "story": "...",
  "visual": {
    "label": "姜",
    "bg": "#e7b85f",
    "fg": "#4e3015"
  }
}
```

## Fridge Zone Enum

- `vegetable`: 蔬菜区
- `meat`: 肉类区
- `seasoning`: 调味料区
- `staple`: 主食/粮油区
- `travel`: 旅行物产区
- `other`: 其他

## CityRoute / Stop Data Structure

City route data lives in `data/cityRoutes.json` under `cities`.

City shape:

```json
{
  "cityId": "guangzhou",
  "displayName": "Guangzhou",
  "title": "Guangzhou 行星聚焦漫游",
  "center": [23.1291, 113.2644],
  "zoom": 13,
  "stops": []
}
```

Ingredient stop shape:

```json
{
  "id": "gz_ginger_01",
  "kind": "ingredient",
  "ingredientId": "ginger",
  "lat": 23.1111,
  "lng": 113.2489,
  "appearTime": "afternoon",
  "coordinateStatus": "estimated",
  "placeName": "",
  "address": "",
  "sourceType": "",
  "sourceNote": ""
}
```

`coordinateStatus` values:

- `estimated`: 临时估算点位
- `verified`: 真实校核点位

Future real markets, neighborhoods, old shops, and production places can add:

- `placeName`
- `address`
- `sourceType`
- `sourceNote`

## Flight Data Structure

Flights live in `data/flights.json` as an array. Each flight should include:

- `id`
- `time`
- `city.en`
- `city.zh`
- `flight`
- `gate`
- `status.en`
- `status.zh`
- `statusType`

## FlightGallery City Data

FlightGallery data lives in `FlightGallery-Airplane/cityData.json`.

Each destination should include:

- `id`
- `city`
- `label`
- `code`
- `flight`
- `photos`
- `guide`
- `ingredientIds`
- `decision`

`ingredientIds` should reference `data/ingredients.json`. Missing gallery ingredients are warnings because gallery copy can be drafted before ingredient records are finalized.
