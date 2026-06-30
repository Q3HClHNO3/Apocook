(function () {
  const REAL_FRIDGE_KEY = "real_fridge_inventory";
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const FALLBACK_SHELF_LIFE_DAYS = 5;

  function todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function normalizeId(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getIngredient(ingredientId) {
    const id = normalizeId(ingredientId);
    return window.APP_DATA?.ingredients?.[id] || window.GLOBAL_INGREDIENTS_POOL?.[id] || null;
  }

  function getDefaultShelfLifeDays(ingredientId) {
    const ingredient = getIngredient(ingredientId);
    const value = Number(ingredient?.defaultShelfLifeDays);
    return Number.isFinite(value) && value > 0 ? value : FALLBACK_SHELF_LIFE_DAYS;
  }

  function normalizeItem(item) {
    const ingredientId = normalizeId(item?.ingredientId);
    if (!ingredientId) return null;

    const quantity = Number(item?.quantity);
    const shelfLifeDays = Number(item?.shelfLifeDays);

    return {
      ingredientId,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: item?.unit || "份",
      purchaseDate: item?.purchaseDate || todayString(),
      shelfLifeDays: Number.isFinite(shelfLifeDays) && shelfLifeDays > 0
        ? shelfLifeDays
        : getDefaultShelfLifeDays(ingredientId),
      source: item?.source || "manual",
      note: item?.note || ""
    };
  }

  function readRealFridge() {
    try {
      const value = JSON.parse(localStorage.getItem(REAL_FRIDGE_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      return value.map(normalizeItem).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function writeRealFridge(items) {
    const nextItems = (Array.isArray(items) ? items : []).map(normalizeItem).filter(Boolean);
    localStorage.setItem(REAL_FRIDGE_KEY, JSON.stringify(nextItems));
    return nextItems;
  }

  function getFridgeItem(ingredientId) {
    const id = normalizeId(ingredientId);
    return readRealFridge().find((item) => item.ingredientId === id) || null;
  }

  function upsertFridgeItem(ingredientId, options = {}) {
    const id = normalizeId(ingredientId);
    if (!id) return readRealFridge();

    const items = readRealFridge();
    const index = items.findIndex((item) => item.ingredientId === id);
    const existing = index >= 0 ? items[index] : {};
    const nextItem = normalizeItem({
      ingredientId: id,
      quantity: options.quantity ?? existing.quantity ?? 1,
      unit: options.unit ?? existing.unit ?? "份",
      purchaseDate: options.purchaseDate ?? existing.purchaseDate ?? todayString(),
      shelfLifeDays: options.shelfLifeDays ?? existing.shelfLifeDays ?? getDefaultShelfLifeDays(id),
      source: options.source ?? existing.source ?? "manual",
      note: options.note ?? existing.note ?? ""
    });

    if (index >= 0) {
      items[index] = nextItem;
    } else {
      items.push(nextItem);
    }

    return writeRealFridge(items);
  }

  function removeFridgeItem(ingredientId) {
    const id = normalizeId(ingredientId);
    return writeRealFridge(readRealFridge().filter((item) => item.ingredientId !== id));
  }

  function markUsed(ingredientId, amount = 1) {
    const id = normalizeId(ingredientId);
    const usedAmount = Number(amount);
    const decrement = Number.isFinite(usedAmount) && usedAmount > 0 ? usedAmount : 1;
    const items = readRealFridge();
    const index = items.findIndex((item) => item.ingredientId === id);
    if (index < 0) return items;

    const nextQuantity = Number(items[index].quantity || 1) - decrement;
    if (nextQuantity > 0) {
      items[index] = { ...items[index], quantity: nextQuantity };
    } else {
      items.splice(index, 1);
    }

    return writeRealFridge(items);
  }

  function clearRealFridge() {
    localStorage.removeItem(REAL_FRIDGE_KEY);
    return [];
  }

  function getDaysRemaining(item) {
    if (!item?.purchaseDate) return Infinity;
    const purchaseTime = new Date(`${item.purchaseDate}T00:00:00`).getTime();
    if (!Number.isFinite(purchaseTime)) return Infinity;
    const expiresAt = purchaseTime + Number(item.shelfLifeDays || FALLBACK_SHELF_LIFE_DAYS) * MS_PER_DAY;
    const today = new Date(`${todayString()}T00:00:00`).getTime();
    return Math.ceil((expiresAt - today) / MS_PER_DAY);
  }

  function getIngredientFreshness(ingredientId) {
    const item = getFridgeItem(ingredientId);
    if (!item) return "missing";

    const daysRemaining = getDaysRemaining(item);
    if (daysRemaining < 0) return "expired";
    if (daysRemaining === 0) return "urgent";
    if (daysRemaining <= 2) return "soon";
    return "fresh";
  }

  function getExpiringItems(days = 2) {
    const threshold = Number(days);
    const maxDays = Number.isFinite(threshold) ? threshold : 2;
    return readRealFridge().filter((item) => {
      const daysRemaining = getDaysRemaining(item);
      return daysRemaining >= 0 && daysRemaining <= maxDays;
    });
  }

  function getExpiredItems() {
    return readRealFridge().filter((item) => getDaysRemaining(item) < 0);
  }

  function getRealFridgeIngredientIds() {
    return readRealFridge().map((item) => item.ingredientId);
  }

  window.AppRealFridge = {
    readRealFridge,
    writeRealFridge,
    upsertFridgeItem,
    removeFridgeItem,
    markUsed,
    clearRealFridge,
    getFridgeItem,
    getIngredientFreshness,
    getExpiringItems,
    getExpiredItems,
    getRealFridgeIngredientIds
  };
})();
