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
    const galleryImage = document.getElementById("galleryImage");
    const photoDots = document.getElementById("photoDots");
    const infoPanel = document.getElementById("infoPanel");
    const cityLabel = document.getElementById("cityLabel");
    const cityEnglish = document.getElementById("cityEnglish");
    const guideList = document.getElementById("guideList");
    const flightDecision = document.getElementById("flightDecision");
    const destinationRail = document.getElementById("destinationRail");

    function normalizeCityData(nextCityData) {
      const list = Array.isArray(nextCityData?.destinations) ? nextCityData.destinations : [];
      return {
        ...nextCityData,
        destinations: list
          .filter((destination) => Array.isArray(destination.photos) && destination.photos.length)
          .map((destination, index) => ({
            id: destination.id || `city-${index}`,
            city: destination.city || destination.label || "Unknown",
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
      galleryImage.src = destinations[activeIndex].photos[0];
      galleryImage.alt = `${destinations[activeIndex].label} 建筑摄影`;
      renderInfo();
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
      window.cityData = cityData;
    }

    function setPhoto(nextPhotoIndex, direction = 1) {
      const active = destinations[activeIndex];
      photoIndex = (nextPhotoIndex + active.photos.length) % active.photos.length;
      cabin.style.setProperty("--direction", direction);
      windowMask.classList.add("is-changing");
      window.setTimeout(() => {
        galleryImage.src = active.photos[photoIndex];
        galleryImage.alt = `${active.label} 建筑摄影`;
        renderDots();
        windowMask.classList.remove("is-changing");
      }, 220);
    }

    function setDestination(nextIndex, directionOverride = 0) {
      if (!destinations.length) return;
      if (nextIndex === activeIndex) return;
      const direction = directionOverride || (nextIndex > activeIndex ? 1 : -1);
      activeIndex = (nextIndex + destinations.length) % destinations.length;
      photoIndex = 0;
      window.clearTimeout(transitionTimer);
      cabin.style.setProperty("--direction", direction);
      cabin.classList.add("is-moving");
      windowMask.classList.add("is-changing");
      infoPanel.classList.add("is-changing");

      window.setTimeout(() => {
        const active = destinations[activeIndex];
        galleryImage.src = active.photos[0];
        galleryImage.alt = `${active.label} 建筑摄影`;
        renderInfo();
        renderRail();
        renderDots();
        windowMask.classList.remove("is-changing");
        infoPanel.classList.remove("is-changing");
        preloadNearbyImages();
      }, 260);

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
          image.src = src;
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
      dragStartX = event.clientX;
      windowFrame.setPointerCapture(event.pointerId);
    });

    windowFrame.addEventListener("pointerup", (event) => {
      if (dragStartX === null) return;
      const offset = event.clientX - dragStartX;
      dragStartX = null;
      if (offset < -72) nextDestination();
      if (offset > 72) previousDestination();
    });

    async function initGallery() {
      await window.whenDatabaseReady;
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
