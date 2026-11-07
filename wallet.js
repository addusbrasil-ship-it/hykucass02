const { get, run, UserError } = require('./db');
async function post(userId, type, amount, ref) {
  const u = await get('SELECT balance FROM users WHERE id=?', [userId]);
  const nb = u.balance + amount;
  if (nb < 0) throw new UserError('Saldo insuficiente');
  await run('UPDATE users SET balance=? WHERE id=?', [nb, userId]);
  await run('INSERT INTO ledger(user_id,type,amount,balance_after,ref,created) VALUES(?,?,?,?,?,?)',
    [userId, type, amount, nb, ref || null, new Date().toISOString()]);
  return nb;
}
module.exports = { post };
