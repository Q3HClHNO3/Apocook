#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

let errorCount = 0;
let warningCount = 0;

function readJson(relativePath, fallback) {
  const fullPath = path.join(ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    errorCount += 1;
    console.error(`❌ 无法读取 ${relativePath}：${error.message}`);
    return fallback;
  }
}

function normalizeCityKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/_/g, "");
}

function normalizeRecipes(rawRecipes) {
  if (Array.isArray(rawRecipes)) return rawRecipes;
  if (rawRecipes && Array.isArray(rawRecipes.recipes)) return rawRecipes.recipes;
  return [];
}

function normalizeIngredients(rawIngredients) {
  if (Array.isArray(rawIngredients)) {
    return rawIngredients.reduce((acc, ingredient) => {
      const id = ingredient?.id || ingredient?.ingredientId;
      if (id) acc[id] = ingredient;
      return acc;
    }, {});
  }

  return rawIngredients && typeof rawIngredients === "object" ? rawIngredients : {};
}

function getRecipeIngredientIds(recipe) {
  const fromRequired = Array.isArray(recipe.required_ingredients)
    ? recipe.required_ingredients
    : [];
  const fromIngredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((item) => typeof item === "string" ? item : item?.ingredientId || item?.id)
    : [];

  return [...fromRequired, ...fromIngredients].filter(Boolean);
}

function reportError(message) {
  errorCount += 1;
  console.error(`❌ ${message}`);
}

function reportWarning(message) {
  warningCount += 1;
  console.warn(`⚠️ ${message}`);
}

const recipesRaw = readJson("data/recipes.json", []);
const ingredientsRaw = readJson("data/ingredients.json", {});
const cityRoutes = readJson("data/cityRoutes.json", { cities: {} });
const flights = readJson("data/flights.json", []);

const recipes = normalizeRecipes(recipesRaw);
const ingredients = normalizeIngredients(ingredientsRaw);
const ingredientIds = new Set(Object.keys(ingredients));
const cities = cityRoutes.cities || {};

recipes.forEach((recipe) => {
  getRecipeIngredientIds(recipe).forEach((ingredientId) => {
    if (!ingredientIds.has(ingredientId)) {
      reportError(`菜谱「${recipe.name || recipe.title || recipe.id}」引用了不存在的食材：${ingredientId}`);
    }
  });
});

Object.entries(cities).forEach(([cityName, city]) => {
  (city.stops || []).forEach((stop) => {
    const kind = stop.kind || "ingredient";

    if (kind === "ingredient") {
      if (!stop.ingredientId) {
        reportError(`城市 ${cityName} 的 stop ${stop.id || "(无 id)"} 缺少 ingredientId`);
        return;
      }

      if (!ingredientIds.has(stop.ingredientId)) {
        reportError(`城市 ${cityName} 的 stop ${stop.id || "(无 id)"} 引用了不存在的食材：${stop.ingredientId}`);
      }
      return;
    }

    if (kind === "landmark") {
      const missingFields = ["id", "name", "lat", "lng"].filter((field) => stop[field] === undefined || stop[field] === "");
      if (missingFields.length) {
        reportWarning(`城市 ${cityName} 的 landmark stop ${stop.id || "(无 id)"} 缺少字段：${missingFields.join("、")}`);
      }
    }
  });
});

const cityLookup = new Set();
Object.entries(cities).forEach(([cityName, city]) => {
  [
    cityName,
    city.cityId,
    city.displayName,
    city.title
  ].forEach((value) => {
    const key = normalizeCityKey(value);
    if (key) cityLookup.add(key);
  });
});

(Array.isArray(flights) ? flights : []).forEach((flight) => {
  const cityName = flight.city?.en || flight.city?.zh || flight.id;
  if (!cityLookup.has(normalizeCityKey(cityName))) {
    reportWarning(`flights.json 中的城市 ${cityName} 在 cityRoutes.json 中没有对应城市。`);
  }
});

console.log("数据校验完成：");
console.log(`- 菜谱数量：${recipes.length}`);
console.log(`- 食材数量：${ingredientIds.size}`);
console.log(`- 城市数量：${Object.keys(cities).length}`);
console.log(`- 航班数量：${Array.isArray(flights) ? flights.length : 0}`);
console.log(`- 错误：${errorCount}`);
console.log(`- 警告：${warningCount}`);

if (errorCount === 0) {
  console.log("✅ 数据关系通过校验。");
} else {
  process.exitCode = 1;
}
