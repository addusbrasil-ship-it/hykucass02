// Motor dos jogos: funções sem estado. RNG criptográfico, sempre no servidor.
const crypto = require('crypto');
const { games } = require('./config');
const rnd = n => crypto.randomInt(n);
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const sum = h => h.reduce((a, x) => a + x, 0) % 10;
const label = (p, b) => (p > b ? 'player' : b > p ? 'banker' : 'tie');

function roulette(ch, p) {
  if (!ch || typeof ch !== 'object') return null;
  const n = rnd(37), color = n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';
  let mult = 0;
  if (ch.type === 'color' && (ch.value === 'red' || ch.value === 'black')) { if (color === ch.value) mult = p.color; }
  else if (ch.type === 'number' && Number.isInteger(ch.value) && ch.value >= 0 && ch.value <= 36) { if (n === ch.value) mult = p.number; }
  else if (ch.type === 'green') { if (n === 0) mult = p.green; }
  else return null;
  return { detail: { number: n, color }, mult };
}

// Em Jogador/Banca o empate devolve a aposta (mult 1); a aposta no empate usa payouts.tie.
function settle(ch, result, p, detail) {
  if (!['player', 'banker', 'tie'].includes(ch)) return null;
  const mult = result === 'tie' ? (ch === 'tie' ? p.tie : 1) : (ch === result ? p[ch] : 0);
  return { detail: { ...detail, result }, mult };
}

function bacbo(ch, p) {
  const pl = [rnd(6) + 1, rnd(6) + 1], bk = [rnd(6) + 1, rnd(6) + 1];
  const pt = pl[0] + pl[1], bt = bk[0] + bk[1];
  return settle(ch, label(pt, bt), p, { player: pl, banker: bk, pt, bt });
}

const newShoe = (decks, remove9) => { const c = [16 * decks, ...Array(9).fill(4 * decks)]; if (remove9) c[9]--; return c; };
const draw = c => { let r = rnd(c.reduce((a, b) => a + b, 0)); for (let v = 0; v < 10; v++) { if (r < c[v]) { c[v]--; return v; } r -= c[v]; } };

function baccarat(ch, p) {
  const c = newShoe(8, false), pl = [draw(c), draw(c)], bk = [draw(c), draw(c)];
  if (sum(pl) < 8 && sum(bk) < 8) {
    let p3 = null;
    if (sum(pl) <= 5) { p3 = draw(c); pl.push(p3); }
    const bt = sum(bk.slice(0, 2));
    if (p3 === null) { if (bt <= 5) bk.push(draw(c)); }
    else if (bt <= 2 || (bt === 3 && p3 !== 8) || (bt === 4 && p3 >= 2 && p3 <= 7) ||
             (bt === 5 && p3 >= 4 && p3 <= 7) || (bt === 6 && (p3 === 6 || p3 === 7))) bk.push(draw(c));
  }
  return settle(ch, label(sum(pl), sum(bk)), p, { player: pl, banker: bk, pt: sum(pl), bt: sum(bk) });
}

// Sempre 9: a banca começa com um 9 e recebe só mais uma carta. O jogador segue a regra normal.
function baccarat9(ch, p) {
  const c = newShoe(8, true), bk = [9, draw(c)], pl = [draw(c), draw(c)];
  if (sum(pl) < 8 && sum(bk) < 8 && sum(pl) <= 5) pl.push(draw(c));
  return settle(ch, label(sum(pl), sum(bk)), p, { player: pl, banker: bk, pt: sum(pl), bt: sum(bk) });
}

const impl = { roulette, bacbo, baccarat, baccarat9 };
const play = (game, choice) => (impl[game] ? impl[game](choice, games[game].payouts) : null);
module.exports = { play, impl };
