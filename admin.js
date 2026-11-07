const { init, json, isAdmin, UserError } = require('./_shared');
const { all, get, run } = require('../../db');
const { post } = require('../../wallet');
const pix = require('../../pix');
exports.handler = async ev => {
  await init();
  if (!isAdmin(ev.headers)) return json(403, { error: 'Acesso negado' });
  const path = ev.path.replace('/.netlify/functions/admin', '').replace('/api/admin', '');
  if (path === '/players') return json(200, { players: await all('SELECT id,name,email,phone,kyc,balance,created FROM users ORDER BY id DESC') });
  if (path === '/rounds') return json(200, { rounds: (await all('SELECT id,game,choice,bet,payout,created,user_id FROM rounds ORDER BY rowid DESC LIMIT 50')).map(r => ({ ...r, choice: JSON.parse(r.choice || 'null') })) });
  if (path === '/withdrawals') return json(200, await all('SELECT * FROM withdrawals ORDER BY id DESC LIMIT 100'));
  if (path === '/kyc' && ev.httpMethod === 'POST') {
    const b = JSON.parse(ev.body || '{}');
    if (!['active', 'blocked'].includes(b.status)) return json(400, { error: 'Status inválido' });
    await run('UPDATE users SET kyc=? WHERE id=?', [b.status, +b.userId]);
    return json(200, { ok: true });
  }
  const m = /^\/withdrawals\/(\d+)\/(approve|reject)$/.exec(path);
  if (m && ev.httpMethod === 'POST') {
    const w = await get('SELECT * FROM withdrawals WHERE id=?', [+m[1]]);
    if (!w || w.status !== 'pending') return json(400, { error: 'Saque não está pendente' });
    if (m[2] === 'reject') {
      await run("UPDATE withdrawals SET status='rejected' WHERE id=?", [w.id]);
      await post(w.user_id, 'withdraw_refund', w.amount, 'w' + w.id);
      return json(200, { ok: true });
    }
    try {
      const result = await pix.payout({ amount: w.amount, pixKey: w.pix_key, ref: w.id });
      await run("UPDATE withdrawals SET status='approved' WHERE id=?", [w.id]);
      return json(200, { ok: true, transferId: result.transferId });
    } catch (e) { return json(500, { error: 'Falha no payout: ' + e.message }); }
  }
  return json(404, { error: 'não encontrado' });
};
