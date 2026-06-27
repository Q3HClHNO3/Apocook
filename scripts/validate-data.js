#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const files = {
  recipes: "data/recipes.json",
  ingredients: "data/ingredients.json",
  cityRoutes: "data/cityRoutes.json",
  flights: "data/flights.json",
  gallery: "FlightGallery-Airplane/cityData.json"
};

const fatalErrors = [];
const warnings = [];

function addFatal(message) {
  fatalErrors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function readJson(label, relativePath, fallback) {
  const absolutePath = path.join(ROOT, relativePath);

  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    addFatal(`${relativePath}: JSON parse/read failed (${error.message})`);
    return fallback;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function requireFields(source, object, fields) {
  fields.forEach((field) => {
    const value = field.split(".").reduce((current, key) => current?.[key], object);
    if (!hasValue(value)) addFatal(`${source}: missing required field "${field}"`);
  });
}

function isArrayField(source, object, field) {
  if (!Array.isArray(object?.[field])) {
    addFatal(`${source}: "${field}" must be an array`);
    return false;
  }
  return true;
}

function countDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  values.filter(hasValue).forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });

  return [...duplicates];
}

const recipes = readJson("recipes", files.recipes, []);
const ingredients = readJson("ingredients", files.ingredients, {});
const cityRoutes = readJson("cityRoutes", files.cityRoutes, { cities: {} });
const flights = readJson("flights", files.flights, []);
const gallery = readJson("gallery", files.gallery, { destinations: [] });

const ingredientEntries = Object.entries(ingredients || {});
const ingredientIds = new Set(ingredientEntries.map(([id]) => id));
const recipeIngredientIds = new Set();
const galleryIngredientIds = new Set();
const flightSourceIngredientIds = new Set();

if (!Array.isArray(recipes)) {
  addFatal(`${files.recipes}: root must be an array`);
}

if (!ingredients || Array.isArray(ingredients) || typeof ingredients !== "object") {
  addFatal(`${files.ingredients}: root must be an object keyed by ingredient id`);
}

ingredientEntries.forEach(([key, ingredient]) => {
  if (ingredient?.id !== key) {
    addFatal(`${files.ingredients}: key "${key}" does not match internal id "${ingredient?.id}"`);
  }
});

countDuplicateValues(ingredientEntries.map(([, ingredient]) => ingredient?.id))
  .forEach((id) => addFatal(`${files.ingredients}: duplicate ingredient id "${id}"`));

if (Array.isArray(recipes)) {
  countDuplicateValues(recipes.map((recipe) => recipe?.id))
    .forEach((id) => addFatal(`${files.recipes}: duplicate recipe id "${id}"`));

  recipes.forEach((recipe, index) => {
    const source = `${files.recipes}[${index}]${recipe?.id ? ` (${recipe.id})` : ""}`;
    requireFields(source, recipe, [
      "id",
      "name",
      "cityId",
      "category",
      "description",
      "ingredients",
      "steps",
      "story"
    ]);

    if (!recipe?.method) {
      addWarning(`${source}: missing recommended field "method"`);
    }

    isArrayField(source, recipe, "category");
    if (isArrayField(source, recipe, "ingredients")) {
      recipe.ingredients.forEach((item, ingredientIndex) => {
        const ingredientId = item?.ingredientId;
        if (!ingredientId) {
          addFatal(`${source}.ingredients[${ingredientIndex}]: missing ingredientId`);
          return;
        }

        recipeIngredientIds.add(ingredientId);
        if (!ingredientIds.has(ingredientId)) {
          addFatal(`${source}: references missing ingredient "${ingredientId}"`);
        }
      });
    }
    isArrayField(source, recipe, "steps");
  });
}

let cityStopCount = 0;
const cities = cityRoutes?.cities || {};
if (!cityRoutes?.cities || typeof cityRoutes.cities !== "object" || Array.isArray(cityRoutes.cities)) {
  addFatal(`${files.cityRoutes}: root must contain a "cities" object`);
}

Object.entries(cities).forEach(([cityKey, city]) => {
  const source = `${files.cityRoutes}.cities.${cityKey}`;
  requireFields(source, city, ["cityId", "displayName", "title", "center", "zoom", "stops"]);
  if (isArrayField(source, city, "center") && city.center.length !== 2) {
    addFatal(`${source}: "center" must contain [lat, lng]`);
  }
  if (isArrayField(source, city, "stops")) {
    cityStopCount += city.stops.length;
    city.stops.forEach((stop, index) => {
      const stopSource = `${source}.stops[${index}]${stop?.id ? ` (${stop.id})` : ""}`;
      if (stop?.kind === "ingredient" || stop?.ingredientId) {
        if (!stop?.ingredientId) {
          addFatal(`${stopSource}: ingredient stop missing ingredientId`);
        } else if (!ingredientIds.has(stop.ingredientId)) {
          addFatal(`${stopSource}: references missing ingredient "${stop.ingredientId}"`);
        }
      }
    });
  }
});

if (!Array.isArray(flights)) {
  addFatal(`${files.flights}: root must be an array`);
} else {
  flights.forEach((flight, index) => {
    requireFields(`${files.flights}[${index}]${flight?.id ? ` (${flight.id})` : ""}`, flight, [
      "id",
      "time",
      "city.en",
      "city.zh",
      "flight",
      "gate",
      "status.en",
      "status.zh",
      "statusType"
    ]);
    (flight.sources || []).forEach((sourceId) => {
      if (ingredientIds.has(sourceId)) {
        flightSourceIngredientIds.add(sourceId);
      }
    });
  });
}

if (!Array.isArray(gallery?.destinations)) {
  addFatal(`${files.gallery}: "destinations" must be an array`);
} else {
  gallery.destinations.forEach((destination, index) => {
    const source = `${files.gallery}.destinations[${index}]${destination?.id ? ` (${destination.id})` : ""}`;
    requireFields(source, destination, [
      "id",
      "city",
      "label",
      "code",
      "flight",
      "photos",
      "guide",
      "ingredientIds",
      "decision"
    ]);
    isArrayField(source, destination, "photos");
    isArrayField(source, destination, "guide");
    if (isArrayField(source, destination, "ingredientIds")) {
      destination.ingredientIds.forEach((ingredientId) => {
        galleryIngredientIds.add(ingredientId);
        if (!ingredientIds.has(ingredientId)) {
          addWarning(`${source}: gallery ingredient "${ingredientId}" is not in ${files.ingredients}`);
        }
      });
    }
  });
}

ingredientEntries.forEach(([id]) => {
  const isUsed =
    recipeIngredientIds.has(id) ||
    galleryIngredientIds.has(id) ||
    flightSourceIngredientIds.has(id);

  if (!isUsed) {
    addWarning(`${files.ingredients}: ingredient "${id}" is not used by any recipe, gallery destination, or flight source`);
  }
});

const summary = {
  recipes: Array.isArray(recipes) ? recipes.length : 0,
  ingredients: ingredientEntries.length,
  cityStops: cityStopCount,
  flights: Array.isArray(flights) ? flights.length : 0,
  galleryDestinations: Array.isArray(gallery?.destinations) ? gallery.destinations.length : 0
};

function printSection(title, items, emptyText) {
  console.log(`\n${title}`);
  if (!items.length) {
    console.log(`  ${emptyText}`);
    return;
  }
  items.forEach((item) => console.log(`  - ${item}`));
}

printSection("fatal errors", fatalErrors, "none");
printSection("warnings", warnings, "none");
console.log("\nsummary");
Object.entries(summary).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

if (fatalErrors.length) {
  process.exitCode = 1;
}
