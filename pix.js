/**
 * Adaptador de Pix do HykuCass.
 * PIX_PROVIDER=mock   → testes locais (padrão)
 * PIX_PROVIDER=asaas  → produção com Asaas
 *
 * Variáveis necessárias para o Asaas:
 *   ASAAS_API_KEY=$aact_xxxx
 *   ASAAS_WEBHOOK_TOKEN=xxxx   (painel Asaas → Integrações → Webhook → Token)
 *   ASAAS_WALLET_ID=xxxx       (painel Asaas → Minha Conta → Dados bancários → ID da carteira)
 *   ASAAS_SANDBOX=1            (opcional, para testes no sandbox)
 *   PIX_EXPIRY_SECONDS=3600    (opcional, padrão 1 hora)
 *
 * Docs: https://docs.asaas.com/reference
 */
const crypto = require('crypto');
const PROVIDER = process.env.PIX_PROVIDER || 'mock';
const BASE = process.env.ASAAS_SANDBOX === '1'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/api/v3';
const KEY = process.env.ASAAS_API_KEY || '';
const WH_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';
const WALLET_ID = process.env.ASAAS_WALLET_ID || '';
const EXPIRY = Number(process.env.PIX_EXPIRY_SECONDS || 3600);

const h = extra => ({ 'access_token': KEY, 'Content-Type': 'application/json', ...extra });

async function asaasRequest(method, path, body) {
  const r = await fetch(BASE + path, {
    method, headers: h(),
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await r.json();
  if (!r.ok) throw new Error('Asaas ' + path + ': ' + JSON.stringify(data));
  return data;
}

async function getOrCreateCustomer(user) {
  // busca por e-mail primeiro
  const list = await asaasRequest('GET', '/customers?email=' + encodeURIComponent(user.email));
  if (list.data?.[0]?.id) return list.data[0].id;
  const c = await asaasRequest('POST', '/customers', {
    name: user.name || user.email.split('@')[0],
    email: user.email,
    ...(user.phone ? { mobilePhone: user.phone } : {})
  });
  return c.id;
}

const asaas = {
  // ── DEPÓSITO ────────────────────────────────────────────────────────────────
  async createCharge({ id, amount, user }) {
    const customerId = await getOrCreateCustomer(user);
    const due = new Date(Date.now() + EXPIRY * 1000).toISOString().slice(0, 10);
    // cria cobrança Pix
    const pay = await asaasRequest('POST', '/payments', {
      customer: customerId,
      billingType: 'PIX',
      value: amount / 100,          // Asaas usa reais, não centavos
      dueDate: due,
      description: 'Depósito HykuCass',
      externalReference: id
    });
    // busca QR Code copia e cola
    const qr = await asaasRequest('GET', '/payments/' + pay.id + '/pixQrCode');
    if (!qr.payload) throw new Error('Asaas: QR Code não retornado — ' + JSON.stringify(qr));
    return { providerRef: pay.id, code: qr.payload };
  },

  // ── WEBHOOK (confirmação de depósito) ───────────────────────────────────────
  verifyWebhook(raw, headers) {
    // Asaas envia o token no cabeçalho asaas-access-token
    const token = String(headers['asaas-access-token'] || '');
    if (!WH_TOKEN || token.length !== WH_TOKEN.length ||
        !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(WH_TOKEN))) return null;
    try {
      const ev = JSON.parse(raw);
      // aceita PAYMENT_RECEIVED e PAYMENT_CONFIRMED
      if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(ev.event)) return null;
      const ref = ev.payment?.id;
      if (!ref) return null;
      return { providerRef: ref };
    } catch { return null; }
  },

  // ── SAQUE (transferência Pix para o jogador) ────────────────────────────────
  // pixKey: chave Pix do jogador (CPF, e-mail, telefone ou chave aleatória)
  // amount: em centavos
  async payout({ amount, pixKey, ref }) {
    if (!WALLET_ID) throw new Error('ASAAS_WALLET_ID não configurado');
    // detecta o tipo de chave automaticamente
    const keyType = detectKeyType(pixKey);
    const transfer = await asaasRequest('POST', '/transfers', {
      value: amount / 100,
      bankAccount: {
        ispb: null,     // não necessário para Pix por chave
        pixAddressKey: pixKey,
        pixAddressKeyType: keyType
      },
      description: 'Saque HykuCass #' + ref,
      walletId: WALLET_ID
    });
    if (!transfer.id) throw new Error('Asaas payout: resposta inesperada — ' + JSON.stringify(transfer));
    return { transferId: transfer.id, status: transfer.status };
  }
};

function detectKeyType(key) {
  key = String(key).trim();
  if (/^\d{11}$/.test(key.replace(/\D/g, '')) && key.replace(/\D/g, '').length === 11) return 'CPF';
  if (/^\d{14}$/.test(key.replace(/\D/g, ''))) return 'CNPJ';
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) return 'EMAIL';
  if (/^\+?\d{10,13}$/.test(key.replace(/[\s\-()]/g, ''))) return 'PHONE';
  return 'EVP'; // chave aleatória
}

// ── MOCK (testes locais) ──────────────────────────────────────────────────────
const mock = {
  isMock: true,
  createCharge: ({ id }) => ({ providerRef: 'mock_' + id, code: 'HYKUCASS-MOCK-PIX-' + id }),
  verifyWebhook(raw, headers) {
    const SECRET = process.env.PIX_WEBHOOK_SECRET || 'troque-este-segredo';
    const sig = Buffer.from(String(headers['x-signature'] || ''), 'hex');
    const exp = crypto.createHmac('sha256', SECRET).update(raw).digest();
    if (sig.length !== exp.length || !crypto.timingSafeEqual(sig, exp)) return null;
    try { return { providerRef: JSON.parse(raw).providerRef }; } catch { return null; }
  },
  payout: async ({ amount, pixKey, ref }) => ({ transferId: 'mock_transfer_' + ref, status: 'PENDING' }),
  sign: raw => crypto.createHmac('sha256', process.env.PIX_WEBHOOK_SECRET || 'troque-este-segredo').update(raw).digest('hex')
};

module.exports = PROVIDER === 'asaas' ? asaas : mock;
