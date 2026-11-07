const { init, json, getUser } = require('./_shared');
exports.handler = async ev => { await init();
  const u = await getUser(ev.headers.cookie); if (!u) return json(401, { error: 'Faça login' });
  return json(200, u); };
