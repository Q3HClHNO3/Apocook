# Apocook Content Workflow

This workflow keeps Apocook safe to edit as a static frontend. Do not add a build step, rename existing page folders, or delete old data files during routine content updates.

## Add One Recipe

Standard flow:

1. Confirm or add ingredients in `data/ingredients.json`.
2. Add the recipe in `data/recipes.json`.
3. Add city route stops in `data/cityRoutes.json` for any collectible ingredients.
4. Confirm the related city entry in `data/destinations.json`.
5. Run `node scripts/validateData.js`.
6. Optionally run `node scripts/reportData.js` to review coverage gaps.

## What To Edit

Add a new ingredient:

- Edit `data/ingredients.json`.
- If `inventory` is `collectible`, `fridgeZone` is `travel`, or `requires_collection` is `true`, also add at least one `kind: "ingredient"` stop in `data/cityRoutes.json`.
- Add `defaultShelfLifeDays` and `storageType` so the real-fridge MVP can suggest freshness defaults. Do not add personal purchase dates here.
- Use `data/templates/ingredient.template.json` and `data/templates/city-stop.template.json` as references.

Add a new recipe:

- Edit `data/recipes.json`.
- Reuse existing ingredient ids where possible.
- Add missing ingredient records before referencing them.
- Choose exactly one `category` from `data/recipeCategories.json`: `home_cooking`, `soup`, `dim_sum`, `quick_meal`, or `fusion`.
- Use `data/templates/recipe.template.json` as a reference.

Add a new city:

- Add a city entry under `data/cityRoutes.json.cities`.
- Add or update a destination entry in `data/destinations.json`.
- Use lower-case ids such as `guangzhou`, `hongkong`, or `example_city`.
- Keep old page paths unchanged.

Add a new flight destination:

- Edit `data/destinations.json`.
- Put real ingredient references in `ingredientIds`.
- Put display-only words, moods, draft flavors, flight numbers, or gate labels in `flavorTags` or `displayTags`.
- Do not add display-only tags to `data/ingredients.json` just to satisfy validation.
- Use `data/templates/destination.template.json` as a reference.

## Complete Example

Suppose we add a recipe called `ginger_scallion_noodles`.

1. Confirm ingredients:

```json
{
  "ginger": {
    "id": "ginger",
    "name": "生姜"
  },
  "scallion": {
    "id": "scallion",
    "name": "葱"
  },
  "shahe_rice_noodles": {
    "id": "shahe_rice_noodles",
    "name": "沙河粉"
  }
}
```

2. Add recipe:

```json
{
  "id": "ginger_scallion_noodles",
  "name": "姜葱捞沙河粉",
  "cityId": "guangzhou",
  "category": "quick_meal",
  "method": "炒/煎/炸",
  "tool": "铁镬",
  "description": "用姜葱油和沙河粉做一碟快手家常粉。",
  "ingredients": [
    { "ingredientId": "ginger", "amount": "几片" },
    { "ingredientId": "scallion", "amount": "一小把" },
    { "ingredientId": "shahe_rice_noodles", "amount": "1份" }
  ],
  "steps": [
    "姜切丝，葱切段，沙河粉轻轻抖散。",
    "热锅下油，爆香姜葱。",
    "加入沙河粉快速翻匀，调味后出锅。"
  ],
  "story": "阿婆说姜葱油最会救急，屋企有人饿了，十分钟就能端出一碟热粉。"
}
```

3. Confirm city stops:

```json
{
  "id": "gz_shahe_rice_noodles_01",
  "kind": "ingredient",
  "ingredientId": "shahe_rice_noodles",
  "lat": 23.118035,
  "lng": 113.263107,
  "appearTime": "noon",
  "coordinateStatus": "estimated",
  "locationHint": "广州传统粉面食材采购点位"
}
```

4. Confirm destination:

```json
{
  "id": "guangzhou",
  "cityId": "guangzhou",
  "ingredientIds": ["ginger", "scallion", "dried_shrimp"],
  "flavorTags": ["cantonese_market", "river_morning"]
}
```

5. Validate:

```sh
node scripts/validateData.js
node scripts/reportData.js
```

## 内容创作 Sprint 1 示例

这次内容扩充从 `scripts/reportData.js` 里的 unused ingredients 反推，而不是先新建一批食材。`curry_leaf`、`coconut`、`cheddar` 已经是 travel/collectible 食材，但没有菜谱和城市点位，所以处理顺序是：

1. 先确认三个 ingredientId 真实存在，并只微调旅行来源文案：`curry_leaf` 和 `coconut` 归到 `singapore`，`cheddar` 归到 `london`。
2. 再新增 6 道菜谱，让广府厨房作为主体：椰香咖喱叶滑鸡、椰香莲藕猪骨汤、咖喱叶虾米炒菜心、切达叉烧多士、切达芝士蒸水蛋、切达牛腩焗沙河粉。
3. 给 travel/collectible 食材补 city route stops：新加坡路线收集 `curry_leaf` 和 `coconut`，伦敦路线收集 `cheddar`。
4. 在 `data/destinations.json` 增加 `singapore` 和 `london`，其中 `ingredientIds` 只写真实食材 ID，氛围词放进 `flavorTags` 或 `displayTags`。
5. 最后运行 `node scripts/validateData.js` 和 `node scripts/reportData.js`，确认新增内容没有破坏静态数据契约。

## Sprint 3：广州城市故事地图

广州城市地图可以从单纯的食材采集，扩展成“广府生活 + 城市地标 + 街区记忆”的故事地图。这个 Sprint 只改数据和文档，不新增菜谱、不新增食材，也不改页面逻辑。

- `kind: "ingredient"` stop 是可收集食材点，会进入内容系统里的食材路线和行李箱逻辑。它必须继续引用真实存在的 `ingredientId`。
- `kind: "landmark"` stop 是城市故事点，用来记录西关、茶楼、市场、珠江和现代地标等生活记忆。它不进入行李箱，也不需要 `ingredientId`。
- `narrative` 是未来路线叙事字段，可以把真实存在的 `stopIds` 串成“老城早市线”“珠江午后线”等轻量路线。当前页面不使用这个字段也没关系，它不影响静态页面运行。
- destination 可以用 `highlightStopIds` 或 `landmarkIds` 记录推荐地标；`ingredientIds` 仍然只放真实食材 ID，氛围词放进 `flavorTags` 或 `displayTags`。

## Sprint 4：目的地系统补齐

`data/flights.json` 是 legacy 航班看板数据，保留旧入口和旧展示所需信息；`data/destinations.json` 是未来主要目的地数据；`data/cityRoutes.json` 是城市地图、食材点和地标点位的数据来源。

- 从 `flights.json` 收口时，先找出已有航班但缺少 destination 或 cityRoute 的城市。
- 为每个缺口城市补一个轻量 destination，并用 `flightInfo` 承接旧航班的 `time`、`flight`、`gate`、`status` 和 `statusType`。
- 为每个新 destination 补一个轻量 city route：通常 1-2 个 `kind: "ingredient"` stops，加 1-2 个 `kind: "landmark"` stops 即可。广州是主场，其他城市先不要扩成大地图。
- 旧 `sources` 中不是 ingredient id 的词，例如 `coffee`、`basil`、`miso`、`butter`，应进入 `flavorTags` 或 `displayTags`，不要为了消除 legacy warning 强塞进 `ingredients.json`。
- `ingredientIds` 仍然只放真实存在的食材 ID；如果确实新增旅行食材，要同时补 city route stop，并避免制造 unused ingredient。

## Sprint 5：菜谱分类系统统一

`data/recipeCategories.json` 是菜谱分类的展示元数据，`data/recipes.json[].category` 只能写其中一个 id。

固定分类：

- `home_cooking`: 家常菜，日常餐桌主菜和下饭菜。
- `soup`: 老火汤，煲汤、炖汤和汤水。
- `dim_sum`: 点心，早茶点心、小吃、糕点、包点、蒸点和茶楼意象菜。
- `quick_meal`: 快手菜，步骤简单、时间较短、适合快速完成的菜。
- `fusion`: 融合菜，旅行食材、外来食材或跨地域组合；广府做法加旅行食材也归这里。

`今日餐单` 不是 category，而是用户当天选择结果。`早茶` 可以作为内容主题存在，但分类层面归入 `dim_sum`。旅行融合菜分类层面归入 `fusion`。新增菜谱时必须选择一个 category，不再写旧的中文标签数组。

### 菜谱总览分类展示

阿婆厨房的菜谱总览 modal 会读取 `window.APP_DATA.recipeCategories`，按 `order` 决定分类展示顺序，并使用其中的 `emoji`、`label` 和 `description` 显示中文分类标题。每道菜根据 `recipes.json[].category` 进入对应分组。

如果 `recipeCategories.json` 加载失败，厨房页面会回退到原来的不分组菜谱列表；如果某道菜缺少 category，则归入轻量“其他”分组，避免页面崩溃。顶部分类 chip 只筛选菜谱总览，不改变今日餐单、开火评分、冰箱库存或页面跳转。

## 现实雪柜 MVP

现实雪柜库存是用户在当前浏览器里的 localStorage 状态，key 为 `real_fridge_inventory`。它和游戏库存分开，不写入 `my_luggage`、`pantry_collected`，也不用于解锁旅行食材。

- `ingredients.json` 只存默认保质期和建议存放方式：`defaultShelfLifeDays`、`storageType`。
- `real_fridge_inventory` 才存个人购买记录，例如 `purchaseDate`、`quantity`、`source` 和 `note`。
- 现实库存只存在当前浏览器；清理浏览器缓存或 localStorage 可能导致记录丢失。
- 采购清单可以一键归仓到现实雪柜，并把 `shopping_list` 项标记为 `collected`，但不改变游戏层库存。
- 未来可以做导出/导入或云同步；本阶段不接后端、不接 API、不接 AI 识别。

## Rules Of Thumb

- `ingredientIds` are strong references and must exist in `data/ingredients.json`.
- `flavorTags` and `displayTags` are weak labels and do not need ingredient records.
- `data/templates/` files are examples only. They are not loaded by the pages.
- `scripts/reportData.js` is read-only and never modifies JSON.
- Do not create auto-writing scripts yet; review and edit JSON manually for now.
