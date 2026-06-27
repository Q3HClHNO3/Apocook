    let flightsData = [];

    const flightsList = document.querySelector("#flightsList");
    const toast = document.querySelector("#toast");
    const luggageToggle = document.getElementById("luggageToggle");
    const luggageBadge = document.getElementById("luggageBadge");
    const luggageModal = document.getElementById("luggageModal");
    const luggageList = document.getElementById("luggageList");
    const closeLuggage = document.getElementById("closeLuggage");
    const returnKitchenBtn = document.getElementById("returnKitchenBtn");
    const kitchenUrl = "../ApoCHEF-Kitchen/kitchen.html";
    let currentLanguage = "en";
    let toastTimer = null;
    const { escapeHtml, normalizeId: normalize } = window.AppUtils;
    const { readLuggage, writeLuggage } = window.AppStorage;

    function getActivatedFlightId() {
      const params = new URLSearchParams(window.location.search);
      const target = normalize(params.get("target"));
      const source = normalize(params.get("source"));

      if (!target && !source) return "";

      const found = flightsData.find((flight) => {
        const cityValues = [
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
      row.dataset.cityEn = flight.city.en;
      row.setAttribute("aria-label", `${flight.time} ${flight.city.en} ${flight.flight}`);

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
        const currentCityEnglishName = flight.city.en;
        const cityMapUrl = "./citymap.html?city=" + encodeURIComponent(currentCityEnglishName);

        console.log("Flight row clicked:", {
          id: flight.id,
          city: currentCityEnglishName,
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
      try {
        const response = await fetch("../data/flights.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        flightsData = Array.isArray(data) ? data : [];
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

    function renderLuggageList() {
      const luggage = readLuggage();

      if (!luggage.length) {
        luggageList.innerHTML = '<li class="luggage-empty">行李箱还是空的，去城市里找一点能让阿婆点头的食材吧。</li>';
        return;
      }

      luggageList.innerHTML = luggage
        .map((id) => `
          <li class="luggage-item">
            <span class="luggage-item-main">
              <span class="luggage-name">${escapeHtml(getIngredientName(id))}</span>
              <span class="luggage-id">${escapeHtml(id)}</span>
            </span>
            <button class="eat-btn" type="button" data-remove-id="${escapeHtml(id)}" aria-label="吃掉${escapeHtml(getIngredientName(id))}">🍽️ 吃掉</button>
          </li>
        `)
        .join("");
    }

    function removeIngredient(id) {
      let luggage = readLuggage();
      luggage = luggage.filter((item) => item !== id);
      writeLuggage(luggage);
      renderLuggageList();
      updateLuggageBadge(luggage.length);
    }

    function openLuggage() {
      renderLuggageList();
      luggageModal.classList.add("is-open");
      closeLuggage.focus({ preventScroll: true });
    }

    function closeLuggageModal() {
      luggageModal.classList.remove("is-open");
    }

    function initLuggageViewer() {
      luggageToggle.addEventListener("click", openLuggage);
      closeLuggage.addEventListener("click", closeLuggageModal);
      luggageList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-id]");
        if (!button) return;
        removeIngredient(button.dataset.removeId);
      });

      returnKitchenBtn.addEventListener("click", () => {
        window.location.href = kitchenUrl;
      });

      luggageModal.addEventListener("click", (event) => {
        if (event.target === luggageModal) closeLuggageModal();
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && luggageModal.classList.contains("is-open")) {
          closeLuggageModal();
        }
      });

      window.addEventListener("focus", updateLuggageBadge);
      window.addEventListener("storage", (event) => {
        if (event.key === "my_luggage") updateLuggageBadge();
      });

      updateLuggageBadge();
    }

    document.addEventListener("DOMContentLoaded", async () => {
      await window.whenDatabaseReady;
      await loadFlights();
      renderFlights();
      initLuggageViewer();
      window.setInterval(switchLanguage, 3000);
    });
