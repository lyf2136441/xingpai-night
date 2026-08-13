const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8787);
const CONTENT_DB = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'content-db.json'), 'utf8')); }
  catch (error) { console.warn('content-db.json unavailable, using fallback content:', error.message); return {}; }
})();
const MAX_PLAYERS_PER_ROOM = 8;
const STATIC_ROOT = path.resolve(__dirname);
const rooms = new Map();
const duels = new Map();
let nextId = 1;
const ROUND_DURATION_MS = 30 * 60 * 1000;
const DUEL_DURATION_MS = 5 * 60 * 1000;
const CARD_TYPES = ['rock', 'paper', 'scissors'];
const RESCUE_COST = 300;
const STAR_SELL_PRICE = 120;
const SAFE_EXIT_REWARD = 180;
const MAP_LIMIT = 140;
const PRISON_CENTER = { x: -50, z: -30 };
const SERVER_BUILDINGS = [
  { x: -50, z: 30, halfX: 12, halfZ: 9, doorHalf: 2.2 },
  { x: 50, z: -30, halfX: 12, halfZ: 9, doorHalf: 2.2 },
  { x: 51, z: 30, halfX: 13, halfZ: 10, doorHalf: 2.2 },
  { x: 76, z: 58, halfX: 15, halfZ: 12, doorHalf: 2.2 },
  { x: -78, z: 58, halfX: 16, halfZ: 12.5, doorHalf: 2.2 },
  { x: 78, z: -62, halfX: 24, halfZ: 19, doorHalf: 2.2 }
];
const STARTING_HAND = { rock: 2, paper: 2, scissors: 2 };
const TREASURE_LIBRARY = Array.isArray(CONTENT_DB.treasures) && CONTENT_DB.treasures.length
  ? CONTENT_DB.treasures.map((item) => [item.name, Number(item.value) || 0])
  : [
      ['黑曜筹码', 80], ['旧王徽记', 120], ['银色怀表', 150], ['紫晶吊坠', 180],
      ['裁判印章', 220], ['夜场钥匙', 260], ['远古骰子', 320]
    ];
const TREASURE_SPAWNS = Array.isArray(CONTENT_DB.treasureSpawns) && CONTENT_DB.treasureSpawns.length
  ? CONTENT_DB.treasureSpawns
  : [
      [-82, -16], [-48, 46], [-24, -72], [22, -76], [46, -34], [78, 8],
      [74, 68], [30, 72], [-16, 80], [-76, 62], [-72, 20], [48, 48]
    ];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function send(socket, message) {
  if (socket.readyState === 1) socket.send(JSON.stringify(message));
}

function cleanName(value) {
  return String(value || '玩家').replace(/[<>]/g, '').trim().slice(0, 12) || '玩家';
}

function cleanRoom(value) {
  return String(value || 'STAR1').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'STAR1';
}

function createDeck() {
  const deck = [];
  CARD_TYPES.forEach((type) => { for (let i = 0; i < 16; i++) deck.push(type); });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createStartingHand() { return { ...STARTING_HAND }; }
function handTotal(player) { return Object.values(player?.hand || {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0); }
function hasHandCard(player, type) { return Boolean(player?.hand && CARD_TYPES.includes(type) && Number(player.hand[type]) > 0); }
function consumeHandCard(player, type) {
  if (!hasHandCard(player, type)) return false;
  player.hand[type] -= 1;
  player.card = CARD_TYPES.find((entry) => hasHandCard(player, entry)) || null;
  return true;
}

function drawCard(room) {
  if (!room.deck.length) room.deck = createDeck();
  return room.deck.shift() || null;
}

function createTreasureField() {
  const field = new Map();
  TREASURE_SPAWNS.forEach(([x, z], index) => {
    const [name, value] = TREASURE_LIBRARY[index % TREASURE_LIBRARY.length];
    field.set(`loot-${index + 1}`, { id: `loot-${index + 1}`, name, value, x, z });
  });
  return field;
}

function treasureValue(player) {
  return (player.treasures || []).reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
}

function publicPlayer(client, revealCard = false) {
  const player = { ...client.player };
  player.treasureValue = treasureValue(player);
  player.treasureCount = (player.treasures || []).length;
  player.hand = player.hand ? { ...player.hand } : createStartingHand();
  if (!revealCard) {
    // 其他玩家只能看到公开状态，星星数量属于玩家自己的私密资源。
    delete player.stars;
    delete player.card;
    delete player.hand;
    delete player.treasures;
  }
  return player;
}

function roomPlayers(room) {
  return [...room.clients].filter((client) => client.player).map((client) => publicPlayer(client));
}

function roundState(room) {
  const counts = { rock: 0, paper: 0, scissors: 0 };
  room.clients.forEach((client) => {
    CARD_TYPES.forEach((type) => { counts[type] += Math.max(0, Number(client.player?.hand?.[type]) || 0); });
  });
  return { startedAt: room.roundStartedAt, endsAt: room.roundEndsAt, ended: Date.now() >= room.roundEndsAt, cardCounts: counts };
}

function broadcastRound(room) {
  if (room) broadcast(room, { type: 'roundState', round: roundState(room) });
}

function broadcast(room, message, except = null) {
  if (!room) return;
  for (const client of room.clients) if (client !== except) send(client.socket, message);
}

function compareMoves(a, b) {
  if (a === b) return 'draw';
  return ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) ? 'win' : 'lose';
}

function duelKey(a, b) { return [a.player.id, b.player.id].sort().join(':'); }

function inPrison(x, z) {
  return Math.abs(x - PRISON_CENTER.x) < 7.85 && Math.abs(z - PRISON_CENTER.z) < 7.15;
}

function insideBuilding(x, z, building) {
  return Math.abs(x - building.x) < building.halfX && Math.abs(z - building.z) < building.halfZ;
}

function atBuildingDoor(x, z, building) {
  return Math.abs(x - building.x) < building.doorHalf && z > building.z + building.halfZ - 1.6;
}

function blockedByBuilding(x, z, fromX = null, fromZ = null) {
  return SERVER_BUILDINGS.some((building) => {
    if (!insideBuilding(x, z, building) || atBuildingDoor(x, z, building)) return false;
    return !(Number.isFinite(fromX) && Number.isFinite(fromZ) && insideBuilding(fromX, fromZ, building));
  });
}

function removeFromTableQueue(client) {
  if (!client.room) return;
  for (const [tableId, waiting] of client.room.tableQueues) {
    if (waiting === client) client.room.tableQueues.delete(tableId);
  }
  for (const [tableId, pending] of client.room.pendingTableMatches) {
    if (!pending.players.includes(client)) continue;
    clearTimeout(pending.timeout);
    client.room.pendingTableMatches.delete(tableId);
    pending.players.forEach((other) => {
      if (other !== client) send(other.socket, { type: 'tableConsentCancelled', tableId, reason: '对手离开了等待区' });
    });
  }
}

function removeFromMeetingVoice(client) {
  if (!client.room) return;
  for (const [roomId, members] of client.room.meetingVoiceRooms) {
    if (!members.delete(client)) continue;
    members.forEach((other) => send(other.socket, { type: 'meetingVoicePeerLeft', roomId, id: client.player?.id }));
    if (!members.size) client.room.meetingVoiceRooms.delete(roomId);
  }
}

function clearDuelFor(client) {
  for (const [key, duel] of duels) {
    if (duel.players.includes(client)) { clearTimeout(duel.timeout); duels.delete(key); }
  }
  client.tableId = null;
  client.matchKey = null;
}

function createRoom(code) {
  const now = Date.now();
  return {
    code,
    clients: new Set(),
    tableQueues: new Map(),
    pendingTableMatches: new Map(),
    meetingVoiceRooms: new Map(),
    tradeOffers: new Map(),
    treasures: createTreasureField(),
    deck: createDeck(),
    roundStartedAt: now,
    roundEndsAt: now + ROUND_DURATION_MS
  };
}

function leaveRoom(client) {
  if (!client.room) return;
  const room = client.room;
  removeFromTableQueue(client);
  removeFromMeetingVoice(client);
  clearDuelFor(client);
  room.clients.delete(client);
  client.room = null;
  client.roomCode = null;
  if (room.clients.size === 0) rooms.delete(room.code);
  else broadcast(room, { type: 'playerLeft', id: client.player.id, players: roomPlayers(room) });
}

function joinRoom(client, message) {
  leaveRoom(client);
  const roomCode = cleanRoom(message.room);
  const room = rooms.get(roomCode) || createRoom(roomCode);
  if (room.clients.size >= MAX_PLAYERS_PER_ROOM) return send(client.socket, { type: 'error', message: '房间已满，最多 8 名真人玩家。' });
  rooms.set(roomCode, room);
  client.room = room;
  client.roomCode = roomCode;
  client.player = {
    id: `P${nextId++}`,
    name: cleanName(message.name),
    x: 0,
    z: 9,
    rot: 0,
    stars: 3,
    coins: 120,
    treasures: [{ id: `starter-${nextId}`, name: TREASURE_LIBRARY[nextId % TREASURE_LIBRARY.length][0], value: 100 + (nextId % 3) * 40 }],
    alive: true,
    leftSafely: false,
    card: 'rock',
    hand: createStartingHand(),
    inPrison: false,
    color: Number(message.color) || 0x2b9bd1,
    accent: 0x68e5ff
  };
  client.tableId = null;
  client.matchKey = null;
  room.clients.add(client);
  send(client.socket, {
    type: 'welcome',
    id: client.player.id,
    room: roomCode,
    players: roomPlayers(room),
    self: publicPlayer(client, true),
    treasures: [...room.treasures.values()],
    round: roundState(room)
  });
  broadcast(room, { type: 'playerJoined', player: publicPlayer(client), players: roomPlayers(room) }, client);
  broadcastRound(room);
}

function resetRoomRound(client) {
  const room = client?.room;
  if (!room) return;
  room.tableQueues.clear();
  room.pendingTableMatches.forEach((pending) => clearTimeout(pending.timeout));
  room.pendingTableMatches.clear();
  room.tradeOffers.clear();
  [...room.clients].forEach((member) => clearDuelFor(member));
  const now = Date.now();
  room.roundStartedAt = now;
  room.roundEndsAt = now + ROUND_DURATION_MS;
  room.deck = createDeck();
  room.treasures = createTreasureField();
  room.clients.forEach((member) => {
    const player = member.player;
    player.x = 0;
    player.z = 9;
    player.rot = 0;
    player.stars = 3;
    player.coins = 120;
    player.treasures = [{ id: `starter-${nextId++}`, name: TREASURE_LIBRARY[nextId % TREASURE_LIBRARY.length][0], value: 120 }];
    player.alive = true;
    player.leftSafely = false;
    player.eliminated = false;
    player.card = 'rock';
    player.hand = createStartingHand();
    player.inPrison = false;
    send(member.socket, { type: 'roundReset', self: publicPlayer(member, true), players: roomPlayers(room), treasures: [...room.treasures.values()], round: roundState(room) });
  });
  broadcastRound(room);
}

function handleState(client, message) {
  if (!client.player || !client.room) return;
  if (client.player.leftSafely) return;
  const state = message.state || {};
  let x = Number(state.x);
  let z = Number(state.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, x));
  z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, z));
  const wantsPrison = state.inPrison === true;
  if (client.player.inPrison) {
    // Prison exit is an economy action (rescue), never a client-controlled position update.
    x = client.player.x;
    z = client.player.z;
  } else if (!wantsPrison && inPrison(x, z)) {
    x = client.player.x;
    z = client.player.z;
  }
  if (!client.player.inPrison && blockedByBuilding(x, z, client.player.x, client.player.z)) {
    x = client.player.x;
    z = client.player.z;
  }
  if (wantsPrison && client.player.inPrison) {
    x = client.player.x;
    z = client.player.z;
  }
  client.player.x = x;
  client.player.z = z;
  if (Number.isFinite(Number(state.rot))) client.player.rot = Number(state.rot);
  if (typeof state.alive === 'boolean') client.player.alive = state.alive;
  broadcast(client.room, { type: 'state', player: publicPlayer(client) }, client);
}

function findRoomPlayer(room, id) {
  return [...room.clients].find((client) => client.player?.id === id) || null;
}

function sendEconomyState(client) {
  send(client.socket, { type: 'economyState', self: publicPlayer(client, true) });
}

function broadcastPlayerState(client) {
  if (client?.room) broadcast(client.room, { type: 'state', player: publicPlayer(client) });
}

function handleTreasurePickup(client, message) {
  if (!client.room || !client.player || client.player.inPrison) return;
  const treasure = client.room.treasures.get(String(message.id || ''));
  if (!treasure) return send(client.socket, { type: 'error', message: '这件宝物已经被别人拾取了。' });
  if (Math.hypot(client.player.x - treasure.x, client.player.z - treasure.z) > 3.2) return;
  client.room.treasures.delete(treasure.id);
  client.player.treasures ||= [];
  client.player.treasures.push({ id: `loot-${client.player.id}-${Date.now()}`, name: treasure.name, value: treasure.value });
  send(client.socket, { type: 'treasureCollected', treasure, self: publicPlayer(client, true) });
  broadcast(client.room, { type: 'treasureRemoved', id: treasure.id }, client);
  broadcastPlayerState(client);
}

function numericOffer(value) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function transferTreasure(from, to, value) {
  let remaining = value;
  from.treasures ||= [];
  to.treasures ||= [];
  for (let i = from.treasures.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const item = from.treasures[i];
    const taken = Math.min(Number(item.value) || 0, remaining);
    item.value -= taken;
    remaining -= taken;
    if (item.value <= 0) from.treasures.splice(i, 1);
  }
  if (remaining < value) to.treasures.push({ id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '交易所得宝物', value: value - remaining });
}

function tradeHasEnough(client, coins, stars, treasure) {
  return client.player.coins >= coins && client.player.stars >= stars && treasureValue(client.player) >= treasure;
}

function handleTradeOffer(client, message) {
  if (!client.room || !client.player) return;
  const target = findRoomPlayer(client.room, message.targetId);
  if (!target || target === client) return send(client.socket, { type: 'error', message: '没有找到可交易的玩家。' });
  const offer = {
    offerCoins: numericOffer(message.offerCoins),
    requestCoins: numericOffer(message.requestCoins),
    offerStars: numericOffer(message.offerStars),
    requestStars: numericOffer(message.requestStars),
    offerTreasure: numericOffer(message.offerTreasure),
    requestTreasure: numericOffer(message.requestTreasure)
  };
  if (!Object.values(offer).some((value) => value > 0)) return send(client.socket, { type: 'error', message: '交易内容不能为空。' });
  if (!tradeHasEnough(client, offer.offerCoins, offer.offerStars, offer.offerTreasure)) return send(client.socket, { type: 'error', message: '你的金币、星星或宝物估值不足。' });
  const id = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  client.room.tradeOffers.set(id, { id, from: client, to: target, offer, createdAt: Date.now() });
  send(target.socket, { type: 'tradeOffer', id, from: publicPlayer(client), offer });
  send(client.socket, { type: 'tradeSent', id, target: target.player.name, offer });
}

function handleTradeDecision(client, message, accepted) {
  if (!client.room || !client.player) return;
  const trade = client.room.tradeOffers.get(String(message.id || ''));
  if (!trade || trade.to !== client) return send(client.socket, { type: 'error', message: '这笔交易已经失效。' });
  client.room.tradeOffers.delete(trade.id);
  if (!accepted) {
    send(trade.from.socket, { type: 'tradeRejected', id: trade.id, by: client.player.name });
    return;
  }
  const { from, to, offer } = trade;
  if (!tradeHasEnough(from, offer.offerCoins, offer.offerStars, offer.offerTreasure) || !tradeHasEnough(to, offer.requestCoins, offer.requestStars, offer.requestTreasure)) {
    send(from.socket, { type: 'tradeRejected', id: trade.id, by: client.player.name, reason: '接受时资源已经不足' });
    send(to.socket, { type: 'tradeRejected', id: trade.id, by: client.player.name, reason: '资源不足，交易取消' });
    return;
  }
  from.player.coins += offer.requestCoins - offer.offerCoins;
  to.player.coins += offer.offerCoins - offer.requestCoins;
  from.player.stars = Math.max(0, Math.min(6, from.player.stars + offer.requestStars - offer.offerStars));
  to.player.stars = Math.max(0, Math.min(6, to.player.stars + offer.offerStars - offer.requestStars));
  transferTreasure(from.player, to.player, offer.offerTreasure);
  transferTreasure(to.player, from.player, offer.requestTreasure);
  [from, to].forEach((participant) => {
    if (participant.player.stars <= 0) {
      participant.player.inPrison = true;
      participant.player.eliminated = true;
      participant.player.x = PRISON_CENTER.x;
      participant.player.z = PRISON_CENTER.z + 1.7;
    }
  });
  [from, to].forEach((participant) => {
    send(participant.socket, { type: 'tradeCompleted', id: trade.id, self: publicPlayer(participant, true), other: publicPlayer(participant === from ? to : from) });
    broadcastPlayerState(participant);
  });
}

function handleSellStar(client) {
  if (!client.room || !client.player) return;
  if (client.player.stars <= 1) return send(client.socket, { type: 'error', message: '至少保留 1 颗星，才能继续留在夜场。' });
  client.player.stars -= 1;
  client.player.coins += STAR_SELL_PRICE;
  send(client.socket, { type: 'starSold', price: STAR_SELL_PRICE, self: publicPlayer(client, true) });
  broadcastPlayerState(client);
}

function handleRescue(client, message) {
  if (!client.room || !client.player) return;
  const target = findRoomPlayer(client.room, message.targetId) || (message.targetId === client.player.id ? client : null);
  if (!target || !target.player.inPrison) return send(client.socket, { type: 'rescueResult', success: false, message: '目标不在无限监狱中。' });
  if (client.player.coins < RESCUE_COST) return send(client.socket, { type: 'rescueResult', success: false, message: `需要 ${RESCUE_COST} 金币才能救赎。` });
  client.player.coins -= RESCUE_COST;
  target.player.inPrison = false;
  target.player.eliminated = false;
  target.player.alive = true;
  target.player.stars = 1;
  target.player.x = 0;
  target.player.z = 9;
  send(client.socket, { type: 'rescueResult', success: true, self: publicPlayer(client, true), target: publicPlayer(target, false), message: `已支付 ${RESCUE_COST} 金币，${target.player.name} 获得自由。` });
  if (target !== client) send(target.socket, { type: 'rescued', self: publicPlayer(target, true), by: client.player.name });
  broadcastPlayerState(client);
  if (target !== client) broadcastPlayerState(target);
}

function handleSafeLeave(client) {
  if (!client.room || !client.player || client.player.inPrison || client.player.leftSafely || !client.player.alive) return;
  if (handTotal(client.player) > 0 || client.player.stars < 3) {
    return send(client.socket, { type: 'safeExitResult', success: false, message: '安全离场条件：手里没有卡牌，并且至少拥有 3 颗星。' });
  }
  client.player.coins += SAFE_EXIT_REWARD;
  client.player.alive = false;
  client.player.leftSafely = true;
  send(client.socket, { type: 'safeExitResult', success: true, reward: SAFE_EXIT_REWARD, self: publicPlayer(client, true) });
  broadcastPlayerState(client);
}

function handleTableJoin(client, message) {
  if (!client.room || !client.player || client.player.inPrison || client.player.leftSafely || !client.player.alive) return;
  if (Date.now() >= client.room.roundEndsAt) return send(client.socket, { type: 'error', message: '本局倒计时已经结束，等待裁判公布结果。' });
  if (handTotal(client.player) <= 0) return send(client.socket, { type: 'error', message: '你的六张初始手牌已经用完。' });
  const tableId = Number(message.tableId);
  if (!Number.isInteger(tableId) || tableId < 1 || tableId > 6) return send(client.socket, { type: 'error', message: '无效的赌桌。' });
  removeFromTableQueue(client);
  if (client.tableId) return send(client.socket, { type: 'error', message: '你已经在一张赌桌上。' });
  const waiting = client.room.tableQueues.get(tableId);
  if (!waiting || waiting === client || waiting.player?.inPrison) {
    client.room.tableQueues.set(tableId, client);
    send(client.socket, { type: 'tableWaiting', tableId });
    return;
  }
  client.room.tableQueues.delete(tableId);
  const pending = { tableId, players: [client, waiting], consents: new Map(), createdAt: Date.now(), timeout: null };
  pending.timeout = setTimeout(() => cancelPendingTableMatch(client.room, tableId, '双方确认超时'), 15000);
  client.room.pendingTableMatches.set(tableId, pending);
  send(client.socket, { type: 'tableConsentRequest', tableId, opponent: publicPlayer(waiting) });
  send(waiting.socket, { type: 'tableConsentRequest', tableId, opponent: publicPlayer(client) });
}

function cancelPendingTableMatch(room, tableId, reason = '入桌确认已取消') {
  const pending = room?.pendingTableMatches.get(tableId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  room.pendingTableMatches.delete(tableId);
  pending.players.forEach((client) => send(client.socket, { type: 'tableConsentCancelled', tableId, reason }));
}

function startConfirmedDuel(room, pending) {
  const [client, waiting] = pending.players;
  const key = duelKey(client, waiting);
  client.tableId = pending.tableId;
  waiting.tableId = pending.tableId;
  client.matchKey = key;
  waiting.matchKey = key;
  const duelEndsAt = Date.now() + DUEL_DURATION_MS;
  const duel = { players: [client, waiting], moves: new Map(), startedAt: Date.now(), endsAt: duelEndsAt, timeout: null };
  duel.timeout = setTimeout(() => resolveDuelTimeout(key), DUEL_DURATION_MS);
  duels.set(key, duel);
  send(client.socket, { type: 'tableMatch', tableId: pending.tableId, duelEndsAt, opponent: publicPlayer(waiting) });
  send(waiting.socket, { type: 'tableMatch', tableId: pending.tableId, duelEndsAt, opponent: publicPlayer(client) });
}

function handleTableConsent(client, message) {
  const room = client.room;
  const tableId = Number(message.tableId);
  const pending = room?.pendingTableMatches.get(tableId);
  if (!pending || !pending.players.includes(client)) return;
  if (!message.agree) return cancelPendingTableMatch(room, tableId, `${client.player.name}拒绝了这场对局`);
  pending.consents.set(client.player.id, true);
  pending.players.forEach((other) => send(other.socket, {
    type: 'tableConsentState', tableId,
    consents: pending.players.map((entry) => ({ id: entry.player.id, agreed: pending.consents.has(entry.player.id) }))
  }));
  if (pending.consents.size === pending.players.length) {
    clearTimeout(pending.timeout);
    room.pendingTableMatches.delete(tableId);
    startConfirmedDuel(room, pending);
  }
}

function handleTableLeave(client) {
  removeFromTableQueue(client);
  clearDuelFor(client);
}

function resolveDuelTimeout(key) {
  const duel = duels.get(key);
  if (!duel) return;
  duels.delete(key);
  duel.players.forEach((client) => { client.tableId = null; client.matchKey = null; send(client.socket, { type: 'duelExpired', reason: '五分钟出牌阶段结束，本局作废，双方牌面不公开。' }); });
}

function handleDuelChat(client, message) {
  if (!client.room || !client.player || !client.matchKey) return;
  const target = [...client.room.clients].find((other) => other.player?.id === message.targetId);
  if (!target || target.matchKey !== client.matchKey) return;
  const text = String(message.text || '').replace(/[<>]/g, '').trim().slice(0, 120);
  if (text) send(target.socket, { type: 'duelChat', fromId: client.player.id, text });
}

function handleVoiceSignal(client, message) {
  if (!client.room || !client.player || !client.matchKey) return;
  const target = [...client.room.clients].find((other) => other.player?.id === message.targetId);
  if (!target || target.matchKey !== client.matchKey) return;
  send(target.socket, { type: 'voiceSignal', fromId: client.player.id, payload: message.payload });
}

function handleMeetingVoiceJoin(client, message) {
  if (!client.room || !client.player) return;
  const roomId = String(message.roomId || '').slice(0, 32);
  if (!roomId) return;
  let members = client.room.meetingVoiceRooms.get(roomId);
  if (!members) { members = new Set(); client.room.meetingVoiceRooms.set(roomId, members); }
  members.forEach((other) => send(other.socket, { type: 'meetingVoicePeerJoined', roomId, peer: publicPlayer(client) }));
  members.add(client);
  send(client.socket, { type: 'meetingVoicePeers', roomId, peers: [...members].filter((other) => other !== client).map((other) => publicPlayer(other)) });
}

function handleMeetingVoiceLeave(client, message) {
  if (!client.room) return;
  const roomId = String(message.roomId || '').slice(0, 32);
  const members = client.room.meetingVoiceRooms.get(roomId);
  if (!members) return;
  members.delete(client);
  members.forEach((other) => send(other.socket, { type: 'meetingVoicePeerLeft', roomId, id: client.player?.id }));
  if (!members.size) client.room.meetingVoiceRooms.delete(roomId);
}

function handleMeetingVoiceSignal(client, message) {
  if (!client.room || !client.player) return;
  const roomId = String(message.roomId || '').slice(0, 32);
  const target = [...(client.room.meetingVoiceRooms.get(roomId) || [])].find((other) => other.player?.id === message.targetId);
  if (!target) return;
  send(target.socket, { type: 'meetingVoiceSignal', roomId, fromId: client.player.id, payload: message.payload });
}

function handleRpsRequest(client, message) {
  if (!client.room || !client.player) return;
  const target = [...client.room.clients].find((other) => other.player?.id === message.targetId);
  if (!target) return send(client.socket, { type: 'error', message: '没有找到这个玩家。' });
  send(target.socket, { type: 'rpsInvite', from: publicPlayer(client), tableId: message.tableId || 1 });
}

function applyDuelResult(a, b, moveA, moveB, resultA) {
  if (resultA === 'win') {
    a.player.stars = Math.min(6, a.player.stars + 1);
    b.player.stars = Math.max(0, b.player.stars - 1);
    a.player.coins += 25;
    b.player.coins = Math.max(0, b.player.coins - 10);
  } else if (resultA === 'lose') {
    a.player.stars = Math.max(0, a.player.stars - 1);
    b.player.stars = Math.min(6, b.player.stars + 1);
    a.player.coins = Math.max(0, a.player.coins - 10);
    b.player.coins += 25;
  } else {
    a.player.coins += 5;
    b.player.coins += 5;
  }
  [a, b].forEach((client) => {
    if (client.player.stars <= 0) {
      client.player.inPrison = true;
      client.player.alive = true;
      client.player.x = PRISON_CENTER.x;
      client.player.z = PRISON_CENTER.z + 1.7;
    }
  });
  consumeHandCard(a.player, moveA);
  consumeHandCard(b.player, moveB);
  send(a.socket, { type: 'rpsResult', result: resultA, selfMove: moveA, opponentMove: null, self: publicPlayer(a, true), opponent: publicPlayer(b) });
  send(b.socket, { type: 'rpsResult', result: resultA === 'draw' ? 'draw' : resultA === 'win' ? 'lose' : 'win', selfMove: moveB, opponentMove: null, self: publicPlayer(b, true), opponent: publicPlayer(a) });
  broadcast(a.room, { type: 'state', player: publicPlayer(a) });
  broadcast(a.room, { type: 'state', player: publicPlayer(b) });
  a.tableId = null;
  b.tableId = null;
  a.matchKey = null;
  b.matchKey = null;
  broadcastRound(a.room);
}

function handleRpsMove(client, message) {
  if (!client.room || !client.player || !['rock', 'paper', 'scissors'].includes(message.move)) return;
  if (Date.now() >= client.room.roundEndsAt) return send(client.socket, { type: 'error', message: '本局倒计时已经结束。' });
  if (!hasHandCard(client.player, message.move)) return send(client.socket, { type: 'error', message: '这张牌已经用完，不在你的当前手牌中。' });
  const target = [...client.room.clients].find((other) => other.player?.id === message.targetId);
  if (!target) return send(client.socket, { type: 'error', message: '对手已经离开房间。' });
  const key = duelKey(client, target);
  if (!client.tableId || !target.tableId || client.matchKey !== key || target.matchKey !== key) return send(client.socket, { type: 'error', message: '必须由裁判在同一张赌桌上发起对局。' });
  const duel = duels.get(key) || { players: [client, target], moves: new Map(), startedAt: Date.now(), endsAt: Date.now() + DUEL_DURATION_MS, timeout: null };
  if (Date.now() >= duel.endsAt) return resolveDuelTimeout(key);
  duel.moves.set(client.player.id, message.move);
  duels.set(key, duel);
  if (duel.moves.size < 2) return send(client.socket, { type: 'rpsWaiting' });
  const a = duel.players[0];
  const b = duel.players[1];
  const moveA = duel.moves.get(a.player.id);
  const moveB = duel.moves.get(b.player.id);
  const resultA = compareMoves(moveA, moveB);
  clearTimeout(duel.timeout);
  duels.delete(key);
  applyDuelResult(a, b, moveA, moveB, resultA);
}

const httpServer = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  if (requestUrl.pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((sum, room) => sum + room.clients.size, 0), content: { version: CONTENT_DB.version || 1, events: CONTENT_DB.events?.length || 0, treasures: CONTENT_DB.treasures?.length || 0, treasureSpawns: CONTENT_DB.treasureSpawns?.length || 0, npcs: CONTENT_DB.npcs?.length || 0, cases: CONTENT_DB.cases?.length || 0, discussions: CONTENT_DB.discussions?.length || 0, parkGames: CONTENT_DB.parkGames?.length || 0 }, time: new Date().toISOString() }));
    return;
  }
  const requested = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.resolve(STATIC_ROOT, `.${requested}`);
  const relative = path.relative(STATIC_ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  fs.stat(filePath, (error, info) => {
    if (error || !info.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': path.extname(filePath) === '.html' || path.extname(filePath) === '.mjs' ? 'no-cache' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

const wss = new WebSocketServer({ server: httpServer });
wss.on('connection', (socket) => {
  const client = { socket, room: null, roomCode: null, player: null, tableId: null, matchKey: null, isAlive: true };
  socket.on('pong', () => { client.isAlive = true; });
  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === 'join') joinRoom(client, message);
      else if (message.type === 'state') handleState(client, message);
      else if (message.type === 'tableJoin') handleTableJoin(client, message);
      else if (message.type === 'tableConsent') handleTableConsent(client, message);
      else if (message.type === 'tableLeave') handleTableLeave(client);
      else if (message.type === 'duelChat') handleDuelChat(client, message);
      else if (message.type === 'voiceSignal') handleVoiceSignal(client, message);
      else if (message.type === 'meetingVoiceJoin') handleMeetingVoiceJoin(client, message);
      else if (message.type === 'meetingVoiceLeave') handleMeetingVoiceLeave(client, message);
      else if (message.type === 'meetingVoiceSignal') handleMeetingVoiceSignal(client, message);
      else if (message.type === 'rpsRequest') handleRpsRequest(client, message);
      else if (message.type === 'rpsMove') handleRpsMove(client, message);
      else if (message.type === 'treasurePickup') handleTreasurePickup(client, message);
      else if (message.type === 'tradeOffer') handleTradeOffer(client, message);
      else if (message.type === 'tradeAccept') handleTradeDecision(client, message, true);
      else if (message.type === 'tradeReject') handleTradeDecision(client, message, false);
      else if (message.type === 'sellStar') handleSellStar(client);
      else if (message.type === 'rescue') handleRescue(client, message);
      else if (message.type === 'safeLeave') handleSafeLeave(client);
      else if (message.type === 'resetRound') resetRoomRound(client);
    } catch {
      send(socket, { type: 'error', message: '无法解析服务器消息。' });
    }
  });
  socket.on('close', () => leaveRoom(client));
  socket.on('error', () => leaveRoom(client));
});

const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) { client.terminate(); continue; }
    client.isAlive = false;
    client.ping();
  }
}, 30000);
heartbeat.unref();

const roundTicker = setInterval(() => {
  rooms.forEach((room) => broadcastRound(room));
}, 1000);
roundTicker.unref();

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`星牌夜场服务已启动：http://0.0.0.0:${PORT}`);
  console.log(`健康检查：http://127.0.0.1:${PORT}/health`);
});

function shutdown() {
  clearInterval(heartbeat);
  clearInterval(roundTicker);
  httpServer.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
