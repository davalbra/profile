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
5. En `Project settings > Service accounts`, genera una clave privada para `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.

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
