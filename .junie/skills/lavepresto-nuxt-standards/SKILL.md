---
name: lavepresto-nuxt-standards
description: Enforce LavePresto architecture standards in this Nuxt 4 + Prisma repository. Use when creating or refactoring pages, components, composables, stores, types, utilities, or endpoints related to forms, dashboard views, client-side API consumption, folder organization, and Prisma typing.
---

# LavePresto Nuxt Standards

## Overview

Apply these rules before modifying any Vue or Nuxt code. Prioritize forms using `Form` and `FormField` with `rules`, separate responsibilities, centralize client-server calls in `store/`, type with Prisma, and keep `pages/` exclusive for actual route entry points.

## Core Rules & Contradiction Resolution

### 1. General Project Rules (Synchronized with AGENTS.md)

- **Imports:** Always use `@/...` for internal imports. Never use `~/...`. If you find `~/`, normalize it to `@/`.
- **Alerts:** Never destructure `useAlert()`. use `const swalAlert = useAlert()` and call `swalAlert.open()`.
- **Typing:** Do **not** use `as` or `satisfies`. Use explicit interfaces or Prisma types.
- **Prisma-derived view types:** If a view type mirrors a Prisma model/query result, derive it from `Prisma.<Modelo>GetPayload` instead of recreating a manual interface.
- **Error handling typing:** In `catch`, if the error value is not used, omit the parameter (`catch { ... }`). If you need the error, treat it as `unknown` and narrow it with `axios.isAxiosError(...)` or a shared helper from `@/utils/errores`. Never access `error.response` directly without narrowing.
- **Props:** Do **not** declare `const props = defineProps(...)` if the props are only used in the template.
- **Stores:** Do not rename the `data` property when destructuring store responses (e.g., `const { data } = await store.fetch()`, not `const { data: myData }`).
- **Language:** Write code (variables, functions, comments) in **Spanish** unless it conflicts with external APIs or reserved names. This is STRICT. NO English terms like `fallback`, `status`, `default`.
- **Naming Conventions:** Use descriptive variable names. NEVER use single-letter variables (like `e`, `i`, `s`, `x`) outside of simple loop indexes or short math algorithms.
- **Enums & Constants:** Do NOT use hardcoded string literals for states, modes, labels, or configurations (e.g. `'nuevo'`, `'completado'`). You must define and use an explicit `enum` in `~/utils/enums/anums.ts` or `~/utils/enums/diccionario.ts`.
- **Prisma Client:** Never import from `@prisma/client`. You must always import Prisma types from the generated client directory, e.g., `import type { Recibo } from "~/server/prisma-client";`.
- **Primitive refs:** Do not write `ref<number>`, `ref<string>`, or `ref<boolean>` when the initial value already infers the type. Reserve explicit generics for objects, arrays, unions, nullable values, or cases where inference is insufficient.
- **Required primitive props:** If a child component always receives primitive props from its parent, declare them as required in `defineProps`. Do not mark them optional and then compensate with `withDefaults`, destructuring defaults, or extra computed aliases just to satisfy TypeScript/Volar.
- **Two-way binding:** Do not build `v-model` proxies with `computed({ get, set })` that only forward `props` and `emit`. Use `defineModel` / `defineModels` for two-way bindings. This applies to `open`, `search`, `dateRange`, and any similar model prop.

### 1.1 Auto-Learning Rule

- **Persist user corrections:** Every time the user corrects a repo-specific convention or coding rule, update this skill in the same task unless the user explicitly says not to. Treat the latest direct user correction as the source of truth for future edits in this repository.

### 2. Architecture & Forms

- **Forms:** Use `Form` and `FormField` from `~/components/ui/form` with inline `rules`.
- **Validation style:** Prefer string rules such as `rules="required|min:2|max:50"` or `rules="required|min_value:0"` for standard validations. Do not create per-field helper functions or local validator arrays when a string rule is enough.
- **Validation:** Do **not** use `zod`, `@vee-validate/zod`, or `toTypedSchema`.
- **Stores:** Stores must be minimal. They are only for HTTP calls using typed `axios`.
  - No `ref`, `computed`, `loading` states, or caches inside stores.
  - No `catch` or error resolution inside stores. The consumer (page/component) handles errors and UI messages.
  - Content must be returned with `async/await` directly: `return await axios.get(...)`.
- **Typing:** Derive types from Prisma or define explicit DTOs. Do **not** use `any`, `unknown`, or `undefined`. Use `null` for empty states.

### 3. Folder Structure & Organization

- **Pages:** `pages/` should only contain route components. Move logic, types, and constants to `lib/` (mirroring the route structure) or `utils/`.
- **Utils:** Centralize shared logic in `~/utils/`.
  - `~/utils/enums/anums.ts`: Centralized enums.
  - `~/utils/enums/diccionario.ts`: Label mappings.
- **Components:** UI actions that trigger a `POST` must show a `SweetAlert` processing state and a success `toast` upon completion.

## Technical Workflow

1. **Identify Scope:** Determine if the change affects a view, form, store, or shared utility.
2. **Consult Reference:** Read [references/project-architecture.md](references/project-architecture.md) for detailed checklists and structure.
3. **Implementation:**
   - Use Spanish for names.
   - Use `@/` for imports.
   - Follow the internal block structure for `.vue` files:
     ```ts
     import { ... } from '@/...'
     /** Props */
     /** Emit */
     /** Services, Components */
     /** DefineModel, Ref, Computed */
     /** Functions */
     /** Vue (watch, hooks, meta) */
     ```
4. **Verification:** Ensure `pages/` is clean, no `zod` is added, and stores remain stateless data access layers.

## Forbidden Patterns

- Using `$fetch` or `useFetch` in pages or components (must be in stores).
- Using `$fetch` in client-side stores (must use `axios`).
- Inline comments `//` to structure `script setup` (use `/** ... */` blocks).
- Destructuring `data` with renaming from stores.
- Using `as` or `satisfies` for typing.
- Comentarios descriptivos dentro de los templates de Vue (ej. `<!-- Image Section -->`).
- Variables con nombres de una sola letra (excepto iteradores en `for`) o escritas en Spanglish/Inglés.
- Uso de literales de texto directamente en las sentencias lógicas. Sempre usar un `Enum`.
- Importar tipos desde `@prisma/client`. Usar siempre el cliente interno generado (`~/server/prisma-client`).
- Funciones inline o llamadas a `emit` directas en el template de Vue (e.g., `@click="emit('evento')"` o `@change="(val) => emit('event', val)"`). Los eventos del template deben mapear a funciones explícitas definidas en el bloque `/** Functions */` del script.
