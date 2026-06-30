(function () {
  const RECENT_LUGGAGE_RETURN_KEY = "recent_luggage_return";

  function storage() {
    return window.AppStorage || {};
  }

  function readArray(readerName) {
    const reader = storage()[readerName];
    if (typeof reader !== "function") return [];
    const value = reader();
    return Array.isArray(value) ? value : [];
  }

  function writeLuggage(nextLuggage) {
    const writer = storage().writeLuggage;
    if (typeof writer === "function") {
      writer(Array.isArray(nextLuggage) ? nextLuggage : []);
    }
  }

  function writeShoppingList(nextList) {
    const writer = storage().writeShoppingList;
    if (typeof writer === "function") {
      writer(Array.isArray(nextList) ? nextList : []);
    }
  }

  function getOwnedIngredientIds() {
    return new Set([
      ...readArray("readLuggage"),
      ...readArray("readPantryCollected")
    ].filter(Boolean));
  }

  function isExternalIngredient(ingredient) {
    return Boolean(
      ingredient?.source === "travel" ||
      ingredient?.source === "market" ||
      ingredient?.inventory === "travel" ||
      ingredient?.inventory === "collectible" ||
      ingredient?.fridgeZone === "travel" ||
      ingredient?.locked ||
      ingredient?.requires_collection ||
      ingredient?.unlocked === false
    );
  }

  function isApoIngredientOwned(ingredientId, ownedIds = getOwnedIngredientIds()) {
    if (!ingredientId) return false;
    const ingredient = window.getIngredientData?.(ingredientId) || window.GLOBAL_INGREDIENTS_POOL?.[ingredientId];
    if (ingredient && !isExternalIngredient(ingredient)) return true;
    return ownedIds.has(ingredientId);
  }

  function isIngredientOwned(ingredientId) {
    return isApoIngredientOwned(ingredientId);
  }

  function getShoppingTargetSet() {
    const ownedIds = getOwnedIngredientIds();
    return new Set(
      readArray("readShoppingList")
        .filter((item) => item?.ingredientId && !isApoIngredientOwned(item.ingredientId, ownedIds))
        .map((item) => item?.ingredientId)
        .filter(Boolean)
    );
  }

  function normalizeShoppingItem(item, ownedIds = getOwnedIngredientIds()) {
    const recipeNames = Array.isArray(item?.recipeNames)
      ? item.recipeNames
      : [item?.recipeName || "阿婆菜谱"].filter(Boolean);
    const apoStatus = isApoIngredientOwned(item?.ingredientId, ownedIds)
      ? (readArray("readLuggage").includes(item?.ingredientId) ? "in_luggage" : "in_apo_pantry")
      : "needed";
    const homeStatus = item?.homeStatus || "needed";
    const status = apoStatus === "needed" ? "needed" : "collected";

    return {
      ...item,
      recipeNames,
      apoStatus,
      homeStatus,
      status
    };
  }

  function syncShoppingListStatuses() {
    const list = readArray("readShoppingList");
    if (!list.length) return [];

    const ownedIds = getOwnedIngredientIds();
    let changed = false;
    const nextList = list.map((item) => {
      const inLuggage = readArray("readLuggage").includes(item?.ingredientId);
      const apoStatus = isApoIngredientOwned(item?.ingredientId, ownedIds)
        ? (inLuggage ? "in_luggage" : "in_apo_pantry")
        : "needed";
      const status = apoStatus === "needed" ? "needed" : "collected";
      if (item?.status === status && item?.apoStatus === apoStatus && item?.homeStatus) return item;
      changed = true;
      return {
        ...item,
        apoStatus,
        homeStatus: item?.homeStatus || "needed",
        status,
        updatedAt: Date.now()
      };
    });

    if (changed) writeShoppingList(nextList);
    return nextList;
  }

  function getShoppingListSummary() {
    const ownedIds = getOwnedIngredientIds();
    const items = readArray("readShoppingList").map((item) => normalizeShoppingItem(item, ownedIds));
    const collectedItems = items.filter((item) => item.status === "collected");
    const neededItems = items.filter((item) => item.status !== "collected");

    return {
      total: items.length,
      collected: collectedItems.length,
      needed: neededItems.length,
      neededItems,
      collectedItems
    };
  }

  function returnLuggageToPantry() {
    const luggage = readArray("readLuggage");

    if (luggage.length) {
      const addPantryCollected = storage().addPantryCollected;
      if (typeof addPantryCollected === "function") {
        addPantryCollected(luggage);
      }
      sessionStorage.setItem(RECENT_LUGGAGE_RETURN_KEY, JSON.stringify(luggage));
      writeLuggage([]);
      syncShoppingListStatuses();
      return luggage;
    }

    sessionStorage.removeItem(RECENT_LUGGAGE_RETURN_KEY);
    syncShoppingListStatuses();
    return [];
  }

  function removeLuggageItem(id) {
    const luggage = readArray("readLuggage");
    const nextLuggage = luggage.filter((item) => item !== id);
    writeLuggage(nextLuggage);
    syncShoppingListStatuses();
    return nextLuggage;
  }

  function removeLuggageItemAt(index) {
    const luggage = readArray("readLuggage");
    if (index < 0 || index >= luggage.length) return luggage;

    const nextLuggage = [...luggage];
    nextLuggage.splice(index, 1);
    writeLuggage(nextLuggage);
    syncShoppingListStatuses();
    return nextLuggage;
  }

  function clearLuggage() {
    writeLuggage([]);
    syncShoppingListStatuses();
    return [];
  }

  window.AppInventory = {
    getOwnedIngredientIds,
    isIngredientOwned,
    getShoppingTargetSet,
    syncShoppingListStatuses,
    getShoppingListSummary,
    returnLuggageToPantry,
    removeLuggageItem,
    removeLuggageItemAt,
    clearLuggage
  };
})();
