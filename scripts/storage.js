(function () {
  const LUGGAGE_KEY = "my_luggage";
  const PANTRY_COLLECTED_KEY = "pantry_collected";
  const TODAY_MENU_KEY = "today_menu";
  const SHOPPING_LIST_KEY = "shopping_list";

  function readLuggage() {
    try {
      const luggage = JSON.parse(localStorage.getItem(LUGGAGE_KEY) || "[]");
      return Array.isArray(luggage) ? luggage : [];
    } catch (error) {
      return [];
    }
  }

  function writeLuggage(luggage) {
    localStorage.setItem(LUGGAGE_KEY, JSON.stringify(Array.isArray(luggage) ? luggage : []));
  }

  function readPantryCollected() {
    try {
      const list = JSON.parse(localStorage.getItem(PANTRY_COLLECTED_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function writePantryCollected(list) {
    localStorage.setItem(PANTRY_COLLECTED_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function addPantryCollected(ids) {
    const current = readPantryCollected();
    const next = [...current];

    (Array.isArray(ids) ? ids : []).forEach((id) => {
      if (id && !next.includes(id)) next.push(id);
    });

    writePantryCollected(next);
    return next;
  }

  function readTodayMenus() {
    try {
      const value = JSON.parse(localStorage.getItem(TODAY_MENU_KEY) || "[]");
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object" && value.recipeId) return [value];
      return [];
    } catch (error) {
      return [];
    }
  }

  function writeTodayMenus(menus) {
    localStorage.setItem(TODAY_MENU_KEY, JSON.stringify(Array.isArray(menus) ? menus : []));
  }

  function clearTodayMenus() {
    writeTodayMenus([]);
  }

  function readTodayMenu() {
    return readTodayMenus();
  }

  function writeTodayMenu(menu) {
    if (Array.isArray(menu)) {
      writeTodayMenus(menu);
      return;
    }

    if (menu && typeof menu === "object") {
      writeTodayMenus([menu]);
      return;
    }

    writeTodayMenus([]);
  }

  function clearTodayMenu() {
    clearTodayMenus();
  }

  function readShoppingList() {
    try {
      const list = JSON.parse(localStorage.getItem(SHOPPING_LIST_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function writeShoppingList(list) {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function clearShoppingList() {
    writeShoppingList([]);
  }

  window.AppStorage = {
    readLuggage,
    writeLuggage,
    readPantryCollected,
    writePantryCollected,
    addPantryCollected,
    readTodayMenus,
    writeTodayMenus,
    clearTodayMenus,
    readTodayMenu,
    writeTodayMenu,
    clearTodayMenu,
    readShoppingList,
    writeShoppingList,
    clearShoppingList
  };
})();
