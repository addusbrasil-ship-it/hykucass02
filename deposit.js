const { init, json, getUser, UserError } = require('./_shared');
const { run } = require('../../db');
const pix = require('../../pix');
const crypto = require('crypto');
exports.handler = async ev => {
  await init();
  const u = await getUser(ev.headers.cookie); if (!u) return json(401, { error: 'Faça login' });
  try {
    const b = JSON.parse(ev.body || '{}');
    if (!Number.isInteger(b.amount) || b.amount < 1000 || b.amount > 500000) throw new UserError('Depósito entre R$ 10,00 e R$ 5.000,00');
    const id = crypto.randomUUID(), c = await pix.createCharge({ id, amount: b.amount, user: u });
    await run("INSERT INTO pix_charges VALUES(?,?,?,'pending',?,?,?)", [id, u.id, b.amount, c.providerRef, c.code, new Date().toISOString()]);
    return json(200, { id, code: c.code });
  } catch (e) { return json(e instanceof UserError ? 400 : 500, { error: e.message }); }
};
