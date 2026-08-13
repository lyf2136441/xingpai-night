const MAX_PLAYERS = 8;
const ROUND_MS = 30 * 60 * 1000;
const DUEL_MS = 5 * 60 * 1000;
const CARD_TYPES = ['rock', 'paper', 'scissors'];
const STARTING_HAND = { rock: 2, paper: 2, scissors: 2 };
const RESCUE_COST = 300;
const STAR_SELL_PRICE = 120;
const SAFE_EXIT_REWARD = 180;
const MAP_LIMIT = 140;
const PRISON_CENTER = { x: -50, z: -30 };
const CONTENT_COUNTS = { version: 3, events: 54, treasures: 48, treasureSpawns: 48, npcs: 20, cases: 35, discussions: 18, parkGames: 24 };
const FALLBACK_TREASURES = [
  ['黑潮筹码', 80], ['旧王遗戒', 120], ['银色怀表', 150], ['紫晶吊坠', 180],
  ['裁判印章', 220], ['夜场钥匙', 260], ['远古骰子', 320]
];
const FALLBACK_SPAWNS = [
  [-82, -16], [-48, 46], [-24, -72], [22, -76], [46, -34], [78, 8],
  [74, 68], [30, 72], [-16, 80], [-76, 62], [-72, 20], [48, 48]
];
const BUILDINGS = [
  { x: -50, z: 30, halfX: 12, halfZ: 9, doorHalf: 2.2 },
  { x: 50, z: -30, halfX: 12, halfZ: 9, doorHalf: 2.2 },
  { x: 51, z: 30, halfX: 13, halfZ: 10, doorHalf: 2.2 },
  { x: 76, z: 58, halfX: 15, halfZ: 12, doorHalf: 2.2 },
  { x: -78, z: 58, halfX: 16, halfZ: 12.5, doorHalf: 2.2 },
  { x: 78, z: -62, halfX: 24, halfZ: 19, doorHalf: 2.2 }
];

function cleanName(value) {
  return String(value || '玩家').replace(/[<>]/g, '').trim().slice(0, 12) || '玩家';
}

function cleanRoom(value) {
  return String(value || 'STAR1').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'STAR1';
}

function cloneHand() { return { ...STARTING_HAND }; }
function handTotal(player) { return Object.values(player?.hand || {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0); }
function hasCard(player, type) { return CARD_TYPES.includes(type) && Number(player?.hand?.[type]) > 0; }
function consumeCard(player, type) {
  if (!hasCard(player, type)) return false;
  player.hand[type] -= 1;
  player.card = CARD_TYPES.find((entry) => hasCard(player, entry)) || null;
  return true;
}

function compareMoves(a, b) {
  if (a === b) return 'draw';
  return (a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper') ? 'win' : 'lose';
}

function inPrison(x, z) {
  return Math.abs(x - PRISON_CENTER.x) < 7.85 && Math.abs(z - PRISON_CENTER.z) < 7.15;
}

function insideBuilding(x, z, building) {
  return Math.abs(x - building.x) < building.halfX && Math.abs(z - building.z) < building.halfZ;
}

function atDoor(x, z, building) {
  return Math.abs(x - building.x) < building.doorHalf && z > building.z + building.halfZ - 1.6;
}

function blockedByBuilding(x, z, fromX, fromZ) {
  return BUILDINGS.some((building) => insideBuilding(x, z, building) && !atDoor(x, z, building) && !insideBuilding(fromX, fromZ, building));
}

function numericOffer(value) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.roomCode = '';
    this.clients = new Map();
    this.tableQueues = new Map();
    this.pendingMatches = new Map();
    this.duels = new Map();
    this.tradeOffers = new Map();
    this.voiceRooms = new Map();
    this.treasures = new Map();
    this.nextId = 1;
    this.roundStartedAt = Date.now();
    this.roundEndsAt = this.roundStartedAt + ROUND_MS;
    this.tickTimer = null;
    this.content = { treasures: [], treasureSpawns: [] };
    this.contentPromise = this.loadContent();
  }

  async loadContent() {
    try {
      if (this.env.ASSETS) {
        const response = await this.env.ASSETS.fetch(new Request('https://assets/content-db.json'));
        if (response.ok) this.content = await response.json();
      }
    } catch (_) {
      this.content = { treasures: [], treasureSpawns: [] };
    }
    this.createTreasureField();
  }

  async fetch(request) {
    await this.contentPromise;
    this.roomCode = cleanRoom(new URL(request.url).searchParams.get('room') || this.roomCode);
    const upgrade = request.headers.get('Upgrade');
    if (upgrade?.toLowerCase() !== 'websocket') return new Response('WebSocket endpoint', { status: 426 });
    const pair = new WebSocketPair();
    const clientSocket = pair[0];
    const serverSocket = pair[1];
    serverSocket.accept();
    const client = { socket: serverSocket, player: null, tableId: null, matchKey: null, room: this };
    serverSocket.addEventListener('message', (event) => this.onMessage(client, event.data));
    serverSocket.addEventListener('close', () => this.leave(client));
    serverSocket.addEventListener('error', () => this.leave(client));
    this.ensureTicker();
    return new Response(null, { status: 101, webSocket: clientSocket });
  }

  ensureTicker() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      if (this.clients.size) this.broadcastRound();
      else { clearInterval(this.tickTimer); this.tickTimer = null; }
    }, 1000);
  }

  send(client, message) {
    try { if (client?.socket?.readyState === 1) client.socket.send(JSON.stringify(message)); } catch (_) {}
  }

  broadcast(message, except = null) {
    this.clients.forEach((client) => { if (client !== except) this.send(client, message); });
  }

  publicPlayer(client, reveal = false) {
    const source = client?.player || {};
    const player = {
      id: source.id, name: source.name, x: source.x, z: source.z, rot: source.rot,
      alive: source.alive, inPrison: source.inPrison, eliminated: source.eliminated,
      leftSafely: source.leftSafely, color: source.color, accent: source.accent,
      treasureCount: source.treasures?.length || 0,
      treasureValue: this.treasureValue(source)
    };
    if (reveal) {
      player.stars = source.stars;
      player.coins = source.coins;
      player.card = source.card;
      player.hand = { ...source.hand };
      player.treasures = [...(source.treasures || [])];
    }
    return player;
  }

  roomPlayers() { return [...this.clients.values()].filter((client) => client.player).map((client) => this.publicPlayer(client)); }

  treasureValue(player) { return (player?.treasures || []).reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0); }

  createTreasureField() {
    const library = Array.isArray(this.content.treasures) && this.content.treasures.length
      ? this.content.treasures.map((item) => [item.name, Number(item.value) || 0]) : FALLBACK_TREASURES;
    const spawns = Array.isArray(this.content.treasureSpawns) && this.content.treasureSpawns.length ? this.content.treasureSpawns : FALLBACK_SPAWNS;
    this.treasures = new Map(spawns.map(([x, z], index) => {
      const [name, value] = library[index % library.length];
      return [`loot-${index + 1}`, { id: `loot-${index + 1}`, name, value, x, z }];
    }));
  }

  roundState() {
    const cardCounts = { rock: 0, paper: 0, scissors: 0 };
    this.clients.forEach((client) => CARD_TYPES.forEach((type) => { cardCounts[type] += Math.max(0, Number(client.player?.hand?.[type]) || 0); }));
    return { startedAt: this.roundStartedAt, endsAt: this.roundEndsAt, ended: Date.now() >= this.roundEndsAt, cardCounts };
  }

  broadcastRound() { this.broadcast({ type: 'roundState', round: this.roundState() }); }

  playerById(id) { return [...this.clients.values()].find((client) => client.player?.id === id) || null; }

  async onMessage(client, raw) {
    try {
      const message = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(new TextDecoder().decode(raw));
      switch (message.type) {
        case 'join': return this.join(client, message);
        case 'state': return this.handleState(client, message);
        case 'tableJoin': return this.tableJoin(client, message);
        case 'tableConsent': return this.tableConsent(client, message);
        case 'tableLeave': return this.tableLeave(client);
        case 'duelChat': return this.duelChat(client, message);
        case 'voiceSignal': return this.voiceSignal(client, message);
        case 'meetingVoiceJoin': return this.meetingVoiceJoin(client, message);
        case 'meetingVoiceLeave': return this.meetingVoiceLeave(client, message);
        case 'meetingVoiceSignal': return this.meetingVoiceSignal(client, message);
        case 'rpsRequest': return this.rpsRequest(client, message);
        case 'rpsMove': return this.rpsMove(client, message);
        case 'treasurePickup': return this.treasurePickup(client, message);
        case 'tradeOffer': return this.tradeOffer(client, message);
        case 'tradeAccept': return this.tradeDecision(client, message, true);
        case 'tradeReject': return this.tradeDecision(client, message, false);
        case 'sellStar': return this.sellStar(client);
        case 'rescue': return this.rescue(client, message);
        case 'safeLeave': return this.safeLeave(client);
        case 'resetRound': return this.resetRound(client);
        default: return undefined;
      }
    } catch (_) { this.send(client, { type: 'error', message: '无法解析服务器消息。' }); }
  }

  join(client, message) {
    if (client.player) this.leave(client);
    if (this.clients.size >= MAX_PLAYERS) return this.send(client, { type: 'error', message: '房间已满，最多 8 名真人玩家。' });
    const id = `P${this.nextId++}`;
    client.player = {
      id, name: cleanName(message.name), x: 0, z: 9, rot: 0, stars: 3, coins: 120,
      treasures: [{ id: `starter-${id}`, name: '夜场入场信物', value: 100 }], alive: true,
      leftSafely: false, eliminated: false, card: 'rock', hand: cloneHand(), inPrison: false,
      color: Number(message.color) || 0x2b9bd1, accent: 0x68e5ff
    };
    this.clients.set(id, client);
    this.send(client, { type: 'welcome', id, room: this.roomCode || 'STAR1', players: this.roomPlayers(), self: this.publicPlayer(client, true), treasures: [...this.treasures.values()], round: this.roundState() });
    this.broadcast({ type: 'playerJoined', player: this.publicPlayer(client), players: this.roomPlayers() }, client);
    this.broadcastRound();
  }

  leave(client) {
    if (!client.player) return;
    this.removeFromQueue(client);
    this.removeVoice(client);
    this.clearDuel(client);
    this.clients.delete(client.player.id);
    const id = client.player.id;
    client.player = null;
    if (this.clients.size) this.broadcast({ type: 'playerLeft', id, players: this.roomPlayers() });
  }

  removeFromQueue(client) {
    for (const [tableId, waiting] of this.tableQueues) if (waiting === client) this.tableQueues.delete(tableId);
    for (const [tableId, pending] of this.pendingMatches) {
      if (!pending.players.includes(client)) continue;
      clearTimeout(pending.timeout);
      this.pendingMatches.delete(tableId);
      pending.players.forEach((other) => { if (other !== client) this.send(other, { type: 'tableConsentCancelled', tableId, reason: '对手离开了等待区' }); });
    }
  }

  removeVoice(client) {
    for (const [roomId, members] of this.voiceRooms) {
      if (!members.delete(client)) continue;
      members.forEach((other) => this.send(other, { type: 'meetingVoicePeerLeft', roomId, id: client.player?.id }));
      if (!members.size) this.voiceRooms.delete(roomId);
    }
  }

  clearDuel(client) {
    for (const [key, duel] of this.duels) {
      if (!duel.players.includes(client)) continue;
      clearTimeout(duel.timeout);
      this.duels.delete(key);
      duel.players.forEach((other) => { other.tableId = null; other.matchKey = null; });
    }
    client.tableId = null;
    client.matchKey = null;
  }

  handleState(client, message) {
    if (!client.player || client.player.leftSafely) return;
    const state = message.state || {};
    let x = Number(state.x); let z = Number(state.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, x));
    z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, z));
    if (client.player.inPrison || inPrison(x, z) || blockedByBuilding(x, z, client.player.x, client.player.z)) { x = client.player.x; z = client.player.z; }
    client.player.x = x; client.player.z = z;
    if (Number.isFinite(Number(state.rot))) client.player.rot = Number(state.rot);
    if (typeof state.alive === 'boolean') client.player.alive = state.alive;
    this.broadcast({ type: 'state', player: this.publicPlayer(client) }, client);
  }

  broadcastPlayerState(client) { this.broadcast({ type: 'state', player: this.publicPlayer(client) }); }

  treasurePickup(client, message) {
    if (!client.player || client.player.inPrison) return;
    const treasure = this.treasures.get(String(message.id || ''));
    if (!treasure) return this.send(client, { type: 'error', message: '这件宝物已经被别人拾取了。' });
    if (Math.hypot(client.player.x - treasure.x, client.player.z - treasure.z) > 3.2) return;
    this.treasures.delete(treasure.id);
    client.player.treasures.push({ id: `loot-${client.player.id}-${Date.now()}`, name: treasure.name, value: treasure.value });
    this.send(client, { type: 'treasureCollected', treasure, self: this.publicPlayer(client, true) });
    this.broadcast({ type: 'treasureRemoved', id: treasure.id }, client);
    this.broadcastPlayerState(client);
  }

  tradeHasEnough(client, coins, stars, treasure) {
    return client.player.coins >= coins && client.player.stars >= stars && this.treasureValue(client.player) >= treasure;
  }

  transferTreasure(from, to, value) {
    let remaining = value;
    for (let index = from.treasures.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const item = from.treasures[index];
      const taken = Math.min(Number(item.value) || 0, remaining);
      item.value -= taken; remaining -= taken;
      if (item.value <= 0) from.treasures.splice(index, 1);
    }
    if (remaining < value) to.treasures.push({ id: `trade-${Date.now()}`, name: '交易所得宝物', value: value - remaining });
  }

  tradeOffer(client, message) {
    const target = this.playerById(message.targetId);
    if (!client.player || !target || target === client) return this.send(client, { type: 'error', message: '没有找到可交易的玩家。' });
    const offer = { offerCoins: numericOffer(message.offerCoins), requestCoins: numericOffer(message.requestCoins), offerStars: numericOffer(message.offerStars), requestStars: numericOffer(message.requestStars), offerTreasure: numericOffer(message.offerTreasure), requestTreasure: numericOffer(message.requestTreasure) };
    if (!Object.values(offer).some((value) => value > 0)) return this.send(client, { type: 'error', message: '交易内容不能为空。' });
    if (!this.tradeHasEnough(client, offer.offerCoins, offer.offerStars, offer.offerTreasure)) return this.send(client, { type: 'error', message: '你的金币、星星或宝物估值不足。' });
    const id = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.tradeOffers.set(id, { id, from: client, to: target, offer });
    this.send(target, { type: 'tradeOffer', id, from: this.publicPlayer(client), offer });
    this.send(client, { type: 'tradeSent', id, target: target.player.name, offer });
  }

  tradeDecision(client, message, accepted) {
    const trade = this.tradeOffers.get(String(message.id || ''));
    if (!trade || trade.to !== client) return this.send(client, { type: 'error', message: '这笔交易已经失效。' });
    this.tradeOffers.delete(trade.id);
    if (!accepted) return this.send(trade.from, { type: 'tradeRejected', id: trade.id, by: client.player.name });
    const { from, to, offer } = trade;
    if (!this.tradeHasEnough(from, offer.offerCoins, offer.offerStars, offer.offerTreasure) || !this.tradeHasEnough(to, offer.requestCoins, offer.requestStars, offer.requestTreasure)) {
      this.send(from, { type: 'tradeRejected', id: trade.id, by: client.player.name, reason: '接受时资源已经不足' });
      return this.send(to, { type: 'tradeRejected', id: trade.id, by: client.player.name, reason: '资源不足，交易取消' });
    }
    from.player.coins += offer.requestCoins - offer.offerCoins;
    to.player.coins += offer.offerCoins - offer.requestCoins;
    from.player.stars = Math.max(0, Math.min(6, from.player.stars + offer.requestStars - offer.offerStars));
    to.player.stars = Math.max(0, Math.min(6, to.player.stars + offer.offerStars - offer.requestStars));
    this.transferTreasure(from.player, to.player, offer.offerTreasure);
    this.transferTreasure(to.player, from.player, offer.requestTreasure);
    [from, to].forEach((participant) => { if (participant.player.stars <= 0) this.sendToPrison(participant); });
    this.send(from, { type: 'tradeCompleted', id: trade.id, self: this.publicPlayer(from, true), other: this.publicPlayer(to) });
    this.send(to, { type: 'tradeCompleted', id: trade.id, self: this.publicPlayer(to, true), other: this.publicPlayer(from) });
    this.broadcastPlayerState(from); this.broadcastPlayerState(to);
  }

  sellStar(client) {
    if (!client.player || client.player.stars <= 1) return this.send(client, { type: 'error', message: '至少保留 1 颗星，才能继续留在夜场。' });
    client.player.stars -= 1; client.player.coins += STAR_SELL_PRICE;
    this.send(client, { type: 'starSold', price: STAR_SELL_PRICE, self: this.publicPlayer(client, true) });
    this.broadcastPlayerState(client);
  }

  sendToPrison(client) {
    client.player.inPrison = true; client.player.eliminated = true; client.player.alive = true;
    client.player.x = PRISON_CENTER.x; client.player.z = PRISON_CENTER.z + 1.7;
  }

  rescue(client, message) {
    const target = this.playerById(message.targetId) || (message.targetId === client.player?.id ? client : null);
    if (!target || !target.player.inPrison) return this.send(client, { type: 'rescueResult', success: false, message: '目标不在无限监狱中。' });
    if (client.player.coins < RESCUE_COST) return this.send(client, { type: 'rescueResult', success: false, message: `需要 ${RESCUE_COST} 金币才能救赎。` });
    client.player.coins -= RESCUE_COST; target.player.inPrison = false; target.player.eliminated = false; target.player.alive = true; target.player.stars = 1; target.player.x = 0; target.player.z = 9;
    this.send(client, { type: 'rescueResult', success: true, self: this.publicPlayer(client, true), target: this.publicPlayer(target, false), message: `已支付 ${RESCUE_COST} 金币，${target.player.name} 获得自由。` });
    if (target !== client) this.send(target, { type: 'rescued', self: this.publicPlayer(target, true), by: client.player.name });
    this.broadcastPlayerState(client); if (target !== client) this.broadcastPlayerState(target);
  }

  safeLeave(client) {
    if (!client.player || client.player.inPrison || client.player.leftSafely || !client.player.alive) return;
    if (handTotal(client.player) > 0 || client.player.stars < 3) return this.send(client, { type: 'safeExitResult', success: false, message: '安全离场条件：手里没有卡牌，并且至少拥有 3 颗星。' });
    client.player.coins += SAFE_EXIT_REWARD; client.player.alive = false; client.player.leftSafely = true;
    this.send(client, { type: 'safeExitResult', success: true, reward: SAFE_EXIT_REWARD, self: this.publicPlayer(client, true) });
    this.broadcastPlayerState(client);
  }

  tableJoin(client, message) {
    if (!client.player || client.player.inPrison || client.player.leftSafely || !client.player.alive) return;
    if (Date.now() >= this.roundEndsAt) return this.send(client, { type: 'error', message: '本局倒计时已经结束。' });
    if (handTotal(client.player) <= 0) return this.send(client, { type: 'error', message: '你的六张初始手牌已经用完。' });
    const tableId = Number(message.tableId);
    if (!Number.isInteger(tableId) || tableId < 1 || tableId > 6) return this.send(client, { type: 'error', message: '无效的赌桌。' });
    this.removeFromQueue(client);
    if (client.tableId) return this.send(client, { type: 'error', message: '你已经在一张赌桌上。' });
    const waiting = this.tableQueues.get(tableId);
    if (!waiting || waiting === client || waiting.player?.inPrison) { this.tableQueues.set(tableId, client); return this.send(client, { type: 'tableWaiting', tableId }); }
    this.tableQueues.delete(tableId);
    const pending = { tableId, players: [client, waiting], consents: new Set(), timeout: null };
    pending.timeout = setTimeout(() => this.cancelPending(tableId, '双方确认超时'), 15000);
    this.pendingMatches.set(tableId, pending);
    this.send(client, { type: 'tableConsentRequest', tableId, opponent: this.publicPlayer(waiting) });
    this.send(waiting, { type: 'tableConsentRequest', tableId, opponent: this.publicPlayer(client) });
  }

  cancelPending(tableId, reason = '入桌确认已取消') {
    const pending = this.pendingMatches.get(tableId);
    if (!pending) return;
    clearTimeout(pending.timeout); this.pendingMatches.delete(tableId);
    pending.players.forEach((client) => this.send(client, { type: 'tableConsentCancelled', tableId, reason }));
  }

  tableConsent(client, message) {
    const tableId = Number(message.tableId); const pending = this.pendingMatches.get(tableId);
    if (!pending || !pending.players.includes(client)) return;
    if (!message.agree) return this.cancelPending(tableId, `${client.player.name}拒绝了这场对局`);
    pending.consents.add(client.player.id);
    pending.players.forEach((other) => this.send(other, { type: 'tableConsentState', tableId, consents: pending.players.map((entry) => ({ id: entry.player.id, agreed: pending.consents.has(entry.player.id) })) }));
    if (pending.consents.size === 2) { clearTimeout(pending.timeout); this.pendingMatches.delete(tableId); this.startDuel(pending); }
  }

  startDuel(pending) {
    const [a, b] = pending.players; const key = [a.player.id, b.player.id].sort().join(':');
    a.tableId = pending.tableId; b.tableId = pending.tableId; a.matchKey = key; b.matchKey = key;
    const duel = { players: [a, b], moves: new Map(), startedAt: Date.now(), endsAt: Date.now() + DUEL_MS, timeout: null };
    duel.timeout = setTimeout(() => this.resolveDuelTimeout(key), DUEL_MS); this.duels.set(key, duel);
    this.send(a, { type: 'tableMatch', tableId: pending.tableId, duelEndsAt: duel.endsAt, opponent: this.publicPlayer(b) });
    this.send(b, { type: 'tableMatch', tableId: pending.tableId, duelEndsAt: duel.endsAt, opponent: this.publicPlayer(a) });
  }

  tableLeave(client) { this.removeFromQueue(client); this.clearDuel(client); }

  resolveDuelTimeout(key) {
    const duel = this.duels.get(key); if (!duel) return;
    this.duels.delete(key); duel.players.forEach((client) => { client.tableId = null; client.matchKey = null; this.send(client, { type: 'duelExpired', reason: '五分钟出牌阶段结束，本局作废，双方牌面不公开。' }); });
  }

  duelChat(client, message) {
    const target = this.playerById(message.targetId); if (!target || !client.matchKey || target.matchKey !== client.matchKey) return;
    const text = String(message.text || '').replace(/[<>]/g, '').trim().slice(0, 120); if (text) this.send(target, { type: 'duelChat', fromId: client.player.id, text });
  }

  voiceSignal(client, message) {
    const target = this.playerById(message.targetId); if (target && client.matchKey && target.matchKey === client.matchKey) this.send(target, { type: 'voiceSignal', fromId: client.player.id, payload: message.payload });
  }

  meetingVoiceJoin(client, message) {
    const roomId = String(message.roomId || '').slice(0, 32); if (!roomId) return;
    let members = this.voiceRooms.get(roomId); if (!members) { members = new Set(); this.voiceRooms.set(roomId, members); }
    members.forEach((other) => this.send(other, { type: 'meetingVoicePeerJoined', roomId, peer: this.publicPlayer(client) }));
    members.add(client); this.send(client, { type: 'meetingVoicePeers', roomId, peers: [...members].filter((other) => other !== client).map((other) => this.publicPlayer(other)) });
  }

  meetingVoiceLeave(client, message) {
    const roomId = String(message.roomId || '').slice(0, 32); const members = this.voiceRooms.get(roomId); if (!members) return;
    members.delete(client); members.forEach((other) => this.send(other, { type: 'meetingVoicePeerLeft', roomId, id: client.player?.id })); if (!members.size) this.voiceRooms.delete(roomId);
  }

  meetingVoiceSignal(client, message) {
    const roomId = String(message.roomId || '').slice(0, 32); const target = [...(this.voiceRooms.get(roomId) || [])].find((other) => other.player?.id === message.targetId);
    if (target) this.send(target, { type: 'meetingVoiceSignal', roomId, fromId: client.player.id, payload: message.payload });
  }

  rpsRequest(client, message) { const target = this.playerById(message.targetId); if (target) this.send(target, { type: 'rpsInvite', from: this.publicPlayer(client), tableId: message.tableId || 1 }); }

  rpsMove(client, message) {
    if (!client.player || !CARD_TYPES.includes(message.move) || Date.now() >= this.roundEndsAt) return;
    if (!hasCard(client.player, message.move)) return this.send(client, { type: 'error', message: '这张牌已经用完，不在你的当前手牌中。' });
    const target = this.playerById(message.targetId); const key = target && [client.player.id, target.player.id].sort().join(':'); const duel = key && this.duels.get(key);
    if (!target || !duel || client.matchKey !== key || target.matchKey !== key) return this.send(client, { type: 'error', message: '必须由裁判在同一张赌桌上发起对局。' });
    if (Date.now() >= duel.endsAt) return this.resolveDuelTimeout(key);
    duel.moves.set(client.player.id, message.move); if (duel.moves.size < 2) return this.send(client, { type: 'rpsWaiting' });
    const a = duel.players[0]; const b = duel.players[1]; const moveA = duel.moves.get(a.player.id); const moveB = duel.moves.get(b.player.id); const resultA = compareMoves(moveA, moveB);
    clearTimeout(duel.timeout); this.duels.delete(key); this.applyDuelResult(a, b, moveA, moveB, resultA);
  }

  applyDuelResult(a, b, moveA, moveB, resultA) {
    if (resultA === 'win') { a.player.stars = Math.min(6, a.player.stars + 1); b.player.stars = Math.max(0, b.player.stars - 1); a.player.coins += 25; b.player.coins = Math.max(0, b.player.coins - 10); }
    else if (resultA === 'lose') { a.player.stars = Math.max(0, a.player.stars - 1); b.player.stars = Math.min(6, b.player.stars + 1); a.player.coins = Math.max(0, a.player.coins - 10); b.player.coins += 25; }
    else { a.player.coins += 5; b.player.coins += 5; }
    [a, b].forEach((client) => { if (client.player.stars <= 0) this.sendToPrison(client); consumeCard(client.player, client === a ? moveA : moveB); client.tableId = null; client.matchKey = null; });
    this.send(a, { type: 'rpsResult', result: resultA, selfMove: moveA, opponentMove: null, self: this.publicPlayer(a, true), opponent: this.publicPlayer(b) });
    this.send(b, { type: 'rpsResult', result: resultA === 'draw' ? 'draw' : resultA === 'win' ? 'lose' : 'win', selfMove: moveB, opponentMove: null, self: this.publicPlayer(b, true), opponent: this.publicPlayer(a) });
    this.broadcastPlayerState(a); this.broadcastPlayerState(b); this.broadcastRound();
  }

  resetRound(client) {
    if (!client.player) return;
    this.tableQueues.clear(); this.pendingMatches.forEach((pending) => clearTimeout(pending.timeout)); this.pendingMatches.clear();
    this.duels.forEach((duel) => clearTimeout(duel.timeout)); this.duels.clear(); this.tradeOffers.clear();
    const now = Date.now(); this.roundStartedAt = now; this.roundEndsAt = now + ROUND_MS; this.createTreasureField();
    this.clients.forEach((member) => { const player = member.player; player.x = 0; player.z = 9; player.rot = 0; player.stars = 3; player.coins = 120; player.treasures = [{ id: `starter-${player.id}-${now}`, name: '夜场入场信物', value: 120 }]; player.alive = true; player.leftSafely = false; player.eliminated = false; player.card = 'rock'; player.hand = cloneHand(); player.inPrison = false; member.tableId = null; member.matchKey = null; this.send(member, { type: 'roundReset', self: this.publicPlayer(member, true), players: this.roomPlayers(), treasures: [...this.treasures.values()], round: this.roundState() }); });
    this.broadcastRound();
  }
}

function contentHealth() { return { ...CONTENT_COUNTS }; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, platform: 'cloudflare-workers', durableObjects: true, rooms: null, players: null, content: contentHealth(), time: new Date().toISOString() }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const room = cleanRoom(url.searchParams.get('room'));
      const id = env.ROOMS.idFromName(room);
      return env.ROOMS.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
