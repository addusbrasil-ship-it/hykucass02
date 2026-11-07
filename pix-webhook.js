const { init, json } = require('./_shared');
const { get, run } = require('../../db');
const { post } = require('../../wallet');
const pix = require('../../pix');
exports.handler = async ev => {
  await init();
  const v = pix.verifyWebhook(ev.body, ev.headers); if (!v) return json(401, { error: 'assinatura inválida' });
  const c = await get('SELECT * FROM pix_charges WHERE provider_ref=?', [v.providerRef]);
  if (c && c.status === 'pending') {
    await run("UPDATE pix_charges SET status='paid' WHERE id=?", [c.id]);
    await post(c.user_id, 'deposit', c.amount, c.id);
  }
  return json(200, { ok: true });
};
