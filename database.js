(function () {
  // Unified data layer: data/ingredients.json, data/recipes.json, data/cityRoutes.json, data/flights.json, data/destinations.json.
  const scriptUrl = document.currentScript?.src || new URL("database.js", window.location.href).href;
  const DATA_BASE_URL = new URL("data/", scriptUrl);

  window.APP_DATA = {
    ingredients: {},
    recipes: [],
    recipeCategories: [],
    flights: [],
    destinations: [],
    cityRoutes: null,
    isReady: false
  };
  window.GLOBAL_INGREDIENTS_POOL = window.APP_DATA.ingredients;

  function normalizeId(value) {
    return String(value || "").trim().toLowerCase();
  }

  function loadJsonViaXhr(path) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.overrideMimeType("application/json");
      request.open("GET", path, true);
      request.onload = () => {
        if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
          try {
            resolve(JSON.parse(request.responseText));
          } catch (error) {
            reject(error);
          }
          return;
        }
        reject(new Error(`HTTP ${request.status}`));
      };
      request.onerror = reject;
      request.send();
    });
  }

  async function loadJson(path, fallback) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        console.warn(`[database] Failed to load ${path}`, response.status);
        return await loadJsonViaXhr(path);
      }
      return await response.json();
    } catch (error) {
      try {
        return await loadJsonViaXhr(path);
      } catch (xhrError) {
        console.warn(`[database] Failed to load ${path}`, xhrError || error);
        return fallback;
      }
    }
  }

  function applyIngredientDefaults(id, item) {
    const safe = item || {};
    const type = safe.type || "food";
    return {
      id: safe.id || id,
      name: safe.name || safe.title || id,
      emoji: safe.emoji || "🍽️",
      type,
      typeName: safe.typeName || "地道食材",
      category: safe.category || (type === "food" ? "travel" : undefined),
      origin: safe.origin || safe.originCity || "Guangzhou",
      originCity: safe.originCity || safe.cityId || safe.origin || "Guangzhou",
      sourceCity: safe.sourceCity || safe.originCity || safe.cityId || safe.origin || "Guangzhou",
      desc: safe.desc || safe.description || "",
      story: safe.story || safe.desc || safe.description || "",
      fridgeZone: safe.fridgeZone || null,
      requires_collection: safe.requires_collection ?? false,
      locked: safe.locked ?? false,
      ...safe
    };
  }

  function normalizeIngredients(rawIngredients) {
    if (Array.isArray(rawIngredients)) {
      return rawIngredients.reduce((acc, item) => {
        const id = normalizeId(item?.id || item?.ingredientId);
        if (!id) return acc;
        acc[id] = applyIngredientDefaults(id, item);
        return acc;
      }, {});
    }

    return Object.entries(rawIngredients || {}).reduce((acc, [id, item]) => {
      const finalId = normalizeId(item?.id || id);
      if (!finalId) return acc;
      acc[finalId] = applyIngredientDefaults(finalId, item);
      return acc;
    }, {});
  }

  function normalizeRecipes(rawRecipes) {
    if (Array.isArray(rawRecipes)) return rawRecipes;
    if (rawRecipes && Array.isArray(rawRecipes.recipes)) return rawRecipes.recipes;
    return [];
  }

  function normalizeRecipeCategories(rawCategories) {
    if (Array.isArray(rawCategories)) return rawCategories;
    if (rawCategories && Array.isArray(rawCategories.categories)) return rawCategories.categories;
    return [];
  }

  function normalizeDestinations(rawDestinations) {
    if (Array.isArray(rawDestinations)) return rawDestinations;
    if (rawDestinations && Array.isArray(rawDestinations.destinations)) return rawDestinations.destinations;
    return [];
  }

  async function initDatabase() {
    const [ingredients, recipes, recipeCategories, cityRoutes, flights, destinations] = await Promise.all([
      loadJson(new URL("ingredients.json", DATA_BASE_URL).href, {}),
      loadJson(new URL("recipes.json", DATA_BASE_URL).href, []),
      loadJson(new URL("recipeCategories.json", DATA_BASE_URL).href, []),
      loadJson(new URL("cityRoutes.json", DATA_BASE_URL).href, null),
      loadJson(new URL("flights.json", DATA_BASE_URL).href, []),
      loadJson(new URL("destinations.json", DATA_BASE_URL).href, { destinations: [] })
    ]);

    window.APP_DATA.ingredients = normalizeIngredients(ingredients);
    window.APP_DATA.recipes = normalizeRecipes(recipes);
    window.APP_DATA.recipeCategories = normalizeRecipeCategories(recipeCategories);
    window.APP_DATA.cityRoutes = cityRoutes;
    window.APP_DATA.flights = Array.isArray(flights) ? flights : [];
    window.APP_DATA.destinations = normalizeDestinations(destinations);
    window.APP_DATA.isReady = true;
    window.GLOBAL_INGREDIENTS_POOL = window.APP_DATA.ingredients;

    window.dispatchEvent(new CustomEvent("database:ready", {
      detail: window.APP_DATA
    }));

    return window.APP_DATA;
  }

  window.whenDatabaseReady = initDatabase();

  window.getIngredientData = function (id) {
    const ingredientId = normalizeId(id);
    const found = window.APP_DATA.ingredients[ingredientId];

    if (found) return found;

    return {
      id: ingredientId,
      name: ingredientId || "神秘探索点",
      emoji: ingredientId ? "🍽️" : "📍",
      type: ingredientId ? "food" : "custom",
      typeName: ingredientId ? "地道食材" : "行程规划",
      category: ingredientId ? "travel" : undefined,
      originCity: "Guangzhou",
      fridgeZone: null,
      desc: ingredientId ? "" : "一个属于你自己的漫游轨迹锚点。",
      story: ingredientId ? "" : "你在这里留下了属于自己的足迹。未来，这里或许也会变成连通阿婆厨房的一抹烟火气。"
    };
  };

  window.getAllIngredients = function () {
    return Object.values(window.APP_DATA.ingredients || {});
  };

  window.getRecipeData = function (id) {
    const recipeId = normalizeId(id);
    return (window.APP_DATA.recipes || []).find((recipe) => recipe.id === recipeId) || null;
  };

  window.getAllRecipes = function () {
    return window.APP_DATA.recipes || [];
  };

  window.getAllRecipeCategories = function () {
    return window.APP_DATA.recipeCategories || [];
  };

  window.getFlightData = function (id) {
    const flightId = normalizeId(id);
    return (window.APP_DATA.flights || []).find((flight) => flight.id === flightId) || null;
  };

  window.getAllFlights = function () {
    return window.APP_DATA.flights || [];
  };

  window.getAllDestinations = function () {
    return window.APP_DATA.destinations || [];
  };
})();
