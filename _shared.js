const { initDb, UserError } = require('../../db');
const { getUser } = require('../../auth');
let ready = false;
async function init() { if (!ready) { await initDb(); ready = true; } }
const json = (code, obj, headers = {}) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers },
  body: JSON.stringify(obj)
});
const cookie = t => `sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const isAdmin = h => { const t = Buffer.from(String(h['x-admin-token'] || '')), b = Buffer.from(process.env.ADMIN_TOKEN || '');
  const crypto = require('crypto'); return b.length >= 16 && t.length === b.length && crypto.timingSafeEqual(t, b); };
module.exports = { init, json, cookie, isAdmin, UserError, getUser };
