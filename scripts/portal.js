const portal = document.querySelector(".portal");
const stage = document.querySelector(".portal-stage");
const greetingText = document.querySelector("#greetingText");
const hintText = document.querySelector(".hint");
const layerImages = document.querySelectorAll(".portal-hero img");
const earthStage = document.querySelector(".portal-left-hand-earth");
const chopsticks = document.querySelector(".portal-right-hand-wrap");
const zones = [...document.querySelectorAll(".portal-zone")];
const earthZone = document.querySelector(".portal-zone-earth");
const bowlZone = document.querySelector(".portal-zone-bowl");
const customCursor = document.createElement("div");
const defaultCursorEmoji = "🥢";

const greetingPool = [
  {
    title: "叹杯早茶，夹起世界。",
    titleEn: "Sip your morning tea, taste the world.",
    hint: "落筷寻味：轻点地球降落大地图，点击四周探访阿婆厨房。",
    hintEn: "Taste the world: Tap the globe to land, tap around to enter the kitchen."
  },
  {
    title: "今日早茶，食啲咩呀？",
    titleEn: "What's on the menu for today's tea?",
    hint: "箸下有乾坤：点击碗中地球开启城市冒险，点击四周茶点回到阿婆厨房。",
    hintEn: "Destiny in chopsticks: Tap the globe for adventure, tap around for the kitchen."
  },
  {
    title: "一盅两件，漫游大千。",
    titleEn: "A classic dim sum morning, a global journey.",
    hint: "美食无界：轻触地球破空降落大地图，触碰周围佳肴重回厨房。",
    hintEn: "No boundaries: Tap the earth to land, click the delicacies to return home."
  },
  {
    title: "饱腹之欲，探索之心。",
    titleEn: "Satisfy your appetite, unlock your destination.",
    hint: "寻香而去：点击大碗地球飞往城市大屏，指引四周美食探访厨房。",
    hintEn: "Follow the aroma: Click the globe to land, select around to enter the kitchen."
  }
];

const zoneLabels = {
  earth: "城市探索",
  bowl: "阿婆厨房"
};

let activeZone = null;
let pointer = { x: window.innerWidth * 0.52, y: window.innerHeight * 0.48 };
let renderedPointer = { ...pointer };
let rafId = 0;
let introCueActive = true;
let introCueTimers = [];

customCursor.className = "custom-cursor";
customCursor.innerHTML = defaultCursorEmoji;
document.body.appendChild(customCursor);

function setCustomCursorEmoji(emoji = defaultCursorEmoji) {
  customCursor.innerHTML = emoji;
}

function moveCustomCursor(event) {
  customCursor.style.left = `${event.clientX}px`;
  customCursor.style.top = `${event.clientY}px`;
  customCursor.classList.add("active");
}

function hideCustomCursor() {
  customCursor.classList.remove("active");
}

function renderRandomCopy() {
  const copy = greetingPool[Math.floor(Math.random() * greetingPool.length)];

  if (greetingText) {
    greetingText.replaceChildren(
      document.createTextNode(copy.title),
      Object.assign(document.createElement("span"), { textContent: copy.titleEn })
    );
  }

  if (hintText) {
    hintText.replaceChildren(
      document.createTextNode(copy.hint),
      Object.assign(document.createElement("span"), { textContent: copy.hintEn })
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderRandomCopy, { once: true });
} else {
  renderRandomCopy();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getWristPoint() {
  const rect = stage.getBoundingClientRect();
  return {
    x: rect.left + rect.width * 0.78,
    y: rect.top + rect.height * 0.34
  };
}

function getStagePoint(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)
  };
}

function getEventPoint(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  return {
    x: touch ? touch.clientX : event.clientX,
    y: touch ? touch.clientY : event.clientY,
    pageX: touch ? touch.pageX : event.pageX,
    pageY: touch ? touch.pageY : event.pageY
  };
}

function getZoneAtPoint(clientX, clientY) {
  const earthRect = earthZone?.getBoundingClientRect();
  if (earthRect) {
    const earthPad = Math.min(window.innerWidth, window.innerHeight) * 0.018;
    const inEarth =
      clientX >= earthRect.left - earthPad &&
      clientX <= earthRect.right + earthPad &&
      clientY >= earthRect.top - earthPad &&
      clientY <= earthRect.bottom + earthPad;

    if (inEarth) return earthZone;
  }

  const stageRect = stage.getBoundingClientRect();
  const inStage =
    clientX >= stageRect.left &&
    clientX <= stageRect.right &&
    clientY >= stageRect.top &&
    clientY <= stageRect.bottom;

  return inStage ? bowlZone : null;
}

function getZoneCenter(zone) {
  const rect = zone.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function setActiveZone(zone) {
  if (activeZone === zone) return;

  if (activeZone) {
    activeZone.classList.remove("is-aimed");
    stage.classList.remove(`is-aiming-${activeZone.dataset.zone}`);
  }

  activeZone = zone;

  if (activeZone) {
    activeZone.classList.add("is-aimed");
    stage.classList.add(`is-aiming-${activeZone.dataset.zone}`);
    portal.dataset.intent = zoneLabels[activeZone.dataset.zone] || "";
  } else {
    delete portal.dataset.intent;
  }
}

function aimChopsticks(clientX, clientY, immediate = false) {
  pointer = { x: clientX, y: clientY };
  if (immediate) renderedPointer = { ...pointer };
  if (!rafId) rafId = window.requestAnimationFrame(renderChopsticks);
}

function cancelIntroCue() {
  if (!introCueActive) return;
  introCueActive = false;
  introCueTimers.forEach((timer) => window.clearTimeout(timer));
  introCueTimers = [];
  portal.classList.remove("is-intro-cue");
  stage.classList.remove("is-intro-earth-pop");
}

function runIntroCue() {
  if (!stage || !earthZone || !bowlZone || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    introCueActive = false;
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const earthPoint = getZoneCenter(earthZone);
  const bowlPoint = {
    x: stageRect.left + stageRect.width * 0.34,
    y: stageRect.top + stageRect.height * 0.66
  };

  portal.classList.add("is-intro-cue");
  aimChopsticks(stageRect.right + stageRect.width * 0.18, stageRect.top + stageRect.height * 0.38, true);

  introCueTimers.push(window.setTimeout(() => {
    if (!introCueActive) return;
    stage.classList.add("is-intro-earth-pop");
    setActiveZone(earthZone);
    aimChopsticks(earthPoint.x, earthPoint.y);
  }, 120));

  introCueTimers.push(window.setTimeout(() => {
    if (!introCueActive) return;
    stage.classList.remove("is-intro-earth-pop");
    setActiveZone(bowlZone);
    aimChopsticks(bowlPoint.x, bowlPoint.y);
  }, 720));

  introCueTimers.push(window.setTimeout(() => {
    if (!introCueActive) return;
    introCueActive = false;
    introCueTimers = [];
    portal.classList.remove("is-intro-cue");
    setActiveZone(getZoneAtPoint(pointer.x, pointer.y));
  }, 1220));
}

function renderChopsticks() {
  rafId = 0;
  renderedPointer.x += (pointer.x - renderedPointer.x) * 0.23;
  renderedPointer.y += (pointer.y - renderedPointer.y) * 0.23;

  const wrist = getWristPoint();
  const dx = renderedPointer.x - wrist.x;
  const dy = renderedPointer.y - wrist.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const reach = clamp(distance / Math.max(window.innerWidth, window.innerHeight), 0.82, 1.12);
  const stagePoint = getStagePoint(renderedPointer.x, renderedPointer.y);
  const tiltX = clamp((stagePoint.x - 50) / 50, -1, 1);
  const tiltY = clamp((stagePoint.y - 50) / 50, -1, 1);

  stage.style.setProperty("--pointer-x", `${stagePoint.x}%`);
  stage.style.setProperty("--pointer-y", `${stagePoint.y}%`);
  stage.style.setProperty("--tilt-x", tiltX.toFixed(3));
  stage.style.setProperty("--tilt-y", tiltY.toFixed(3));
  chopsticks.style.setProperty("--chopstick-angle", `${angle + 178}deg`);
  chopsticks.style.setProperty("--chopstick-reach", reach.toFixed(3));
  setActiveZone(getZoneAtPoint(renderedPointer.x, renderedPointer.y));

  if (Math.abs(pointer.x - renderedPointer.x) > 0.4 || Math.abs(pointer.y - renderedPointer.y) > 0.4) {
    rafId = window.requestAnimationFrame(renderChopsticks);
  }
}

function prepareTransitionOrigin(clientX, clientY) {
  const bgRect = stage.getBoundingClientRect();
  const originX = clamp(((clientX - bgRect.left) / bgRect.width) * 100, 0, 100);
  const originY = clamp(((clientY - bgRect.top) / bgRect.height) * 100, 0, 100);
  stage.style.setProperty("--zoom-origin-x", `${originX}%`);
  stage.style.setProperty("--zoom-origin-y", `${originY}%`);

  const stagePoint = getStagePoint(clientX, clientY);
  stage.style.setProperty("--pointer-x", `${stagePoint.x}%`);
  stage.style.setProperty("--pointer-y", `${stagePoint.y}%`);
}

function descendTo(zone, point) {
  if (!zone?.dataset.href || portal.classList.contains("is-descending")) return;

  prepareTransitionOrigin(point.x, point.y);
  setActiveZone(zone);
  portal.classList.add("is-descending");
  portal.classList.add(`is-descending-${zone.dataset.zone}`);
  stage.classList.add(`is-entering-${zone.dataset.zone}`);

  window.setTimeout(() => {
    window.location.href = zone.dataset.href;
  }, 720);
}

function handlePointerMove(event) {
  if (portal.classList.contains("is-descending")) return;
  cancelIntroCue();
  const point = getEventPoint(event);
  aimChopsticks(point.x, point.y);
}

function handleZoneClick(event) {
  event.preventDefault();
  cancelIntroCue();
  const point = getEventPoint(event);
  const zone = event.currentTarget;
  aimChopsticks(point.x, point.y, true);

  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
    window.setTimeout(() => descendTo(zone, point), 150);
    return;
  }

  descendTo(zone, point);
}

zones.forEach((zone) => {
  zone.addEventListener("mouseenter", (event) => setActiveZone(event.currentTarget));
  zone.addEventListener("focus", (event) => setActiveZone(event.currentTarget));
  zone.addEventListener("click", handleZoneClick);
  zone.addEventListener("touchstart", (event) => {
    const point = getEventPoint(event);
    aimChopsticks(point.x, point.y, true);
    setActiveZone(event.currentTarget);
  }, { passive: true });
});

earthZone?.addEventListener("mouseenter", () => setCustomCursorEmoji("✈️"));
earthZone?.addEventListener("mouseleave", () => setCustomCursorEmoji(defaultCursorEmoji));
bowlZone?.addEventListener("mouseenter", () => setCustomCursorEmoji("😋"));
bowlZone?.addEventListener("mouseleave", () => setCustomCursorEmoji(defaultCursorEmoji));

window.addEventListener("mousemove", moveCustomCursor);
window.addEventListener("mouseleave", hideCustomCursor);
document.addEventListener("mouseleave", hideCustomCursor);

portal.addEventListener("mousemove", handlePointerMove);
stage.addEventListener("click", (event) => {
  if (event.target.closest(".portal-zone")) return;
  cancelIntroCue();
  const point = getEventPoint(event);
  aimChopsticks(point.x, point.y, true);
  descendTo(bowlZone, point);
});
stage.addEventListener("mouseleave", () => setActiveZone(null));
stage.addEventListener("touchstart", (event) => {
  cancelIntroCue();
  const point = getEventPoint(event);
  aimChopsticks(point.x, point.y, true);
  setActiveZone(getZoneAtPoint(point.x, point.y));
}, { passive: true });

layerImages.forEach((image) => {
  image.addEventListener("error", () => {
    portal.classList.add("has-layer-error");
  }, { once: true });
});

earthStage?.addEventListener("animationend", (event) => {
  if (event.animationName === "portalEarthPop") {
    earthStage.classList.remove("is-spinning");
  }
});

window.addEventListener("resize", () => {
  aimChopsticks(pointer.x, pointer.y, true);
});

aimChopsticks(pointer.x, pointer.y, true);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runIntroCue, { once: true });
} else {
  window.setTimeout(runIntroCue, 40);
}
