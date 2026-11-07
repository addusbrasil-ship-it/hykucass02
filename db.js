const { createClient } = require('@libsql/client');
let _db;
function getDb() {
  if (!_db) _db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });
  return _db;
}
async function run(sql, args = []) { const db = getDb(); await db.execute({ sql, args }); }
async function get(sql, args = []) { const db = getDb(); const r = await db.execute({ sql, args }); return r.rows[0] || null; }
async function all(sql, args = []) { const db = getDb(); const r = await db.execute({ sql, args }); return r.rows; }
async function initDb() {
  const db = getDb();
  await db.batch([
    { sql: `CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL, pw TEXT NOT NULL, kyc TEXT NOT NULL DEFAULT 'active',
        balance INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL)` },
    { sql: `CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)` },
    { sql: `CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, type TEXT NOT NULL,
        amount INTEGER NOT NULL, balance_after INTEGER NOT NULL, ref TEXT, created TEXT NOT NULL)` },
    { sql: `CREATE TABLE IF NOT EXISTS rounds(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, game TEXT,
        choice TEXT, bet INTEGER, payout INTEGER, detail TEXT, created TEXT)` },
    { sql: `CREATE TABLE IF NOT EXISTS pix_charges(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL, status TEXT NOT NULL, provider_ref TEXT, code TEXT, created TEXT)` },
    { sql: `CREATE TABLE IF NOT EXISTS withdrawals(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL, pix_key TEXT NOT NULL, status TEXT NOT NULL, created TEXT)` }
  ], 'deferred');
}
class UserError extends Error {}
module.exports = { run, get, all, initDb, UserError };
