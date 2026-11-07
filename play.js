const { init, json, getUser, UserError } = require('./_shared');
const { run, get } = require('../../db');
const { post } = require('../../wallet');
const engine = require('../../engine');
const cfg = require('../../config');
const crypto = require('crypto');
exports.handler = async ev => {
  await init();
  const u = await getUser(ev.headers.cookie); if (!u) return json(401, { error: 'Faça login' });
  try {
    const b = JSON.parse(ev.body || '{}'), g = cfg.games[b.game];
    if (!g) throw new UserError('Jogo inválido');
    if (u.kyc === 'blocked') throw new UserError('Conta bloqueada');
    if (!Number.isInteger(b.bet) || b.bet < g.minBet || b.bet > g.maxBet) throw new UserError('Aposta fora dos limites');
    const r = engine.play(b.game, b.choice); if (!r) throw new UserError('Escolha inválida');
    const id = crypto.randomUUID(), payout = Math.floor(b.bet * r.mult);
    await post(u.id, 'bet', -b.bet, id);
    if (payout > 0) await post(u.id, 'win', payout, id);
    await run('INSERT INTO rounds VALUES(?,?,?,?,?,?,?,?)', [id, u.id, b.game, JSON.stringify(b.choice), b.bet, payout, JSON.stringify(r.detail), new Date().toISOString()]);
    const updated = await get('SELECT balance FROM users WHERE id=?', [u.id]);
    return json(200, { detail: r.detail, payout, balance: updated.balance });
  } catch (e) { return json(e instanceof UserError ? 400 : 500, { error: e.message }); }
};
