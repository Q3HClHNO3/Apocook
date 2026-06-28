    const DATA_URL = "./cityData.json";

    let cityData = {
      generatedAt: "fallback",
      source: "empty fallback",
      destinations: []
    };

    let destinations = cityData.destinations;

    let activeIndex = 0;
    let photoIndex = 0;
    let dragStartX = null;
    let transitionTimer = null;
    let wheelLocked = false;

    const cabin = document.getElementById("cabin");
    const airportCode = document.getElementById("airportCode");
    const flightMood = document.getElementById("flightMood");
    const windowFrame = document.getElementById("windowFrame");
    const windowMask = document.getElementById("windowMask");
    const cityWindowHit = document.getElementById("cityWindowHit");
    const galleryImage = document.getElementById("galleryImage");
    const galleryImageNext = document.getElementById("galleryImageNext");
    const photoDots = document.getElementById("photoDots");
    const infoPanel = document.getElementById("infoPanel");
    const cityLabel = document.getElementById("cityLabel");
    const cityEnglish = document.getElementById("cityEnglish");
    const guideList = document.getElementById("guideList");
    const flightDecision = document.getElementById("flightDecision");
    const destinationRail = document.getElementById("destinationRail");
    const flightLuggageToggle = document.getElementById("flightLuggageToggle");
    const flightLuggageBadge = document.getElementById("flightLuggageBadge");
    const flightLuggageModal = document.getElementById("flightLuggageModal");
    const flightLuggageList = document.getElementById("flightLuggageList");
    const closeFlightLuggage = document.getElementById("closeFlightLuggage");
    const flightEatAllBtn = document.getElementById("flightEatAllBtn");
    const flightReturnKitchenBtn = document.getElementById("flightReturnKitchenBtn");
    const flightShoppingNoteToggle = document.getElementById("flightShoppingNoteToggle");
    const flightShoppingNoteText = document.getElementById("flightShoppingNoteText");
    const flightShoppingNoteDetail = document.getElementById("flightShoppingNoteDetail");
    const flightShoppingMissingList = document.getElementById("flightShoppingMissingList");
    const {
      readLuggage,
      writeLuggage,
      readPantryCollected,
      addPantryCollected,
      readShoppingList,
      writeShoppingList
    } = window.AppStorage;
    const kitchenUrl = "../ApoCHEF-Kitchen/kitchen.html";
    const CITY_MAP_URL = "../SearchMap-City/citymap.html";
    const FLIGHT_TRANSIT_MS = 600;
    const SLIDE_TRANSIT_MS = 640;
    const CITY_ILLUSTRATIONS = {
      Guangzhou: "./assets/fly-guangzhou.png",
      guangzhou: "./assets/fly-guangzhou.png",
      HongKong: "./assets/fly-hongkong.png",
      hongkong: "./assets/fly-hongkong.png"
    };

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function normalizeCityData(nextCityData) {
      const list = Array.isArray(nextCityData?.destinations) ? nextCityData.destinations : [];
      return {
        ...nextCityData,
        destinations: list
          .filter((destination) => Array.isArray(destination.photos) && destination.photos.length)
          .map((destination, index) => ({
            id: destination.id || `city-${index}`,
            city: destination.city || destination.label || "Unknown",
            cityMapId: destination.cityMapId || destination.cityRouteId || destination.cityId || destination.city || destination.id || "",
            cityRouteId: destination.cityRouteId || destination.cityMapId || destination.cityId || "",
            cityId: destination.cityId || destination.cityRouteId || destination.cityMapId || "",
            label: destination.label || destination.city || "未命名城市",
            code: destination.code || "AIR",
            flight: destination.flight || "待生成航班策略",
            background: destination.background || "radial-gradient(circle at 24% 16%, rgba(255,255,255,0.76), transparent 25rem), linear-gradient(135deg, #dceff7 0%, #f7dce4 52%, #fff2d5 100%)",
            photos: destination.photos,
            guide: Array.isArray(destination.guide) ? destination.guide : [],
            ingredientIds: Array.isArray(destination.ingredientIds) ? destination.ingredientIds : [],
            decision: destination.decision || "实时航班决策数据待接入。"
          }))
      };
    }

    function applyCityData(nextCityData) {
      const normalized = normalizeCityData(nextCityData);
      if (!normalized.destinations.length) return;
      cityData = normalized;
      destinations = cityData.destinations;
      activeIndex = Math.min(activeIndex, destinations.length - 1);
      photoIndex = 0;
      galleryImage.src = getDestinationPhoto(destinations[activeIndex], 0);
      galleryImage.alt = `${destinations[activeIndex].label} 建筑摄影`;
      renderInfo();
      syncActiveCabinWindowCity();
      renderRail();
      renderDots();
      preloadNearbyImages();
    }

    async function loadCityDataFromJson(url = DATA_URL) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextCityData = await response.json();
        applyCityData(nextCityData);
      } catch (error) {
        return cityData;
      }
      return cityData;
    }

    function showEmptyGallery() {
      airportCode.textContent = "AIR";
      flightMood.textContent = "cityData.json 未加载";
      cityLabel.textContent = "航线暂时不可用";
      cityEnglish.textContent = "No gallery data";
      guideList.innerHTML = "";
      const message = document.createElement("p");
      message.textContent = "FlightGallery 数据暂时加载失败，请检查 cityData.json。";
      guideList.appendChild(message);
      flightDecision.textContent = "暂无可显示的目的地。";
      galleryImage.removeAttribute("src");
      galleryImage.alt = "FlightGallery 数据暂时加载失败";
      photoDots.replaceChildren();
      destinationRail.replaceChildren();
    }

    window.cityData = cityData;
    window.applyCityData = applyCityData;
    window.loadCityDataFromJson = loadCityDataFromJson;

    function renderRail() {
      const nodes = destinations.map((destination, index) => {
        const button = document.createElement("button");
        const code = document.createElement("span");
        const label = document.createElement("strong");
        button.className = `node ${index === activeIndex ? "is-active" : ""}`;
        button.type = "button";
        button.dataset.index = index;
        code.textContent = destination.code;
        label.textContent = destination.label;
        button.append(code, label);
        button.addEventListener("click", () => {
          setDestination(Number(button.dataset.index));
        });
        return button;
      });

      destinationRail.replaceChildren(...nodes);
    }

    function renderDots() {
      const active = destinations[activeIndex];
      const dots = active.photos.map((_, index) => {
        const button = document.createElement("button");
        button.className = index === photoIndex ? "is-active" : "";
        button.type = "button";
        button.dataset.photo = index;
        button.setAttribute("aria-label", `查看第 ${index + 1} 张照片`);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          setPhoto(Number(button.dataset.photo), Number(button.dataset.photo) > photoIndex ? 1 : -1);
        });
        return button;
      });

      photoDots.replaceChildren(...dots);
    }

    function renderInfo() {
      const active = destinations[activeIndex];
      airportCode.textContent = active.code;
      flightMood.textContent = active.flight;
      cityLabel.textContent = active.label;
      cityEnglish.textContent = active.city;
      const ingredientCards = active.ingredientIds.map((id) => {
        const ingredient = window.getIngredientData(id);
        const paragraph = document.createElement("p");
        paragraph.textContent = `${ingredient.emoji} ${ingredient.name} · ${ingredient.typeName}｜${ingredient.desc}`;
        return paragraph;
      });
      const guideCards = active.guide.map((item) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = item;
        return paragraph;
      });
      guideList.replaceChildren(...ingredientCards, ...guideCards);
      flightDecision.textContent = active.decision;
      document.body.style.background = active.background;
      cabin.style.setProperty("--active", activeIndex);
      syncActiveCabinWindowCity();
      window.cityData = cityData;
    }

    function getDestinationCityId(destination = destinations[activeIndex]) {
      return destination?.cityMapId || destination?.cityRouteId || destination?.cityId || destination?.id || destination?.city || "";
    }

    function getDestinationCityLabel(destination = destinations[activeIndex]) {
      return destination?.label || destination?.city || getDestinationCityId(destination);
    }

    function getDestinationPhoto(destination = destinations[activeIndex], index = photoIndex) {
      const cityId = getDestinationCityId(destination);
      return CITY_ILLUSTRATIONS[cityId] || destination?.photos?.[index] || destination?.photos?.[0] || "";
    }

    function syncActiveCabinWindowCity() {
      if (!cityWindowHit) return;
      const active = destinations[activeIndex];
      const cityId = getDestinationCityId(active);
      cityWindowHit.dataset.city = cityId;
      cityWindowHit.disabled = !cityId;
      cityWindowHit.setAttribute(
        "aria-label",
        cityId ? `飞往${active?.label || active?.city || cityId}` : "当前目的地暂无城市地图"
      );
      console.log("[FlightGallery] active city:", cityId);
    }

    function goToActiveCityMap(event) {
      event?.preventDefault();
      event?.stopPropagation();

      const cityId = cityWindowHit?.dataset.city || getDestinationCityId();

      if (!cityId) {
        console.warn("[FlightGallery] No city id found for active destination.");
        return;
      }

      const params = new URLSearchParams({ city: cityId });
      const targetUrl = `${CITY_MAP_URL}?${params.toString()}`;

      console.log("[FlightGallery] go to citymap:", targetUrl);
      cityWindowHit.disabled = true;
      galleryImage.classList.add("is-flying");
      window.setTimeout(() => {
        window.location.href = targetUrl;
      }, FLIGHT_TRANSIT_MS);
    }

    function initCabinWindowCityLinks() {
      if (!cityWindowHit) return;

      cityWindowHit.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      cityWindowHit.addEventListener("pointerup", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      cityWindowHit.addEventListener("click", goToActiveCityMap);

      cityWindowHit.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          goToActiveCityMap(event);
        }
      });
    }

    function getIngredientName(id) {
      return window.getIngredientData(id).name;
    }

    function updateFlightLuggageBadge(count = readLuggage().length) {
      flightLuggageBadge.textContent = String(count);
    }

    function updateFlightEatAllButton(count = readLuggage().length) {
      if (!flightEatAllBtn) return;
      flightEatAllBtn.disabled = count === 0;
      flightEatAllBtn.setAttribute("aria-disabled", String(count === 0));
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

    function renderFlightShoppingNote() {
      if (!flightShoppingNoteText) return;
      const list = readShoppingList();
      const luggageSet = new Set([...readLuggage(), ...readPantryCollected()]);

      if (!list.length) {
        flightShoppingNoteText.textContent = "今天还没有采购任务。先回厨房点几道菜吧。";
        if (flightShoppingMissingList) flightShoppingMissingList.innerHTML = "";
        return;
      }

      const normalizedList = list.map((item) => ({
        ...item,
        recipeNames: Array.isArray(item.recipeNames) ? item.recipeNames : [item.recipeName || "阿婆菜谱"].filter(Boolean),
        status: luggageSet.has(item.ingredientId) ? "collected" : "needed"
      }));
      const collected = normalizedList.filter((item) => item.status === "collected");
      const needed = normalizedList.filter((item) => item.status !== "collected");
      flightShoppingNoteText.textContent = `已找到 ${collected.length}/${normalizedList.length} 样食材，还差 ${needed.length} 样。`;

      if (!flightShoppingMissingList) return;
      flightShoppingMissingList.innerHTML = [
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

    function createFlightLuggageItem(id, shoppingTargets = getShoppingTargetSet()) {
      const ingredient = window.getIngredientData(id);
      const item = document.createElement("li");
      const main = document.createElement("span");
      const name = document.createElement("span");
      const idLabel = document.createElement("span");
      const button = document.createElement("button");
      const shoppingTarget = shoppingTargets.has(id);

      item.className = `luggage-item${shoppingTarget ? " is-shopping-target" : ""}`;
      main.className = "luggage-item-main";
      name.className = "luggage-name";
      idLabel.className = "luggage-id";
      button.className = "eat-btn";
      button.type = "button";
      button.dataset.removeId = id;
      button.setAttribute("aria-label", `吃掉${ingredient.name}`);
      button.textContent = "🍽️ 吃掉";

      name.textContent = `${ingredient.emoji || ""} ${ingredient.name}`.trim();
      idLabel.textContent = id;
      main.append(name, idLabel);
      if (shoppingTarget) {
        const targetBadge = document.createElement("span");
        targetBadge.className = "shopping-target-badge";
        targetBadge.textContent = "采购目标";
        main.appendChild(targetBadge);
      }
      item.append(main, button);
      return item;
    }

    function renderFlightLuggageList() {
      const luggage = readLuggage();
      const shoppingTargets = getShoppingTargetSet();
      updateFlightEatAllButton(luggage.length);

      if (!luggage.length) {
        const empty = document.createElement("li");
        empty.className = "luggage-empty";
        empty.textContent = "飞行行李箱还是空的，去城市舷窗边带点好食材吧。";
        flightLuggageList.replaceChildren(empty);
        return;
      }

      flightLuggageList.replaceChildren(...luggage.map((id) => createFlightLuggageItem(id, shoppingTargets)));
    }

    function removeFlightLuggageItem(id) {
      const nextLuggage = readLuggage().filter((item) => item !== id);
      writeLuggage(nextLuggage);
      syncFlightLuggageState();
    }

    function eatAllFlightLuggage() {
      const luggage = readLuggage();

      if (!luggage.length) {
        updateFlightEatAllButton(0);
        return;
      }

      writeLuggage([]);
      syncFlightLuggageState();
    }

    function openFlightLuggage() {
      renderFlightShoppingNote();
      renderFlightLuggageList();
      flightShoppingNoteToggle?.setAttribute("aria-expanded", "false");
      if (flightShoppingNoteDetail) flightShoppingNoteDetail.hidden = true;
      flightLuggageModal.classList.add("is-open");
      closeFlightLuggage.focus({ preventScroll: true });
    }

    function closeFlightLuggageModal() {
      flightLuggageModal.classList.remove("is-open");
    }

    function toggleFlightShoppingNoteDetail() {
      if (!flightShoppingNoteToggle || !flightShoppingNoteDetail) return;

      const isOpen = flightShoppingNoteToggle.getAttribute("aria-expanded") === "true";
      const nextOpen = !isOpen;
      flightShoppingNoteToggle.setAttribute("aria-expanded", String(nextOpen));
      flightShoppingNoteDetail.hidden = !nextOpen;
      renderFlightShoppingNote();
    }

    function returnToKitchenWithFlightLuggage() {
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

    function syncFlightLuggageState() {
      const count = readLuggage().length;
      updateFlightLuggageBadge(count);
      updateFlightEatAllButton(count);
      syncShoppingListStatuses();
      renderFlightShoppingNote();

      if (flightLuggageModal.classList.contains("is-open")) {
        renderFlightLuggageList();
      }
    }

    function initFlightLuggageViewer() {
      if (!flightLuggageToggle || !flightLuggageModal || !flightLuggageList) return;
      flightLuggageToggle.addEventListener("click", openFlightLuggage);
      flightShoppingNoteToggle?.addEventListener("click", toggleFlightShoppingNoteDetail);
      closeFlightLuggage.addEventListener("click", closeFlightLuggageModal);

      flightLuggageList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-id]");
        if (!button) return;
        removeFlightLuggageItem(button.dataset.removeId);
      });

      flightEatAllBtn?.addEventListener("click", eatAllFlightLuggage);
      flightReturnKitchenBtn?.addEventListener("click", returnToKitchenWithFlightLuggage);

      flightLuggageModal.addEventListener("click", (event) => {
        if (event.target === flightLuggageModal) closeFlightLuggageModal();
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && flightLuggageModal.classList.contains("is-open")) {
          closeFlightLuggageModal();
        }
      });

      window.addEventListener("focus", syncFlightLuggageState);
      window.addEventListener("storage", (event) => {
        if (event.key === "my_luggage" || event.key === "shopping_list") syncFlightLuggageState();
      });

      syncFlightLuggageState();
    }

    function setPhoto(nextPhotoIndex, direction = 1) {
      const active = destinations[activeIndex];
      photoIndex = (nextPhotoIndex + active.photos.length) % active.photos.length;
      cabin.style.setProperty("--direction", direction);
      windowMask.classList.add("is-photo-changing");
      window.setTimeout(() => {
        galleryImage.src = getDestinationPhoto(active, photoIndex);
        galleryImage.alt = `${active.label} 建筑摄影`;
        renderDots();
        windowMask.classList.remove("is-photo-changing");
      }, 220);
    }

    function setDestination(nextIndex, directionOverride = 0) {
      if (!destinations.length) return;
      if (nextIndex === activeIndex) return;
      const direction = directionOverride || (nextIndex > activeIndex ? 1 : -1);
      activeIndex = (nextIndex + destinations.length) % destinations.length;
      syncActiveCabinWindowCity();
      photoIndex = 0;
      window.clearTimeout(transitionTimer);
      cabin.style.setProperty("--direction", direction);
      cabin.classList.add("is-moving");
      infoPanel.classList.add("is-changing");
      galleryImageNext.src = getDestinationPhoto(destinations[activeIndex], 0);
      galleryImageNext.alt = "";
      windowMask.classList.add("is-sliding");

      window.setTimeout(() => {
        const active = destinations[activeIndex];
        galleryImage.src = getDestinationPhoto(active, 0);
        galleryImage.alt = `${active.label} 建筑摄影`;
        galleryImageNext.removeAttribute("src");
        renderInfo();
        renderRail();
        renderDots();
        windowMask.classList.remove("is-sliding");
        infoPanel.classList.remove("is-changing");
        preloadNearbyImages();
      }, SLIDE_TRANSIT_MS);

      transitionTimer = window.setTimeout(() => {
        cabin.classList.remove("is-moving");
      }, 940);
    }

    function nextDestination() {
      if (!destinations.length) return;
      setDestination((activeIndex + 1) % destinations.length, 1);
    }

    function previousDestination() {
      if (!destinations.length) return;
      setDestination((activeIndex - 1 + destinations.length) % destinations.length, -1);
    }

    function preloadNearbyImages() {
      if (!destinations.length) return;
      const active = destinations[activeIndex];
      const next = destinations[(activeIndex + 1) % destinations.length];
      const previous = destinations[(activeIndex - 1 + destinations.length) % destinations.length];
      [active, next, previous].forEach((destination) => {
        destination.photos.slice(0, 2).forEach((src) => {
          const image = new Image();
            image.src = CITY_ILLUSTRATIONS[getDestinationCityId(destination)] || src;
        });
      });
    }

    document.getElementById("nextDestination").addEventListener("click", nextDestination);
    document.getElementById("previousDestination").addEventListener("click", previousDestination);

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") nextDestination();
      if (event.key === "ArrowLeft") previousDestination();
    });

    cabin.addEventListener("wheel", (event) => {
      const intent = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(intent) < 18 || wheelLocked) return;
      event.preventDefault();
      wheelLocked = true;
      if (intent > 0) nextDestination();
      if (intent < 0) previousDestination();
      window.setTimeout(() => {
        wheelLocked = false;
      }, 860);
    }, { passive: false });

    windowFrame.addEventListener("pointerdown", (event) => {
      if (event.target.closest("#cityWindowHit, .arrow, #photoDots, #photoDots button")) {
        return;
      }

      dragStartX = event.clientX;
      windowFrame.setPointerCapture(event.pointerId);
    });

    windowFrame.addEventListener("pointerup", (event) => {
      if (event.target.closest("#cityWindowHit, .arrow, #photoDots, #photoDots button")) {
        return;
      }

      if (dragStartX === null) return;
      const offset = event.clientX - dragStartX;
      dragStartX = null;
      if (offset < -72) nextDestination();
      if (offset > 72) previousDestination();
    });

    async function initGallery() {
      await window.whenDatabaseReady;
      initCabinWindowCityLinks();
      initFlightLuggageViewer();
      await loadCityDataFromJson();
      if (!destinations.length) {
        showEmptyGallery();
        return;
      }
      renderInfo();
      renderRail();
      renderDots();
      preloadNearbyImages();
    }

    initGallery();
