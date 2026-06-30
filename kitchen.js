      const { escapeHtml } = window.AppUtils;
      const {
        readLuggage,
        writeLuggage,
        readPantryCollected,
        writePantryCollected,
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
      const apoEvaluationSystem = {
        perfect: {
          stamp: "💯 掂过碌蔗",
          color: "#c85040",
          quotes: [
            "嗯！呢道菜够晒镬气，有我当年九成分手艺，今晚加餸！",
            "香气扑鼻，火候刚刚好！拿去给隔壁王伯闻下，羡慕死他。",
            "真系好食到条舌头都掉埋！不愧是我教出来的乖孙。",
            "啧啧啧，今日总算有啲出息，阿婆都要添多半碗饭。",
            "火候、味道、卖相都到位，呢次阿婆真系挑唔出毛病。"
          ]
        },
        good: {
          stamp: "👌 呃得吓人",
          color: "#d97706",
          quotes: [
            "味道算系咁上下啦，不过下次记得落多两片姜去腥啊。",
            "火候稍微欠咗一丁点，不过勉强可以下饭，继续努力！",
            "盐放得稍微手重咗少少，拿来送粥就刚刚好。",
            "卖相几醒神，不过阿婆一食就知你仲未够老练。",
            "唔算惊天动地，但都叫有心机，今晚准你少洗一个碗。"
          ]
        },
        fail: {
          stamp: "🤦 乱嚟一通",
          color: "#4b5563",
          quotes: [
            "哎呀！你呢兜系乜嘢嚟嘎？猪潲水咁，拿去喂狗狗都不吃啊！",
            "黑漆漆的，你系咪想谋杀阿婆换遗产啊？快点倒掉！",
            "火候大到连锅底都穿埋，等阵罚你洗碗！",
            "你呢个配搭，阿婆睇到血压都高咗三度。",
            "唔系阿婆嘴毒，系你真系煮到好有想象力。"
          ]
        }
      };

      const state = {
        selectedIngredients: [],
        selectedMethod: "",
        hasCheckedMenuOrFridge: false,
        recipes: [],
        contributors: [],
        ingredientById: {},
        ingredientByName: {},
        collectedIngredients: new Set(),
        luggageIngredients: new Set(),
        recentReturnedIngredients: new Set(),
        highlightIngredient: "",
        expandedFridgeZone: null,
        currentFridgePool: {},
        currentFridgeMode: "home",
        currentViewingRecipe: null,
        recipeBookCategoryFilter: "all",
        replenishRecipeId: "all",
        replenishSingleActionsOpen: false,
        todayMenuSheetOpen: false
      };

      const mainLayer = document.querySelector("#main-layer");
      const fridgeLayer = document.querySelector("#fridge-layer");
      const fridgeStage = document.querySelector(".fridge-stage");
      const mainSceneImg = document.querySelector("#main-scene-img");
      const fridgeSceneImg = document.querySelector("#fridge-scene-img");
      const recipeBoardZone = document.querySelector(".zone-recipe-board");
      const recipeBoardCallout = document.querySelector(".recipe-board-callout");
      const sceneToast = document.querySelector("#scene-toast");
      const closeFridgeBtn = document.querySelector("#close-fridge");
      const fridgeNote = document.querySelector("#fridge-note");
      const fridgeHome = document.querySelector("#fridge-home");
      const fridgeZones = document.querySelector("#fridge-zones");
      const realFridgePanel = document.querySelector("#real-fridge-panel");
      const shoppingListPanel = document.querySelector("#shopping-list-panel");
      const basketIcons = document.querySelector("#basket-icons");
      const selectedToolEl = document.querySelector("#selected-tool");
      const fireButton = document.querySelector("#fire-button");
      const recipeBookModal = document.querySelector("#recipe-book-modal");
      const recipeBookList = document.querySelector("#recipe-book-list");
      const recipeBookClose = recipeBookModal?.querySelector(".recipe-book-close");
      const recipeBookBackdrop = recipeBookModal?.querySelector(".modal-backdrop");
      const replenishModal = document.querySelector("#replenish-modal");
      const replenishList = document.querySelector("#replenish-list");
      const replenishHint = document.querySelector("#replenish-hint");
      const replenishClose = replenishModal?.querySelector(".replenish-close");
      const replenishBackdrop = replenishModal?.querySelector(".modal-backdrop");
      const buyRecipeReplenishBtn = document.querySelector("#buy-recipe-replenish");
      const mapRecipeReplenishBtn = document.querySelector("#map-recipe-replenish");
      const toggleSingleReplenishBtn = document.querySelector("#toggle-single-replenish");
      const closeReplenishBtn = document.querySelector("#close-replenish");
      const modal = document.querySelector("#result-modal");
      const closeBtn = modal.querySelector(".close");
      const backdrop = modal.querySelector(".modal-backdrop");
      const cookingOverlay = document.querySelector("#cooking-overlay");
      const apoStamp = document.querySelector("#apo-stamp");
      const apoQuoteText = document.querySelector("#apo-quote-text");
      const modalKicker = document.querySelector("#modal-kicker");
      const modalTitle = document.querySelector("#modal-title");
      const modalContributor = document.querySelector("#modal-contributor");
      const modalMeta = document.querySelector("#modal-meta");
      const setTodayMenuBtn = document.querySelector("#set-today-menu-btn");
      const backToRecipeBookBtn = document.querySelector("#back-to-recipe-book-btn");
      const modalSecret = document.querySelector("#modal-secret");
      const modalGossip = document.querySelector("#modal-gossip");
      const modalSteps = document.querySelector("#modal-steps");
      const stepsBlock = document.querySelector("#steps-block");
      const originTooltip = document.querySelector("#origin-tooltip");
      const todayMenuNote = document.querySelector("#todayMenuNote");
      const todayMenuToggle = document.querySelector("#todayMenuToggle");
      const todayMenuNoteList = document.querySelector("#todayMenuNoteList");
      const shoppingToRealFridgeBtn = document.querySelector("#shopping-to-real-fridge-btn");
      let tooltipTimer = 0;

      function getApoQuote(level) {
        const config = apoEvaluationSystem[level] || apoEvaluationSystem.good;
        const pool = config.quotes;
        return pool[Math.floor(Math.random() * pool.length)];
      }

      function isTouchLike() {
        return window.matchMedia("(hover: none), (pointer: coarse)").matches || window.innerWidth <= 760;
      }

      function readCollectedIngredients() {
        try {
          const ownedIngredients = window.AppInventory.getOwnedIngredientIds();
          const legacyIngredients = JSON.parse(localStorage.getItem("my_ingredients") || "[]");
          const collected = [
            ...ownedIngredients,
            ...(Array.isArray(legacyIngredients) ? legacyIngredients : [])
          ];
          state.luggageIngredients = ownedIngredients;
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

      function shouldOpenFridgeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get("openFridge") === "1" || params.get("returnTo") === "fridge";
      }

      function findIngredientZone(ingredientId) {
        const ingredient = state.ingredientById[ingredientId] || window.getIngredientData?.(ingredientId);
        const zone = ingredient?.fridgeZone || "other";
        return FRIDGE_ZONE_LABELS[zone] ? zone : "other";
      }

      function scrollHighlightedIngredientIntoView(ingredientId) {
        if (!ingredientId) return;

        window.setTimeout(() => {
          const target = document.getElementById(ingredientId);
          if (!target) return;

          target.classList.add("is-highlighted", "is-recent-returned");
          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
          });
        }, 300);
      }

      function restoreFridgeAfterTraceReturn() {
        if (!shouldOpenFridgeFromUrl()) return;

        const params = new URLSearchParams(window.location.search);
        const highlightId = params.get("highlight") || sessionStorage.getItem("recent_trace_origin") || "";

        if (highlightId) {
          state.highlightIngredient = highlightId;
          state.recentReturnedIngredients.add(highlightId);
          state.expandedFridgeZone = findIngredientZone(highlightId);
          renderFridge(state.currentFridgePool || {});
        }

        showLayer("fridge");
        switchFridgeMode("pantry");
        scrollHighlightedIngredientIntoView(highlightId);
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

      function isIngredientVisibleInFridge(ingredient) {
        if (!ingredient) return false;
        if (
          ingredient.inventory === "fridge" ||
          ingredient.source === "pantry" ||
          ingredient.requires_collection === false ||
          ingredient.locked === false
        ) {
          return true;
        }
        if (ingredient.id && state.luggageIngredients.has(ingredient.id)) return true;
        if (ingredient.id && state.collectedIngredients.has(ingredient.id)) return true;
        return isIngredientUnlocked(ingredient);
      }

      function getTodayMenuMissingIngredientIds() {
        const menus = typeof readTodayMenus === "function" ? readTodayMenus() : [];
        if (!menus.length) return new Set();

        const shoppingList = typeof readShoppingList === "function" ? readShoppingList() : [];
        return new Set(
          shoppingList
            .map(normalizeShoppingListItemState)
            .filter((item) => item.apoStatus === "needed")
            .map((item) => item.ingredientId)
            .filter(Boolean)
        );
      }

      function getMissingIngredientsForZone(zoneKey) {
        const missingIds = getTodayMenuMissingIngredientIds();
        if (!missingIds.size) return [];

        return [...missingIds]
          .map((id) => state.ingredientById[id] || window.getIngredientData?.(id))
          .filter(Boolean)
          .filter((ingredient) => !isIngredientVisibleInFridge(ingredient))
          .filter((ingredient) => findIngredientZone(ingredient.id) === zoneKey);
      }

      function refreshFridge() {
        renderFridgeHome();
        renderApoPantry(state.currentFridgePool || {});
        renderRealFridgePanel();
        renderShoppingListPanel();
        updateFridgeModeVisibility();
      }

      function canRemoveIngredientFromFridge(ingredient) {
        if (!ingredient?.id) return false;

        if (
          ingredient.inventory === "fridge" ||
          ingredient.source === "pantry" ||
          ingredient.requires_collection === false
        ) {
          return false;
        }

        return (
          state.luggageIngredients.has(ingredient.id) ||
          state.collectedIngredients.has(ingredient.id)
        );
      }

      function removeIngredientFromFridge(ingredientId) {
        if (!ingredientId) return;

        const ingredient = state.ingredientById[ingredientId] || window.getIngredientData?.(ingredientId);
        const ingredientName = ingredient?.name || ingredientId;

        state.selectedIngredients = state.selectedIngredients.filter((id) => id !== ingredientId);
        state.recentReturnedIngredients.delete(ingredientId);
        if (state.highlightIngredient === ingredientId) state.highlightIngredient = "";
        if (sessionStorage.getItem("recent_trace_origin") === ingredientId) {
          sessionStorage.removeItem("recent_trace_origin");
        }

        writeLuggage(readLuggage().filter((id) => id !== ingredientId));

        const pantryCollected = typeof readPantryCollected === "function" ? readPantryCollected() : [];
        if (typeof writePantryCollected === "function") {
          writePantryCollected(pantryCollected.filter((id) => id !== ingredientId));
        }

        try {
          const legacy = JSON.parse(localStorage.getItem("my_ingredients") || "[]");
          if (Array.isArray(legacy)) {
            localStorage.setItem(
              "my_ingredients",
              JSON.stringify(legacy.filter((id) => id !== ingredientId))
            );
          }
        } catch (error) {
          console.warn("[kitchen] failed to remove legacy ingredient", error);
        }

        if (typeof rebuildShoppingListFromTodayMenus === "function") {
          rebuildShoppingListFromTodayMenus();
        }

        readCollectedIngredients();
        renderBasket();
        refreshFridge();
        renderTodayMenuNote();
        renderRecipeBook();
        sceneToast.textContent = `${ingredientName} 已从阿婆食材柜拿走。`;
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
          ingredientElement.title = `${label} 已放进行李箱，回厨房后可带回阿婆食材柜`;
        } else if (source === "locked") {
          ingredientElement.title = `${label} 尚未放进行李箱`;
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
        ingredientElement.title = `${ingredient.name} 尚未放进行李箱`;
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
        const legacyIngredients = (() => {
          try {
            const value = JSON.parse(localStorage.getItem("my_ingredients") || "[]");
            return Array.isArray(value) ? value : [];
          } catch (error) {
            return [];
          }
        })();
        const ownedExternalIngredients = [...window.AppInventory.getOwnedIngredientIds()];
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
          ingredientElement.title = `${ingredientElement.dataset.label || id} 已收入阿婆食材柜`;
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

      function updateRecipeBoardGuide() {
        const shouldGuideRecipe = !state.hasCheckedMenuOrFridge && !state.selectedIngredients.length && !state.selectedMethod;
        const hasSeenGuide = localStorage.getItem("apo_recipe_board_seen") === "1";
        recipeBoardCallout?.classList.toggle("is-hidden", hasSeenGuide || !shouldGuideRecipe);
      }

      function updateSceneGuidance() {
        updateRecipeBoardGuide();

        if (state.selectedIngredients.length && state.selectedMethod) {
          setProgress("cook");
          sceneToast.textContent = "万事俱备，点右下角【阿婆开火】！";
          return;
        }

        if (state.selectedIngredients.length) {
          setProgress("cook");
          sceneToast.textContent = "餸拣齐啦！选一件趁手的厨具，准备下锅。";
          return;
        }

        const realFridgeReminder = getRealFridgeReminder();
        if (realFridgeReminder) {
          setProgress("plan");
          sceneToast.textContent = realFridgeReminder;
          return;
        }

        if (state.hasCheckedMenuOrFridge) {
          setProgress("pick");
          sceneToast.textContent = "想好煮什么了？快去【阿婆食材柜】把需要的食材放进小篮子。";
          return;
        }

        setProgress("plan");
        sceneToast.textContent = "今晚食乜餸？先点墙上【阿婆菜谱】找灵感，或者打开【阿婆的双开门雪柜】看食材。";
      }

      function flashSceneToast(message) {
        sceneToast.textContent = message;
        sceneToast.classList.remove("is-flashing");
        void sceneToast.offsetWidth;
        sceneToast.classList.add("is-flashing");
        window.setTimeout(() => sceneToast.classList.remove("is-flashing"), 760);
      }

      function realFridge() {
        return window.AppRealFridge || null;
      }

      function getRealFridgeFreshness(ingredientId) {
        return realFridge()?.getIngredientFreshness?.(ingredientId) || "missing";
      }

      function getRealFridgeBadgeLabel(freshness) {
        if (freshness === "fresh") return "我家有";
        if (freshness === "soon") return "快吃";
        if (freshness === "urgent" || freshness === "expired") return "快坏啦";
        return "";
      }

      function getDefaultShelfLifeDays(ingredientId) {
        const ingredient = state.ingredientById[ingredientId] || window.getIngredientData?.(ingredientId);
        const value = Number(ingredient?.defaultShelfLifeDays);
        return Number.isFinite(value) && value > 0 ? value : 5;
      }

      function getRealFridgeReminder() {
        const fridge = realFridge();
        if (!fridge) return "";

        const expiringItems = fridge.getExpiringItems?.(2) || [];
        if (!expiringItems.length) return "";

        const scoredRecipes = state.recipes
          .map((recipe) => {
            const requiredIds = getRecipeRequiredIngredientIds(recipe);
            const matchedIds = expiringItems
              .map((item) => item.ingredientId)
              .filter((ingredientId) => requiredIds.includes(ingredientId));
            return { recipe, matchedIds };
          })
          .filter((item) => item.matchedIds.length)
          .sort((a, b) => b.matchedIds.length - a.matchedIds.length);

        const ingredientId = scoredRecipes[0]?.matchedIds[0] || expiringItems[0].ingredientId;
        const ingredientName = getIngredientNameById(ingredientId);
        const recipeName = scoredRecipes[0]?.recipe?.title || scoredRecipes[0]?.recipe?.name || "";
        return recipeName
          ? `乖孙，我家冰箱里的【${ingredientName}】再不吃就要黄啦！今天不如做个【${recipeName}】？`
          : `乖孙，我家冰箱里的【${ingredientName}】快要不新鲜啦，今晚记得先吃它。`;
      }

      function refreshRealFridgeUi(message) {
        refreshFridge();
        renderTodayMenuNote();
        renderRecipeBook();
        if (replenishModal?.classList.contains("is-open")) renderReplenishModal();
        updateSceneGuidance();
        if (message) flashSceneToast(message);
      }

      function addIngredientToRealFridge(ingredientId, source = "manual") {
        const ingredient = state.ingredientById[ingredientId] || window.getIngredientData?.(ingredientId);
        realFridge()?.upsertFridgeItem?.(ingredientId, {
          quantity: realFridge()?.getFridgeItem?.(ingredientId)?.quantity || 1,
          unit: ingredient?.defaultUnit || "份",
          purchaseDate: new Date().toISOString().slice(0, 10),
          shelfLifeDays: getDefaultShelfLifeDays(ingredientId),
          source
        });
      }

      function switchFridgeMode(mode) {
        const nextMode = ["home", "pantry", "real", "shopping"].includes(mode) ? mode : "home";
        state.currentFridgeMode = nextMode;
        refreshFridge();
      }

      function updateFridgeModeVisibility() {
        const mode = state.currentFridgeMode || "home";
        fridgeHome?.classList.toggle("is-active", mode === "home");
        fridgeZones?.classList.toggle("is-active", mode === "pantry");
        realFridgePanel?.classList.toggle("is-active", mode === "real");
        shoppingListPanel?.classList.toggle("is-active", mode === "shopping");

        document.querySelectorAll(".fridge-mode-tab").forEach((button) => {
          button.classList.toggle("is-active", button.dataset.fridgeMode === mode);
          button.setAttribute("aria-pressed", String(button.dataset.fridgeMode === mode));
        });

        if (!fridgeNote) return;
        if (mode === "home") fridgeNote.textContent = "阿婆的双开门雪柜：左门阿婆食材柜，右门我家冰箱，底部看补货总览。";
        if (mode === "pantry") fridgeNote.textContent = state.selectedIngredients.length
          ? `已选择：${state.selectedIngredients.map((item) => getIngredient(item)?.name || item).join("、")}`
          : "阿婆食材柜：点击食材图片，放入阿婆的小篮子。";
        if (mode === "real") fridgeNote.textContent = "我家冰箱：只记录线下真的买回家的食材。";
        if (mode === "shopping") fridgeNote.textContent = "补货总览：辅助查看全部缺货；主要操作可回今日餐单逐道菜处理。";
      }

      function getShoppingListStats() {
        const shoppingList = typeof readShoppingList === "function" ? readShoppingList() : [];
        const normalized = shoppingList.map(normalizeShoppingListItemState);
        return {
          shoppingList: normalized,
          apoNeeded: normalized.filter((item) => item?.ingredientId && item.apoStatus === "needed"),
          apoCollected: normalized.filter((item) => item?.ingredientId && item.apoStatus !== "needed"),
          homeNeeded: normalized.filter((item) => item?.ingredientId && item.homeStatus !== "in_home_fridge"),
          homeCollected: normalized.filter((item) => item?.ingredientId && item.homeStatus === "in_home_fridge"),
          unresolved: normalized.filter((item) => item?.ingredientId && (item.apoStatus === "needed" || item.homeStatus !== "in_home_fridge"))
        };
      }

      function getApoInventoryStatus(ingredientId) {
        const ingredient = state.ingredientById[ingredientId] || window.GLOBAL_INGREDIENTS_POOL?.[ingredientId];
        if (ingredient && !isExternalIngredient(ingredient)) return "in_apo_pantry";
        if (state.luggageIngredients.has(ingredientId)) return "in_luggage";
        if (state.collectedIngredients.has(ingredientId)) return "in_apo_pantry";
        return "needed";
      }

      function normalizeShoppingListItemState(item) {
        const ingredientId = item?.ingredientId;
        const apoStatus = ingredientId ? getApoInventoryStatus(ingredientId) : "needed";
        const inHomeFridge = Boolean(ingredientId && realFridge()?.getFridgeItem?.(ingredientId));
        return {
          ...item,
          apoStatus,
          homeStatus: inHomeFridge ? "in_home_fridge" : "needed",
          status: apoStatus === "needed" ? "needed" : "collected"
        };
      }

      function writeNormalizedShoppingList(list) {
        if (typeof writeShoppingList !== "function") return [];
        const next = (Array.isArray(list) ? list : []).map(normalizeShoppingListItemState);
        writeShoppingList(next);
        return next;
      }

      function getDaysRemainingForRealFridgeItem(item) {
        if (!item?.purchaseDate) return Infinity;
        const purchaseTime = new Date(`${item.purchaseDate}T00:00:00`).getTime();
        if (!Number.isFinite(purchaseTime)) return Infinity;
        const shelfLifeDays = Number(item.shelfLifeDays || getDefaultShelfLifeDays(item.ingredientId));
        const expiresAt = purchaseTime + shelfLifeDays * 24 * 60 * 60 * 1000;
        const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`).getTime();
        return Math.ceil((expiresAt - today) / (24 * 60 * 60 * 1000));
      }

      function formatDaysRemaining(days) {
        if (!Number.isFinite(days)) return "未知";
        if (days < 0) return `已过期 ${Math.abs(days)} 天`;
        if (days === 0) return "今天到期";
        return `还剩 ${days} 天`;
      }

      function getFreshnessLabel(freshness) {
        if (freshness === "fresh") return "新鲜";
        if (freshness === "soon") return "快过期";
        if (freshness === "urgent") return "今天吃";
        if (freshness === "expired") return "已过期";
        return "未记录";
      }

      function findRecipeForIngredient(ingredientId) {
        return state.recipes.find((recipe) => getRecipeRequiredIngredientIds(recipe).includes(ingredientId)) || null;
      }

      function getRealFridgeRecommendation() {
        const fridge = realFridge();
        if (!fridge) return null;
        const candidates = [
          ...(fridge.getExpiringItems?.(2) || []),
          ...(fridge.getExpiredItems?.() || [])
        ];
        if (!candidates.length) return null;

        const sorted = candidates
          .slice()
          .sort((a, b) => getDaysRemainingForRealFridgeItem(a) - getDaysRemainingForRealFridgeItem(b));
        const item = sorted[0];
        const recipe = findRecipeForIngredient(item.ingredientId);
        if (!recipe) return { item, recipe: null };
        return { item, recipe };
      }

      function renderFridgeHome() {
        if (!fridgeHome) return;
        const items = realFridge()?.readRealFridge?.() || [];
        const expiredCount = realFridge()?.getExpiredItems?.().length || 0;
        const expiringCount = realFridge()?.getExpiringItems?.(2).length || 0;
        const { shoppingList, apoNeeded, homeNeeded } = getShoppingListStats();

        fridgeHome.innerHTML = `
          <section class="fridge-home-card double-door-home">
            <p class="fridge-home-kicker">阿婆的双开门雪柜</p>
            <h2>左门玩阿婆厨房，右门管我家库存</h2>
            <div class="fridge-home-grid double-door-grid">
              <button class="fridge-entry-card" type="button" data-fridge-mode="pantry">
                <span class="fridge-entry-icon" aria-hidden="true">🥬</span>
                <span class="fridge-entry-title">阿婆食材柜</span>
                <span class="fridge-entry-copy">城市探索放进行李箱，回厨房后收入阿婆食材柜。</span>
                <span class="fridge-entry-meta">左门 · 游戏库存</span>
              </button>
              <button class="fridge-entry-card" type="button" data-fridge-mode="real">
                <span class="fridge-entry-icon" aria-hidden="true">🧊</span>
                <span class="fridge-entry-title">我家冰箱</span>
                <span class="fridge-entry-copy">记录家里现有食材、临期提醒、做菜后自动扣减。</span>
                <span class="fridge-entry-meta">${items.length} 样库存 · ${expiringCount} 样快过期 · ${expiredCount} 样已过期</span>
              </button>
            </div>
            <button class="fridge-entry-card shopping-entry-card" type="button" data-fridge-mode="shopping">
              <span class="fridge-entry-icon" aria-hidden="true">🛒</span>
              <span class="fridge-entry-title">补货总览</span>
              <span class="fridge-entry-copy">辅助查看全部缺货；主流程在每道菜下点“补齐这道菜”。</span>
              <span class="fridge-entry-meta">${shoppingList.length ? `阿婆食材柜还缺 ${apoNeeded.length} 样 · 我家冰箱未买 ${homeNeeded.length} 样` : "今日暂时没有采购项"}</span>
            </button>
          </section>
        `;
        fridgeHome.querySelectorAll("[data-fridge-mode]").forEach((button) => {
          button.addEventListener("click", () => switchFridgeMode(button.dataset.fridgeMode));
        });
      }

      function showLayer(name) {
        const showFridge = name === "fridge";
        if (showFridge) {
          closeTodayMenuSheet();
          state.hasCheckedMenuOrFridge = true;
          readCollectedIngredients();
          if (typeof readTodayMenus === "function" && readTodayMenus().length) {
            rebuildShoppingListFromTodayMenus();
          }
          switchFridgeMode("home");
          refreshFridge();
        }
        hideOriginTooltip();
        fridgeStage.classList.remove("zoom-through");
        mainLayer.classList.toggle("is-active", !showFridge);
        fridgeLayer.classList.toggle("is-active", showFridge);
        updateSceneGuidance();
      }

      function renderBasket() {
        if (!state.selectedIngredients.length) {
          state.selectedMethod = "";
          document.querySelectorAll(".zone[data-method]").forEach((zone) => {
            zone.classList.remove("is-active");
          });
          selectedToolEl.textContent = "还没选厨具";
          selectedToolEl.classList.remove("is-ready");
          basketIcons.innerHTML = `<span class="empty-basket">还没拿菜。先去阿婆食材柜看看。</span>`;
          if (state.currentFridgeMode === "pantry") fridgeNote.textContent = "阿婆食材柜：点击食材图片，放入阿婆的小篮子。";
          updateSceneGuidance();
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
        if (state.currentFridgeMode === "pantry") {
          fridgeNote.textContent = `已选择：${state.selectedIngredients.map((item) => getIngredient(item)?.name || item).join("、")}`;
        }
        updateSceneGuidance();
        updateFireButton();
      }

      function renderSelectedTool() {
        selectedToolEl.textContent = state.selectedMethod || "还没选厨具";
        selectedToolEl.classList.toggle("is-ready", Boolean(state.selectedMethod));
        updateSceneGuidance();
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

      function getOriginText(item) {
        const ingredient = getIngredient(item);
        if (ingredient) {
          const ingredientData = window.getIngredientData(ingredient.id);
          return `${ingredientData.typeName}：${ingredientData.desc} ➔ 点击追溯源头`;
        }
        return `产地：香港新界 ➔ 点击追溯源头`;
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
        originTooltip.textContent = getOriginText(item);
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

      function scheduleHideOriginTooltip(delay = 900) {
        window.clearTimeout(tooltipTimer);
        tooltipTimer = window.setTimeout(hideOriginTooltip, delay);
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
            from: "kitchen",
            returnTo: "fridge"
          });
          sessionStorage.setItem("recent_trace_origin", activeIngredientId);
          sessionStorage.setItem("return_to_fridge", "1");

          window.location.href = `../SearchMap-City/citymap.html?${params.toString()}`;
        };

        fridgeSceneImg.addEventListener("transitionend", goCityMap, { once: true });
        window.setTimeout(goCityMap, 1500);
      }

      function traceIngredientOriginFromFridge(ingredientId) {
        const ingredient = state.ingredientById[ingredientId] || window.getIngredientData?.(ingredientId);
        if (!ingredient) return;

        const sourceCity =
          ingredient.sourceCity ||
          ingredient.originCity ||
          ingredient.cityId ||
          ingredient.origin ||
          "Guangzhou";

        const params = new URLSearchParams({
          trace: ingredientId,
          city: sourceCity,
          from: "kitchen",
          returnTo: "fridge"
        });

        sessionStorage.setItem("recent_trace_origin", ingredientId);
        sessionStorage.setItem("return_to_fridge", "1");
        window.location.href = `../SearchMap-City/citymap.html?${params.toString()}`;
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
        const requiredIngredientIds = getRecipeRequiredIngredientIds(recipe);
        const matchedIngredientIds = requiredIngredientIds.filter((id) => selected.has(id));
        const selectedMethod = normalizeMethod(state.selectedMethod);
        const methodMatched = normalizeMethod(recipe.method) === selectedMethod;
        const extraIngredientCount = state.selectedIngredients.filter((id) => !requiredIngredientIds.includes(id)).length;
        const requiredCount = requiredIngredientIds.length;
        const matchedCount = matchedIngredientIds.length;
        const ingredientRatio = requiredCount ? matchedCount / requiredCount : 0;

        let score = Math.round(ingredientRatio * 80);
        if (methodMatched) score += 20;
        if (extraIngredientCount > 0) score -= Math.min(extraIngredientCount * 8, 24);
        score = Math.max(0, Math.min(100, score));

        return {
          recipe,
          score,
          matchedCount,
          requiredCount,
          matchedIngredientIds,
          missingIngredientIds: requiredIngredientIds.filter((id) => !selected.has(id)),
          extraIngredientCount,
          methodMatched,
          hasCoreMatch: requiredCount > 0 && requiredIngredientIds.every((id) => selected.has(id))
        };
      }

      function findCookingResult() {
        const scored = state.recipes
          .map(scoreRecipe)
          .filter((item) => item.methodMatched && item.matchedCount > 0)
          .sort((a, b) => b.score - a.score || b.matchedCount - a.matchedCount);

        const best = scored[0] || {
          recipe: null,
          score: 0,
          matchedCount: 0,
          requiredCount: 0,
          methodMatched: false,
          hasCoreMatch: false,
          extraIngredientCount: state.selectedIngredients.length
        };

        return {
          ...best,
          level: getApoEvaluationLevel(best)
        };
      }

      function getApoEvaluationLevel(result) {
        if (!result.recipe) return "fail";
        if (result.score >= 90 && result.hasCoreMatch && result.extraIngredientCount <= 1) return "perfect";
        if (result.score >= 60) return "good";
        return "fail";
      }

      function findRecipe() {
        return findCookingResult().recipe;
      }

      function selectTool(method) {
        if (!state.selectedIngredients.length) {
          flashSceneToast("小心电器！去看看菜谱或阿婆食材柜再运行吧！");
          return;
        }

        state.selectedMethod = method;
        document.querySelectorAll(".zone[data-method]").forEach((zone) => {
          zone.classList.toggle("is-active", zone.dataset.method === method);
        });

        renderSelectedTool();
      }

      function fireRecipe() {
        if (fireButton.disabled) return;
        const cookingResult = findCookingResult();
        setProgress("serve");
        showCookingOverlay();

        window.setTimeout(() => {
          hideCookingOverlay();
          openCookingResult(cookingResult);
          deductRealFridgeForRecipe(cookingResult?.recipe);
        }, 1000);
      }

      function getRecipeIngredientNames(recipe) {
        const requiredIngredientIds = getRecipeRequiredIngredientIds(recipe);
        return requiredIngredientIds.map(getIngredientNameById);
      }

      function getRecipeRequiredIngredientIds(recipe) {
        const sources = [
          recipe?.required_ingredients,
          recipe?.requiredIngredients,
          recipe?.ingredients
        ];
        const ids = sources.find((items) => Array.isArray(items) && items.length) || [];

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
          return state.luggageIngredients.has(ingredientId) || state.collectedIngredients.has(ingredientId);
        }

        return true;
      }

      function getRecipeLedgerCounts(recipe) {
        const requiredIngredientIds = getRecipeRequiredIngredientIds(recipe);
        const homeIds = new Set(realFridge()?.getRealFridgeIngredientIds?.() || []);
        const apoOwned = requiredIngredientIds.filter(isIngredientOwnedForRecipe).length;
        const homeOwned = requiredIngredientIds.filter((id) => homeIds.has(id)).length;
        return {
          total: requiredIngredientIds.length,
          apoOwned,
          homeOwned,
          apoMissingIds: requiredIngredientIds.filter((id) => !isIngredientOwnedForRecipe(id)),
          homeMissingIds: requiredIngredientIds.filter((id) => !homeIds.has(id))
        };
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
        const targetMap = new Map();
        const now = Date.now();

        menus.forEach((menu) => {
          const recipe = state.recipes.find((item) => item.id === menu.recipeId) || window.getRecipeData?.(menu.recipeId);
          if (!recipe) return;

          getRecipeRequiredIngredientIds(recipe).forEach((ingredientId) => {
            const ingredient = state.ingredientById[ingredientId] || window.GLOBAL_INGREDIENTS_POOL?.[ingredientId];
            if (!ingredient) return;
            const apoStatus = getApoInventoryStatus(ingredientId);
            const homeStatus = realFridge()?.getFridgeItem?.(ingredientId) ? "in_home_fridge" : "needed";

            const existing = targetMap.get(ingredientId) || {
              ingredientId,
              apoStatus,
              homeStatus,
              status: apoStatus === "needed" ? "needed" : "collected",
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

            existing.apoStatus = apoStatus;
            existing.homeStatus = homeStatus;
            existing.status = apoStatus === "needed" ? "needed" : "collected";
            existing.updatedAt = now;
            targetMap.set(ingredientId, existing);
          });
        });

        const nextShoppingList = [...targetMap.values()].map(normalizeShoppingListItemState);
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
        refreshFridge();
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
        refreshFridge();
        renderTodayMenuNote();
        renderRecipeBook();
        syncCurrentRecipeMenuButton();
      }

      function renderTodayMenuNote() {
        if (!todayMenuNote || !todayMenuNoteList) return;

        const menus = typeof readTodayMenus === "function" ? readTodayMenus() : [];
        todayMenuNote.classList.toggle("is-visible", menus.length > 0);
        todayMenuNote.classList.toggle("is-expanded", state.todayMenuSheetOpen && menus.length > 0);
        document.body.classList.toggle("menu-sheet-open", state.todayMenuSheetOpen && menus.length > 0);
        todayMenuNote.closest(".header")?.classList.toggle("has-today-menu", menus.length > 0);
        if (todayMenuToggle) {
          todayMenuToggle.textContent = menus.length ? `今日餐单 ${menus.length} 道` : "今日餐单";
          todayMenuToggle.setAttribute("aria-expanded", String(state.todayMenuSheetOpen && menus.length > 0));
        }

        if (!menus.length) {
          state.todayMenuSheetOpen = false;
          document.body.classList.remove("menu-sheet-open");
          todayMenuNote.classList.remove("is-expanded");
          todayMenuNoteList.innerHTML = "<li>还未定菜单</li>";
          if (shoppingToRealFridgeBtn) shoppingToRealFridgeBtn.hidden = true;
          return;
        }

        if (shoppingToRealFridgeBtn) shoppingToRealFridgeBtn.hidden = true;

        todayMenuNoteList.innerHTML = menus
          .map((menu) => {
            const recipe = state.recipes.find((item) => item.id === menu.recipeId) || window.getRecipeData?.(menu.recipeId);
            const counts = recipe ? getRecipeLedgerCounts(recipe) : { total: 0, apoOwned: 0, homeOwned: 0 };
            return `
            <li class="paper-menu-item" data-recipe-id="${escapeHtml(menu.recipeId)}">
              <button class="paper-menu-open" type="button" data-recipe-id="${escapeHtml(menu.recipeId)}">
                <span class="paper-menu-item-name">${escapeHtml(menu.recipeName || menu.recipeId)}</span>
                <span class="paper-menu-status">阿婆 ${counts.apoOwned}/${counts.total} · 我家 ${counts.homeOwned}/${counts.total}</span>
              </button>
              <span class="paper-menu-actions">
                <button class="view-menu-item" type="button" data-recipe-id="${escapeHtml(menu.recipeId)}">看菜谱</button>
                <button class="replenish-menu-item" type="button" data-replenish-recipe-id="${escapeHtml(menu.recipeId)}">补齐这道菜</button>
              </span>
              <button
                class="delete-menu-item"
                type="button"
                data-recipe-id="${escapeHtml(menu.recipeId)}"
                aria-label="从今日菜单删除${escapeHtml(menu.recipeName || menu.recipeId)}"
                title="从今日菜单删除"
              >×</button>
            </li>
          `;
          })
          .join("");
      }

      function closeTodayMenuSheet() {
        state.todayMenuSheetOpen = false;
        todayMenuNote?.classList.remove("is-expanded");
        document.body.classList.remove("menu-sheet-open");
        todayMenuToggle?.setAttribute("aria-expanded", "false");
      }

      function moveShoppingListToRealFridge() {
        const ids = Array.isArray(arguments[0]) ? arguments[0] : null;
        if (ids) {
          addSelectedShoppingItemsToHomeFridge(ids);
          return;
        }
        const fridge = realFridge();
        if (!fridge || typeof readShoppingList !== "function" || typeof writeShoppingList !== "function") return;

        const shoppingList = readShoppingList();
        const targets = shoppingList
          .map(normalizeShoppingListItemState)
          .filter((item) => item?.ingredientId && item.homeStatus !== "in_home_fridge");

        if (!targets.length) {
          flashSceneToast("补货总览暂时没有需要放入我家冰箱的食材。");
          return;
        }

        targets.forEach((item) => {
          addIngredientToRealFridge(item.ingredientId, "shopping_list");
        });

        const now = Date.now();
        writeNormalizedShoppingList(shoppingList.map((item) => (
          item?.ingredientId && targets.some((target) => target.ingredientId === item.ingredientId)
            ? { ...item, homeStatus: "in_home_fridge", updatedAt: now }
            : item
        )));

        switchFridgeMode("real");
        refreshRealFridgeUi(`线下买回来的 ${targets.length} 样食材已经放入我家冰箱。`);
      }

      function getHomeFridgeStatus(ingredientId) {
        const freshness = getRealFridgeFreshness(ingredientId);
        if (freshness === "missing") return "needed";
        return freshness;
      }

      function getApoStatusLabel(status) {
        if (status === "in_luggage") return "行李箱中";
        if (status === "in_apo_pantry") return "已带回";
        return "未收集";
      }

      function getHomeStatusLabel(status) {
        if (status === "fresh") return "已入库";
        if (status === "soon") return "快吃";
        if (status === "urgent") return "快坏啦";
        if (status === "expired") return "已过期";
        return "未购买";
      }

      function getTodayMenuRecipes(recipeId = "all") {
        const menuIds = readTodayMenus().map((menu) => menu.recipeId);
        const targetIds = recipeId && recipeId !== "all" ? [recipeId] : menuIds;
        return targetIds
          .map((id) => state.recipes.find((item) => item.id === id) || window.getRecipeData?.(id))
          .filter(Boolean);
      }

      function getReplenishRows(recipeId = "all") {
        const rowMap = new Map();
        getTodayMenuRecipes(recipeId).forEach((recipe) => {
          getRecipeRequiredIngredientIds(recipe).forEach((ingredientId) => {
            const ingredient = state.ingredientById[ingredientId] || window.getIngredientData?.(ingredientId);
            if (!ingredient) return;
            const existing = rowMap.get(ingredientId) || {
              ingredientId,
              ingredient,
              recipeNames: [],
              apoStatus: getApoInventoryStatus(ingredientId),
              homeStatus: getHomeFridgeStatus(ingredientId)
            };
            const recipeName = recipe.title || recipe.name || "阿婆菜谱";
            if (!existing.recipeNames.includes(recipeName)) existing.recipeNames.push(recipeName);
            rowMap.set(ingredientId, existing);
          });
        });
        return [...rowMap.values()];
      }

      function renderReplenishModal() {
        if (!replenishList) return;
        const rows = getReplenishRows(state.replenishRecipeId);
        const homeNeededIds = rows.filter((row) => row.homeStatus === "needed").map((row) => row.ingredientId);
        const apoNeededIds = rows.filter((row) => row.apoStatus === "needed").map((row) => row.ingredientId);
        const isAllMenus = state.replenishRecipeId === "all";
        const titleSuffix = state.replenishRecipeId === "all"
          ? "全部今日餐单"
          : rows[0]?.recipeNames?.[0] || "这道菜";
        if (replenishHint) {
          replenishHint.textContent = `${titleSuffix}缺哪些食材一眼看清。线下买齐会写入我家冰箱，阿婆出发只带走阿婆柜未收集的食材。`;
        }
        if (buyRecipeReplenishBtn) {
          buyRecipeReplenishBtn.textContent = isAllMenus ? "线下买齐这些菜" : "线下买齐这道菜";
          buyRecipeReplenishBtn.disabled = !homeNeededIds.length;
        }
        if (mapRecipeReplenishBtn) {
          mapRecipeReplenishBtn.textContent = isAllMenus ? "阿婆出发找这些菜" : "阿婆出发找这道菜";
          mapRecipeReplenishBtn.disabled = !apoNeededIds.length;
        }
        if (toggleSingleReplenishBtn) {
          toggleSingleReplenishBtn.textContent = state.replenishSingleActionsOpen ? "收起单项处理" : "展开单项处理";
          toggleSingleReplenishBtn.setAttribute("aria-expanded", String(state.replenishSingleActionsOpen));
        }

        replenishList.innerHTML = rows.length
          ? rows.map((row) => `
            <article class="replenish-item ${state.replenishSingleActionsOpen ? "has-single-actions" : ""}">
              <span class="replenish-icon" aria-hidden="true">${escapeHtml(row.ingredient.emoji || "🍽️")}</span>
              <span class="replenish-main">
                <strong>${escapeHtml(row.ingredient.name || row.ingredientId)}</strong>
                <small>${escapeHtml(row.recipeNames.join("、"))}</small>
              </span>
              <span class="shopping-ledger-status">阿婆柜：${escapeHtml(getApoStatusLabel(row.apoStatus))}</span>
              <span class="shopping-ledger-status">我家冰箱：${escapeHtml(getHomeStatusLabel(row.homeStatus))}</span>
              <span class="replenish-row-actions">
                <button class="real-fridge-action-btn" type="button" data-replenish-action="buy" data-ingredient-id="${escapeHtml(row.ingredientId)}" ${row.homeStatus !== "needed" ? "disabled" : ""}>线下买</button>
                <button class="real-fridge-action-btn" type="button" data-replenish-action="map" data-ingredient-id="${escapeHtml(row.ingredientId)}" ${row.apoStatus !== "needed" ? "disabled" : ""}>阿婆出发</button>
              </span>
            </article>
          `).join("")
          : '<p class="drawer-empty">今日餐单暂时没有需要补齐的食材。</p>';
        bindReplenishRows();
      }

      function openReplenishModal(recipeId = "all") {
        state.replenishRecipeId = recipeId || "all";
        state.replenishSingleActionsOpen = false;
        closeTodayMenuSheet();
        rebuildShoppingListFromTodayMenus();
        renderReplenishModal();
        replenishModal?.classList.add("is-open");
        document.body.classList.add("modal-open");
      }

      function closeReplenishModal() {
        replenishModal?.classList.remove("is-open");
        if (!modal.classList.contains("is-open") && !recipeBookModal?.classList.contains("is-open")) {
          document.body.classList.remove("modal-open");
        }
      }

      function getRecipeHomeNeededReplenishIds(recipeId = state.replenishRecipeId) {
        return getReplenishRows(recipeId)
          .filter((row) => row.homeStatus === "needed")
          .map((row) => row.ingredientId);
      }

      function getRecipeApoNeededReplenishIds(recipeId = state.replenishRecipeId) {
        return getReplenishRows(recipeId)
          .filter((row) => row.apoStatus === "needed")
          .map((row) => row.ingredientId);
      }

      function addSelectedShoppingItemsToHomeFridge(ingredientIds = []) {
        const ids = [...new Set((Array.isArray(ingredientIds) ? ingredientIds : []).filter(Boolean))];
        if (!ids.length) {
          flashSceneToast("这道菜在我家冰箱已经齐啦。");
          return;
        }
        ids.forEach((ingredientId) => {
          const ingredient = state.ingredientById[ingredientId] || window.getIngredientData?.(ingredientId);
          realFridge()?.upsertFridgeItem?.(ingredientId, {
            quantity: 1,
            unit: ingredient?.defaultUnit || "份",
            purchaseDate: new Date().toISOString().slice(0, 10),
            shelfLifeDays: getDefaultShelfLifeDays(ingredientId),
            source: "offline_purchase"
          });
        });
        const now = Date.now();
        const shoppingList = typeof readShoppingList === "function" ? readShoppingList() : [];
        writeNormalizedShoppingList(shoppingList.map((item) => (
          ids.includes(item?.ingredientId)
            ? { ...item, homeStatus: "in_home_fridge", updatedAt: now }
            : item
        )));
        refreshRealFridgeUi(`已把 ${ids.length} 样线下购买食材放入我家冰箱。`);
        renderReplenishModal();
      }

      function goMapForShoppingItems(ingredientIds = []) {
        const ids = [...new Set((Array.isArray(ingredientIds) ? ingredientIds : []).filter(Boolean))];
        if (!ids.length) {
          flashSceneToast("这道菜在阿婆食材柜已经齐啦。");
          return;
        }
        const focus = ids[0];
        const ingredient = state.ingredientById[focus] || window.getIngredientData?.(focus);
        const city = ingredient?.sourceCity || ingredient?.originCity || ingredient?.cityId || ingredient?.origin || "Guangzhou";
        const params = new URLSearchParams({
          shopping: ids.join(","),
          focus,
          city,
          from: "today-menu"
        });
        window.location.href = `../SearchMap-City/citymap.html?${params.toString()}`;
      }

      function bindReplenishRows() {
        replenishList?.querySelectorAll("[data-replenish-action]").forEach((button) => {
          button.addEventListener("click", () => {
            const ingredientId = button.dataset.ingredientId;
            if (!ingredientId) return;
            if (button.dataset.replenishAction === "buy") {
              addSelectedShoppingItemsToHomeFridge([ingredientId]);
              return;
            }
            goMapForShoppingItems([ingredientId]);
          });
        });
      }

      function deductRealFridgeForRecipe(recipe) {
        const fridge = realFridge();
        if (!fridge || !recipe) return;

        const usedIds = getRecipeRequiredIngredientIds(recipe)
          .filter((ingredientId) => fridge.getFridgeItem?.(ingredientId));

        if (!usedIds.length) return;

        usedIds.forEach((ingredientId) => fridge.markUsed?.(ingredientId, 1));
        const usedNames = usedIds.map((ingredientId) => `${getIngredientNameById(ingredientId)} 1 份`);
        refreshFridge();
        renderTodayMenuNote();
        window.setTimeout(() => {
          flashSceneToast(`这道菜已从我家冰箱扣减：${usedNames.join("、")}。`);
        }, 260);
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
          label: `✅ ${ingredient.name} · 阿婆食材柜有`,
          status: "owned"
        };
      }

      function showCookingOverlay() {
        if (!cookingOverlay) return;
        cookingOverlay.classList.add("is-visible");
        cookingOverlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
      }

      function hideCookingOverlay() {
        if (!cookingOverlay) return;
        cookingOverlay.classList.remove("is-visible");
        cookingOverlay.setAttribute("aria-hidden", "true");
      }

      function resetApoEvaluation() {
        modal.style.removeProperty("--apo-evaluation-color");
        if (apoStamp) {
          apoStamp.textContent = "";
          apoStamp.classList.remove("stamped");
        }
        if (apoQuoteText) {
          apoQuoteText.textContent = "“阿婆正在试味……”";
        }
      }

      function applyApoEvaluation(level) {
        const config = apoEvaluationSystem[level] || apoEvaluationSystem.good;
        modal.style.setProperty("--apo-evaluation-color", config.color);
        if (apoStamp) {
          apoStamp.textContent = config.stamp;
          apoStamp.classList.remove("stamped");
          void apoStamp.offsetWidth;
        }
        if (apoQuoteText) {
          apoQuoteText.textContent = `“${getApoQuote(level)}”`;
        }
      }

      function stampApoEvaluation() {
        if (!apoStamp) return;
        window.setTimeout(() => {
          apoStamp.classList.add("stamped");
        }, 400);
      }

      function getRecipeContributor(recipe) {
        if (!recipe?.contributorId) return null;
        if (typeof window.getContributorData === "function") {
          const contributor = window.getContributorData(recipe.contributorId);
          if (contributor) return contributor;
        }

        const contributorId = String(recipe.contributorId || "").trim().toLowerCase();
        if (!contributorId) return null;

        return (state.contributors || []).find((contributor) => (
          String(contributor?.id || "").trim().toLowerCase() === contributorId
        )) || null;
      }

      function renderRecipeContributorBadge(recipe) {
        const contributor = getRecipeContributor(recipe);
        if (!contributor) return "";

        const displayName = contributor.displayName || contributor.name || "";
        if (!displayName) return "";

        return `<span class="recipe-contributor-badge">来自${escapeHtml(displayName)}</span>`;
      }

      function renderRecipeContributorPanel(recipe, options = {}) {
        const contributor = getRecipeContributor(recipe);
        if (!contributor) return "";

        const displayName = contributor.displayName || contributor.name || "";
        if (!displayName) return "";

        if (options.compact) {
          return `
            <p class="recipe-contributor-line">
              这道菜来自${escapeHtml(displayName)}。
            </p>
          `;
        }

        const headlineParts = [
          `来自${displayName}`,
          recipe.memoryTag || ""
        ].filter(Boolean);
        const metaParts = [
          contributor.city || "",
          contributor.relationship || recipe.sourceType || ""
        ].filter(Boolean);
        const note = recipe.friendNote || "";

        return `
          <section class="recipe-contributor-panel" aria-label="朋友厨房来源">
            <p class="recipe-contributor-heading">${escapeHtml(headlineParts.join(" · "))}</p>
            ${metaParts.length ? `<p class="recipe-contributor-meta">${escapeHtml(metaParts.join(" · "))}</p>` : ""}
            ${contributor.bio ? `<p class="recipe-contributor-bio">${escapeHtml(contributor.bio)}</p>` : ""}
            ${note ? `
              <div class="recipe-friend-note">
                <span>朋友小纸条：</span>
                <p>“${escapeHtml(note)}”</p>
              </div>
            ` : ""}
          </section>
        `;
      }

      function showRecipeModal(recipe, options = {}) {
        state.currentViewingRecipe = recipe || null;
        const title = recipe.title || recipe.name || "今天没有标准菜谱";
        const method = recipe.method || "待分类";
        readCollectedIngredients();
        const ingredientStatuses = getRecipeRequiredIngredientIds(recipe).map(getRecipeIngredientStatus);
        const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

        if (!options.keepApoEvaluation) {
          resetApoEvaluation();
        }
        modalKicker.textContent = options.kicker || "阿婆上菜 · 菜谱图鉴";
        modalTitle.textContent = title;
        if (modalContributor) {
          modalContributor.innerHTML = renderRecipeContributorPanel(recipe, {
            compact: options.contributorMode === "result"
          });
        }
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

      function openCookingResult(result) {
        const level = result?.level || "fail";
        const recipe = result?.recipe || null;

        applyApoEvaluation(level);

        if (!recipe) {
          state.currentViewingRecipe = null;
          modal.classList.add("is-open");
          document.body.classList.add("modal-open");
          modalKicker.textContent = `阿婆试味 · ${result?.score || 0} 分`;
          modalTitle.textContent = "今日黑暗料理";
          if (modalContributor) {
            modalContributor.innerHTML = "";
          }
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

          modalSecret.textContent = "阿婆说：呢个组合暂时未入我本菜谱，试味可以，开档就免啦。";
          modalGossip.textContent = "做饭不是考试，但乱嚟都要有底线。下次先想清楚食材同火候啦。";
          stepsBlock.style.display = "none";
          modalSteps.innerHTML = "";

          stampApoEvaluation();
          closeBtn.focus();
          return;
        }

        showRecipeModal(recipe, {
          kicker: `${recipe.location?.city || "阿婆厨房"} · ${recipe.method || "待分类"} · 阿婆评分 ${result.score} 分`,
          keepApoEvaluation: true,
          contributorMode: "result"
        });

        stampApoEvaluation();
      }

      function openModal(recipe) {
        if (!recipe) {
          resetApoEvaluation();
          state.currentViewingRecipe = null;
          modal.classList.add("is-open");
          document.body.classList.add("modal-open");
          modalKicker.textContent = "阿婆上菜 · 自由发挥";
          modalTitle.textContent = "今天没有标准菜谱";
          if (modalContributor) {
            modalContributor.innerHTML = "";
          }
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
          modalGossip.textContent = "做饭不是考试，食材柜里有什么就先善待什么。火别太大，盐慢慢放。";
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

        const renderRecipeCard = (recipe) => {
            const ingredientNames = getRecipeIngredientNames(recipe).slice(0, 8);
            const counts = getRecipeLedgerCounts(recipe);
            const inTodayMenu = todayMenuIds.has(recipe.id);
            return `
              <button class="recipe-card ${inTodayMenu ? "is-selected" : ""}" type="button" data-recipe-id="${escapeHtml(recipe.id)}">
                ${inTodayMenu ? '<span class="recipe-card-selected-stamp">今日已选</span>' : ""}
                <span class="recipe-card-title">${escapeHtml(recipe.title || recipe.name)}</span>
                ${renderRecipeContributorBadge(recipe)}
                <span class="recipe-card-method">${escapeHtml(recipe.method || "待分类")}${recipe.tool ? ` · ${escapeHtml(recipe.tool)}` : ""}</span>
                ${inTodayMenu ? '<span class="recipe-card-menu-status">已锁定</span>' : ""}
                <span class="recipe-ledger-lines">
                  <span class="recipe-card-missing ${counts.apoOwned === counts.total ? "is-ready" : ""}">阿婆食材柜：已有 ${counts.apoOwned}/${counts.total}</span>
                  <span class="recipe-card-missing ${counts.homeOwned === counts.total ? "is-ready" : ""}">我家雪柜：已有 ${counts.homeOwned}/${counts.total}</span>
                </span>
                <span class="recipe-card-ingredients">
                  ${ingredientNames.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
                </span>
                <p class="recipe-card-story">${escapeHtml(recipe.description || recipe.story || recipe.gossip || "")}</p>
              </button>
            `;
          };

        const categories = (window.APP_DATA?.recipeCategories || [])
          .filter((category) => category?.id && category?.label)
          .slice()
          .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        if (!categories.length) {
          recipeBookList.innerHTML = state.recipes.map(renderRecipeCard).join("");
          return;
        }

        const categoryById = new Map(categories.map((category) => [category.id, category]));
        const otherCategory = {
          id: "other",
          label: "其他",
          emoji: "📌",
          description: "暂时未归类的阿婆菜谱。",
          order: 999
        };
        const grouped = new Map();
        categories.forEach((category) => grouped.set(category.id, []));
        grouped.set(otherCategory.id, []);

        state.recipes.forEach((recipe) => {
          const categoryId = categoryById.has(recipe.category) ? recipe.category : otherCategory.id;
          grouped.get(categoryId).push(recipe);
        });

        const activeFilter = state.recipeBookCategoryFilter || "all";
        const filterChips = [
          { id: "all", label: "全部", emoji: "📖", count: state.recipes.length },
          ...categories.map((category) => ({
            id: category.id,
            label: category.label,
            emoji: category.emoji || "",
            count: grouped.get(category.id)?.length || 0
          }))
        ];

        const categorySections = [...categories, otherCategory]
          .filter((category) => activeFilter === "all" || category.id === activeFilter)
          .filter((category) => (grouped.get(category.id) || []).length > 0 || activeFilter === category.id)
          .map((category) => {
            const recipes = grouped.get(category.id) || [];
            return `
              <section class="recipe-category-section" data-recipe-category="${escapeHtml(category.id)}">
                <header class="recipe-category-header">
                  <span class="recipe-category-emoji" aria-hidden="true">${escapeHtml(category.emoji || "📌")}</span>
                  <span class="recipe-category-copy">
                    <span class="recipe-category-title">${escapeHtml(category.label)}</span>
                    <span class="recipe-category-description">${escapeHtml(category.description || "")}</span>
                  </span>
                  <span class="recipe-category-count">${recipes.length} 道</span>
                </header>
                <div class="recipe-category-grid">
                  ${recipes.length
                    ? recipes.map(renderRecipeCard).join("")
                    : '<p class="recipe-category-empty">阿婆还在试味中。</p>'}
                </div>
              </section>
            `;
          })
          .join("");

        recipeBookList.innerHTML = `
          <div class="recipe-category-filter" aria-label="菜谱分类筛选">
            ${filterChips.map((chip) => `
              <button
                class="recipe-category-chip ${activeFilter === chip.id ? "is-active" : ""}"
                type="button"
                data-recipe-category-filter="${escapeHtml(chip.id)}"
              >
                <span aria-hidden="true">${escapeHtml(chip.emoji)}</span>
                <span>${escapeHtml(chip.label)}</span>
                <small>${chip.count}</small>
              </button>
            `).join("")}
          </div>
          ${categorySections || '<p class="recipe-category-empty">阿婆还在试味中。</p>'}
        `;
      }

      function openRecipeBook() {
        state.hasCheckedMenuOrFridge = true;
        localStorage.setItem("apo_recipe_board_seen", "1");
        recipeBoardCallout?.classList.add("is-hidden");
        updateSceneGuidance();
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
        updateSceneGuidance();
      }

      async function loadRecipes() {
        try {
          await window.whenDatabaseReady;
          const databaseContributors = typeof window.getAllContributors === "function"
            ? window.getAllContributors()
            : window.APP_DATA?.contributors;
          state.contributors = normalizeContributorData(databaseContributors);
          if (!state.contributors.length) {
            state.contributors = normalizeContributorData(await loadContributorJson());
          }
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
        if (typeof readTodayMenus === "function" && readTodayMenus().length) {
          rebuildShoppingListFromTodayMenus();
        }
        refreshFridge();
        renderBasket();
        renderSelectedTool();
        renderRecipeBook();
        restoreFridgeAfterTraceReturn();
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

      async function loadContributorJson() {
        try {
          const response = await fetch("../data/contributors.json", { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        } catch (fetchError) {
          return await new Promise((resolve) => {
            const request = new XMLHttpRequest();
            request.overrideMimeType("application/json");
            request.open("GET", "../data/contributors.json", true);
            request.onload = () => {
              if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
                try {
                  resolve(JSON.parse(request.responseText));
                  return;
                } catch (parseError) {
                  console.warn("贡献者数据暂时加载失败。", parseError);
                }
              }
              resolve([]);
            };
            request.onerror = () => resolve([]);
            request.send();
          });
        }
      }

      function normalizeContributorData(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.contributors)) return data.contributors;
        return [];
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

      function formatDrawerPreview(ingredients) {
        if (!ingredients.length) return "暂时没有可用食材";
        const names = ingredients.slice(0, 3).map((ingredient) => window.getIngredientData(ingredient.id).name);
        return ingredients.length > 3
          ? `${names.join("、")} 等 ${ingredients.length} 样`
          : names.join("、");
      }

      function renderMissingTraceArea(missingIngredients) {
        if (!missingIngredients.length) return "";
        return `
          <div class="drawer-missing">
            <p class="drawer-missing-title">今日餐单还缺这些食材</p>
            <div class="missing-trace-list">
              ${missingIngredients.map((ingredient) => {
                const ingredientData = window.getIngredientData(ingredient.id);
                return `
                  <button
                    class="missing-trace-chip"
                    type="button"
                    data-ingredient-id="${escapeHtml(ingredient.id)}"
                    aria-label="追溯${escapeHtml(ingredientData.name)}源头"
                  >
                    ${escapeHtml(ingredientData.name)} · 追溯源头 →
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }

      function renderRealFridgeRecommendation() {
        const recommendation = getRealFridgeRecommendation();
        if (!recommendation) return "";
        const ingredientName = getIngredientNameById(recommendation.item.ingredientId);
        const recipe = recommendation.recipe;
        return `
          <section class="real-fridge-reminder">
            <p>阿婆提醒：${escapeHtml(ingredientName)}快不新鲜啦${recipe ? `，今天不如做【${escapeHtml(recipe.title || recipe.name)}】？` : "，今晚记得先吃它。"}</p>
            ${recipe ? `
              <div class="real-fridge-reminder-actions">
                <button class="real-fridge-action-btn" type="button" data-recipe-action="view" data-recipe-id="${escapeHtml(recipe.id)}">查看菜谱</button>
                <button class="real-fridge-action-btn" type="button" data-recipe-action="menu" data-recipe-id="${escapeHtml(recipe.id)}">加入今日餐单</button>
              </div>
            ` : ""}
          </section>
        `;
      }

      function renderRealFridgePanel() {
        if (!realFridgePanel) return;
        const fridge = realFridge();
        const items = fridge?.readRealFridge?.() || [];
        const expiringItems = fridge?.getExpiringItems?.(2) || [];
        const expiredItems = fridge?.getExpiredItems?.() || [];

        if (!items.length) {
          realFridgePanel.innerHTML = `
            <section class="real-fridge-card real-fridge-empty">
              <p class="fridge-home-kicker">我家冰箱</p>
              <h2>这里还没有线下库存</h2>
              <p>这里记录你现实中家里真的有的食材。来源只有两种：手动点“今天买了”，或从补齐这道菜点“线下买”。</p>
              <div class="real-fridge-empty-actions">
                <button class="real-fridge-action-btn" type="button" data-fridge-mode="shopping">看补货总览</button>
                <button class="real-fridge-action-btn" type="button" data-fridge-mode="pantry">去阿婆食材柜</button>
              </div>
            </section>
          `;
          realFridgePanel.querySelectorAll("[data-fridge-mode]").forEach((button) => {
            button.addEventListener("click", () => switchFridgeMode(button.dataset.fridgeMode));
          });
          return;
        }

        const sortedItems = items
          .slice()
          .sort((a, b) => getDaysRemainingForRealFridgeItem(a) - getDaysRemainingForRealFridgeItem(b));

        realFridgePanel.innerHTML = `
          <section class="real-fridge-card">
            <div class="real-fridge-header">
              <span>
                <p class="fridge-home-kicker">我家冰箱</p>
                <h2>家里真的有 ${items.length} 样食材</h2>
              </span>
              <span class="real-fridge-summary">${expiringItems.length} 样快过期 · ${expiredItems.length} 样已过期</span>
            </div>
            ${renderRealFridgeRecommendation()}
            <div class="real-fridge-list">
              ${sortedItems.map((item) => {
                const ingredient = state.ingredientById[item.ingredientId] || window.getIngredientData?.(item.ingredientId);
                const freshness = fridge?.getIngredientFreshness?.(item.ingredientId) || "missing";
                const days = getDaysRemainingForRealFridgeItem(item);
                const recipe = findRecipeForIngredient(item.ingredientId);
                return `
                  <article class="real-fridge-item is-${escapeHtml(freshness)}">
                    <span class="real-fridge-item-icon" aria-hidden="true">${escapeHtml(ingredient?.emoji || "🍽️")}</span>
                    <span class="real-fridge-item-main">
                      <strong>${escapeHtml(ingredient?.name || item.ingredientId)}</strong>
                      <small>${escapeHtml(item.quantity)} ${escapeHtml(item.unit || "份")} · ${escapeHtml(item.purchaseDate || "未知日期")} 买入 · ${escapeHtml(formatDaysRemaining(days))}</small>
                    </span>
                    <span class="real-fridge-freshness">${escapeHtml(getFreshnessLabel(freshness))}</span>
                    <span class="real-fridge-item-actions">
                      <button class="real-fridge-action-btn" type="button" data-real-fridge-action="used" data-ingredient-id="${escapeHtml(item.ingredientId)}">吃完了 / 扣减</button>
                      <button class="real-fridge-action-btn" type="button" data-real-fridge-action="remove" data-ingredient-id="${escapeHtml(item.ingredientId)}">移除</button>
                      ${recipe ? `<button class="real-fridge-action-btn" type="button" data-recipe-action="view" data-recipe-id="${escapeHtml(recipe.id)}">用这个推荐菜</button>` : ""}
                    </span>
                  </article>
                `;
              }).join("")}
            </div>
          </section>
        `;
        bindRealFridgePanelActions();
      }

      function renderShoppingListPanel() {
        if (!shoppingListPanel) return;
        const { shoppingList, apoNeeded, homeNeeded } = getShoppingListStats();
        shoppingListPanel.innerHTML = `
          <section class="real-fridge-card shopping-list-card">
            <div class="real-fridge-header">
              <span>
                <p class="fridge-home-kicker">补货总览</p>
                <h2>${shoppingList.length ? `阿婆还缺 ${apoNeeded.length} 样 · 我家未买 ${homeNeeded.length} 样` : "今日菜单暂时不缺食材"}</h2>
              </span>
              <button class="real-fridge-action-btn shopping-list-import-btn" type="button">
                查看全部缺货
              </button>
            </div>
            <div class="shopping-list-groups">
              ${shoppingList.length ? shoppingList.map(renderShoppingListItem).join("") : '<p class="drawer-empty">没有待采购食材。</p>'}
            </div>
          </section>
        `;
        shoppingListPanel.querySelector(".shopping-list-import-btn")?.addEventListener("click", () => openReplenishModal("all"));
        bindShoppingListPanelActions();
      }

      function renderShoppingListItem(item) {
        const ingredient = state.ingredientById[item.ingredientId] || window.getIngredientData?.(item.ingredientId);
        const recipeNames = Array.isArray(item.recipeNames) && item.recipeNames.length
          ? item.recipeNames.join("、")
          : item.recipeName || "今日餐单";
        const apoLabel = item.apoStatus === "in_luggage"
          ? "已放进行李箱"
          : item.apoStatus === "in_apo_pantry"
            ? "已带回阿婆食材柜"
            : "未收集";
        const homeLabel = item.homeStatus === "in_home_fridge" ? "已入库" : "未购买";
        return `
          <article class="shopping-list-item is-${escapeHtml(item.apoStatus || "needed")} is-${escapeHtml(item.homeStatus || "needed")}">
            <span aria-hidden="true">${escapeHtml(ingredient?.emoji || "🛒")}</span>
            <strong>${escapeHtml(ingredient?.name || item.ingredientId)}</strong>
            <small>${escapeHtml(recipeNames)}</small>
            <span class="shopping-ledger-status">阿婆食材柜：${escapeHtml(apoLabel)}</span>
            <span class="shopping-ledger-status">我家冰箱：${escapeHtml(homeLabel)}</span>
            <span class="shopping-list-item-actions">
              <button class="real-fridge-action-btn" type="button" data-shopping-action="map" data-ingredient-id="${escapeHtml(item.ingredientId)}" ${item.apoStatus === "needed" ? "" : "disabled"}>去地图找</button>
              <button class="real-fridge-action-btn" type="button" data-shopping-action="home" data-ingredient-id="${escapeHtml(item.ingredientId)}" ${item.homeStatus === "in_home_fridge" ? "disabled" : ""}>线下买了</button>
            </span>
          </article>
        `;
      }

      function renderIngredientButton(ingredient) {
        const ingredientData = window.getIngredientData(ingredient.id);
        const highlighted = state.highlightIngredient.split(",").map((id) => id.trim()).includes(ingredient.id);
        const selected = state.selectedIngredients.includes(ingredient.id);
        const recentlyReturned = state.recentReturnedIngredients.has(ingredient.id);
        const source = getIngredientSource(ingredient);
        const freshness = getRealFridgeFreshness(ingredient.id);
        const realFridgeBadge = getRealFridgeBadgeLabel(freshness);
        const realFridgeClasses = [
          freshness === "soon" ? "real-fridge-soon" : "",
          freshness === "urgent" ? "real-fridge-urgent" : "",
          freshness === "expired" ? "real-fridge-expired" : ""
        ].filter(Boolean).join(" ");
        const removeButton = canRemoveIngredientFromFridge(ingredient)
          ? `
            <button
              class="fridge-remove-btn"
              type="button"
              data-remove-ingredient="${escapeHtml(ingredient.id)}"
              aria-label="从阿婆食材柜移除${escapeHtml(ingredientData.name)}"
              title="从阿婆食材柜拿走"
            >🗑️</button>
          `
          : "";
        return `
          <div class="fridge-item-card">
            <button
              id="${escapeHtml(ingredient.id)}"
              class="food-button fridge-item is-unlocked unlocked ${selected ? "is-selected" : ""} ${highlighted ? "is-highlighted" : ""} ${recentlyReturned ? "is-recent-returned" : ""} ${source === "suitcase" ? "is-suitcase-source" : ""} ${source === "fridge" ? "is-fridge-source" : ""} ${realFridgeClasses}"
              type="button"
              data-ingredient="${escapeHtml(ingredient.id)}"
              data-label="${escapeHtml(ingredientData.name)}"
              data-source="${escapeHtml(source)}"
              data-real-fridge="${escapeHtml(freshness)}"
              aria-label="选择${escapeHtml(ingredientData.name)}"
              aria-disabled="false"
              title="${escapeHtml(source === "suitcase" ? `${ingredientData.name} 已收入阿婆食材柜` : `${ingredientData.name} 已解锁`)}"
            >
              <span class="ingredient-icon" aria-hidden="true">${escapeHtml(ingredientData.emoji || "🍽️")}</span>
              <span class="source-badge" aria-hidden="true">${source === "suitcase" ? "🧳" : ""}</span>
              ${realFridgeBadge ? `<span class="real-fridge-badge">${escapeHtml(realFridgeBadge)}</span>` : ""}
              <span class="check"></span>
            </button>
            <div class="real-fridge-actions" aria-label="${escapeHtml(ingredientData.name)}我家冰箱操作">
              <button class="real-fridge-action-btn" type="button" data-real-fridge-action="bought" data-ingredient-id="${escapeHtml(ingredient.id)}">今天买了</button>
            </div>
            ${removeButton}
          </div>
        `;
      }

      function toggleFridgeDrawer(zoneKey) {
        state.expandedFridgeZone = state.expandedFridgeZone === zoneKey ? null : zoneKey;
        renderFridge(state.currentFridgePool || {});
      }

      function renderFridge(pool = {}) {
        renderApoPantry(pool);
      }

      function renderApoPantry(pool = {}) {
        state.currentFridgePool = pool;
        const hasTodayMenus = typeof readTodayMenus === "function" && readTodayMenus().length > 0;
        const visibleZones = FRIDGE_ZONE_ORDER
          .map((key) => {
            const zoneIngredients = [...(pool[key] || [])];
            const visibleIngredients = zoneIngredients
              .filter(isIngredientVisibleInFridge)
              .sort((a, b) => {
                const aRecent = state.recentReturnedIngredients.has(a.id);
                const bRecent = state.recentReturnedIngredients.has(b.id);
                return Number(bRecent) - Number(aRecent);
              });
            const missingIngredients = hasTodayMenus ? getMissingIngredientsForZone(key) : [];
            return { key, ingredients: visibleIngredients, missingIngredients };
          })
          .filter((zone) => zone.ingredients.length || zone.missingIngredients.length || zone.key === state.expandedFridgeZone);

        if (!visibleZones.some((zone) => zone.key === state.expandedFridgeZone)) {
          state.expandedFridgeZone = null;
        }

        fridgeZones.innerHTML = visibleZones
          .map((key) => {
            const zoneKey = key.key;
            const sortedIngredients = key.ingredients;
            const missingIngredients = key.missingIngredients;
            const sectionTitle = getSectionTitle(zoneKey);
            const isExpanded = state.expandedFridgeZone === zoneKey;
            const drawerAction = isExpanded ? "收起" : "展开";
            const traceButton = missingIngredients.length
              ? `<button class="drawer-trace-btn" type="button" data-fridge-zone="${escapeHtml(zoneKey)}">今日餐单还缺 ${missingIngredients.length} 样 →</button>`
              : "";

            return `
              <section class="fridge-category-drawer ${isExpanded ? "is-expanded" : ""}" data-fridge-zone="${escapeHtml(zoneKey)}">
                <button class="drawer-head" type="button" data-fridge-zone="${escapeHtml(zoneKey)}" aria-expanded="${String(isExpanded)}">
                  <span class="drawer-title">${escapeHtml(sectionTitle)}</span>
                  <span class="drawer-count">${sortedIngredients.length}样可用</span>
                  <span class="drawer-preview">${escapeHtml(formatDrawerPreview(sortedIngredients))}</span>
                  <span class="drawer-arrow">${drawerAction}</span>
                </button>
                ${!isExpanded ? traceButton : ""}
                <div class="drawer-body" ${isExpanded ? "" : "hidden"}>
                  <div class="drawer-items">
                    ${isExpanded && sortedIngredients.length
                      ? sortedIngredients.map(renderIngredientButton).join("")
                      : '<p class="drawer-empty">这个抽屉暂时没有可用食材。</p>'}
                  </div>
                  ${isExpanded ? renderMissingTraceArea(missingIngredients) : ""}
                </div>
              </section>
            `;
          })
          .join("");
        bindFridgeDrawers();
        bindFoodButtons();
        applyLuggageUnlocks();
        triggerHighlightNotice();
        updateFridgeModeVisibility();
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
          const requiredIds = getRecipeRequiredIngredientIds(recipe);

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
          const requiredIds = getRecipeRequiredIngredientIds(recipe);
          const missingIds = requiredIds.filter((id) => !database[id]);

          if (missingIds.length) {
            console.warn(
              `菜谱「${recipe.name || recipe.title || recipe.id}」引用了 database.js 中不存在的食材：${missingIds.join("、")}`
            );
          }
        });
      }

      function installPlaceholderImages() {
        mainSceneImg.src = "assets/vintage-hk-kitchen.webp";
        fridgeSceneImg.src = svgData(makeFridgeSceneSvg());
      }

      function bindFridgeDrawers() {
        fridgeZones.querySelectorAll(".drawer-head").forEach((button) => {
          button.addEventListener("click", () => toggleFridgeDrawer(button.dataset.fridgeZone));
        });
        fridgeZones.querySelectorAll(".drawer-trace-btn").forEach((button) => {
          button.addEventListener("click", () => {
            if (state.expandedFridgeZone !== button.dataset.fridgeZone) {
              state.expandedFridgeZone = button.dataset.fridgeZone;
              renderFridge(state.currentFridgePool || {});
            }
          });
        });
        fridgeZones.querySelectorAll(".missing-trace-chip").forEach((button) => {
          button.addEventListener("click", () => traceIngredientOriginFromFridge(button.dataset.ingredientId));
        });
        fridgeZones.querySelectorAll(".fridge-remove-btn").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            removeIngredientFromFridge(button.dataset.removeIngredient);
          });
        });
        fridgeZones.querySelectorAll(".real-fridge-action-btn").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const ingredientId = button.dataset.ingredientId;
            const ingredientName = getIngredientNameById(ingredientId);
            const action = button.dataset.realFridgeAction;

            if (action === "bought") {
              addIngredientToRealFridge(ingredientId, "manual");
              refreshRealFridgeUi(`${ingredientName} 已记入我家冰箱。`);
            } else if (action === "used") {
              realFridge()?.markUsed?.(ingredientId, 1);
              refreshRealFridgeUi(`${ingredientName} 已从我家冰箱扣减。`);
            } else if (action === "remove") {
              realFridge()?.removeFridgeItem?.(ingredientId);
              refreshRealFridgeUi(`${ingredientName} 已从我家冰箱移除。`);
            }
          });
        });
      }

      function bindRealFridgePanelActions() {
        realFridgePanel?.querySelectorAll("[data-real-fridge-action]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            const ingredientId = button.dataset.ingredientId;
            const ingredientName = getIngredientNameById(ingredientId);
            const action = button.dataset.realFridgeAction;

            if (action === "used") {
              realFridge()?.markUsed?.(ingredientId, 1);
              refreshRealFridgeUi(`${ingredientName} 已从我家冰箱扣减。`);
            } else if (action === "remove") {
              realFridge()?.removeFridgeItem?.(ingredientId);
              refreshRealFridgeUi(`${ingredientName} 已从我家冰箱移除。`);
            }
          });
        });

        realFridgePanel?.querySelectorAll("[data-recipe-action]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            const recipe = state.recipes.find((item) => item.id === button.dataset.recipeId);
            if (!recipe) return;

            if (button.dataset.recipeAction === "menu") {
              addRecipeToTodayMenus(recipe);
              refreshRealFridgeUi(`已把【${recipe.title || recipe.name}】加入今日餐单。`);
              return;
            }

            showRecipeModal(recipe, {
              kicker: "我家冰箱 · 阿婆推荐"
            });
          });
        });
      }

      function buyShoppingItemForHomeFridge(ingredientId) {
        if (!ingredientId) return;
        const ingredientName = getIngredientNameById(ingredientId);
        addIngredientToRealFridge(ingredientId, "offline_purchase");
        const now = Date.now();
        const shoppingList = typeof readShoppingList === "function" ? readShoppingList() : [];
        writeNormalizedShoppingList(shoppingList.map((item) => (
          item?.ingredientId === ingredientId
            ? { ...item, homeStatus: "in_home_fridge", updatedAt: now }
            : item
        )));
        refreshRealFridgeUi(`${ingredientName} 已线下买回，放入我家冰箱。`);
      }

      function bindShoppingListPanelActions() {
        shoppingListPanel?.querySelectorAll("[data-shopping-action]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            const ingredientId = button.dataset.ingredientId;
            if (!ingredientId) return;

            if (button.dataset.shoppingAction === "map") {
              goMapForShoppingItems([ingredientId]);
              return;
            }

            buyShoppingItemForHomeFridge(ingredientId);
          });
        });
      }

      function bindFoodButtons() {
        fridgeZones.querySelectorAll(".food-button").forEach((button) => {
          let pointerStartX = 0;
          let suppressNextClick = false;

          button.addEventListener("pointerdown", (event) => {
            pointerStartX = event.clientX;
            suppressNextClick = false;
          });
          button.addEventListener("pointerup", (event) => {
            if (Math.abs(event.clientX - pointerStartX) > 8) {
              suppressNextClick = true;
            }
          });
          button.addEventListener("pointercancel", () => {
            suppressNextClick = false;
          });
          button.addEventListener("mouseenter", () => {
            if (!isTouchLike()) showOriginTooltip(button, button.dataset.ingredient, { tappable: true });
          });
          button.addEventListener("mouseleave", () => {
            if (!isTouchLike()) scheduleHideOriginTooltip();
          });
          button.addEventListener("click", (event) => {
            if (suppressNextClick) {
              event.preventDefault();
              suppressNextClick = false;
              return;
            }
            handleFoodClick(button);
          });
          button.addEventListener("dblclick", (event) => {
            event.preventDefault();
            traceOrigin();
          });
        });
      }

      document.querySelector(".zone-fridge").addEventListener("click", () => showLayer("fridge"));
      document.querySelectorAll(".fridge-mode-tab").forEach((button) => {
        button.addEventListener("click", () => switchFridgeMode(button.dataset.fridgeMode));
      });
      recipeBoardZone?.addEventListener("click", openRecipeBook);
      closeFridgeBtn.addEventListener("click", () => showLayer("main"));
      document.querySelectorAll(".zone[data-method]").forEach((zone) => {
        zone.addEventListener("click", () => {
          if (!state.selectedIngredients.length) {
            flashSceneToast("小心电器！去看看菜谱或阿婆食材柜再运行吧！");
            return;
          }

          selectTool(zone.dataset.method);
        });
      });
      fireButton.addEventListener("click", fireRecipe);
      setTodayMenuBtn?.addEventListener("click", () => {
        const recipe = state.currentViewingRecipe;
        if (!recipe) return;

        addRecipeToTodayMenus(recipe);

        const shoppingList = rebuildShoppingListFromTodayMenus();
        const apoNeededCount = shoppingList.filter((item) => item.apoStatus === "needed").length;
        const homeNeededCount = shoppingList.filter((item) => item.homeStatus !== "in_home_fridge").length;

        sceneToast.textContent = apoNeededCount || homeNeededCount
          ? `已加入今日餐单。阿婆食材柜还缺 ${apoNeededCount} 样，我家冰箱未买 ${homeNeededCount} 样。`
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
      todayMenuToggle?.addEventListener("click", () => {
        const menus = typeof readTodayMenus === "function" ? readTodayMenus() : [];
        if (!menus.length) return;
        if (!window.matchMedia?.("(max-width: 760px)")?.matches) return;
        state.todayMenuSheetOpen = !state.todayMenuSheetOpen;
        renderTodayMenuNote();
      });
      todayMenuNoteList?.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(".delete-menu-item");
        if (deleteButton) {
          event.preventDefault();
          event.stopPropagation();
          removeRecipeFromTodayMenus(deleteButton.dataset.recipeId);
          return;
        }

        const replenishButton = event.target.closest(".replenish-menu-item");
        if (replenishButton) {
          event.preventDefault();
          event.stopPropagation();
          openReplenishModal(replenishButton.dataset.replenishRecipeId);
          return;
        }

        const openButton = event.target.closest(".paper-menu-open, .view-menu-item");
        if (openButton) {
          event.preventDefault();
          event.stopPropagation();
          closeTodayMenuSheet();
          openRecipeFromBook(openButton.dataset.recipeId);
        }
      });
      shoppingToRealFridgeBtn?.addEventListener("click", () => openReplenishModal("all"));
      replenishClose?.addEventListener("click", closeReplenishModal);
      replenishBackdrop?.addEventListener("click", closeReplenishModal);
      closeReplenishBtn?.addEventListener("click", closeReplenishModal);
      buyRecipeReplenishBtn?.addEventListener("click", () => {
        addSelectedShoppingItemsToHomeFridge(getRecipeHomeNeededReplenishIds());
      });
      mapRecipeReplenishBtn?.addEventListener("click", () => {
        goMapForShoppingItems(getRecipeApoNeededReplenishIds());
      });
      toggleSingleReplenishBtn?.addEventListener("click", () => {
        state.replenishSingleActionsOpen = !state.replenishSingleActionsOpen;
        renderReplenishModal();
      });
      recipeBookClose?.addEventListener("click", closeRecipeBook);
      recipeBookBackdrop?.addEventListener("click", closeRecipeBook);
      recipeBookList?.addEventListener("click", (event) => {
        const filterButton = event.target.closest(".recipe-category-chip");
        if (filterButton) {
          state.recipeBookCategoryFilter = filterButton.dataset.recipeCategoryFilter || "all";
          renderRecipeBook();
          return;
        }

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
      originTooltip?.addEventListener("mouseenter", () => {
        if (!isTouchLike()) window.clearTimeout(tooltipTimer);
      });
      originTooltip?.addEventListener("mouseleave", () => {
        if (!isTouchLike()) scheduleHideOriginTooltip(500);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          hideOriginTooltip();
          if (replenishModal?.classList.contains("is-open")) closeReplenishModal();
          if (recipeBookModal?.classList.contains("is-open")) closeRecipeBook();
          if (modal.classList.contains("is-open")) closeModal();
        }
      });
      window.addEventListener("focus", () => {
        readCollectedIngredients();
        readHighlightIngredient();
        applyLuggageUnlocks();
        if (typeof readTodayMenus === "function" && readTodayMenus().length) {
          rebuildShoppingListFromTodayMenus();
        }
        refreshFridge();
        renderTodayMenuNote();
        renderRecipeBook();
      });
      window.addEventListener("storage", (event) => {
        if (["my_luggage", "pantry_collected", "today_menu", "shopping_list", "real_fridge_inventory"].includes(event.key)) {
          readCollectedIngredients();
          applyLuggageUnlocks();
          if (typeof readTodayMenus === "function" && readTodayMenus().length) {
            rebuildShoppingListFromTodayMenus();
          }
          refreshFridge();
          renderTodayMenuNote();
          renderRecipeBook();
        }
      });

      readCollectedIngredients();
      readHighlightIngredient();
      if (localStorage.getItem("apo_recipe_board_seen") === "1") {
        recipeBoardCallout?.classList.add("is-hidden");
      }
      installPlaceholderImages();
      renderBasket();
      renderSelectedTool();
      renderTodayMenuNote();
      loadRecipes();
