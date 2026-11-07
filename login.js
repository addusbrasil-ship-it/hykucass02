const { init, json, cookie, UserError } = require('./_shared');
const { login } = require('../../auth');
exports.handler = async ev => {
  await init();
  if (ev.httpMethod !== 'POST') return json(405, { error: 'Método não permitido' });
  try { const b = JSON.parse(ev.body || '{}'); const t = await login(b, ev.headers['x-forwarded-for'] || '');
    return json(200, { ok: true }, { 'Set-Cookie': cookie(t) }); }
  catch (e) { return json(e instanceof UserError ? 400 : 500, { error: e.message }); }
};
