const crypto = require('crypto');
const { get, run, UserError } = require('./db');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const DAY = 864e5;
const hash = pw => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(pw, s, 64).toString('hex'); };
const check = (pw, h) => { const [s, k] = h.split(':'); return crypto.timingSafeEqual(Buffer.from(k, 'hex'), crypto.scryptSync(pw, s, 64)); };
const tries = new Map();
function limit(key) { const t = tries.get(key) || { n: 0, reset: Date.now() + 9e5 };
  if (Date.now() > t.reset) { t.n = 0; t.reset = Date.now() + 9e5; }
  if (++t.n > 5) throw new UserError('Muitas tentativas. Tente em 15 minutos.'); tries.set(key, t); }
async function session(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await run('INSERT INTO sessions VALUES(?,?,?)', [sha(token), userId, Date.now() + 7 * DAY]);
  return token;
}
async function register({ name, email, phone, password }) {
  name = String(name || '').trim(); email = String(email || '').trim().toLowerCase();
  phone = String(phone || '').replace(/\D/g, '');
  if (name.length < 2) throw new UserError('Nome inválido');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new UserError('E-mail inválido');
  if (phone.length < 10 || phone.length > 11) throw new UserError('Telefone inválido');
  if (String(password || '').length < 8) throw new UserError('A senha precisa ter 8 caracteres ou mais');
  try {
    const r = await get('INSERT INTO users(name,email,phone,pw,created) VALUES(?,?,?,?,?) RETURNING id',
      [name, email, phone, hash(password), new Date().toISOString()]);
    return session(r.id);
  } catch (e) { throw new UserError('E-mail já cadastrado'); }
}
async function login({ email, password }, ip) {
  email = String(email || '').trim().toLowerCase(); limit(ip + email);
  const u = await get('SELECT id,pw,kyc FROM users WHERE email=?', [email]);
  if (!u || !check(String(password || ''), u.pw)) throw new UserError('E-mail ou senha incorretos');
  if (u.kyc === 'blocked') throw new UserError('Conta bloqueada');
  return session(u.id);
}
async function getUser(cookie) {
  const t = (/sid=([a-f0-9]{64})/.exec(cookie || '') || [])[1]; if (!t) return null;
  return get('SELECT u.id,u.name,u.email,u.phone,u.kyc,u.balance FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?', [sha(t), Date.now()]);
}
const logout = async cookie => { const t = (/sid=([a-f0-9]{64})/.exec(cookie || '') || [])[1]; if (t) await run('DELETE FROM sessions WHERE token=?', [sha(t)]); };
module.exports = { register, login, getUser, logout };
