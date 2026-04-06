import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js";
import { CSS3DObject, CSS3DRenderer } from "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/renderers/CSS3DRenderer.js";

const stage = document.getElementById("stage");
const boardElement = document.getElementById("board3d");
const sessionGrid = document.getElementById("sessionGrid");
const clockGrid = document.getElementById("clockGrid");
const signalStream = document.getElementById("signalStream");
const onlineText = document.getElementById("onlineText");
const lastSync = document.getElementById("lastSync");
const liveStatus = document.getElementById("liveStatus");
const boardPulse = document.getElementById("boardPulse");

const marketSessions = [
  { name: "Tokyo", timezone: "Asia/Tokyo", hours: [9, 15], label: "JP cash market" },
  { name: "London", timezone: "Europe/London", hours: [8, 16.5], label: "EU market session" },
  { name: "Frankfurt", timezone: "Europe/Berlin", hours: [9, 17.5], label: "EU derivatives" },
  { name: "New York", timezone: "America/New_York", hours: [9.5, 16], label: "US cash market" }
];

const clocks = [
  { name: "Tokyo", timezone: "Asia/Tokyo" },
  { name: "Singapore", timezone: "Asia/Singapore" },
  { name: "London", timezone: "Europe/London" },
  { name: "New York", timezone: "America/New_York" }
];

const signalMessages = [
  "A full 3D plaza now surrounds the board instead of a flat panel layout.",
  "You can look around the room and walk through the plaza space.",
  "Visible avatars already stand around the central information monolith.",
  "The board remains static-hosting friendly for GitHub Pages deployments.",
  "Live market widgets still update online inside the in-world screen."
];

const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

const animatedAvatars = [];
const animatedRings = [];
const animatedLights = [];
const tempVectorA = new THREE.Vector3();
const tempVectorB = new THREE.Vector3();
const tempVectorC = new THREE.Vector3();
const clock = new THREE.Clock();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x040812, 0.014);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
const cameraRig = new THREE.Group();
const pitchRig = new THREE.Group();
camera.position.set(0, 0, 0);
pitchRig.add(camera);
cameraRig.add(pitchRig);
scene.add(cameraRig);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.domElement.style.position = "absolute";
renderer.domElement.style.inset = "0";
stage.append(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = "absolute";
cssRenderer.domElement.style.inset = "0";
cssRenderer.domElement.style.pointerEvents = "none";
stage.append(cssRenderer.domElement);

let isDragging = false;
let dragPointerId = null;
let lastPointerX = 0;
let lastPointerY = 0;

function formatClock(timezone, options) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    ...options
  });
}

function getSessionState(timezone, hours) {
  const parts = formatClock(timezone, {
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(new Date());

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = lookup.weekday || "";
  const hour = Number(lookup.hour || 0);
  const minute = Number(lookup.minute || 0);
  const timeValue = hour + minute / 60;
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";

  return {
    isOpen: isWeekday && timeValue >= hours[0] && timeValue <= hours[1],
    dayLabel: weekday,
    timeLabel: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  };
}

function renderSessions() {
  sessionGrid.innerHTML = marketSessions
    .map((session) => {
      const state = getSessionState(session.timezone, session.hours);

      return `
        <article class="data-card">
          <div>
            <strong>${session.name}</strong>
            <span class="data-label">${session.label}</span>
          </div>
          <div>
            <strong>${state.isOpen ? "OPEN" : "CLOSED"}</strong>
            <span class="data-meta">${state.dayLabel} ${state.timeLabel}</span>
          </div>
        </article>
      `;
    })
    .join("");

  const openCount = marketSessions.filter((session) => getSessionState(session.timezone, session.hours).isOpen).length;

  if (openCount > 1) {
    boardPulse.textContent = `Lobby focus: ${openCount} market sessions open`;
  } else if (openCount === 1) {
    boardPulse.textContent = "Lobby focus: 1 market session open";
  } else {
    boardPulse.textContent = "Lobby focus: after-hours global watch";
  }
}

function renderClocks() {
  const now = new Date();

  clockGrid.innerHTML = clocks
    .map((entry) => {
      const time = formatClock(entry.timezone, {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(now);

      const date = formatClock(entry.timezone, {
        month: "short",
        day: "numeric",
        weekday: "short"
      }).format(now);

      return `
        <article class="data-card">
          <div>
            <strong>${entry.name}</strong>
            <span class="data-label">${entry.timezone}</span>
          </div>
          <div>
            <strong>${time}</strong>
            <span class="data-meta">${date}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSignals() {
  const openSessions = marketSessions
    .filter((session) => getSessionState(session.timezone, session.hours).isOpen)
    .map((session) => session.name);

  const dynamicMessage = openSessions.length
    ? `Open right now: ${openSessions.join(" / ")}`
    : "No major cash session is open right now, but the plaza board stays available.";

  signalStream.innerHTML = [...signalMessages, dynamicMessage]
    .map((message) => `<li>${message}</li>`)
    .join("");
}

function updateConnectivity() {
  const online = navigator.onLine;
  document.body.classList.toggle("is-offline", !online);
  liveStatus.dataset.online = String(online);
  onlineText.textContent = online ? "Feed online" : "Offline mode";
  lastSync.textContent = online
    ? `Last sync ${formatClock("Asia/Tokyo", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date())} JST`
    : "Internet connection required for live market widgets";
}

function createMaterial(color, emissive = color, emissiveIntensity = 0.16) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness: 0.42,
    metalness: 0.75
  });
}

function addCircle(radius, y, color, opacity) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 80),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity
    })
  );

  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  scene.add(mesh);
  return mesh;
}

function createStars() {
  const positions = [];

  for (let index = 0; index < 1800; index += 1) {
    const radius = THREE.MathUtils.randFloat(120, 240);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = THREE.MathUtils.randFloat(0.14, Math.PI * 0.82);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi) + 25;
    const z = radius * Math.sin(phi) * Math.sin(theta);
    positions.push(x, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xe6f8ff,
      size: 0.55,
      transparent: true,
      opacity: 0.82
    })
  );

  scene.add(points);
}

function createPlaza() {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(72, 76, 2.6, 80),
    new THREE.MeshStandardMaterial({
      color: 0x0a1423,
      emissive: 0x07101f,
      emissiveIntensity: 0.38,
      roughness: 0.84,
      metalness: 0.38
    })
  );
  base.receiveShadow = true;
  base.position.y = -1.3;
  scene.add(base);

  const innerDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 28, 1.2, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0d1930,
      emissive: 0x0a1a33,
      emissiveIntensity: 0.42,
      roughness: 0.76,
      metalness: 0.44
    })
  );
  innerDisc.receiveShadow = true;
  innerDisc.position.y = -0.1;
  scene.add(innerDisc);

  addCircle(69, 0.03, 0x0b213c, 0.8);
  addCircle(52, 0.04, 0x0d1730, 0.9);
  addCircle(28, 0.05, 0x112243, 0.92);
  addCircle(24.5, 0.08, 0x49ffea, 0.06);
  addCircle(18.2, 0.09, 0x49ffea, 0.04);

  const ringGeometry = new THREE.RingGeometry(32, 32.8, 96);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x49ffea,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide
  });

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  scene.add(ring);
  animatedRings.push({ mesh: ring, axis: "z", speed: 0.08 });

  const ringTwo = ring.clone();
  ringTwo.geometry = new THREE.RingGeometry(46, 46.5, 96);
  ringTwo.material = ringMaterial.clone();
  ringTwo.material.opacity = 0.16;
  ringTwo.position.y = 0.11;
  scene.add(ringTwo);
  animatedRings.push({ mesh: ringTwo, axis: "z", speed: -0.05 });

  const walkwayMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f2547,
    emissive: 0x17315d,
    emissiveIntensity: 0.52,
    roughness: 0.55,
    metalness: 0.52
  });

  const walkwaySpecs = [
    [10, 0.28, 48, 0, 0, -36],
    [10, 0.28, 48, 0, 0, 36],
    [48, 0.28, 10, -36, 0, 0],
    [48, 0.28, 10, 36, 0, 0]
  ];

  walkwaySpecs.forEach(([width, height, depth, x, y, z]) => {
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), walkwayMaterial);
    walkway.position.set(x, y, z);
    walkway.receiveShadow = true;
    scene.add(walkway);
  });
}

function createArch(angle, radius, height, color) {
  const group = new THREE.Group();
  const columnMaterial = createMaterial(0x11325f, color, 0.46);
  const lightMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.42
  });

  const leftColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, height, 18), columnMaterial);
  const rightColumn = leftColumn.clone();
  leftColumn.position.set(-7.2, height / 2, 0);
  rightColumn.position.set(7.2, height / 2, 0);
  leftColumn.castShadow = true;
  rightColumn.castShadow = true;
  group.add(leftColumn, rightColumn);

  const archPoints = [];
  for (let step = 0; step <= 24; step += 1) {
    const t = step / 24;
    const theta = Math.PI - t * Math.PI;
    archPoints.push(new THREE.Vector3(Math.cos(theta) * 7.2, height + Math.sin(theta) * 7.2, 0));
  }

  const archCurve = new THREE.CatmullRomCurve3(archPoints);
  const archTube = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 42, 0.56, 14, false), columnMaterial);
  archTube.castShadow = true;
  group.add(archTube);

  const lightArc = new THREE.Mesh(
    new THREE.TubeGeometry(archCurve, 42, 0.14, 12, false),
    lightMaterial
  );
  group.add(lightArc);
  animatedLights.push({ mesh: lightArc, min: 0.2, max: 0.58, speed: 1.7, offset: angle * 2 });

  const baseRing = new THREE.Mesh(
    new THREE.RingGeometry(6.8, 8.4, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide
    })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.08;
  group.add(baseRing);

  group.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
  group.lookAt(0, 8, 0);
  scene.add(group);
}

function createPerimeter() {
  const colors = [0x49ffea, 0x7bb1ff, 0xff7ca7, 0xffc15e];

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const radius = 84;
    const height = THREE.MathUtils.randFloat(10, 24);
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, height, 3.2),
      createMaterial(0x0d1d36, colors[index % colors.length], 0.42)
    );

    pillar.position.set(Math.cos(angle) * radius, height / 2 - 1.2, Math.sin(angle) * radius);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.5, 18),
      new THREE.MeshBasicMaterial({
        color: colors[index % colors.length],
        transparent: true,
        opacity: 0.55
      })
    );
    crown.position.copy(pillar.position);
    crown.position.y += height / 2 + 0.5;
    scene.add(crown);
    animatedLights.push({ mesh: crown, min: 0.22, max: 0.75, speed: 1.15, offset: index * 0.35 });
  }
}

function createBoardFrame() {
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(9.4, 11.2, 3.8, 48),
    createMaterial(0x0f203d, 0x12315e, 0.52)
  );
  pedestal.position.y = 1.6;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  const supportMaterial = createMaterial(0x14345e, 0x49ffea, 0.38);
  const supports = [
    [-8.8, 11.2, -2.2],
    [8.8, 11.2, -2.2],
    [-8.8, 11.2, 2.2],
    [8.8, 11.2, 2.2]
  ];

  supports.forEach(([x, y, z]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1, 19, 1), supportMaterial);
    beam.position.set(x, y, z);
    beam.castShadow = true;
    scene.add(beam);
  });

  const frameSpecs = [
    [19.5, 0.9, 1.1, 0, 22, -0.6],
    [19.5, 0.9, 1.1, 0, 8.5, -0.6],
    [0.9, 14.5, 1.1, -9.6, 15.2, -0.6],
    [0.9, 14.5, 1.1, 9.6, 15.2, -0.6]
  ];

  frameSpecs.forEach(([w, h, d, x, y, z]) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), supportMaterial);
    piece.position.set(x, y, z);
    piece.castShadow = true;
    scene.add(piece);
  });

  const holoSphere = new THREE.Mesh(
    new THREE.SphereGeometry(3.8, 22, 22),
    new THREE.MeshBasicMaterial({
      color: 0x49ffea,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    })
  );
  holoSphere.position.set(0, 28, 0);
  scene.add(holoSphere);
  animatedRings.push({ mesh: holoSphere, axis: "y", speed: 0.45 });

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(5.5, 0.15, 12, 90),
    new THREE.MeshBasicMaterial({
      color: 0xffc15e,
      transparent: true,
      opacity: 0.42
    })
  );
  halo.position.set(0, 28, 0);
  halo.rotation.x = Math.PI / 2;
  scene.add(halo);
  animatedRings.push({ mesh: halo, axis: "z", speed: -0.52 });
}

function createAvatar(color, angle, radius, index) {
  const avatar = new THREE.Group();
  const bodyMaterial = createMaterial(0x172849, color, 0.62);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xdff8ff,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.16,
    metalness: 0.84
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.7, 0.24, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28
    })
  );
  base.position.y = 0.12;
  avatar.add(base);

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.8, 18), bodyMaterial);
  legs.position.y = 1.55;
  legs.castShadow = true;
  avatar.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 1.45), bodyMaterial);
  torso.position.y = 4.1;
  torso.castShadow = true;
  avatar.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.08, 18, 18), glassMaterial);
  head.position.y = 6.25;
  head.castShadow = true;
  avatar.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.5, 1.12), glassMaterial);
  visor.position.set(0, 6.15, 0.56);
  avatar.add(visor);

  const armGeometry = new THREE.CylinderGeometry(0.24, 0.24, 2.2, 12);
  const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
  const rightArm = leftArm.clone();
  leftArm.position.set(-1.35, 4.2, 0);
  rightArm.position.set(1.35, 4.2, 0);
  leftArm.rotation.z = 0.2;
  rightArm.rotation.z = -0.2;
  avatar.add(leftArm, rightArm);

  avatar.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  avatar.lookAt(0, 5, 0);
  scene.add(avatar);

  animatedAvatars.push({
    mesh: avatar,
    baseY: avatar.position.y,
    swingSeed: index * 0.8,
    head,
    base
  });
}

function createAvatars() {
  const colors = [0x49ffea, 0x7bb1ff, 0xff7ca7, 0xffc15e];
  const total = 10;

  for (let index = 0; index < total; index += 1) {
    const angle = (index / total) * Math.PI * 2 + 0.15;
    const radius = index % 2 === 0 ? 18.5 : 23;
    createAvatar(colors[index % colors.length], angle, radius, index);
  }
}

function createWorld() {
  scene.background = new THREE.Color(0x040812);

  const hemi = new THREE.HemisphereLight(0xb4e8ff, 0x07101f, 1.7);
  scene.add(hemi);

  const directional = new THREE.DirectionalLight(0xdff7ff, 1.25);
  directional.position.set(18, 30, 14);
  directional.castShadow = true;
  directional.shadow.mapSize.set(2048, 2048);
  directional.shadow.camera.left = -80;
  directional.shadow.camera.right = 80;
  directional.shadow.camera.top = 80;
  directional.shadow.camera.bottom = -80;
  scene.add(directional);

  const coreLight = new THREE.PointLight(0x49ffea, 20, 70, 2);
  coreLight.position.set(0, 18, 0);
  scene.add(coreLight);

  createStars();
  createPlaza();
  createPerimeter();
  createBoardFrame();
  createAvatars();
  createArch(0, 42, 14, 0x49ffea);
  createArch(Math.PI / 2, 42, 14, 0xffc15e);
  createArch(Math.PI, 42, 14, 0x7bb1ff);
  createArch((Math.PI * 3) / 2, 42, 14, 0xff7ca7);
}

function mountBoard() {
  const boardObject = new CSS3DObject(boardElement);
  boardObject.position.set(0, 15.8, 0);
  boardObject.scale.setScalar(0.0113);
  scene.add(boardObject);
  document.body.classList.add("scene-ready");
}

function resetView() {
  cameraRig.position.set(0, 5.7, 34);
  cameraRig.rotation.set(0, 0, 0);
  pitchRig.rotation.x = -0.12;
}

function installKeyboardControls() {
  const keyMap = {
    KeyW: "forward",
    ArrowUp: "forward",
    KeyS: "backward",
    ArrowDown: "backward",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right"
  };

  window.addEventListener("keydown", (event) => {
    const action = keyMap[event.code];
    if (!action) {
      return;
    }

    moveState[action] = true;
  });

  window.addEventListener("keyup", (event) => {
    const action = keyMap[event.code];
    if (!action) {
      return;
    }

    moveState[action] = false;
  });
}

function installPointerLook() {
  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".hud-panel, .mobile-controls, button")) {
      return;
    }

    isDragging = true;
    dragPointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!isDragging || event.pointerId !== dragPointerId) {
      return;
    }

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    cameraRig.rotation.y -= deltaX * 0.0032;
    pitchRig.rotation.x -= deltaY * 0.0026;
    pitchRig.rotation.x = THREE.MathUtils.clamp(pitchRig.rotation.x, -0.82, 0.5);
  });

  const stopDrag = (event) => {
    if (dragPointerId !== null && event.pointerId === dragPointerId) {
      stage.releasePointerCapture(dragPointerId);
    }

    isDragging = false;
    dragPointerId = null;
  };

  stage.addEventListener("pointerup", stopDrag);
  stage.addEventListener("pointercancel", stopDrag);
}

function installTouchButtons() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;

    const activate = (event) => {
      event.preventDefault();
      moveState[action] = true;
    };

    const deactivate = (event) => {
      event.preventDefault();
      moveState[action] = false;
    };

    button.addEventListener("pointerdown", activate);
    button.addEventListener("pointerup", deactivate);
    button.addEventListener("pointercancel", deactivate);
    button.addEventListener("pointerleave", deactivate);
  });
}

function installUiButtons() {
  document.getElementById("resetView").addEventListener("click", resetView);

  document.getElementById("shareRoom").addEventListener("click", async () => {
    const payload = {
      title: document.title,
      text: "Open the AI Metaverse Market Plaza",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        window.alert("The page URL was copied to the clipboard.");
      } else {
        window.prompt("Share this URL", window.location.href);
      }
    } catch (error) {
      console.error(error);
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

  window.addEventListener("online", updateConnectivity);
  window.addEventListener("offline", updateConnectivity);
}

function keepRigOnPlaza() {
  const radial = new THREE.Vector2(cameraRig.position.x, cameraRig.position.z);
  const distance = radial.length();
  const minRadius = 11.2;
  const maxRadius = 64;

  if (distance < minRadius) {
    radial.setLength(minRadius);
    cameraRig.position.x = radial.x;
    cameraRig.position.z = radial.y;
  }

  if (distance > maxRadius) {
    radial.setLength(maxRadius);
    cameraRig.position.x = radial.x;
    cameraRig.position.z = radial.y;
  }
}

function updateMovement(delta) {
  let lateral = 0;
  let forward = 0;

  if (moveState.forward) {
    forward += 1;
  }
  if (moveState.backward) {
    forward -= 1;
  }
  if (moveState.left) {
    lateral -= 1;
  }
  if (moveState.right) {
    lateral += 1;
  }

  if (lateral === 0 && forward === 0) {
    return;
  }

  const speed = 13.5;
  tempVectorA.set(Math.sin(cameraRig.rotation.y), 0, -Math.cos(cameraRig.rotation.y));
  tempVectorB.set(Math.cos(cameraRig.rotation.y), 0, Math.sin(cameraRig.rotation.y));
  tempVectorC.set(0, 0, 0);
  tempVectorC.addScaledVector(tempVectorA, forward);
  tempVectorC.addScaledVector(tempVectorB, lateral);

  if (tempVectorC.lengthSq() === 0) {
    return;
  }

  tempVectorC.normalize().multiplyScalar(speed * delta);
  cameraRig.position.add(tempVectorC);
  keepRigOnPlaza();
}

function updateAnimations(elapsed) {
  animatedAvatars.forEach((entry) => {
    const hover = Math.sin(elapsed * 1.6 + entry.swingSeed) * 0.18;
    const sway = Math.sin(elapsed * 0.9 + entry.swingSeed) * 0.08;
    entry.mesh.position.y = entry.baseY + hover;
    entry.mesh.rotation.y += Math.sin(elapsed * 0.2 + entry.swingSeed) * 0.00045;
    entry.head.position.y = 6.25 + sway * 0.3;
    entry.base.scale.setScalar(1 + Math.sin(elapsed * 2 + entry.swingSeed) * 0.06);
  });

  animatedRings.forEach((entry) => {
    entry.mesh.rotation[entry.axis] += entry.speed * 0.01;
  });

  animatedLights.forEach((entry) => {
    const pulse = (Math.sin(elapsed * entry.speed + entry.offset) + 1) / 2;
    entry.mesh.material.opacity = THREE.MathUtils.lerp(entry.min, entry.max, pulse);
  });
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  updateMovement(delta);
  updateAnimations(elapsed);
  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
}

function init() {
  createWorld();
  mountBoard();
  resetView();
  renderSessions();
  renderClocks();
  renderSignals();
  updateConnectivity();
  installKeyboardControls();
  installPointerLook();
  installTouchButtons();
  installUiButtons();
  window.addEventListener("resize", resize);

  setInterval(() => {
    renderSessions();
    renderClocks();
    renderSignals();
    updateConnectivity();
  }, 1000);

  animate();
}

init();
