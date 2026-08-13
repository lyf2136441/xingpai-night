import * as THREE from './three.module.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const root = $('#game');
const labelLayer = $('#labels');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111528);
scene.fog = new THREE.Fog(0x2a3148, 72, 390);
const isMobileDevice = matchMedia('(max-width: 700px)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
document.body.classList.toggle('mobile-device', isMobileDevice);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .1, 520);
camera.position.set(0, 10, 16);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobileDevice ? 1.28 : 1.85));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.58;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const skyLight = new THREE.HemisphereLight(0xb6a8d2, 0x211a32, 1.72);
scene.add(skyLight);
const ambientLight = new THREE.AmbientLight(0x8c73ad, .42);
scene.add(ambientLight);
const moon = new THREE.DirectionalLight(0xd3c9ee, 2.55);
moon.position.set(-22, 38, 18);
moon.castShadow = true;
moon.shadow.mapSize.set(isMobileDevice ? 1024 : 2048, isMobileDevice ? 1024 : 2048);
moon.shadow.camera.left = -62;
moon.shadow.camera.right = 62;
moon.shadow.camera.top = 62;
moon.shadow.camera.bottom = -62;
scene.add(moon);
let bloodLight = null;
let bloodMoonMesh = null;
let moonHaloMesh = null;
const warmLight = new THREE.PointLight(0xb95877, 34, 36, 2);
warmLight.position.set(-8, 7, -2);
scene.add(warmLight);
const cyanLight = new THREE.PointLight(0x7f6bc4, 29, 40, 2);
cyanLight.position.set(12, 6, 8);
scene.add(cyanLight);
const purpleLight = new THREE.PointLight(0xb85b82, 31, 36, 2);
purpleLight.position.set(-30, 6, 28);
scene.add(purpleLight);

const clock = new THREE.Clock();
const keys = {};
const effects = [];
const pulseLights = [];
const movingDrones = [];
const worldObstacles = [];
const cameraOccluders = [];
const floatingProps = [];
const zoneBeams = [];
const localCardCounts = { rock: 8, paper: 8, scissors: 8 };
const roundCardCounts = { rock: 8, paper: 8, scissors: 8 };
const STARTING_HAND = { rock: 2, paper: 2, scissors: 2 };
const npcs = [];
const remotePlayers = new Map();
const tables = [];
const parkStations = [];
const outdoorRides = [];
let outdoorEntry = null;
const verticalFacilities = [];
let activeRideExperience = null;
const skylineLandmarks = [];
const visitedLandmarks = new Set();
const zones = [];
const treasurePickups = new Map();
const mapLimit = 140;
const worldSize = mapLimit * 2;
const worldBuildings = [];
const prison = { center: new THREE.Vector3(-50, 0, -30), halfX: 5.8, halfZ: 5.4, group: null };
const player = {
  name: '玩家', stars: 3, coins: 120, luck: 0, skin: false, speed: 6.2,
  alive: true, leftSafely: false, card: null, hand: { ...STARTING_HAND }, treasures: [{ id: 'starter-local', name: '黑曜筹码', value: 120 }], inPrison: false, eliminated: false, debt: 0, loanDueAt: 0,
  jailPass: 0, influence: 0, disguise: 0, group: null, label: null, starMeshes: []
};
let activeOpponent = null;
let activeTable = null;
let activeRemoteId = null;
let challengeOpen = false;
let duelActive = false;
let duelReady = false;
let duelEndsAt = 0;
let socialOnly = false;
let refereeTimer = null;
let pendingTable = null;
let socket = null;
let onlineId = null;
let onlineRoom = null;
let onlineName = '玩家';
let remoteStateTimer = 0;
let toastTimer = null;
let zoneTimer = null;
let lastZone = '';
let botActivityTimer = 11;
let prisonToastTimer = 0;
let miniMapTimer = 0;
let missionTimer = 0;
let eventTimer = 0;
let cameraShake = 0;
let activeEvent = null;
const savedRoundState = (() => {
  try { return JSON.parse(localStorage.getItem('star-night-round') || 'null'); } catch { return null; }
})();
const savedRoundEnd = Number(savedRoundState?.endsAt);
const hasActiveSavedRound = Number.isFinite(savedRoundEnd) && savedRoundEnd > Date.now();
let roundStartedAt = hasActiveSavedRound ? Number(savedRoundState.startedAt) || Date.now() : Date.now();
let roundEndsAt = hasActiveSavedRound ? savedRoundEnd : (roundStartedAt + 30 * 60 * 1000);
let roundExpired = false;
let roundHudTimer = 0;
let cameraMode = 0;
let cameraYaw = 0;
let cameraPitch = .58;
let cameraDistance = 14.6;
let cameraModeBeforeFirstPerson = 0;
let cameraDragging = false;
let cameraPointerX = 0;
let cameraPointerY = 0;
let joystickInput = { x: 0, z: 0 };
let sprintActive = false;
let jumpRequested = false;
let jumpVelocity = 0;
let playerGrounded = true;
let playerFloorY = 0;
let playerElevatorFacility = null;
const SPRINT_MULTIPLIER = 1.78;
let indoorVenueLabel = '';
let indoorVenue = null;
let ambientPulse = 0;
let audioContext = null;
let audioMaster = null;
let musicBus = null;
let audioAmbientStarted = false;
let audioEnabled = true;
let musicEnabled = true;
let dayNightMode = 'night';
let dayNightApplied = '';
let generatedMusicTimer = null;
let generatedMusicStep = 0;
let localMusicAudio = null;
let localMusicUrl = null;
let voicePeer = null;
let voiceStream = null;
let voiceTargetId = null;
let meetingVoiceRoomId = null;
let meetingVoiceStream = null;
const meetingVoicePeers = new Map();
let pendingTradeOffer = null;
let pendingTradeTargetId = null;
let pendingConsent = null;
let pendingMatchTimer = null;
let treasureToastTimer = 0;
let localSaveTimer = 4;
const stats = loadStats();
const miniMapCanvas = $('#miniMap');
const miniMapContext = miniMapCanvas.getContext('2d');
const bigMapCanvas = $('#bigMap');
const bigMapContext = bigMapCanvas?.getContext('2d');
let bigMapOpen = false;
let towerClockFace = null;
let towerMinuteHand = null;
let towerSecondHand = null;
let towerCardLabel = null;
let towerClockLabel = null;
let towerClockTick = -1;
let contentDatabase = { events: [], treasures: [], treasureSpawns: [], npcs: [], cases: [], discussions: [], parkGames: [] };
let activeCase = null;
let activeDiscussion = null;
let activeParkGame = null;
let parkGameState = null;
let activeParkStation = null;
const parkGameCanvas = $('#parkGameCanvas');
const parkGameCanvasContext = parkGameCanvas?.getContext('2d');
let eventDefinitions = [
  { title: '夜场事件 · 裁判警戒', text: '裁判塔附近的灯光进入高亮状态，胜利奖励额外增加 10 金币。', zone: '裁判塔', bonus: 10 },
  { title: '夜场事件 · 黑市流动', text: '黑市的交易窗口开启，结盟成功率临时提高。', zone: '黑市', bonus: 0 },
  { title: '夜场事件 · 银行放款', text: '银行降低了风险提示，逾期倒计时仍然有效。', zone: '银行', bonus: 0 },
  { title: '夜场事件 · 监狱警报', text: '监狱进入封锁状态，普通角色无法靠近围栏。', zone: '无限监狱', bonus: 0 }
];

const contentHistory = (() => {
  try { return JSON.parse(localStorage.getItem('star-night-content-history') || '{}'); } catch { return {}; }
})();

function saveContentHistory() {
  localStorage.setItem('star-night-content-history', JSON.stringify(contentHistory));
}

function randomContentIndex(length) {
  if (!length) return 0;
  const values = new Uint32Array(1);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 0xffffffff);
  return values[0] % length;
}

function nextContent(key, list) {
  if (!Array.isArray(list) || !list.length) return null;
  const history = Array.isArray(contentHistory[key]) ? contentHistory[key] : [];
  let available = list.filter((item) => item?.id && !history.includes(item.id));
  if (!available.length) {
    history.splice(0, history.length);
    available = list.slice();
    pushActivity(`内容轮换：${key} 已完成一轮，数据库重新洗牌`);
  }
  const item = available[randomContentIndex(available.length)];
  if (item?.id) {
    history.unshift(item.id);
    contentHistory[key] = history;
    saveContentHistory();
  }
  return item;
}

async function loadContentDatabase() {
  try {
    const response = await fetch(`./content-db.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`content-db ${response.status}`);
    const loaded = await response.json();
    contentDatabase = { ...contentDatabase, ...loaded };
    if (Array.isArray(contentDatabase.events) && contentDatabase.events.length) eventDefinitions = contentDatabase.events;
    pushActivity(`内容库已加载：${contentDatabase.cases?.length || 0} 案件 · ${contentDatabase.events?.length || 0} 事件 · ${contentDatabase.parkGames?.length || 0} 小游戏`);
  } catch (error) {
    console.warn('内容库加载失败，使用内置基础内容', error);
    pushActivity('内容库连接失败，当前使用本地基础内容');
  }
}

function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem('star-night-stats') || '{}');
    return { duels: 0, wins: 0, alliances: 0, rescues: 0, casesSolved: 0, caseErrors: 0, parkGames: 0, zones: [], ...raw, zones: Array.isArray(raw.zones) ? raw.zones : [] };
  } catch { return { duels: 0, wins: 0, alliances: 0, rescues: 0, casesSolved: 0, caseErrors: 0, parkGames: 0, zones: [] }; }
}

function saveStats() { localStorage.setItem('star-night-stats', JSON.stringify(stats)); }
function clampStars(value) { return Math.max(0, Math.min(6, Math.round(value))); }
function safeColor(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function material(color, roughness = .62, metalness = .12, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? .35 : 0 });
}

function createCharacter(color, accent, scale = 1) {
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.48, .88, 6, 12), material(color, .5, .2));
  body.position.y = 1.04;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 14), material(0xf2f5ff, .38, .08));
  head.position.y = 2.1;
  head.castShadow = true;
  group.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(.27, 16, 12, 0, Math.PI * 2, .2, Math.PI * .56), material(0x06101e, .16, .55));
  visor.scale.set(1.16, .72, .4);
  visor.position.set(0, 2.1, -.36);
  group.add(visor);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: accent });
  [-.105, .105].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 8), eyeMaterial);
    eye.position.set(x, 2.1, -.5);
    group.add(eye);
  });
  const armGeometry = new THREE.CapsuleGeometry(.12, .56, 4, 8);
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(armGeometry, material(color, .52, .16));
    arm.position.set(side * .55, 1.1, 0);
    arm.rotation.z = side * -.18;
    arm.castShadow = true;
    group.add(arm);
  });
  const legGeometry = new THREE.CapsuleGeometry(.14, .52, 4, 8);
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(legGeometry, material(0x17243a, .7, .24));
    leg.position.set(side * .2, .42, 0);
    leg.castShadow = true;
    group.add(leg);
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.66, .025, 6, 32), new THREE.MeshBasicMaterial({ color: accent }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .05;
  group.add(ring);
  return group;
}

function createReferee(scale = 1) {
  const group = createCharacter(0x303b55, 0xffc865, scale);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(.52, .64, .16, 16), material(0x111827, .45, .35));
  hat.position.y = 2.55;
  hat.castShadow = true;
  group.add(hat);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(.14, 16), new THREE.MeshBasicMaterial({ color: 0xffd369 }));
  badge.position.set(0, 1.45, -.48);
  badge.rotation.x = Math.PI;
  group.add(badge);
  const baton = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .82, 8), new THREE.MeshBasicMaterial({ color: 0xffd369 }));
  baton.position.set(.65, 1.05, -.15);
  baton.rotation.z = -.38;
  group.add(baton);
  return group;
}

function makeStar() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? .2 : .09;
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .055, bevelEnabled: true, bevelSize: .01, bevelThickness: .01 }), material(0xffd369, .28, .52, 0x6b4a0b));
  star.rotation.x = -Math.PI / 2;
  return star;
}

function createStars(owner) {
  owner.starMeshes = [];
  for (let i = 0; i < 6; i++) {
    const star = makeStar();
    owner.group.add(star);
    owner.starMeshes.push(star);
  }
  updateStars(owner);
}

function updateStars(owner) {
  owner.starMeshes?.forEach((star, index) => {
    star.visible = owner === player && index < owner.stars;
    star.position.set((index - 2.5) * .38, 2.8, 0);
  });
}

function randomMove() {
  const moves = ['rock', 'paper', 'scissors'];
  const values = new Uint32Array(1);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 0xffffffff);
  return moves[values[0] % moves.length];
}

function handTotal(owner = player) {
  return Object.values(owner.hand || {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
}

function hasHandCard(owner, type) {
  return Boolean(owner?.hand && ['rock', 'paper', 'scissors'].includes(type) && Number(owner.hand[type]) > 0);
}

function ensureHand(owner) {
  if (!owner.hand || typeof owner.hand !== 'object') owner.hand = { ...STARTING_HAND };
  ['rock', 'paper', 'scissors'].forEach((type) => { owner.hand[type] = Math.max(0, Math.floor(Number(owner.hand[type]) || 0)); });
  owner.card = Object.keys(owner.hand).find((type) => owner.hand[type] > 0) || null;
  return owner.hand;
}

function consumeLocalCard(owner, type) {
  ensureHand(owner);
  if (!hasHandCard(owner, type)) return false;
  owner.hand[type] -= 1;
  owner.card = Object.keys(owner.hand).find((entry) => owner.hand[entry] > 0) || null;
  return true;
}

function drawLocalCard(owner = player) {
  let available = Object.entries(localCardCounts).filter(([, count]) => count > 0).map(([type]) => type);
  if (!available.length) {
    localCardCounts.rock = 8;
    localCardCounts.paper = 8;
    localCardCounts.scissors = 8;
    available = Object.keys(localCardCounts);
    pushActivity('裁判：牌库耗尽，已重新洗牌补给');
  }
  const card = available[Math.floor(Math.random() * available.length)];
  localCardCounts[card] -= 1;
  if (owner?.hand) owner.card = card;
  return card;
}

function cardIcon(card) { return { rock: '✊', paper: '✋', scissors: '✌️' }[card] || '—'; }
function cardName(card) { return { rock: '石头', paper: '布', scissors: '剪刀' }[card] || '暂无手牌'; }

function treasureValue(owner = player) {
  return (owner.treasures || []).reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
}

function syncSelfEconomy(data) {
  if (!data) return;
  if (Number.isFinite(data.stars)) player.stars = Math.max(0, Math.min(6, data.stars));
  if (Number.isFinite(data.coins)) player.coins = Math.max(0, data.coins);
  if (Object.prototype.hasOwnProperty.call(data, 'card')) player.card = data.card;
  if (data.hand && typeof data.hand === 'object') player.hand = { ...data.hand };
  ensureHand(player);
  if (Array.isArray(data.treasures)) player.treasures = data.treasures.map((item) => ({ ...item }));
  if (typeof data.inPrison === 'boolean') player.inPrison = data.inPrison;
  if (typeof data.eliminated === 'boolean') player.eliminated = data.eliminated;
  if (typeof data.alive === 'boolean') player.alive = data.alive;
  if (typeof data.leftSafely === 'boolean') player.leftSafely = data.leftSafely;
  updateStars(player);
  updateHud();
}

function renderTreasureInventory() {
  const list = $('#treasureList');
  if (!list) return;
  const items = player.treasures || [];
  list.innerHTML = items.length
    ? items.map((item) => `<div class="treasureLine"><span>${item.name || '未鉴定宝物'}</span><span class="treasureValue">${Number(item.value) || 0} 金币估值</span></div>`).join('')
    : '<div>身上暂时没有宝物。去场馆边缘寻找隐藏拾取点。</div>';
}

function persistLocalState() {
  try {
    localStorage.setItem('star-night-player-state', JSON.stringify({
      stars: player.stars, coins: player.coins, luck: player.luck, skin: player.skin, speed: player.speed,
      alive: player.alive, leftSafely: player.leftSafely, hand: player.hand, treasures: player.treasures,
      inPrison: player.inPrison, eliminated: player.eliminated, debt: player.debt, loanDueAt: player.loanDueAt,
      jailPass: player.jailPass, influence: player.influence, disguise: player.disguise,
      dayNightMode,
      position: player.group ? { x: player.group.position.x, z: player.group.position.z } : null
    }));
  } catch { /* local storage may be disabled */ }
  try { localStorage.setItem('star-night-round', JSON.stringify({ startedAt: roundStartedAt, endsAt: roundEndsAt })); } catch { /* ignore */ }
}

function restoreLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem('star-night-player-state') || 'null');
    if (!saved) return;
    ['stars', 'coins', 'luck', 'skin', 'speed', 'alive', 'leftSafely', 'inPrison', 'eliminated', 'debt', 'loanDueAt', 'jailPass', 'influence', 'disguise'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(saved, key)) player[key] = saved[key];
    });
    if (saved.hand) player.hand = { ...saved.hand };
    if (['night', 'day', 'cycle'].includes(saved.dayNightMode)) setDayNightMode(saved.dayNightMode, false);
    if (player.loanDueAt > 0 && player.loanDueAt < 1000000000000) player.loanDueAt = Date.now() + Math.max(0, (player.loanDueAt - clock.elapsedTime) * 1000);
    if (Array.isArray(saved.treasures)) player.treasures = saved.treasures;
    ensureHand(player);
    if (saved.position && player.group) player.group.position.set(Number(saved.position.x) || 0, 0, Number(saved.position.z) || 9);
    if (player.inPrison) $('#prisonOverlay')?.classList.add('open');
    if (player.leftSafely) {
      player.group.visible = false;
      player.label.style.display = 'none';
      $('#gameOver h2').textContent = '安全离场';
      $('#gameOver p').textContent = '你已经在上一轮安全离开夜场。点击重新开局可创建新回合。';
      $('#gameOver').classList.add('open');
    }
  } catch { /* ignore corrupt local save */ }
}

function resetLocalRound() {
  if (socket?.readyState === WebSocket.OPEN) {
    sendOnline({ type: 'resetRound' });
    showToast('已向裁判申请重开本房间回合');
    return;
  }
  localStorage.removeItem('star-night-player-state');
  localStorage.removeItem('star-night-round');
  location.reload();
}

function addTreasurePickup(data) {
  if (!data?.id || treasurePickups.has(data.id)) return;
  const group = new THREE.Group();
  group.position.set(Number(data.x) || 0, 0, Number(data.z) || 0);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.42, .58, .18, 12), material(0x293b58, .56, .4));
  pedestal.position.y = .1;
  group.add(pedestal);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.34, 1), new THREE.MeshStandardMaterial({ color: 0xffbd66, emissive: 0x754515, emissiveIntensity: .8, metalness: .52, roughness: .22 }));
  gem.position.y = .68;
  gem.castShadow = true;
  group.add(gem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.58, .025, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd369 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .25;
  group.add(ring);
  scene.add(group);
  const label = addWorldLabel(`宝物 · ${data.name || '未鉴定'}`, group.position.x, group.position.z, 1.55, 'worldLabel', true);
  treasurePickups.set(data.id, { ...data, group, gem, ring, label });
}

function removeTreasurePickup(id) {
  const pickup = treasurePickups.get(id);
  if (!pickup) return;
  scene.remove(pickup.group);
  pickup.label?.remove();
  treasurePickups.delete(id);
}

function seedLocalTreasures() {
  const items = [
    ['local-loot-1', '银色怀表', 150, -43, -12], ['local-loot-2', '旧王徽记', 120, -29, 16],
    ['local-loot-3', '紫晶吊坠', 180, -17, -36], ['local-loot-4', '裁判印章', 220, 11, -40],
    ['local-loot-5', '夜场钥匙', 260, 28, -19], ['local-loot-6', '远古骰子', 320, 43, 8],
    ['local-loot-7', '黑曜筹码', 80, 38, 39], ['local-loot-8', '银色怀表', 150, 14, 35],
    ['local-loot-9', '紫晶吊坠', 180, -8, 42], ['local-loot-10', '裁判印章', 220, -39, 35]
  ];
  items.forEach(([id, name, value, x, z]) => addTreasurePickup({ id, name, value, x, z }));
}

function seedDatabaseTreasures() {
  const library = Array.isArray(contentDatabase.treasures) ? contentDatabase.treasures : [];
  const spawns = Array.isArray(contentDatabase.treasureSpawns) ? contentDatabase.treasureSpawns : [];
  if (!library.length || !spawns.length) return seedLocalTreasures();
  const shuffled = library.slice().sort(() => Math.random() - .5);
  spawns.forEach(([x, z], index) => {
    const item = shuffled[index % shuffled.length];
    const spread = Math.floor(index / shuffled.length);
    addTreasurePickup({
      id: `db-loot-${item.id}-${index}`,
      name: item.name,
      value: Number(item.value) || 0,
      rarity: item.rarity,
      lore: item.lore,
      x: Number(x) + (spread % 2 ? 3.5 : 0),
      z: Number(z) + (spread % 3 ? -2.5 : 0)
    });
  });
  pushActivity(`宝物数据库：本局布置 ${spawns.length} 个隐藏出生点，已随机轮换 ${library.length} 件宝物`);
}

function nearestTreasure() {
  let best = null;
  let distance = Infinity;
  treasurePickups.forEach((pickup) => {
    const d = player.group.position.distanceTo(pickup.group.position);
    if (d < distance) { best = pickup; distance = d; }
  });
  return best ? { pickup: best, distance } : null;
}

function nearestMissionTarget() {
  if (!player.group) return null;
  const targets = [];
  const treasure = nearestTreasure();
  if (treasure) targets.push({ distance: treasure.distance, label: `宝物 · ${treasure.pickup.name || '隐藏宝物'}` });
  const table = nearestTable();
  if (table) targets.push({ distance: table.distance, label: `赌桌 ${table.table.id} · ${table.table.state}` });
  const opponent = nearestOpponent();
  if (opponent) targets.push({ distance: opponent.distance, label: `玩家 · ${opponent.opponent.name}${opponent.opponent.role ? `（${opponent.opponent.role}）` : ''}` });
  zones.forEach((zone) => targets.push({ distance: Math.hypot(player.group.position.x - zone.x, player.group.position.z - zone.z), label: `${zone.name} · ${zone.description}` }));
  return targets.sort((a, b) => a.distance - b.distance)[0] || null;
}

function nearestZone() {
  if (!player.group || !zones.length) return null;
  return zones.map((zone) => ({ zone, distance: Math.hypot(player.group.position.x - (zone.interactionX ?? zone.x), player.group.position.z - (zone.interactionZ ?? zone.z)) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function interactWithZone(zone) {
  if (!zone || player.inPrison) return;
  playSound('zone');
  if (zone.name === '黑市') {
    $('#shopModal').classList.add('open');
    pushActivity('黑市：交易窗口已打开，谨慎使用你的金币和星星');
  } else if (zone.name === '银行') {
    $('#loanModal').classList.add('open');
    updateLoan();
    pushActivity('地下银行：可以借贷，但逾期会触发裁判追捕');
  } else if (zone.name === '裁判塔') {
    $('#eventTitle').textContent = '裁判塔 · 观测台';
    $('#eventText').textContent = `当前已探索 ${stats.zones.length} 个区域；裁判只公开星星，不公开玩家手牌。`;
    showToast('裁判塔已记录你的行踪：继续寻找宝物或进入赌桌');
    pushActivity('裁判塔：你查看了本局规则和当前星榜');
  } else if (zone.name === '无限监狱') {
    showToast('监狱已封锁：只有被裁判押解或支付赎金的玩家才能进入');
  } else if (zone.name === '推理社') {
    openInferenceCase();
  } else if (zone.name === '会议室') {
    openDiscussionRoom();
  } else if (zone.name === '夜场游乐园') {
    const parkDoor = worldBuildings.find((building) => building.label === '夜场游乐园')?.door;
    if (parkDoor && player.group) {
      player.group.position.set(parkDoor.x, 0, parkDoor.z - .9);
      showToast('已从正门进入夜场游乐园大厅：走到墙边游戏桌，按“行动”开始真实小游戏。');
      pushActivity('游乐园：已从正门进入室内大厅，游戏桌沿墙排列，墙面写有游戏名称');
    } else showToast('游乐园入口暂时不可用，请稍后再试');
  }
}

function clearMeetingContent() {
  $('#meetingOptions').innerHTML = '';
  $('#meetingResult').textContent = '';
  $('#meetingResult').className = '';
  $('#meetingClueText').textContent = '';
  const answer = $('#turtleAnswerInput');
  answer?.remove();
  $('#turtleSubmitBtn')?.remove();
  $('#turtleAnswerHint')?.remove();
}

function openInferenceCase() {
  const selected = nextContent('cases', contentDatabase.cases);
  if (!selected) {
    showToast('推理社数据库暂时不可用，请确认 content-db.json 已加载');
    return;
  }
  activeCase = selected;
  activeDiscussion = null;
  clearMeetingContent();
  $('#meetingTitle').textContent = `推理社 · ${selected.title}`;
  $('#meetingRoomName').textContent = `案件档案 ${selected.id} · 难度 ${selected.difficulty || 1}/5`;
  $('#meetingIntro').textContent = selected.intro || '案件档案等待还原。';
  $('#meetingProgress').textContent = selected.mode === 'turtle' ? '海龟汤 · 输入你的完整推理' : '现场推理 · 选择最合理的解释';
  $('#meetingClueTitle').textContent = '已公开线索';
  $('#meetingClueText').textContent = selected.clue || '暂无线索。';
  if (selected.mode === 'turtle') {
    const input = document.createElement('textarea');
    input.id = 'turtleAnswerInput';
    input.maxLength = 600;
    input.placeholder = '写出你的推理：人物做了什么、为什么、线索如何对应……';
    const hint = document.createElement('span');
    hint.id = 'turtleAnswerHint';
    hint.className = 'turtleHint';
    hint.textContent = '系统会根据多个关键点判定，不要求逐字一致。';
    const button = document.createElement('button');
    button.id = 'turtleSubmitBtn';
    button.textContent = '提交完整推理';
    button.addEventListener('click', submitTurtleAnswer);
    $('#meetingClueText').after(input, hint, button);
  } else {
    const options = $('#meetingOptions');
    (selected.options || []).forEach((option, index) => {
      const button = document.createElement('button');
      button.textContent = `${index + 1}. ${option}`;
      button.addEventListener('click', () => submitCaseChoice(index));
      options.appendChild(button);
    });
  }
  $('#meetingResult').textContent = '裁判只记录你的答案，不公开给其他玩家。';
  $('#meetingModal').classList.add('open');
  pushActivity(`推理社：抽取案件 ${selected.id} · ${selected.title}`);
}

function normalizeAnswer(value) {
  return String(value || '').toLowerCase().replace(/[\s，。！？、,.!?；;：:「」“”‘’()（）\-]/g, '');
}

function resolveContentReward(reward, label) {
  const eventBonus = activeEvent && (activeEvent.zone === '全域' || activeEvent.zone === getZone(player.group.position).name) ? Number(activeEvent.bonus) || 0 : 0;
  const total = Math.max(0, Number(reward) || 0) + eventBonus;
  player.coins += total;
  updateHud();
  playSound('win');
  pushActivity(`${label}：完成，获得 ${total} 金币${eventBonus ? `（事件加成 +${eventBonus}）` : ''}`);
  showToast(`${label}完成，金币 +${total}`);
  return total;
}

function submitCaseChoice(index) {
  if (!activeCase || activeCase.mode === 'turtle') return;
  const correct = Number(index) === Number(activeCase.answer);
  $('#meetingOptions').querySelectorAll('button').forEach((button) => { button.disabled = true; });
  if (correct) {
    stats.casesSolved += 1;
    saveStats();
    const reward = resolveContentReward(activeCase.reward, '案件推理');
    $('#meetingResult').className = 'win';
    $('#meetingResult').textContent = `判断正确。${activeCase.explanation || '你抓住了关键矛盾。'} 获得 ${reward} 金币。`;
  } else {
    stats.caseErrors += 1;
    saveStats();
    player.coins = Math.max(0, player.coins - Math.min(18, 5 + Number(activeCase.difficulty || 1) * 2));
    updateHud();
    playSound('lose');
    $('#meetingResult').className = 'lose';
    $('#meetingResult').textContent = '推理未通过。线索已经记录，下一次可以重新挑战另一份案件。';
  }
}

function submitTurtleAnswer() {
  if (!activeCase || activeCase.mode !== 'turtle') return;
  const input = $('#turtleAnswerInput');
  const answer = normalizeAnswer(input?.value);
  if (answer.length < 12) { $('#meetingResult').textContent = '答案过短，至少说明动机、过程和线索之间的关系。'; return; }
  const keywords = Array.isArray(activeCase.answerKeywords) ? activeCase.answerKeywords : [];
  const hits = keywords.filter((keyword) => answer.includes(normalizeAnswer(keyword))).length;
  const required = Math.max(2, Math.ceil(keywords.length * .5));
  input.disabled = true;
  $('#turtleSubmitBtn').disabled = true;
  if (hits >= required) {
    stats.casesSolved += 1;
    saveStats();
    const reward = resolveContentReward(activeCase.reward, '海龟汤推理');
    $('#meetingResult').className = 'win';
    $('#meetingResult').textContent = `推理成立（命中 ${hits}/${keywords.length} 个关键点）。标准解释：${activeCase.answerText} 奖励 ${reward} 金币。`;
  } else {
    stats.caseErrors += 1;
    saveStats();
    player.coins = Math.max(0, player.coins - Math.min(28, 8 + Number(activeCase.difficulty || 1) * 3));
    updateHud();
    playSound('lose');
    $('#meetingResult').className = 'lose';
    $('#meetingResult').textContent = `推理暂未成立（命中 ${hits}/${keywords.length} 个关键点）。可以回到推理社继续抽取其他档案。`;
  }
}

function openDiscussionRoom() {
  const selected = nextContent('discussions', contentDatabase.discussions);
  if (!selected) { showToast('会议室议题数据库暂时不可用'); return; }
  activeDiscussion = selected;
  activeCase = null;
  clearMeetingContent();
  $('#meetingTitle').textContent = selected.title;
  $('#meetingRoomName').textContent = `会议室 · 公开讨论议题 ${selected.id}`;
  $('#meetingIntro').textContent = selected.intro || '讨论参与者需要交换情报。';
  $('#meetingProgress').textContent = '会议室 · 讨论与投票';
  $('#meetingClueTitle').textContent = '桌面信息';
  $('#meetingClueText').textContent = selected.clue || '没有额外线索。';
  (selected.options || []).forEach((option, index) => {
    const button = document.createElement('button');
    button.textContent = `${index + 1}. ${option}`;
    button.addEventListener('click', () => submitDiscussionChoice(index));
    $('#meetingOptions').appendChild(button);
  });
  $('#meetingResult').textContent = '可以先和场内玩家讨论，再提交你的决定。';
  $('#meetingModal').classList.add('open');
  pushActivity(`会议室：议题轮换为 ${selected.title}`);
}

function submitDiscussionChoice(index) {
  if (!activeDiscussion) return;
  const correct = Number(index) === Number(activeDiscussion.answer);
  $('#meetingOptions').querySelectorAll('button').forEach((button) => { button.disabled = true; });
  if (correct) {
    player.influence += 1;
    const reward = resolveContentReward(activeDiscussion.reward, '会议室讨论');
    $('#meetingResult').className = 'win';
    $('#meetingResult').textContent = `讨论结论获得多数认可。影响力 +1，金币 +${reward}。`;
  } else {
    player.influence = Math.max(0, player.influence - 1);
    player.coins = Math.max(0, player.coins - 8);
    updateHud();
    playSound('lose');
    $('#meetingResult').className = 'lose';
    $('#meetingResult').textContent = '讨论结论被质疑，影响力 -1。你可以等待下一轮议题。';
  }
}

function openParkGame(station = activeParkStation) {
  if (!station) {
    showToast('请先进入夜场游乐园，再走到对应的室内游戏桌旁。');
    return;
  }
  activeParkStation = station;
  const selected = station.gameId
    ? contentDatabase.parkGames.find((item) => item.id === station.gameId)
    : nextContent('parkGames', contentDatabase.parkGames);
  if (!selected) { showToast('游乐园小游戏数据库暂时不可用'); return; }
  activeParkGame = selected;
  if (selected.type === 'gomoku') {
    openGomokuGame();
    return;
  }
  parkGameState = { started: false, resolved: false, correct: Math.floor(Math.random() * 3), sequence: Array.from({ length: 3 }, () => ['月', '钟', '鸦'][Math.floor(Math.random() * 3)]).join('') };
  parkGameState.interactive = ['park-06', 'park-14', 'park-17', 'park-21'].includes(selected.id) ? 'maze' : selected.type;
  $('#parkGameTitle').textContent = selected.name;
  $('#parkGameDescription').textContent = selected.description;
  const guide = selected.type === 'blackjack'
    ? '玩法：先选择下注额，与你的裁判庄家进行二十一点。点击要牌或停牌，A 会按 1 或 11 自动计算。'
    : selected.type === 'highcard'
      ? '玩法：先看自己的五张牌，最多选择两张换牌，再摊牌与裁判比真实牌型。'
      : selected.type === 'gomoku'
    ? '玩法：点击棋盘交叉点落子，先连成五子获胜。'
    : ['park-06', 'park-14', 'park-17', 'park-21'].includes(selected.id)
      ? '玩法：按 WASD/方向键或手机方向键移动红色角色，走到金色出口。'
      : selected.type === 'timing'
        ? '玩法：点击画面中移动的金色核心，命中中心区域才算成功。'
        : selected.type === 'choice'
          ? '玩法：点击画面中的三扇门，选择后会立即揭示结果。'
      : selected.type === 'memory'
            ? '玩法：先看上方四张目标牌的顺序；牌面翻过去后，点击下方五张牌，按原顺序翻开。'
            : '玩法：点击开始后观察转盘，等待转盘真正停止并判定结果。';
  $('#parkGameInstruction').textContent = guide;
  $('#parkGameBoard').style.display = 'none';
  parkGameCanvas.style.display = 'none';
  $('#parkGameControls').style.display = 'none';
  $('#parkGameControls').classList.remove('mazeControls');
  $('#parkGameResult').innerHTML = '每次进入会从数据库抽取不同的游戏规则。<div id="parkGameModeRow"><button id="gomokuBtn" class="parkModeButton">五子棋对战</button></div>';
  $('#parkGameAction').textContent = selected.type === 'gomoku' ? '开始五子棋' : selected.type === 'blackjack' || selected.type === 'highcard' ? '进入牌桌' : '开始并查看玩法';
  $('#parkGameAction').disabled = false;
  $('#parkGameAction').onclick = playParkGame;
  if (parkGameState.interactive === 'maze') $('#parkGameDescription').textContent = `${selected.description || selected.name} · 进入后要实际走迷宫到出口，不是文字选择。`;
  $('#gomokuBtn').addEventListener('click', openGomokuGame);
  $('#parkGameModal').classList.add('open');
  pushActivity(`游乐园：在${station.title}开始${selected.name} · ${selected.type} 模式`);
}

function parkCanvasSize() {
  if (!parkGameCanvasContext) return { width: 900, height: 560 };
  const rect = parkGameCanvas.getBoundingClientRect();
  const width = Math.max(480, rect.width || 900);
  const height = Math.max(280, rect.height || 560);
  const ratio = Math.min(2, devicePixelRatio || 1);
  parkGameCanvas.width = Math.round(width * ratio);
  parkGameCanvas.height = Math.round(height * ratio);
  parkGameCanvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height };
}

function drawParkCanvasBackground(context, width, height, title) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#152d4a'); gradient.addColorStop(.48, '#0b172c'); gradient.addColorStop(1, '#220f2f');
  context.fillStyle = gradient; context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(104,229,255,.13)'; context.lineWidth = 1;
  for (let x = 0; x < width; x += 28) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y < height; y += 28) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.fillStyle = 'rgba(232,246,255,.9)'; context.font = '700 16px Microsoft YaHei, sans-serif'; context.fillText(title, 18, 28);
}

const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createStandardDeck() {
  return CARD_SUITS.flatMap((suit) => CARD_RANKS.map((rank, value) => ({ suit, rank, value: value + 1 })));
}

function shuffleCards(cards) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  return cards;
}

function takeCard(state) {
  return state.deck.pop();
}

function cardValue(card) {
  return card.rank === 'A' ? 1 : Math.min(card.value, 10);
}

function blackjackScore(hand) {
  let score = hand.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = hand.filter((card) => card.rank === 'A').length;
  while (aces > 0 && score + 10 <= 21) { score += 10; aces -= 1; }
  return { score, soft: aces < hand.filter((card) => card.rank === 'A').length };
}

function pokerScore(hand) {
  const counts = new Map();
  const pokerValue = (card) => card.rank === 'A' ? 14 : card.value;
  hand.forEach((card) => { const value = pokerValue(card); counts.set(value, (counts.get(value) || 0) + 1); });
  const values = [...new Set(hand.map(pokerValue))].sort((a, b) => b - a);
  const aceLow = values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5);
  const straight = values.length === 5 && (values[0] - values[4] === 4 || aceLow);
  const flush = hand.every((card) => card.suit === hand[0].suit);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  if (straight && flush) return [8, aceLow ? 5 : values[0], '同花顺'];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0], '四条'];
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) return [6, groups[0][0], groups[1][0], '葫芦'];
  if (flush) return [5, ...values, '同花'];
  if (straight) return [4, aceLow ? 5 : values[0], '顺子'];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map(([value]) => value), '三条'];
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) return [2, Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0], '两对'];
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map(([value]) => value), '一对'];
  return [0, ...values, '高牌'];
}

function comparePokerScores(first, second) {
  for (let index = 0; index < Math.max(first.length, second.length) - 1; index += 1) {
    if ((first[index] || 0) !== (second[index] || 0)) return (first[index] || 0) > (second[index] || 0) ? 1 : -1;
  }
  return 0;
}

function formatCard(card) { return `${card.rank}${card.suit}`; }

function drawCardFace(context, card, x, y, width, height, hidden = false, selected = false) {
  context.save();
  context.shadowColor = selected ? '#ffd369' : 'rgba(0,0,0,.5)';
  context.shadowBlur = selected ? 18 : 8;
  context.fillStyle = hidden ? '#172743' : '#f4f1e8';
  context.strokeStyle = selected ? '#ffd369' : hidden ? '#68e5ff' : 'rgba(255,255,255,.82)';
  context.lineWidth = selected ? 3 : 1.5;
  context.beginPath(); context.roundRect(x, y, width, height, 10); context.fill(); context.stroke();
  context.shadowBlur = 0;
  if (hidden) {
    context.fillStyle = 'rgba(104,229,255,.18)'; context.fillRect(x + 8, y + 8, width - 16, height - 16);
    context.strokeStyle = 'rgba(104,229,255,.5)'; context.lineWidth = 1;
    for (let line = -height; line < width; line += 14) { context.beginPath(); context.moveTo(x + line, y + 8); context.lineTo(x + line + height, y + height - 8); context.stroke(); }
    context.fillStyle = '#68e5ff'; context.font = '700 22px sans-serif'; context.textAlign = 'center'; context.fillText('✦', x + width / 2, y + height / 2 + 7);
  } else {
    const red = card.suit === '♥' || card.suit === '♦';
    context.fillStyle = red ? '#c54a68' : '#172338';
    context.font = '700 18px sans-serif'; context.textAlign = 'left'; context.fillText(card.rank, x + 10, y + 23);
    context.font = '700 25px sans-serif'; context.fillText(card.suit, x + 9, y + 49);
    context.font = '700 35px sans-serif'; context.textAlign = 'center'; context.fillText(card.suit, x + width / 2, y + height / 2 + 13);
    context.font = '700 16px sans-serif'; context.textAlign = 'right'; context.fillText(card.rank, x + width - 10, y + height - 12);
  }
  context.restore();
}

function drawCardGame() {
  if (!parkGameState || !parkGameCanvasContext || !activeParkGame) return;
  const { width, height } = parkCanvasSize();
  const context = parkGameCanvasContext;
  drawParkCanvasBackground(context, width, height, `${activeParkGame.name} · 真实牌面`);
  const cardWidth = Math.min(84, (width - 90) / 5.4);
  const cardHeight = Math.min(122, height * .24);
  const gap = Math.min(14, cardWidth * .14);
  const drawHand = (hand, y, hidden = false) => {
    if (!hand?.length) return;
    const total = hand.length * cardWidth + (hand.length - 1) * gap;
    const start = (width - total) / 2;
    hand.forEach((card, index) => drawCardFace(context, card, start + index * (cardWidth + gap), y, cardWidth, cardHeight, hidden || card.hidden, Boolean(parkGameState.selected?.includes(index))));
  };
  context.fillStyle = '#c8d8ec'; context.font = '700 14px Microsoft YaHei, sans-serif'; context.textAlign = 'left';
  if (parkGameState.type === 'blackjack') {
    context.fillText(`裁判庄家  ${parkGameState.revealed ? blackjackScore(parkGameState.dealer).score : '??'}`, 18, 58);
    drawHand(parkGameState.dealer, 70, !parkGameState.revealed);
    context.fillText(`你的牌  ${blackjackScore(parkGameState.playerHand).score}${blackjackScore(parkGameState.playerHand).soft ? ' · A按11' : ''}`, 18, height * .53);
    drawHand(parkGameState.playerHand, height * .53 + 12);
    context.fillStyle = '#ffd369'; context.fillText(`底注 ${parkGameState.bet || 0} 金币 · 牌堆剩余 ${parkGameState.deck?.length || 0}`, 18, height - 18);
  } else {
    context.fillText(`裁判手牌  ${parkGameState.revealed ? pokerScore(parkGameState.dealerHand).at(-1) : '暗牌'}`, 18, 58);
    drawHand(parkGameState.dealerHand, 70, !parkGameState.revealed);
    context.fillStyle = '#c8d8ec'; context.fillText(`你的五张牌${parkGameState.exchanged ? ' · 已换牌' : ' · 可选中最多两张'}`, 18, height * .53);
    drawHand(parkGameState.playerHand, height * .53 + 12);
    context.fillStyle = '#ffd369'; context.fillText(`底注 ${parkGameState.bet || 0} 金币 · 换牌 ${parkGameState.exchanged ? '已用' : '未用'}`, 18, height - 18);
  }
  context.textAlign = 'left';
}

function renderCardStakeChoice() {
  parkGameCanvas.style.display = 'block';
  parkGameState.type = activeParkGame.type;
  parkGameState.selected = [];
  const { width, height } = parkCanvasSize();
  drawParkCanvasBackground(parkGameCanvasContext, width, height, `${activeParkGame.name} · 选择底注`);
  parkGameCanvasContext.fillStyle = '#ffd369'; parkGameCanvasContext.font = '700 22px Microsoft YaHei, sans-serif'; parkGameCanvasContext.textAlign = 'center';
  parkGameCanvasContext.fillText(`你的金币：${player.coins}`, width / 2, height * .42);
  parkGameCanvasContext.font = '14px Microsoft YaHei, sans-serif'; parkGameCanvasContext.fillStyle = '#c8d8ec'; parkGameCanvasContext.fillText('底注越高，胜利回报越高；只使用虚拟金币。', width / 2, height * .5);
  parkGameCanvasContext.textAlign = 'left';
  $('#parkGameResult').innerHTML = `<div class="cardStakeRow"><button data-card-bet="20">下注 20</button><button data-card-bet="40">下注 40</button><button data-card-bet="80">下注 80</button></div>`;
  $$('#parkGameResult [data-card-bet]').forEach((button) => button.addEventListener('click', () => startCardRound(Number(button.dataset.cardBet))));
  $('#parkGameAction').disabled = true; $('#parkGameAction').textContent = '先选择底注';
}

function startCardRound(bet) {
  if (!activeParkGame || !parkGameState || parkGameState.resolved) return;
  if (player.coins < bet) { showToast(`金币不足，至少需要 ${bet} 金币`); return; }
  player.coins -= bet; updateHud(); persistLocalState();
  parkGameState.deck = shuffleCards(createStandardDeck()); parkGameState.bet = bet; parkGameState.revealed = false; parkGameState.selected = []; parkGameState.exchanged = false; parkGameState.started = true;
  if (activeParkGame.type === 'blackjack') {
    parkGameState.playerHand = [takeCard(parkGameState), takeCard(parkGameState)];
    parkGameState.dealer = [takeCard(parkGameState), takeCard(parkGameState)];
    parkGameState.phase = 'player';
  } else {
    parkGameState.playerHand = Array.from({ length: 5 }, () => takeCard(parkGameState));
    parkGameState.dealerHand = Array.from({ length: 5 }, () => takeCard(parkGameState));
    parkGameState.phase = 'exchange';
  }
  renderActiveCardControls(); drawCardGame(); playSound('deal');
}

function renderActiveCardControls() {
  if (!parkGameState || parkGameState.resolved) return;
  $('#parkGameAction').disabled = true; $('#parkGameAction').textContent = '牌局进行中';
  if (parkGameState.type === 'blackjack') {
    $('#parkGameResult').innerHTML = '<div class="cardControls"><button id="cardHitBtn">要牌</button><button id="cardStandBtn">停牌</button></div><span class="cardHint">要牌可能爆牌；停牌后裁判会自动补到 17 点。</span>';
    $('#cardHitBtn').addEventListener('click', hitBlackjack); $('#cardStandBtn').addEventListener('click', standBlackjack);
  } else {
    $('#parkGameResult').innerHTML = parkGameState.exchanged ? '<div class="cardControls"><button id="cardRevealBtn">摊牌</button></div><span class="cardHint">你已经换牌，点击摊牌与裁判比牌型。</span>' : '<div class="cardControls"><button id="cardExchangeBtn">换选中的牌</button><button id="cardRevealBtn">不换牌，直接摊牌</button></div><span class="cardHint">点击牌面选牌，最多两张；不换也可以直接摊牌。</span>';
    $('#cardExchangeBtn')?.addEventListener('click', exchangeHighCard);
    $('#cardRevealBtn').addEventListener('click', revealHighCard);
  }
}

function hitBlackjack() {
  if (parkGameState?.type !== 'blackjack' || parkGameState.phase !== 'player' || parkGameState.resolved) return;
  parkGameState.playerHand.push(takeCard(parkGameState)); playSound('deal'); drawCardGame();
  if (blackjackScore(parkGameState.playerHand).score > 21) settleCardGame('lose', `你的点数 ${blackjackScore(parkGameState.playerHand).score} 爆牌`);
}

function standBlackjack() {
  if (parkGameState?.type !== 'blackjack' || parkGameState.phase !== 'player' || parkGameState.resolved) return;
  parkGameState.phase = 'dealer'; parkGameState.revealed = true;
  while (blackjackScore(parkGameState.dealer).score < 17) parkGameState.dealer.push(takeCard(parkGameState));
  const playerScore = blackjackScore(parkGameState.playerHand).score; const dealerScore = blackjackScore(parkGameState.dealer).score;
  if (dealerScore > 21 || playerScore > dealerScore) settleCardGame('win', `你 ${playerScore} 点，裁判 ${dealerScore > 21 ? '爆牌' : `${dealerScore} 点`}`);
  else if (playerScore === dealerScore) settleCardGame('draw', `双方都是 ${playerScore} 点，底注退回`);
  else settleCardGame('lose', `你 ${playerScore} 点，裁判 ${dealerScore} 点`);
}

function exchangeHighCard() {
  if (parkGameState?.type !== 'highcard' || parkGameState.exchanged || parkGameState.resolved) return;
  if (!parkGameState.selected.length) { showToast('请先点击选中要替换的牌，最多两张'); return; }
  if (parkGameState.selected.length > 2) { showToast('最多只能换两张牌'); return; }
  parkGameState.selected.forEach((index) => { parkGameState.playerHand[index] = takeCard(parkGameState); });
  parkGameState.exchanged = true; parkGameState.selected = []; renderActiveCardControls(); drawCardGame(); playSound('deal');
}

function revealHighCard() {
  if (parkGameState?.type !== 'highcard' || parkGameState.resolved) return;
  parkGameState.revealed = true;
  const playerScore = pokerScore(parkGameState.playerHand); const dealerScore = pokerScore(parkGameState.dealerHand); const comparison = comparePokerScores(playerScore, dealerScore);
  if (comparison > 0) settleCardGame('win', `你的${playerScore.at(-1)}胜过裁判的${dealerScore.at(-1)}`);
  else if (comparison === 0) settleCardGame('draw', `双方都是${playerScore.at(-1)}，底注退回`);
  else settleCardGame('lose', `裁判的${dealerScore.at(-1)}胜过你的${playerScore.at(-1)}`);
}

function settleCardGame(outcome, detail) {
  if (!parkGameState || parkGameState.resolved) return;
  parkGameState.resolved = true; parkGameState.revealed = true; parkGameState.phase = 'resolved';
  stats.parkGames += 1; saveStats();
  const bet = Number(parkGameState.bet) || 0;
  let payout = 0;
  if (outcome === 'win') {
    const min = Number(activeParkGame.minReward) || bet * 2; const max = Math.max(min, Number(activeParkGame.maxReward) || min);
    payout = Math.max(bet * 2, resolveContentReward(min + Math.floor(Math.random() * (max - min + 1)), '纸牌胜利'));
    player.coins += payout;
    $('#parkGameResult').className = 'win'; $('#parkGameResult').textContent = `${detail}，赢得 ${payout} 金币。`;
  } else if (outcome === 'draw') {
    player.coins += bet; $('#parkGameResult').className = ''; $('#parkGameResult').textContent = `${detail}。`;
  } else {
    playSound('lose'); $('#parkGameResult').className = 'lose'; $('#parkGameResult').textContent = `${detail}，本局失去底注 ${bet} 金币。`;
  }
  updateHud(); persistLocalState(); drawCardGame(); $('#parkGameAction').disabled = false; $('#parkGameAction').textContent = '再来一局'; $('#parkGameAction').onclick = () => openParkGame(activeParkStation);
}

function createMazeLayout() {
  const size = 17;
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const carve = (row, column) => {
    grid[row][column] = 0;
    const directions = [[0, 2], [2, 0], [0, -2], [-2, 0]].sort(() => Math.random() - .5);
    directions.forEach(([dr, dc]) => {
      const nextRow = row + dr; const nextColumn = column + dc;
      if (nextRow > 0 && nextRow < size - 1 && nextColumn > 0 && nextColumn < size - 1 && grid[nextRow][nextColumn]) {
        grid[row + dr / 2][column + dc / 2] = 0;
        carve(nextRow, nextColumn);
      }
    });
  };
  carve(1, 1);
  grid[1][1] = 0; grid[size - 2][size - 2] = 0;
  return { grid, size, player: { row: 1, column: 1 }, exit: { row: size - 2, column: size - 2 }, moves: 0, startedAt: Date.now() };
}

function drawMazeGame() {
  if (!parkGameState?.maze || !parkGameCanvasContext) return;
  const { width, height } = parkCanvasSize();
  const context = parkGameCanvasContext;
  drawParkCanvasBackground(context, width, height, '地下迷宫 · 找到出口');
  const maze = parkGameState.maze;
  const cell = Math.min((width - 42) / maze.size, (height - 66) / maze.size);
  const left = (width - cell * maze.size) / 2;
  const top = 42;
  maze.grid.forEach((line, row) => line.forEach((value, column) => {
    const x = left + column * cell; const y = top + row * cell;
    context.fillStyle = value ? '#0a1020' : 'rgba(104,229,255,.075)';
    context.fillRect(x, y, cell + .5, cell + .5);
    if (value) { context.strokeStyle = 'rgba(104,229,255,.34)'; context.strokeRect(x, y, cell, cell); }
  }));
  const exitX = left + maze.exit.column * cell + cell / 2; const exitY = top + maze.exit.row * cell + cell / 2;
  context.fillStyle = '#ffd369'; context.shadowColor = '#ffd369'; context.shadowBlur = 18; context.beginPath(); context.arc(exitX, exitY, cell * .3, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  const playerX = left + maze.player.column * cell + cell / 2; const playerY = top + maze.player.row * cell + cell / 2;
  context.fillStyle = '#ff7195'; context.shadowColor = '#ff7195'; context.shadowBlur = 20; context.beginPath(); context.arc(playerX, playerY, cell * .31, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  context.fillStyle = 'rgba(232,246,255,.8)'; context.font = '12px Microsoft YaHei, sans-serif'; context.fillText(`移动 ${maze.moves} 步 · 方向键 / WASD / 手机方向键`, 18, height - 14);
}

function moveMazePlayer(dr, dc) {
  if (!parkGameState?.maze || parkGameState.resolved) return;
  const maze = parkGameState.maze;
  const nextRow = maze.player.row + dr; const nextColumn = maze.player.column + dc;
  if (nextRow < 0 || nextRow >= maze.size || nextColumn < 0 || nextColumn >= maze.size || maze.grid[nextRow][nextColumn]) { playSound('lose'); return; }
  maze.player.row = nextRow; maze.player.column = nextColumn; maze.moves += 1; playSound('click'); drawMazeGame();
  if (nextRow === maze.exit.row && nextColumn === maze.exit.column) finishParkGame(true, `穿过迷宫，用时 ${Math.ceil((Date.now() - maze.startedAt) / 1000)} 秒`);
}

function startCanvasGame(type) {
  parkGameCanvas.style.display = 'block';
  parkGameCanvasContext.clearRect(0, 0, parkGameCanvas.width, parkGameCanvas.height);
  $('#parkGameBoard').style.display = 'none';
  $('#parkGameControls').style.display = type === 'maze' ? 'grid' : 'none';
  $('#parkGameControls').classList.toggle('mazeControls', type === 'maze');
  $('#parkGameAction').disabled = true;
  $('#parkGameAction').textContent = type === 'maze' ? '迷宫进行中' : '游戏进行中';
  parkGameState.type = type;
  if (type === 'maze') {
    parkGameState.maze = createMazeLayout();
    $('#parkGameInstruction').textContent = '不是点击文字：请在画面中移动红色角色，走到金色出口。';
    drawMazeGame();
    return;
  }
  if (type === 'timing') {
    const { width, height } = parkCanvasSize();
    parkGameState.target = { x: width * .2, y: height * .5, vx: 3.1, radius: 28 };
    parkGameState.startedAt = Date.now(); parkGameState.hit = false;
    $('#parkGameInstruction').textContent = '点击画面中移动的金色核心，越接近中心越容易成功。';
    drawTimingGame();
    return;
  }
  if (type === 'choice') {
    parkGameState.doors = [0, 1, 2]; parkGameState.correct = Math.floor(Math.random() * 3);
    $('#parkGameInstruction').textContent = '请点击画面中的一扇门，门后结果会在画面中揭示。';
    drawDoorGame();
    return;
  }
  if (type === 'memory') {
    parkGameState.symbols = ['月', '钟', '鸦', '眼', '钥'];
    parkGameState.memorySequence = [0, 1, 2, 3].sort(() => Math.random() - .5);
    parkGameState.memoryInput = []; parkGameState.revealed = true; parkGameState.startedAt = Date.now();
    parkGameState.hideAt = Date.now() + 5200;
    $('#parkGameInstruction').textContent = '第一步：看上方“目标顺序”；第二步：卡牌翻面后，按相同顺序点击下方五张牌。点错会立即失败。';
    drawMemoryGame();
    window.setTimeout(() => { if (parkGameState && !parkGameState.resolved && parkGameState.type === 'memory') { parkGameState.revealed = false; drawMemoryGame(); } }, 5200);
  }
  if (type === 'chance') {
    parkGameState.wheelAngle = 0;
    parkGameState.wheelSpinning = false;
    $('#parkGameAction').disabled = false;
    $('#parkGameAction').textContent = '启动转盘';
    $('#parkGameInstruction').textContent = '转盘停止后，根据指针落点判定奖励。';
    drawChanceGame();
  }
}

function drawTimingGame() {
  if (!parkGameState?.target || !parkGameCanvasContext) return;
  const { width, height } = parkCanvasSize(); const context = parkGameCanvasContext;
  drawParkCanvasBackground(context, width, height, '失重平衡 · 捕捉核心');
  const target = parkGameState.target; target.x += target.vx; if (target.x < 48 || target.x > width - 48) target.vx *= -1;
  context.fillStyle = 'rgba(255,211,105,.18)'; context.beginPath(); context.arc(width / 2, height / 2, 58, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#ffd369'; context.lineWidth = 2; context.beginPath(); context.arc(width / 2, height / 2, 58, 0, Math.PI * 2); context.stroke();
  context.fillStyle = '#ffd369'; context.shadowColor = '#ffd369'; context.shadowBlur = 22; context.beginPath(); context.arc(target.x, target.y, target.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  if (!parkGameState.resolved) window.requestAnimationFrame(() => drawTimingGame());
}

function drawDoorGame() {
  if (!parkGameState || !parkGameCanvasContext) return;
  const { width, height } = parkCanvasSize(); const context = parkGameCanvasContext;
  drawParkCanvasBackground(context, width, height, '三门猜谜 · 选择出口');
  const colors = ['#68e5ff', '#ff7195', '#ffd369'];
  parkGameState.doors.forEach((door, index) => { const x = width * (.2 + index * .3); const y = height * .52; context.fillStyle = colors[index]; context.shadowColor = colors[index]; context.shadowBlur = 18; context.fillRect(x - 52, y - 92, 104, 184); context.shadowBlur = 0; context.fillStyle = '#07101e'; context.fillRect(x - 39, y - 72, 78, 144); context.fillStyle = '#f5fbff'; context.font = '700 18px sans-serif'; context.textAlign = 'center'; context.fillText(['月门', '钟门', '鸦门'][index], x, y + 122); });
  context.textAlign = 'left';
}

function memoryCardPoint(index, width, height) {
  return { x: width * (.13 + index * .185), y: height * .64 };
}

function drawMemoryGame() {
  if (!parkGameState || !parkGameCanvasContext) return;
  const { width, height } = parkCanvasSize(); const context = parkGameCanvasContext;
  const symbols = parkGameState.symbols || ['月', '钟', '鸦', '眼', '钥'];
  const sequence = parkGameState.memorySequence || [0, 1, 2, 3];
  drawParkCanvasBackground(context, width, height, parkGameState.revealed ? '暗箱记忆 · 观察目标顺序' : '暗箱记忆 · 按顺序翻牌');
  context.fillStyle = '#c8d8ec'; context.font = '700 14px Microsoft YaHei, sans-serif'; context.textAlign = 'left';
  if (parkGameState.revealed) {
    const remaining = Math.max(0, Math.ceil((parkGameState.hideAt - Date.now()) / 1000));
    context.fillText(`目标顺序（${remaining} 秒后翻面）：`, 18, 58);
    sequence.forEach((symbolIndex, order) => {
      const x = width * (.25 + order * .17); const y = height * .25;
      context.fillStyle = '#b68aff'; context.shadowColor = '#b68aff'; context.shadowBlur = 15; context.beginPath(); context.roundRect(x - 36, y - 30, 72, 60, 12); context.fill(); context.shadowBlur = 0;
      context.fillStyle = '#f5fbff'; context.font = '700 25px sans-serif'; context.textAlign = 'center'; context.fillText(symbols[symbolIndex], x, y + 9);
      context.fillStyle = '#ffd369'; context.font = '700 11px sans-serif'; context.fillText(`第${order + 1}张`, x, y + 48);
    });
    context.fillStyle = '#68e5ff'; context.font = '12px Microsoft YaHei, sans-serif'; context.textAlign = 'center'; context.fillText('先记住上面的顺序，下面的牌是待会要点击的选项', width / 2, height * .47);
  } else {
    context.fillText(`按目标顺序点击 · 已完成 ${parkGameState.memoryInput?.length || 0}/${sequence.length}`, 18, 58);
  }
  parkGameState.symbols.forEach((symbol, index) => {
    const { x, y } = memoryCardPoint(index, width, height);
    const completed = parkGameState.memoryInput?.includes(index);
    context.fillStyle = completed ? 'rgba(158,242,184,.22)' : parkGameState.revealed ? 'rgba(104,229,255,.12)' : 'rgba(104,229,255,.2)';
    context.strokeStyle = completed ? '#9ef2b8' : '#68e5ff'; context.lineWidth = 2; context.shadowColor = completed ? '#9ef2b8' : '#68e5ff'; context.shadowBlur = completed ? 16 : 7;
    context.beginPath(); context.roundRect(x - 39, y - 48, 78, 96, 14); context.fill(); context.stroke(); context.shadowBlur = 0;
    context.fillStyle = '#ffd369'; context.font = '700 12px Microsoft YaHei, sans-serif'; context.textAlign = 'center'; context.fillText(`${index + 1}`, x, y - 26);
    context.fillStyle = '#f5fbff'; context.font = '700 30px sans-serif'; context.fillText(symbol, x, y + 12);
    context.fillStyle = '#9bb1cb'; context.font = '11px Microsoft YaHei, sans-serif'; context.fillText(completed ? '已翻开' : '点击这张牌', x, y + 36);
  });
  context.textAlign = 'left';
  if (parkGameState.revealed && !parkGameState.resolved) window.requestAnimationFrame(() => drawMemoryGame());
}

function drawChanceGame() {
  if (!parkGameState || !parkGameCanvasContext) return;
  const { width, height } = parkCanvasSize(); const context = parkGameCanvasContext;
  drawParkCanvasBackground(context, width, height, '霓虹转盘 · 下注你的运气');
  const centerX = width / 2; const centerY = height / 2 + 12; const radius = Math.min(130, height * .32);
  const colors = ['#68e5ff', '#ff7195', '#ffd369', '#9ef2b8', '#b68aff', '#ff9d83'];
  colors.forEach((color, index) => { const start = parkGameState.wheelAngle + index / colors.length * Math.PI * 2; const end = parkGameState.wheelAngle + (index + 1) / colors.length * Math.PI * 2; context.fillStyle = color; context.beginPath(); context.moveTo(centerX, centerY); context.arc(centerX, centerY, radius, start, end); context.closePath(); context.fill(); context.strokeStyle = '#07101e'; context.lineWidth = 2; context.stroke(); });
  context.fillStyle = '#08101d'; context.beginPath(); context.arc(centerX, centerY, 22, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#f5fbff'; context.font = '700 14px sans-serif'; context.textAlign = 'center'; context.fillText('SPIN', centerX, centerY + 5);
  context.fillStyle = '#fff4c3'; context.beginPath(); context.moveTo(centerX, centerY - radius - 20); context.lineTo(centerX - 13, centerY - radius + 4); context.lineTo(centerX + 13, centerY - radius + 4); context.closePath(); context.fill(); context.textAlign = 'left';
  if (parkGameState.wheelSpinning && !parkGameState.resolved) window.requestAnimationFrame(() => { parkGameState.wheelAngle += .11; drawChanceGame(); });
}

function resetGomokuBoard() {
  const board = Array.from({ length: 15 }, () => Array(15).fill(0));
  parkGameState = { started: true, resolved: false, type: 'gomoku', board, turn: 1, moves: 0, lastMove: null };
  parkGameCanvas.style.display = 'none';
  $('#parkGameControls').style.display = 'none';
  $('#parkGameBoard').style.display = 'grid';
  $('#parkGameDescription').textContent = '你执黑先行。点击棋盘交叉点落子，连成五子即可获胜；裁判人机会尽量拦截你的连线。';
  $('#parkGameAction').textContent = '重新开局';
  $('#parkGameAction').disabled = false;
  $('#parkGameAction').onclick = resetGomokuBoard;
  $('#gomokuBtn')?.remove();
  renderGomokuBoard();
}

function openGomokuGame() {
  activeParkGame = { id: 'park-gomoku', name: '五子棋·星盘对局', type: 'gomoku', minReward: 70, maxReward: 150 };
  resetGomokuBoard();
  $('#parkGameModal').classList.add('open');
  pushActivity('游乐园：进入五子棋星盘对局');
}

function gomokuWinner(board, row, column, side) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  return directions.some(([dr, dc]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = column + dc * sign;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === side) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    return count >= 5;
  });
}

function finishGomoku(success, detail) {
  if (!parkGameState || parkGameState.resolved) return;
  finishParkGame(success, detail);
  $('#parkGameAction').textContent = '再来一局五子棋';
  $('#parkGameAction').onclick = resetGomokuBoard;
}

function gomokuCandidates(board) {
  const occupied = [];
  for (let row = 0; row < 15; row++) for (let column = 0; column < 15; column++) if (board[row][column]) occupied.push([row, column]);
  if (!occupied.length) return [[7, 7]];
  const seen = new Set();
  const candidates = [];
  occupied.forEach(([row, column]) => {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const nextRow = row + dr;
      const nextColumn = column + dc;
      if (nextRow < 0 || nextRow >= 15 || nextColumn < 0 || nextColumn >= 15 || board[nextRow][nextColumn]) continue;
      const key = `${nextRow}:${nextColumn}`;
      if (!seen.has(key)) { seen.add(key); candidates.push([nextRow, nextColumn]); }
    }
  });
  return candidates.length ? candidates : [[7, 7]];
}

function gomokuPatternScore(count, openEnds) {
  if (count >= 5) return 10000000;
  if (count === 4) return openEnds === 2 ? 1000000 : 240000;
  if (count === 3) return openEnds === 2 ? 72000 : 7000;
  if (count === 2) return openEnds === 2 ? 2300 : 260;
  return openEnds === 2 ? 90 : 12;
}

function evaluateGomokuMove(board, row, column, side) {
  if (board[row][column]) return -Infinity;
  board[row][column] = side;
  let total = Math.max(0, 18 - (Math.abs(row - 7) + Math.abs(column - 7))) * 2;
  for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let count = 1;
    let openEnds = 0;
    for (const sign of [-1, 1]) {
      let nextRow = row + dr * sign;
      let nextColumn = column + dc * sign;
      while (nextRow >= 0 && nextRow < 15 && nextColumn >= 0 && nextColumn < 15 && board[nextRow][nextColumn] === side) {
        count += 1;
        nextRow += dr * sign;
        nextColumn += dc * sign;
      }
      if (nextRow >= 0 && nextRow < 15 && nextColumn >= 0 && nextColumn < 15 && !board[nextRow][nextColumn]) openEnds += 1;
    }
    total += gomokuPatternScore(count, openEnds);
  }
  board[row][column] = 0;
  return total;
}

function gomokuWinningMoves(board, side, candidates = gomokuCandidates(board)) {
  return candidates.filter(([row, column]) => {
    board[row][column] = side;
    const win = gomokuWinner(board, row, column, side);
    board[row][column] = 0;
    return win;
  });
}

function chooseGomokuBotMove(board) {
  const candidates = gomokuCandidates(board);
  if (!candidates.length) return null;
  const ownWins = gomokuWinningMoves(board, 2, candidates);
  if (ownWins.length) return ownWins[0];
  const enemyWins = gomokuWinningMoves(board, 1, candidates);
  if (enemyWins.length) return enemyWins[0];
  let best = candidates[0];
  let bestScore = -Infinity;
  candidates.forEach(([row, column]) => {
    const attack = evaluateGomokuMove(board, row, column, 2);
    const block = evaluateGomokuMove(board, row, column, 1);
    board[row][column] = 2;
    const nextCandidates = gomokuCandidates(board);
    const opponentThreat = Math.max(0, ...nextCandidates.map(([r, c]) => evaluateGomokuMove(board, r, c, 1)));
    board[row][column] = 0;
    const score = attack * 1.08 + block * 1.16 - opponentThreat * .22 + Math.random() * .02;
    if (score > bestScore) { bestScore = score; best = [row, column]; }
  });
  return best;
}

function renderGomokuBoard() {
  const boardElement = $('#parkGameBoard');
  if (!boardElement || !parkGameState?.board) return;
  boardElement.innerHTML = '';
  for (let row = 0; row < 15; row++) {
    for (let column = 0; column < 15; column++) {
      const cell = document.createElement('button');
      const value = parkGameState.board[row][column];
      cell.className = `gomokuCell ${value === 1 ? 'black' : value === 2 ? 'white' : ''}`;
      cell.setAttribute('aria-label', `第${row + 1}行第${column + 1}列`);
      cell.disabled = Boolean(value) || parkGameState.turn !== 1 || parkGameState.resolved;
      cell.addEventListener('click', () => playGomokuMove(row, column));
      boardElement.appendChild(cell);
    }
  }
  $('#parkGameResult').className = parkGameState.resolved ? $('#parkGameResult').className : '';
  if (!parkGameState.resolved) $('#parkGameResult').textContent = parkGameState.turn === 1 ? '轮到你落黑子' : '裁判人机思考中…';
}

function playGomokuMove(row, column) {
  if (!parkGameState || parkGameState.type !== 'gomoku' || parkGameState.resolved || parkGameState.turn !== 1 || parkGameState.board[row][column]) return;
  parkGameState.board[row][column] = 1;
  parkGameState.moves += 1;
  parkGameState.lastMove = [row, column];
  if (gomokuWinner(parkGameState.board, row, column, 1)) { renderGomokuBoard(); finishGomoku(true, '五子连珠，星盘裁判判定你获胜'); return; }
  if (parkGameState.moves >= 225) { renderGomokuBoard(); finishGomoku(false, '棋盘填满，本局和棋'); return; }
  parkGameState.turn = 2;
  renderGomokuBoard();
  window.setTimeout(() => {
    if (!parkGameState || parkGameState.type !== 'gomoku' || parkGameState.resolved) return;
    const move = chooseGomokuBotMove(parkGameState.board);
    if (!move) { finishGomoku(false, '棋盘填满，本局和棋'); return; }
    const [botRow, botColumn] = move;
    parkGameState.board[botRow][botColumn] = 2;
    parkGameState.moves += 1;
    parkGameState.lastMove = move;
    if (gomokuWinner(parkGameState.board, botRow, botColumn, 2)) { renderGomokuBoard(); finishGomoku(false, '裁判人机连成五子，你暂时落败'); return; }
    if (parkGameState.moves >= 225) { renderGomokuBoard(); finishGomoku(false, '棋盘填满，本局和棋'); return; }
    parkGameState.turn = 1;
    renderGomokuBoard();
  }, 360);
}

function finishParkGame(success, detail) {
  if (!activeParkGame || !parkGameState || parkGameState.resolved) return;
  parkGameState.resolved = true;
  $('#parkGameAction').disabled = false;
  $('#parkGameControls').style.display = 'none';
  stats.parkGames += 1;
  saveStats();
  const min = Number(activeParkGame.minReward) || 20;
  const max = Math.max(min, Number(activeParkGame.maxReward) || min);
  if (success) {
    const reward = resolveContentReward(min + Math.floor(Math.random() * (max - min + 1)), '游乐园小游戏');
    $('#parkGameResult').className = 'win';
    $('#parkGameResult').textContent = `${detail || '挑战成功'} 奖励金币 +${reward}。`;
    $('#parkGameAction').textContent = '再玩一局';
    $('#parkGameAction').onclick = () => openParkGame(activeParkStation);
  } else {
    playSound('lose');
    $('#parkGameResult').className = 'lose';
    $('#parkGameResult').textContent = `${detail || '挑战失败'} 本局没有奖励。`;
    $('#parkGameAction').textContent = '换一张游戏桌';
    $('#parkGameAction').onclick = () => openParkGame(activeParkStation);
  }
}

function finishOutdoorRide(success, detail) {
  if (!parkGameState || parkGameState.resolved) return;
  parkGameState.resolved = true;
  $('#parkGameAction').disabled = false;
  $('#parkGameControls').style.display = 'none';
  $('#parkGameResult').className = success ? 'win' : 'lose';
  $('#parkGameResult').textContent = `${detail || (success ? '体验完成' : '体验失败')}。室外游乐场只提供体验，不产生金币奖励。`;
  $('#parkGameAction').textContent = '再次体验';
  $('#parkGameAction').onclick = () => openOutdoorRide(parkGameState.ride);
  playSound(success ? 'win' : 'lose');
}

function openOutdoorRide(ride) {
  if (!ride) return;
  activeParkStation = null;
  activeParkGame = { id: ride.id, name: ride.title, type: 'outdoorRide', minReward: 0, maxReward: 0 };
  parkGameState = { started: false, resolved: false, type: 'outdoorRide', ride, rideType: ride.type };
  $('#parkGameTitle').textContent = `${ride.title} · 室外体验`;
  $('#parkGameDescription').textContent = ride.type === 'roller'
    ? '过山车制动挑战：移动金色车厢进入中心制动区，点击画面完成刹车。'
    : ride.type === 'bumper'
      ? '碰碰车挑战：用方向键或下方方向按钮驾驶蓝色车辆，撞击金色目标 3 次。'
      : '摩天轮观测挑战：等待转到金色标记附近，点击对应座舱完成观测。';
  $('#parkGameInstruction').textContent = '这是可操作的画面体验，不是文字选择。点击“开始体验”后按画面提示操作。';
  $('#parkGameResult').className = '';
  $('#parkGameResult').textContent = '室外设施不计入金币奖励，但会记录你的体验结果。';
  $('#parkGameBoard').style.display = 'none';
  parkGameCanvas.style.display = 'none';
  $('#parkGameControls').style.display = 'none';
  $('#parkGameControls').classList.remove('mazeControls');
  $('#parkGameAction').disabled = false;
  $('#parkGameAction').textContent = '开始体验';
  $('#parkGameAction').onclick = () => startOutdoorRide(ride);
  $('#parkGameModal').classList.add('open');
  pushActivity(`室外游乐场：开始${ride.title}互动体验`);
}

function startOutdoorRide(ride) {
  if (!parkGameState || parkGameState.resolved) return;
  parkGameState.started = true;
  parkGameState.ride = ride;
  parkGameState.rideType = ride.type;
  parkGameState.startedAt = Date.now();
  $('#parkGameAction').disabled = true;
  parkGameCanvas.style.display = 'block';
  if (ride.type === 'bumper') {
    $('#parkGameControls').style.display = 'grid';
    $('#parkGameControls').classList.add('mazeControls');
    const { width, height } = parkCanvasSize();
    parkGameState.vehicle = { x: width * .22, y: height * .64, radius: 21 };
    parkGameState.target = { x: width * .74, y: height * .38, radius: 25, vx: 2.2, vy: 1.6 };
    parkGameState.hits = 0;
    $('#parkGameInstruction').textContent = '方向键 / WASD / 下方方向按钮驾驶蓝色碰碰车，撞到金色目标 3 次。';
    drawOutdoorRide();
    return;
  }
  if (ride.type === 'roller') {
    const { width, height } = parkCanvasSize();
    parkGameState.target = { x: width * .18, y: height * .55, vx: 4.4, radius: 25 };
    $('#parkGameInstruction').textContent = '点击移动中的金色车厢，让它落在中央制动区内。';
  } else {
    parkGameState.wheelAngle = 0;
    parkGameState.wheelSpeed = .075;
    $('#parkGameInstruction').textContent = '点击金色标记附近的摩天轮座舱，完成一次精准观测。';
  }
  drawOutdoorRide();
}

function moveOutdoorRide(dx, dy) {
  if (!parkGameState?.started || parkGameState.resolved || parkGameState.rideType !== 'bumper') return;
  const { width, height } = parkCanvasSize();
  const vehicle = parkGameState.vehicle;
  vehicle.x = THREE.MathUtils.clamp(vehicle.x + dx * 24, vehicle.radius, width - vehicle.radius);
  vehicle.y = THREE.MathUtils.clamp(vehicle.y + dy * 24, 58 + vehicle.radius, height - vehicle.radius);
  const target = parkGameState.target;
  if (Math.hypot(vehicle.x - target.x, vehicle.y - target.y) < vehicle.radius + target.radius) {
    parkGameState.hits += 1;
    playSound('click');
    target.x = width * (.25 + Math.random() * .55);
    target.y = height * (.3 + Math.random() * .5);
    if (parkGameState.hits >= 3) { finishOutdoorRide(true, '你完成了三次精准撞击'); return; }
  }
  drawOutdoorRide();
}

function drawOutdoorRide() {
  if (!parkGameState?.started || !parkGameCanvasContext || parkGameState.resolved) return;
  const { width, height } = parkCanvasSize();
  const context = parkGameCanvasContext;
  const type = parkGameState.rideType;
  drawParkCanvasBackground(context, width, height, `${parkGameState.ride.title} · 室外实机体验`);
  if (type === 'roller') {
    const target = parkGameState.target;
    target.x += target.vx;
    if (target.x < target.radius || target.x > width - target.radius) target.vx *= -1;
    context.fillStyle = 'rgba(255,211,105,.14)'; context.beginPath(); context.arc(width / 2, height * .55, 64, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#ffd369'; context.lineWidth = 3; context.beginPath(); context.arc(width / 2, height * .55, 64, 0, Math.PI * 2); context.stroke();
    context.fillStyle = '#ffd369'; context.shadowColor = '#ffd369'; context.shadowBlur = 22; context.beginPath(); context.arc(target.x, target.y, target.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
    context.fillStyle = '#f5fbff'; context.font = '700 15px Microsoft YaHei, sans-serif'; context.fillText('移动金色车厢 · 点击刹车', 18, 52);
  } else if (type === 'bumper') {
    const target = parkGameState.target;
    target.x += target.vx; target.y += target.vy;
    if (target.x < target.radius || target.x > width - target.radius) target.vx *= -1;
    if (target.y < 60 + target.radius || target.y > height - target.radius) target.vy *= -1;
    context.strokeStyle = 'rgba(104,229,255,.35)'; context.lineWidth = 3; context.strokeRect(20, 58, width - 40, height - 78);
    context.fillStyle = '#68e5ff'; context.shadowColor = '#68e5ff'; context.shadowBlur = 20; context.beginPath(); context.arc(parkGameState.vehicle.x, parkGameState.vehicle.y, parkGameState.vehicle.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
    context.fillStyle = '#ffd369'; context.shadowColor = '#ffd369'; context.shadowBlur = 20; context.beginPath(); context.arc(target.x, target.y, target.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
    context.fillStyle = '#f5fbff'; context.font = '700 15px Microsoft YaHei, sans-serif'; context.fillText(`撞击金色目标 · ${parkGameState.hits}/3`, 18, 40);
  } else {
    const centerX = width / 2; const centerY = height * .58; const radius = Math.min(145, height * .34);
    parkGameState.wheelAngle += parkGameState.wheelSpeed;
    parkGameState.wheelSpeed *= .9975;
    context.strokeStyle = '#b68aff'; context.lineWidth = 5; context.beginPath(); context.arc(centerX, centerY, radius, 0, Math.PI * 2); context.stroke();
    for (let i = 0; i < 8; i++) {
      const angle = parkGameState.wheelAngle + i / 8 * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius; const y = centerY + Math.sin(angle) * radius;
      context.fillStyle = i === 0 ? '#ffd369' : i % 2 ? '#68e5ff' : '#ff7195'; context.shadowColor = context.fillStyle; context.shadowBlur = 14; context.beginPath(); context.arc(x, y, 23, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
    }
    context.fillStyle = '#ffd369'; context.beginPath(); context.moveTo(centerX, centerY - radius - 24); context.lineTo(centerX - 14, centerY - radius + 2); context.lineTo(centerX + 14, centerY - radius + 2); context.closePath(); context.fill();
    context.fillStyle = '#f5fbff'; context.font = '700 15px Microsoft YaHei, sans-serif'; context.fillText('点击金色标记附近的座舱', 18, 40);
  }
  if (!parkGameState.resolved) window.requestAnimationFrame(drawOutdoorRide);
}

function playParkGame() {
  if (!activeParkGame || !parkGameState) return;
  if (!parkGameState.started) {
    parkGameState.started = true;
    const type = activeParkGame.type;
    const interactiveType = activeParkGame.id === 'park-06' || activeParkGame.id === 'park-14' || activeParkGame.id === 'park-17' || activeParkGame.id === 'park-21'
      ? 'maze' : type;
    if (type === 'blackjack' || type === 'highcard') {
      renderCardStakeChoice();
      return;
    }
    if (interactiveType === 'maze' || type === 'timing' || type === 'choice' || type === 'memory' || type === 'chance') {
      startCanvasGame(interactiveType);
      return;
    }
    if (type === 'chance') {
      $('#parkGameAction').textContent = '抽取结果';
      $('#parkGameResult').textContent = '灯牌正在洗牌，点击抽取未知结果。';
      return;
    }
    if (type === 'choice') {
      $('#parkGameResult').innerHTML = '选择一扇门：<div class="parkChoices"><button data-park-choice="0">月门</button><button data-park-choice="1">钟门</button><button data-park-choice="2">鸦门</button></div>';
      $('#parkGameAction').textContent = '等待选择';
      $('#parkGameAction').disabled = true;
      $$('#parkGameResult [data-park-choice]').forEach((button) => button.addEventListener('click', () => finishParkGame(Number(button.dataset.parkChoice) === parkGameState.correct, Number(button.dataset.parkChoice) === parkGameState.correct ? '你找到了奖励仓库' : '门后的灯光熄灭了')));
      return;
    }
    if (type === 'timing') {
      parkGameState.readyAt = Date.now() + 850;
      $('#parkGameAction').textContent = '捕捉金色刻度';
      $('#parkGameResult').textContent = '灯环正在收缩，约 0.85 秒后进入金色刻度。';
      return;
    }
    parkGameState.readyAt = Date.now() + 1400;
    $('#parkGameAction').textContent = '输入记忆顺序';
    $('#parkGameResult').innerHTML = `记住符号顺序：<strong>${parkGameState.sequence}</strong><input id="parkMemoryInput" maxlength="3" placeholder="例如：月钟鸦"><button id="parkMemorySubmit">提交答案</button>`;
    setTimeout(() => { if (parkGameState && !parkGameState.resolved) { const text = $('#parkGameResult strong'); if (text) text.textContent = '???'; } }, 1000);
    $('#parkMemorySubmit').addEventListener('click', () => finishParkGame(normalizeAnswer($('#parkMemoryInput')?.value) === normalizeAnswer(parkGameState.sequence), '记忆校验完成'));
    return;
  }
  if (activeParkGame.type === 'chance') {
    if (!parkGameState.wheelSpinning) {
      parkGameState.wheelSpinning = true;
      window.setTimeout(() => {
        if (!parkGameState || parkGameState.resolved) return;
        parkGameState.wheelSpinning = false;
        const slice = Math.floor((((parkGameState.wheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / 6));
        finishParkGame(slice % 3 !== 1, slice % 3 !== 1 ? '转盘停在安全扇区' : '转盘停在警戒扇区');
        drawChanceGame();
      }, 1800);
      $('#parkGameAction').disabled = true;
      drawChanceGame();
    }
  } else if (activeParkGame.type === 'timing') {
    const delta = Math.abs(Date.now() - parkGameState.readyAt);
    finishParkGame(delta < 760, delta < 760 ? '你在刻度中心按下按钮' : '你错过了金色刻度');
  }
}

function updateMissionPanel() {
  const panel = $('#missionPanel');
  if (!panel || !player.group) return;
  const totalTreasures = Math.max(1, Number(contentDatabase.treasureSpawns?.length) || (socket?.readyState === WebSocket.OPEN ? 12 : 10));
  const foundTreasures = Math.max(0, totalTreasures - treasurePickups.size);
  const exploredZones = zones.filter((zone) => stats.zones.includes(zone.name)).length;
  let phase = 'explore';
  let badge = '探索阶段';
  let title = '寻找赌桌、推理社或隐藏宝物';
  let hint = '先熟悉夜场，再决定是冒险对局、交易，还是寻找安全离场条件。';
  let progress = ((foundTreasures / totalTreasures) + (exploredZones / Math.max(1, zones.length))) * 50;
  if (roundExpired) {
    phase = 'end'; badge = '终局结算'; title = '等待裁判公布最终星榜'; hint = '远古时钟已经归零，所有赌桌暂停，裁判正在整理结果。'; progress = 100;
  } else if (player.inPrison) {
    phase = 'prison'; badge = '监狱阶段'; title = '支付赎金，或等待盟友救援'; hint = `无限关押不会自动结束。当前金币 ${player.coins} / 300，普通角色不能进入监狱。`; progress = Math.min(100, player.coins / 300 * 100);
  } else if (challengeOpen) {
    phase = socialOnly ? 'social' : 'duel'; badge = socialOnly ? '关系交涉' : '赌桌阶段'; title = socialOnly ? '决定结盟、交易，还是背叛' : '听裁判倒计时，选择你的牌型'; hint = socialOnly ? '只有你与对方能看到这次交涉，交易需要对方确认。' : '出牌阶段限时 5 分钟；裁判只公开胜负，不公开对手暗牌。';
    progress = duelActive && duelEndsAt ? Math.max(0, Math.min(100, 100 - Math.max(0, duelEndsAt - Date.now()) / 300000 * 100)) : 30;
  } else if (canSafeExit()) {
    phase = 'safe'; badge = '安全离场'; title = '你已经满足安全离场条件'; hint = '手里没有卡牌且至少有 3 颗星。点击右上角按钮，领取 180 枚虚拟金币。'; progress = 100;
  } else if (handTotal(player) <= 0) {
    phase = 'supply'; badge = '补给阶段'; title = '寻找裁判塔，等待下一张牌'; hint = '当前没有手牌，暂时不能进入赌桌；可以先探索区域、交易或准备救援。'; progress = Math.max(20, progress);
  }
  $('#phaseBadge').textContent = badge;
  $('#phaseBadge').className = phase === 'prison' ? 'prison' : phase === 'duel' ? 'duel' : phase === 'safe' ? 'safe' : '';
  $('#missionTitle').textContent = title;
  $('#missionHint').textContent = hint;
  const nearby = nearestMissionTarget();
  $('#nearbyObjective').textContent = nearby ? `${nearby.label} · ${Math.max(1, Math.round(nearby.distance))}m` : '暂无目标';
  $('#treasureProgress').textContent = `${foundTreasures} / ${totalTreasures}`;
  $('#zoneProgress').textContent = `${exploredZones} / ${zones.length}`;
  $('#missionBarFill').style.width = `${Math.round(Math.max(0, Math.min(100, progress)))}%`;
}

function collectTreasure(pickup) {
  if (!pickup || player.inPrison) return;
  playSound('pickup');
  if (socket?.readyState === WebSocket.OPEN) {
    sendOnline({ type: 'treasurePickup', id: pickup.id });
    return;
  }
  removeTreasurePickup(pickup.id);
  player.treasures ||= [];
  player.treasures.push({ id: pickup.id, name: pickup.name, value: Number(pickup.value) || 0 });
  renderTreasureInventory();
  updateHud();
  pushActivity(`搜寻：你找到${pickup.name || '一件隐藏宝物'}，估值 ${pickup.value} 金币`);
  showToast(`拾取成功：${pickup.name || '隐藏宝物'} · ${pickup.value} 金币估值`);
}

function updateRoundHud() {
  const counts = socket?.readyState === WebSocket.OPEN ? roundCardCounts : (() => {
    const aggregate = { rock: 0, paper: 0, scissors: 0 };
    [player, ...npcs.filter((npc) => npc.active || npc.inPrison)].forEach((owner) => {
      if (!owner || owner.leftSafely) return;
      ensureHand(owner);
      Object.keys(aggregate).forEach((type) => { aggregate[type] += owner.hand[type] || 0; });
    });
    return aggregate;
  })();
  const remaining = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  $('#roundCountdown').textContent = `${minutes}:${seconds}`;
  $('#roundCountdown').classList.toggle('danger', remaining <= 180);
  $('#cardInventory').innerHTML = `<span class="rock">✊ ${counts.rock}</span> · <span class="paper">✋ ${counts.paper}</span> · <span class="scissors">✌️ ${counts.scissors}</span>`;
  ensureHand(player);
  const handCards = ['rock', 'paper', 'scissors'].map((type) => `${cardIcon(type)}${player.hand[type] || 0}`).join('  ');
  if ($('#handHudCards')) $('#handHudCards').textContent = handCards;
  if ($('#handHudCount')) $('#handHudCount').textContent = `${handTotal(player)} 张`;
  if (towerCardLabel) towerCardLabel.textContent = `✊ ${counts.rock}  ·  ✋ ${counts.paper}  ·  ✌️ ${counts.scissors}`;
  if (roundExpired || remaining <= 0) {
    roundExpired = true;
    $('#roundCountdown').textContent = '00:00';
    $('#eventTitle').textContent = '本局已结束';
    $('#eventText').textContent = '远古时钟归零，裁判正在整理最终星星榜。';
  }
  updateTowerClock(remaining);
  const duelRemaining = duelActive && duelEndsAt ? Math.max(0, Math.ceil((duelEndsAt - Date.now()) / 1000)) : 300;
  $('#duelCountdown').textContent = duelActive ? `出牌阶段剩余 ${Math.floor(duelRemaining / 60).toString().padStart(2, '0')}:${(duelRemaining % 60).toString().padStart(2, '0')}` : '入桌后开启 05:00 出牌阶段';
  if (duelActive && duelRemaining <= 0 && challengeOpen) {
    $('#challengeResult').className = 'draw';
    $('#challengeResult').textContent = '出牌阶段超时，裁判判定本局作废。';
    duelActive = false;
    setTimeout(() => { if (challengeOpen) closeChallenge(); }, 1200);
  }
}

function updateTowerClock(remaining) {
  if (!towerSecondHand || !towerMinuteHand) return;
  const exactRemaining = Math.max(0, (roundEndsAt - Date.now()) / 1000);
  towerSecondHand.rotation.z = -(exactRemaining % 60) / 60 * Math.PI * 2;
  towerMinuteHand.rotation.z = -(exactRemaining % (30 * 60)) / (30 * 60) * Math.PI * 2;
  towerSecondHand.scale.set(1.18, 1.18, 1.18);
  if (towerClockLabel) {
    const seconds = Math.ceil(exactRemaining);
    towerClockLabel.textContent = `远古计时钟 · ${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    const tick = Math.floor(exactRemaining);
    if (tick !== towerClockTick) {
      towerClockTick = tick;
      towerClockLabel.classList.toggle('clockTick', tick % 2 === 0);
    }
  }
  if (towerClockFace?.material) towerClockFace.material.emissiveIntensity = .25 + Math.sin(clock.elapsedTime * 3) * .08;
}

function updateHandHint() {
  const hint = $('#handHint');
  if (!hint) return;
  ensureHand(player);
  const text = ['rock', 'paper', 'scissors'].map((type) => `${cardIcon(type)}${player.hand[type] || 0}`).join('  ');
  hint.textContent = handTotal(player) > 0 ? `你的当前手牌：${text}（每次选择一张可用牌）` : '你的当前手牌：暂无，请等待牌库补给';
  hint.style.color = handTotal(player) > 0 ? 'var(--gold)' : 'var(--danger)';
}

function updateRpsButtons() {
  $$('#rpsButtons button').forEach((button) => {
    button.disabled = !duelReady || !hasHandCard(player, button.dataset.move);
  });
}

function renderDuelChat() {
  const log = $('#duelChatLog');
  if (!log) return;
  log.innerHTML = (activeOpponent?.chatMessages || []).slice(-24).map((entry) => `<div class="${entry.mine ? 'mine' : 'theirs'}"><b>${entry.mine ? '我' : activeOpponent.name || '对手'}：</b>${entry.text}</div>`).join('') || '<div>这是只属于赌桌两人的私密频道。</div>';
  log.scrollTop = log.scrollHeight;
}

function addDuelChat(text, mine = false) {
  if (!activeOpponent || !text) return;
  activeOpponent.chatMessages ||= [];
  activeOpponent.chatMessages.push({ text: String(text).slice(0, 120), mine });
  renderDuelChat();
}

function sendDuelChat() {
  const input = $('#duelChatInput');
  const text = input.value.trim();
  if (!text || !activeOpponent || !isRemote(activeOpponent) || !duelActive) return;
  addDuelChat(text, true);
  sendOnline({ type: 'duelChat', targetId: activeRemoteId, text });
  input.value = '';
}

function ensureVoicePeer() {
  if (voicePeer) return voicePeer;
  voicePeer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  voicePeer.onicecandidate = (event) => { if (event.candidate) sendOnline({ type: 'voiceSignal', targetId: voiceTargetId, payload: { type: 'candidate', candidate: event.candidate } }); };
  voicePeer.ontrack = (event) => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.srcObject = event.streams[0];
    audio.dataset.voiceAudio = 'true';
    document.body.appendChild(audio);
  };
  voicePeer.onconnectionstatechange = () => { $('#voiceStatus').textContent = `语音状态：${voicePeer.connectionState}`; };
  if (voiceStream) voiceStream.getTracks().forEach((track) => voicePeer.addTrack(track, voiceStream));
  return voicePeer;
}

async function startVoice() {
  if (!activeRemoteId || !duelActive) { $('#voiceStatus').textContent = '请先进入联机赌桌'; return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) { $('#voiceStatus').textContent = '当前浏览器不支持语音'; return; }
  try {
    voiceStream ||= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    voiceTargetId = activeRemoteId;
    const peer = ensureVoicePeer();
    $('#voiceStatus').textContent = '麦克风已开启，等待对手接通';
    if (String(onlineId) < String(activeRemoteId)) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendOnline({ type: 'voiceSignal', targetId: voiceTargetId, payload: { type: 'offer', sdp: offer } });
    }
  } catch (error) {
    $('#voiceStatus').textContent = error?.name === 'NotAllowedError' ? '麦克风权限被拒绝' : '语音启动失败';
  }
}

async function handleVoiceSignal(message) {
  if (!activeRemoteId || message.fromId !== activeRemoteId) return;
  voiceTargetId = message.fromId;
  const peer = ensureVoicePeer();
  const payload = message.payload || {};
  try {
    if (payload.type === 'offer') {
      if (!voiceStream) voiceStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!voicePeer) ensureVoicePeer();
      await peer.setRemoteDescription(payload.sdp);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      sendOnline({ type: 'voiceSignal', targetId: voiceTargetId, payload: { type: 'answer', sdp: answer } });
    } else if (payload.type === 'answer') await peer.setRemoteDescription(payload.sdp);
    else if (payload.type === 'candidate' && payload.candidate) await peer.addIceCandidate(payload.candidate);
  } catch { $('#voiceStatus').textContent = '语音连接协商失败'; }
}

function stopVoice() {
  voiceStream?.getTracks().forEach((track) => track.stop());
  voiceStream = null;
  voicePeer?.close();
  voicePeer = null;
  voiceTargetId = null;
  document.querySelectorAll('[data-voice-audio="true"]').forEach((audio) => audio.remove());
  if ($('#voiceStatus')) $('#voiceStatus').textContent = '仅限本桌两名玩家';
}

function ensureMeetingVoicePeer(peer) {
  if (!meetingVoiceRoomId || !peer?.id) return null;
  const existing = meetingVoicePeers.get(peer.id);
  if (existing) return existing;
  const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  connection.onicecandidate = (event) => {
    if (event.candidate) sendOnline({ type: 'meetingVoiceSignal', roomId: meetingVoiceRoomId, targetId: peer.id, payload: { type: 'candidate', candidate: event.candidate } });
  };
  connection.ontrack = (event) => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.srcObject = event.streams[0];
    audio.dataset.meetingVoiceAudio = peer.id;
    document.body.appendChild(audio);
  };
  if (meetingVoiceStream) meetingVoiceStream.getTracks().forEach((track) => connection.addTrack(track, meetingVoiceStream));
  meetingVoicePeers.set(peer.id, connection);
  return connection;
}

async function startMeetingVoice() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !onlineId) {
    $('#meetingVoiceStatus').textContent = '联机后才能开启多人语音';
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    $('#meetingVoiceStatus').textContent = '当前浏览器不支持语音';
    return;
  }
  try {
    meetingVoiceStream ||= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    meetingVoiceRoomId ||= `meeting-${onlineRoom || 'local'}`;
    sendOnline({ type: 'meetingVoiceJoin', roomId: meetingVoiceRoomId });
    $('#meetingVoiceStatus').textContent = '会议室语音已开启，房内玩家可加入';
    $('#meetingVoiceBtn').textContent = '关闭讨论语音';
  } catch (error) {
    $('#meetingVoiceStatus').textContent = error?.name === 'NotAllowedError' ? '麦克风权限被拒绝' : '语音启动失败';
  }
}

function stopMeetingVoice() {
  if (meetingVoiceRoomId) sendOnline({ type: 'meetingVoiceLeave', roomId: meetingVoiceRoomId });
  meetingVoicePeers.forEach((peer) => peer.close());
  meetingVoicePeers.clear();
  meetingVoiceStream?.getTracks().forEach((track) => track.stop());
  meetingVoiceStream = null;
  meetingVoiceRoomId = null;
  document.querySelectorAll('[data-meeting-voice-audio]').forEach((audio) => audio.remove());
  if ($('#meetingVoiceStatus')) $('#meetingVoiceStatus').textContent = '讨论室语音未开启';
  if ($('#meetingVoiceBtn')) $('#meetingVoiceBtn').textContent = '开启讨论语音';
}

async function handleMeetingVoiceSignal(message) {
  if (!meetingVoiceRoomId || message.roomId !== meetingVoiceRoomId) return;
  const remote = remotePlayers.get(message.fromId);
  const peerData = remote || { id: message.fromId, name: '会议室玩家' };
  const connection = ensureMeetingVoicePeer(peerData);
  if (!connection) return;
  const payload = message.payload || {};
  try {
    if (payload.type === 'offer') {
      if (!meetingVoiceStream) meetingVoiceStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (meetingVoiceStream && connection.getSenders().length === 0) meetingVoiceStream.getTracks().forEach((track) => connection.addTrack(track, meetingVoiceStream));
      await connection.setRemoteDescription(payload.sdp);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      sendOnline({ type: 'meetingVoiceSignal', roomId: meetingVoiceRoomId, targetId: message.fromId, payload: { type: 'answer', sdp: answer } });
    } else if (payload.type === 'answer') await connection.setRemoteDescription(payload.sdp);
    else if (payload.type === 'candidate' && payload.candidate) await connection.addIceCandidate(payload.candidate);
  } catch { $('#meetingVoiceStatus').textContent = '会议室语音连接协商失败'; }
}

function compareMoves(a, b) {
  if (a === b) return 'draw';
  return ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) ? 'win' : 'lose';
}

function moveName(move) { return { rock: '石头', paper: '布', scissors: '剪刀' }[move] || move; }
function isRemote(owner) { return Boolean(owner?.remote); }
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  playSound('notice');
}

function startAudio() {
  if (!audioEnabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    audioMaster = audioContext.createGain();
    audioMaster.gain.value = .075;
    audioMaster.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  if (!audioAmbientStarted) {
    const ambience = audioContext.createOscillator();
    const ambienceGain = audioContext.createGain();
    ambience.type = 'sine';
    ambience.frequency.value = 74;
    ambienceGain.gain.value = .08;
    ambience.connect(ambienceGain).connect(audioMaster);
    ambience.start();
    audioAmbientStarted = true;
  }
  startGeneratedMusic();
}

function stopGeneratedMusic() {
  if (generatedMusicTimer) window.clearInterval(generatedMusicTimer);
  generatedMusicTimer = null;
  generatedMusicStep = 0;
  if (musicBus && audioContext) {
    musicBus.gain.setTargetAtTime(.0001, audioContext.currentTime, .08);
    const oldBus = musicBus;
    window.setTimeout(() => { try { oldBus.disconnect(); } catch {} }, 260);
    musicBus = null;
  }
}

function startGeneratedMusic() {
  if (!musicEnabled || !audioContext || !audioMaster || generatedMusicTimer) return;
  musicBus = audioContext.createGain();
  musicBus.gain.value = 1.15;
  musicBus.connect(audioMaster);
  const chords = [
    [110, 138.59, 164.81],
    [98, 123.47, 146.83],
    [123.47, 155.56, 185],
    [87.31, 110, 130.81]
  ];
  const playPhrase = () => {
    if (!musicEnabled || !musicBus || !audioContext) return;
    const now = audioContext.currentTime + .035;
    const chord = chords[generatedMusicStep % chords.length];
    chord.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? .12 : .06, now + .16);
      gain.gain.exponentialRampToValueAtTime(.0001, now + 1.48);
      oscillator.connect(gain).connect(musicBus);
      oscillator.start(now);
      oscillator.stop(now + 1.54);
    });
    const pulse = audioContext.createOscillator();
    const pulseGain = audioContext.createGain();
    pulse.type = 'sine';
    pulse.frequency.setValueAtTime(generatedMusicStep % 2 ? 92 : 68, now);
    pulseGain.gain.setValueAtTime(.0001, now);
    pulseGain.gain.exponentialRampToValueAtTime(.2, now + .025);
    pulseGain.gain.exponentialRampToValueAtTime(.0001, now + .34);
    pulse.connect(pulseGain).connect(musicBus);
    pulse.start(now);
    pulse.stop(now + .38);
    generatedMusicStep += 1;
  };
  playPhrase();
  generatedMusicTimer = window.setInterval(playPhrase, 1500);
}

function playSound(name) {
  if (!audioEnabled || !audioContext || !audioMaster) return;
  const presets = {
    click: [420, 0.055, .24, 'square', 520],
    notice: [260, 0.09, .16, 'sine', 320],
    pickup: [520, 0.22, .28, 'triangle', 880],
    zone: [180, 0.28, .2, 'sine', 360],
    tick: [640, 0.07, .2, 'square', 640],
    go: [420, 0.28, .3, 'triangle', 840],
    win: [520, 0.36, .35, 'triangle', 1040],
    lose: [180, 0.32, .3, 'sawtooth', 90],
    draw: [320, 0.2, .22, 'sine', 320],
    deal: [580, 0.11, .2, 'triangle', 820],
    elevator: [170, 0.52, .22, 'sine', 420],
    rideStart: [240, 0.52, .24, 'sawtooth', 760],
    rideStop: [760, 0.3, .22, 'triangle', 240]
  };
  const [frequency, duration, volume, type, endFrequency] = presets[name] || presets.notice;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), now + duration);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain).connect(audioMaster);
  oscillator.start(now);
  oscillator.stop(now + duration + .02);
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  if (audioEnabled) {
    startAudio();
    if (audioMaster) audioMaster.gain.setTargetAtTime(.075, audioContext.currentTime, .04);
  } else if (audioMaster) audioMaster.gain.setTargetAtTime(.0001, audioContext.currentTime, .04);
  $('#soundBtn').textContent = audioEnabled ? '声音：开' : '声音：关';
}

function loadLocalMusic(file) {
  if (!file || !file.type.startsWith('audio/')) return;
  musicEnabled = true;
  startAudio();
  stopGeneratedMusic();
  localMusicAudio?.pause();
  if (localMusicUrl) URL.revokeObjectURL(localMusicUrl);
  localMusicUrl = URL.createObjectURL(file);
  localMusicAudio = new Audio(localMusicUrl);
  localMusicAudio.loop = true;
  localMusicAudio.volume = .28;
  localMusicAudio.play().then(() => {
    $('#musicStatus').textContent = `正在播放本地音频：${file.name}`;
    $('#musicBtn').textContent = '音乐：开';
  }).catch(() => { $('#musicStatus').textContent = '浏览器阻止自动播放，请再次点击音乐按钮'; });
}

function toggleLocalMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    startAudio();
    if (localMusicAudio) localMusicAudio.play().catch(() => {});
    else startGeneratedMusic();
    $('#musicStatus').textContent = localMusicAudio ? '正在播放本地授权音频' : '正在播放原创夜场氛围音乐';
  } else {
    localMusicAudio?.pause();
    stopGeneratedMusic();
    $('#musicStatus').textContent = '背景音乐已关闭，音效仍可单独使用';
  }
  $('#musicBtn').textContent = musicEnabled ? '音乐：开' : '音乐：关';
}

const activityLines = ['系统：夜场已开放', '提示：走到赌桌旁按 E 开始匹配'];
function pushActivity(message) {
  activityLines.unshift(message);
  activityLines.splice(4);
  $('#activityFeed').innerHTML = activityLines.map((line) => `<div>${line}</div>`).join('');
}

function rotateWorldEvent(dt) {
  eventTimer -= dt;
  if ($('#eventTimerText')) $('#eventTimerText').textContent = activeEvent && eventTimer > 0 ? `持续 ${Math.ceil(eventTimer)}s` : '即将切换';
  if (eventTimer > 0) return;
  activeEvent = nextContent('events', eventDefinitions) || eventDefinitions[Math.floor(Math.random() * eventDefinitions.length)];
  eventTimer = 26;
  const eventTone = { 裁判塔: 0xff587c, 黑市: 0x9f6bff, 银行: 0x63dfff, 无限监狱: 0xff3f68 }[activeEvent.zone] || 0xb85b82;
  warmLight.color.setHex(eventTone);
  warmLight.intensity = 34 + (activeEvent.bonus ? 5 : 0);
  purpleLight.color.setHex(eventTone);
  cameraShake = Math.max(cameraShake, .06);
  $('#eventTitle').textContent = activeEvent.title;
  $('#eventText').textContent = activeEvent.text;
  pushActivity(`事件：${activeEvent.title.replace('夜场事件 · ', '')}`);
}

function drawMiniMap() {
  const context = miniMapContext;
  const size = miniMapCanvas.width;
  const toMap = (value) => (value + mapLimit) / worldSize * size;
  context.clearRect(0, 0, size, size);
  context.fillStyle = '#081426';
  context.fillRect(0, 0, size, size);
  context.strokeStyle = 'rgba(104,229,255,.12)';
  context.lineWidth = 1;
  for (let value = -mapLimit; value <= mapLimit; value += 28) {
    context.beginPath(); context.moveTo(toMap(value), 0); context.lineTo(toMap(value), size); context.stroke();
    context.beginPath(); context.moveTo(0, toMap(value)); context.lineTo(size, toMap(value)); context.stroke();
  }
  zones.forEach((zone) => {
    const colors = { 黑市: '#9d65ff', 银行: '#39d9ff', 裁判塔: '#ffb554', 无限监狱: '#ff557f' };
    context.fillStyle = colors[zone.name] || '#6de7ff';
    context.globalAlpha = .35;
    context.beginPath(); context.arc(toMap(zone.x), toMap(zone.z), 12, 0, Math.PI * 2); context.fill();
    context.globalAlpha = .9;
  });
  tables.forEach((table) => {
    context.fillStyle = table.occupied ? '#ffd369' : '#5c7898';
    context.fillRect(toMap(table.position.x) - 3, toMap(table.position.z) - 3, 6, 6);
  });
  treasurePickups.forEach((pickup) => {
    context.fillStyle = '#ffd369';
    context.beginPath();
    context.arc(toMap(pickup.group.position.x), toMap(pickup.group.position.z), 2.2, 0, Math.PI * 2);
    context.fill();
  });
  const nearestLoot = nearestTreasure();
  if (nearestLoot) {
    context.strokeStyle = 'rgba(255,211,105,.88)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(toMap(nearestLoot.pickup.group.position.x), toMap(nearestLoot.pickup.group.position.z), 5 + Math.sin(clock.elapsedTime * 4) * 1.4, 0, Math.PI * 2);
    context.stroke();
  }
  npcs.forEach((npc) => {
    if (!npc.active || !npc.group.visible) return;
    context.fillStyle = npc.inPrison ? '#ff557f' : '#b4c3da';
    context.beginPath(); context.arc(toMap(npc.group.position.x), toMap(npc.group.position.z), 3, 0, Math.PI * 2); context.fill();
  });
  remotePlayers.forEach((remote) => {
    context.fillStyle = remote.inPrison ? '#ff557f' : '#bc8cff';
    context.beginPath(); context.arc(toMap(remote.group.position.x), toMap(remote.group.position.z), 4, 0, Math.PI * 2); context.fill();
  });
  context.fillStyle = '#68e5ff';
  context.beginPath(); context.arc(toMap(player.group.position.x), toMap(player.group.position.z), 5, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#68e5ff';
  context.beginPath();
  context.moveTo(toMap(player.group.position.x), toMap(player.group.position.z));
  context.lineTo(toMap(player.group.position.x + Math.sin(player.group.rotation.y) * 5), toMap(player.group.position.z + Math.cos(player.group.rotation.y) * 5));
  context.stroke();
}

function mapPoint(context, x, z, width, height) {
  return { x: (x + mapLimit) / worldSize * width, y: (z + mapLimit) / worldSize * height };
}

function drawDetailedMap() {
  if (!bigMapContext || !bigMapOpen) return;
  const context = bigMapContext;
  const width = bigMapCanvas.width;
  const height = bigMapCanvas.height;
  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0b1830');
  gradient.addColorStop(.5, '#101b32');
  gradient.addColorStop(1, '#170f28');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const toMap = (x, z) => mapPoint(context, x, z, width, height);
  context.strokeStyle = 'rgba(104,229,255,.1)';
  context.lineWidth = 1;
  for (let value = -mapLimit; value <= mapLimit; value += 20) {
    const vertical = toMap(value, -mapLimit);
    const horizontal = toMap(-mapLimit, value);
    context.beginPath(); context.moveTo(vertical.x, 0); context.lineTo(vertical.x, height); context.stroke();
    context.beginPath(); context.moveTo(0, horizontal.y); context.lineTo(width, horizontal.y); context.stroke();
  }

  const roadX = toMap(-mapLimit, 0);
  const roadXEnd = toMap(mapLimit, 0);
  const roadZ = toMap(0, -mapLimit);
  const roadZEnd = toMap(0, mapLimit);
  context.strokeStyle = 'rgba(151,91,173,.62)';
  context.lineWidth = Math.max(12, width / 70);
  context.beginPath(); context.moveTo(roadX.x, roadX.y); context.lineTo(roadXEnd.x, roadXEnd.y); context.stroke();
  context.beginPath(); context.moveTo(roadZ.x, roadZ.y); context.lineTo(roadZEnd.x, roadZEnd.y); context.stroke();
  context.strokeStyle = 'rgba(104,229,255,.34)';
  context.lineWidth = 2;
  context.setLineDash([10, 10]);
  context.beginPath(); context.moveTo(roadX.x, roadX.y); context.lineTo(roadXEnd.x, roadXEnd.y); context.stroke();
  context.beginPath(); context.moveTo(roadZ.x, roadZ.y); context.lineTo(roadZEnd.x, roadZEnd.y); context.stroke();
  context.setLineDash([]);

  worldBuildings.forEach((building) => {
    const topLeft = toMap(building.x - building.halfX, building.z - building.halfZ);
    const bottomRight = toMap(building.x + building.halfX, building.z + building.halfZ);
    context.fillStyle = building.color || 'rgba(89,112,151,.56)';
    context.strokeStyle = building.outline || 'rgba(177,205,232,.62)';
    context.lineWidth = 2;
    context.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    if (building.label) {
      context.fillStyle = '#dfeeff';
      context.font = '600 14px sans-serif';
      context.fillText(building.label, topLeft.x + 6, topLeft.y + 18);
    }
    if (building.door) {
      const door = toMap(building.door.x, building.door.z);
      context.fillStyle = '#ffd369';
      context.beginPath(); context.arc(door.x, door.y, 5, 0, Math.PI * 2); context.fill();
    }
  });

  zones.forEach((zone) => {
    const point = toMap(zone.x, zone.z);
    const colors = { 黑市: '#b68aff', 银行: '#68e5ff', 裁判塔: '#ffd369', 无限监狱: '#ff557f' };
    context.fillStyle = colors[zone.name] || '#b68aff';
    context.globalAlpha = .18;
    context.beginPath(); context.arc(point.x, point.y, Math.max(24, zone.radius / worldSize * width * 1.75), 0, Math.PI * 2); context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = colors[zone.name] || '#b68aff';
    context.lineWidth = 2;
    context.beginPath(); context.arc(point.x, point.y, 15, 0, Math.PI * 2); context.stroke();
    context.fillStyle = '#f2f7ff'; context.font = '600 14px sans-serif'; context.fillText(zone.name, point.x + 20, point.y + 5);
  });

  tables.forEach((table) => {
    const point = toMap(table.position.x, table.position.z);
    context.fillStyle = table.occupied ? '#ff7195' : '#ffd369';
    context.beginPath(); context.arc(point.x, point.y, 7, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#fff1b5'; context.lineWidth = 2; context.stroke();
    context.fillStyle = '#f2f7ff'; context.font = '12px sans-serif'; context.fillText(`牌桌${table.id}`, point.x + 10, point.y + 4);
  });

  treasurePickups.forEach((pickup) => {
    const point = toMap(pickup.group.position.x, pickup.group.position.z);
    context.fillStyle = '#fff0a8';
    context.beginPath(); context.moveTo(point.x, point.y - 7); context.lineTo(point.x + 6, point.y); context.lineTo(point.x, point.y + 7); context.lineTo(point.x - 6, point.y); context.closePath(); context.fill();
  });
  [...npcs, ...remotePlayers.values()].forEach((owner) => {
    if (!owner.active || !owner.group.visible) return;
    const point = toMap(owner.group.position.x, owner.group.position.z);
    context.fillStyle = owner.inPrison ? '#ff557f' : '#c79cff';
    context.beginPath(); context.arc(point.x, point.y, 5, 0, Math.PI * 2); context.fill();
  });
  const self = toMap(player.group.position.x, player.group.position.z);
  context.fillStyle = '#68e5ff'; context.beginPath(); context.arc(self.x, self.y, 9, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#d8fbff'; context.lineWidth = 3;
  context.beginPath(); context.moveTo(self.x, self.y); context.lineTo(self.x + Math.sin(player.group.rotation.y) * 24, self.y + Math.cos(player.group.rotation.y) * 24); context.stroke();
  context.fillStyle = '#effcff'; context.font = '700 15px sans-serif'; context.fillText('你', self.x + 13, self.y - 11);
}

function spawnImpact(position, color = 0xffd369) {
  cameraShake = Math.max(cameraShake, .18);
  const shockwave = new THREE.Mesh(new THREE.RingGeometry(.35, .48, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .88, side: THREE.DoubleSide, depthWrite: false }));
  shockwave.rotation.x = -Math.PI / 2;
  shockwave.position.copy(position);
  shockwave.position.y = .08;
  scene.add(shockwave);
  effects.push({ mesh: shockwave, life: .8, velocity: new THREE.Vector3(), ring: true });
  for (let i = 0; i < 18; i++) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(.04 + Math.random() * .05, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true }));
    particle.position.copy(position).add(new THREE.Vector3(0, 1.1, 0));
    scene.add(particle);
    effects.push({ mesh: particle, life: .65 + Math.random() * .55, velocity: new THREE.Vector3((Math.random() - .5) * 3, .6 + Math.random() * 2.5, (Math.random() - .5) * 3) });
  }
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    effect.life -= dt;
    effect.mesh.position.addScaledVector(effect.velocity, dt);
    effect.velocity.y -= 4.6 * dt;
    effect.mesh.material.opacity = Math.max(0, effect.life) * (effect.ring ? 1.05 : 1);
    if (effect.ring) effect.mesh.scale.setScalar(1 + (1 - Math.max(0, effect.life)) * 3.8);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      effects.splice(i, 1);
    }
  }
}

function addWorldLabel(text, x, z, y = 3.3, className = 'worldLabel', staticWorld = false) {
  const label = document.createElement('div');
  label.className = className;
  label.textContent = text;
  label.dataset.worldX = x;
  label.dataset.worldZ = z;
  label.dataset.worldY = y;
  if (staticWorld) label.dataset.staticWorld = 'true';
  labelLayer.appendChild(label);
  return label;
}

function addNeonPole(x, z, color, height = 5.5) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .24, height, 10), material(0x26344d, .42, .6));
  pole.position.set(x, height / 2, z);
  pole.castShadow = true;
  scene.add(pole);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), new THREE.MeshBasicMaterial({ color }));
  orb.position.set(x, height + .13, z);
  scene.add(orb);
  const useLight = !isMobileDevice || Math.round(Math.abs(x + z)) % 3 === 0;
  if (useLight) {
    const light = new THREE.PointLight(color, 5.2, 9, 2);
    light.position.set(x, height, z);
    scene.add(light);
    pulseLights.push({ light, base: 3.4, phase: x * .11 + z * .07 });
  }
}

function addLightBeam(x, z, color, height = 7, radius = 1.6) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * .2, radius, height, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.set(x, height / 2, z);
  scene.add(beam);
  const halo = new THREE.Mesh(new THREE.RingGeometry(radius * .58, radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .38, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(x, .34, z);
  scene.add(halo);
  zoneBeams.push({ beam, halo, baseOpacity: .075, phase: x * .08 + z * .04 });
}

function addStreetLantern(x, z, color = 0x68e5ff, height = 4.2) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.07, .13, height, 8), material(0x30435f, .5, .58));
  stem.position.y = height / 2;
  group.add(stem);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.72, .08, .08), material(0x405879, .42, .62));
  arm.position.set(.28, height - .18, 0);
  group.add(arm);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), new THREE.MeshBasicMaterial({ color }));
  lamp.position.set(.62, height - .2, 0);
  group.add(lamp);
  let light = null;
  if (!isMobileDevice || Math.round(Math.abs(x + z)) % 2 === 0) {
    light = new THREE.PointLight(color, 3.6, 7, 2);
    light.position.set(.62, height - .2, 0);
    group.add(light);
  }
  scene.add(group);
  if (light) pulseLights.push({ light, base: 2.8, phase: x * .12 + z * .06 });
}

function addCentralWalkwayDetails() {
  const walkwayColors = [0x68e5ff, 0xffd369, 0xff7195, 0x9ef2b8];
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2;
    const distance = 11.5 + (i % 2) * 2.8;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1.7, .05, .16), new THREE.MeshBasicMaterial({ color: walkwayColors[i % walkwayColors.length], transparent: true, opacity: .72 }));
    marker.position.set(x, .08, z);
    marker.rotation.y = -angle;
    scene.add(marker);
    if (i % 2 === 0) addStreetLantern(x * 1.48, z * 1.48, walkwayColors[i % walkwayColors.length], 3.2 + (i % 3) * .35);
  }
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(10.8, .12, 8, 96), new THREE.MeshBasicMaterial({ color: 0x68e5ff, transparent: true, opacity: .6 }));
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = .36;
  scene.add(innerRing);
}

function addSkyline() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(230, 40, 22), new THREE.MeshBasicMaterial({ color: 0x142748, side: THREE.BackSide }));
  scene.add(sky);
  const starPositions = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 145 + Math.random() * 72;
    starPositions[i * 3] = Math.cos(angle) * radius;
    starPositions[i * 3 + 1] = 18 + Math.random() * 42;
    starPositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xa8d7ff, size: .16, transparent: true, opacity: .8 })));
  const buildingColors = [0x1a3453, 0x214063, 0x2b4a6a, 0x1b3553, 0x3c2854, 0x203e4b];
  for (let i = 0; i < 72; i++) {
    const angle = i / 72 * Math.PI * 2;
    const radius = 112 + Math.random() * 34;
    const width = 3.4 + Math.random() * 6.4;
    const depth = 3.4 + Math.random() * 6.4;
    const height = 10 + Math.random() * 26;
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(buildingColors[i % buildingColors.length], .72, .34, i % 5 === 0 ? 0x11172b : 0x000000));
    building.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
    building.rotation.y = -angle + Math.PI / 2;
    building.castShadow = true;
    scene.add(building);
    for (let row = 0; row < Math.min(7, Math.floor(height / 2.7)); row++) {
      for (let column = -1; column <= 1; column += 1) {
        const window = new THREE.Mesh(new THREE.PlaneGeometry(.34, .13), new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffc865 : 0x4bdcff, transparent: true, opacity: .72 }));
        window.position.set(building.position.x + Math.cos(building.rotation.y) * column * 1.1, 2 + row * 2.55, building.position.z + Math.sin(building.rotation.y) * column * 1.1);
        window.rotation.y = building.rotation.y;
        scene.add(window);
      }
    }
    const roofBeacon = new THREE.Mesh(new THREE.ConeGeometry(.22, .9, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x68e5ff : 0xff7195 }));
    roofBeacon.position.set(building.position.x, height + .55, building.position.z);
    scene.add(roofBeacon);
    worldObstacles.push({ x: building.position.x, z: building.position.z, halfX: width / 2 + .5, halfZ: depth / 2 + .5 });
    if (i % 12 === 0) {
      const names = ['云屹科技 · 数据中枢', '梁小猪 · 夜场会员厅', '地下夜场广播塔', '档案观测站', '霓虹观景台', '失物回收所'];
      const title = names[(i / 12) % names.length];
      const inward = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle));
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * 1.35, 8.5), 1.05), new THREE.MeshBasicMaterial({ map: makeBannerTexture(title, i % 24 === 0 ? '#ffd369' : '#68e5ff'), transparent: true, side: THREE.DoubleSide }));
      banner.position.copy(building.position).addScaledVector(inward, depth / 2 + .06);
      banner.position.y = Math.min(height * .68, 13.2);
      banner.rotation.y = Math.atan2(inward.x, inward.z);
      scene.add(banner);
      addWorldLabel(title, banner.position.x, banner.position.z, banner.position.y + 1.3, 'worldLabel zoneLabel', true);
      skylineLandmarks.push({ id: `skyline-${i}`, title, position: banner.position.clone(), radius: 4.5, building });
      worldBuildings.push({ kind: 'landmark', x: building.position.x, z: building.position.z, halfX: width / 2, halfZ: depth / 2, label: title, color: 'rgba(24,55,88,.76)', outline: i % 24 === 0 ? '#ffd369' : '#68e5ff' });
    }
  }
}

function addDistantLandmarks() {
  const landmarks = [
    [-112, -78, 0x532a55, 20, '北境档案塔'], [118, -74, 0x223d5b, 26, '东侧广播塔'],
    [-116, 78, 0x3f2d58, 24, '西侧旧剧院'], [114, 86, 0x4b3443, 30, '南环观测站']
  ];
  landmarks.forEach(([x, z, color, height, label], index) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 5.2, 1.1, 8), material(0x10182b, .66, .45, color));
    base.position.y = .55; group.add(base);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.4, height, 8), material(color, .55, .42, color));
    shaft.position.y = height / 2 + 1; shaft.castShadow = true; group.add(shaft);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(2.6, .16, 8, 28), new THREE.MeshBasicMaterial({ color: index % 2 ? 0x68e5ff : 0xff7195, transparent: true, opacity: .7 }));
    crown.rotation.x = Math.PI / 2; crown.position.y = height + 1.1; group.add(crown);
    const beacon = new THREE.PointLight(index % 2 ? 0x68e5ff : 0xff7195, 7, 24, 2);
    beacon.position.y = height + 1.5; group.add(beacon);
    scene.add(group);
    addWorldLabel(label, x, z, height + 3, 'worldLabel zoneLabel', true);
    pulseLights.push({ light: beacon, base: 5.5, phase: index * .9 });
  });
}

function addRoadNetwork() {
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x241a2d, roughness: .9, metalness: .08 });
  const roadX = new THREE.Mesh(new THREE.PlaneGeometry(worldSize - 24, 8.2), roadMaterial);
  roadX.rotation.x = -Math.PI / 2;
  roadX.position.y = .025;
  scene.add(roadX);
  const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(8.2, worldSize - 24), roadMaterial);
  roadZ.rotation.x = -Math.PI / 2;
  roadZ.position.y = .026;
  scene.add(roadZ);
  for (let i = -mapLimit + 14; i <= mapLimit - 14; i += 7) {
    const markX = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .12), new THREE.MeshBasicMaterial({ color: 0x6b2a50, transparent: true, opacity: .62 }));
    markX.rotation.x = -Math.PI / 2;
    markX.position.set(i, .04, 0);
    scene.add(markX);
    const markZ = markX.clone();
    markZ.rotation.z = Math.PI / 2;
    markZ.position.set(0, .041, i);
    scene.add(markZ);
  }
  for (let i = -112; i <= 112; i += 28) {
    addStreetLantern(i, 5.25, i % 56 === 0 ? 0xff7195 : 0x68e5ff, 4.6);
    addStreetLantern(5.25, i, i % 56 === 0 ? 0xffd369 : 0x9d65ff, 4.6);
  }
}

function addDrones() {
  for (let i = 0; i < 4; i++) {
    const drone = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x68e5ff : 0xff8c63 }));
    drone.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.52, .035, 6, 24), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x68e5ff : 0xff8c63 }));
    ring.rotation.x = Math.PI / 2;
    drone.add(ring);
    drone.position.set((i - 1.5) * 18, 10 + i * 1.2, i % 2 ? -24 : 24);
    scene.add(drone);
    movingDrones.push({ group: drone, angle: i * 1.7, radius: 26 + i * 3, height: 9.5 + i * 1.3, speed: .12 + i * .025 });
  }
}

function createPowerTower() {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.6, .7, 40), material(0x1a2b46, .58, .38));
  base.position.y = .35;
  base.castShadow = true;
  scene.add(base);
  const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x38213f, roughness: .22, metalness: .52, transparent: true, opacity: .78, emissive: 0x270c2b, emissiveIntensity: .72 });
  const towerBody = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.3, 17.5, 12), towerMaterial);
  towerBody.position.y = 9.1;
  towerBody.castShadow = true;
  scene.add(towerBody);
  for (let i = 0; i < 5; i++) {
    const floorRing = new THREE.Mesh(new THREE.TorusGeometry(2.75 - i * .08, .065, 8, 40), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xa42a58 : 0x8d56b1 }));
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = 2.4 + i * 3.1;
    scene.add(floorRing);
  }
  for (let i = 0; i < 4; i++) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 17.8, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc42c5e : 0x8753b0 }));
    const angle = i / 4 * Math.PI * 2;
    column.position.set(Math.cos(angle) * 2.95, 9.1, Math.sin(angle) * 2.95);
    scene.add(column);
  }
  const crown = new THREE.Mesh(new THREE.ConeGeometry(2.1, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0x263a58, metalness: .6, roughness: .22, emissive: 0x142b4d, emissiveIntensity: .65 }));
  crown.position.y = 19.3;
  crown.castShadow = true;
  scene.add(crown);
  const beacon = new THREE.PointLight(0xb14b76, 8, 25, 2);
  beacon.position.set(0, 19.6, 1);
  scene.add(beacon);
  pulseLights.push({ light: beacon, base: 8, phase: 1.5 });

  const clockMaterial = new THREE.MeshStandardMaterial({ color: 0x111728, roughness: .3, metalness: .5, emissive: 0x4d300a, emissiveIntensity: .3 });
  towerClockFace = new THREE.Mesh(new THREE.CircleGeometry(2.35, 40), clockMaterial);
  towerClockFace.position.set(0, 21.7, 3.15);
  scene.add(towerClockFace);
  const clockRim = new THREE.Mesh(new THREE.TorusGeometry(2.48, .16, 10, 48), new THREE.MeshStandardMaterial({ color: 0xb48a43, roughness: .3, metalness: .72, emissive: 0x3a2308, emissiveIntensity: .45 }));
  clockRim.position.set(0, 21.7, 3.22);
  scene.add(clockRim);
  for (let i = 0; i < 12; i++) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(.08, .38, .055), new THREE.MeshBasicMaterial({ color: 0xffd369 }));
    const angle = i / 12 * Math.PI * 2;
    marker.position.set(Math.sin(angle) * 1.94, 21.7 + Math.cos(angle) * 1.94, 3.3);
    marker.rotation.z = -angle;
    scene.add(marker);
  }
  const minutePivot = new THREE.Group();
  minutePivot.position.set(0, 21.7, 3.4);
  const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(.11, 1.7, .07), new THREE.MeshBasicMaterial({ color: 0xffd369 }));
  minuteHand.position.y = .78;
  minutePivot.add(minuteHand);
  scene.add(minutePivot);
  towerMinuteHand = minutePivot;
  const secondPivot = new THREE.Group();
  secondPivot.position.set(0, 21.7, 3.46);
  const secondHand = new THREE.Mesh(new THREE.BoxGeometry(.055, 2.05, .08), new THREE.MeshBasicMaterial({ color: 0xff557f }));
  secondHand.position.y = 1;
  secondPivot.add(secondHand);
  scene.add(secondPivot);
  towerSecondHand = secondPivot;
  const axis = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a1 }));
  axis.position.set(0, 21.7, 3.52);
  scene.add(axis);
  towerClockLabel = addWorldLabel('远古计时钟 · 30:00', 0, 3.1, 25.0, 'worldLabel zoneLabel', true);
  towerCardLabel = addWorldLabel('✊ 0  ·  ✋ 0  ·  ✌️ 0', 0, 3.1, 18.8, 'worldLabel zoneLabel', true);
  const overseer = createReferee(1.15);
  overseer.position.set(0, 0, 4.25);
  overseer.rotation.y = Math.PI;
  scene.add(overseer);
  addWorldLabel('夜场执掌人', overseer.position.x, overseer.position.z, 3.65, 'worldLabel', true);
}

function updateScenePulse(time) {
  updateDayNight(time);
  ambientPulse = Math.sin(time * .55) * .5 + .5;
  pulseLights.forEach(({ light, base, phase }) => { light.intensity = base + Math.sin(time * 2.2 + phase) * .65; });
  zoneBeams.forEach(({ beam, halo, baseOpacity, phase }) => {
    beam.material.opacity = baseOpacity + Math.sin(time * 1.5 + phase) * .022;
    halo.material.opacity = .28 + ambientPulse * .16;
    halo.rotation.z += .0008;
  });
  floatingProps.forEach(({ mesh, baseY, amplitude, speed, phase }) => {
    mesh.position.y = baseY + Math.sin(time * speed + phase) * amplitude;
    mesh.rotation.y += .0025;
  });
  movingDrones.forEach((drone) => {
    drone.angle += drone.speed * .016;
    drone.group.position.set(Math.cos(drone.angle) * drone.radius, drone.height + Math.sin(time * 1.5 + drone.angle) * .55, Math.sin(drone.angle) * drone.radius);
    drone.group.rotation.y += .012;
  });
  outdoorRides.forEach((ride) => {
    if (ride.type === 'roller' && ride.cart) {
      ride.angle = (ride.angle + .7 * .016) % (Math.PI * 2);
      ride.cart.position.set(Math.cos(ride.angle) * 8.5, 3.6 + Math.sin(ride.angle) * 2.1, Math.sin(ride.angle) * 4.9);
      ride.cart.rotation.y = -ride.angle;
    }
    if (ride.type === 'bumper') ride.group.rotation.y += .0012;
    if (ride.type === 'wheel') ride.group.rotation.y += .0022;
  });
  if (towerCardLabel) towerCardLabel.style.opacity = `${.72 + ambientPulse * .22}`;
}

function setDayNightMode(mode = 'night', announce = true) {
  dayNightMode = ['night', 'day', 'cycle'].includes(mode) ? mode : 'night';
  dayNightApplied = '';
  if (announce) showToast(dayNightMode === 'cycle' ? '昼夜模式：自动循环' : dayNightMode === 'day' ? '昼夜模式：白天' : '昼夜模式：夜晚');
  if ($('#dayNightBtn')) $('#dayNightBtn').textContent = dayNightMode === 'cycle' ? '昼夜：循环' : dayNightMode === 'day' ? '昼夜：白天' : '昼夜：夜晚';
}

function updateDayNight(time) {
  const phase = dayNightMode === 'cycle' ? (Math.sin(time * .035) + 1) / 2 : dayNightMode === 'day' ? 1 : 0;
  const key = `${dayNightMode}:${Math.round(phase * 20)}`;
  if (key === dayNightApplied) return;
  dayNightApplied = key;
  const nightColor = new THREE.Color(0x111528); const dayColor = new THREE.Color(0x7e9fbd);
  scene.background.copy(nightColor).lerp(dayColor, phase);
  scene.fog.color.copy(new THREE.Color(0x2a3148)).lerp(new THREE.Color(0xa8c2cf), phase);
  skyLight.intensity = 1.1 + phase * 1.18;
  ambientLight.intensity = .36 + phase * .42;
  moon.intensity = .55 + (1 - phase) * 2.1;
  warmLight.intensity = 10 + (1 - phase) * 24;
  cyanLight.intensity = 9 + (1 - phase) * 22;
  purpleLight.intensity = 10 + (1 - phase) * 24;
  if (typeof bloodLight !== 'undefined' && bloodLight) bloodLight.intensity = (1 - phase) * 12;
  if (bloodMoonMesh) bloodMoonMesh.visible = phase < .78;
  if (moonHaloMesh) moonHaloMesh.visible = phase < .78;
  document.body.dataset.timeOfDay = phase > .58 ? 'day' : 'night';
}

function addDarkFantasyAtmosphere() {
const bloodMoon = new THREE.Mesh(
    new THREE.SphereGeometry(8.4, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0x5a1028, transparent: true, opacity: .82 })
  );
  bloodMoon.position.set(-34, 32, -54);
  scene.add(bloodMoon);
  bloodMoonMesh = bloodMoon;
  const moonHalo = new THREE.Mesh(
    new THREE.RingGeometry(9.5, 11.4, 48),
    new THREE.MeshBasicMaterial({ color: 0x7d1c43, transparent: true, opacity: .22, side: THREE.DoubleSide })
  );
  moonHalo.position.copy(bloodMoon.position);
  moonHalo.rotation.y = Math.PI * .12;
  scene.add(moonHalo);
  moonHaloMesh = moonHalo;
  bloodLight = new THREE.PointLight(0x9f244d, 12, 58, 2);
  bloodLight.position.copy(bloodMoon.position);
  scene.add(bloodLight);
  pulseLights.push({ light: bloodLight, base: 12, phase: 2.2 });
  addWorldLabel('血月 · 夜场审判', bloodMoon.position.x, bloodMoon.position.z, 42, 'worldLabel zoneLabel', true);

  const rune = new THREE.Mesh(
    new THREE.RingGeometry(7.1, 7.22, 64),
    new THREE.MeshBasicMaterial({ color: 0x8e2149, transparent: true, opacity: .8, side: THREE.DoubleSide })
  );
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = .34;
  scene.add(rune);
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const sigil = new THREE.Mesh(new THREE.ConeGeometry(.16, .65, 4), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x9b2851 : 0x4b1b65 }));
    sigil.position.set(Math.cos(angle) * 7.45, .5, Math.sin(angle) * 7.45);
    sigil.rotation.y = angle;
    scene.add(sigil);
  }

  const monolithPositions = [[-19, -18], [19, -18], [-20, 18], [20, 18], [-45, -5], [45, 5]];
  monolithPositions.forEach(([x, z], index) => {
    const height = 5.5 + (index % 3) * 1.35;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.45, .38, 8), material(0x0b0912, .82, .5));
    base.position.y = .19;
    group.add(base);
    const stone = new THREE.Mesh(new THREE.ConeGeometry(.86, height, 5), new THREE.MeshStandardMaterial({ color: 0x120d1a, roughness: .78, metalness: .32, emissive: 0x260d22, emissiveIntensity: .6 }));
    stone.position.y = height / 2 + .36;
    stone.rotation.y = index * .8;
    stone.castShadow = true;
    group.add(stone);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(.075, height * .48, .05), new THREE.MeshBasicMaterial({ color: 0xc12e59 }));
    slit.position.set(0, height * .54, -.78);
    group.add(slit);
    const glow = new THREE.PointLight(0x8f2049, 2.8, 8, 2);
    glow.position.y = height * .55;
    group.add(glow);
    scene.add(group);
  });

  const mistPositions = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 48;
    mistPositions[i * 3] = Math.cos(angle) * radius;
    mistPositions[i * 3 + 1] = .45 + Math.random() * 3.5;
    mistPositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const mistGeometry = new THREE.BufferGeometry();
  mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
  scene.add(new THREE.Points(mistGeometry, new THREE.PointsMaterial({ color: 0x8b315e, size: .22, transparent: true, opacity: .28, depthWrite: false })));
  for (let i = 0; i < 10; i++) {
    const sigil = new THREE.Group();
    const angle = i / 10 * Math.PI * 2;
    const radius = 16 + (i % 3) * 3.5;
    sigil.position.set(Math.cos(angle) * radius, 2.4 + (i % 4) * .7, Math.sin(angle) * radius);
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(.28 + (i % 3) * .06, 1), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x4e82a8 : 0x7c3c79, roughness: .26, metalness: .65, emissive: i % 2 ? 0x183b57 : 0x3b123d, emissiveIntensity: .8 }));
    shard.rotation.z = angle;
    sigil.add(shard);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.52, .025, 6, 24), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x68e5ff : 0xff7195, transparent: true, opacity: .66 }));
    halo.rotation.x = Math.PI / 2;
    sigil.add(halo);
    scene.add(sigil);
    floatingProps.push({ mesh: sigil, baseY: sigil.position.y, amplitude: .28, speed: .8 + (i % 3) * .2, phase: i * .7 });
  }
}

function addZone(x, z, color, name, description, interactionPoint = null) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, .24, 36), material(0x15233b, .78, .25));
  base.position.set(x, .12, z);
  base.receiveShadow = true;
  scene.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.85, .09, 8, 56), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, .28, z);
  scene.add(ring);
  for (let i = 0; i < 4; i++) {
    const angle = i / 4 * Math.PI * 2;
    addNeonPole(x + Math.cos(angle) * 4.5, z + Math.sin(angle) * 4.5, color, 3.7);
  }
  const gateway = new THREE.Group();
  gateway.position.set(x, 0, z - 5.7);
  [-2.3, 2.3].forEach((offset) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(.42, 4.6, .42), material(0x263a58, .48, .55, color));
    pillar.position.set(offset, 2.3, 0);
    gateway.add(pillar);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(.38, 1), new THREE.MeshBasicMaterial({ color }));
    cap.position.set(offset, 4.8, 0);
    gateway.add(cap);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.1, .28, .34), material(0x334b6f, .38, .62, color));
  lintel.position.y = 4.25;
  gateway.add(lintel);
  scene.add(gateway);
  addLightBeam(x, z, color, 6.6, 2.25);
  const labelX = interactionPoint?.x ?? x;
  const labelZ = interactionPoint?.z ?? z;
  zones.push({ x, z, name, description, radius: 6, interactionX: labelX, interactionZ: labelZ, label: addWorldLabel(name, labelX, labelZ, 4.4, 'worldLabel zoneLabel', true) });
}

function makeGraffitiTexture(baseColor = '#273650', accentColor = '#b74d78', seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, baseColor); gradient.addColorStop(.52, '#111a2b'); gradient.addColorStop(1, '#30182f');
  context.fillStyle = gradient; context.fillRect(0, 0, 512, 512);
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
  for (let i = 0; i < 780; i++) {
    context.fillStyle = `rgba(${Math.floor(90 + random() * 80)},${Math.floor(100 + random() * 70)},${Math.floor(140 + random() * 90)},${.035 + random() * .09})`;
    context.fillRect(random() * 512, random() * 512, 1 + random() * 9, 1 + random() * 4);
  }
  context.strokeStyle = accentColor; context.globalAlpha = .32; context.lineWidth = 7;
  context.beginPath(); context.arc(140, 190, 78, .2, Math.PI * 1.78); context.stroke();
  context.beginPath(); context.arc(375, 320, 94, Math.PI * 1.04, Math.PI * 1.86); context.stroke();
  context.globalAlpha = .62; context.lineWidth = 4;
  context.beginPath(); context.moveTo(80, 390); context.lineTo(210, 110); context.lineTo(300, 390); context.stroke();
  context.beginPath(); context.moveTo(300, 110); context.lineTo(428, 390); context.stroke();
  context.fillStyle = accentColor; context.globalAlpha = .8;
  context.font = '700 42px sans-serif'; context.fillText('NIGHT', 38, 74);
  context.font = '700 25px sans-serif'; context.fillText('NO EXIT', 330, 460);
  context.globalAlpha = .24; context.strokeStyle = '#f7d68f'; context.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    context.beginPath(); context.moveTo(30 + i * 55, 512); context.lineTo(90 + i * 55, 0); context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.25, 1);
  return texture;
}

function makeBannerTexture(text, accent = '#68e5ff', background = '#101a31') {
  const canvas = document.createElement('canvas');
  canvas.width = 960; canvas.height = 180;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 960, 0);
  gradient.addColorStop(0, background); gradient.addColorStop(.5, '#1b2744'); gradient.addColorStop(1, '#0b1123');
  context.fillStyle = gradient; context.fillRect(0, 0, 960, 180);
  context.strokeStyle = accent; context.globalAlpha = .55; context.lineWidth = 4;
  context.strokeRect(12, 12, 936, 156);
  context.globalAlpha = 1; context.fillStyle = accent; context.font = '700 42px Microsoft YaHei, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 480, 90);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBuildingWall(group, x, y, z, width, height, depth, texture, obstacle) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: .78, metalness: .18, emissive: 0x150d1d, emissiveIntensity: .24, side: THREE.DoubleSide }));
  wall.position.set(x, y, z); wall.castShadow = true; wall.receiveShadow = true; group.add(wall);
  worldObstacles.push({ x: group.position.x + x, z: group.position.z + z, halfX: width / 2 + .15, halfZ: depth / 2 + .15 });
  if (obstacle) obstacle.push(wall);
  return wall;
}

function addInteriorObstacle(group, x, z, halfX, halfZ, padding = .16) {
  worldObstacles.push({ x: group.position.x + x, z: group.position.z + z, halfX: halfX + padding, halfZ: halfZ + padding });
}

function addParkStations(group, { width, depth, height }) {
  const games = [
    ['park-22', '星盘五子棋', 0x68e5ff], ['park-04', '暗箱记忆牌阵', 0xff7195],
    ['park-16', '封条拆解', 0xffd369], ['park-06', '镜像迷宫', 0x9ef2b8],
    ['park-12', '三段广播', 0xb68aff], ['park-18', '逆光剪影', 0xffa35c],
    ['park-10', '双影投骰', 0x68e5ff], ['park-15', '失焦拼图', 0xff7195],
    ['park-21', '地标寻光', 0xffd369], ['park-23', '暗夜二十一点', 0x9ef2b8],
    ['park-24', '五张牌换牌局', 0xb68aff], ['park-09', '高楼摆钟', 0xffa35c]
  ];
  const wallPositions = [
    ...[-17, -5.7, 5.7, 17].map((x) => ({ x, z: -depth / 2 + 2.45, side: 'back', rotation: 0, inward: new THREE.Vector3(0, 0, 1) })),
    ...[-13, -4.4, 4.4, 13].map((z) => ({ x: width / 2 - 2.45, z, side: 'right', rotation: -Math.PI / 2, inward: new THREE.Vector3(-1, 0, 0) })),
    ...[-13, -4.4, 4.4, 13].map((z) => ({ x: -width / 2 + 2.45, z, side: 'left', rotation: Math.PI / 2, inward: new THREE.Vector3(1, 0, 0) }))
  ];
  games.forEach(([gameId, title, color], index) => {
    const placement = wallPositions[index];
    const { x, z } = placement;
    const table = new THREE.Group();
    table.position.set(x, 0, z);
    table.rotation.y = placement.rotation;
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.7, .24, 1.55), new THREE.MeshStandardMaterial({ color: 0x202c45, roughness: .38, metalness: .5, emissive: color, emissiveIntensity: .18 }));
    top.position.y = 1.02; top.castShadow = true; table.add(top);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(4.82, .06, 1.66), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .78 }));
    edge.position.y = 1.16; table.add(edge);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .68), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .78, side: THREE.DoubleSide }));
    screen.position.set(0, 1.52, -.62); screen.rotation.x = -.08; table.add(screen);
    [-1, 1].forEach((side) => {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(.7, .68, .7), new THREE.MeshStandardMaterial({ color: side < 0 ? 0x172238 : 0x40233e, roughness: .62, metalness: .25 }));
      chair.position.set(side * 1.65, .38, 1.08); chair.castShadow = true; table.add(chair);
    });
    const lamp = new THREE.PointLight(color, 3.8, 7.5, 2);
    lamp.position.set(0, 2.55, 0); table.add(lamp);
    group.add(table);
    addInteriorObstacle(group, x, z, 2.45, 1.1, .16);
    const stationPosition = new THREE.Vector3(group.position.x + x, 0, group.position.z + z).addScaledVector(placement.inward, 2.15);
    const station = { id: `park-station-${index + 1}`, gameId, title, color, group: table, position: stationPosition, lamp, wallSide: placement.side };
    station.label = addWorldLabel(title, stationPosition.x, stationPosition.z, 2.55, 'worldLabel parkStationLabel', true);
    parkStations.push(station);

    const wallSign = new THREE.Mesh(new THREE.PlaneGeometry(4.9, .72), new THREE.MeshBasicMaterial({ map: makeBannerTexture(title, `#${color.toString(16).padStart(6, '0')}`), transparent: true, side: THREE.DoubleSide }));
    if (placement.side === 'back') wallSign.position.set(x, Math.min(height - 1.05, 8.5), -depth / 2 + .25);
    if (placement.side === 'right') { wallSign.position.set(width / 2 - .25, Math.min(height - 1.05, 8.5), z); wallSign.rotation.y = -Math.PI / 2; }
    if (placement.side === 'left') { wallSign.position.set(-width / 2 + .25, Math.min(height - 1.05, 8.5), z); wallSign.rotation.y = Math.PI / 2; }
    group.add(wallSign);
  });
}

function addOutdoorPlayground() {
  const baseX = 78;
  const baseZ = -108;
  const ground = new THREE.Mesh(new THREE.BoxGeometry(54, .22, 32), new THREE.MeshStandardMaterial({ color: 0x1d263b, roughness: .88, metalness: .18, emissive: 0x160d24, emissiveIntensity: .32 }));
  ground.position.set(baseX, .11, baseZ); ground.receiveShadow = true; scene.add(ground);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(50, 28), new THREE.MeshStandardMaterial({ color: 0x293750, roughness: .48, metalness: .34, emissive: 0x161b38, emissiveIntensity: .12, side: THREE.DoubleSide }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(baseX, .24, baseZ); scene.add(plaza);
  for (let stripe = -2; stripe <= 2; stripe += 1) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(48, .08), new THREE.MeshBasicMaterial({ color: stripe % 2 ? 0x68e5ff : 0xff7195, transparent: true, opacity: .26 }));
    lane.rotation.x = -Math.PI / 2; lane.position.set(baseX, .29, baseZ + stripe * 5.2); scene.add(lane);
  }
  const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x263c5a, roughness: .42, metalness: .66, emissive: 0x183653, emissiveIntensity: .35 });
  [[baseX, baseZ - 16, 54, .25], [baseX - 17, baseZ + 16, 20, .25], [baseX + 17, baseZ + 16, 20, .25], [baseX - 27, baseZ, .25, 32], [baseX + 27, baseZ, .25, 32]].forEach(([x, z, sx, sz]) => {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(sx, 2.5, sz), fenceMaterial); fence.position.set(x, 1.25, z); fence.castShadow = true; scene.add(fence);
    worldObstacles.push({ x, z, halfX: sx / 2, halfZ: sz / 2 });
  });
  outdoorEntry = { title: '室外游乐场入口', position: new THREE.Vector3(baseX, 0, baseZ + 16), radius: 5.5 };
  addLightBeam(baseX, baseZ + 16, 0x9ef2b8, 5.8, 2.4);
  addNeonPole(baseX - 2.6, baseZ + 16, 0x9ef2b8, 4.5);
  addNeonPole(baseX + 2.6, baseZ + 16, 0x9ef2b8, 4.5);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.7), new THREE.MeshBasicMaterial({ map: makeBannerTexture('室外游乐场 · 只体验不领奖', '#9ef2b8', '#12243b'), transparent: true, side: THREE.DoubleSide }));
  sign.position.set(baseX, 5.1, baseZ - 15.7); scene.add(sign);
  addWorldLabel('室外游乐场', baseX, baseZ - 18.5, 5.4, 'worldLabel zoneLabel', true);
  addWorldLabel('入口 · 可进入', baseX, baseZ + 18.1, 3.4, 'worldLabel zoneLabel', true);
  const roller = new THREE.Group(); roller.position.set(baseX - 12, 0, baseZ + 1.5); scene.add(roller);
  const track = new THREE.Mesh(new THREE.TorusGeometry(8.5, .2, 10, 72), new THREE.MeshStandardMaterial({ color: 0x833d79, roughness: .32, metalness: .72, emissive: 0x40152f, emissiveIntensity: .7 }));
  track.rotation.x = Math.PI / 2; track.scale.y = .58; roller.add(track);
  for (let i = 0; i < 8; i++) { const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.12, .2, 4.2, 8), fenceMaterial); const angle = i / 8 * Math.PI * 2; pillar.position.set(Math.cos(angle) * 8.5, 2.1, Math.sin(angle) * 4.9); roller.add(pillar); }
  const cart = new THREE.Mesh(new THREE.BoxGeometry(.8, .42, 1.15), new THREE.MeshStandardMaterial({ color: 0xffd369, metalness: .5, roughness: .35, emissive: 0x6b3118, emissiveIntensity: .45 })); roller.add(cart);
  const rollerRide = { id: 'outdoor-roller', title: '过山车', position: new THREE.Vector3(baseX - 12, 0, baseZ + 1.5), group: roller, cart, angle: 0, type: 'roller' };
  outdoorRides.push(rollerRide); addWorldLabel('过山车', rollerRide.position.x, rollerRide.position.z, 6.8, 'worldLabel zoneLabel', true);
  const bumper = new THREE.Group(); bumper.position.set(baseX + 13, 0, baseZ + 1.5); scene.add(bumper);
  const arena = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, .35, 40), new THREE.MeshStandardMaterial({ color: 0x242f48, roughness: .7, metalness: .25, emissive: 0x14223c, emissiveIntensity: .35 })); arena.position.y = .18; bumper.add(arena);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(9.5, .18, 10, 64), new THREE.MeshStandardMaterial({ color: 0x68e5ff, metalness: .75, roughness: .25, emissive: 0x154e72, emissiveIntensity: .9 })); rail.rotation.x = Math.PI / 2; rail.position.y = .55; bumper.add(rail);
  const bumperCars = [];
  for (let i = 0; i < 6; i++) { const car = new THREE.Mesh(new THREE.BoxGeometry(1.45, .42, 1.1), new THREE.MeshStandardMaterial({ color: [0xff7195, 0x68e5ff, 0xffd369][i % 3], metalness: .58, roughness: .32, emissive: 0x24132d, emissiveIntensity: .4 })); const angle = i / 6 * Math.PI * 2; car.position.set(Math.cos(angle) * 6.3, .65, Math.sin(angle) * 6.3); bumper.add(car); bumperCars.push(car); }
  const bumperRide = { id: 'outdoor-bumper', title: '碰碰车', position: new THREE.Vector3(baseX + 13, 0, baseZ + 1.5), group: bumper, type: 'bumper', cars: bumperCars, playerCar: bumperCars[0] };
  outdoorRides.push(bumperRide); addWorldLabel('碰碰车', bumperRide.position.x, bumperRide.position.z, 5.4, 'worldLabel zoneLabel', true);
  const wheel = new THREE.Group(); wheel.position.set(baseX, 0, baseZ + 9); scene.add(wheel);
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(7.2, .24, 12, 48), new THREE.MeshStandardMaterial({ color: 0xb68aff, metalness: .72, roughness: .25, emissive: 0x3d1f55, emissiveIntensity: .7 })); wheelRing.rotation.y = Math.PI / 2; wheelRing.position.y = 7.2; wheel.add(wheelRing);
  const wheelCabins = [];
  for (let i = 0; i < 8; i++) { const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, .82, 1.15), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x68e5ff : 0xff7195, metalness: .38, roughness: .38, emissive: 0x24152e, emissiveIntensity: .42 })); const angle = i / 8 * Math.PI * 2; cabin.position.set(Math.cos(angle) * 7.2, 7.2 + Math.sin(angle) * 7.2, 0); wheel.add(cabin); wheelCabins.push(cabin); }
  const wheelRide = { id: 'outdoor-wheel', title: '夜场摩天轮', position: new THREE.Vector3(baseX, 0, baseZ + 9), group: wheel, type: 'wheel', cabins: wheelCabins, playerCabin: wheelCabins[0] };
  outdoorRides.push(wheelRide); addWorldLabel('夜场摩天轮', wheelRide.position.x, wheelRide.position.z, 15.4, 'worldLabel zoneLabel', true);
}

function addVerticalFacility({ x, z, width, depth, height, floors, label, accent }) {
  const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
  const materialWall = new THREE.MeshStandardMaterial({ color: 0x25344d, roughness: .42, metalness: .52, emissive: accent, emissiveIntensity: .18 });
  const glass = new THREE.MeshStandardMaterial({ color: accent, roughness: .12, metalness: .28, transparent: true, opacity: .23, emissive: accent, emissiveIntensity: .35 });
  const floorHeight = height / floors;
  for (let floorIndex = 0; floorIndex < floors; floorIndex += 1) {
    const y = floorIndex * floorHeight;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width - .5, .18, depth - .5), material(0x18253a, .55, .46, accent));
    slab.position.y = y + .08; slab.receiveShadow = true; group.add(slab);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(width - 1.1, .07, .07), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .82 }));
    rail.position.set(0, y + 1.05, depth / 2 - .48); group.add(rail);
    for (let window = -2; window <= 2; window += 1) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1.1, width / 6), Math.max(1.1, floorHeight * .48)), glass);
      pane.position.set(window * width * .17, y + floorHeight * .55, -depth / 2 - .03); pane.rotation.y = Math.PI; group.add(pane);
    }
  }
  const cornerPositions = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [-width / 2, depth / 2], [width / 2, depth / 2]];
  cornerPositions.forEach(([cx, cz]) => {
    const column = new THREE.Mesh(new THREE.BoxGeometry(.42, height + .65, .42), materialWall);
    column.position.set(cx, height / 2, cz); column.castShadow = true; group.add(column);
    worldObstacles.push({ x: x + cx, z: z + cz, halfX: .34, halfZ: .34 });
  });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, .22), materialWall); backWall.position.set(0, height / 2, -depth / 2); backWall.castShadow = true; group.add(backWall); cameraOccluders.push(backWall);
  worldObstacles.push({ x, z: z - depth / 2, halfX: width / 2, halfZ: .16 });
  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(.22, height, depth), materialWall); wall.position.set(side * width / 2, height / 2, 0); wall.castShadow = true; group.add(wall); cameraOccluders.push(wall);
    worldObstacles.push({ x: x + side * width / 2, z, halfX: .16, halfZ: depth / 2 });
  });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.6, height + .25, 2.6), new THREE.MeshStandardMaterial({ color: 0x101a2d, roughness: .26, metalness: .72, emissive: accent, emissiveIntensity: .18 }));
  shaft.position.set(0, height / 2, 0); group.add(shaft);
  const lift = new THREE.Mesh(new THREE.BoxGeometry(2.1, .18, 2.1), new THREE.MeshStandardMaterial({ color: 0xd8e8f4, roughness: .18, metalness: .74, emissive: accent, emissiveIntensity: .26 }));
  lift.position.y = .25; lift.castShadow = true; group.add(lift);
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 1), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .78 })); beacon.position.y = height + 1.1; group.add(beacon);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * .72, 12), 1.05), new THREE.MeshBasicMaterial({ map: makeBannerTexture(label, `#${accent.toString(16).padStart(6, '0')}`), transparent: true, side: THREE.DoubleSide })); sign.position.set(0, 2.1, depth / 2 + .12); group.add(sign);
  const facility = { id: `facility-${label}`, kind: 'vertical', title: label, x, z, width, depth, height, floors, floorHeight, group, lift, elevatorPosition: new THREE.Vector3(x, 0, z), currentFloor: 0, accent, entry: new THREE.Vector3(x, 0, z + depth / 2 + 2.1), deckY: height + .6, liftTravel: null };
  verticalFacilities.push(facility);
  worldBuildings.push({ kind: 'facility', x, z, halfX: width / 2, halfZ: depth / 2, height, label, door: { x, z: z + depth / 2 + .5 }, color: 'rgba(32,52,79,.78)', outline: accent });
  addWorldLabel(label, x, z + depth / 2 + .62, height + 1.25, 'worldLabel zoneLabel venueLabel', true);
  addWorldLabel('电梯 · 可上楼', x, z + .3, 2.4, 'worldLabel entranceLabel', true);
  addWorldLabel('顶层瞭望台', x, z, height + 2.4, 'worldLabel zoneLabel', true);
  return facility;
}

function addVerticalFacilities() {
  addVerticalFacility({ x: -82, z: -101, width: 27, depth: 23, height: 22, floors: 4, label: '雾港瞭望台', accent: 0x68e5ff });
  addVerticalFacility({ x: -39, z: -104, width: 23, depth: 19, height: 16, floors: 3, label: '旧钟楼观景层', accent: 0xffd369 });
}

function enterRideExperience(ride) {
  if (!ride || !player.group || activeRideExperience) return;
  activeRideExperience = { ride, startedAt: performance.now(), duration: ride.type === 'roller' ? 22000 : ride.type === 'wheel' ? 30000 : 0, originalCameraMode: cameraMode, originalCameraDistance: cameraDistance, originalCameraPitch: cameraPitch, originalPosition: player.group.position.clone() };
  player.group.visible = true;
  playerGrounded = true;
  playerFloorY = 0;
  cameraMode = 3;
  cameraDistance = 5.5;
  cameraPitch = .22;
  if (ride.type === 'bumper' && ride.playerCar) {
    ride.playerCar.position.set(0, .65, 0);
    ride.playerCar.rotation.y = 0;
  }
  updateRideSeat();
  showToast(`已入座${ride.title}：现在是 3D 实体体验，${ride.type === 'bumper' ? '方向键/摇杆可驾驶' : '行动键可随时下车'}`);
  pushActivity(`室外游乐场：玩家已进入${ride.title}实体座舱`);
  playSound('rideStart');
}

function updateRideSeat() {
  const experience = activeRideExperience;
  if (!experience || !player.group) return;
  const ride = experience.ride;
  const seatObject = ride.type === 'roller' ? ride.cart : ride.type === 'bumper' ? ride.playerCar : ride.playerCabin;
  if (!seatObject) return;
  ride.group.updateMatrixWorld(true);
  const position = new THREE.Vector3(); seatObject.getWorldPosition(position);
  player.group.position.copy(position);
  player.group.position.y += ride.type === 'wheel' ? -.5 : .82;
  player.group.rotation.y = seatObject.rotation.y + ride.group.rotation.y;
}

function exitRideExperience() {
  const experience = activeRideExperience;
  if (!experience) return;
  const ride = experience.ride;
  player.group.position.set(ride.position.x + 4.5, 0, ride.position.z + 4.5);
  playerFloorY = 0; playerElevatorFacility = null; playerGrounded = true;
  cameraMode = experience.originalCameraMode;
  cameraDistance = experience.originalCameraDistance;
  cameraPitch = experience.originalCameraPitch;
  activeRideExperience = null;
  showToast(`已离开${ride.title}，回到游乐场地面`);
  pushActivity(`室外游乐场：玩家离开${ride.title}实体座舱`);
  playSound('rideStop');
}

function updateRideExperience(time) {
  const experience = activeRideExperience;
  if (!experience) return;
  const ride = experience.ride;
  const elapsed = performance.now() - experience.startedAt;
  if (ride.type === 'bumper' && ride.playerCar) {
    const steerX = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0) + joystickInput.x;
    const steerZ = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0) + joystickInput.z;
    ride.playerCar.position.x = THREE.MathUtils.clamp(ride.playerCar.position.x + steerX * .12, -8.1, 8.1);
    ride.playerCar.position.z = THREE.MathUtils.clamp(ride.playerCar.position.z + steerZ * .12, -8.1, 8.1);
    if (ride.playerCar.position.length() > 8.2) ride.playerCar.position.setLength(8.2);
    ride.playerCar.rotation.y = Math.atan2(steerX, steerZ || 1);
    ride.group.updateMatrixWorld(true);
  }
  updateRideSeat();
  if (experience.duration && elapsed > experience.duration) exitRideExperience();
}

function nearestVerticalFacility() {
  let best = null; let distance = Infinity;
  verticalFacilities.forEach((facility) => {
    const d = player.group.position.distanceTo(facility.elevatorPosition);
    if (d < distance) { best = facility; distance = d; }
  });
  return best ? { facility: best, distance } : null;
}

function useFacilityElevator(facility) {
  if (!facility || !player.group) return;
  if (facility.liftTravel) { showToast('电梯正在运行，请稍候'); return; }
  const nextFloor = (facility.currentFloor + 1) % facility.floors;
  facility.currentFloor = nextFloor;
  const targetFloorY = nextFloor * facility.floorHeight;
  const targetLiftY = targetFloorY + .25;
  playerFloorY = targetFloorY;
  player.group.position.set(facility.x, facility.lift.position.y - .25, facility.z + .8);
  facility.liftTravel = { from: facility.lift.position.y, to: targetLiftY, startedAt: performance.now(), duration: 1000 };
  playerElevatorFacility = facility;
  setCameraMode(nextFloor === facility.floors - 1 ? 1 : 2);
  if (nextFloor === facility.floors - 1) { cameraDistance = 56; cameraPitch = 1.26; }
  showToast(`${facility.title}：电梯到达第 ${nextFloor + 1} 层${nextFloor === facility.floors - 1 ? '，已进入瞭望台' : ''}`);
  pushActivity(`垂直设施：乘坐${facility.title}电梯到达第 ${nextFloor + 1} 层`);
  playSound('elevator');
}

function updateElevators() {
  verticalFacilities.forEach((facility) => {
    if (!facility.liftTravel) return;
    const progress = THREE.MathUtils.clamp((performance.now() - facility.liftTravel.startedAt) / facility.liftTravel.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    facility.lift.position.y = THREE.MathUtils.lerp(facility.liftTravel.from, facility.liftTravel.to, eased);
    if (playerElevatorFacility === facility) player.group.position.y = facility.lift.position.y - .25;
    if (progress >= 1) facility.liftTravel = null;
  });
}

function addVenueBuilding({ x, z, width, depth, height, color, accent, label, seed }) {
  const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
  const isPark = label === '夜场游乐园';
  const texture = makeGraffitiTexture(color, accent, seed);
  const wallThickness = .42;
  const wallParts = [];
  const wallY = height / 2;
  addBuildingWall(group, 0, wallY, -depth / 2, width, height, wallThickness, texture, wallParts);
  addBuildingWall(group, -width / 2, wallY, 0, wallThickness, height, depth, texture, wallParts);
  addBuildingWall(group, width / 2, wallY, 0, wallThickness, height, depth, texture, wallParts);
  const doorWidth = 2.8;
  const sideWidth = (width - doorWidth) / 2;
  addBuildingWall(group, -(doorWidth + sideWidth) / 2, wallY, depth / 2, sideWidth, height, wallThickness, texture, wallParts);
  addBuildingWall(group, (doorWidth + sideWidth) / 2, wallY, depth / 2, sideWidth, height, wallThickness, texture, wallParts);
  cameraOccluders.push(...wallParts);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width - .7, .16, depth - .7), new THREE.MeshStandardMaterial({ color: 0x171c2c, roughness: .82, metalness: .24, emissive: accent, emissiveIntensity: .035 }));
  floor.position.y = .08; floor.receiveShadow = true; group.add(floor);
  const floorInset = new THREE.Mesh(new THREE.PlaneGeometry(width - 2.1, depth - 2.1), new THREE.MeshStandardMaterial({ color: 0x202b42, roughness: .48, metalness: .38, emissive: accent, emissiveIntensity: .07, side: THREE.DoubleSide }));
  floorInset.rotation.x = -Math.PI / 2; floorInset.position.y = .175; group.add(floorInset);
  for (let index = -3; index <= 3; index += 1) {
    const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(.035, depth - 2.5), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .22 }));
    floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(index * Math.min(3.2, width * .12), .19, 0); group.add(floorGlow);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + .7, .3, depth + .7), new THREE.MeshStandardMaterial({ color: 0x0d1321, roughness: .62, metalness: .55, emissive: 0x1a0c25, emissiveIntensity: .28 }));
  roof.position.y = height + .15; roof.castShadow = true; group.add(roof);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width - 1.1, depth - 1.1), new THREE.MeshStandardMaterial({ color: 0x111a2a, roughness: .66, metalness: .32, emissive: accent, emissiveIntensity: .12, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height - .08;
  group.add(ceiling);
  cameraOccluders.push(ceiling);
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.18, .22, depth - 1.8), new THREE.MeshStandardMaterial({ color: 0x263854, roughness: .46, metalness: .48, emissive: accent, emissiveIntensity: .16 }));
    beam.position.set(i * width * .25, height - .32, 0);
    beam.castShadow = true;
    group.add(beam);
  }
  for (let i = -1; i <= 1; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3.6, width * .22), .06, 1.1), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .58 }));
    panel.position.set(i * width * .25, height - .19, 0);
    group.add(panel);
  }
  const doorFrame = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: accent, metalness: .72, roughness: .28, emissive: accent, emissiveIntensity: .55 });
  [-1, 1].forEach((side) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(.2, height * .72, .18), frameMaterial);
    jamb.position.set(side * (doorWidth / 2 + .12), height * .36, depth / 2 + .08);
    jamb.castShadow = true;
    doorFrame.add(jamb);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + .45, .2, .18), frameMaterial);
  lintel.position.set(0, height * .72, depth / 2 + .08);
  lintel.castShadow = true;
  doorFrame.add(lintel);
  group.add(doorFrame);
  const doorGlow = new THREE.PointLight(accent, 8, 13, 2); doorGlow.position.set(0, 2.2, depth / 2 + .6); group.add(doorGlow);
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(width + .16, .09, .12), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .86 }));
  roofTrim.position.set(0, height + .38, depth / 2 - .35); group.add(roofTrim);
  const sideTrim = roofTrim.clone();
  sideTrim.rotation.y = Math.PI / 2;
  sideTrim.scale.x = depth / width;
  sideTrim.position.set(width / 2 - .35, height + .38, 0); group.add(sideTrim);
  const signPlate = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * .72, 8), .7), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .22 }));
  signPlate.position.set(0, height * .82, depth / 2 + .12); group.add(signPlate);
  for (let i = 0; i < 3; i++) {
    const window = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.2), new THREE.MeshBasicMaterial({ color: i % 2 ? accent : 0x68e5ff, transparent: true, opacity: .55 }));
    window.position.set(-width * .27 + i * width * .27, height * .64, -depth / 2 - .23); window.rotation.y = Math.PI; group.add(window);
  }
  if (!isPark) {
    const tableWidth = Math.min(6.2, width * .38);
    const tableDepth = 1.45;
    const tableZ = -depth * .16;
    const innerTable = new THREE.Mesh(new THREE.BoxGeometry(tableWidth, .22, tableDepth), new THREE.MeshStandardMaterial({ color: 0x2c3d58, roughness: .46, metalness: .42, emissive: accent, emissiveIntensity: .16 }));
    innerTable.position.set(0, 1.05, tableZ); innerTable.castShadow = true; group.add(innerTable);
    addInteriorObstacle(group, 0, tableZ, tableWidth / 2, tableDepth / 2, .2);
    [-tableWidth * .38, tableWidth * .38].forEach((chairX) => {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(.72, .75, .72), new THREE.MeshStandardMaterial({ color: 0x151b2c, roughness: .66, metalness: .22 }));
      chair.position.set(chairX, .42, tableZ); chair.castShadow = true; group.add(chair);
      addInteriorObstacle(group, chairX, tableZ, .36, .36, .14);
    });
  }
  const consoleWidth = Math.min(2.5, width * .2);
  const consoleZ = -depth * .3;
  const console = new THREE.Mesh(new THREE.BoxGeometry(consoleWidth, 1.25, .46), new THREE.MeshStandardMaterial({ color: 0x121827, roughness: .32, metalness: .58, emissive: accent, emissiveIntensity: .2 }));
  console.position.set(width * .28, .68, consoleZ); console.castShadow = true; group.add(console);
  addInteriorObstacle(group, width * .28, consoleZ, consoleWidth / 2, .23, .14);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .72), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .82 }));
  screen.position.set(width * .28, 1.38, consoleZ - .26); screen.rotation.x = -.12; group.add(screen);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.12, .28, .14, 14), new THREE.MeshBasicMaterial({ color: accent }));
  lamp.position.set(-width * .24, height - .46, .2); group.add(lamp);
  const interiorLight = new THREE.PointLight(accent, 12, Math.max(width, depth) * 1.35, 2); interiorLight.position.set(0, height - .7, 0); group.add(interiorLight);
  [-1, 1].forEach((side) => {
    const wallLight = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.5, .08), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .78 }));
    wallLight.position.set(side * (width / 2 - .35), 3.1, -depth * .12); group.add(wallLight);
    const wallGlow = new THREE.PointLight(accent, 2.6, 5.4, 2); wallGlow.position.copy(wallLight.position); group.add(wallGlow);
  });
  const wallSigil = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.6, width * .36), Math.min(2.1, height * .28)), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .2, side: THREE.DoubleSide }));
  wallSigil.position.set(-width * .28, height * .48, depth / 2 - .23);
  wallSigil.rotation.y = Math.PI;
  group.add(wallSigil);
  for (let i = 0; i < 4; i++) {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, width * .55, 6), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .45 }));
    cable.rotation.z = i % 2 ? .11 : -.11;
    cable.position.set((i - 1.5) * width * .22, height + .08 + (i % 2) * .12, 0);
    group.add(cable);
  }
  const door = { x, z: z + depth / 2 + .4 };
  worldBuildings.push({ kind: 'venue', x, z, halfX: width / 2, halfZ: depth / 2, height, label, door, color: 'rgba(70,91,126,.7)', outline: accent });
  addWorldLabel(label, door.x, door.z + .42, height + .9, 'worldLabel zoneLabel venueLabel', true);
  addWorldLabel('入口 · 靠近后查看功能', door.x, door.z + .18, 2.35, 'worldLabel entranceLabel', true);
  if (label === '夜场游乐园') addParkStations(group, { width, depth, height });
  return group;
}

function addVenueBuildings() {
  addVenueBuilding({ x: -50, z: 30, width: 24, depth: 18, height: 8.5, color: '#382c60', accent: '#b68aff', label: '黑市交易所', seed: 11 });
  addVenueBuilding({ x: 50, z: -30, width: 24, depth: 18, height: 8.5, color: '#213b59', accent: '#68e5ff', label: '银钥银行', seed: 23 });
  addVenueBuilding({ x: 51, z: 30, width: 26, depth: 20, height: 9.5, color: '#513b32', accent: '#ffd369', label: '裁判塔前厅', seed: 37 });
  addVenueBuilding({ x: 76, z: 58, width: 30, depth: 24, height: 10, color: '#243a4c', accent: '#9ef2b8', label: '推理社', seed: 67 });
  addVenueBuilding({ x: -78, z: 58, width: 32, depth: 25, height: 9.2, color: '#3f2a51', accent: '#ff7195', label: '会议室', seed: 79 });
  addVenueBuilding({ x: 78, z: -62, width: 48, depth: 38, height: 11.6, color: '#34324d', accent: '#ffd369', label: '夜场游乐园', seed: 97 });
}

function addWorld() {
  addSkyline();
  addDarkFantasyAtmosphere();
  addDistantLandmarks();
  addRoadNetwork();
  addDrones();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), material(0x21182b, .93, .06));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(worldSize - 8, 140, 0x9b456b, 0x4e345a);
  grid.position.y = .015;
  grid.material.transparent = true;
  grid.material.opacity = .42;
  scene.add(grid);
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(mapLimit - 8, .12, 8, 240), new THREE.MeshBasicMaterial({ color: 0x326087 }));
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = .05;
  scene.add(outerRing);
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * Math.PI * 2;
    addNeonPole(Math.cos(angle) * (mapLimit - 9), Math.sin(angle) * (mapLimit - 9), i % 2 ? 0x38d9ff : 0xb77bff, 3.1 + (i % 3) * .7);
  }
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 10.1, .25, 64), material(0x1a1022, .72, .3));
  platform.position.y = .13;
  platform.receiveShadow = true;
  scene.add(platform);
  const platformRing = new THREE.Mesh(new THREE.TorusGeometry(8.9, .06, 8, 96), new THREE.MeshBasicMaterial({ color: 0xa5285a }));
  platformRing.rotation.x = Math.PI / 2;
  platformRing.position.y = .3;
  scene.add(platformRing);
  createPowerTower();
  addCentralWalkwayDetails();
  addZone(-50, 30, 0x9d65ff, '黑市', '结盟、交易和购买道具', { x: -50, z: 39.4 });
  addZone(50, -30, 0x39d9ff, '银行', '借贷会带来收益，也会带来逾期风险', { x: 50, z: -20.4 });
  addZone(51, 30, 0xffb554, '裁判塔', '查看淘汰记录与当前警戒', { x: 51, z: 40.6 });
  addZone(-50, -30, 0xff557f, '无限监狱', '只有支付 300 金币才能离开', { x: -50, z: -23.7 });
  addZone(76, 58, 0x9ef2b8, '推理社', '案件档案、海龟汤与多阶段线索推理', { x: 76, z: 70.2 });
  addZone(-78, 58, 0xff7195, '会议室', '多人讨论、投票与情报交换', { x: -78, z: 70.7 });
  addZone(78, -62, 0xffd369, '夜场游乐园', '随机小游戏与轮换奖励', { x: 78, z: -48.4 });
  addVenueBuildings();
  addOutdoorPlayground();
  addVerticalFacilities();
  for (let i = 0; i < 58; i++) {
    const x = (Math.random() - .5) * 238;
    const z = (Math.random() - .5) * 238;
    if (Math.hypot(x, z) < 13 || isInsidePrison({ x, z }, 2) || zones.some((zone) => Math.hypot(x - zone.x, z - zone.z) < 8) || worldBuildings.some((building) => Math.abs(x - building.x) < building.halfX + 3 && Math.abs(z - building.z) < building.halfZ + 3)) continue;
    const height = .35 + Math.random() * 1.5;
    const width = 1.2 + Math.random() * 2.8;
    const depth = 1.2 + Math.random() * 2.8;
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(i % 3 ? 0x172b46 : 0x203957, .84, .14));
    block.position.set(x, height / 2, z);
    block.rotation.y = Math.random() * Math.PI;
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    worldObstacles.push({ x, z, halfX: width / 2 + .65, halfZ: depth / 2 + .65 });
  }
}

function isInsidePrison(position, padding = 0) {
  return Math.abs(position.x - prison.center.x) < prison.halfX + padding && Math.abs(position.z - prison.center.z) < prison.halfZ + padding;
}

function isBlockedByObstacle(position, padding = 0) {
  return worldObstacles.some((obstacle) => Math.abs(position.x - obstacle.x) < obstacle.halfX + padding && Math.abs(position.z - obstacle.z) < obstacle.halfZ + padding);
}

function addPrison() {
  const group = new THREE.Group();
  group.position.copy(prison.center);
  prison.group = group;
  scene.add(group);
  worldBuildings.push({ x: prison.center.x, z: prison.center.z, halfX: prison.halfX, halfZ: prison.halfZ, label: '无限监狱', door: { x: prison.center.x, z: prison.center.z + prison.halfZ + .4 }, color: 'rgba(94,36,68,.76)', outline: '#ff557f' });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(11.4, .18, 10.5), material(0x262b3d, .9, .1));
  floor.position.y = .09;
  floor.receiveShadow = true;
  group.add(floor);
  const wall = material(0x242d44, .78, .18);
  [[0, 1.8, -5.1, 11.4, 3.6, .22], [-5.6, 1.8, 0, .22, 3.6, 10.5], [5.6, 1.8, 0, .22, 3.6, 10.5]].forEach(([x, y, z, sx, sy, sz]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wall);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
  });
  const prisonTexture = makeGraffitiTexture('#2b2037', '#ff557f', 151);
  [[0, 2.55, -5.23, 10.4, .9, .03], [-5.72, 2.55, 0, .03, .9, 9.4], [5.72, 2.55, 0, .03, .9, 9.4]].forEach(([x, y, z, sx, sy, sz]) => {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(sx || .03, sy || .03), new THREE.MeshStandardMaterial({ map: prisonTexture, transparent: true, opacity: .72, emissive: 0x260c20, emissiveIntensity: .38, side: THREE.DoubleSide }));
    banner.position.set(x, y, z);
    if (sx < sy) banner.rotation.y = Math.PI / 2;
    group.add(banner);
  });
  for (let i = -21; i <= 21; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3.35, 8), new THREE.MeshStandardMaterial({ color: 0x74849c, metalness: .85, roughness: .23 }));
    bar.position.set(i * .25, 1.72, 5.1);
    bar.castShadow = true;
    group.add(bar);
  }
  const alarm = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff3d67 }));
  alarm.position.set(0, 3.8, 0);
  group.add(alarm);
  const alarmLight = new THREE.PointLight(0xff3d67, 6, 12, 2);
  alarmLight.position.set(0, 3.7, 0);
  group.add(alarmLight);
  addWorldLabel('裁判监管 · 无限监狱', prison.center.x, prison.center.z, 5.2, 'worldLabel', true);
  const guard = createReferee(.82);
  guard.position.set(prison.center.x + 7.5, 0, prison.center.z + 5.5);
  guard.rotation.y = Math.PI;
  scene.add(guard);
  addWorldLabel('监狱守卫', guard.position.x, guard.position.z, 3.1, 'worldLabel', true);
}

function addTable(id, x, z, color) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.9, .3, 36), material(0x202c45, .58, .35));
  top.position.y = 1;
  top.castShadow = true;
  group.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.52, .055, 8, 52), new THREE.MeshBasicMaterial({ color }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.17;
  group.add(rim);
  const center = new THREE.Mesh(new THREE.CylinderGeometry(.62, .72, .08, 28), new THREE.MeshStandardMaterial({ color: 0x2c4567, roughness: .3, metalness: .4, emissive: color, emissiveIntensity: .22 }));
  center.position.y = 1.2;
  group.add(center);
  const cardColors = [0xe6edf8, 0xffd7df, 0xc8f4ff];
  cardColors.forEach((cardColor, index) => {
    const card = new THREE.Mesh(new THREE.BoxGeometry(.32, .035, .5), new THREE.MeshStandardMaterial({ color: cardColor, roughness: .42, metalness: .08, emissive: color, emissiveIntensity: .08 }));
    const angle = index / cardColors.length * Math.PI * 2;
    card.position.set(Math.cos(angle) * .34, 1.27, Math.sin(angle) * .34);
    card.rotation.y = angle + .3;
    card.rotation.x = (index - 1) * .08;
    card.castShadow = true;
    group.add(card);
  });
  const holoRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, .025, 8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .24 }));
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.y = 1.35;
  group.add(holoRing);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(.25, .43, 1, 14), material(0x101827, .65, .42));
  leg.position.y = .5;
  leg.castShadow = true;
  group.add(leg);
  [-1, 1].forEach((side) => {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(.44, .5, .22, 18), material(side < 0 ? 0x31517d : 0x713d5d, .6, .23));
    seat.position.set(side * 2.32, .32, 0);
    seat.castShadow = true;
    group.add(seat);
  });
  const lamp = new THREE.PointLight(color, 5.6, 8, 2);
  lamp.position.y = 2.4;
  group.add(lamp);
  const referee = createReferee(.56);
  referee.position.set(0, 0, 2.05);
  referee.rotation.y = Math.PI;
  group.add(referee);
  scene.add(group);
  const table = { id, position: new THREE.Vector3(x, 0, z), group, color, lamp, referee, holoRing, state: '空闲', label: null, occupied: false };
  worldObstacles.push({ x, z, halfX: 1.92, halfZ: 1.92 });
  table.label = addWorldLabel(`赌桌 ${id} · 空闲`, x, z, 3.6, 'worldLabel', true);
  tables.push(table);
  return table;
}

function addTables() {
  addTable(1, -6.2, 5.5, 0xffd369);
  addTable(2, 6.2, 5.5, 0x62e5ff);
  addTable(3, -6.2, -5.5, 0xff7195);
  addTable(4, 6.2, -5.5, 0x9ef2b8);
  addTable(5, 0, 15, 0xb68aff);
  addTable(6, 0, -15, 0xffa35c);
}

function setTableState(table, state) {
  if (!table) return;
  table.state = state;
  table.occupied = state !== '空闲';
  table.label.textContent = `赌桌 ${table.id} · ${state}`;
  table.lamp.intensity = state === '空闲' ? 2.1 : 6.2;
  table.referee.position.y = state === '裁判结算' ? .15 : 0;
  if (table.holoRing) {
    table.holoRing.material.opacity = state === '空闲' ? .18 : state === '裁判结算' ? .86 : .54;
    table.holoRing.scale.setScalar(state === '裁判结算' ? 1.18 : 1);
  }
}

function tableSeat(table, side) { return new THREE.Vector3(table.position.x + side * 2.32, 0, table.position.z); }

function addActors() {
  player.group = createCharacter(0x2b9bd1, 0x68e5ff, 1.07);
  player.group.position.set(0, 0, 9);
  scene.add(player.group);
  createStars(player);
  player.hand = { ...STARTING_HAND };
  ensureHand(player);
  player.label = addWorldLabel('玩家', 0, 9, 3.4);
  const data = [
    ['赤猿', 0xb94b53, 0xff9d83, -15, -6, '赌徒'], ['蓝鲸', 0x3866b5, 0x86d9ff, 15, -5, '掮客'], ['金熊', 0xb98c32, 0xffdc83, 0, -23, '收藏家'],
    ['灰狼', 0x63718b, 0xb8c8e5, -21, 8, '观察者'], ['白鸽', 0x9aa7b8, 0xffffff, 21, 8, '调停者'], ['墨蛇', 0x3d7c69, 0x91f3bf, -16, 22, '黑市客'], ['铜蟹', 0xa95f37, 0xffb47d, 17, 21, '追猎者']
  ];
  data.forEach(([name, color, accent, x, z, role], index) => {
    const bot = { name, role, color, accent, stars: 3, coins: 120, treasures: [{ id: `bot-loot-${index}`, name: index % 2 ? '旧王徽记' : '银色怀表', value: 100 + (index % 3) * 40 }], hand: { ...STARTING_HAND }, card: null, trust: 34 + index * 9, allied: false, betrayed: false, alive: true, active: true, inPrison: false, eliminated: false, seated: false, activity: '探索中', targetKind: 'roam', phase: index * 1.7, nextThink: 0, target: new THREE.Vector3(x, 0, z), group: createCharacter(color, accent, 1.05), label: null, starMeshes: [] };
    ensureHand(bot);
    bot.group.position.set(x, 0, z);
    bot.group.userData.npc = bot;
    scene.add(bot.group);
    createStars(bot);
    bot.label = addWorldLabel(`${name} · ${role}`, x, z, 3.35);
    npcs.push(bot);
  });
}

function addDatabaseActors() {
  const library = Array.isArray(contentDatabase.npcs) ? contentDatabase.npcs : [];
  if (!library.length) return addActors();
  player.group = createCharacter(0x2b9bd1, 0x68e5ff, 1.07);
  player.group.position.set(0, 0, 9);
  scene.add(player.group);
  createStars(player);
  player.hand = { ...STARTING_HAND };
  ensureHand(player);
  player.label = addWorldLabel('玩家', 0, 9, 3.4);
  const positions = [
    [-15, -6], [15, -5], [0, -23], [-21, 8], [21, 8], [-16, 22], [17, 21],
    [-62, 0], [62, 0], [-18, 74], [18, 74], [0, -82], [-102, -72], [104, -70],
    [-108, 88], [108, 96], [-96, -98], [96, -100], [-38, 112], [44, 112]
  ];
  library.forEach((entry, index) => {
    const [x, z] = positions[index % positions.length];
    const color = safeColor(entry.color, 0x516985);
    const accent = safeColor(entry.accent, 0x68e5ff);
    const trust = Math.min(92, 28 + (index % 8) * 8 + (entry.temperament === 'peaceful' ? 14 : 0));
    const loot = contentDatabase.treasures?.[index % Math.max(1, contentDatabase.treasures.length)];
    const bot = { id: entry.id || `npc-${index + 1}`, name: entry.name || `NPC-${index + 1}`, role: entry.role || '场内角色', temperament: entry.temperament || 'cautious', color, accent, stars: 3, coins: 120 + (index % 4) * 20, treasures: loot ? [{ id: `bot-loot-${entry.id || index}`, name: loot.name, value: Number(loot.value) || 100 }] : [], hand: { ...STARTING_HAND }, card: null, trust, allied: false, betrayed: false, alive: true, active: true, inPrison: false, eliminated: false, seated: false, activity: '探索中', targetKind: 'roam', phase: index * 1.17, nextThink: 0, target: new THREE.Vector3(x, 0, z), group: createCharacter(color, accent, 1.05), label: null, starMeshes: [] };
    ensureHand(bot);
    bot.group.position.set(x, 0, z);
    bot.group.userData.npc = bot;
    scene.add(bot.group);
    createStars(bot);
    bot.label = addWorldLabel(`${bot.name} · ${bot.role}`, x, z, 3.35);
    npcs.push(bot);
  });
  pushActivity(`NPC 数据库：载入 ${library.length} 个角色，人机将根据性格轮换行动`);
}

function createRemotePlayer(data) {
  if (!data?.id || data.id === onlineId) return null;
  const remote = { ...data, remote: true, group: createCharacter(safeColor(data.color, 0x7b65d6), safeColor(data.accent, 0xd7a8ff), 1.05), starMeshes: [], label: null, seated: false, inPrison: Boolean(data.inPrison), alive: data.alive !== false, stars: Number.isFinite(data.stars) ? data.stars : 3 };
  remote.group.position.set(Number(data.x) || 0, 0, Number(data.z) || 0);
  remote.group.rotation.y = Number(data.rot) || 0;
  remote.group.visible = !remote.leftSafely;
  scene.add(remote.group);
  createStars(remote);
  remote.label = addWorldLabel(data.name || '联机玩家', remote.group.position.x, remote.group.position.z, 3.35);
  remote.label.style.display = remote.leftSafely ? 'none' : 'block';
  remotePlayers.set(data.id, remote);
  syncBotFill();
  return remote;
}

function removeRemotePlayer(id) {
  const remote = remotePlayers.get(id);
  if (!remote) return;
  scene.remove(remote.group);
  remote.label?.remove();
  remotePlayers.delete(id);
  syncBotFill();
  if (activeRemoteId === id) closeChallenge();
}

function syncBotFill() {
  const botLimit = Math.max(0, 7 - remotePlayers.size);
  npcs.forEach((bot, index) => {
    bot.active = index < botLimit || bot.inPrison || bot.seated;
    if (!bot.inPrison && !bot.seated && bot !== activeOpponent) {
      bot.group.visible = bot.active;
      bot.label.style.display = bot.active ? 'block' : 'none';
    }
  });
}

function chooseBotDestination(bot) {
  const roll = Math.random();
  if (roll < .28 && tables.length) {
    const table = tables[Math.floor(Math.random() * tables.length)];
    const angle = Math.random() * Math.PI * 2;
    bot.target.set(table.position.x + Math.cos(angle) * 3.8, 0, table.position.z + Math.sin(angle) * 3.8);
    bot.targetKind = 'table';
    bot.activity = '寻找赌桌';
    return;
  }
  if (roll < .5 && zones.length) {
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const targetX = zone.interactionX ?? zone.x;
    const targetZ = zone.interactionZ ?? zone.z;
    bot.target.set(targetX + (Math.random() - .5) * 2.2, 0, targetZ + (Math.random() - .5) * 1.4);
    bot.targetKind = 'zone';
    bot.activity = `${zone.name}活动`;
    return;
  }
  if (roll < .68 && treasurePickups.size) {
    const candidates = [...treasurePickups.values()];
    const pickup = candidates[Math.floor(Math.random() * candidates.length)];
    bot.target.copy(pickup.group.position);
    bot.target.y = 0;
    bot.targetKind = 'treasure';
    bot.activity = '搜寻宝物';
    return;
  }
  const x = (Math.random() - .5) * 82;
  const z = (Math.random() - .5) * 82;
  bot.target.set(THREE.MathUtils.clamp(x, -47, 47), 0, THREE.MathUtils.clamp(z, -47, 47));
  bot.targetKind = 'roam';
  bot.activity = '巡游观察';
}

function updateBots(dt, time) {
  npcs.forEach((bot) => {
    if (!bot.active || !bot.alive || bot.inPrison || bot.seated) return;
    if (time > bot.nextThink || bot.group.position.distanceTo(bot.target) < .55) {
      bot.nextThink = time + 2.2 + Math.random() * 4.5;
      chooseBotDestination(bot);
      if (isInsidePrison(bot.target, 2)) bot.target.set(0, 0, 9);
    }
    const direction = bot.target.clone().sub(bot.group.position);
    direction.y = 0;
    if (direction.lengthSq() > .08) {
      direction.normalize();
      const next = bot.group.position.clone().addScaledVector(direction, dt * (1.2 + (bot.trust % 11) * .04));
      if (!isInsidePrison(next, 1.3) && !isBlockedByObstacle(next, .15)) {
        bot.group.position.copy(next);
        bot.group.rotation.y = Math.atan2(direction.x, direction.z);
      }
    }
  });
}

function startBotActivity() {
  if (activeTable || tables.some((table) => table.occupied)) return;
  const idle = npcs.filter((bot) => bot.active && bot.alive && handTotal(bot) > 0 && !bot.inPrison && !bot.seated);
  if (idle.length < 2) return;
  const table = tables[Math.floor(Math.random() * tables.length)];
  if (table.occupied) return;
  const first = idle[Math.floor(Math.random() * idle.length)];
  first.seated = true;
  first.activity = '进入赌桌';
  setTableState(table, '匹配中');
  first.group.position.copy(tableSeat(table, -1));
  pushActivity(`场内动态：${first.name}（${first.role || '玩家'}）正在赌桌 ${table.id} 等待对手`);
  setTimeout(() => {
    const secondChoices = idle.filter((bot) => bot !== first && bot.active && bot.alive && !bot.inPrison && !bot.seated);
    const second = secondChoices[Math.floor(Math.random() * secondChoices.length)];
    if (!second) { first.seated = false; setTableState(table, '空闲'); return; }
    second.seated = true;
    second.activity = '进入赌桌';
    second.group.position.copy(tableSeat(table, 1));
    setTableState(table, '等待双方确认');
    pushActivity(`裁判：${first.name} 与 ${second.name} 正在确认是否入桌`);
    setTimeout(() => {
      if (!first.alive || !second.alive) { first.seated = false; second.seated = false; setTableState(table, '空闲'); return; }
      const firstAgrees = Math.random() < Math.min(.94, .68 + (Number(first.trust) || 0) / 360);
      const secondAgrees = Math.random() < Math.min(.94, .68 + (Number(second.trust) || 0) / 360);
      if (!firstAgrees || !secondAgrees) {
        first.seated = false; second.seated = false; first.activity = '继续探索'; second.activity = '继续探索';
        setTableState(table, '空闲');
        pushActivity(`裁判：${!firstAgrees ? first.name : second.name} 拒绝了入桌，对局取消`);
        return;
      }
      pushActivity(`裁判：${first.name} 与 ${second.name} 双方确认，开始准备`);
      setTableState(table, '裁判倒计时');
      setTimeout(() => {
        if (!first.alive || !second.alive || !first.seated || !second.seated) { first.seated = false; second.seated = false; setTableState(table, '空闲'); return; }
      const firstMoves = ['rock', 'paper', 'scissors'].filter((type) => hasHandCard(first, type));
      const secondMoves = ['rock', 'paper', 'scissors'].filter((type) => hasHandCard(second, type));
      const firstMove = firstMoves[Math.floor(Math.random() * Math.max(1, firstMoves.length))] || randomMove();
      const secondMove = secondMoves[Math.floor(Math.random() * Math.max(1, secondMoves.length))] || randomMove();
      const result = compareMoves(firstMove, secondMove);
      if (result === 'win') { first.stars = clampStars(first.stars + 1); second.stars = clampStars(second.stars - 1); first.coins += 25; }
      if (result === 'lose') { first.stars = clampStars(first.stars - 1); second.stars = clampStars(second.stars + 1); second.coins += 25; }
      if (result === 'draw') {
        consumeLocalCard(first, firstMove);
        consumeLocalCard(second, secondMove);
      } else {
        consumeLocalCard(first, firstMove);
        consumeLocalCard(second, secondMove);
      }
      spawnImpact(table.position, result === 'draw' ? 0x68e5ff : result === 'win' ? 0xffd369 : 0xff557f);
      pushActivity(`裁判播报：${first.name} 与 ${second.name} 在赌桌 ${table.id} 完成一局${result === 'draw' ? '平局' : ''}`);
      updateRoundHud();
      updateStars(first); updateStars(second);
      if (first.stars <= 0) sendNpcToPrison(first, '星星归零');
      if (second.stars <= 0) sendNpcToPrison(second, '星星归零');
      setTableState(table, '裁判结算');
      setTimeout(() => { first.seated = false; second.seated = false; setTableState(table, '空闲'); }, 1300);
      }, 2300);
    }, 900 + Math.random() * 1200);
  }, 1100);
}

function nearestTable() {
  let best = null;
  let distance = Infinity;
  tables.forEach((table) => {
    const d = player.group.position.distanceTo(table.position);
    if (d < distance) { best = table; distance = d; }
  });
  return best ? { table: best, distance } : null;
}

function nearestParkStation() {
  if (!player.group || !parkStations.length) return null;
  let best = null;
  let distance = Infinity;
  parkStations.forEach((station) => {
    const d = player.group.position.distanceTo(station.position);
    if (d < distance) { best = station; distance = d; }
  });
  return best ? { station: best, distance } : null;
}

function nearestOutdoorRide() {
  if (!player.group || !outdoorRides.length) return null;
  let best = null;
  let distance = Infinity;
  outdoorRides.forEach((ride) => {
    const d = player.group.position.distanceTo(ride.position);
    if (d < distance) { best = ride; distance = d; }
  });
  return best ? { ride: best, distance } : null;
}

function nearOutdoorEntry() {
  if (!player.group || !outdoorEntry) return false;
  return player.group.position.distanceTo(outdoorEntry.position) < outdoorEntry.radius;
}

function nearestSkylineLandmark() {
  if (!player.group || !skylineLandmarks.length) return null;
  let best = null;
  let distance = Infinity;
  skylineLandmarks.forEach((landmark) => {
    const d = player.group.position.distanceTo(landmark.position);
    if (d < distance) { best = landmark; distance = d; }
  });
  return best ? { landmark: best, distance } : null;
}

function nearestOpponent() {
  let best = null;
  let distance = Infinity;
  [...npcs, ...remotePlayers.values()].forEach((opponent) => {
    if (!isRemote(opponent) && !opponent.active) return;
    if (!opponent.alive || opponent.inPrison) return;
    const d = player.group.position.distanceTo(opponent.group.position);
    if (d < distance) { best = opponent; distance = d; }
  });
  return best ? { opponent: best, distance } : null;
}

function beginRefereeCountdown(table, opponent) {
  duelReady = false;
  document.querySelectorAll('#rpsButtons button').forEach((button) => { button.disabled = true; });
  let count = 3;
  $('#tableStatus').textContent = `裁判举旗：${count}`;
  playSound('tick');
  clearInterval(refereeTimer);
  refereeTimer = setInterval(() => {
    count -= 1;
    if (count > 0) { $('#tableStatus').textContent = `裁判倒计时：${count}`; playSound('tick'); return; }
    clearInterval(refereeTimer);
    refereeTimer = null;
    duelReady = true;
    $('#tableStatus').textContent = '裁判：开始！请选择出拳';
    playSound('go');
    updateRpsButtons();
    if (!isRemote(opponent)) showToast(`${opponent.name} 已由裁判随机出拳，等待你的选择`);
  }, 900);
}

function beginLocalTableMatch(table, opponent) {
  activeTable = table;
  activeOpponent = opponent;
  activeRemoteId = null;
  duelActive = true;
  duelEndsAt = Date.now() + 5 * 60 * 1000;
  opponent.seated = true;
  setTableState(table, '入桌确认完成');
  player.group.position.copy(tableSeat(table, -1));
  opponent.group.position.copy(tableSeat(table, 1));
  player.group.rotation.y = Math.PI / 2;
  opponent.group.rotation.y = -Math.PI / 2;
  openChallenge(opponent, true, false);
  pushActivity(`裁判：${opponent.name} 已同意进入赌桌 ${table.id}`);
  setTableState(table, '裁判倒计时');
  beginRefereeCountdown(table, opponent);
}

function cancelLocalTableConsent(reason = '人机拒绝了本次入桌') {
  const consent = pendingConsent;
  if (!consent?.local) return;
  clearTimeout(consent.npcTimer);
  if (consent.opponent) consent.opponent.seated = false;
  const table = consent.table;
  pendingConsent = null;
  activeTable = null;
  activeOpponent = null;
  setTableState(table, '空闲');
  $('#tableConsent')?.classList.remove('open');
  showToast(reason);
  pushActivity(`裁判：${reason}`);
}

function openLocalTableConsent(table, opponent) {
  clearTimeout(pendingMatchTimer);
  pendingMatchTimer = null;
  pendingConsent = { local: true, tableId: table.id, table, opponent, playerAgreed: false, npcAgreed: false, npcTimer: null };
  activeTable = table;
  activeOpponent = opponent;
  activeRemoteId = null;
  opponent.seated = true;
  setTableState(table, '等待双方确认');
  $('#tableConsentName').textContent = `对手：${opponent.name} · 人机也拥有拒绝权 · 赌桌 ${table.id}`;
  $('#tableConsentStatus').textContent = '你和对手都点击“同意入桌”后，裁判才会开始 5 分钟出牌阶段。';
  $('#tableConsentAgree').disabled = false;
  $('#tableConsentReject').disabled = false;
  $('#tableConsent').classList.add('open');
  playSound('notice');
}

function startLocalTableMatch(table) {
  if (roundExpired || handTotal(player) <= 0) { showToast(roundExpired ? '本局倒计时已结束，等待裁判结算' : '你暂时没有手牌，等待牌库补给'); return; }
  const candidates = npcs.filter((bot) => bot.active && bot.alive && handTotal(bot) > 0 && !bot.inPrison && !bot.seated);
  if (!candidates.length) { showToast('暂时没有空闲人机，裁判正在重新匹配'); return; }
  const opponent = candidates[Math.floor(Math.random() * candidates.length)];
  openLocalTableConsent(table, opponent);
}

function startTableMatch(table) {
  if (!table || player.inPrison || challengeOpen || table.occupied || roundExpired) return;
  playSound('click');
  if (handTotal(player) <= 0) { showToast('你暂时没有手牌，无法进入赌桌'); return; }
  if (socket?.readyState === WebSocket.OPEN) {
    pendingTable = table;
    setTableState(table, '等待联机玩家');
    sendOnline({ type: 'tableJoin', tableId: table.id });
    showToast(`已进入赌桌 ${table.id} 匹配，缺人时将由人机补全`);
    pendingMatchTimer = setTimeout(() => {
      if (pendingTable !== table || challengeOpen) return;
      pendingTable = null;
      sendOnline({ type: 'tableLeave', tableId: table.id });
      setTableState(table, '空闲');
      startLocalTableMatch(table);
    }, 3200);
    return;
  }
  startLocalTableMatch(table);
}

function tradeText(offer) {
  const parts = [];
  if (offer.offerCoins) parts.push(`给 ${offer.offerCoins} 金币`);
  if (offer.offerStars) parts.push(`给 ${offer.offerStars} 颗星`);
  if (offer.offerTreasure) parts.push(`给 ${offer.offerTreasure} 宝物估值`);
  if (offer.requestCoins) parts.push(`收 ${offer.requestCoins} 金币`);
  if (offer.requestStars) parts.push(`收 ${offer.requestStars} 颗星`);
  if (offer.requestTreasure) parts.push(`收 ${offer.requestTreasure} 宝物估值`);
  return parts.join(' · ') || '空交易';
}

function readTradeForm() {
  const read = (id) => Math.max(0, Math.floor(Number($(id)?.value || 0)) || 0);
  return {
    offerCoins: read('#offerCoins'), requestCoins: read('#requestCoins'),
    offerStars: read('#offerStars'), requestStars: read('#requestStars'),
    offerTreasure: read('#offerTreasure'), requestTreasure: read('#requestTreasure')
  };
}

function transferLocalTreasure(from, to, value) {
  let remaining = value;
  from.treasures ||= [];
  to.treasures ||= [];
  for (let index = from.treasures.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const item = from.treasures[index];
    const taken = Math.min(Number(item.value) || 0, remaining);
    item.value -= taken;
    remaining -= taken;
    if (item.value <= 0) from.treasures.splice(index, 1);
  }
  if (remaining < value) to.treasures.push({ id: `local-trade-${Date.now()}`, name: '交易所得宝物', value: value - remaining });
}

function sendTradeOffer() {
  const offer = readTradeForm();
  if (!Object.values(offer).some((value) => value > 0)) { showToast('请至少填写一项交易内容'); return; }
  if (activeOpponent && !isRemote(activeOpponent)) {
    const npc = activeOpponent;
    if (player.coins < offer.offerCoins || player.stars < offer.offerStars || treasureValue(player) < offer.offerTreasure || npc.coins < offer.requestCoins || npc.stars < offer.requestStars || treasureValue(npc) < offer.requestTreasure) {
      showToast('你或人机的资产不足，交易无法成立');
      return;
    }
    const accepted = Math.random() < Math.min(.9, .52 + (npc.trust || 0) / 240);
    if (!accepted) { $('#challengeResult').className = 'lose'; $('#challengeResult').textContent = `${npc.name} 拒绝了这笔交易。`; return; }
    player.coins += offer.requestCoins - offer.offerCoins;
    npc.coins += offer.offerCoins - offer.requestCoins;
    player.stars = clampStars(player.stars + offer.requestStars - offer.offerStars);
    npc.stars = clampStars(npc.stars + offer.offerStars - offer.requestStars);
    transferLocalTreasure(player, npc, offer.offerTreasure);
    transferLocalTreasure(npc, player, offer.requestTreasure);
    updateStars(player); updateStars(npc); updateHud();
    if (npc.stars <= 0) sendNpcToPrison(npc, '交易后星星归零');
    if (player.stars <= 0) sendToPrison('交易后星星归零');
    $('#tradePanel').style.display = 'none';
    $('#challengeResult').className = 'win';
    $('#challengeResult').textContent = `${npc.name} 接受了交易：${tradeText(offer)}`;
    showToast('交易完成');
    return;
  }
  if (!activeRemoteId || !isRemote(activeOpponent)) { showToast('交易需要选择一名玩家或人机'); return; }
  sendOnline({ type: 'tradeOffer', targetId: activeRemoteId, ...offer });
  $('#tradePanel').style.display = 'none';
  $('#challengeResult').className = 'draw';
  $('#challengeResult').textContent = `交易申请已发给 ${activeOpponent.name}：${tradeText(offer)}`;
}

function renderTradeOffer() {
  const panel = $('#tradeOfferPanel');
  if (!panel) return;
  const valid = pendingTradeOffer && (!activeRemoteId || pendingTradeOffer.fromId === activeRemoteId);
  panel.style.display = valid ? 'block' : 'none';
  if (valid) $('#tradeOfferText').textContent = `${pendingTradeOffer.fromName} 提出交易：${tradeText(pendingTradeOffer.offer)}`;
}

function acceptTradeOffer() {
  if (!pendingTradeOffer) return;
  sendOnline({ type: 'tradeAccept', id: pendingTradeOffer.id });
  $('#tradeOfferPanel').style.display = 'none';
  $('#challengeResult').className = 'draw';
  $('#challengeResult').textContent = '正在由裁判核对双方资产……';
}

function rejectTradeOffer() {
  if (!pendingTradeOffer) return;
  sendOnline({ type: 'tradeReject', id: pendingTradeOffer.id });
  pendingTradeOffer = null;
  $('#tradeOfferPanel').style.display = 'none';
}

function receiveTradeOffer(message) {
  const from = remotePlayers.get(message.from.id) || createRemotePlayer(message.from);
  pendingTradeOffer = { id: message.id, fromId: message.from.id, fromName: message.from.name, offer: message.offer };
  if (from && (!challengeOpen || activeRemoteId === from.id)) {
    if (!challengeOpen) openChallenge(from, false, true);
    renderTradeOffer();
  }
  showToast(`${message.from.name} 向你发起了一笔交易`);
}

function openChallenge(opponent, fromTable = false, social = false) {
  if (!opponent || !opponent.alive || opponent.inPrison) return;
  if (!fromTable && !social) return;
  activeOpponent = opponent;
  activeRemoteId = isRemote(opponent) ? opponent.id : null;
  challengeOpen = true;
  socialOnly = social;
  $('#opponentName').textContent = `${opponent.name || '联机玩家'} · ${fromTable ? '赌桌对局' : '关系交涉'}`;
  $('#challengeResult').textContent = social ? '你们还没有入桌，可以先谈结盟或观察对方。' : '';
  $('#challengeResult').className = social ? 'draw' : '';
  $('#relationshipActions').style.display = isRemote(opponent) || !social ? 'none' : 'grid';
  $('#tradeActions').style.display = isRemote(opponent) || social ? 'grid' : 'none';
  $('#tradePanel').style.display = 'none';
  renderTradeOffer();
  $('#duelChatPanel').style.display = fromTable && isRemote(opponent) ? 'block' : 'none';
  $('#rpsButtons').style.display = fromTable ? 'grid' : 'none';
  $('#closeChallenge').textContent = fromTable ? '离开赌桌' : '结束交涉';
  if (!isRemote(opponent)) {
    $('#allyBtn').textContent = opponent.allied ? `已结盟 · 信任 ${opponent.trust}` : `提出结盟 · 信任 ${opponent.trust}`;
    $('#betrayBtn').textContent = opponent.allied ? '背叛并夺星' : '尚未结盟';
    $('#betrayBtn').disabled = !opponent.allied;
  }
  updateHandHint();
  updateRpsButtons();
  renderDuelChat();
  $('#challenge').classList.add('open');
  if (fromTable && !duelReady) $('#tableStatus').textContent = '裁判正在就位';
}

function closeChallenge() {
  clearInterval(refereeTimer);
  clearTimeout(pendingMatchTimer);
  pendingMatchTimer = null;
  refereeTimer = null;
  if (pendingTable) sendOnline({ type: 'tableLeave', tableId: pendingTable.id });
  pendingTable = null;
  if (activeRemoteId) sendOnline({ type: 'tableLeave', tableId: activeTable?.id });
  if (pendingConsent?.local) {
    clearTimeout(pendingConsent.npcTimer);
    if (pendingConsent.opponent) pendingConsent.opponent.seated = false;
  } else if (pendingConsent) sendOnline({ type: 'tableConsent', tableId: pendingConsent.tableId, agree: false });
  if (activeOpponent && !isRemote(activeOpponent)) activeOpponent.seated = false;
  if (activeTable) setTableState(activeTable, '空闲');
  activeTable = null;
  activeOpponent = null;
  activeRemoteId = null;
  duelActive = false;
  duelReady = false;
  duelEndsAt = 0;
  socialOnly = false;
  pendingTradeOffer = null;
  pendingConsent = null;
  $('#tableConsent')?.classList.remove('open');
  stopVoice();
  challengeOpen = false;
  $('#challenge').classList.remove('open');
  $('#rpsButtons').style.display = 'grid';
  $('#relationshipActions').style.display = 'none';
  $('#tradeActions').style.display = 'none';
  $('#tradePanel').style.display = 'none';
  $('#tradeOfferPanel').style.display = 'none';
  $('#duelChatPanel').style.display = 'none';
  document.querySelectorAll('#rpsButtons button').forEach((button) => { button.disabled = false; });
}

function allyWithNpc() {
  const npc = activeOpponent;
  if (!npc || isRemote(npc) || !socialOnly || !npc.alive || npc.inPrison) return;
  if (npc.allied) { $('#challengeResult').className = 'draw'; $('#challengeResult').textContent = `${npc.name} 已经是你的盟友，信任值 ${npc.trust}。`; return; }
  if (player.coins < 35) { $('#challengeResult').className = 'lose'; $('#challengeResult').textContent = '结盟需要 35 金币作为信任保证金。'; return; }
  player.coins -= 35;
  const boost = player.influence > 0 ? 20 : 0;
  if (boost) player.influence -= 1;
  const eventBoost = activeEvent?.zone === '黑市' && getZone(player.group.position).name === '黑市' ? .15 : 0;
  const success = Math.random() < Math.min(.97, .22 + (npc.trust + boost) / 100 + eventBoost);
  if (success) {
    npc.allied = true;
    npc.trust = Math.min(100, npc.trust + 20 + boost);
    stats.alliances += 1;
    saveStats();
    pushActivity(`盟约：${npc.name} 暂时加入你的阵营`);
    $('#challengeResult').className = 'win';
    $('#challengeResult').textContent = `${npc.name} 接受结盟。你们暂时共享情报。`;
    showToast(`${npc.name} 成为你的盟友`);
  } else {
    npc.trust = Math.max(0, npc.trust - 10);
    $('#challengeResult').className = 'lose';
    $('#challengeResult').textContent = `${npc.name} 拒绝结盟，信任下降。`;
  }
  updateHud();
  allyWithNpc.refresh?.();
  $('#allyBtn').textContent = npc.allied ? `已结盟 · 信任 ${npc.trust}` : `再次尝试 · 信任 ${npc.trust}`;
  $('#betrayBtn').textContent = npc.allied ? '背叛并夺星' : '尚未结盟';
  $('#betrayBtn').disabled = !npc.allied;
}

function betrayNpc() {
  const npc = activeOpponent;
  if (!npc || isRemote(npc) || !socialOnly || !npc.alive || !npc.allied) return;
  npc.allied = false;
  npc.betrayed = true;
  npc.trust = 0;
  npc.stars = clampStars(npc.stars - 1);
  player.stars = clampStars(player.stars + 1);
  player.coins += 40;
  updateStars(npc);
  updateStars(player);
  updateHud();
  spawnImpact(npc.group.position, 0xff557f);
  $('#challengeResult').className = 'win';
  $('#challengeResult').textContent = `你背叛了 ${npc.name}，夺走一颗星并获得 40 金币。`;
  $('#betrayBtn').disabled = true;
  showToast('关系破裂：附近角色会提高警惕');
  pushActivity(`背叛：你从 ${npc.name} 手中夺走一颗星`);
  if (npc.stars <= 0) sendNpcToPrison(npc, '被背叛后失去最后一颗星');
}

function playRound(move) {
  if (!activeOpponent || !duelActive || !duelReady || !activeOpponent.alive || !hasHandCard(player, move)) return;
  document.querySelectorAll('#rpsButtons button').forEach((button) => { button.disabled = true; });
  $('#tableStatus').textContent = '裁判记录出拳中';
  if (isRemote(activeOpponent)) {
    sendOnline({ type: 'rpsMove', targetId: activeRemoteId, move });
    $('#challengeResult').className = 'draw';
    $('#challengeResult').textContent = '你的出拳已提交，等待另一侧同时确认。';
    return;
  }
  const opponentMoves = ['rock', 'paper', 'scissors'].filter((type) => hasHandCard(activeOpponent, type));
  const opponentMove = opponentMoves.length ? opponentMoves[Math.floor(Math.random() * opponentMoves.length)] : randomMove();
  setTimeout(() => finishRound(compareMoves(move, opponentMove), move, opponentMove, activeOpponent), 620);
}

function finishRound(result, playerMove, opponentMove, opponent) {
  if (!opponent) return;
  stats.duels += 1;
  const eventBonus = result === 'win' && activeEvent?.bonus && (activeEvent.zone === '全域' || getZone(player.group.position).name === activeEvent.zone) ? activeEvent.bonus : 0;
  if (result === 'win') {
    stats.wins += 1;
    player.stars = clampStars(player.stars + 1);
    opponent.stars = clampStars(opponent.stars - 1);
    player.coins += 25 + eventBonus;
    opponent.coins = Math.max(0, opponent.coins - 10);
    spawnImpact(opponent.group.position, 0xffd369);
    if (activeTable) spawnImpact(activeTable.position, 0xffd369);
    $('#challengeResult').className = 'win';
    $('#challengeResult').textContent = `你出${moveName(playerMove)}。裁判已记录对手暗牌，你赢得 1 颗星和 ${25 + eventBonus} 金币。`;
  } else if (result === 'lose') {
    if (player.luck > 0) {
      player.luck -= 1;
      player.coins = Math.max(0, player.coins - 5);
      $('#challengeResult').className = 'draw';
      $('#challengeResult').textContent = `你出${moveName(playerMove)}。裁判已记录对手暗牌，幸运护符抵消了星星损失。`;
    } else {
      player.stars = clampStars(player.stars - 1);
      opponent.stars = clampStars(opponent.stars + 1);
      player.coins = Math.max(0, player.coins - 10);
      spawnImpact(player.group.position, 0xff557f);
      if (activeTable) spawnImpact(activeTable.position, 0xff557f);
      $('#challengeResult').className = 'lose';
      $('#challengeResult').textContent = `你出${moveName(playerMove)}。裁判已记录对手暗牌，你失去 1 颗星。`;
    }
  } else {
    player.coins += 5;
    opponent.coins += 5;
    $('#challengeResult').className = 'draw';
    $('#challengeResult').textContent = `你们的出牌均已被裁判记录为平局，各获得 5 金币。`;
    if (activeTable) spawnImpact(activeTable.position, 0x68e5ff);
  }
  playSound(result);
  saveStats();
  if (!isRemote(opponent)) {
    consumeLocalCard(player, playerMove);
    consumeLocalCard(opponent, opponentMove);
    updateRoundHud();
  }
  pushActivity(result === 'win' ? `对局：你从 ${opponent.name} 手中夺得一颗星` : result === 'lose' ? `对局：你在赌桌上失去一颗星` : '对局：裁判记录为平局');
  updateStars(player);
  updateStars(opponent);
  updateHud();
  setTableState(activeTable, '裁判结算');
  if (opponent.stars <= 0) sendNpcToPrison(opponent, '星星归零');
  if (player.stars <= 0) sendToPrison('星星归零');
  $('#tableStatus').textContent = result === 'draw' ? '裁判：平局，赌桌重新开放' : '裁判：结算完成';
  setTimeout(() => { if (challengeOpen && activeOpponent === opponent && !player.inPrison) closeChallenge(); }, 1900);
}

function sendNpcToPrison(npc, reason) {
  if (!npc || npc.inPrison) return;
  npc.inPrison = true;
  npc.eliminated = true;
  npc.stars = 0;
  npc.seated = false;
  const offset = (npcs.indexOf(npc) % 3 - 1) * 2.1;
  npc.group.position.set(prison.center.x + offset, 0, prison.center.z + 1.7);
  npc.group.visible = true;
  npc.label.style.display = 'block';
  updateStars(npc);
  showToast(`${npc.name} 被裁判押入无限监狱：${reason}`);
}

function sendToPrison(reason) {
  if (player.inPrison) return;
  player.inPrison = true;
  player.eliminated = true;
  player.alive = true;
  player.stars = 0;
  player.group.position.set(prison.center.x, 0, prison.center.z + 1.7);
  updateStars(player);
  closeChallenge();
  $('#prisonText').textContent = `裁判判定：${reason} · 无限关押，支付 300 金币赎回`;
  $('#prisonOverlay').classList.add('open');
  showToast('裁判已将你押入监狱，普通角色无法进入该区域');
  pushActivity(`裁判：你被押入无限监狱（${reason}）`);
  updateHud();
  sendOnlineState();
}

function rescueSelf() {
  if (!player.inPrison) return;
  if (player.coins < 300) { showToast('赎金不足：需要 300 虚拟金币'); return; }
  if (socket?.readyState === WebSocket.OPEN) {
    sendOnline({ type: 'rescue', targetId: onlineId });
    showToast('救赎申请已交给裁判核验');
    return;
  }
  player.coins -= 300;
  player.inPrison = false;
  player.eliminated = false;
  player.stars = 1;
  player.group.position.set(0, 0, 9);
  updateStars(player);
  $('#prisonOverlay').classList.remove('open');
  stats.rescues += 1;
  saveStats();
  pushActivity('赎回：你支付 300 金币离开无限监狱');
  updateHud();
  showToast('赎金已支付，裁判放行。你带着 1 颗星回到夜场');
  sendOnlineState();
}

function canSafeExit() {
  return Boolean(player.alive && !player.leftSafely && !player.inPrison && handTotal(player) <= 0 && player.stars >= 3);
}

function updateSafeExitButton() {
  const button = $('#safeExitBtn');
  if (!button) return;
  const ready = canSafeExit();
  button.disabled = !ready;
  button.classList.toggle('ready', ready);
  button.textContent = ready ? '安全离场 · 领取 180 金币' : '安全离场 · 需无牌+3星';
}

function safeLeave() {
  if (!canSafeExit()) { showToast('安全离场需要手里没有卡牌，并且至少拥有 3 颗星'); return; }
  if (socket?.readyState === WebSocket.OPEN) {
    sendOnline({ type: 'safeLeave' });
    return;
  }
  player.coins += 180;
  player.alive = false;
  player.leftSafely = true;
  player.group.visible = false;
  player.label.style.display = 'none';
  closeChallenge();
  document.querySelectorAll('.modal.open').forEach((modal) => modal.classList.remove('open'));
  $('#gameOver h2').textContent = '安全离场';
  $('#gameOver p').textContent = '你在没有手牌且保有至少 3 颗星时离开夜场，裁判发放了 180 枚虚拟金币。';
  $('#gameOver').classList.add('open');
  updateHud();
}

function updateHud() {
  $('#playerStars').textContent = player.stars > 0 ? '★'.repeat(player.stars) : '—';
  $('#playerCoins').textContent = player.coins;
  $('#shopCoins').textContent = player.coins;
  $('#playerLoot').textContent = treasureValue(player);
  $('#playerStatus').textContent = player.leftSafely ? '安全离场' : player.inPrison ? '无限监狱' : player.eliminated ? '淘汰登记' : '自由';
  $('#playerStatus').className = player.inPrison ? '' : 'green';
  updateHandHint();
  updateRoundHud();
  renderPrivateScoreboard();
  updateLoan();
  renderTasks();
  renderTreasureInventory();
  updateSafeExitButton();
  updateMissionPanel();
}

function updatePopulationHud() {
  const roster = [player, ...npcs.filter((npc) => npc.active || npc.inPrison), ...remotePlayers.values()];
  const total = Math.max(8, roster.length);
  const eliminated = roster.filter((entry) => entry.inPrison || entry.eliminated || entry.leftSafely || entry.alive === false).length;
  if ($('#remainingCount')) $('#remainingCount').textContent = Math.max(0, total - eliminated);
  if ($('#eliminatedCount')) $('#eliminatedCount').textContent = eliminated;
  if ($('#populationTotal')) $('#populationTotal').textContent = total;
}

function renderPrivateScoreboard() {
  const entries = [
    { ...player, name: onlineName || player.name, me: true },
    ...[...remotePlayers.values()],
    ...npcs.filter((npc) => npc.active || npc.inPrison)
  ];
  $('#scoreboardList').innerHTML = entries.slice(0, 8).map((entry) => {
    const state = entry.leftSafely ? '已离场' : entry.inPrison ? '监狱' : entry.alive === false ? '已淘汰' : entry.me ? `我的星星 ${entry.stars}` : '存活';
    return `<div class="scoreRow ${entry.me ? 'me' : ''}"><b>${entry.name || '玩家'}</b><span class="scoreStars">${state}</span></div>`;
  }).join('');
  updatePopulationHud();
}

function renderScoreboard() {
  const entries = [
    { ...player, name: onlineName || player.name, me: true },
    ...[...remotePlayers.values()],
    ...npcs.filter((npc) => npc.active || npc.inPrison)
  ].sort((a, b) => (b.stars || 0) - (a.stars || 0));
  $('#scoreboardList').innerHTML = entries.slice(0, 8).map((entry) => `<div class="scoreRow ${entry.me ? 'me' : ''}"><b>${entry.name || '玩家'}</b><span class="scoreStars">${entry.leftSafely ? '已离场' : entry.inPrison ? '监狱' : entry.stars > 0 ? '★'.repeat(entry.stars) : '—'}</span></div>`).join('');
}

function applySkin() {
  player.skin = true;
  player.group.traverse((object) => {
    if (object.isMesh && object.material?.color && object.position.y < 1.8) object.material.color.setHex(0xb057d6);
  });
}

function sellStar() {
  if (player.stars <= 1) { showToast('至少保留 1 颗星，才能继续留在夜场'); return; }
  if (socket?.readyState === WebSocket.OPEN) {
    sendOnline({ type: 'sellStar' });
    return;
  }
  player.stars -= 1;
  player.coins += 120;
  updateStars(player);
  updateHud();
  showToast('已出售 1 颗星，获得 120 金币');
}

function rescueNpc(npc) {
  if (!npc || !npc.inPrison) return;
  if (player.coins < 300) { showToast('救赎需要 300 金币'); return; }
  player.coins -= 300;
  npc.inPrison = false;
  npc.eliminated = false;
  npc.alive = true;
  npc.stars = 1;
  npc.group.position.set(0, 0, 9);
  npc.group.visible = true;
  npc.label.style.display = 'block';
  updateStars(npc);
  updateHud();
  renderRescueList();
  syncBotFill();
  showToast(`你用 300 金币救出了 ${npc.name}`);
}

function renderRescueList() {
  const list = $('#rescueList');
  if (!list) return;
  const targets = [
    ...[...remotePlayers.values()].filter((entry) => entry.inPrison),
    ...npcs.filter((entry) => entry.inPrison)
  ];
  list.innerHTML = targets.length
    ? targets.map((entry) => `<div class="taskItem"><h3>${entry.name}</h3><p>无限监狱关押中。支付 300 金币，让对方带着 1 颗星回到夜场。</p><button data-rescue-target="${entry.id || ''}">救出</button></div>`).join('')
    : '<div class="hint">目前没有可救赎的其他玩家。你自己被关押时，可使用顶部救赎条。</div>';
  $$('[data-rescue-target]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.rescueTarget;
    const remote = remotePlayers.get(id);
    if (remote) {
      if (player.coins < 300) { showToast('救赎需要 300 金币'); return; }
      sendOnline({ type: 'rescue', targetId: id });
      return;
    }
    rescueNpc(npcs.find((npc) => npc.name === button.parentElement.querySelector('h3')?.textContent));
  }));
}

function openRescueModal() {
  $('#rescueModal').classList.add('open');
  renderRescueList();
}

function purchase(item) {
  const products = {
    luck: [60, '幸运护符已装备'], skin: [100, '霓虹外套已装备'], star: [80, '星星补给已使用'],
    jailPass: [150, '监狱通行证已放入背包'], influence: [120, '影响力徽章已装备'], disguise: [180, '伪装芯片已装备']
  };
  const product = products[item];
  if (!product) return;
  if (item === 'skin' && player.skin) { showToast('霓虹外套已经装备'); return; }
  if (player.coins < product[0]) { showToast('金币不足，可以先完成签到或任务'); return; }
  if (item === 'star' && player.stars >= 6) { showToast('星星已经达到上限'); return; }
  player.coins -= product[0];
  if (item === 'luck') player.luck += 1;
  if (item === 'skin') applySkin();
  if (item === 'star') { player.stars = clampStars(player.stars + 1); updateStars(player); }
  if (item === 'jailPass') player.jailPass += 1;
  if (item === 'influence') player.influence += 1;
  if (item === 'disguise') player.disguise += 1;
  updateHud();
  const button = document.querySelector(`[data-item="${item}"]`);
  if (item === 'skin') { button.textContent = '已装备'; button.classList.add('owned'); }
  showToast(product[1]);
}

const taskDefinitions = [
  { id: 'duels', title: '完成一场对局', description: '在任意赌桌完成石头剪刀布', target: 1, reward: 45, get: () => stats.duels },
  { id: 'zones', title: '走访两个区域', description: '进入黑市、银行、裁判塔或监狱外围', target: 2, reward: 40, get: () => stats.zones.length },
  { id: 'alliance', title: '建立一份盟约', description: '和一个 NPC 成功结盟', target: 1, reward: 55, get: () => stats.alliances },
  { id: 'win', title: '赢下一场赌局', description: '从对手手中夺走一颗星', target: 1, reward: 70, get: () => stats.wins },
  { id: 'rescue', title: '完成一次救赎', description: '支付 300 金币离开无限监狱', target: 1, reward: 80, get: () => stats.rescues }
];

function claimedTasks() {
  try { return JSON.parse(localStorage.getItem('star-night-claimed') || '{}'); } catch { return {}; }
}
function saveClaimedTasks(value) { localStorage.setItem('star-night-claimed', JSON.stringify(value)); }
function renderTasks() {
  const grid = $('#taskGrid');
  if (!grid) return;
  const claimed = claimedTasks();
  grid.innerHTML = taskDefinitions.map((task) => {
    const value = Math.min(task.target, task.get());
    const done = value >= task.target;
    const claimedLabel = claimed[task.id] ? '已领取' : done ? '领取奖励' : '进行中';
    return `<div class="taskItem"><h3>${task.title}</h3><p>${task.description}</p><progress value="${value}" max="${task.target}"></progress><small>${value}/${task.target} · ${task.reward} 金币</small><button data-claim-task="${task.id}" ${!done || claimed[task.id] ? 'disabled' : ''}>${claimedLabel}</button></div>`;
  }).join('');
  $$('[data-claim-task]').forEach((button) => button.addEventListener('click', () => claimTask(button.dataset.claimTask)));
}

function claimTask(id) {
  const task = taskDefinitions.find((item) => item.id === id);
  const claimed = claimedTasks();
  if (!task || claimed[id] || task.get() < task.target) return;
  claimed[id] = true;
  saveClaimedTasks(claimed);
  player.coins += task.reward;
  updateHud();
  $('#taskLog').textContent = `${task.title}完成，获得 ${task.reward} 金币。`;
  showToast(`任务奖励到账：+${task.reward} 金币`);
}

function signIn() {
  const today = new Date().toISOString().slice(0, 10);
  const record = JSON.parse(localStorage.getItem('star-night-signin') || '{}');
  if (record.date === today) { showToast('今天已经签到过了，明天再来'); return; }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = record.date === yesterday ? Number(record.streak || 0) + 1 : 1;
  const reward = Math.min(100, 35 + streak * 10);
  localStorage.setItem('star-night-signin', JSON.stringify({ date: today, streak }));
  player.coins += reward;
  updateHud();
  pushActivity(`签到：连续 ${streak} 天，获得 ${reward} 金币`);
  showToast(`连续签到 ${streak} 天，获得 ${reward} 金币`);
}

function updateLoan() {
  $('#loanDebt').textContent = player.debt;
  if (player.debt > 0 && player.loanDueAt > 0) {
    const left = Math.max(0, player.loanDueAt - Date.now());
    $('#loanLog').textContent = `剩余还款时间：${Math.ceil(left / 1000)} 秒${left <= 0 ? ' · 已逾期' : ''}`;
  } else if (player.debt <= 0) $('#loanLog').textContent = '当前没有债务。';
}

function borrowLoan() {
  if (player.debt > 0) { $('#loanLog').textContent = '你已经有一笔未偿还债务。'; return; }
  player.coins += 200;
  player.debt = 260;
  player.loanDueAt = Date.now() + 90 * 1000;
  updateHud();
  showToast('借入 200 金币，90 秒内需偿还 260 金币');
}

function repayLoan() {
  if (player.debt <= 0) { $('#loanLog').textContent = '当前没有债务。'; return; }
  if (player.coins < player.debt) { $('#loanLog').textContent = '金币不足，无法偿还。'; return; }
  player.coins -= player.debt;
  player.debt = 0;
  player.loanDueAt = 0;
  updateHud();
  showToast('债务已偿还，裁判警戒解除');
}

function getZone(position) {
  let current = { name: '中央夜场', description: '六张赌桌正在等待玩家' };
  zones.forEach((zone) => {
    const x = zone.interactionX ?? zone.x;
    const z = zone.interactionZ ?? zone.z;
    if (Math.hypot(position.x - x, position.z - z) < zone.radius) current = zone;
  });
  return current;
}

function updateZone() {
  const zone = getZone(player.group.position);
  if (zone.name === lastZone) return;
  lastZone = zone.name;
  $('#zoneBanner').textContent = `${zone.name} · ${zone.description}`;
  $('#zoneBanner').classList.add('show');
  clearTimeout(zoneTimer);
  zoneTimer = setTimeout(() => $('#zoneBanner').classList.remove('show'), 3000);
  const zoneRecord = zones.find((item) => item.name === zone.name);
  if (zoneRecord && !stats.zones.includes(zoneRecord.name)) { stats.zones.push(zoneRecord.name); saveStats(); updateHud(); }
}

function updateInteraction() {
  if (challengeOpen || player.inPrison || !player.alive) { $('#interaction').classList.remove('show'); return; }
  const actionHint = isMobileDevice ? '点击右下角行动' : '按 <strong>E</strong>';
  if (activeRideExperience) {
    $('#interaction').innerHTML = `<strong>${activeRideExperience.ride.title}</strong> 正在运行 · ${actionHint} 下车`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '下车';
    return;
  }
  const treasureNear = nearestTreasure();
  if (treasureNear && treasureNear.distance < 3.1) {
    $('#interaction').innerHTML = `靠近 <strong>${treasureNear.pickup.name || '隐藏宝物'}</strong> · ${actionHint} 拾取`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '拾取';
    return;
  }
  const tableNear = nearestTable();
  if (tableNear && tableNear.distance < 3.7) {
    $('#interaction').innerHTML = `靠近 <strong>赌桌 ${tableNear.table.id}</strong> · ${actionHint} 进入匹配`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '入桌';
    return;
  }
  const stationNear = nearestParkStation();
  if (stationNear && stationNear.distance < 2.8) {
    $('#interaction').innerHTML = `靠近 <strong>${stationNear.station.title}</strong> · ${actionHint} 开始室内游戏`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '玩游戏';
    return;
  }
  const rideNear = nearestOutdoorRide();
  if (rideNear && rideNear.distance < 4.2) {
    const seated = activeRideExperience?.ride === rideNear.ride;
    $('#interaction').innerHTML = `<strong>${rideNear.ride.title}</strong> · ${actionHint} ${seated ? '下车' : '入座体验'}（不产生金币）`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = seated ? '下车' : '入座';
    return;
  }
  const facilityNear = nearestVerticalFacility();
  if (facilityNear && facilityNear.distance < 4.5) {
    $('#interaction').innerHTML = `<strong>${facilityNear.facility.title}</strong> · ${actionHint} 乘电梯（第 ${facilityNear.facility.currentFloor + 1}/${facilityNear.facility.floors} 层）`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '电梯';
    return;
  }
  if (nearOutdoorEntry()) {
    $('#interaction').innerHTML = `<strong>室外游乐场入口</strong> · ${actionHint} 进入，过山车/碰碰车/摩天轮不产生金币`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '进入';
    return;
  }
  const landmarkNear = nearestSkylineLandmark();
  if (landmarkNear && landmarkNear.distance < landmarkNear.landmark.radius) {
    $('#interaction').innerHTML = `靠近 <strong>${landmarkNear.landmark.title}</strong> · ${actionHint} 调查地标`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '调查';
    return;
  }
  const opponentNear = nearestOpponent();
  if (opponentNear && opponentNear.distance < 2.8) {
    $('#interaction').innerHTML = `靠近 <strong>${opponentNear.opponent.name}</strong> · ${actionHint} 进行交涉`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '交涉';
    return;
  }
  const zoneNear = nearestZone();
  if (zoneNear && zoneNear.distance < zoneNear.zone.radius + .8) {
    $('#interaction').innerHTML = `进入 <strong>${zoneNear.zone.name}</strong> · ${actionHint} 调查`;
    $('#interaction').classList.add('show');
    $('#mobileAction').textContent = '调查';
    return;
  }
  $('#interaction').classList.remove('show');
  $('#mobileAction').textContent = '行动';
}

function performPrimaryAction() {
  if (challengeOpen) return;
  startAudio();
  playSound('click');
  if (activeRideExperience) {
    exitRideExperience();
    return;
  }
  const treasureNear = nearestTreasure();
  const tableNear = nearestTable();
  if (treasureNear && treasureNear.distance < 3.1) {
    collectTreasure(treasureNear.pickup);
    return;
  }
  if (tableNear && tableNear.distance < 3.7) {
    startTableMatch(tableNear.table);
    return;
  }
  const stationNear = nearestParkStation();
  if (stationNear && stationNear.distance < 2.8) {
    activeParkStation = stationNear.station;
    openParkGame(stationNear.station);
    return;
  }
  const rideNear = nearestOutdoorRide();
  if (rideNear && rideNear.distance < 4.2) {
    rideNear.ride.lastPlayedAt = Date.now();
    if (activeRideExperience?.ride === rideNear.ride) exitRideExperience();
    else enterRideExperience(rideNear.ride);
    return;
  }
  const facilityNear = nearestVerticalFacility();
  if (facilityNear && facilityNear.distance < 4.5) {
    useFacilityElevator(facilityNear.facility);
    return;
  }
  if (nearOutdoorEntry()) {
    player.group.position.set(outdoorEntry.position.x, 0, outdoorEntry.position.z - 2.6);
    showToast('已进入室外游乐场：靠近过山车、碰碰车或摩天轮体验。');
    pushActivity('室外游乐场：入口已打开，设施仅供游玩不产生金币');
    return;
  }
  const landmarkNear = nearestSkylineLandmark();
  if (landmarkNear && landmarkNear.distance < landmarkNear.landmark.radius) {
    const { landmark } = landmarkNear;
    visitedLandmarks.add(landmark.id);
    player.influence += 1;
    updateHud();
    showToast(`${landmark.title}：你发现了隐藏档案，影响力 +1。`);
    pushActivity(`地标调查：${landmark.title} 已记录，不是装饰建筑`);
    playSound('notice');
    return;
  }
  const opponentNear = nearestOpponent();
  if (opponentNear && opponentNear.distance < 2.8) {
    openChallenge(opponentNear.opponent, false, true);
    return;
  }
  const zoneNear = nearestZone();
  if (zoneNear && zoneNear.distance < zoneNear.zone.radius + .8) {
    interactWithZone(zoneNear.zone);
    return;
  }
  showToast('向目标靠近后点击行动');
}

function movePlayer(dt) {
  if (challengeOpen || player.inPrison || !player.alive || activeRideExperience) return;
  if (jumpRequested && playerGrounded) {
    jumpVelocity = 6.2;
    playerGrounded = false;
    jumpRequested = false;
    playSound('go');
  }
  if (!playerGrounded || player.group.position.y > 0) {
    jumpVelocity -= 16 * dt;
    player.group.position.y = Math.max(playerFloorY, player.group.position.y + jumpVelocity * dt);
    if (player.group.position.y <= playerFloorY) { player.group.position.y = playerFloorY; jumpVelocity = 0; playerGrounded = true; }
  }
  const forwardInput = (keys.w || keys.ArrowUp ? 1 : 0) - (keys.s || keys.ArrowDown ? 1 : 0) - joystickInput.z;
  const strafeInput = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0) + joystickInput.x;
  const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
  const direction = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(strafeInput));
  if (direction.lengthSq() <= .001) return;
  direction.normalize();
  const sprinting = sprintActive || keys.Shift;
  const moveSpeed = player.speed * (sprinting ? SPRINT_MULTIPLIER : 1);
  const next = player.group.position.clone().addScaledVector(direction, moveSpeed * dt);
  next.x = THREE.MathUtils.clamp(next.x, -mapLimit, mapLimit);
  next.z = THREE.MathUtils.clamp(next.z, -mapLimit, mapLimit);
  const canOccupy = (position) => !isInsidePrison(position, .45) && !isBlockedByObstacle(position, .12);
  if (!canOccupy(next)) {
    prisonToastTimer -= dt;
    if (isInsidePrison(next, .45) && prisonToastTimer <= 0) { showToast('这里是无限监狱，普通角色不能进入'); prisonToastTimer = 2.2; }
    const slideX = player.group.position.clone();
    slideX.x = next.x;
    const slideZ = player.group.position.clone();
    slideZ.z = next.z;
    if (canOccupy(slideX)) next.x = slideX.x; else next.x = player.group.position.x;
    if (canOccupy(slideZ)) next.z = slideZ.z; else next.z = player.group.position.z;
  }
  player.group.position.copy(next);
  if (playerElevatorFacility && player.group.position.distanceTo(playerElevatorFacility.elevatorPosition) > 5) {
    playerElevatorFacility = null;
    playerFloorY = 0;
    player.group.position.y = 0;
    playerGrounded = true;
  }
  player.group.rotation.y = Math.atan2(direction.x, direction.z);
}

function requestJump() {
  if (challengeOpen || player.inPrison || !player.alive) return;
  if (!playerGrounded) return;
  jumpRequested = true;
  showToast('跳跃');
}

function updateLabels() {
  const owners = [...npcs, ...remotePlayers.values(), player];
  owners.forEach((owner) => {
    if (!owner.label || !owner.group.visible) return;
    if (isMobileDevice && owner !== player) {
      const nearby = owner.group.position.distanceTo(player.group.position) < 9 || owner.inPrison;
      owner.label.style.display = nearby ? 'block' : 'none';
      if (!nearby) return;
    }
    const world = owner.group.position.clone();
    world.y += 3.35;
    world.project(camera);
    owner.label.style.left = `${(world.x * .5 + .5) * innerWidth}px`;
    owner.label.style.top = `${(-world.y * .5 + .5) * innerHeight}px`;
    if (owner !== player) owner.label.innerHTML = `${owner.name}${owner.role ? `<small class="roleTag"> · ${owner.role}</small>` : ''}<span class="miniStars">${owner.inPrison ? '监狱' : owner.leftSafely ? '已离场' : owner.alive === false ? '出局' : '存活'}</span>`;
  });
  $$('[data-static-world="true"]').forEach((label) => {
    const world = new THREE.Vector3(Number(label.dataset.worldX), Number(label.dataset.worldY || 3.4), Number(label.dataset.worldZ));
    if (isMobileDevice && !label.classList.contains('zoneLabel') && Math.hypot(player.group.position.x - world.x, player.group.position.z - world.z) > 20) {
      label.style.display = 'none';
      return;
    }
    label.style.display = 'block';
    world.project(camera);
    label.style.left = `${(world.x * .5 + .5) * innerWidth}px`;
    label.style.top = `${(-world.y * .5 + .5) * innerHeight}px`;
  });
}

const cameraModeNames = ['跟随', '俯瞰', '自由', '近景', '电影', '第一人称'];
function setCameraMode(mode) {
  if (mode === 5 && cameraMode !== 5) cameraModeBeforeFirstPerson = cameraMode;
  cameraMode = (mode + cameraModeNames.length) % cameraModeNames.length;
  if (cameraMode === 0) { cameraPitch = .58; cameraDistance = 14.6; }
  if (cameraMode === 1) { cameraPitch = 1.14; cameraDistance = 20; }
  if (cameraMode === 2) { cameraPitch = .52; cameraDistance = 17; }
  if (cameraMode === 3) { cameraPitch = .29; cameraDistance = 5.8; }
  if (cameraMode === 4) { cameraPitch = .7; cameraDistance = 12.5; }
  if (cameraMode === 5) {
    cameraPitch = .04; cameraDistance = .08;
    if (player.group) cameraYaw = player.group.rotation.y + Math.PI;
    if (player.group) player.group.visible = false;
  } else if (player.group && !player.leftSafely) {
    player.group.visible = true;
  }
  $('#cameraBtn').textContent = `视角：${cameraModeNames[cameraMode]}`;
  if ($('#mobileCamera')) $('#mobileCamera').textContent = cameraMode === 5 ? '第三人称' : '第一人称';
  if ($('#firstPersonBtn')) $('#firstPersonBtn').textContent = cameraMode === 5 ? '退出第一人称' : '第一人称';
  if (cameraMode === 5) showToast('第一人称已开启：拖动画面转动视线，摇杆控制移动');
  pushActivity(`镜头：切换为${cameraModeNames[cameraMode]}视角`);
}

function cycleCamera() { setCameraMode(cameraMode + 1); }

function updateCamera(dt) {
  const target = player.group.position.clone();
  const firstPerson = cameraMode === 5;
  if (player.group && !player.leftSafely) player.group.visible = !firstPerson;
  const currentVenue = worldBuildings.find((building) => ['venue', 'facility'].includes(building.kind) && Math.abs(player.group.position.x - building.x) < building.halfX - .45 && Math.abs(player.group.position.z - building.z) < building.halfZ - .45);
  const currentFacility = verticalFacilities.find((facility) => currentVenue?.label === facility.title);
  const onObservationDeck = Boolean(currentFacility && playerElevatorFacility === currentFacility && currentFacility.currentFloor === currentFacility.floors - 1);
  target.y = firstPerson ? player.group.position.y + 1.65 : onObservationDeck ? player.group.position.y + 1.8 : cameraMode === 3 ? player.group.position.y + 1.7 : player.group.position.y + 1.1;
  if (cameraMode === 0) {
    const followYaw = player.group.rotation.y + Math.PI;
    let delta = followYaw - cameraYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    cameraYaw += delta * Math.min(1, dt * 4.5);
  }
  if (cameraMode === 4) cameraYaw += dt * .075;
  if (currentVenue !== indoorVenue) {
    indoorVenue = currentVenue || null;
    indoorVenueLabel = currentVenue?.label || '';
    if (currentVenue) {
      cameraDistance = Math.min(cameraDistance, 7.6);
      showToast(`已进入${currentVenue.label}，镜头锁定室内空间`);
    }
  }
  const indoor = Boolean(currentVenue) && !onObservationDeck;
  if (indoor) {
    if (!firstPerson) cameraMode = 2;
    if (!firstPerson && cameraDistance > 7.6) cameraDistance = 7.6;
  }
  const viewDistance = firstPerson ? .08 : indoor ? Math.min(cameraDistance, 7.6) : cameraDistance;
  const horizontal = Math.cos(cameraPitch) * viewDistance;
  const desired = target.clone().add(new THREE.Vector3(Math.sin(cameraYaw) * horizontal, Math.sin(cameraPitch) * viewDistance, Math.cos(cameraYaw) * horizontal));
  desired.y = Math.max(.48, desired.y);
  if (!firstPerson && indoor && currentVenue) {
    desired.x = THREE.MathUtils.clamp(desired.x, currentVenue.x - currentVenue.halfX + .75, currentVenue.x + currentVenue.halfX - .75);
    desired.z = THREE.MathUtils.clamp(desired.z, currentVenue.z - currentVenue.halfZ + .75, currentVenue.z + currentVenue.halfZ - .75);
    desired.y = THREE.MathUtils.clamp(desired.y, .8, Math.max(2.2, currentVenue.height - .72));
  }
  const ray = new THREE.Raycaster();
  const direction = desired.clone().sub(target);
  const rayDistance = direction.length();
  if (rayDistance > .01) {
    ray.set(target.clone().setY(Math.max(1.15, target.y)), direction.normalize());
    const hits = ray.intersectObjects(cameraOccluders, false);
    const hit = hits.find((entry) => entry.distance > .35 && entry.distance < rayDistance);
    if (hit) {
      const safeDistance = Math.max(.75, hit.distance - .42);
      desired.copy(target).add(direction.normalize().multiplyScalar(safeDistance));
      desired.y = Math.max(.82, desired.y);
    }
  }
  cameraShake = Math.max(0, cameraShake - dt * .65);
  desired.x += (Math.random() - .5) * cameraShake;
  desired.y += (Math.random() - .5) * cameraShake;
  desired.z += (Math.random() - .5) * cameraShake;
  camera.position.lerp(desired, firstPerson ? 1 : 1 - Math.pow(.001, dt));
  const lookTarget = target.clone();
  if (firstPerson) lookTarget.copy(target).add(new THREE.Vector3(-Math.sin(cameraYaw) * 8, Math.sin(cameraPitch) * 2, -Math.cos(cameraYaw) * 8));
  if (indoor && !firstPerson) lookTarget.y = Math.min(2.45, lookTarget.y + .42);
  if (cameraPitch < 0) lookTarget.y += Math.min(5.4, -cameraPitch * 8.5);
  camera.lookAt(lookTarget);
}

function updateOnlineStatus(text, connected = false) {
  $('#onlineStatus').textContent = `● ${text}`;
  $('#onlineStatus').classList.toggle('connected', connected);
}
function sendOnline(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
function openTableConsent(message) {
  clearTimeout(pendingMatchTimer);
  pendingMatchTimer = null;
  pendingConsent = { tableId: Number(message.tableId), opponent: message.opponent, consents: new Map() };
  $('#tableConsentName').textContent = `对手：${message.opponent?.name || '联机玩家'} · 赌桌 ${message.tableId}`;
  $('#tableConsentStatus').textContent = '双方点击“同意入桌”后，裁判才会开始 5 分钟出牌阶段。';
  $('#tableConsentAgree').disabled = false;
  $('#tableConsentReject').disabled = false;
  $('#tableConsent').classList.add('open');
  playSound('notice');
}

function sendTableConsent(agree) {
  if (!pendingConsent) return;
  if (pendingConsent.local) {
    if (!agree) { cancelLocalTableConsent('你拒绝了本次入桌'); return; }
    pendingConsent.playerAgreed = true;
    $('#tableConsentAgree').disabled = true;
    $('#tableConsentReject').disabled = true;
    $('#tableConsentStatus').textContent = '你已同意，等待人机确认……';
    const consent = pendingConsent;
    consent.npcTimer = setTimeout(() => {
      if (pendingConsent !== consent || !consent.playerAgreed) return;
      const accepted = Math.random() < Math.min(.94, .7 + (Number(consent.opponent.trust) || 0) / 360);
      if (!accepted) { cancelLocalTableConsent(`${consent.opponent.name} 拒绝了本次入桌`); return; }
      consent.npcAgreed = true;
      $('#tableConsentStatus').textContent = `${consent.opponent.name} 已同意，裁判正在就位……`;
      setTimeout(() => {
        if (pendingConsent !== consent || !consent.npcAgreed) return;
        pendingConsent = null;
        $('#tableConsent').classList.remove('open');
        beginLocalTableMatch(consent.table, consent.opponent);
      }, 650);
    }, 650 + Math.random() * 850);
    return;
  }
  sendOnline({ type: 'tableConsent', tableId: pendingConsent.tableId, agree });
  $('#tableConsentAgree').disabled = true;
  $('#tableConsentReject').disabled = true;
  $('#tableConsentStatus').textContent = agree ? '已同意，等待对手确认……' : '你拒绝了本次入桌。';
  if (!agree) setTimeout(() => $('#tableConsent').classList.remove('open'), 600);
}

function updateTableConsent(message) {
  if (!pendingConsent || Number(message.tableId) !== pendingConsent.tableId) return;
  const mine = message.consents?.find((item) => item.id === onlineId)?.agreed;
  const other = message.consents?.find((item) => item.id !== onlineId)?.agreed;
  $('#tableConsentStatus').textContent = mine && other ? '双方已同意，裁判正在就位……' : mine ? '已同意，等待对手确认……' : '等待你确认入桌。';
}

function sendOnlineState() {
  sendOnline({ type: 'state', state: { x: player.group.position.x, z: player.group.position.z, rot: player.group.rotation.y, inPrison: player.inPrison, alive: player.alive, name: onlineName, color: 0x2b9bd1 } });
}
function logOnline(text) { $('#onlineLog').textContent = text; }
function renderLobbyPlayers(players = []) {
  $('#lobbyPlayers').innerHTML = players.map((entry) => `<div class="lobbyPlayer"><b>${entry.name || '玩家'}</b><span>${entry.id === onlineId ? '你' : entry.inPrison ? '监狱' : '在线'}</span></div>`).join('');
}

function socketUrl() {
  const roomQuery = `?room=${encodeURIComponent(onlineRoom || 'STAR1')}`;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (location.protocol === 'file:') return `ws://127.0.0.1:8787/ws${roomQuery}`;
  if (location.port && location.port !== '8787') return `${protocol}//${location.hostname}:8787/ws${roomQuery}`;
  return `${protocol}//${location.host}/ws${roomQuery}`;
}

function connectOnline() {
  if (socket?.readyState === WebSocket.OPEN) return;
  onlineName = ($('#playerNameInput').value || '玩家').trim().slice(0, 12) || '玩家';
  onlineRoom = ($('#roomCodeInput').value || 'STAR1').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'STAR1';
  logOnline('正在连接联机服务…');
  updateOnlineStatus('连接中');
  try { socket = new WebSocket(socketUrl()); } catch { updateOnlineStatus('联机不可用'); return; }
  socket.addEventListener('open', () => { sendOnline({ type: 'join', room: onlineRoom, name: onlineName, color: 0x2b9bd1 }); $('#connectBtn').style.display = 'none'; $('#disconnectBtn').style.display = 'inline-block'; });
  socket.addEventListener('message', (event) => { try { handleOnlineMessage(JSON.parse(event.data)); } catch { logOnline('收到无法识别的服务器消息'); } });
  socket.addEventListener('close', () => {
    socket = null;
    onlineId = null;
    updateOnlineStatus('单机模式');
    logOnline('联机已断开，仍可继续单机游戏');
    $('#connectBtn').style.display = 'inline-block';
    $('#disconnectBtn').style.display = 'none';
    [...remotePlayers.keys()].forEach(removeRemotePlayer);
  });
  socket.addEventListener('error', () => { updateOnlineStatus('联机不可用'); logOnline('连接失败：请确认服务器已启动或公网端口已放行'); });
}

function disconnectOnline() { if (socket) socket.close(); }

function beginRemoteTableMatch(message) {
  const table = tables.find((item) => item.id === Number(message.tableId));
  if (!table || player.inPrison || challengeOpen || activeTable) return;
  pendingConsent = null;
  $('#tableConsent')?.classList.remove('open');
  pendingTable = null;
  const opponent = remotePlayers.get(message.opponent.id) || createRemotePlayer(message.opponent);
  if (!opponent) return;
  activeTable = table;
  activeOpponent = opponent;
  activeRemoteId = opponent.id;
  duelActive = true;
  duelEndsAt = Number(message.duelEndsAt) || Date.now() + 5 * 60 * 1000;
  opponent.seated = true;
  setTableState(table, '匹配成功');
  player.group.position.copy(tableSeat(table, -1));
  opponent.group.position.copy(tableSeat(table, 1));
  player.group.rotation.y = Math.PI / 2;
  opponent.group.rotation.y = -Math.PI / 2;
  openChallenge(opponent, true, false);
  beginRefereeCountdown(table, opponent);
  pushActivity(`联机：${opponent.name} 与你进入赌桌 ${table.id}`);
  showToast(`裁判将你和 ${opponent.name} 带到赌桌 ${table.id}`);
}

function applyRoundState(round) {
  if (!round) return;
  roundStartedAt = Number(round.startedAt) || roundStartedAt;
  roundEndsAt = Number(round.endsAt) || roundEndsAt;
  roundExpired = Boolean(round.ended) || Date.now() >= roundEndsAt;
  if (round.cardCounts) Object.assign(roundCardCounts, round.cardCounts);
  updateRoundHud();
}

function handleOnlineMessage(message) {
  if (message.type === 'welcome') {
    onlineId = message.id;
    syncSelfEconomy(message.self);
    treasurePickups.forEach((_, id) => removeTreasurePickup(id));
    (message.treasures || []).forEach(addTreasurePickup);
    applyRoundState(message.round);
    updateOnlineStatus(`房间 ${message.room}`, true);
    logOnline('已进入房间，等候其他真人玩家；空缺会由本地人机补全。');
    message.players.filter((entry) => entry.id !== onlineId).forEach(createRemotePlayer);
    renderLobbyPlayers(message.players);
    return;
  }
  if (message.type === 'roundReset') {
    if (challengeOpen) closeChallenge();
    clearTimeout(pendingMatchTimer);
    pendingMatchTimer = null;
    pendingTable = null;
    pendingConsent = null;
    duelActive = false;
    duelReady = false;
    duelEndsAt = 0;
    tables.forEach((table) => setTableState(table, '空闲'));
    $('#tableConsent')?.classList.remove('open');
    stopMeetingVoice();
    syncSelfEconomy(message.self);
    treasurePickups.forEach((_, id) => removeTreasurePickup(id));
    (message.treasures || []).forEach(addTreasurePickup);
    applyRoundState(message.round);
    player.group.position.set(Number(message.self?.x) || 0, 0, Number(message.self?.z) || 9);
    player.group.rotation.y = Number(message.self?.rot) || 0;
    player.group.visible = true;
    player.label.style.display = 'block';
    $('#gameOver')?.classList.remove('open');
    $('#prisonOverlay')?.classList.remove('open');
    [...remotePlayers.values()].forEach((remote) => {
      const state = (message.players || []).find((entry) => entry.id === remote.id);
      if (!state) return;
      remote.group.position.set(Number(state.x) || 0, 0, Number(state.z) || 9);
      remote.group.rotation.y = Number(state.rot) || 0;
      remote.inPrison = false;
      remote.leftSafely = false;
      remote.alive = true;
      remote.group.visible = true;
      remote.label.style.display = 'block';
      updateStars(remote);
    });
    renderLobbyPlayers(message.players || []);
    showToast('裁判已重置本房间：新回合开始，手牌恢复为三种各两张');
    return;
  }
  if (message.type === 'room') { renderLobbyPlayers(message.players); return; }
  if (message.type === 'playerJoined') { createRemotePlayer(message.player); renderLobbyPlayers(message.players); showToast(`${message.player.name} 加入了房间`); pushActivity(`联机：${message.player.name} 加入房间`); return; }
  if (message.type === 'playerLeft') { removeRemotePlayer(message.id); renderLobbyPlayers(message.players); return; }
  if (message.type === 'state') {
    const remote = remotePlayers.get(message.player.id) || createRemotePlayer(message.player);
    if (!remote) return;
    remote.group.position.set(Number(message.player.x) || 0, 0, Number(message.player.z) || 0);
    remote.group.rotation.y = Number(message.player.rot) || 0;
    remote.stars = Number.isFinite(message.player.stars) ? message.player.stars : remote.stars;
    remote.coins = Number.isFinite(message.player.coins) ? message.player.coins : remote.coins;
    remote.treasureValue = Number.isFinite(message.player.treasureValue) ? message.player.treasureValue : remote.treasureValue;
    remote.inPrison = Boolean(message.player.inPrison);
    remote.alive = message.player.alive !== false;
    remote.leftSafely = Boolean(message.player.leftSafely);
    remote.group.visible = !remote.leftSafely;
    remote.label.style.display = remote.leftSafely ? 'none' : 'block';
    updateStars(remote);
    return;
  }
  if (message.type === 'roundState') { applyRoundState(message.round); return; }
  if (message.type === 'treasureRemoved') { removeTreasurePickup(message.id); return; }
  if (message.type === 'treasureCollected') {
    removeTreasurePickup(message.treasure?.id);
    syncSelfEconomy(message.self);
    pushActivity(`搜寻：你找到${message.treasure?.name || '隐藏宝物'}，估值 ${message.treasure?.value || 0} 金币`);
    showToast(`拾取成功：${message.treasure?.name || '隐藏宝物'}`);
    return;
  }
  if (message.type === 'economyState') { syncSelfEconomy(message.self); return; }
  if (message.type === 'starSold') { syncSelfEconomy(message.self); showToast(`已出售 1 颗星，获得 ${message.price} 金币`); return; }
  if (message.type === 'tradeOffer') { receiveTradeOffer(message); return; }
  if (message.type === 'tradeSent') { $('#challengeResult').textContent = `交易申请已发送给 ${message.target}`; return; }
  if (message.type === 'tradeRejected') { pendingTradeOffer = null; $('#tradeOfferPanel').style.display = 'none'; showToast(message.reason || `${message.by || '对方'}拒绝了交易`); return; }
  if (message.type === 'tradeCompleted') {
    syncSelfEconomy(message.self);
    const other = activeOpponent && isRemote(activeOpponent) ? activeOpponent : null;
    if (other && message.other) { other.stars = message.other.stars; other.coins = message.other.coins; other.treasureValue = message.other.treasureValue; updateStars(other); }
    pendingTradeOffer = null;
    $('#tradeOfferPanel').style.display = 'none';
    $('#challengeResult').className = 'win';
    $('#challengeResult').textContent = '交易已由裁判确认，双方资产完成交换。';
    showToast('交易完成');
    return;
  }
  if (message.type === 'rescueResult') {
    if (!message.success) { showToast(message.message || '救赎失败'); return; }
    syncSelfEconomy(message.self);
    if (message.target?.id === onlineId) player.group.position.set(0, 0, 9);
    $('#prisonOverlay').classList.remove('open');
    stats.rescues += 1;
    saveStats();
    renderRescueList();
    showToast(message.message || '救赎成功');
    return;
  }
  if (message.type === 'rescued') {
    syncSelfEconomy(message.self);
    if (!player.inPrison) { player.group.position.set(0, 0, 9); $('#prisonOverlay').classList.remove('open'); }
    renderRescueList();
    showToast(`${message.by || '其他玩家'} 支付赎金救出了你`);
    sendOnlineState();
    return;
  }
  if (message.type === 'safeExitResult') {
    if (!message.success) { showToast(message.message || '暂时不能安全离场'); return; }
    syncSelfEconomy(message.self);
    player.group.visible = false;
    player.label.style.display = 'none';
    $('#gameOver h2').textContent = '安全离场';
    $('#gameOver p').textContent = `你满足无手牌且至少 3 颗星的条件，裁判发放了 ${message.reward} 枚虚拟金币。`;
    $('#gameOver').classList.add('open');
    return;
  }
  if (message.type === 'tableWaiting') { logOnline(`赌桌 ${message.tableId} 正在等待另一名玩家…`); return; }
  if (message.type === 'tableConsentRequest') { pendingTable = tables.find((table) => table.id === Number(message.tableId)) || pendingTable; openTableConsent(message); return; }
  if (message.type === 'tableConsentState') { updateTableConsent(message); return; }
  if (message.type === 'tableConsentCancelled') { pendingConsent = null; $('#tableConsent').classList.remove('open'); showToast(message.reason || '入桌确认已取消'); return; }
  if (message.type === 'tableMatch') { beginRemoteTableMatch(message); return; }
  if (message.type === 'duelChat') { if (challengeOpen && activeRemoteId === message.fromId) addDuelChat(message.text, false); return; }
  if (message.type === 'voiceSignal') { handleVoiceSignal(message); return; }
  if (message.type === 'meetingVoicePeers') {
    (message.peers || []).forEach((peer) => {
      const connection = ensureMeetingVoicePeer(peer);
      if (!connection || String(onlineId) > String(peer.id)) return;
      connection.createOffer().then((offer) => connection.setLocalDescription(offer)).then(() => sendOnline({ type: 'meetingVoiceSignal', roomId: message.roomId, targetId: peer.id, payload: { type: 'offer', sdp: connection.localDescription } })).catch(() => {});
    });
    return;
  }
  if (message.type === 'meetingVoicePeerJoined') {
    const peer = message.peer;
    const connection = ensureMeetingVoicePeer(peer);
    if (connection && String(onlineId) < String(peer.id)) connection.createOffer().then((offer) => connection.setLocalDescription(offer)).then(() => sendOnline({ type: 'meetingVoiceSignal', roomId: message.roomId, targetId: peer.id, payload: { type: 'offer', sdp: connection.localDescription } })).catch(() => {});
    return;
  }
  if (message.type === 'meetingVoicePeerLeft') { const peer = meetingVoicePeers.get(message.id); peer?.close(); meetingVoicePeers.delete(message.id); document.querySelector(`[data-meeting-voice-audio="${message.id}"]`)?.remove(); return; }
  if (message.type === 'meetingVoiceSignal') { handleMeetingVoiceSignal(message); return; }
  if (message.type === 'duelExpired') { if (challengeOpen) { $('#challengeResult').className = 'draw'; $('#challengeResult').textContent = message.reason || '出牌阶段结束，本局作废。'; setTimeout(closeChallenge, 1300); } return; }
  if (message.type === 'rpsInvite') {
    const remote = remotePlayers.get(message.from.id) || createRemotePlayer(message.from);
    if (remote) { beginRemoteTableMatch({ tableId: message.tableId || 1, opponent: message.from }); }
    return;
  }
  if (message.type === 'rpsResult') {
    const remote = remotePlayers.get(message.opponent.id) || activeOpponent;
    if (remote) { remote.stars = message.opponent.stars; remote.coins = message.opponent.coins; updateStars(remote); }
    player.stars = message.self.stars;
    player.coins = message.self.coins;
    if (Object.prototype.hasOwnProperty.call(message.self, 'card')) player.card = message.self.card;
    if (message.self.hand) player.hand = { ...message.self.hand };
    ensureHand(player);
    updateStars(player);
    updateHud();
    stats.duels += 1;
    if (message.result === 'win') stats.wins += 1;
    playSound(message.result);
    saveStats();
    $('#challengeResult').className = message.result;
    $('#challengeResult').textContent = `你出${moveName(message.selfMove)}。裁判只公开结果，不公开对手暗牌。`;
    $('#tableStatus').textContent = '裁判：结算完成';
    if (player.stars <= 0) sendToPrison('星星归零');
    if (remote?.stars <= 0) { remote.inPrison = true; remote.alive = true; remote.group.position.set(prison.center.x, 0, prison.center.z + 1.7); }
    setTimeout(() => { if (challengeOpen && !player.inPrison) closeChallenge(); }, 1900);
    $('#challengeResult').textContent = `你出${cardIcon(message.selfMove)}。裁判已完成暗牌结算：${message.result === 'win' ? '你赢了，夺得 1 颗星！' : message.result === 'lose' ? '你输了，失去 1 颗星。' : '平局。'}`;
    return;
  }
  if (message.type === 'error') logOnline(message.message || '服务器返回错误');
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  const time = clock.elapsedTime;
  localSaveTimer -= dt;
  if (localSaveTimer <= 0) { localSaveTimer = 4; persistLocalState(); }
  updateScenePulse(time);
  updateElevators();
  updateRideExperience(time);
  updateTowerClock(Math.max(0, (roundEndsAt - Date.now()) / 1000));
  treasurePickups.forEach((pickup) => {
    pickup.gem.rotation.y += dt * 1.8;
    pickup.gem.position.y = .68 + Math.sin(time * 2.4 + pickup.group.position.x) * .08;
    pickup.ring.rotation.z += dt * .9;
  });
  tables.forEach((table) => {
    if (table.holoRing) table.holoRing.rotation.z += dt * (table.occupied ? 1.4 : .35);
  });
  rotateWorldEvent(dt);
  movePlayer(dt);
  updateBots(dt, time);
  botActivityTimer -= dt;
  if (botActivityTimer <= 0) { botActivityTimer = 15 + Math.random() * 10; startBotActivity(); }
  updateZone();
  updateInteraction();
  updateEffects(dt);
  updateLoan();
  roundHudTimer -= dt;
  if (roundHudTimer <= 0) { roundHudTimer = .25; updateRoundHud(); renderPrivateScoreboard(); }
  if (player.debt > 0 && player.loanDueAt > 0 && Date.now() > player.loanDueAt && !player.inPrison) { player.loanDueAt = 0; sendToPrison('借贷逾期'); }
  remoteStateTimer += dt;
  if (remoteStateTimer > .12) { remoteStateTimer = 0; sendOnlineState(); }
  miniMapTimer -= dt;
  if (miniMapTimer <= 0) { miniMapTimer = .12; drawMiniMap(); drawDetailedMap(); }
  missionTimer -= dt;
  if (missionTimer <= 0) { missionTimer = .25; updateMissionPanel(); }
  npcs.forEach((npc) => { if (npc.alive) { npc.group.position.y = Math.sin(time * 2 + npc.phase) * .025; npc.group.rotation.y += Math.sin(time * .5 + npc.phase) * .0007; } });
  updateCamera(dt);
  updateLabels();
  renderer.render(scene, camera);
}

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (activeRideExperience?.ride.type === 'bumper') {
    const rideKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(rideKey)) { event.preventDefault(); keys[rideKey] = true; return; }
  }
  if ($('#parkGameModal')?.classList.contains('open') && parkGameState?.type === 'maze') {
    const mazeKeys = { ArrowUp: [-1, 0], w: [-1, 0], ArrowDown: [1, 0], s: [1, 0], ArrowLeft: [0, -1], a: [0, -1], ArrowRight: [0, 1], d: [0, 1] };
    const move = mazeKeys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (move) { event.preventDefault(); moveMazePlayer(move[0], move[1]); return; }
  }
  if ($('#parkGameModal')?.classList.contains('open') && parkGameState?.type === 'outdoorRide' && parkGameState.rideType === 'bumper') {
    const rideKeys = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    const move = rideKeys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (move) { event.preventDefault(); moveOutdoorRide(move[0], move[1]); return; }
  }
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = true;
  if (key === 'e') performPrimaryAction();
  if (key === 'v') cycleCamera();
  if (key === ' ' || key === 'Spacebar') requestJump();
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) event.preventDefault();
});
window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = false;
});
window.addEventListener('blur', () => { Object.keys(keys).forEach((key) => { keys[key] = false; }); setSprint(false); });
const mobileSprint = $('#mobileSprint');
function setSprint(active) {
  sprintActive = Boolean(active);
  mobileSprint?.classList.toggle('active', sprintActive);
}
['pointerdown', 'touchstart'].forEach((eventName) => mobileSprint?.addEventListener(eventName, (event) => { event.preventDefault(); setSprint(true); }, { passive: false }));
['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture', 'touchend', 'touchcancel'].forEach((eventName) => mobileSprint?.addEventListener(eventName, () => setSprint(false)));
$$('#rpsButtons button').forEach((button) => button.addEventListener('click', () => playRound(button.dataset.move)));
$('#closeChallenge').addEventListener('click', closeChallenge);
$('#restart').addEventListener('click', resetLocalRound);
$('#restartGameBtn')?.addEventListener('click', () => {
  if (confirm('确定重新开局吗？本局金币、手牌和位置会重置，长期统计与内容轮换记录会保留。')) resetLocalRound();
});
$('#shopBtn').addEventListener('click', () => { $('#shopModal').classList.add('open'); updateHud(); });
$('#taskBtn').addEventListener('click', () => { $('#taskModal').classList.add('open'); renderTasks(); });
$('#loanBtn').addEventListener('click', () => { $('#loanModal').classList.add('open'); updateLoan(); });
$('#lobbyBtn').addEventListener('click', () => $('#lobbyModal').classList.add('open'));
$('#cameraBtn').addEventListener('click', cycleCamera);
$('#firstPersonBtn')?.addEventListener('click', () => setCameraMode(cameraMode === 5 ? cameraModeBeforeFirstPerson : 5));
$('#soundBtn')?.addEventListener('click', toggleAudio);
$('#musicBtn')?.addEventListener('click', () => {
  toggleLocalMusic();
});
$('#dayNightBtn')?.addEventListener('click', () => {
  const next = dayNightMode === 'night' ? 'day' : dayNightMode === 'day' ? 'cycle' : 'night';
  setDayNightMode(next);
  persistLocalState();
});
$('#musicFileBtn')?.addEventListener('click', () => $('#musicFileInput')?.click());
$('#musicFileInput')?.addEventListener('change', (event) => loadLocalMusic(event.target.files?.[0]));
$('#signInBtn').addEventListener('click', signIn);
$('#borrowBtn').addEventListener('click', borrowLoan);
$('#repayBtn').addEventListener('click', repayLoan);
$('#prisonRescueBtn').addEventListener('click', rescueSelf);
$('#allyBtn').addEventListener('click', allyWithNpc);
$('#betrayBtn').addEventListener('click', betrayNpc);
$('#connectBtn').addEventListener('click', connectOnline);
$('#disconnectBtn').addEventListener('click', disconnectOnline);
$('#rescueBtn').addEventListener('click', openRescueModal);
$('#safeExitBtn').addEventListener('click', safeLeave);
$('#sellStarBtn').addEventListener('click', sellStar);
$('#tradeBtn').addEventListener('click', () => { $('#tradePanel').style.display = 'block'; renderTradeOffer(); });
$('#sendTradeBtn').addEventListener('click', sendTradeOffer);
$('#acceptTradeBtn').addEventListener('click', acceptTradeOffer);
$('#rejectTradeBtn').addEventListener('click', rejectTradeOffer);
$('#sendChatBtn').addEventListener('click', sendDuelChat);
$('#duelChatInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') sendDuelChat(); });
$('#voiceBtn').addEventListener('click', startVoice);
$('#tableConsentAgree')?.addEventListener('click', () => sendTableConsent(true));
$('#tableConsentReject')?.addEventListener('click', () => sendTableConsent(false));
$('#closeMeetingBtn')?.addEventListener('click', () => {
  stopMeetingVoice();
  activeCase = null;
  activeDiscussion = null;
  $('#meetingModal')?.classList.remove('open');
});
$('#closeParkGameBtn')?.addEventListener('click', () => {
  activeParkGame = null;
  parkGameState = null;
  $('#parkGameModal')?.classList.remove('open');
});
$('#meetingVoiceBtn')?.addEventListener('click', () => {
  if (meetingVoiceRoomId) stopMeetingVoice();
  else startMeetingVoice();
});
function enterStartMode(mode) {
  $('#startScreen')?.classList.remove('open');
  if (mode === 'online') {
    $('#lobbyModal')?.classList.add('open');
    $('#playerNameInput')?.focus();
    pushActivity('已进入联机大厅：填写昵称和房间码后连接');
  } else {
    pushActivity('单机探索已开始：夜场地图和人机正在巡游');
  }
}
$('#startSingleBtn')?.addEventListener('click', () => enterStartMode('single'));
$('#startOnlineBtn')?.addEventListener('click', () => enterStartMode('online'));
$$('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).classList.remove('open')));
$$('[data-item]').forEach((button) => button.addEventListener('click', () => purchase(button.dataset.item)));
$$('[data-maze-dir]').forEach((button) => button.addEventListener('click', () => {
  const moves = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const move = moves[button.dataset.mazeDir];
  if (!move) return;
  if ($('#parkGameModal')?.classList.contains('open') && parkGameState?.type === 'outdoorRide' && parkGameState.rideType === 'bumper') moveOutdoorRide(move[0], move[1]);
  else moveMazePlayer(move[0], move[1]);
}));
parkGameCanvas?.addEventListener('pointerdown', (event) => {
  if (!parkGameState || parkGameState.resolved) return;
  const rect = parkGameCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left; const y = event.clientY - rect.top;
  // Drawing uses logical CSS pixels; converting through devicePixelRatio here
  // makes taps miss on high-DPI phones. Keep pointer coordinates in the same space.
  const canvasX = x; const canvasY = y;
  if (parkGameState.type === 'timing' && parkGameState.target) {
    const { width, height } = parkCanvasSize();
    const distance = Math.hypot(parkGameState.target.x - canvasX, parkGameState.target.y - canvasY);
    const centerDistance = Math.hypot(canvasX - width / 2, canvasY - height / 2);
    finishParkGame(distance < 42 && centerDistance < 92, distance < 42 && centerDistance < 92 ? '你捕捉到了移动核心' : '核心从指尖滑过');
    return;
  }
  if (parkGameState.type === 'outdoorRide') {
    if (parkGameState.rideType === 'roller' && parkGameState.target) {
      const success = Math.hypot(canvasX - parkGameState.target.x, canvasY - parkGameState.target.y) < 48 && Math.hypot(canvasX - rect.width / 2, canvasY - rect.height * .55) < 98;
      finishOutdoorRide(success, success ? '你在中心制动区稳稳停住了车厢' : '车厢冲过了制动区');
    } else if (parkGameState.rideType === 'wheel') {
      const centerX = rect.width / 2; const centerY = rect.height * .58; const radius = Math.min(145, rect.height * .34);
      const clicked = Array.from({ length: 8 }, (_, index) => {
        const angle = parkGameState.wheelAngle + index / 8 * Math.PI * 2;
        return { index, distance: Math.hypot(canvasX - (centerX + Math.cos(angle) * radius), canvasY - (centerY + Math.sin(angle) * radius)) };
      }).sort((a, b) => a.distance - b.distance)[0];
      const success = clicked?.index === 0 && clicked.distance < 48;
      finishOutdoorRide(success, success ? '你抓住了金色观测座舱' : '摩天轮转过了观测点');
    }
    return;
  }
  if (parkGameState.type === 'choice' && parkGameState.doors) {
    const { width, height } = parkCanvasSize();
    const selected = [width * .2, width * .5, width * .8].findIndex((doorX) => Math.abs(canvasX - doorX) < 58 && canvasY > height * .52 - 105 && canvasY < height * .52 + 105);
    if (selected >= 0) finishParkGame(selected === parkGameState.correct, selected === parkGameState.correct ? '你打开了正确的门' : '门后只有警报与空箱');
    return;
  }
  if (parkGameState.type === 'memory' && !parkGameState.revealed && parkGameState.symbols) {
    const { width, height } = parkCanvasSize();
    const selected = parkGameState.symbols.findIndex((_, index) => {
      const point = memoryCardPoint(index, width, height);
      return Math.abs(canvasX - point.x) < 44 && Math.abs(canvasY - point.y) < 54;
    });
    if (selected >= 0) {
      const expectedIndex = parkGameState.memorySequence[parkGameState.memoryInput.length];
      if (selected !== expectedIndex) finishParkGame(false, `你翻开了“${parkGameState.symbols[selected]}”，但下一张应是“${parkGameState.symbols[expectedIndex]}”`);
      else { parkGameState.memoryInput.push(selected); drawMemoryGame(); if (parkGameState.memoryInput.length === parkGameState.memorySequence.length) finishParkGame(true, '你按正确顺序解开五张暗箱记忆牌'); }
    }
  }
  if (parkGameState.type === 'highcard' && parkGameState.playerHand && !parkGameState.exchanged && !parkGameState.resolved) {
    const { width, height } = parkCanvasSize();
    const cardWidth = Math.min(84, (width - 90) / 5.4);
    const gap = Math.min(14, cardWidth * .14);
    const total = parkGameState.playerHand.length * cardWidth + (parkGameState.playerHand.length - 1) * gap;
    const start = (width - total) / 2;
    const y = height * .53 + 12;
    const selected = parkGameState.playerHand.findIndex((_, index) => {
      const x = start + index * (cardWidth + gap);
      return canvasX >= x && canvasX <= x + cardWidth && canvasY >= y && canvasY <= y + Math.min(122, height * .24);
    });
    if (selected >= 0) {
      const at = parkGameState.selected.indexOf(selected);
      if (at >= 0) parkGameState.selected.splice(at, 1);
      else if (parkGameState.selected.length < 2) parkGameState.selected.push(selected);
      drawCardGame();
    }
  }
});
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
document.addEventListener('pointerdown', startAudio, { passive: true });
document.addEventListener('keydown', startAudio, { passive: true });

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  cameraDragging = true;
  cameraPointerX = event.clientX;
  cameraPointerY = event.clientY;
  renderer.domElement.setPointerCapture?.(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!cameraDragging) return;
  const dx = event.clientX - cameraPointerX;
  const dy = event.clientY - cameraPointerY;
  cameraPointerX = event.clientX;
  cameraPointerY = event.clientY;
  cameraYaw -= dx * .0032;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * .0042, -.82, 1.35);
  if (cameraMode !== 5) {
    cameraMode = 2;
    $('#cameraBtn').textContent = '视角：自由';
  }
});
renderer.domElement.addEventListener('pointerup', (event) => { cameraDragging = false; renderer.domElement.releasePointerCapture?.(event.pointerId); });
renderer.domElement.addEventListener('pointercancel', () => { cameraDragging = false; });
renderer.domElement.addEventListener('pointerleave', () => { cameraDragging = false; });
renderer.domElement.addEventListener('wheel', (event) => { cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * .006, 4.2, 28); cameraMode = 2; $('#cameraBtn').textContent = '视角：自由'; }, { passive: true });

const joystick = $('#joystick');
const stick = $('#stick');
let joystickPointerId = null;
function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const distance = Math.min(32, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  joystickInput = { x: x / 32, z: y / 32 };
}
function resetJoystick(event) {
  if (joystickPointerId !== null && event?.pointerId !== undefined && event.pointerId !== joystickPointerId) return;
  joystickPointerId = null;
  stick.style.transform = '';
  joystickInput = { x: 0, z: 0 };
}
joystick.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  joystickPointerId = event.pointerId;
  joystick.setPointerCapture?.(event.pointerId);
  updateJoystick(event);
});
joystick.addEventListener('pointermove', (event) => { if (event.pointerId === joystickPointerId) { event.preventDefault(); updateJoystick(event); } });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => joystick.addEventListener(type, resetJoystick));
$('#mobileCamera')?.addEventListener('click', () => setCameraMode(cameraMode === 5 ? 0 : 5));
$('#mobileJump')?.addEventListener('click', requestJump);
$('#moreBtn')?.addEventListener('click', () => {
  const actions = $('#rightActions');
  const expanded = actions.classList.toggle('expanded');
  $('#moreBtn').textContent = expanded ? '收起' : '更多';
});
$$('#rightActions .mobileSecondary').forEach((button) => button.addEventListener('click', () => {
  if (!isMobileDevice) return;
  $('#rightActions').classList.remove('expanded');
  $('#moreBtn').textContent = '更多';
}));
$('#mobileAction').addEventListener('click', performPrimaryAction);
$('#miniMapWrap')?.addEventListener('click', () => {
  bigMapOpen = true;
  $('#bigMapModal')?.classList.add('open');
  drawDetailedMap();
});
$('#closeBigMapBtn')?.addEventListener('click', () => {
  bigMapOpen = false;
  $('#bigMapModal')?.classList.remove('open');
});
$('#bigMapModal')?.addEventListener('click', (event) => {
  if (event.target === $('#bigMapModal')) {
    bigMapOpen = false;
    $('#bigMapModal').classList.remove('open');
  }
});
window.addEventListener('beforeunload', () => { persistLocalState(); sendOnline({ type: 'tableLeave' }); });

await loadContentDatabase();
addWorld();
addPrison();
addTables();
seedDatabaseTreasures();
addDatabaseActors();
restoreLocalState();
syncBotFill();
updateHud();
animate();
setTimeout(() => $('#loadingScreen').classList.add('hidden'), 900);
