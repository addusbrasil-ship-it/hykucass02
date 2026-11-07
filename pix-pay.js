const { init, json, getUser } = require('./_shared');
const { get, run } = require('../../db');
const { post } = require('../../wallet');
const pix = require('../../pix');
exports.handler = async ev => {
  await init();
  if (!pix.isMock) return json(403, { error: 'Apenas em modo mock' });
  const u = await getUser(ev.headers.cookie); if (!u) return json(401, { error: 'Faça login' });
  const b = JSON.parse(ev.body || '{}');
  const c = await get('SELECT * FROM pix_charges WHERE id=? AND user_id=?', [b.id, u.id]);
  if (!c || c.status !== 'pending') return json(404, { error: 'não encontrado' });
  await run("UPDATE pix_charges SET status='paid' WHERE id=?", [c.id]);
  await post(c.user_id, 'deposit', c.amount, c.id);
  return json(200, { ok: true });
};
