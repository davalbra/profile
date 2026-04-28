# Migración de secretos a Vercel

Este proyecto quedó preparado para trabajar con:

- `development`: valores locales descargados a `.env.local`
- `production`: variables del proyecto en Vercel

No se usa `.env` global.

## 1. Rotar primero

Tu `.env.local` actual contiene secretos reales expuestos. Antes de subir nada, rota al menos:

- `FIREBASE_PRIVATE_KEY`
- `GITHUB_TOKEN`
- `DATABASE_URL` / password de Neon
- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`
- `CRON_SECRET`
- `TRADING_SCHEDULER_TOKEN`
- `YTMUSIC_COOKIE`
- `N8N_COPY_WEBHOOK_URL`

`VERCEL_OIDC_TOKEN` no debe permanecer en `.env.local`.

## 2. Variables que sí siguen activas

### Públicas

- `NUXT_PUBLIC_FIREBASE_API_KEY`
- `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NUXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NUXT_PUBLIC_FIREBASE_APP_ID`
- `NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Secretos / servidor

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `DATABASE_URL`
- `GITHUB_TOKEN`
- `N8N_COPY_WEBHOOK_URL`
- `MCP_SERVER_TOKEN`
- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`
- `CRON_SECRET`
- `TRADING_SCHEDULER_TOKEN`
- `YTMUSIC_COOKIE`
- `YTMUSIC_USER_AGENT`
- `YTMUSIC_ACCOUNT_ID`

### Infra no secreta

- `GOOGLE_BILLING_EXPORT_TABLE`
- `GOOGLE_BILLING_QUERY_PROJECT_ID`
- `GOOGLE_BILLING_BQ_LOCATION`

## 3. Lo que debes borrar de `.env.local`

No son necesarios para el runtime Nuxt actual:

- `VERCEL_OIDC_TOKEN`
- todos los `NEXT_FIREBASE_*`
- `FIREBASE_TYPE`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_AUTH_ID`
- `FIREBASE_TOKEN_URI`
- `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
- `FIREBASE_CLIENT_X509_CERT_URL`
- `FIREBASE_UNIVERSE_DOMAIN`
- `POSTGRES_DATABASE`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_USER`
- `DATABASE_URL_UNPOOLED`

## 4. Vincular el proyecto

```bash
pnpm dlx vercel link
```

## 5. Sincronizar solo secretos

El script local usa `--sensitive` solo en `production`. Vercel no permite variables sensitive en `development`.

Development:

```bash
node scripts/vercel-sync-secrets.mjs development .env.local
```

Production:

```bash
node scripts/vercel-sync-secrets.mjs production .env.local
```

Ambos:

```bash
node scripts/vercel-sync-secrets.mjs both .env.local
```

## 6. Descargar development a local

```bash
pnpm dlx vercel env pull .env.local --environment=development --yes
```

## 7. Preview

Vercel mantiene el entorno `preview` como concepto de plataforma. Si no quieres secretos ahí, no los definas para `preview`.

Si ya existen secretos en `preview`, elimínalos:

```bash
pnpm dlx vercel env ls preview
pnpm dlx vercel env rm NOMBRE preview --yes
```

## 8. Verificación útil

Build usando secretos de producción sin escribir archivo local extra:

```bash
pnpm dlx vercel env run -e production -- pnpm build
```
