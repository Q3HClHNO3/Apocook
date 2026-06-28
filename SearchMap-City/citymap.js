      const kitchenUrl = "../ApoCHEF-Kitchen/kitchen.html";
      const markerByStopId = new Map();
      const modal = document.getElementById("modal");
      const modalType = document.getElementById("modalType");
      const modalTitle = document.getElementById("modalTitle");
      const modalDescription = document.getElementById("modalDescription");
      const closeModal = document.getElementById("closeModal");
      const collectBtn = document.getElementById("collectBtn");
      const toast = document.getElementById("toast");
      const luggageToggle = document.getElementById("luggageToggle");
      const luggageBadge = document.getElementById("luggageBadge");
      const luggageModal = document.getElementById("luggageModal");
      const luggageList = document.getElementById("luggageList");
      const closeLuggage = document.getElementById("closeLuggage");
      const returnKitchenBtn = document.getElementById("returnKitchenBtn");
      const eatAllBtn = document.getElementById("eatAllBtn");
      const shoppingNoteToggle = document.getElementById("mapShoppingNoteToggle");
      const shoppingNoteText = document.getElementById("mapShoppingNoteText");
      const shoppingNoteDetail = document.getElementById("mapShoppingNoteDetail");
      const shoppingMissingList = document.getElementById("mapShoppingMissingList");
      const mapContainer = document.getElementById("map-container");
      const mapTitle = document.getElementById("mapTitle");
      const mapSubtitle = document.querySelector(".map-title p");

      let activeHotspot = null;
      let activeMoveFrame = 0;
      let activePeckTimer = 0;
      let map = null;
      let chickenMarker = null;
      let currentCity = null;
      let activeTraceHotspot = null;
      let traceReturnLocked = false;
      const { escapeHtml } = window.AppUtils;
      const {
        readLuggage,
        writeLuggage,
        readPantryCollected,
        addPantryCollected,
        readShoppingList,
        writeShoppingList
      } = window.AppStorage;

      function normalizeCityKey(value) {
        return String(value || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/-/g, "")
          .replace(/_/g, "");
      }

      async function loadCityRoutes() {
        await window.whenDatabaseReady;
        if (window.APP_DATA?.cityRoutes) return window.APP_DATA.cityRoutes;

        const response = await fetch("../data/cityRoutes.json");
        if (!response.ok) {
          throw new Error("无法加载 data/cityRoutes.json");
        }
        return response.json();
      }

      function readIngredientData(id) {
        return window.getIngredientData?.(id) || {
          id,
          name: id,
          emoji: "🍽️",
          type: "food",
          typeName: "地道食材",
          desc: ""
        };
      }

      function getHotspotName(id) {
        return readIngredientData(id).name || id;
      }

      function showToast(message) {
        toast.textContent = message;
        toast.classList.remove("is-showing");
        void toast.offsetWidth;
        toast.classList.add("is-showing");
      }

      function getTraceIngredientId() {
        return new URLSearchParams(window.location.search).get("trace") || "";
      }

      function updateLuggageBadge(count = readLuggage().length) {
        luggageBadge.textContent = String(count);
      }

      function updateEatAllButton(count = readLuggage().length) {
        if (!eatAllBtn) return;
        eatAllBtn.disabled = count === 0;
        eatAllBtn.setAttribute("aria-disabled", String(count === 0));
      }

      function syncLuggageState() {
        const count = readLuggage().length;
        updateLuggageBadge(count);
        updateEatAllButton(count);
        syncShoppingListStatuses();
        renderShoppingNote();
        refreshShoppingTargetMarkers();

        if (luggageModal.classList.contains("is-open")) {
          renderLuggageList();
        }
      }

      function getShoppingTargetSet() {
        return new Set(readShoppingList().map((item) => item.ingredientId));
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
        updateEatAllButton(luggage.length);
        const shoppingTargets = getShoppingTargetSet();

        if (!luggage.length) {
          luggageList.innerHTML = '<li class="luggage-empty">行李箱还是空的，去地图上找一点能让阿婆点头的食材吧。</li>';
          return;
        }

        luggageList.innerHTML = luggage
          .map((id, index) => {
            const shoppingTarget = shoppingTargets.has(id);
            return `
            <li class="luggage-item ${shoppingTarget ? "is-shopping-target" : ""}">
              <span>
                <span>${escapeHtml(getHotspotName(id))}</span><br />
                <span class="luggage-id">${escapeHtml(id)}</span>
                ${shoppingTarget ? '<span class="shopping-target-badge">采购目标</span>' : ""}
              </span>
              <button class="remove-btn" type="button" data-luggage-index="${index}" aria-label="原地吃掉${escapeHtml(getHotspotName(id))}">🍽️ 原地吃掉</button>
            </li>
          `;
          })
          .join("");
      }

      function removeLuggageItem(index) {
        const my_luggage = readLuggage();
        if (index < 0 || index >= my_luggage.length) return;

        my_luggage.splice(index, 1);
        writeLuggage(my_luggage);
        syncShoppingListStatuses();
        renderLuggageList();
        updateLuggageBadge(my_luggage.length);
        updateEatAllButton(my_luggage.length);
        renderShoppingNote();
        refreshShoppingTargetMarkers();
      }

      function eatAllLuggageItems() {
        const luggage = readLuggage();

        if (!luggage.length) {
          updateEatAllButton(0);
          return;
        }

        writeLuggage([]);
        syncShoppingListStatuses();
        renderLuggageList();
        updateLuggageBadge(0);
        updateEatAllButton(0);
        renderShoppingNote();
        refreshShoppingTargetMarkers();

        toast.textContent = "真香，阿婆全部吃光啦！";
        toast.classList.remove("is-showing");
        void toast.offsetWidth;
        toast.classList.add("is-showing");
      }

      function createHotspots(cityKey, city) {
        return (city.stops || []).map((stop) => {
          if (stop.kind === "landmark") {
            return {
              ...stop,
              cityKey,
              id: stop.landmarkId || stop.id,
              stopId: stop.id,
              kind: "landmark",
              typeName: stop.typeName || "城市打卡",
              emoji: stop.emoji || "📍",
              name: stop.name || stop.landmarkId || stop.id,
              desc: stop.desc || "",
              story: stop.story || "",
              lat: stop.lat,
              lng: stop.lng
            };
          }

          const ingredient = readIngredientData(stop.ingredientId);

          return {
            ...stop,
            cityKey,
            id: stop.ingredientId,
            stopId: stop.id,
            kind: "ingredient",
            ingredientId: stop.ingredientId,
            type: ingredient.type || "food",
            typeName: ingredient.typeName || "地道食材",
            emoji: ingredient.emoji || "🍽️",
            name: ingredient.name || stop.ingredientId,
            desc: ingredient.desc || ingredient.description || "",
            story: ingredient.story || "",
            lat: stop.lat,
            lng: stop.lng
          };
        });
      }

      function makeIngredientIcon(hotspot) {
        const luggageSet = new Set([...readLuggage(), ...readPantryCollected()]);
        const shoppingTargets = getShoppingTargetSet();
        const isTarget = hotspot.kind === "ingredient"
          && shoppingTargets.has(hotspot.ingredientId)
          && !luggageSet.has(hotspot.ingredientId);

        return L.divIcon({
          className: "city-hotspot-icon",
          iconSize: [46, 46],
          iconAnchor: [23, 36],
          html: `
            <div
              class="ingredient-marker ${isTarget ? "is-shopping-target-marker" : ""}"
              role="button"
              tabindex="0"
              data-stop-id="${escapeHtml(hotspot.stopId)}"
              data-ingredient-id="${escapeHtml(hotspot.ingredientId || "")}"
              data-name="${escapeHtml(hotspot.name)}"
              aria-label="${escapeHtml(hotspot.name)}"
            >
              <span class="ingredient-pulse"></span>
              <span class="ingredient-emoji">${escapeHtml(hotspot.emoji)}</span>
            </div>
          `
        });
      }

      function attachIngredientDomEvents(marker, hotspot) {
        const element = marker.getElement();
        if (!element) return;
        const markerButton = element.querySelector(".ingredient-marker") || element;

        const trigger = (event) => {
          event.preventDefault();
          event.stopPropagation();
          L.DomEvent.stop(event);
          runChickenToHotspot(hotspot);
        };

        L.DomEvent.disableClickPropagation(element);
        L.DomEvent.disableClickPropagation(markerButton);
        element.addEventListener("click", trigger);
        markerButton.addEventListener("click", trigger);
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            trigger(event);
          }
        });
        markerButton.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            trigger(event);
          }
        });
      }

      function updateHotspotVisibility() {
        if (!map) return;
        const isVisible = map.getZoom() >= 7;
        markerByStopId.forEach((marker) => {
          const element = marker.getElement();
          if (!element) return;
          element.style.opacity = isVisible ? "1" : "0";
          element.style.pointerEvents = isVisible ? "auto" : "none";
        });
      }

      function refreshShoppingTargetMarkers() {
        const luggageSet = new Set([...readLuggage(), ...readPantryCollected()]);
        const shoppingTargets = getShoppingTargetSet();

        markerByStopId.forEach((marker) => {
          const element = marker.getElement();
          if (!element) return;

          const markerButton = element.querySelector(".ingredient-marker");
          if (!markerButton) return;

          const ingredientId = markerButton.dataset.ingredientId;
          const isTarget = ingredientId && shoppingTargets.has(ingredientId) && !luggageSet.has(ingredientId);
          markerButton.classList.toggle("is-shopping-target-marker", isTarget);
        });
      }

      function createIngredientMarkers(hotspots) {
        const luggage = readLuggage();
        const ownedIngredients = new Set([...luggage, ...readPantryCollected()]);

        hotspots.forEach((hotspot) => {
          if (hotspot.kind === "ingredient" && ownedIngredients.has(hotspot.ingredientId)) return;

          const marker = L.marker([hotspot.lat, hotspot.lng], {
            icon: makeIngredientIcon(hotspot),
            zIndexOffset: 500
          }).addTo(map);

          marker.on("click", (event) => {
            L.DomEvent.stop(event);
            runChickenToHotspot(hotspot);
          });

          marker.on("add", () => {
            attachIngredientDomEvents(marker, hotspot);
            updateHotspotVisibility();
          });
          attachIngredientDomEvents(marker, hotspot);
          markerByStopId.set(hotspot.stopId, marker);
        });

        updateHotspotVisibility();
        refreshShoppingTargetMarkers();
      }

      function focusCity(city) {
        if (!city) return;

        document.title = city.title;
        mapTitle.textContent = city.title;
        mapContainer.setAttribute("aria-label", `${city.displayName} 行星聚焦漫游地图`);
        chickenMarker.setLatLng(city.center);

        setTimeout(() => {
          map.flyTo(city.center, city.zoom, {
            duration: 2.5,
            easeLinearity: 0.25
          });
        }, 500);
      }

      function findTraceHotspot(traceId, hotspots = []) {
        return hotspots.find((hotspot) => {
          return hotspot.kind === "ingredient" && hotspot.ingredientId === traceId;
        });
      }

      function handleTraceHotspotMissing(traceId) {
        const ingredient = window.getIngredientData?.(traceId);
        showToast(`阿婆暂时没在这张地图上找到 ${ingredient?.name || traceId} 的源头。`);
      }

      function triggerTraceOriginSequence(traceId, hotspots = []) {
        const hotspot = findTraceHotspot(traceId, hotspots);
        const ingredient = window.getIngredientData?.(traceId);

        if (!hotspot) {
          handleTraceHotspotMissing(traceId);
          return;
        }

        if (!map) return;

        const targetLatLng = L.latLng(hotspot.lat, hotspot.lng);

        map.flyTo(targetLatLng, Math.max(map.getZoom(), 16), {
          animate: true,
          duration: 1.8,
          easeLinearity: 0.25
        });

        window.setTimeout(() => {
          showTraceMagnifier(hotspot, ingredient);
        }, 1850);
      }

      function showTraceMagnifier(hotspot, ingredient) {
        removeTraceMagnifier();
        activeTraceHotspot = hotspot;

        const overlay = document.createElement("div");
        overlay.className = "trace-magnifier-overlay";
        overlay.id = "traceMagnifierOverlay";
        overlay.innerHTML = `
          <div class="trace-lens" aria-hidden="true"></div>
          <div class="trace-pixel-bubble">
            <div class="trace-pixel-title">源头追溯：${escapeHtml(ingredient?.name || hotspot.name || hotspot.ingredientId)}</div>
            <div class="trace-pixel-content" id="tracePixelContent"></div>
          </div>
        `;

        document.body.appendChild(overlay);
        positionTraceMagnifier(overlay, hotspot);

        const fullText = [
          ingredient?.desc || hotspot.desc || "",
          ingredient?.story || hotspot.story || ""
        ].filter(Boolean).join(" 阿婆说：");

        typeTraceText(fullText || "阿婆还没写下这个食材的故事。", () => {
          window.setTimeout(() => {
            returnToKitchenFromTrace(hotspot.ingredientId);
          }, 2000);
        });
      }

      function positionTraceMagnifier(overlay, hotspot) {
        if (!map || !overlay) return;

        const point = map.latLngToContainerPoint([hotspot.lat, hotspot.lng]);
        const mapRect = mapContainer.getBoundingClientRect();

        overlay.style.left = `${mapRect.left + point.x}px`;
        overlay.style.top = `${mapRect.top + point.y}px`;
      }

      function typeTraceText(text, onDone) {
        const container = document.getElementById("tracePixelContent");
        if (!container) return;

        container.textContent = "";

        let index = 0;
        const safeText = String(text || "");

        function tick() {
          container.textContent += safeText.charAt(index);
          index += 1;

          if (index < safeText.length) {
            window.setTimeout(tick, 45);
            return;
          }

          onDone?.();
        }

        tick();
      }

      function removeTraceMagnifier() {
        document.getElementById("traceMagnifierOverlay")?.remove();
        activeTraceHotspot = null;
      }

      function returnToKitchenFromTrace(ingredientId) {
        if (traceReturnLocked) return;
        traceReturnLocked = true;

        const params = new URLSearchParams();

        if (ingredientId) {
          params.set("highlight", ingredientId);
          sessionStorage.setItem("recent_trace_origin", ingredientId);
        }

        document.body.classList.add("trace-returning");

        window.setTimeout(() => {
          window.location.href = `../ApoCHEF-Kitchen/kitchen.html?${params.toString()}`;
        }, 700);
      }

      function getChickenElement() {
        return document.getElementById("chickenMarker");
      }

      function setChickenRunning(isRunning) {
        getChickenElement()?.classList.toggle("is-running", isRunning);
      }

      function setChickenPecking(isPecking) {
        getChickenElement()?.classList.toggle("is-pecking", isPecking);
      }

      function setChickenDirection(fromLatLng, toLatLng) {
        const fromPoint = map.latLngToContainerPoint(fromLatLng);
        const toPoint = map.latLngToContainerPoint(toLatLng);
        const avatar = document.getElementById("chicken-avatar");
        if (avatar) {
          avatar.style.setProperty("--face-x", toPoint.x >= fromPoint.x ? "1" : "-1");
        }
      }

      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function moveChickenSmoothly(targetLatLng, onArrive) {
        window.cancelAnimationFrame(activeMoveFrame);
        window.clearTimeout(activePeckTimer);
        setChickenPecking(false);

        const startLatLng = chickenMarker.getLatLng();
        const distance = map.distance(startLatLng, targetLatLng);
        const duration = Math.min(2200, Math.max(700, distance * 10));
        const startedAt = performance.now();

        setChickenDirection(startLatLng, targetLatLng);
        setChickenRunning(true);

        function tick(now) {
          const progress = Math.min(1, (now - startedAt) / duration);
          const eased = easeInOutCubic(progress);
          const lat = startLatLng.lat + (targetLatLng.lat - startLatLng.lat) * eased;
          const lng = startLatLng.lng + (targetLatLng.lng - startLatLng.lng) * eased;

          chickenMarker.setLatLng([lat, lng]);

          if (progress < 1) {
            activeMoveFrame = window.requestAnimationFrame(tick);
            return;
          }

          setChickenRunning(false);
          onArrive();
        }

        activeMoveFrame = window.requestAnimationFrame(tick);
      }

      function runChickenToHotspot(hotspot) {
        activeHotspot = hotspot;
        modal.classList.remove("is-open");
        const targetLatLng = L.latLng(hotspot.lat, hotspot.lng);

        moveChickenSmoothly(targetLatLng, () => {
          if (hotspot.kind === "landmark") {
            openHotspotModal(hotspot);
            return;
          }

          setChickenPecking(true);
          activePeckTimer = window.setTimeout(() => {
            setChickenPecking(false);
            openHotspotModal(hotspot);
          }, 980);
        });
      }

      function openHotspotModal(hotspot) {
        modalType.textContent = hotspot.typeName;
        modalTitle.textContent = hotspot.name;
        modalDescription.textContent = hotspot.story ? `${hotspot.desc}\n\n${hotspot.story}` : hotspot.desc;
        if (hotspot.kind === "landmark") {
          delete collectBtn.dataset.ingredientId;
          delete collectBtn.dataset.stopId;
        } else {
          collectBtn.dataset.ingredientId = hotspot.ingredientId;
          collectBtn.dataset.stopId = hotspot.stopId;
        }
        collectBtn.style.display = hotspot.kind === "landmark" ? "none" : "";
        modal.classList.add("is-open");
        closeModal.focus({ preventScroll: true });
      }

      function closeHotspotModal() {
        modal.classList.remove("is-open");
      }

      function collectActiveIngredient() {
        if (activeHotspot?.kind !== "ingredient") return;

        const ingredientId = collectBtn.dataset.ingredientId || activeHotspot?.ingredientId;
        const stopId = collectBtn.dataset.stopId || activeHotspot?.stopId;
        if (!ingredientId) return;

        const luggage = readLuggage();
        const wasAlreadyPacked = luggage.includes(ingredientId);
        if (!luggage.includes(ingredientId)) {
          luggage.push(ingredientId);
          writeLuggage(luggage);
        }
        syncShoppingListStatuses();
        const isShoppingHit = !wasAlreadyPacked && getShoppingTargetSet().has(ingredientId);

        const marker = markerByStopId.get(stopId);
        if (marker) {
          map.removeLayer(marker);
          markerByStopId.delete(stopId);
        }

        updateLuggageBadge(luggage.length);
        updateEatAllButton(luggage.length);
        renderShoppingNote();
        refreshShoppingTargetMarkers();
        closeHotspotModal();
        activeHotspot = null;
        toast.textContent = isShoppingHit ? "+1 采购目标达成！" : "食材已放进行李箱！";
        if (isShoppingHit) {
          luggageToggle.classList.add("is-shopping-hit");
          window.setTimeout(() => luggageToggle.classList.remove("is-shopping-hit"), 1100);
        }
        toast.classList.remove("is-showing");
        void toast.offsetWidth;
        toast.classList.add("is-showing");
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

      function openCustomTripPointPopup(latlng) {
        console.log("预留行程规划弹窗接口", {
          lat: Number(latlng.lat.toFixed(6)),
          lng: Number(latlng.lng.toFixed(6))
        });
      }

      function bindEvents() {
        map.on("click", (event) => {
          console.log(`自定义行程点 lat: ${event.latlng.lat.toFixed(6)}, lng: ${event.latlng.lng.toFixed(6)}`);
          openCustomTripPointPopup(event.latlng);
        });
        map.on("zoomend", updateHotspotVisibility);
        map.on("move zoom", () => {
          const overlay = document.getElementById("traceMagnifierOverlay");
          if (!overlay || !activeTraceHotspot) return;
          positionTraceMagnifier(overlay, activeTraceHotspot);
        });

        closeModal.addEventListener("click", closeHotspotModal);
        collectBtn.addEventListener("click", collectActiveIngredient);
        luggageToggle.addEventListener("click", openLuggage);
        shoppingNoteToggle?.addEventListener("click", toggleShoppingNoteDetail);
        closeLuggage.addEventListener("click", closeLuggageModal);
        eatAllBtn?.addEventListener("click", eatAllLuggageItems);
        luggageList.addEventListener("click", (event) => {
          const button = event.target.closest(".remove-btn");
          if (!button) return;
          removeLuggageItem(Number(button.dataset.luggageIndex));
        });
        returnKitchenBtn.addEventListener("click", returnToKitchenWithLuggage);

        modal.addEventListener("click", (event) => {
          if (event.target === modal) closeHotspotModal();
        });

        luggageModal.addEventListener("click", (event) => {
          if (event.target === luggageModal) closeLuggageModal();
        });

        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeHotspotModal();
            closeLuggageModal();
          }
        });

        window.addEventListener("focus", syncLuggageState);
        window.addEventListener("storage", (event) => {
          if (event.key === "my_luggage" || event.key === "shopping_list") {
            syncLuggageState();
          }
        });

        window.addEventListener("resize", () => {
          window.setTimeout(() => map.invalidateSize(), 120);
        });
      }

      async function initCityMap() {
        try {
          await window.whenDatabaseReady;
          const routes = await loadCityRoutes();
          const cities = routes.cities || {};

          const urlParams = new URLSearchParams(window.location.search);
          const rawCity = urlParams.get("city") || "Guangzhou";
          const cityKey =
            Object.keys(cities).find((key) => normalizeCityKey(key) === normalizeCityKey(rawCity)) || "Guangzhou";

          currentCity = cities[cityKey] || cities.Guangzhou || {
            cityId: rawCity,
            displayName: rawCity,
            title: `${rawCity} 行星聚焦漫游`,
            center: [20, 0],
            zoom: 2,
            stops: []
          };
          const hotspots = createHotspots(cityKey, currentCity);

          map = L.map("map-container", {
            center: [20, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: true,
            preferCanvas: true
          });
          map.setView([20, 0], 2);

          L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: "&copy; OpenStreetMap &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20
          }).addTo(map);
          setTimeout(() => {
            map.invalidateSize();
          }, 200);

          const chickenIcon = L.divIcon({
            className: "",
            iconSize: [70, 76],
            iconAnchor: [35, 58],
            html: `
              <div class="chicken-marker" id="chickenMarker">
                <span class="chicken-shadow"></span>
                <div id="chicken-avatar" aria-label="主厨走地鸡" role="img">
                  <span class="chicken-comb"></span>
                  <span class="chicken-eye"></span>
                  <span class="chicken-beak"></span>
                </div>
              </div>
            `
          });

          chickenMarker = L.marker([20, 0], {
            icon: chickenIcon,
            interactive: false,
            zIndexOffset: 1000
          }).addTo(map);

          bindEvents();
          document.title = currentCity.title || `${currentCity.displayName} 行星聚焦漫游`;
          mapTitle.textContent = currentCity.title || `${currentCity.displayName} 行星聚焦漫游`;
          mapContainer.setAttribute("aria-label", `${currentCity.displayName} 行星聚焦漫游地图`);

          if (hotspots.length) {
            mapSubtitle.textContent = "点击地图上的食材，走地鸡会跑过去啄一口，再把故事带给你。";
            createIngredientMarkers(hotspots);
          } else {
            mapSubtitle.textContent = "这座城市还没有被阿婆标记食材，之后再来搜刮。";
          }

          syncLuggageState();
          focusCity(currentCity);
          const traceId = getTraceIngredientId();

          if (traceId) {
            window.setTimeout(() => {
              triggerTraceOriginSequence(traceId, hotspots);
            }, 900);
          }
        } catch (error) {
          console.error(error);
          mapTitle.textContent = "地图路线加载失败";
          mapSubtitle.textContent = error.message || "无法加载 data/cityRoutes.json";
        }
      }

      initCityMap();
