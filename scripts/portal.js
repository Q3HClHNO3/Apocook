const portal = document.querySelector(".portal");
const greetingText = document.querySelector("#greetingText");
const targets = document.querySelectorAll(".marker, .plane");

const greetings = [
  {
    zh: "今天想干嘛？",
    en: "What's the plan for today?"
  },
  {
    zh: "今天从哪一个小世界开始？",
    en: "Which little world shall we open first?"
  },
  {
    zh: "今天想降落在哪里？",
    en: "Where shall we land today?"
  }
];

const greeting = greetings[Math.floor(Math.random() * greetings.length)];
greetingText.innerHTML = `${greeting.zh}<span>${greeting.en}</span>`;

function showTargetHint(target) {
  target.classList.add("is-peek");
  window.setTimeout(() => target.classList.remove("is-peek"), 1100);
}

function descendTo(target) {
  if (portal.classList.contains("is-descending")) return;
  if (!target.dataset.href) {
    showTargetHint(target);
    return;
  }

  portal.classList.add("is-descending");

  window.setTimeout(() => {
    window.location.href = target.dataset.href;
  }, 760);
}

targets.forEach((target) => {
  target.addEventListener("touchstart", () => showTargetHint(target), { passive: true });
  target.addEventListener("click", () => descendTo(target));
});
