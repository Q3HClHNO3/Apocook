    let flightsData = [];

    const flightsList = document.querySelector("#flightsList");
    const toast = document.querySelector("#toast");
    const luggageToggle = document.getElementById("luggageToggle");
    const luggageBadge = document.getElementById("luggageBadge");
    const luggageModal = document.getElementById("luggageModal");
    const luggageList = document.getElementById("luggageList");
    const closeLuggage = document.getElementById("closeLuggage");
    const eatAllBtn = document.getElementById("eatAllBtn");
    const returnKitchenBtn = document.getElementById("returnKitchenBtn");
    const shoppingNoteToggle = document.getElementById("cityShoppingNoteToggle");
    const shoppingNoteText = document.getElementById("cityShoppingNoteText");
    const shoppingNoteDetail = document.getElementById("cityShoppingNoteDetail");
    const shoppingMissingList = document.getElementById("cityShoppingMissingList");
    const kitchenUrl = "../ApoCHEF-Kitchen/kitchen.html";
    let currentLanguage = "en";
    let toastTimer = null;
    const { escapeHtml, normalizeId: normalize } = window.AppUtils;
    const {
      readLuggage,
      writeLuggage,
      readPantryCollected,
      addPantryCollected,
      readShoppingList,
      writeShoppingList
    } = window.AppStorage;

    function getCityRouteLookup() {
      const cities = window.APP_DATA?.cityRoutes?.cities;
      if (!cities || Array.isArray(cities) || typeof cities !== "object") return new Set();

      const lookup = new Set();
      Object.entries(cities).forEach(([cityKey, city]) => {
        lookup.add(normalize(cityKey));
        if (city?.cityId) lookup.add(normalize(city.cityId));
        if (city?.displayName) lookup.add(normalize(city.displayName));
      });

      return lookup;
    }

    function getDestinationRouteId(destination) {
      return normalize(destination?.cityRouteId || destination?.cityMapId || destination?.cityId || destination?.id || destination?.city);
    }

    function hasCityRoute(flight, cityRouteLookup = getCityRouteLookup()) {
      const routeValues = [
        flight.cityRouteId,
        flight.cityMapId,
        flight.cityId,
        flight.id,
        flight.city?.en
      ].map(normalize).filter(Boolean);

      return routeValues.some((value) => cityRouteLookup.has(value));
    }

    function normalizeDestinationToFlight(destination, index, cityRouteLookup) {
      const routeId = getDestinationRouteId(destination);
      const flightInfo = destination?.flightInfo || {};
      const cityEn = destination?.city || destination?.cityId || destination?.id || routeId || `destination-${index + 1}`;
      const cityZh = destination?.label || destination?.city || cityEn;
      const available = cityRouteLookup.has(routeId);
      const status = available
        ? (flightInfo.status || { en: "Scheduled", zh: "计划中" })
        : { en: "Coming Soon", zh: "即将开放" };

      return {
        id: destination?.id || routeId || `destination-${index + 1}`,
        time: flightInfo.time || "--:--",
        city: {
          en: cityEn,
          zh: cityZh
        },
        flight: flightInfo.flightNumber || destination?.code || destination?.flight || "APO",
        gate: flightInfo.gate || destination?.code || "--",
        status,
        statusType: available ? (flightInfo.statusType || "scheduled") : "scheduled",
        sources: [
          ...(Array.isArray(destination?.ingredientIds) ? destination.ingredientIds : []),
          ...(Array.isArray(destination?.flavorTags) ? destination.flavorTags : []),
          ...(Array.isArray(destination?.displayTags) ? destination.displayTags : [])
        ],
        cityRouteId: routeId,
        cityMapId: normalize(destination?.cityMapId || routeId),
        cityId: normalize(destination?.cityId || routeId),
        hasCityRoute: available
      };
    }

    function normalizeLegacyFlight(flight, cityRouteLookup) {
      const routeId = normalize(flight?.cityRouteId || flight?.cityMapId || flight?.cityId || flight?.id || flight?.city?.en);
      const normalizedFlight = {
        ...flight,
        cityRouteId: routeId,
        cityMapId: normalize(flight?.cityMapId || routeId),
        cityId: normalize(flight?.cityId || routeId)
      };
      const available = hasCityRoute(normalizedFlight, cityRouteLookup);

      return {
        ...normalizedFlight,
        status: available
          ? normalizedFlight.status
          : { en: "Coming Soon", zh: "即将开放" },
        statusType: available ? normalizedFlight.statusType : "scheduled",
        hasCityRoute: available
      };
    }

    function getActivatedFlightId() {
      const params = new URLSearchParams(window.location.search);
      const target = normalize(params.get("target"));
      const source = normalize(params.get("source"));

      if (!target && !source) return "";

      const found = flightsData.find((flight) => {
        const cityValues = [
          flight.cityRouteId,
          flight.cityMapId,
          flight.cityId,
          flight.id,
          flight.city.en,
          flight.city.zh,
          flight.city.en.replace(/\s+/g, "")
        ].map(normalize);

        const sourceValues = (flight.sources || []).map(normalize);

        return cityValues.includes(target) || sourceValues.includes(source);
      });

      return found ? found.id : "";
    }

    function createFlightRow(flight, activeId) {
      const row = document.createElement("a");
      row.href = "javascript:void(0)";
      row.className = "flight-row";
      row.dataset.id = flight.id;
      row.dataset.cityRouteId = flight.cityRouteId || flight.cityMapId || "";
      row.dataset.cityEn = flight.city.en;
      row.setAttribute("aria-label", `${flight.time} ${flight.city.en} ${flight.flight}`);
      row.setAttribute("aria-disabled", String(!flight.hasCityRoute));

      if (flight.id === activeId) {
        row.classList.add("is-active");
      }

      row.innerHTML = `
        <span class="time">${flight.time}</span>
        <span class="city" data-field="city">${flight.city[currentLanguage]}</span>
        <span class="flight-no">${flight.flight}</span>
        <span><span class="gate-badge">${flight.gate}</span></span>
        <span><span class="status-badge status-${flight.statusType}" data-field="status">${flight.status[currentLanguage]}</span></span>
      `;

      row.addEventListener("click", () => {
        if (!flight.hasCityRoute) {
          showToast("这座城市还没有被阿婆标记食材，之后再来搜刮。");
          return;
        }

        const cityRouteId = normalize(flight.cityRouteId || flight.cityMapId || flight.city.en);
        const cityMapUrl = "./citymap.html?city=" + encodeURIComponent(cityRouteId);

        console.log("Flight row clicked:", {
          id: flight.id,
          cityRouteId,
          url: cityMapUrl
        });

        window.location.href = cityMapUrl;
      });

      return row;
    }

    function renderFlights() {
      const activeId = getActivatedFlightId();
      const fragment = document.createDocumentFragment();

      flightsData.forEach((flight) => {
        fragment.appendChild(createFlightRow(flight, activeId));
      });

      flightsList.replaceChildren(fragment);
    }

    function switchLanguage() {
      currentLanguage = currentLanguage === "en" ? "zh" : "en";
      flightsList.classList.add("refreshing");

      flightsData.forEach((flight) => {
        const row = flightsList.querySelector(`[data-id="${flight.id}"]`);
        if (!row) return;

        row.querySelector('[data-field="city"]').textContent = flight.city[currentLanguage];
        row.querySelector('[data-field="status"]').textContent = flight.status[currentLanguage];
      });

      window.setTimeout(() => {
        flightsList.classList.remove("refreshing");
      }, 440);
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");

      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.classList.remove("show");
      }, 2200);
    }

    async function loadFlights() {
      const cityRouteLookup = getCityRouteLookup();
      const destinations = Array.isArray(window.APP_DATA?.destinations) ? window.APP_DATA.destinations : [];

      if (destinations.length) {
        flightsData = destinations.map((destination, index) => normalizeDestinationToFlight(destination, index, cityRouteLookup));
        return;
      }

      try {
        const response = await fetch("../data/flights.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        flightsData = Array.isArray(data)
          ? data.map((flight) => normalizeLegacyFlight(flight, cityRouteLookup))
          : [];
      } catch (error) {
        console.error("无法加载 data/flights.json", error);
        flightsData = [];
        showToast("机场大屏暂时没有航班数据。");
      }
    }

    function getIngredientName(id) {
      return window.getIngredientData(id).name;
    }

    function updateLuggageBadge(count = readLuggage().length) {
      luggageBadge.textContent = String(count);
    }

    function updateEatAllButton(count = readLuggage().length) {
      if (!eatAllBtn) return;
      eatAllBtn.disabled = count === 0;
      eatAllBtn.setAttribute("aria-disabled", String(count === 0));
    }

    function getShoppingTargetSet() {
      return new Set(readShoppingList().map((item) => item.ingredientId));
    }

    function isShoppingTarget(ingredientId) {
      return getShoppingTargetSet().has(ingredientId);
    }

    function syncShoppingListStatuses() {
      const list = readShoppingList();
      if (!list.length) return;

      const luggageSet = new Set([...readLuggage(), ...readPantryCollected()]);
      let changed = false;
      const nextList = list.map((item) => {
        const status = luggageSet.has(item.ingredientId) ? "collected" : "needed";
        if (item.status === status) return item;
        changed = true;
        return { ...item, status, updatedAt: Date.now() };
      });

      if (changed) writeShoppingList(nextList);
    }

    function renderShoppingNote() {
      if (!shoppingNoteText) return;
      const list = readShoppingList();
      const luggageSet = new Set([...readLuggage(), ...readPantryCollected()]);

      if (!list.length) {
        shoppingNoteText.textContent = "今天还没有采购任务。先回厨房点几道菜吧。";
        if (shoppingMissingList) shoppingMissingList.innerHTML = "";
        return;
      }

      const normalizedList = list.map((item) => ({
        ...item,
        recipeNames: Array.isArray(item.recipeNames) ? item.recipeNames : [item.recipeName || "阿婆菜谱"].filter(Boolean),
        status: luggageSet.has(item.ingredientId) ? "collected" : "needed"
      }));
      const collected = normalizedList.filter((item) => item.status === "collected");
      const needed = normalizedList.filter((item) => item.status !== "collected");
      shoppingNoteText.textContent = `已找到 ${collected.length}/${normalizedList.length} 样食材，还差 ${needed.length} 样。`;

      if (!shoppingMissingList) return;
      shoppingMissingList.innerHTML = [
        needed.length ? `<li class="shopping-detail-heading">还差</li>` : "",
        ...needed.map((item) => {
          const ingredient = window.getIngredientData(item.ingredientId);
          return `
            <li class="shopping-detail-item is-needed">
              🛒 ${escapeHtml(ingredient.name)}
              <span>用于：${escapeHtml(item.recipeNames.join("、"))}</span>
            </li>
          `;
        }),
        collected.length ? `<li class="shopping-detail-heading">已找到</li>` : "",
        ...collected.map((item) => {
          const ingredient = window.getIngredientData(item.ingredientId);
          return `
            <li class="shopping-detail-item is-collected">
              🧳 ${escapeHtml(ingredient.name)}
              <span>用于：${escapeHtml(item.recipeNames.join("、"))}</span>
            </li>
          `;
        })
      ].filter(Boolean).join("");
    }

    function renderLuggageList() {
      const luggage = readLuggage();
      const shoppingTargets = getShoppingTargetSet();
      updateEatAllButton(luggage.length);

      if (!luggage.length) {
        luggageList.innerHTML = '<li class="luggage-empty">行李箱还是空的，去城市里找一点能让阿婆点头的食材吧。</li>';
        return;
      }

      luggageList.innerHTML = luggage
        .map((id) => {
          const shoppingTarget = shoppingTargets.has(id);
          return `
          <li class="luggage-item ${shoppingTarget ? "is-shopping-target" : ""}">
            <span class="luggage-item-main">
              <span class="luggage-name">${escapeHtml(getIngredientName(id))}</span>
              <span class="luggage-id">${escapeHtml(id)}</span>
              ${shoppingTarget ? '<span class="shopping-target-badge">采购目标</span>' : ""}
            </span>
            <button class="eat-btn" type="button" data-remove-id="${escapeHtml(id)}" aria-label="吃掉${escapeHtml(getIngredientName(id))}">🍽️ 吃掉</button>
          </li>
        `;
        })
        .join("");
    }

    function removeIngredient(id) {
      let luggage = readLuggage();
      luggage = luggage.filter((item) => item !== id);
      writeLuggage(luggage);
      syncShoppingListStatuses();
      renderLuggageList();
      updateLuggageBadge(luggage.length);
      renderShoppingNote();
    }

    function eatAllIngredients() {
      const luggage = readLuggage();

      if (!luggage.length) {
        showToast("行李箱已经空啦。");
        updateEatAllButton(0);
        return;
      }

      writeLuggage([]);
      syncShoppingListStatuses();
      renderLuggageList();
      updateLuggageBadge(0);
      updateEatAllButton(0);
      renderShoppingNote();
      showToast("真香，阿婆全部吃光啦！");
    }

    function openLuggage() {
      renderShoppingNote();
      renderLuggageList();
      shoppingNoteToggle?.setAttribute("aria-expanded", "false");
      if (shoppingNoteDetail) shoppingNoteDetail.hidden = true;
      luggageModal.classList.add("is-open");
      closeLuggage.focus({ preventScroll: true });
    }

    function closeLuggageModal() {
      luggageModal.classList.remove("is-open");
    }

    function toggleShoppingNoteDetail() {
      if (!shoppingNoteToggle || !shoppingNoteDetail) return;

      const isOpen = shoppingNoteToggle.getAttribute("aria-expanded") === "true";
      const nextOpen = !isOpen;
      shoppingNoteToggle.setAttribute("aria-expanded", String(nextOpen));
      shoppingNoteDetail.hidden = !nextOpen;
      renderShoppingNote();
    }

    function returnToKitchenWithLuggage() {
      const luggage = readLuggage();

      if (luggage.length) {
        addPantryCollected(luggage);
        sessionStorage.setItem("recent_luggage_return", JSON.stringify(luggage));
        writeLuggage([]);
        syncShoppingListStatuses();
      } else {
        sessionStorage.removeItem("recent_luggage_return");
      }

      window.location.href = kitchenUrl;
    }

    function initLuggageViewer() {
      luggageToggle.addEventListener("click", openLuggage);
      shoppingNoteToggle?.addEventListener("click", toggleShoppingNoteDetail);
      closeLuggage.addEventListener("click", closeLuggageModal);
      eatAllBtn?.addEventListener("click", eatAllIngredients);
      luggageList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-id]");
        if (!button) return;
        removeIngredient(button.dataset.removeId);
      });

      returnKitchenBtn.addEventListener("click", returnToKitchenWithLuggage);

      luggageModal.addEventListener("click", (event) => {
        if (event.target === luggageModal) closeLuggageModal();
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && luggageModal.classList.contains("is-open")) {
          closeLuggageModal();
        }
      });

      window.addEventListener("focus", syncLuggageState);
      window.addEventListener("storage", (event) => {
        if (event.key === "my_luggage" || event.key === "shopping_list") syncLuggageState();
      });

      syncLuggageState();
    }

    function syncLuggageState() {
      const count = readLuggage().length;
      updateLuggageBadge(count);
      updateEatAllButton(count);
      syncShoppingListStatuses();
      renderShoppingNote();
      if (luggageModal.classList.contains("is-open")) {
        renderLuggageList();
      }
    }

    document.addEventListener("DOMContentLoaded", async () => {
      await window.whenDatabaseReady;
      await loadFlights();
      renderFlights();
      initLuggageViewer();
      window.setInterval(switchLanguage, 3000);
    });
