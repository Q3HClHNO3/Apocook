#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INGREDIENTS_PATH = path.join(ROOT, "data", "ingredients.json");
const RECIPES_PATH = path.join(ROOT, "data", "recipes.json");
const CITY_ROUTES_PATH = path.join(ROOT, "data", "cityRoutes.json");

const CITY_PREFIXES = {
  Guangzhou: "gz",
  HongKong: "hk",
  London: "ld",
  Amsterdam: "am",
  Sydney: "sy",
  Paris: "pa",
  Milan: "mi",
  Tokyo: "tk",
  NewYork: "ny",
  Singapore: "sg"
};

const DEFAULT_CITY_CENTERS = {
  Guangzhou: [23.1291, 113.2644],
  HongKong: [22.3193, 114.1694],
  London: [51.5055, -0.0754],
  Amsterdam: [52.3676, 4.9041],
  Sydney: [-33.8688, 151.2093],
  Paris: [48.8566, 2.3522],
  Milan: [45.4642, 9.19],
  Tokyo: [35.6762, 139.6503],
  NewYork: [40.7128, -74.006],
  Singapore: [1.3521, 103.8198]
};

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeCityKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

function normalizeLookupKey(value) {
  return normalizeCityKey(value).toLowerCase().replace(/-/g, "");
}

function toLowerCityId(value) {
  return normalizeCityKey(value).toLowerCase();
}

function cityPrefix(cityId) {
  const key = normalizeCityKey(cityId);
  return CITY_PREFIXES[key] || key.slice(0, 2).toLowerCase() || "ct";
}

function inferRecipeMethod(recipe) {
  if (recipe.method) return recipe.method;
  const text = `${recipe.name || ""} ${recipe.description || ""} ${recipe.category || ""}`;
  if (text.includes("蒸")) return "蒸";
  if (text.includes("炒") || text.includes("煎") || text.includes("炸")) return "炒/煎/炸";
  if (text.includes("煲") || text.includes("炖")) return "煲/炖";
  return "蒸";
}

function normalizeRecipe(inputRecipe) {
  return {
    id: inputRecipe.id,
    name: inputRecipe.name || inputRecipe.title || inputRecipe.id,
    method: inferRecipeMethod(inputRecipe),
    cityId: inputRecipe.cityId || "Guangzhou",
    category: inputRecipe.category || "cantonese",
    description: inputRecipe.description || inputRecipe.story || "",
    ingredients: (inputRecipe.ingredients || [])
      .map((item) => ({
        ingredientId: item.ingredientId,
        amount: item.amount || ""
      }))
      .filter((item) => item.ingredientId),
    steps: inputRecipe.steps || [],
    tips: inputRecipe.tips || ""
  };
}

function normalizeIngredient(rawIngredient, recipeCityId) {
  const id = rawIngredient.id || rawIngredient.ingredientId;
  const originCity = rawIngredient.originCity || rawIngredient.sourceCity || recipeCityId || "Guangzhou";
  const type = rawIngredient.type || "food";

  return {
    id,
    name: rawIngredient.name || rawIngredient.title || id,
    emoji: rawIngredient.emoji || "🍽️",
    type,
    typeName: rawIngredient.typeName || "地道食材",
    category: rawIngredient.category || (type === "food" ? "travel" : undefined),
    origin: rawIngredient.origin || originCity,
    originCity,
    sourceCity: rawIngredient.sourceCity || originCity,
    desc: rawIngredient.desc || rawIngredient.description || "",
    story: rawIngredient.story || rawIngredient.desc || rawIngredient.description || "",
    requires_collection: rawIngredient.requires_collection ?? false,
    locked: rawIngredient.locked ?? false
  };
}

function upsertRecipe(inputRecipe, logs) {
  const recipes = readJson(RECIPES_PATH, []);
  const nextRecipe = normalizeRecipe(inputRecipe);
  const index = recipes.findIndex((recipe) => recipe.id === nextRecipe.id);

  if (index >= 0) {
    recipes[index] = {
      ...recipes[index],
      ...nextRecipe
    };
  } else {
    recipes.push(nextRecipe);
  }

  writeJson(RECIPES_PATH, recipes);
  logs.push(`✅ 已更新菜谱：${nextRecipe.name}`);
  return { count: 1, recipe: nextRecipe };
}

function upsertIngredients(inputIngredients, recipeCityId, logs) {
  const ingredients = readJson(INGREDIENTS_PATH, {});
  let added = 0;
  let updated = 0;

  Object.entries(inputIngredients || {}).forEach(([ingredientId, rawIngredient]) => {
    const nextIngredient = normalizeIngredient({ id: ingredientId, ...rawIngredient }, recipeCityId);
    const existing = ingredients[ingredientId];

    if (existing) {
      const merged = { ...existing };
      ["id", "name", "emoji", "type", "typeName", "category", "origin", "originCity", "sourceCity", "desc", "story"].forEach((field) => {
        if ((merged[field] === undefined || merged[field] === "") && nextIngredient[field] !== undefined) {
          merged[field] = nextIngredient[field];
        }
      });
      if (merged.requires_collection === undefined) merged.requires_collection = nextIngredient.requires_collection;
      if (merged.locked === undefined) merged.locked = nextIngredient.locked;

      const changed = JSON.stringify(merged) !== JSON.stringify(existing);
      ingredients[ingredientId] = merged;
      if (changed) updated += 1;
      logs.push(`✅ 已存在食材，跳过重复新增：${existing.name || nextIngredient.name}`);
      return;
    }

    ingredients[ingredientId] = nextIngredient;
    added += 1;
    logs.push(`✅ 新增食材：${nextIngredient.name}`);
  });

  writeJson(INGREDIENTS_PATH, ingredients);
  return { added, updated };
}

function findCityKey(cities, cityId) {
  const lookup = normalizeLookupKey(cityId);
  return Object.keys(cities).find((key) => normalizeLookupKey(key) === lookup || normalizeLookupKey(cities[key].cityId) === lookup);
}

function makeCity(cityId, firstStop) {
  const key = normalizeCityKey(cityId);
  const center = DEFAULT_CITY_CENTERS[key] || (firstStop ? [firstStop.lat, firstStop.lng] : [0, 0]);
  return {
    cityId: toLowerCityId(cityId),
    displayName: key,
    title: `${key} 行星聚焦漫游`,
    center,
    zoom: 13,
    stops: []
  };
}

function nextStopId(cityId, ingredientId, stops) {
  const prefix = cityPrefix(cityId);
  let index = 1;
  let id = `${prefix}_${ingredientId}_${String(index).padStart(2, "0")}`;

  while (stops.some((stop) => stop.id === id)) {
    index += 1;
    id = `${prefix}_${ingredientId}_${String(index).padStart(2, "0")}`;
  }

  return id;
}

function upsertCityStops(cityStops, logs) {
  const data = readJson(CITY_ROUTES_PATH, { cities: {} });
  data.cities = data.cities || {};
  let added = 0;

  (cityStops || []).forEach((stop) => {
    const cityId = normalizeCityKey(stop.cityId);
    let cityKey = findCityKey(data.cities, cityId);

    if (!cityKey) {
      cityKey = cityId;
      data.cities[cityKey] = makeCity(cityId, stop);
    }

    const city = data.cities[cityKey];
    city.stops = Array.isArray(city.stops) ? city.stops : [];
    if (!city.center && Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) {
      city.center = [stop.lat, stop.lng];
    }
    if (!city.zoom) city.zoom = 13;

    if (city.stops.some((item) => item.ingredientId === stop.ingredientId)) {
      logs.push(`✅ 已存在城市点位，跳过重复新增：${cityKey} / ${stop.ingredientId}`);
      return;
    }

    city.stops.push({
      id: nextStopId(cityKey, stop.ingredientId, city.stops),
      kind: "ingredient",
      ingredientId: stop.ingredientId,
      lat: stop.lat,
      lng: stop.lng,
      appearTime: stop.appearTime || "anytime",
      coordinateStatus: stop.coordinateStatus || "estimated"
    });
    added += 1;
    logs.push(`✅ 已新增城市点位：${cityKey} / ${stop.ingredientId}`);
  });

  writeJson(CITY_ROUTES_PATH, data);
  return { added };
}

function validateRecipesAgainstIngredients() {
  const recipes = readJson(RECIPES_PATH, []);
  const ingredients = readJson(INGREDIENTS_PATH, {});
  return recipes
    .map((recipe) => ({
      recipe: recipe.name || recipe.title || recipe.id,
      missing: (recipe.ingredients || recipe.required_ingredients || [])
        .map((item) => typeof item === "string" ? item : item.ingredientId)
        .filter((id) => id && !ingredients[id])
    }))
    .filter((item) => item.missing.length);
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("用法：node scripts/addRecipeContent.js newRecipeInput.json");
  }

  const input = readJson(path.resolve(process.cwd(), inputPath), null);
  const logs = [];

  const recipeResult = upsertRecipe(input.recipe, logs);
  const ingredientResult = upsertIngredients(input.ingredients, input.recipe?.cityId, logs);
  const stopResult = upsertCityStops(input.cityStops, logs);
  const missing = validateRecipesAgainstIngredients();

  logs.forEach((line) => console.log(line));

  if (missing.length) {
    console.warn("⚠️ 缺失食材引用：");
    missing.forEach((item) => {
      console.warn(`- ${item.recipe}: ${item.missing.join("、")}`);
    });
  }

  console.log("完成：");
  console.log(`- 菜谱：${recipeResult.count} 条`);
  console.log(`- 新增食材：${ingredientResult.added} 条`);
  console.log(`- 更新食材：${ingredientResult.updated} 条`);
  console.log(`- 新增城市点位：${stopResult.added} 条`);

  if (missing.length) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
