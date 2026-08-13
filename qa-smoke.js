const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const root = __dirname;
const db = JSON.parse(fs.readFileSync(path.join(root, 'content-db.json'), 'utf8'));
for (const key of ['events', 'treasures', 'treasureSpawns', 'npcs', 'cases', 'discussions', 'parkGames']) {
  if (!Array.isArray(db[key]) || db[key].length === 0) throw new Error(`${key} database is empty`);
}

const clients = [new WebSocket('ws://127.0.0.1:8787'), new WebSocket('ws://127.0.0.1:8787')];
function waitOpen(socket) { return new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); }); }
function waitMessage(index, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${index}/${type}`)), 5000);
    const handler = (raw) => {
      let message;
      try { message = JSON.parse(raw); } catch { return; }
      if (message.type !== type) return;
      clearTimeout(timer);
      clients[index].off('message', handler);
      resolve(message);
    };
    clients[index].on('message', handler);
  });
}

(async () => {
  await Promise.all(clients.map(waitOpen));
  clients[0].send(JSON.stringify({ type: 'join', room: 'SMOKE', name: 'QA-A' }));
  clients[1].send(JSON.stringify({ type: 'join', room: 'SMOKE', name: 'QA-B' }));
  const welcome = await Promise.all([waitMessage(0, 'welcome'), waitMessage(1, 'welcome')]);
  const hand = welcome[0].self.hand;
  if (hand.rock !== 2 || hand.paper !== 2 || hand.scissors !== 2) throw new Error('starting hand is not 2/2/2');
  clients.forEach((socket) => socket.send(JSON.stringify({ type: 'tableJoin', tableId: 1 })));
  await Promise.all([waitMessage(0, 'tableConsentRequest'), waitMessage(1, 'tableConsentRequest')]);
  clients.forEach((socket) => socket.send(JSON.stringify({ type: 'tableConsent', tableId: 1, agree: true })));
  const matches = await Promise.all([waitMessage(0, 'tableMatch'), waitMessage(1, 'tableMatch')]);
  clients[0].send(JSON.stringify({ type: 'rpsMove', targetId: matches[0].opponent.id, move: 'rock' }));
  clients[1].send(JSON.stringify({ type: 'rpsMove', targetId: matches[1].opponent.id, move: 'paper' }));
  const results = await Promise.all([waitMessage(0, 'rpsResult'), waitMessage(1, 'rpsResult')]);
  if (results[0].self.hand.rock !== 1 || results[1].self.hand.paper !== 1) throw new Error('hand consumption did not persist');
  clients[0].send(JSON.stringify({ type: 'resetRound' }));
  const resets = await Promise.all([waitMessage(0, 'roundReset'), waitMessage(1, 'roundReset')]);
  for (const reset of resets) {
    const resetHand = reset.self.hand;
    if (resetHand.rock !== 2 || resetHand.paper !== 2 || resetHand.scissors !== 2) throw new Error('round reset did not restore 2/2/2');
  }
  console.log(JSON.stringify({ ok: true, database: Object.fromEntries(Object.entries(db).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])), duel: 'consent -> match -> result', reset: 'room reset -> fresh hand 2/2/2', handsAfter: [results[0].self.hand, results[1].self.hand] }));
  clients.forEach((socket) => socket.close());
})().catch((error) => { console.error(error.stack); clients.forEach((socket) => socket.close()); process.exitCode = 1; });
