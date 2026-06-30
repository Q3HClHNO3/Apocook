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
  flights: "data/flights.json"
};

function readJson(relativePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
  } catch (error) {
    console.warn(`${relativePath}: cannot read/parse JSON (${error.message})`);
    return fallback;
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
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

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function printCountMap(title, counts) {
  console.log(`\n${title}`);
  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
}

function printList(title, items, emptyText = "none") {
  console.log(`\n${title}`);
  if (!items.length) {
    console.log(`  ${emptyText}`);
    return;
  }
  items.forEach((item) => console.log(`  - ${item}`));
}

const ingredients = readJson(files.ingredients, {});
const recipeCategories = readJson(files.recipeCategories, []);
const recipes = readJson(files.recipes, []);
const cityRoutes = readJson(files.cityRoutes, { cities: {} });
const destinationsData = readJson(files.destinations, { destinations: [] });
const flights = readJson(files.flights, []);

const ingredientEntries =
  ingredients && !Array.isArray(ingredients) && typeof ingredients === "object"
    ? Object.entries(ingredients)
    : [];
const ingredientIds = ingredientEntries.map(([id]) => id);
const ingredientsWithShelfLife = ingredientEntries.filter(([, ingredient]) => ingredient?.defaultShelfLifeDays !== undefined);
const ingredientsMissingShelfLife = ingredientEntries
  .filter(([, ingredient]) => ingredient?.defaultShelfLifeDays === undefined)
  .map(([id, ingredient]) => `${id}: ${ingredient?.name || id}`);
const recipeList = Array.isArray(recipes) ? recipes : [];
const categoryList = Array.isArray(recipeCategories) ? recipeCategories : [];
const cities = cityRoutes?.cities && typeof cityRoutes.cities === "object" && !Array.isArray(cityRoutes.cities)
  ? cityRoutes.cities
  : {};
const destinations = Array.isArray(destinationsData)
  ? destinationsData
  : Array.isArray(destinationsData?.destinations)
    ? destinationsData.destinations
    : [];
const flightList = Array.isArray(flights) ? flights : [];

const cityLookup = new Set();
const cityLooseLookup = new Set();
Object.entries(cities).forEach(([cityKey, city]) => {
  [cityKey, city?.cityId, city?.displayName].filter(Boolean).forEach((value) => {
    cityLookup.add(normalizeId(value));
    cityLooseLookup.add(normalizeLooseId(value));
  });
});

function cityRouteExists(value) {
  const normalized = normalizeId(value);
  return cityLookup.has(normalized) || cityLooseLookup.has(normalizeLooseId(normalized));
}

function getDestinationRouteId(destination) {
  return destination?.cityRouteId || destination?.cityMapId || destination?.cityId || destination?.id || destination?.city;
}

function formatDestination(destination) {
  const routeId = getDestinationRouteId(destination) || "(missing route id)";
  const label = destination?.label || destination?.city || destination?.id || "(missing destination)";
  return `${routeId}: ${label}`;
}

const destinationsWithCityRoutes = destinations
  .filter((destination) => cityRouteExists(getDestinationRouteId(destination)))
  .map(formatDestination);
const destinationsWithoutCityRoutes = destinations
  .filter((destination) => !cityRouteExists(getDestinationRouteId(destination)))
  .map(formatDestination);

const destinationLookup = new Set();
const destinationLooseLookup = new Set();
destinations.forEach((destination) => {
  [
    destination?.id,
    destination?.cityId,
    destination?.cityRouteId,
    destination?.cityMapId,
    destination?.city,
    destination?.label
  ].filter(Boolean).forEach((value) => {
    destinationLookup.add(normalizeId(value));
    destinationLooseLookup.add(normalizeLooseId(value));
  });
});

const legacyFlightsWithoutDestination = flightList
  .filter((flight) => {
    return !flightHasDestination(flight);
  })
  .map((flight) => `${flight?.id || "(missing id)"}: ${flight?.city?.en || "(missing city.en)"}`);

function getFlightCityValues(flight) {
  return [
    flight?.cityRouteId,
    flight?.cityMapId,
    flight?.cityId,
    flight?.id,
    flight?.city?.en,
    flight?.city?.zh
  ].filter(Boolean);
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

const flightCitiesWithDestination = flightList
  .filter(flightHasDestination)
  .map((flight) => `${flight?.id || "(missing id)"}: ${flight?.city?.en || "(missing city.en)"}`);
const flightCitiesWithoutDestination = flightList
  .filter((flight) => !flightHasDestination(flight))
  .map((flight) => `${flight?.id || "(missing id)"}: ${flight?.city?.en || "(missing city.en)"}`);
const flightCitiesWithCityRoutes = flightList
  .filter(flightHasCityRoute)
  .map((flight) => `${flight?.id || "(missing id)"}: ${flight?.city?.en || "(missing city.en)"}`);
const flightCitiesWithoutCityRoutes = flightList
  .filter((flight) => !flightHasCityRoute(flight))
  .map((flight) => `${flight?.id || "(missing id)"}: ${flight?.city?.en || "(missing city.en)"}`);

const recipeIngredientIds = new Set();
recipeList.forEach((recipe) => {
  (Array.isArray(recipe?.ingredients) ? recipe.ingredients : []).forEach((item) => {
    if (item?.ingredientId) recipeIngredientIds.add(item.ingredientId);
  });
});

const routeIngredientIds = new Set();
Object.values(cities).forEach((city) => {
  (Array.isArray(city?.stops) ? city.stops : []).forEach((stop) => {
    if (stop?.kind === "ingredient" && stop?.ingredientId) routeIngredientIds.add(stop.ingredientId);
  });
});

const cityStopSummaries = Object.entries(cities).map(([cityKey, city]) => {
  const stops = Array.isArray(city?.stops) ? city.stops : [];
  const ingredientStops = stops.filter((stop) => stop?.kind === "ingredient").length;
  const landmarkStops = stops.filter((stop) => stop?.kind === "landmark").length;
  const hasNarrative = Boolean(city?.narrative);
  return `${cityKey}: ingredient stops ${ingredientStops}, landmark stops ${landmarkStops}, narrative ${hasNarrative ? "yes" : "no"}`;
});

const guangzhouDestination = destinations.find((destination) => normalizeId(destination?.id) === "guangzhou");
const guangzhouHighlightSummary = guangzhouDestination
  ? [
      `highlightStopIds: ${Array.isArray(guangzhouDestination.highlightStopIds) ? guangzhouDestination.highlightStopIds.length : 0}`,
      `landmarkIds: ${Array.isArray(guangzhouDestination.landmarkIds) ? guangzhouDestination.landmarkIds.length : 0}`
    ]
  : [];

const unusedIngredients = ingredientIds.filter((id) => !recipeIngredientIds.has(id));
const ingredientsWithoutCityStops = ingredientEntries
  .filter(([id, ingredient]) => {
    const shouldHaveStop =
      ingredient?.inventory === "collectible" ||
      ingredient?.fridgeZone === "travel" ||
      ingredient?.requires_collection === true;
    return shouldHaveStop && !routeIngredientIds.has(id);
  })
  .map(([id]) => id);

const recipesMissingContent = recipeList
  .map((recipe) => {
    const missing = [];
    if (!hasText(recipe?.description)) missing.push("description");
    if (!Array.isArray(recipe?.steps) || recipe.steps.length === 0) missing.push("steps");
    if (!hasText(recipe?.story)) missing.push("story");
    return missing.length ? `${recipe?.id || "(missing id)"}: ${missing.join(", ")}` : "";
  })
  .filter(Boolean);

const recipeCountsByCategory = countBy(recipeList, (recipe) => recipe?.category || "unknown");
const recipeCategorySummaries = categoryList
  .slice()
  .sort((a, b) => (a?.order || 0) - (b?.order || 0))
  .map((category) => `${category?.id || "unknown"} (${category?.label || "未命名"}): ${recipeCountsByCategory[category?.id] || 0}`);
const emptyRecipeCategories = categoryList
  .filter((category) => (recipeCountsByCategory[category?.id] || 0) === 0)
  .map((category) => `${category?.id || "unknown"} (${category?.label || "未命名"})`);

console.log("Apocook data report");
console.log(`\ningredients: ${ingredientEntries.length}`);
console.log(`ingredients with defaultShelfLifeDays: ${ingredientsWithShelfLife.length}/${ingredientEntries.length}`);
console.log(`recipe categories: ${categoryList.length}`);
console.log(`recipes: ${recipeList.length}`);
console.log(`cities: ${Object.keys(cities).length}`);
console.log(`destinations: ${destinations.length}`);
console.log(`legacy flights: ${flightList.length}`);
console.log(`flight cities with destinations: ${flightCitiesWithDestination.length}/${flightList.length}`);
console.log(`flight cities with cityRoutes: ${flightCitiesWithCityRoutes.length}/${flightList.length}`);

printCountMap("ingredients by fridgeZone", countBy(ingredientEntries, ([, ingredient]) => ingredient?.fridgeZone));
printCountMap("ingredients by storageType", countBy(ingredientEntries, ([, ingredient]) => ingredient?.storageType));
printList("ingredients missing defaultShelfLifeDays", ingredientsMissingShelfLife);
printCountMap("recipes by category", recipeCountsByCategory);
printList("recipe categories", recipeCategorySummaries);
printList("empty recipe categories", emptyRecipeCategories);
printCountMap("recipes by method", countBy(recipeList, (recipe) => recipe?.method || "unknown"));
printList("city route stop coverage", cityStopSummaries);
printList("guangzhou destination highlights", guangzhouHighlightSummary);
printList("flight cities with destinations", flightCitiesWithDestination);
printList("flight cities missing destinations", flightCitiesWithoutDestination);
printList("flight cities with cityRoutes", flightCitiesWithCityRoutes);
printList("flight cities missing cityRoutes", flightCitiesWithoutCityRoutes);
printList("destinations with cityRoutes", destinationsWithCityRoutes);
printList("destinations missing cityRoutes", destinationsWithoutCityRoutes);
printList("legacy flights without destination", legacyFlightsWithoutDestination);
printList("ingredients not used by any recipe", unusedIngredients);
printList("collectible/travel ingredients without city route stops", ingredientsWithoutCityStops);
printList("recipes missing story, steps, or description", recipesMissingContent);
