# HykuCass — Netlify + Turso

## Como subir

### 1. Crie o banco Turso
- Acesse turso.tech e crie uma conta
- Clique em "Create database" e chame de "hykucass"
- Copie a URL (libsql://...) e gere um token

### 2. Suba no GitHub
- Envie todos os arquivos para o repositório

### 3. Conecte ao Netlify
- Acesse netlify.com
- "Add new site → Import an existing project"
- Selecione o repositório do GitHub
- Build command: (deixe vazio)
- Publish directory: public
- Clique em "Deploy"

### 4. Configure as variáveis no Netlify
Em Site settings → Environment variables:
```
TURSO_URL=libsql://hykucass-seuusuario.turso.io
TURSO_TOKEN=xxxx
ADMIN_TOKEN=escolha32caracteresaqui1234567
PIX_PROVIDER=mock
PIX_WEBHOOK_SECRET=outrastring32caracteres1234
NODE_ENV=production
```

### 5. Redeploy
Após configurar as variáveis, clique em "Trigger deploy"

## URLs
- Site: https://hykucass.netlify.app
- Admin: https://hykucass.netlify.app/admin.html
- Webhook Pix: https://hykucass.netlify.app/api/pix-webhook

## Asaas (quando pronto)
Adicione nas variáveis:
```
PIX_PROVIDER=asaas
ASAAS_API_KEY=$aact_xxxx
ASAAS_WEBHOOK_TOKEN=xxxx
ASAAS_WALLET_ID=xxxx
```
