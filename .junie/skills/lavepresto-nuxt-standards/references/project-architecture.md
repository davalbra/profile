# LavePresto Architecture

## 1. Hard Rules

- Use `Form` and `FormField` from `~/components/ui/form` with `rules`.
- Do **not** introduce `zod`, `@vee-validate/zod`, `toTypedSchema`, or `z.infer` for project validations.
- Do **not** use `$fetch` or `useFetch` in `pages/`, `components/`, or view-specific files. Centralize client API access in `store/`.
- In client-side stores, use typed `axios` for HTTP calls. Do **not** use `$fetch` or `useFetch` inside client stores.
- Do **not** resolve errors inside the store: no `catch`, no `AxiosError` normalization, no message building. The consumer handles the error.
- The store should execute the query and return it. Handle errors, `toast`, `navigateTo`, dialog states, and messages in the consuming page or component.
- In Pinia setup stores, keep `defineStore(...)` only for state creation and returning the final object. Extract helpers and actions outside the callback when possible, but do not move `ref`s to the module scope.
- In stores, do **not** use `.then()` or `import type { Ref } from 'vue'`. Write calls with direct `async/await` and returns like `return await axios.get(...)`.
- Follow SOLID: separate types, constants, functions, stores, composables, and UI. Do not add all logic in a single file.
- Type everything. Do **not** use `any`.
- Do **not** use `unknown` or `undefined`; prefer concrete types and `null`.
- Create `utils/` for shared reusable code between more than one file. Separate functions, constants, and enums into different files.
- Keep only actual route files in `pages/`.
- Do **not** store `*.types.ts`, `*.constants.ts`, `*.utils.ts`, or `use*.ts` inside `pages/`; move them to `lib/`, `utils/`, `types/`, or `composables/` depending on scope.
- If helpers belong to a specific route, prefer a mirrored structure in `lib/`, e.g., `pages/auth.vue` along with `lib/auth/*`.
- Write code in Spanish whenever viable.
- Avoid explanatory comments within the code. Keep only the structural blocks defined for `.vue` files.
- Do **not** use `//` comments to mark sections inside `script setup`; use `/** ... */` blocks exclusively.
- In `script setup`, the `import` block must stay continuous and at the beginning. Do not insert structural comments or declarations between imports as it breaks `import/first`.
- If a route has no children, prefer `pages/auth.vue` over `pages/auth/index.vue`. Use folders in `pages/` only for actual nested routes or route groups.
- Do **not** use `login` or `register` routes. The public route is `/auth` and the form toggle is done via `modo=registro`.
- Every UI action triggering a `POST` to the backend must show a loading or processing `SweetAlert` and end with `toast.success(...)` when the operation is successful.
- If `defineProps()` is only consumed from the template, do not assign it to `const props`.
- Extract repeated or semantically important values to `constants/` or `enums/`. Do not hardcode strings for modes, states, or variants if they are part of a project convention.
- In `utils/enums/`, only `anums.ts` and `diccionario.ts` may exist.
- `anums.ts` concentrates all project enums.
- `diccionario.ts` concentrates `Record<Enum | EtiquetaNoEncontrada, string>` for readable labels.
- Define `EtiquetaNoEncontrada.DESCONOCIDA` as a common fallback for labels.
- Every time the user corrects a project convention, summarize and add it to the skill in the same turn.

## 2. Form Validations

Use `vee-validate` with `Form` and `FormField`, and define `rules` per field. If a rule is reused, extract it to `utils/validators/` or the view's `*.utils.ts` file.

Expected pattern:

```vue
<script setup lang="ts">
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'

interface DatosFormularioIngreso {
  correo: string
  contrasena: string
}

const reglaRequerida = (valor: string) => (valor ? true : 'Campo requerido')
const reglaCorreo = (valor: string) => /.+@.+\..+/.test(valor) || 'Correo inválido'

const valoresIniciales: DatosFormularioIngreso = {
  correo: '',
  contrasena: '',
}

const manejarEnvio = async () => {}
</script>

<template>
  <Form :initial-values="valoresIniciales" @submit="manejarEnvio">
    <FormField v-slot="{ componentField }" name="correo" :rules="[reglaRequerida, reglaCorreo]">
      <FormItem>
        <FormLabel>Correo</FormLabel>
        <FormControl>
          <Input v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
  </Form>
</template>
```

Avoid these patterns:

- `toTypedSchema(...)`
- `zod.object(...)`
- `LocalSchema = z.object(...)`
- Validating forms from `types/*.ts` with schemas

## 3. Store Responsibility

Use `store/` as the data access boundary on the client.

Use typed `axios` inside the store for client HTTP calls.

Permitted in a store:

- Executing an API call.
- Returning the typed response.

Not permitted in a store:

- `toast`
- `navigateTo`
- opening or closing dialogs
- deciding visual messages
- `catch` to resolve or transform errors
- `ref`, `computed`, `reactive`, or local state to save results
- `loading`, `total`, cached lists, or local mutations of results
- extra transformation helpers around the request
- hiding errors with `console.error` without rethrowing them

Expected pattern:

```ts
import axios from 'axios'
import { defineStore } from 'pinia'
import type { ClienteListadoResponse, CreateClientPayload } from './clientes.types'

export const useClientsStore = defineStore('clients', () => {
  const fetchClients = async (query: { page: number; pageSize: number; search: string }) => {
    return await axios.get<ClienteListadoResponse>('/api/clientes/clientes', { params: query })
  }

  const createClient = async (payload: CreateClientPayload) => {
    return await axios.post('/api/clientes/clientes', payload)
  }

  return {
    fetchClients,
    createClient,
  }
})
```

The page, dialog, or view composable must wrap the call in `try/catch`, read `response.data`, and decide what to do with the error and the local state (`loading`, lists, totals, etc.).

If the call is a `POST`, wrap the UI flow with a loading or processing `SweetAlert` and close with `toast.success(...)` when the operation concludes successfully.

Avoid these patterns outside `store/`:

- `useFetch("/api/...")` in a page
- `await $fetch("/api/...")` in a dialog or view
- `await $fetch("/api/...")` inside a client store
- declaring module-scope `ref(...)` for store state
- `catch` inside the store to transform errors or build messages
- `.then(...)` inside the store
- `import type { Ref } from 'vue'` inside the store
- `loading`, lists, or totals inside the HTTP store
- `console.error(...)` in the store before rethrowing the error

## 4. Typing with Prisma

Type models and relations using `~/server/prisma-client`.

Prefer:

- direct generated types: `Cliente`, `Local`, `Recibo`
- relations with `Prisma.ModelGetPayload`
- explicit DTOs for form, store, and API payloads

Expected pattern:

```ts
import type { Prisma, Cliente } from '~/server/prisma-client'

export type ClienteWithPersona = Prisma.ClienteGetPayload<{
  include: {
    persona: true
  }
}>

export interface CreateClientPayload {
  nombre: string
  cedula: string
  telefono: string
  direccion: string
  email?: string | null
  nota?: string | null
}

export type ClienteBase = Cliente
```

Rules:

- Do not use `any[]`, `any`, or responses without generics.
- If Prisma returns `Decimal`, convert or document the expected type for the UI.
- Keep view types in their `*.types.ts` file.
- Keep shared types in `types/` or `utils/` depending on actual scope.

## 5. `utils/` folder

Create `utils/` for everything reusable used in more than one file.

Suggested structure:

```text
utils/
  constants/
    order-status.ts
    routes.ts
  enums/
    payment-method.enum.ts
    user-role.enum.ts
  validators/
    common.rules.ts
    client.rules.ts
  formatters/
    currency.ts
    dates.ts
```

Rules:

- One file per responsibility.
- Do not put enums, constants, and helpers in the same file.
- If something is only used in one view, keep it within that view's folder.

## 6. Route structure and helper files

In `pages/`, each file must represent an actual route.

Simple example without subroutes:

```text
pages/
  auth.vue
lib/
  auth/
    auth.constants.ts
    auth.types.ts
    auth.utils.ts
    useAuthPage.ts
```

Example with actual subroutes:

```text
pages/dashboard/clientes/
  index.vue
```

```text
lib/dashboard/clientes/
  clientes.constants.ts
  clientes.types.ts
  clientes.utils.ts
  useClientesView.ts
```

If the view requires its own components:

```text
components/dashboard/clientes/
  ClientesFilters.vue
  ClientesTable.vue
  ClientesDialog.vue
```

Rules:

- If a route has no children, prefer `pages/auth.vue` instead of `pages/auth/index.vue`.
- Use `index.vue` inside `pages/` only when the folder represents an actual parent route or there are nested routes.
- Create `*.constants.ts`, `*.types.ts`, `*.utils.ts`, and `use*.ts` only if needed, but outside `pages/`.
- Do not leave support files inside `pages/` even if they are specific to a single route.

## 7. Internal order of `.vue` files

Order the content of each `script setup` as follows. If a block doesn't exist, omit the entire comment. All `import`s go first, with no comments between them. Block comments start only after the last import and must use exactly these `/** ... */` blocks, not `//` comments.

```ts
import { ref } from 'vue'
import type { MiTipo } from './archivo.types'

/**
 * Props
 */

/**
 * Emit
 */

/**
 * Servicios, Componentes
 */

/**
 * DefineModel, Ref, Computed
 */

/**
 * Funciones
 */

/**
 * Vue
 */
```

Apply the order as:

- `Types`: if local types exist for the file itself, declare them after imports and before `Props`. Do not put a `Types` comment above imports.
- `Props`: `defineProps`.
- `Emit`: `defineEmits`.
- `Servicios, Componentes`: stores, composables, services, imports used as dependency.
- `DefineModel, Ref, Computed`: `defineModel`, `ref`, `reactive`, `computed`.
- `Funciones`: handlers, mappers, local helpers.
- `Vue`: `watch`, `watchEffect`, lifecycle hooks, `definePageMeta`.

## 8. Checklist before closing

- `pages/` only contains actual route files.
- Route helper files live outside `pages/`.
- The form uses `Form` and `FormField` with `rules`.
- `zod` was not introduced.
- No `$fetch` or `useFetch` remain outside `store/`.
- Visual error handling remains in the Consuming view or component.
- No `any`.
- No `unknown` or `undefined`.
- Types come from Prisma or explicit DTOs.
- Shared reusable code remains in `utils/`.
- The `.vue` file respects the internal order defined above.
