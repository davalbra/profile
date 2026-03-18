# Firebase Auth (Google) + Prisma en Next.js

Este proyecto ya incluye integración base de Firebase para:

- Auth con Google
- Storage para subida de archivos
- Sesión de Firebase registrada y validada en Prisma

## 1. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores de tu proyecto Firebase.

```bash
cp .env.example .env.local
```

Variables usadas:

```dotenv
NEXT_FIREBASE_API_KEY=
NEXT_FIREBASE_AUTH_DOMAIN=
NEXT_FIREBASE_PROJECT_ID=
NEXT_FIREBASE_STORAGE_BUCKET=
NEXT_FIREBASE_MESSAGING_SENDER_ID=
NEXT_FIREBASE_APP_ID=
NEXT_FIREBASE_MEASUREMENT_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
DATABASE_URL=
```

## 2. Configuración en Firebase Console

1. Crea un proyecto en Firebase.
2. En `Authentication > Sign-in method`, habilita `Google`.
3. En `Storage`, crea el bucket.
4. En `Project settings > Your apps > Web app`, copia las credenciales públicas.
5. En `Project settings > Service accounts`, genera una clave privada para `FIREBASE_CLIENT_EMAIL` y
   `FIREBASE_PRIVATE_KEY`.

## 3. Reglas mínimas recomendadas

Usa reglas de Storage que limiten acceso por usuario autenticado:

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 4. Ejecutar el proyecto

```bash
pnpm dev
```

Abre `http://localhost:3000` y haz click en `davalbra` en el navbar para abrir el modal de acceso con Google.

## 5. Prisma ORM integrado

El proyecto ya incluye Prisma con PostgreSQL:

- Config principal: `prisma.config.ts`
- Esquema: `prisma/schema.prisma`
- Cliente compartido: `lib/prisma.ts`

Comandos disponibles:

```bash
pnpm prisma:validate
pnpm prisma:format
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:push
pnpm prisma:studio
```

Nota: antes de usar migraciones o `db push`, revisa que `DATABASE_URL` apunte a la base correcta.

## 6. Flag de acceso por correo (Neon)

El login con Firebase puede restringirse por una whitelist en base de datos.

Tablas nuevas:

- `configuracion_acceso`: flag global.
- `correos_autorizados`: correos permitidos.

Flujo:

- Si `requerirListaCorreos = false`, entra cualquier usuario autenticado.
- Si `requerirListaCorreos = true`, solo entran correos activos en `correos_autorizados`.
- Si el correo no está permitido, la API responde `403`.

### Activar la restricción

Desde Prisma Studio (`pnpm prisma:studio`) edita `configuracion_acceso` (id `default`) y activa:

- `requerirListaCorreos = true`

### Autorizar correos

Inserta filas en `correos_autorizados` con:

- `email` en minúsculas
- `activo = true`

## 7. RBAC por rol (Prisma)

Además de la sesión Firebase y la whitelist por correo, el proyecto ahora valida rol mínimo por ruta.

Roles disponibles en `Usuario.rol`:

- `LECTOR` (default)
- `COLABORADOR`
- `ADMIN`

Rutas protegidas por rol desde `proxy.ts`:

- `/dashboard` requiere `COLABORADOR` o `ADMIN`
- `/storage-test` requiere `COLABORADOR` o `ADMIN`

Si un usuario autenticado no tiene rol suficiente, redirige a `/` con `?auth=forbidden`.

### Cambiar rol de un usuario

Desde Prisma Studio (`pnpm prisma:studio`) en la tabla `usuarios`, edita el campo `rol` del usuario.

## 8. Dashboard de costos por uso (Firebase y Gemini)

Se agregó una nueva sección en el panel: `Billing`, con dos apartados:

- `Firebase`
- `Google Gemini API`

Estos apartados leen costos reales desde el export de Cloud Billing en BigQuery.

Variables requeridas:

```dotenv
GOOGLE_BILLING_EXPORT_TABLE=mi-proyecto.billing.gcp_billing_export_v1_*
GOOGLE_BILLING_QUERY_PROJECT_ID=mi-proyecto
GOOGLE_BILLING_BQ_LOCATION=US
```

Notas:

- `GOOGLE_BILLING_EXPORT_TABLE` debe apuntar a tu tabla/vista de export.
- El service account usado por `FIREBASE_CLIENT_EMAIL` necesita permisos de consulta en BigQuery (ejemplo:
  `BigQuery Job User` + `BigQuery Data Viewer`).
- El billing export puede tener retraso, por lo que la vista no siempre es en tiempo real.

## 9. Bot de trading para Binance Futures (EMA + RSI + ATR)

Se agregó un bot en `scripts/binance-futures-bot.mjs` que opera futuros USDT-M de Binance.

### ¿Binance da dinero falso para practicar?

Sí. Binance Futures tiene **Testnet** con saldo virtual para paper trading.

- Usa `config/trading-futures.json` con `"testnet": true`
- Mantén `"dryRun": true` mientras validas lógica/sizing
- Cuando quieras enviar órdenes de prueba en testnet, cambia `"dryRun": false` y usa credenciales de testnet

### Estrategia implementada

No existe una estrategia "más rentable" garantizada para todos los mercados. Para este proyecto se implementó una
estrategia robusta de tipo trend-following con control de riesgo:

- Tendencia: cruce de `EMA rápida` (`BINANCE_FAST_EMA`, default `21`) sobre `EMA lenta` (`BINANCE_SLOW_EMA`, default
  `55`).
- Filtro de momentum con `RSI` (`BINANCE_RSI_PERIOD`, default `14`):
  - Long: RSI entre `52` y `70`
  - Short: RSI entre `30` y `48`
- Gestión de riesgo con `ATR` (`BINANCE_ATR_PERIOD`, default `14`):
  - Stop Loss = `ATR * BINANCE_STOP_ATR_MULT` (default `1.5`)
  - Take Profit = `ATR * BINANCE_TP_ATR_MULT` (default `3`)
- Tamaño de posición por riesgo fijo:
  - Riesgo por trade = `balance * BINANCE_RISK_PER_TRADE` (default `1%`).

El bot evita abrir una operación si ya existe una posición abierta en el símbolo.

### Configuración vs secretos

Ahora se separa así:

- Configuración no sensible: `config/trading-futures.json`
- Secretos: `.env.local`

Variables de entorno de trading necesarias:

```dotenv
BINANCE_API_KEY=
BINANCE_API_SECRET=
TRADING_SCHEDULER_TOKEN=
CRON_SECRET=
```

Ejemplo de configuración en archivo:

```json
{
  "binance": {
    "testnet": true,
    "dryRun": true,
    "symbol": "BTCUSDT",
    "interval": "15m",
    "leverage": 5,
    "riskPerTrade": 0.01
  },
  "scheduler": {
    "intervalMinutes": 15,
    "candlesForBacktesting": 500
  }
}
```

### Ejecutar el bot

```bash
pnpm trading:futures
```

Comportamiento:

- `"dryRun": true`: calcula señal y tamaño de posición, pero no envía órdenes.
- `"dryRun": false`: envía orden de entrada (`MARKET`) y crea protección con `STOP_MARKET` + `TAKE_PROFIT_MARKET`.

Recomendación operativa:

1. Probar primero con `"testnet": true`.
2. Validar logs y sizing con `"dryRun": true`.
3. Pasar a live solo después de backtesting y límites de riesgo definidos.

### Endpoints API del bot

Se agregaron endpoints protegidos por sesión Firebase y rol `COLABORADOR`:

- `POST /api/trading/futures/run`
- `POST /api/trading/futures/backtest`
- `POST /api/trading/futures/indicators`
- `GET /api/trading/futures/history?limit=20`
- `GET /api/trading/futures/scheduler`
- `PUT /api/trading/futures/scheduler`

Ejemplo payload para `run`:

```json
{
  "symbol": "BTCUSDT",
  "interval": "15m",
  "leverage": 5,
  "riskPerTrade": 0.01,
  "fastEma": 21,
  "slowEma": 55,
  "rsiPeriod": 14,
  "atrPeriod": 14,
  "stopAtrMult": 1.5,
  "tpAtrMult": 3,
  "dryRun": true,
  "testnet": true,
  "marginType": "ISOLATED",
  "paperBalance": 1000
}
```

Ejemplo payload para `backtest`:

```json
{
  "symbol": "BTCUSDT",
  "interval": "15m",
  "leverage": 5,
  "riskPerTrade": 0.01,
  "fastEma": 21,
  "slowEma": 55,
  "rsiPeriod": 14,
  "atrPeriod": 14,
  "stopAtrMult": 1.5,
  "tpAtrMult": 3,
  "testnet": true,
  "marginType": "ISOLATED",
  "paperBalance": 1000,
  "candlesLimit": 500
}
```

### Panel UI de Trading

Nuevo panel disponible en:

- `/dashboard/trading/futures`

Permite:

- Ejecutar `run` (señal y sizing en vivo con opción `dry-run`/`live`).
- Ejecutar `backtest` histórico sobre velas de Binance.
- Ver **gráficas de indicadores**: `Precio + EMA`, `RSI`, `ATR`.
- Ajustar parámetros de estrategia desde UI.
- Ver métricas (`win rate`, `ROI`, `max drawdown`, `profit factor`), historial de ejecuciones y estado del scheduler.

### Scheduler automático cada X minutos

Se agregó un scheduler persistente en Prisma:

- Configuración: `trading_futures_scheduler_config`
- Historial de runs: `trading_futures_run_history`
- Historial de backtests: `trading_futures_backtest_history`

Endpoint cron:

- `POST /api/trading/futures/scheduler/run`

Seguridad:

- Requiere `TRADING_SCHEDULER_TOKEN` o `CRON_SECRET` como Bearer token.
- En Vercel, el cron se dispara cada minuto (`vercel.json`) y el backend decide si ya tocó ejecutar según `intervalMinutes`.

Configúralo desde UI en `/dashboard/trading/futures`:

- `enabled`: activa/desactiva scheduler
- `intervalMinutes`: cada cuántos minutos ejecutar
- `runInDryMode`: dry/live del scheduler
- `testnet`: red del scheduler

### Sincronizar Prisma después de estos cambios

Después de actualizar código/esquema, aplica tablas nuevas:

```bash
pnpm prisma:generate
pnpm prisma:push
```
