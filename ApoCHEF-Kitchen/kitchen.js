      const { escapeHtml } = window.AppUtils;
      const {
        readLuggage,
        readPantryCollected,
        readTodayMenus,
        writeTodayMenus,
        readShoppingList,
        writeShoppingList
      } = window.AppStorage;
      const recipeLoadErrorMessage = "菜谱暂时加载失败，请检查 data/recipes.json。";
      const FRIDGE_ZONE_LABELS = {
        vegetable: "蔬菜区",
        meat: "肉类区",
        seasoning: "调味料区",
        staple: "主食/粮油区",
        travel: "旅行带回 / 特产区",
        other: "其他"
      };
      const FRIDGE_ZONE_ORDER = ["vegetable", "meat", "seasoning", "staple", "travel", "other"];

      const originStories = {};

      const state = {
        selectedIngredients: [],
        selectedMethod: "",
        recipes: [],
        ingredientById: {},
        ingredientByName: {},
        collectedIngredients: new Set(),
        luggageIngredients: new Set(),
        recentReturnedIngredients: new Set(),
        highlightIngredient: "",
        currentViewingRecipe: null
      };

      const mainLayer = document.querySelector("#main-layer");
      const fridgeLayer = document.querySelector("#fridge-layer");
      const fridgeStage = document.querySelector(".fridge-stage");
      const mainSceneImg = document.querySelector("#main-scene-img");
      const fridgeSceneImg = document.querySelector("#fridge-scene-img");
      const recipeBoardZone = document.querySelector(".zone-recipe-board");
      const sceneToast = document.querySelector("#scene-toast");
      const closeFridgeBtn = document.querySelector("#close-fridge");
      const fridgeNote = document.querySelector("#fridge-note");
      const fridgeZones = document.querySelector("#fridge-zones");
      const basketIcons = document.querySelector("#basket-icons");
      const selectedToolEl = document.querySelector("#selected-tool");
      const fireButton = document.querySelector("#fire-button");
      const recipeBookModal = document.querySelector("#recipe-book-modal");
      const recipeBookList = document.querySelector("#recipe-book-list");
      const recipeBookClose = recipeBookModal?.querySelector(".recipe-book-close");
      const recipeBookBackdrop = recipeBookModal?.querySelector(".modal-backdrop");
      const modal = document.querySelector("#result-modal");
      const closeBtn = modal.querySelector(".close");
      const backdrop = modal.querySelector(".modal-backdrop");
      const modalKicker = document.querySelector("#modal-kicker");
      const modalTitle = document.querySelector("#modal-title");
      const modalMeta = document.querySelector("#modal-meta");
      const setTodayMenuBtn = document.querySelector("#set-today-menu-btn");
      const backToRecipeBookBtn = document.querySelector("#back-to-recipe-book-btn");
      const modalSecret = document.querySelector("#modal-secret");
      const modalGossip = document.querySelector("#modal-gossip");
      const modalSteps = document.querySelector("#modal-steps");
      const stepsBlock = document.querySelector("#steps-block");
      const originTooltip = document.querySelector("#origin-tooltip");
      const todayMenuNote = document.querySelector("#todayMenuNote");
      const todayMenuNoteList = document.querySelector("#todayMenuNoteList");
      let tooltipTimer = 0;

      function isTouchLike() {
        return window.matchMedia("(hover: none), (pointer: coarse)").matches || window.innerWidth <= 760;
      }

      function readCollectedIngredients() {
        try {
          const luggage = readLuggage();
          const pantryCollected = typeof readPantryCollected === "function" ? readPantryCollected() : [];
          const legacyIngredients = JSON.parse(localStorage.getItem("my_ingredients") || "[]");
          const collected = [
            ...luggage,
            ...pantryCollected,
            ...(Array.isArray(legacyIngredients) ? legacyIngredients : [])
          ];
          state.luggageIngredients = new Set([...luggage, ...pantryCollected]);
          state.collectedIngredients = new Set(collected);
        } catch (error) {
          state.luggageIngredients = new Set();
          state.collectedIngredients = new Set();
        }
      }

      function readRecentLuggageReturn() {
        try {
          const value = JSON.parse(sessionStorage.getItem("recent_luggage_return") || "[]");
          return Array.isArray(value) ? value : [];
        } catch (error) {
          return [];
        }
      }

      function readHighlightIngredient() {
        const params = new URLSearchParams(window.location.search);
        state.highlightIngredient = params.get("highlight") || sessionStorage.getItem("recent_trace_origin") || "";
        state.recentReturnedIngredients = new Set([
          ...readRecentLuggageReturn(),
          ...state.highlightIngredient.split(",").map((id) => id.trim()).filter(Boolean)
        ]);
      }

      function isIngredientUnlocked(ingredient) {
        if (!ingredient?.id) return true;
        if (isExternalIngredient(ingredient)) return state.luggageIngredients.has(ingredient.id);
        return true;
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

      function getIngredientSource(ingredient) {
        if (!ingredient?.id) return "fridge";

        if (state.luggageIngredients.has(ingredient.id)) return "suitcase";
        if (isExternalIngredient(ingredient)) return "locked";

        return "fridge";
      }

      function updateIngredientElementSource(ingredient) {
        if (!ingredient?.id) return;
        const ingredientElement = document.getElementById(ingredient.id);
        if (!ingredientElement) return;

        const source = getIngredientSource(ingredient);
        ingredientElement.classList.remove("is-suitcase-source", "is-fridge-source");
        if (source === "suitcase") ingredientElement.classList.add("is-suitcase-source");
        if (source === "fridge") ingredientElement.classList.add("is-fridge-source");
        ingredientElement.dataset.source = source;

        const sourceBadge = ingredientElement.querySelector(".source-badge");
        if (sourceBadge) sourceBadge.textContent = source === "suitcase" ? "🧳" : "";
        const label = ingredientElement.dataset.label || ingredient.name || ingredient.id;
        if (source === "suitcase") {
          ingredientElement.title = `${label} 已从城市探索带回`;
        } else if (source === "locked") {
          ingredientElement.title = `${label} 尚未从城市探索带回`;
        } else {
          ingredientElement.title = `${label} 已解锁`;
        }
      }

      function lockIngredientElement(ingredient) {
        const ingredientElement = document.getElementById(ingredient.id);
        if (!ingredientElement) return;

        ingredientElement.classList.remove("unlocked", "is-unlocked", "is-selected", "is-suitcase-source", "is-fridge-source", "is-recent-returned");
        ingredientElement.classList.add("locked", "is-locked");
        ingredientElement.dataset.source = "locked";
        ingredientElement.setAttribute("aria-disabled", "true");
        ingredientElement.title = `${ingredient.name} 尚未从城市探索带回`;
        const sourceBadge = ingredientElement.querySelector(".source-badge");
        if (sourceBadge) sourceBadge.textContent = "";
      }

      function syncIngredientSourceClasses() {
        Object.values(state.ingredientById).forEach(updateIngredientElementSource);
      }

      function resetExternalIngredientLocks() {
        Object.values(state.ingredientById).forEach((ingredient) => {
          if (!isExternalIngredient(ingredient)) return;
          lockIngredientElement(ingredient);
        });

        state.selectedIngredients = state.selectedIngredients.filter((id) => {
          const ingredient = state.ingredientById[id];
          return !isExternalIngredient(ingredient) || state.luggageIngredients.has(id);
        });
        renderBasket();
      }

      function applyLuggageUnlocks() {
        const luggage = readLuggage();
        const pantryCollected = typeof readPantryCollected === "function" ? readPantryCollected() : [];

        const legacyIngredients = (() => {
          try {
            const value = JSON.parse(localStorage.getItem("my_ingredients") || "[]");
            return Array.isArray(value) ? value : [];
          } catch (error) {
            return [];
          }
        })();
        const ownedExternalIngredients = [...luggage, ...pantryCollected];
        state.luggageIngredients = new Set(ownedExternalIngredients);
        state.collectedIngredients = new Set([...state.luggageIngredients, ...legacyIngredients]);
        resetExternalIngredientLocks();
        syncIngredientSourceClasses();

        ownedExternalIngredients.forEach((id) => {
          state.collectedIngredients.add(id);
          const ingredientElement = document.getElementById(id);
          if (!ingredientElement) return;

          ingredientElement.classList.remove("locked", "is-locked");
          ingredientElement.classList.add("unlocked", "is-unlocked", "is-suitcase-source");
          ingredientElement.classList.remove("is-fridge-source");
          ingredientElement.dataset.source = "suitcase";
          ingredientElement.setAttribute("aria-disabled", "false");
          ingredientElement.title = `${ingredientElement.dataset.label || id} 已从城市探索带回`;
          const sourceBadge = ingredientElement.querySelector(".source-badge");
          if (sourceBadge) sourceBadge.textContent = "🧳";
        });
      }

      function svgData(svg) {
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
      }

      function makeMainSceneSvg() {
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
            <defs>
              <linearGradient id="wall" x1="0" x2="1" y1="0" y2="1">
                <stop stop-color="#fff4c8"/><stop offset="1" stop-color="#d9f3df"/>
              </linearGradient>
              <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
                <stop stop-color="#ffd4ad"/><stop offset="1" stop-color="#f2b589"/>
              </linearGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#70522f" flood-opacity="0.18"/>
              </filter>
              <filter id="crayon">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8"/>
                <feDisplacementMap in="SourceGraphic" scale="1.8"/>
              </filter>
            </defs>
            <rect width="1600" height="1000" fill="#fff4c8"/>
            <path d="M0 120 L1600 0 L1600 720 L0 820 Z" fill="url(#wall)"/>
            <path d="M0 780 L1600 680 L1600 1000 L0 1000 Z" fill="url(#floor)"/>
            <g opacity="0.5" stroke="#5fa879" stroke-width="4" stroke-linecap="round" filter="url(#crayon)">
              <path d="M0 248 H1600M0 370 H1600M0 492 H1600M0 614 H1600M0 736 H1600"/>
              <path d="M120 138 V790M290 124 V780M460 110 V765M630 96 V752M800 80 V740M970 64 V728M1140 48 V718M1310 32 V706M1480 16 V694"/>
            </g>
            <g opacity="0.62" fill="none" stroke="#d95d4f" stroke-width="5" stroke-linecap="round" filter="url(#crayon)">
              <path d="M185 298 c38 -30 74 -30 112 0 c-38 30 -74 30 -112 0Z"/>
              <path d="M1030 260 c34 -27 68 -27 102 0 c-34 27 -68 27 -102 0Z"/>
              <path d="M1320 342 c28 -25 56 -25 84 0 c-28 25 -56 25 -84 0Z"/>
            </g>
            <g filter="url(#shadow)">
              <rect x="100" y="220" width="235" height="555" rx="42" fill="#bfe9cb" stroke="#6c4b36" stroke-width="9" filter="url(#crayon)"/>
              <rect x="132" y="262" width="173" height="218" rx="28" fill="#eaffdc" stroke="#ffffff" stroke-width="7"/>
              <rect x="132" y="520" width="173" height="210" rx="28" fill="#eaffdc" stroke="#ffffff" stroke-width="7"/>
              <line x1="218" y1="242" x2="218" y2="750" stroke="#5fa879" stroke-width="8" stroke-linecap="round"/>
              <circle cx="242" cy="502" r="12" fill="#d95d4f"/>
              <text x="150" y="204" fill="#d95d4f" font-size="35" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="700">雪柜</text>
            </g>
            <g filter="url(#shadow)">
              <rect x="380" y="302" width="430" height="132" rx="30" fill="#7b5740" stroke="#6c4b36" stroke-width="7"/>
              <rect x="425" y="330" width="105" height="72" rx="18" fill="#fff9df"/>
              <rect x="560" y="330" width="105" height="72" rx="18" fill="#fff9df"/>
              <rect x="696" y="330" width="76" height="72" rx="18" fill="#fff9df"/>
              <rect x="386" y="642" width="560" height="165" rx="28" fill="#7b5740" stroke="#6c4b36" stroke-width="7"/>
              <rect x="415" y="676" width="138" height="92" rx="20" fill="#fff9df" stroke="#bfe9cb" stroke-width="7"/>
              <rect x="436" y="696" width="96" height="42" rx="10" fill="#b9e7ef"/>
              <circle cx="529" cy="748" r="6" fill="#d95d4f"/>
              <circle cx="508" cy="748" r="6" fill="#5fa879"/>
              <rect x="584" y="676" width="138" height="92" rx="20" fill="#fff9df" stroke="#ffc7a6" stroke-width="7"/>
              <rect x="606" y="696" width="94" height="48" rx="12" fill="#ffe1dc"/>
              <path d="M612 706 H694" stroke="#d95d4f" stroke-width="6" stroke-linecap="round"/>
              <circle cx="705" cy="752" r="7" fill="#d95d4f"/>
              <rect x="754" y="674" width="140" height="96" rx="28" fill="#fff9df" stroke="#bfe9cb" stroke-width="7"/>
              <rect x="782" y="696" width="84" height="48" rx="18" fill="#d9f3df"/>
              <path d="M804 670 C809 649 840 649 846 670" fill="none" stroke="#7b5740" stroke-width="8" stroke-linecap="round"/>
              <circle cx="870" cy="751" r="7" fill="#d95d4f"/>
              <rect x="360" y="604" width="580" height="50" rx="22" fill="#fff9df" stroke="#ffffff" stroke-width="5"/>
              <ellipse cx="754" cy="596" rx="78" ry="24" fill="#303436"/>
              <path d="M688 590 C708 532 800 532 820 590" fill="none" stroke="#202124" stroke-width="18" stroke-linecap="round"/>
              <ellipse cx="754" cy="582" rx="55" ry="15" fill="#5f6f69"/>
              <path d="M650 548 c-48 -20 -82 -16 -114 12" fill="none" stroke="#d95d4f" stroke-width="9" stroke-linecap="round"/>
              <text x="686" y="548" fill="#d95d4f" font-size="34" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="700">铁镬</text>
              <text x="428" y="812" fill="#5fa879" font-size="29" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="700">微波炉</text>
              <text x="622" y="812" fill="#d95d4f" font-size="29" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="700">烤箱</text>
              <text x="770" y="812" fill="#5fa879" font-size="29" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="700">空气炸锅</text>
            </g>
            <g filter="url(#shadow)">
              <rect x="995" y="305" width="345" height="130" rx="30" fill="#7b5740" stroke="#6c4b36" stroke-width="7"/>
              <rect x="1030" y="335" width="85" height="68" rx="18" fill="#fff9df"/>
              <rect x="1150" y="335" width="85" height="68" rx="18" fill="#fff9df"/>
              <rect x="1270" y="335" width="35" height="68" rx="18" fill="#fff9df"/>
              <rect x="980" y="640" width="380" height="165" rx="28" fill="#7b5740" stroke="#6c4b36" stroke-width="7"/>
              <rect x="1025" y="676" width="138" height="90" rx="22" fill="#bfe9cb" opacity="0.72"/>
              <rect x="1200" y="675" width="115" height="92" rx="22" fill="#bfe9cb" opacity="0.72"/>
              <rect x="960" y="604" width="420" height="50" rx="22" fill="#fff9df" stroke="#ffffff" stroke-width="5"/>
            </g>
            <g filter="url(#shadow)">
              <path d="M1010 545 C975 505 988 444 1047 420 C1100 398 1184 422 1196 480 C1208 545 1076 580 1010 545Z" fill="#fff2be" stroke="#7b5740" stroke-width="7"/>
              <ellipse cx="1098" cy="477" rx="88" ry="29" fill="#fff9df" stroke="#7b5740" stroke-width="5"/>
              <ellipse cx="1098" cy="464" rx="73" ry="19" fill="#ffc7a6"/>
              <path d="M1066 454 L1131 454" stroke="#7b5740" stroke-width="11" stroke-linecap="round"/>
              <text x="1045" y="411" fill="#5fa879" font-size="32" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="700">蒸笼</text>
            </g>
            <g fill="#6c4b36">
              <path d="M560 0 V160"/><ellipse cx="560" cy="175" rx="53" ry="22"/>
              <path d="M960 0 V160"/><ellipse cx="960" cy="175" rx="53" ry="22"/>
              <path d="M1280 0 V160"/><ellipse cx="1280" cy="175" rx="53" ry="22"/>
            </g>
            <g opacity="0.86" fill="#fff9df">
              <ellipse cx="560" cy="198" rx="108" ry="34"/>
              <ellipse cx="960" cy="198" rx="108" ry="34"/>
              <ellipse cx="1280" cy="198" rx="108" ry="34"/>
            </g>
            <g filter="url(#shadow)">
              <rect x="620" y="92" width="360" height="100" rx="36" fill="#fff9df" stroke="#d95d4f" stroke-width="8" filter="url(#crayon)"/>
              <text x="800" y="156" text-anchor="middle" fill="#d95d4f" font-size="48" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="800">阿婆厨房</text>
            </g>
          </svg>`;
      }

      function makeFridgeSceneSvg() {
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">
            <defs>
              <linearGradient id="cold" x1="0" x2="1" y1="0" y2="1">
                <stop stop-color="#f8ffe9"/><stop offset="1" stop-color="#d9f3df"/>
              </linearGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#70522f" flood-opacity="0.14"/>
              </filter>
              <filter id="crayon">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="5"/>
                <feDisplacementMap in="SourceGraphic" scale="1.5"/>
              </filter>
            </defs>
            <rect width="900" height="1200" fill="#fff4c8"/>
            <rect x="70" y="55" width="760" height="1050" rx="58" fill="url(#cold)" stroke="#6c4b36" stroke-width="9" filter="url(#crayon)"/>
            <g opacity="0.45" stroke="#5fa879" stroke-width="5" stroke-linecap="round" filter="url(#crayon)">
              <path d="M120 220 H780M120 495 H780M120 770 H780"/>
              <path d="M335 120 V895M565 120 V895"/>
            </g>
            <g filter="url(#shadow)">
              <rect x="125" y="130" width="190" height="205" rx="32" fill="#fff9df" stroke="#ffffff" stroke-width="7"/>
              <rect x="355" y="130" width="190" height="205" rx="32" fill="#fff2be" stroke="#ffffff" stroke-width="7"/>
              <rect x="585" y="130" width="190" height="205" rx="32" fill="#fff9df" stroke="#ffffff" stroke-width="7"/>
              <rect x="125" y="405" width="190" height="205" rx="32" fill="#fff2be" stroke="#ffffff" stroke-width="7"/>
              <rect x="355" y="405" width="190" height="205" rx="32" fill="#fff9df" stroke="#ffffff" stroke-width="7"/>
              <rect x="585" y="405" width="190" height="205" rx="32" fill="#fff2be" stroke="#ffffff" stroke-width="7"/>
              <rect x="125" y="680" width="305" height="205" rx="34" fill="#fff9df" stroke="#ffffff" stroke-width="7"/>
              <rect x="470" y="680" width="305" height="205" rx="34" fill="#fff2be" stroke="#ffffff" stroke-width="7"/>
            </g>
            <g opacity="0.85" fill="#d95d4f">
              <text x="135" y="94" font-size="34" font-family="Marker Felt, Comic Sans MS, sans-serif" font-weight="800">阿婆的雪柜</text>
              <text x="135" y="1112" font-size="26" font-family="Marker Felt, Comic Sans MS, sans-serif">拣好餸菜，红印就是放进篮子。</text>
            </g>
            <g filter="url(#shadow)" opacity="0.55">
              <rect x="792" y="150" width="22" height="730" rx="11" fill="#5fa879"/>
              <circle cx="803" cy="260" r="9" fill="#d95d4f"/>
            </g>
            <g opacity="0.48" fill="none" stroke="#d95d4f" stroke-width="5" stroke-linecap="round" filter="url(#crayon)">
              <path d="M612 965 c34 -28 68 -28 102 0 c-34 28 -68 28 -102 0Z"/>
              <path d="M178 972 c26 -24 52 -24 78 0 c-26 24 -52 24 -78 0Z"/>
            </g>
          </svg>`;
      }

      function getIngredient(idOrName) {
        return state.ingredientById[idOrName] || state.ingredientByName[idOrName] || null;
      }

      function getIngredientNameById(id) {
        return state.ingredientById[id]?.name || state.ingredientByName[id]?.name || id;
      }

      function makeIngredientSvg(item) {
        const ingredient = getIngredient(item);
        const label = ingredient?.name || item;
        const visual = ingredient?.visual || {
          label: ingredient?.emoji || ingredient?.icon || label,
          bg: ingredient?.type === "food" ? "#f0d8a6" : "#bfe9cb",
          fg: "#5d3726"
        };
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
            <defs>
              <filter id="paper" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#70522f" flood-opacity="0.12"/>
              </filter>
              <filter id="crayon">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
                <feDisplacementMap in="SourceGraphic" scale="1.1"/>
              </filter>
            </defs>
            <rect x="8" y="14" width="144" height="132" rx="28" fill="#fff9df" filter="url(#paper)"/>
            <rect x="18" y="24" width="124" height="112" rx="24" fill="#fff2be" stroke="#ffffff" stroke-width="5"/>
            <path d="M28 40 C62 20 101 21 132 40 L132 62 C100 48 61 48 28 62Z" fill="${visual.bg}" opacity="0.72" filter="url(#crayon)"/>
            <circle cx="43" cy="114" r="10" fill="${visual.bg}" opacity="0.55"/>
            <circle cx="118" cy="48" r="8" fill="#bfe9cb" opacity="0.75"/>
            <text x="80" y="96" text-anchor="middle" fill="${visual.fg}" font-size="31" font-family="Marker Felt, Comic Sans MS, PingFang SC, Microsoft YaHei, sans-serif" font-weight="900">${escapeHtml(visual.label)}</text>
          </svg>`;
      }

      function setProgress(step) {
        document.querySelectorAll(".dot").forEach((dot) => {
          dot.classList.toggle("is-active", dot.dataset.dot === step);
        });
      }

      function showLayer(name) {
        const showFridge = name === "fridge";
        hideOriginTooltip();
        fridgeStage.classList.remove("zoom-through");
        mainLayer.classList.toggle("is-active", !showFridge);
        fridgeLayer.classList.toggle("is-active", showFridge);
        setProgress(showFridge ? "fridge" : "kitchen");
      }

      function renderBasket() {
        if (!state.selectedIngredients.length) {
          basketIcons.innerHTML = `<span class="empty-basket">还没拿菜。先去冰箱看看。</span>`;
          sceneToast.textContent = "先点右侧冰箱，把食材放进小篮子。";
          fridgeNote.textContent = "点击食材图片，放入阿婆的小篮子。";
          updateFireButton();
          return;
        }

        basketIcons.innerHTML = state.selectedIngredients
          .map((item) => {
            const ingredient = getIngredient(item);
            const label = ingredient?.name || item;
            return `<img class="mini-icon" src="${svgData(makeIngredientSvg(item))}" alt="${escapeHtml(label)}" title="${escapeHtml(label)}" />`;
          })
          .join("");
        sceneToast.textContent = state.selectedMethod
          ? "厨具也选好了，按下控制台的“阿婆开火！”。"
          : "请选择一个厨具。铁镬、瓦煲、蒸笼、微波炉、小烤箱、空气炸锅和电饭煲都在图里。";
        fridgeNote.textContent = `已选择：${state.selectedIngredients.map((item) => getIngredient(item)?.name || item).join("、")}`;
        updateFireButton();
      }

      function renderSelectedTool() {
        selectedToolEl.textContent = state.selectedMethod || "还没选厨具";
        selectedToolEl.classList.toggle("is-ready", Boolean(state.selectedMethod));
        if (!state.selectedIngredients.length) {
          sceneToast.textContent = "先点右侧冰箱，把食材放进小篮子。";
        } else {
          sceneToast.textContent = state.selectedMethod
            ? "厨具也选好了，按下控制台的“阿婆开火！”。"
            : "请选择一个厨具。铁镬、瓦煲、蒸笼、微波炉、小烤箱、空气炸锅和电饭煲都在图里。";
        }
        updateFireButton();
      }

      function updateFireButton() {
        fireButton.disabled = !(state.selectedIngredients.length && state.selectedMethod);
      }

      function toggleIngredient(item) {
        state.selectedIngredients = state.selectedIngredients.includes(item)
          ? state.selectedIngredients.filter((selected) => selected !== item)
          : [...state.selectedIngredients, item];

        document.querySelectorAll(".food-button").forEach((button) => {
          button.classList.toggle("is-selected", state.selectedIngredients.includes(button.dataset.ingredient));
        });
        renderBasket();
      }

      function getOriginText(item, compact = false) {
        const ingredient = getIngredient(item);
        if (ingredient) {
          const ingredientData = window.getIngredientData(ingredient.id);
          if (compact) return `${ingredientData.typeName}：${ingredientData.desc} ➔ 点击追溯源头`;
          return `${ingredientData.desc}：${ingredientData.story}`;
        }
        if (compact) return `产地：香港新界 ➔ 点击追溯源头`;
        return originStories[item] || `阿婆为你留起这份${item}，从街市到厨房一路新鲜。再往源头走一步，就能看到它去过的地方。`;
      }

      function positionOriginTooltip(button) {
        const stageRect = fridgeStage.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const x = buttonRect.left - stageRect.left + buttonRect.width / 2;
        const y = buttonRect.top - stageRect.top - 8;
        originTooltip.style.left = `${Math.max(92, Math.min(stageRect.width - 92, x))}px`;
        originTooltip.style.top = `${Math.max(52, y)}px`;
      }

      function showOriginTooltip(button, item, options = {}) {
        window.clearTimeout(tooltipTimer);
        originTooltip.textContent = getOriginText(item, options.compact);
        originTooltip.dataset.ingredient = item;
        positionOriginTooltip(button);
        originTooltip.classList.toggle("is-tappable", Boolean(options.tappable));
        originTooltip.classList.remove("is-visible");
        void originTooltip.offsetWidth;
        originTooltip.classList.add("is-visible");
        originTooltip.setAttribute("aria-hidden", "false");

        if (options.autoHideMs) {
          tooltipTimer = window.setTimeout(hideOriginTooltip, options.autoHideMs);
        }
      }

      function hideOriginTooltip() {
        window.clearTimeout(tooltipTimer);
        originTooltip.classList.remove("is-visible", "is-tappable");
        originTooltip.setAttribute("aria-hidden", "true");
      }

      function traceOrigin() {
        const activeIngredientId = originTooltip?.dataset?.ingredient;

        if (!activeIngredientId) {
          sceneToast.textContent = "阿婆还没认出这个食材的源头。";
          return;
        }

        hideOriginTooltip();
        document.body.classList.add("modal-open");
        fridgeStage.classList.add("zoom-through");

        let navigated = false;
        const ingredient = window.getIngredientData?.(activeIngredientId);
        const sourceCity = ingredient?.sourceCity || ingredient?.originCity || ingredient?.origin || "Guangzhou";

        const goCityMap = () => {
          if (navigated) return;
          navigated = true;
          const params = new URLSearchParams({
            trace: activeIngredientId,
            city: sourceCity,
            from: "kitchen"
          });

          window.location.href = `../SearchMap-City/citymap.html?${params.toString()}`;
        };

        fridgeSceneImg.addEventListener("transitionend", goCityMap, { once: true });
        window.setTimeout(goCityMap, 1500);
      }

      function handleFoodClick(button) {
        const item = button.dataset.ingredient;
        if (button.classList.contains("is-locked") && !button.classList.contains("unlocked")) {
          if (originTooltip.classList.contains("is-visible") && originTooltip.dataset.ingredient === item) {
            traceOrigin();
            return;
          }

          showOriginTooltip(button, item, { compact: true, tappable: true, autoHideMs: 3200 });
          fridgeNote.textContent = `${getIngredient(item)?.name || item} 还在城市探索途中。`;
          return;
        }
        toggleIngredient(item);
        if (isTouchLike()) {
          showOriginTooltip(button, item, { compact: true, tappable: true, autoHideMs: 2500 });
        }
      }

      function normalizeMethod(method) {
        const methodAliases = {
          "炒/煎/炸": "炒/煎/炸",
          中式爆炒: "炒/煎/炸",
          爆炒: "炒/煎/炸",
          炒: "炒/煎/炸",
          煎: "炒/煎/炸",
          炸: "炒/煎/炸",
          "煲/炖": "煲/炖",
          慢炖: "煲/炖",
          煲: "煲/炖",
          炖: "煲/炖",
          蒸: "蒸",
          清蒸: "蒸",
          "传统清蒸/广式点心": "蒸",
          叮: "叮",
          微波: "叮",
          快捷微波: "叮",
          烤: "烤",
          烤制: "烤",
          西式烤制: "烤",
          空气炸: "空气炸",
          无油空气炸: "空气炸",
          "煮饭/一锅出": "煮饭/一锅出",
          煮饭: "煮饭/一锅出",
          一锅出: "煮饭/一锅出"
        };
        return methodAliases[method] || method;
      }

      function scoreRecipe(recipe) {
        const selected = new Set(state.selectedIngredients);
        const requiredIngredients = recipe.requiredIngredients || recipe.required_ingredients || recipe.ingredients || [];
        const matchedIngredients = requiredIngredients.filter((item) => selected.has(item));
        const selectedMethod = normalizeMethod(state.selectedMethod);
        return {
          recipe,
          matchedCount: matchedIngredients.length,
          methodMatched: normalizeMethod(recipe.method) === selectedMethod,
          hasCoreMatch: requiredIngredients.length > 0 && requiredIngredients.every((item) => selected.has(item))
        };
      }

      function findRecipe() {
        const scored = state.recipes
          .map(scoreRecipe)
          .filter((item) => item.methodMatched && item.hasCoreMatch)
          .sort((a, b) => b.matchedCount - a.matchedCount);
        return scored[0]?.recipe || null;
      }

      function selectTool(method) {
        state.selectedMethod = method;
        document.querySelectorAll(".zone[data-method]").forEach((zone) => {
          zone.classList.toggle("is-active", zone.dataset.method === method);
        });

        if (!state.selectedIngredients.length) {
          sceneToast.textContent = "阿婆说：锅先别热，先打开冰箱拿点菜。";
          selectedToolEl.textContent = state.selectedMethod;
          selectedToolEl.classList.add("is-ready");
          updateFireButton();
          return;
        }

        renderSelectedTool();
      }

      function fireRecipe() {
        if (fireButton.disabled) return;
        setProgress("serve");
        openModal(findRecipe());
      }

      function getRecipeIngredientNames(recipe) {
        const requiredIngredientIds = recipe.required_ingredients || recipe.requiredIngredients || recipe.ingredients || [];
        return requiredIngredientIds.map(getIngredientNameById);
      }

      function getRecipeRequiredIngredientIds(recipe) {
        const ids = recipe.required_ingredients || recipe.requiredIngredients || recipe.ingredients || [];
        return ids
          .map((item) => {
            if (typeof item === "string") return item;
            return item?.ingredientId || item?.id;
          })
          .filter(Boolean);
      }

      function isIngredientOwnedForRecipe(ingredientId) {
        const ingredient = state.ingredientById[ingredientId] || window.GLOBAL_INGREDIENTS_POOL?.[ingredientId];
        if (!ingredient) return false;

        if (isExternalIngredient(ingredient)) {
          return state.luggageIngredients.has(ingredientId);
        }

        return true;
      }

      function buildShoppingListForRecipe(recipe) {
        readCollectedIngredients();

        const requiredIds = getRecipeRequiredIngredientIds(recipe);
        const neededIds = requiredIds.filter((id) => !isIngredientOwnedForRecipe(id));

        return neededIds.map((ingredientId) => ({
          recipeId: recipe.id,
          recipeName: recipe.title || recipe.name || "阿婆菜谱",
          ingredientId,
          status: "needed",
          createdAt: Date.now()
        }));
      }

      function rebuildShoppingListFromTodayMenus() {
        readCollectedIngredients();

        const menus = readTodayMenus();
        const luggageSet = new Set(state.luggageIngredients);
        const targetMap = new Map();
        const now = Date.now();

        menus.forEach((menu) => {
          const recipe = state.recipes.find((item) => item.id === menu.recipeId) || window.getRecipeData?.(menu.recipeId);
          if (!recipe) return;

          getRecipeRequiredIngredientIds(recipe).forEach((ingredientId) => {
            const ingredient = state.ingredientById[ingredientId] || window.GLOBAL_INGREDIENTS_POOL?.[ingredientId];
            if (!ingredient || !isExternalIngredient(ingredient)) return;

            const existing = targetMap.get(ingredientId) || {
              ingredientId,
              status: luggageSet.has(ingredientId) ? "collected" : "needed",
              recipeIds: [],
              recipeNames: [],
              createdAt: now,
              updatedAt: now
            };

            if (!existing.recipeIds.includes(recipe.id)) {
              existing.recipeIds.push(recipe.id);
            }

            const recipeName = recipe.title || recipe.name || menu.recipeName || "阿婆菜谱";
            if (!existing.recipeNames.includes(recipeName)) {
              existing.recipeNames.push(recipeName);
            }

            existing.status = luggageSet.has(ingredientId) ? "collected" : "needed";
            existing.updatedAt = now;
            targetMap.set(ingredientId, existing);
          });
        });

        const nextShoppingList = [...targetMap.values()];
        writeShoppingList(nextShoppingList);
        return nextShoppingList;
      }

      function addRecipeToTodayMenus(recipe) {
        if (!recipe) return;

        const menus = readTodayMenus();
        const exists = menus.some((item) => item.recipeId === recipe.id);

        if (!exists) {
          menus.push({
            recipeId: recipe.id,
            recipeName: recipe.title || recipe.name || "阿婆菜谱",
            createdAt: Date.now()
          });
        }

        writeTodayMenus(menus);
        rebuildShoppingListFromTodayMenus();
        renderTodayMenuNote();
        renderRecipeBook();
        return menus;
      }

      function syncCurrentRecipeMenuButton() {
        if (!setTodayMenuBtn || !state.currentViewingRecipe) return;

        const inTodayMenu = readTodayMenus().some((item) => item.recipeId === state.currentViewingRecipe.id);
        setTodayMenuBtn.disabled = inTodayMenu;
        setTodayMenuBtn.textContent = inTodayMenu ? "已加入今日餐单" : "加入今日餐单";
      }

      function removeRecipeFromTodayMenus(recipeId) {
        if (!recipeId) return;

        const nextMenus = readTodayMenus().filter((menu) => menu.recipeId !== recipeId);
        writeTodayMenus(nextMenus);
        rebuildShoppingListFromTodayMenus();
        renderTodayMenuNote();
        renderRecipeBook();
        syncCurrentRecipeMenuButton();
      }

      function renderTodayMenuNote() {
        if (!todayMenuNote || !todayMenuNoteList) return;

        const menus = typeof readTodayMenus === "function" ? readTodayMenus() : [];
        todayMenuNote.classList.toggle("is-visible", menus.length > 0);
        todayMenuNote.closest(".header")?.classList.toggle("has-today-menu", menus.length > 0);

        if (!menus.length) {
          todayMenuNoteList.innerHTML = "<li>还未定菜单</li>";
          return;
        }

        todayMenuNoteList.innerHTML = menus
          .map((menu) => `
            <li class="paper-menu-item" data-recipe-id="${escapeHtml(menu.recipeId)}">
              <span class="paper-menu-item-name">${escapeHtml(menu.recipeName || menu.recipeId)}</span>
              <button
                class="delete-menu-item"
                type="button"
                data-recipe-id="${escapeHtml(menu.recipeId)}"
                aria-label="从今日菜单删除${escapeHtml(menu.recipeName || menu.recipeId)}"
                title="从今日菜单删除"
              >×</button>
            </li>
          `)
          .join("");
      }

      function getRecipeIngredientStatus(id) {
        const ingredient = window.getIngredientData(id);
        const isExternal = isExternalIngredient(ingredient);
        const inLuggage = state.luggageIngredients.has(id);

        if (isExternal && inLuggage) {
          return {
            id,
            label: `🧳 ${ingredient.name} · 行李箱带回`,
            status: "suitcase"
          };
        }

        if (isExternal && !inLuggage) {
          return {
            id,
            label: `🛒 ${ingredient.name} · 要出门采购`,
            status: "needed"
          };
        }

        return {
          id,
          label: `✅ ${ingredient.name} · 冰箱里有`,
          status: "owned"
        };
      }

      function showRecipeModal(recipe, options = {}) {
        state.currentViewingRecipe = recipe || null;
        const title = recipe.title || recipe.name || "今天没有标准菜谱";
        const method = recipe.method || "待分类";
        readCollectedIngredients();
        const ingredientStatuses = getRecipeRequiredIngredientIds(recipe).map(getRecipeIngredientStatus);
        const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

        modalKicker.textContent = options.kicker || "阿婆上菜 · 菜谱图鉴";
        modalTitle.textContent = title;
        modalMeta.innerHTML = [
          `<span class="chip">${escapeHtml(method)}</span>`,
          ...ingredientStatuses.map((item) => `
            <span class="chip ingredient-status-chip is-${escapeHtml(item.status)}">
              ${escapeHtml(item.label)}
            </span>
          `)
        ]
          .join("");
        if (setTodayMenuBtn) {
          const inTodayMenu = readTodayMenus().some((item) => item.recipeId === recipe.id);
          setTodayMenuBtn.hidden = false;
          setTodayMenuBtn.disabled = !recipe || inTodayMenu;
          setTodayMenuBtn.textContent = inTodayMenu || options.menuSelected ? "已加入今日餐单" : "加入今日餐单";
        }
        if (backToRecipeBookBtn) {
          backToRecipeBookBtn.hidden = false;
        }
        modalSecret.textContent = recipe.tips || recipe.secret || "阿婆说：好味道没有捷径，火候和耐心最重要。";
        modalGossip.textContent = recipe.story || recipe.gossip || "这道菜阿婆还没写故事，但闻起来已经很有家的味道。";
        stepsBlock.style.display = steps.length ? "" : "none";
        modalSteps.innerHTML = "";
        steps.forEach((step) => {
          const li = document.createElement("li");
          li.textContent = step;
          modalSteps.appendChild(li);
        });

        modal.classList.add("is-open");
        document.body.classList.add("modal-open");
        closeBtn.focus();
      }

      function openModal(recipe) {
        if (!recipe) {
          state.currentViewingRecipe = null;
          modal.classList.add("is-open");
          document.body.classList.add("modal-open");
          modalKicker.textContent = "阿婆上菜 · 自由发挥";
          modalTitle.textContent = "今天没有标准菜谱";
          modalMeta.innerHTML = [
            ...state.selectedIngredients.map((item) => `<span class="chip">${escapeHtml(getIngredient(item)?.name || item)}</span>`),
            `<span class="chip">${escapeHtml(state.selectedMethod)}</span>`
          ].join("");
          if (setTodayMenuBtn) {
            setTodayMenuBtn.hidden = true;
            setTodayMenuBtn.disabled = true;
          }
          if (backToRecipeBookBtn) {
            backToRecipeBookBtn.hidden = true;
          }
          modalSecret.textContent = "阿婆说：今天用这些做不出标准菜，但你可以试试把它们乱炒一通，说不定有惊喜！";
          modalGossip.textContent = "做饭不是考试，冰箱里有什么就先善待什么。火别太大，盐慢慢放。";
          stepsBlock.style.display = "none";
          modalSteps.innerHTML = "";
          closeBtn.focus();
          return;
        }

        showRecipeModal(recipe, { kicker: `${recipe.location?.city || "阿婆厨房"} · ${recipe.method || "待分类"}` });
      }

      function renderRecipeBook() {
        if (!recipeBookList) return;
        readCollectedIngredients();
        const todayMenuIds = new Set(readTodayMenus().map((item) => item.recipeId));

        if (!state.recipes?.length) {
          recipeBookList.innerHTML = `<p class="recipe-card-story">${recipeLoadErrorMessage}</p>`;
          return;
        }

        recipeBookList.innerHTML = state.recipes
          .map((recipe) => {
            const ingredientNames = getRecipeIngredientNames(recipe).slice(0, 8);
            const missingCount = getRecipeRequiredIngredientIds(recipe)
              .filter((ingredientId) => !isIngredientOwnedForRecipe(ingredientId))
              .length;
            const inTodayMenu = todayMenuIds.has(recipe.id);
            return `
              <button class="recipe-card ${inTodayMenu ? "is-selected" : ""}" type="button" data-recipe-id="${escapeHtml(recipe.id)}">
                ${inTodayMenu ? '<span class="recipe-card-selected-stamp">今日已选</span>' : ""}
                <span class="recipe-card-title">${escapeHtml(recipe.title || recipe.name)}</span>
                <span class="recipe-card-method">${escapeHtml(recipe.method || "待分类")}</span>
                ${inTodayMenu ? '<span class="recipe-card-menu-status">已锁定</span>' : ""}
                <span class="recipe-card-missing ${missingCount ? "" : "is-ready"}">
                  ${missingCount ? `还差 ${missingCount} 样` : "食材齐啦"}
                </span>
                <span class="recipe-card-ingredients">
                  ${ingredientNames.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
                </span>
                <p class="recipe-card-story">${escapeHtml(recipe.story || recipe.gossip || "")}</p>
              </button>
            `;
          })
          .join("");
      }

      function openRecipeBook() {
        renderRecipeBook();
        recipeBookModal.classList.add("is-open");
        document.body.classList.add("modal-open");
      }

      function closeRecipeBook() {
        recipeBookModal.classList.remove("is-open");

        if (!modal.classList.contains("is-open")) {
          document.body.classList.remove("modal-open");
        }
      }

      function openRecipeFromBook(recipeId) {
        const recipe = state.recipes.find((item) => item.id === recipeId);
        if (!recipe) return;

        closeRecipeBook();
        showRecipeModal(recipe, {
          kicker: `${recipe.location?.city || "阿婆厨房"} · ${recipe.method || "待分类"}`
        });
      }

      function closeModal() {
        modal.classList.remove("is-open");
        if (!recipeBookModal?.classList.contains("is-open")) {
          document.body.classList.remove("modal-open");
        }
        setProgress("kitchen");
      }

      async function loadRecipes() {
        try {
          await window.whenDatabaseReady;
          const data = await loadRecipeJson();
          validateRecipesAgainstDatabase(data.recipes || data);
          state.recipes = normalizeRecipeData(data);
        } catch (error) {
          console.warn(recipeLoadErrorMessage, error);
          state.recipes = [];
        }
        if (!state.recipes.length) {
          sceneToast.textContent = recipeLoadErrorMessage;
        }
        renderBasket();
        renderSelectedTool();
        renderRecipeBook();
      }

      async function loadRecipeJson() {
        try {
          const response = await fetch("../data/recipes.json", { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        } catch (fetchError) {
          return await new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.overrideMimeType("application/json");
            request.open("GET", "../data/recipes.json", true);
            request.onload = () => {
              if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
                try {
                  resolve(JSON.parse(request.responseText));
                } catch (parseError) {
                  reject(parseError);
                }
              } else {
                reject(new Error(`HTTP ${request.status}`));
              }
            };
            request.onerror = reject;
            request.send();
          });
        }
      }

      function flattenIngredientPool(pool = {}) {
        return Object.values(pool).flatMap((section) => Array.isArray(section) ? section : []);
      }

      function hydrateIngredientsFromRecipeJson(pool = {}) {
        Object.values(pool).flat().forEach((ingredient) => {
          if (!ingredient?.id) return;

          state.ingredientById[ingredient.id] = {
            ...state.ingredientById[ingredient.id],
            ...ingredient
          };
          if (ingredient.name) {
            state.ingredientByName[ingredient.name] = state.ingredientById[ingredient.id];
          }
        });
      }

      function hydrateIngredientFromGlobal(ingredient) {
        const ingredientData = window.GLOBAL_INGREDIENTS_POOL?.[ingredient.id] || window.getIngredientData?.(ingredient.id);

        if (!ingredientData) {
          console.warn(`database.js 中找不到食材：${ingredient.id}`);
          return ingredient;
        }

        return {
          ...ingredient,
          name: ingredientData.name,
          icon: ingredientData.emoji,
          emoji: ingredientData.emoji,
          type: ingredientData.type,
          typeName: ingredientData.typeName,
          category: ingredientData.category,
          fridgeZone: ingredientData.fridgeZone || "other",
          desc: ingredientData.desc,
          story: ingredientData.story,
          visual: ingredientData.visual,
          origin: ingredient.origin || ingredientData.origin || ingredientData.typeName,
          requires_collection: ingredientData.requires_collection || false,
          locked: ingredientData.locked || false
        };
      }

      function hydratePoolFromGlobal(pool = {}) {
        return Object.entries(pool).reduce((sections, [section, ingredients]) => {
          const sectionKey = FRIDGE_ZONE_LABELS[section] ? section : "other";
          const hydratedIngredients = Array.isArray(ingredients) ? ingredients.map(hydrateIngredientFromGlobal) : [];
          sections[sectionKey] = [...(sections[sectionKey] || []), ...hydratedIngredients];
          return sections;
        }, createEmptyFridgeSections());
      }

      function createEmptyFridgeSections() {
        return FRIDGE_ZONE_ORDER.reduce((sections, zone) => {
          sections[zone] = [];
          return sections;
        }, {});
      }

      function installIngredientPoolFromDatabase() {
        const databasePool = Object.values(window.GLOBAL_INGREDIENTS_POOL || {})
          .filter((ingredient) => ingredient.type === "food");

        const grouped = databasePool.reduce((sections, ingredient) => {
          const zone = FRIDGE_ZONE_LABELS[ingredient.fridgeZone] ? ingredient.fridgeZone : "other";

          sections[zone] = sections[zone] || [];
          sections[zone].push({ id: ingredient.id });

          return sections;
        }, createEmptyFridgeSections());

        installIngredientPool(grouped);
      }

      function installIngredientPool(pool) {
        const hydratedPool = hydratePoolFromGlobal(pool);
        state.ingredientById = {};
        state.ingredientByName = {};
        hydrateIngredientsFromRecipeJson(hydratedPool);
        flattenIngredientPool(hydratedPool).forEach((ingredient) => {
          if (ingredient.story) {
            originStories[ingredient.name] = `${ingredient.desc || ingredient.origin}：${ingredient.story}`;
          }
        });
        renderFridge(hydratedPool);
      }

      function getSectionTitle(key) {
        return FRIDGE_ZONE_LABELS[key] || FRIDGE_ZONE_LABELS.other;
      }

      function renderFridge(pool = {}) {
        fridgeZones.innerHTML = FRIDGE_ZONE_ORDER
          .map((key) => {
            const sortedIngredients = [...(pool[key] || [])].sort((a, b) => {
              const aRecent = state.recentReturnedIngredients.has(a.id);
              const bRecent = state.recentReturnedIngredients.has(b.id);
              return Number(bRecent) - Number(aRecent);
            });

            return `
              <section class="ingredient-section" aria-label="${escapeHtml(getSectionTitle(key))}">
                <div class="ingredient-section-title">${escapeHtml(getSectionTitle(key))}</div>
                <div class="ingredient-grid">
                  ${sortedIngredients.map((ingredient) => {
                  const ingredientData = window.getIngredientData(ingredient.id);
                  const unlocked = isIngredientUnlocked(ingredient);
                  const highlighted = state.highlightIngredient.split(",").map((id) => id.trim()).includes(ingredient.id);
                  const recentlyReturned = state.recentReturnedIngredients.has(ingredient.id);
                  const source = getIngredientSource(ingredient);
                  return `
                    <button
                      id="${escapeHtml(ingredient.id)}"
                      class="food-button ${unlocked ? "is-unlocked unlocked" : "is-locked locked"} ${highlighted ? "is-highlighted" : ""} ${recentlyReturned ? "is-recent-returned" : ""} ${source === "suitcase" ? "is-suitcase-source" : ""} ${source === "fridge" ? "is-fridge-source" : ""}"
                      type="button"
                      data-ingredient="${escapeHtml(ingredient.id)}"
                      data-label="${escapeHtml(ingredientData.name)}"
                      data-source="${escapeHtml(source)}"
                      aria-label="${unlocked ? "选择" : "未解锁"}${escapeHtml(ingredientData.name)}"
                      aria-disabled="${unlocked ? "false" : "true"}"
                      title="${escapeHtml(unlocked ? `${ingredientData.name} 已解锁` : `${ingredientData.name} 尚未从城市探索带回`)}"
                    >
                      <span class="ingredient-icon" aria-hidden="true">${escapeHtml(ingredientData.emoji || "🍽️")}</span>
                      <span class="source-badge" aria-hidden="true">${source === "suitcase" ? "🧳" : ""}</span>
                      <span class="check"></span>
                    </button>
                  `;
                  }).join("")}
                </div>
              </section>
            `;
          })
          .join("");
        bindFoodButtons();
        applyLuggageUnlocks();
        triggerHighlightNotice();
      }

      function triggerHighlightNotice() {
        const highlightIds = [
          ...state.highlightIngredient.split(",").map((id) => id.trim()).filter(Boolean),
          ...state.recentReturnedIngredients
        ];
        if (!highlightIds.length) return;
        const buttons = [...document.querySelectorAll(".food-button")]
          .filter((item) => highlightIds.includes(item.dataset.ingredient));
        if (!buttons.length) return;
        buttons.forEach((button) => button.classList.add("is-highlighted", "is-recent-returned"));
        showOriginTooltip(buttons[0], buttons[0].dataset.ingredient, { compact: true, autoHideMs: 2000 });
        const highlightMessage = sessionStorage.getItem("recent_trace_origin")
          ? "刚刚追溯完这个食材的源头。"
          : "新食材已安全送达。";
        fridgeNote.textContent = highlightMessage;
        window.setTimeout(() => {
          fridgeNote.textContent = highlightMessage;
        }, 0);
        window.setTimeout(() => {
          buttons.forEach((button) => button.classList.remove("is-highlighted"));
        }, 2100);
      }

      function normalizeRecipeData(data) {
        const recipeList = Array.isArray(data) ? data : data.recipes || [];

        installIngredientPoolFromDatabase();

        return recipeList.map((recipe) => {
          const requiredIds = recipe.required_ingredients || (recipe.ingredients || [])
            .map((item) => typeof item === "string" ? item : item.ingredientId)
            .filter(Boolean);

          const ingredientItems = requiredIds
            .map((id) => {
              const ingredient = state.ingredientById[id] || window.GLOBAL_INGREDIENTS_POOL?.[id];

              if (!ingredient) {
                console.warn(`菜谱 ${recipe.name || recipe.title || recipe.id} 引用了不存在的食材 id：${id}`);
              }

              return ingredient;
            })
            .filter(Boolean);

          return {
            ...recipe,
            name: recipe.name || recipe.title,
            title: recipe.title || recipe.name,
            method: recipe.method || "待分类",
            required_ingredients: requiredIds,
            requiredIngredients: requiredIds,
            ingredients: ingredientItems.map((ingredient) => ingredient.name),
            ingredientItems,
            secret: recipe.tips || recipe.secret || "",
            gossip: recipe.story || recipe.description || recipe.gossip || "",
            location: recipe.location || {
              city: "香港",
              coordinates: { lat: 22.3193, lng: 114.1694 }
            }
          };
        });
      }

      function validateRecipesAgainstDatabase(recipes = []) {
        const database = window.GLOBAL_INGREDIENTS_POOL || {};

        recipes.forEach((recipe) => {
          const requiredIds = recipe.required_ingredients || (recipe.ingredients || [])
            .map((item) => typeof item === "string" ? item : item.ingredientId)
            .filter(Boolean);
          const missingIds = requiredIds.filter((id) => !database[id]);

          if (missingIds.length) {
            console.warn(
              `菜谱「${recipe.name || recipe.title || recipe.id}」引用了 database.js 中不存在的食材：${missingIds.join("、")}`
            );
          }
        });
      }

      function installPlaceholderImages() {
        mainSceneImg.src = "assets/vintage-hk-kitchen.png";
        fridgeSceneImg.src = svgData(makeFridgeSceneSvg());
      }

      function bindFoodButtons() {
        document.querySelectorAll(".food-button").forEach((button) => {
          button.addEventListener("mouseenter", () => {
            if (!isTouchLike()) showOriginTooltip(button, button.dataset.ingredient);
          });
          button.addEventListener("mouseleave", () => {
            if (!isTouchLike()) hideOriginTooltip();
          });
          button.addEventListener("click", () => handleFoodClick(button));
          button.addEventListener("dblclick", (event) => {
            event.preventDefault();
            traceOrigin();
          });
        });
      }

      document.querySelector(".zone-fridge").addEventListener("click", () => showLayer("fridge"));
      recipeBoardZone?.addEventListener("click", openRecipeBook);
      closeFridgeBtn.addEventListener("click", () => showLayer("main"));
      document.querySelectorAll(".zone[data-method]").forEach((zone) => {
        zone.addEventListener("click", () => selectTool(zone.dataset.method));
      });
      fireButton.addEventListener("click", fireRecipe);
      setTodayMenuBtn?.addEventListener("click", () => {
        const recipe = state.currentViewingRecipe;
        if (!recipe) return;

        addRecipeToTodayMenus(recipe);

        const shoppingList = rebuildShoppingListFromTodayMenus();
        const neededCount = shoppingList.filter((item) => item.status !== "collected").length;

        sceneToast.textContent = neededCount
          ? `已加入今日餐单。采购清单还差 ${neededCount} 样食材，去城市里找找。`
          : "已加入今日餐单。食材都齐啦，可以开火！";

        showRecipeModal(recipe, {
          shoppingList,
          menuSelected: true
        });
        renderTodayMenuNote();
        renderRecipeBook();
      });
      backToRecipeBookBtn?.addEventListener("click", () => {
        closeModal();
        renderTodayMenuNote();
        openRecipeBook();
      });
      todayMenuNoteList?.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(".delete-menu-item");
        if (!deleteButton) return;

        event.preventDefault();
        event.stopPropagation();
        removeRecipeFromTodayMenus(deleteButton.dataset.recipeId);
      });
      recipeBookClose?.addEventListener("click", closeRecipeBook);
      recipeBookBackdrop?.addEventListener("click", closeRecipeBook);
      recipeBookList?.addEventListener("click", (event) => {
        const card = event.target.closest(".recipe-card");
        if (!card) return;

        openRecipeFromBook(card.dataset.recipeId);
      });
      backdrop.addEventListener("click", closeModal);
      closeBtn.addEventListener("click", closeModal);
      originTooltip?.addEventListener("click", () => {
        const ingredientId = originTooltip.dataset.ingredient;
        if (!ingredientId) return;
        traceOrigin();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          hideOriginTooltip();
          if (recipeBookModal?.classList.contains("is-open")) closeRecipeBook();
          if (modal.classList.contains("is-open")) closeModal();
        }
      });
      window.addEventListener("focus", () => {
        readCollectedIngredients();
        readHighlightIngredient();
        applyLuggageUnlocks();
        renderTodayMenuNote();
        renderRecipeBook();
      });
      window.addEventListener("storage", (event) => {
        if (["my_luggage", "pantry_collected", "today_menu", "shopping_list"].includes(event.key)) {
          readCollectedIngredients();
          applyLuggageUnlocks();
          renderTodayMenuNote();
          renderRecipeBook();
        }
      });

      readCollectedIngredients();
      readHighlightIngredient();
      installPlaceholderImages();
      renderBasket();
      renderSelectedTool();
      renderTodayMenuNote();
      loadRecipes();
