const marketSessions = [
  {
    name: "Tokyo",
    timezone: "Asia/Tokyo",
    hours: [9, 15],
    label: "JP cash session"
  },
  {
    name: "London",
    timezone: "Europe/London",
    hours: [8, 16.5],
    label: "EU market session"
  },
  {
    name: "Frankfurt",
    timezone: "Europe/Berlin",
    hours: [9, 17.5],
    label: "EU derivatives"
  },
  {
    name: "New York",
    timezone: "America/New_York",
    hours: [9.5, 16],
    label: "US cash session"
  }
];

const clocks = [
  { name: "Tokyo", timezone: "Asia/Tokyo" },
  { name: "Singapore", timezone: "Asia/Singapore" },
  { name: "London", timezone: "Europe/London" },
  { name: "New York", timezone: "America/New_York" }
];

const signalMessages = [
  "The room is shaped as a central lobby first, with the board acting as the focal point.",
  "Dock pads are ready for future avatar placement without rebuilding the plaza.",
  "The live board pulls market data when the browser is online.",
  "Fullscreen mode works well for event screens, waiting rooms, and trading lounges.",
  "Theme switches let the same lobby feel like an expo hall, command room, or night network."
];

const dockPads = [
  "North Dock",
  "North East Dock",
  "East Dock",
  "South East Dock",
  "South Dock",
  "South West Dock",
  "West Dock",
  "North West Dock"
];

const sceneNames = {
  aurora: "Aurora Relay",
  sunrise: "Sunrise Pulse",
  abyss: "Abyss Network"
};

const sessionGrid = document.getElementById("sessionGrid");
const clockGrid = document.getElementById("clockGrid");
const signalStream = document.getElementById("signalStream");
const dockRing = document.getElementById("dockRing");
const onlineText = document.getElementById("onlineText");
const lastSync = document.getElementById("lastSync");
const marketPulse = document.getElementById("marketPulse");
const sceneName = document.getElementById("sceneName");
const dockStatus = document.getElementById("dockStatus");
const sceneShell = document.querySelector(".scene-shell");

const formatClock = (timezone, options) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    ...options
  });

function getSessionState(timezone, [openHour, closeHour]) {
  const now = new Date();
  const parts = formatClock(timezone, {
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(now);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = lookup.weekday || "";
  const hour = Number(lookup.hour || 0);
  const minute = Number(lookup.minute || 0);
  const value = hour + minute / 60;
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  const isOpen = isWeekday && value >= openHour && value <= closeHour;

  return {
    isOpen,
    dayLabel: weekday,
    timeLabel: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  };
}

function renderSessions() {
  sessionGrid.innerHTML = marketSessions
    .map((session) => {
      const state = getSessionState(session.timezone, session.hours);

      return `
        <article class="session-card">
          <div>
            <strong>${session.name}</strong>
            <span class="session-label">${session.label}</span>
          </div>
          <div>
            <strong>${state.isOpen ? "OPEN" : "CLOSED"}</strong>
            <span class="session-status">${state.dayLabel} ${state.timeLabel}</span>
          </div>
        </article>
      `;
    })
    .join("");

  const openCount = marketSessions.filter((session) => getSessionState(session.timezone, session.hours).isOpen).length;

  if (openCount > 1) {
    marketPulse.textContent = `Lobby scan: ${openCount} active market sessions`;
  } else if (openCount === 1) {
    marketPulse.textContent = "Lobby scan: 1 active market session";
  } else {
    marketPulse.textContent = "Lobby scan: waiting for next opening bell";
  }
}

function renderClocks() {
  const now = new Date();

  clockGrid.innerHTML = clocks
    .map((clock) => {
      const time = formatClock(clock.timezone, {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(now);

      const date = formatClock(clock.timezone, {
        month: "short",
        day: "numeric",
        weekday: "short"
      }).format(now);

      return `
        <article class="clock-card">
          <div>
            <strong>${clock.name}</strong>
            <span class="clock-label">${clock.timezone}</span>
          </div>
          <div>
            <strong>${time}</strong>
            <span class="clock-status">${date}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSignalStream() {
  const openSessions = marketSessions
    .filter((session) => getSessionState(session.timezone, session.hours).isOpen)
    .map((session) => session.name);

  const dynamicNote = openSessions.length
    ? `Live sessions now: ${openSessions.join(" / ")}`
    : "Main cash markets are closed right now, but the lobby stays live for the board feed.";

  signalStream.innerHTML = [...signalMessages, dynamicNote]
    .map((message) => `<li>${message}</li>`)
    .join("");
}

function renderDockRing() {
  dockRing.innerHTML = dockPads
    .map((label, index) => {
      const angle = `${(360 / dockPads.length) * index}deg`;
      const radius = index % 2 === 0 ? "178px" : "204px";
      const delay = `${(index % 4) * 0.4}s`;

      return `
        <div class="dock-node" style="--angle:${angle}; --radius:${radius}; --delay:${delay};">
          <div class="dock-core"></div>
          <div class="dock-label">${label}</div>
        </div>
      `;
    })
    .join("");

  dockStatus.textContent = `${dockPads.length} dock pads ready`;
}

function updateConnectivity() {
  const online = navigator.onLine;
  document.body.classList.toggle("is-offline", !online);
  onlineText.textContent = online ? "Feed online" : "Offline mode";
  lastSync.textContent = online
    ? `Last sync ${formatClock("Asia/Tokyo", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date())} JST`
    : "Internet connection required for live market feeds";
}

function applyScene(scene) {
  document.body.dataset.scene = scene;
  sceneName.textContent = sceneNames[scene] || sceneNames.aurora;

  try {
    localStorage.setItem("market-lobby-scene", scene);
  } catch (error) {
    console.error(error);
  }

  document.querySelectorAll("[data-scene-option]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sceneOption === scene);
  });
}

function fallbackShare() {
  try {
    window.prompt("Share this URL", window.location.href);
  } catch (error) {
    console.error(error);
  }
}

function wireParallax() {
  sceneShell.addEventListener("pointermove", (event) => {
    const rect = sceneShell.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    sceneShell.style.setProperty("--tilt-x", `${px * 5}deg`);
    sceneShell.style.setProperty("--tilt-y", `${py * -4}deg`);
    sceneShell.style.setProperty("--board-shift", `${py * -8}px`);
  });

  sceneShell.addEventListener("pointerleave", () => {
    sceneShell.style.setProperty("--tilt-x", "0deg");
    sceneShell.style.setProperty("--tilt-y", "0deg");
    sceneShell.style.setProperty("--board-shift", "0px");
  });
}

function wireControls() {
  document.getElementById("shareRoom").addEventListener("click", async () => {
    const shareData = {
      title: document.title,
      text: "Open the AI Metaverse Market Lobby",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        window.alert("The URL was copied to the clipboard.");
      } else {
        fallbackShare();
      }
    } catch (error) {
      console.error(error);
      fallbackShare();
    }
  });

  document.getElementById("toggleFullscreen").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(error);
    }
  });

  document.querySelectorAll("[data-scene-option]").forEach((button) => {
    button.addEventListener("click", () => {
      apply(button.dataset.sceneOption);
    });
  });

  window.addEventListener("online", updateConnectivity);
  window.addEventListener("offline", updateConnectivity);
}

function apply(scene) {
  applyScene(scene);
}

function init() {
  let savedScene = null;

  try {
    savedScene = localStorage.getItem("market-lobby-scene");
  } catch (error) {
    console.error(error);
  }

  applyScene(savedScene || "aurora");
  renderSessions();
  renderClocks();
  renderSignalStream();
  renderDockRing();
  updateConnectivity();
  wireControls();
  wireParallax();

  setInterval(() => {
    renderSessions();
    renderClocks();
    renderSignalStream();
    updateConnectivity();
  }, 1000);
}

init();
