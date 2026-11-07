const { init, json, getUser, UserError } = require('./_shared');
const { run } = require('../../db');
const { post } = require('../../wallet');
exports.handler = async ev => {
  await init();
  const u = await getUser(ev.headers.cookie); if (!u) return json(401, { error: 'Faça login' });
  try {
    const b = JSON.parse(ev.body || '{}');
    if (u.kyc === 'blocked') throw new UserError('Conta bloqueada');
    if (!Number.isInteger(b.amount) || b.amount < 2000) throw new UserError('Saque mínimo de R$ 20,00');
    const key = String(b.pixKey || '').trim(); if (key.length < 5 || key.length > 100) throw new UserError('Chave Pix inválida');
    await post(u.id, 'withdraw_hold', -b.amount, null);
    await run("INSERT INTO withdrawals(user_id,amount,pix_key,status,created) VALUES(?,?,?,'pending',?)", [u.id, b.amount, key, new Date().toISOString()]);
    return json(200, { ok: true, status: 'pending' });
  } catch (e) { return json(e instanceof UserError ? 400 : 500, { error: e.message }); }
};
