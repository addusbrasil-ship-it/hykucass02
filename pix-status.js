const { init, json, getUser } = require('./_shared');
const { get } = require('../../db');
exports.handler = async ev => {
  await init();
  const u = await getUser(ev.headers.cookie); if (!u) return json(401, { error: 'Faça login' });
  const id = ev.queryStringParameters?.id;
  const c = await get('SELECT id,amount,status FROM pix_charges WHERE id=? AND user_id=?', [id, u.id]);
  return c ? json(200, c) : json(404, { error: 'não encontrado' });
};
