# Firebase Auth + Storage en Next.js

Este proyecto ya incluye integración base de Firebase para:
- Auth con email/password
- Storage para subida de archivos

## 1. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores de tu proyecto Firebase.

```bash
cp .env.example .env.local
```

## 2. Configuración en Firebase Console

1. Crea un proyecto en Firebase.
2. En `Authentication > Sign-in method`, habilita `Email/Password`.
3. En `Storage`, crea el bucket.
4. En `Project settings > Your apps > Web app`, copia las credenciales públicas.

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

Abre `http://localhost:3000` para probar registro/login y subida de archivos.
