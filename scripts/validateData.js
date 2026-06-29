#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const files = {
  ingredients: "data/ingredients.json",
  recipeCategories: "data/recipeCategories.json",
  recipes: "data/recipes.json",
  cityRoutes: "data/cityRoutes.json",
  destinations: "data/destinations.json",
  flights: "data/flights.json",
  cityData: "FlightGallery-Airplane/cityData.json"
};

const errors = [];
const warnings = [];
const allowedStorageTypes = new Set(["fridge", "freezer", "pantry", "room_temp"]);

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readJson(relativePath, fallback, options = {}) {
  const absolutePath = path.join(ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    if (!options.optional) addError(`${relativePath}: file not found`);
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    addError(`${relativePath}: cannot read/parse JSON (${error.message})`);
    return fallback;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function normalizeLooseId(value) {
  return normalizeId(value).replace(/_/g, "");
}

function getAt(object, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], object);
}

function requireFields(source, object, fieldNames) {
  fieldNames.forEach((fieldName) => {
    if (!hasValue(getAt(object, fieldName))) {
      addError(`${source}: missing required field "${fieldName}"`);
    }
  });
}

function requireArray(source, object, fieldName) {
  if (!Array.isArray(object?.[fieldName])) {
    addError(`${source}: "${fieldName}" must be an array`);
    return [];
  }
  return object[fieldName];
}

function reportMissingIngredient(source, ingredientId) {
  if (!hasValue(ingredientId)) {
    addError(`${source}: missing ingredient id`);
    return;
  }

  if (!ingredientIds.has(ingredientId)) {
    addError(`${source}: ingredient "${ingredientId}" does not exist in ${files.ingredients}`);
  }
}

function reportLegacySource(source, sourceId) {
  if (!hasValue(sourceId)) {
    addWarning(`${source}: empty legacy source value`);
    return;
  }

  if (!ingredientIds.has(sourceId)) {
    addWarning(`${source}: legacy source "${sourceId}" is not an ingredient id; move display-only values to destinations[].flavorTags/displayTags when promoting data`);
  }
}

function reportMissingCity(source, cityValue) {
  if (!hasValue(cityValue)) {
    addError(`${source}: missing city id`);
    return;
  }

  if (!cityLookup.has(normalizeId(cityValue))) {
    addError(`${source}: city "${cityValue}" does not exist in ${files.cityRoutes}.cities`);
  }
}

function cityRouteExists(cityValue) {
  const normalized = normalizeId(cityValue);
  return cityLookup.has(normalized) || cityLooseLookup.has(normalizeLooseId(normalized));
}

function collectDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  values.filter(hasValue).forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });

  return [...duplicates];
}

const ingredients = readJson(files.ingredients, {});
const recipeCategories = readJson(files.recipeCategories, []);
const recipes = readJson(files.recipes, []);
const cityRoutes = readJson(files.cityRoutes, { cities: {} });
const flights = readJson(files.flights, []);
const destinationsFile = fileExists(files.destinations) ? files.destinations : files.cityData;
const destinationsData = readJson(destinationsFile, { destinations: [] });

if (destinationsFile === files.cityData) {
  addWarning(`${files.destinations}: not found; validating existing ${files.cityData} instead`);
}

if (!ingredients || Array.isArray(ingredients) || typeof ingredients !== "object") {
  addError(`${files.ingredients}: root must be an object keyed by ingredient id`);
}

if (!Array.isArray(recipes)) {
  addError(`${files.recipes}: root must be an array`);
}

if (!Array.isArray(recipeCategories)) {
  addError(`${files.recipeCategories}: root must be an array`);
}

if (!cityRoutes?.cities || Array.isArray(cityRoutes.cities) || typeof cityRoutes.cities !== "object") {
  addError(`${files.cityRoutes}: root must contain a "cities" object`);
}

const ingredientEntries =
  ingredients && !Array.isArray(ingredients) && typeof ingredients === "object"
    ? Object.entries(ingredients)
    : [];
const ingredientIds = new Set(ingredientEntries.map(([id]) => id));
const recipeIngredientIds = new Set();
const routeIngredientIds = new Set();
const recipeCategoryEntries = Array.isArray(recipeCategories) ? recipeCategories : [];
const recipeCategoryIds = new Set(recipeCategoryEntries.map((category) => category?.id).filter(hasValue));
const recipeCategoryCounts = new Map();

function isCollectibleIngredient(ingredient) {
  return (
    ingredient?.inventory === "collectible" ||
    ingredient?.fridgeZone === "travel" ||
    ingredient?.requires_collection === true
  );
}

ingredientEntries.forEach(([key, ingredient]) => {
  requireFields(`${files.ingredients}.${key}`, ingredient, ["id", "name"]);
  if (ingredient?.id !== key) {
    addError(`${files.ingredients}.${key}: internal id "${ingredient?.id}" must match object key`);
  }
  if (ingredient?.defaultShelfLifeDays !== undefined) {
    const shelfLifeDays = Number(ingredient.defaultShelfLifeDays);
    if (!Number.isFinite(shelfLifeDays) || shelfLifeDays <= 0) {
      addError(`${files.ingredients}.${key}: defaultShelfLifeDays must be a positive number`);
    }
  } else {
    addWarning(`${files.ingredients}.${key}: missing defaultShelfLifeDays for real fridge defaults`);
  }
  if (ingredient?.storageType !== undefined && !allowedStorageTypes.has(ingredient.storageType)) {
    addError(`${files.ingredients}.${key}: storageType "${ingredient.storageType}" must be one of ${[...allowedStorageTypes].join(", ")}`);
  }
});

collectDuplicateValues(ingredientEntries.map(([, ingredient]) => ingredient?.id)).forEach((id) => {
  addError(`${files.ingredients}: duplicate ingredient id "${id}"`);
});

recipeCategoryEntries.forEach((category, categoryIndex) => {
  const source = `${files.recipeCategories}[${categoryIndex}]${category?.id ? ` (${category.id})` : ""}`;
  requireFields(source, category, ["id", "label"]);
});

collectDuplicateValues(recipeCategoryEntries.map((category) => category?.id)).forEach((id) => {
  addError(`${files.recipeCategories}: duplicate recipe category id "${id}"`);
});

const cities =
  cityRoutes?.cities && !Array.isArray(cityRoutes.cities) && typeof cityRoutes.cities === "object"
    ? cityRoutes.cities
    : {};
const cityLookup = new Set();
const cityLooseLookup = new Set();

Object.entries(cities).forEach(([cityKey, city]) => {
  [cityKey, city?.cityId, city?.displayName].filter(hasValue).forEach((value) => {
    cityLookup.add(normalizeId(value));
    cityLooseLookup.add(normalizeLooseId(value));
  });
});

Object.entries(cities).forEach(([cityKey, city]) => {
  const source = `${files.cityRoutes}.cities.${cityKey}`;
  requireFields(source, city, ["cityId", "displayName", "title", "center", "zoom", "stops"]);
  const cityStopIds = new Set();

  if (hasValue(city?.cityId) && normalizeId(city.cityId) !== normalizeId(cityKey)) {
    addWarning(`${source}: cityId "${city.cityId}" does not exactly match key "${cityKey}"`);
  }

  if (!Array.isArray(city?.center) || city.center.length !== 2) {
    addError(`${source}: "center" must be [lat, lng]`);
  }

  requireArray(source, city, "stops").forEach((stop, stopIndex) => {
    const stopSource = `${source}.stops[${stopIndex}]${stop?.id ? ` (${stop.id})` : ""}`;
    requireFields(stopSource, stop, ["id", "kind"]);
    if (hasValue(stop?.id)) cityStopIds.add(stop.id);

    if (stop?.kind === "ingredient") {
      requireFields(stopSource, stop, ["ingredientId", "lat", "lng"]);
      reportMissingIngredient(`${stopSource}.ingredientId`, stop?.ingredientId);
      if (hasValue(stop?.ingredientId)) {
        routeIngredientIds.add(stop.ingredientId);
        const ingredient = ingredients?.[stop.ingredientId];
        if (ingredient && (!hasValue(ingredient.desc) || !hasValue(ingredient.story))) {
          addWarning(`${stopSource}: ingredient "${stop.ingredientId}" is missing desc or story`);
        }
      }
    } else if (stop?.kind === "landmark") {
      requireFields(stopSource, stop, ["id", "name", "lat", "lng"]);
      if (!hasValue(stop?.desc) && !hasValue(stop?.story)) {
        addWarning(`${stopSource}: landmark should include desc or story`);
      }
    }
  });

  if (city?.narrative !== undefined) {
    const narrativeSource = `${source}.narrative`;
    if (Array.isArray(city.narrative?.routes)) {
      city.narrative.routes.forEach((route, routeIndex) => {
        const routeSource = `${narrativeSource}.routes[${routeIndex}]${route?.id ? ` (${route.id})` : ""}`;
        if (route?.stopIds !== undefined && !Array.isArray(route.stopIds)) {
          addError(`${routeSource}.stopIds: must be an array when present`);
          return;
        }

        (Array.isArray(route?.stopIds) ? route.stopIds : []).forEach((stopId, stopIdIndex) => {
          if (!cityStopIds.has(stopId)) {
            addError(`${routeSource}.stopIds[${stopIdIndex}]: stop "${stopId}" does not exist in ${source}.stops`);
          }
        });
      });
    } else if (city.narrative?.routes !== undefined) {
      addError(`${narrativeSource}.routes: must be an array when present`);
    }
  }
});

if (Array.isArray(recipes)) {
  collectDuplicateValues(recipes.map((recipe) => recipe?.id)).forEach((id) => {
    addError(`${files.recipes}: duplicate recipe id "${id}"`);
  });

  recipes.forEach((recipe, recipeIndex) => {
    const source = `${files.recipes}[${recipeIndex}]${recipe?.id ? ` (${recipe.id})` : ""}`;
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

    if (hasValue(recipe?.cityId)) {
      reportMissingCity(`${source}.cityId`, recipe.cityId);
    }

    if (hasValue(recipe?.category)) {
      if (Array.isArray(recipe.category)) {
        addError(`${source}.category: must be one recipe category id, not an array`);
      } else if (!recipeCategoryIds.has(recipe.category)) {
        addError(`${source}.category: category "${recipe.category}" does not exist in ${files.recipeCategories}`);
      } else {
        recipeCategoryCounts.set(recipe.category, (recipeCategoryCounts.get(recipe.category) || 0) + 1);
      }
    }

    requireArray(source, recipe, "ingredients").forEach((item, ingredientIndex) => {
      reportMissingIngredient(`${source}.ingredients[${ingredientIndex}].ingredientId`, item?.ingredientId);
      if (hasValue(item?.ingredientId)) recipeIngredientIds.add(item.ingredientId);
    });

    const recipeIngredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    if (recipeIngredients.length > 0 && recipeIngredients.length < 3) {
      addWarning(`${source}: recipe has only ${recipeIngredients.length} ingredient(s)`);
    }
    if (!hasValue(recipe?.description)) {
      addWarning(`${source}: missing content field "description"`);
    }
    if (!Array.isArray(recipe?.steps) || recipe.steps.length === 0) {
      addWarning(`${source}: missing content field "steps"`);
    }
    if (!hasValue(recipe?.story)) {
      addWarning(`${source}: missing content field "story"`);
    }
  });
}

recipeCategoryEntries.forEach((category) => {
  if (hasValue(category?.id) && !recipeCategoryCounts.has(category.id)) {
    addWarning(`${files.recipeCategories}.${category.id}: category has no recipes`);
  }
});

if (!Array.isArray(flights)) {
  addError(`${files.flights}: root must be an array`);
} else {
  collectDuplicateValues(flights.map((flight) => flight?.id)).forEach((id) => {
    addError(`${files.flights}: duplicate flight id "${id}"`);
  });

  flights.forEach((flight, flightIndex) => {
    const source = `${files.flights}[${flightIndex}]${flight?.id ? ` (${flight.id})` : ""}`;
    requireFields(source, flight, [
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

    if (flight?.sources !== undefined && !Array.isArray(flight.sources)) {
      addError(`${source}.sources: must be an array when present`);
    }

    (Array.isArray(flight?.sources) ? flight.sources : []).forEach((sourceId, sourceIndex) => {
      reportLegacySource(`${source}.sources[${sourceIndex}]`, sourceId);
    });
  });
}

const destinations = Array.isArray(destinationsData)
  ? destinationsData
  : Array.isArray(destinationsData?.destinations)
    ? destinationsData.destinations
    : null;

if (!destinations) {
  addError(`${destinationsFile}: root must be an array or contain a "destinations" array`);
} else {
  collectDuplicateValues(destinations.map((destination) => destination?.id)).forEach((id) => {
    addError(`${destinationsFile}: duplicate destination id "${id}"`);
  });

  destinations.forEach((destination, destinationIndex) => {
    const source = `${destinationsFile}.destinations[${destinationIndex}]${destination?.id ? ` (${destination.id})` : ""}`;
    requireFields(source, destination, [
      "id",
      "city",
      "cityId",
      "label",
      "code",
      "flight",
      "photos",
      "guide",
      "ingredientIds",
      "decision"
    ]);

    requireArray(source, destination, "ingredientIds").forEach((ingredientId, ingredientIndex) => {
      reportMissingIngredient(`${source}.ingredientIds[${ingredientIndex}]`, ingredientId);
    });
    if (Array.isArray(destination?.ingredientIds) && destination.ingredientIds.length === 0) {
      addWarning(`${source}: destination has no ingredientIds`);
    }

    ["flavorTags", "displayTags"].forEach((tagField) => {
      if (destination?.[tagField] !== undefined && !Array.isArray(destination[tagField])) {
        addError(`${source}.${tagField}: must be an array when present`);
      }
    });

    const cityValue = destination?.cityRouteId || destination?.cityMapId || destination?.cityId;
    if (hasValue(cityValue)) {
      if (!cityRouteExists(cityValue)) {
        addWarning(`${source}: destination cityRouteId/cityMapId "${cityValue}" has no matching ${files.cityRoutes}.cities entry`);
      }
    } else {
      addWarning(`${source}: no cityMapId/cityRouteId/cityId; map jump may fall back to less stable fields`);
    }
  });
}

const destinationLookup = new Set();
const destinationLooseLookup = new Set();
if (Array.isArray(destinations)) {
  destinations.forEach((destination) => {
    [
      destination?.id,
      destination?.cityId,
      destination?.cityRouteId,
      destination?.cityMapId,
      destination?.city,
      destination?.label
    ].filter(hasValue).forEach((value) => {
      destinationLookup.add(normalizeId(value));
      destinationLooseLookup.add(normalizeLooseId(value));
    });
  });
}

function getFlightCityValues(flight) {
  return [
    flight?.cityRouteId,
    flight?.cityMapId,
    flight?.cityId,
    flight?.id,
    flight?.city?.en,
    flight?.city?.zh
  ].filter(hasValue);
}

function flightHasDestination(flight) {
  return getFlightCityValues(flight).some((value) => {
    const normalized = normalizeId(value);
    return destinationLookup.has(normalized) || destinationLooseLookup.has(normalizeLooseId(normalized));
  });
}

function flightHasCityRoute(flight) {
  return getFlightCityValues(flight).some((value) => cityRouteExists(value));
}

if (Array.isArray(flights)) {
  flights.forEach((flight, flightIndex) => {
    const source = `${files.flights}[${flightIndex}]${flight?.id ? ` (${flight.id})` : ""}`;
    const cityValue = flight?.cityRouteId || flight?.cityMapId || flight?.cityId || flight?.id || flight?.city?.en;
    const cityValues = getFlightCityValues(flight);
    const hasDestination = flightHasDestination(flight);

    if (cityValues.length && !hasDestination) {
      addWarning(`${source}: legacy flight city has no matching destination in ${destinationsFile}`);
    }

    if (hasValue(cityValue) && !cityRouteExists(cityValue)) {
      addWarning(`${source}: legacy flight city "${cityValue}" has no matching ${files.cityRoutes}.cities entry`);
    }
  });
}

ingredientEntries.forEach(([id, ingredient]) => {
  if (!recipeIngredientIds.has(id)) {
    addWarning(`${files.ingredients}.${id}: ingredient is not used by any recipe`);
  }

  if (isCollectibleIngredient(ingredient) && !routeIngredientIds.has(id)) {
    addWarning(`${files.ingredients}.${id}: collectible/travel ingredient has no cityRoutes stop`);
  }
});

function printSection(title, items, emptyText) {
  console.log(`\n${title}`);
  if (!items.length) {
    console.log(`  ${emptyText}`);
    return;
  }

  items.forEach((item) => console.log(`  - ${item}`));
}

const summary = {
  ingredients: ingredientEntries.length,
  recipeCategories: recipeCategoryEntries.length,
  recipes: Array.isArray(recipes) ? recipes.length : 0,
  cities: Object.keys(cities).length,
  flights: Array.isArray(flights) ? flights.length : 0,
  flightCitiesWithDestinations: Array.isArray(flights) ? flights.filter(flightHasDestination).length : 0,
  flightCitiesWithCityRoutes: Array.isArray(flights) ? flights.filter(flightHasCityRoute).length : 0,
  destinationsSource: destinationsFile,
  destinations: Array.isArray(destinations) ? destinations.length : 0
};

console.log("Apocook data validation");
printSection("errors", errors, "none");
printSection("warnings", warnings, "none");
console.log("\nsummary");
Object.entries(summary).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

if (errors.length) {
  process.exitCode = 1;
}
