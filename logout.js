const { init, json } = require('./_shared');
const { logout } = require('../../auth');
exports.handler = async ev => { await init(); await logout(ev.headers.cookie); return json(200, { ok: true }); };
