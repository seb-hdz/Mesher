---
name: Skills discovery Mesher
overview: Seguir el flujo de la skill local [find-skills](.agents/skills/find-skills/SKILL.md) y la guía del repo [docs/cursor-skills.md](docs/cursor-skills.md) para descubrir skills alineadas con el stack Mesher (Expo dev client, RN, TypeScript monorepo, dominio hexagonal, SQLite, cifrado/BLE futuro), validar calidad e instalar solo lo que elijas.
todos:
  - id: read-find-skills
    content: Leer y seguir flujo en `.agents/skills/find-skills/SKILL.md` (leaderboard → find → validar → presentar).
    status: completed
  - id: leaderboard-expo
    content: Revisar skills.sh leaderboard + candidatos Expo listados en `docs/cursor-skills.md`.
    status: completed
  - id: run-cli-queries
    content: Ejecutar bloques de `npx skills find` (react native, expo, debugging, typescript, vitest, monorepo, UI móvil, opcional BLE/security).
    status: completed
  - id: curate-install
    content: Filtrar por installs/autor, redactar lista corta con `npx skills add` y enlaces; instalar solo lo aprobado.
    status: completed
isProject: false
---

# Plan: descubrir skills relevantes para Mesher con find-skills

## Contexto del proyecto (para acotar búsquedas)

Según [docs/project-structure.md](docs/project-structure.md) y [docs/cursor-skills.md](docs/cursor-skills.md):

- **App**: React Native + **Expo** (`expo-dev-client`), Zustand, Metro monorepo (`packages/mobile`).
- **Paquetes**: `@mesher/domain` (TypeScript puro + **Vitest**), `@mesher/application` (casos de uso + puertos).
- **Nativo / datos**: SQLite (`expo-sqlite`), identidad (`expo-secure-store`), BLE mock con ruta a **react-native-ble-plx** documentada en el stub.
- **Criterio explícito del repo**: priorizar RN/Expo, UI móvil, debugging estructurado, revisión de código; **no** priorizar Playwright / E2E web genérico salvo que añadáis web.

Eso define qué dominios buscar en el ecosistema `npx skills` / [skills.sh](https://skills.sh/).

## Paso 0 — Activar la skill local

Antes de buscar, leer y aplicar [`.agents/skills/find-skills/SKILL.md`](.agents/skills/find-skills/SKILL.md): flujo leaderboard → `npx skills find` → verificar instalaciones/autor → presentar opciones → instalar con consentimiento (`npx skills add ... -g -y` si procede).

## Paso 1 — Leaderboard y fuentes conocidas

1. Abrir [skills.sh](https://skills.sh/) (leaderboard) y anotar skills con muchas instalaciones en: **React / React Native / TypeScript / diseño frontend** (p. ej. bundles tipo `vercel-labs/agent-skills`, `anthropics/skills`, según lo que liste el sitio).
2. Revisar candidatos **Expo** ya mencionados en [docs/cursor-skills.md](docs/cursor-skills.md) (verificar que sigan existiendo y el contador de installs): `expo/skills@expo-dev-client`, `@building-native-ui`, `@expo-cicd-workflows`.

## Paso 2 — Búsquedas CLI por lotes (queries alineadas al repo)

Ejecutar desde la máquina (raíz del repo o cualquier cwd; la CLI es global al proyecto de skills):

**Bloque “core stack”** (recomendado en la doc del proyecto):

- `npx skills find react native`
- `npx skills find expo`
- `npx skills find systematic debugging`
- `npx skills find typescript`

**Bloque “monorepo y calidad”** (encaja con pnpm workspaces + paquetes compilados):

- `npx skills find monorepo` o `pnpm workspace`
- `npx skills find vitest` (tests en `packages/domain`)
- `npx skills find code review` o `lint best practices`

**Bloque “móvil / producto”** (UI y accesibilidad útiles para pantallas Home/Pair/Compose):

- `npx skills find react native ui`
- `npx skills find mobile accessibility`

**Bloque “opcional / futuro cercano”** (BLE real, seguridad; puede haber poco en el índice):

- `npx skills find react native ble` o `bluetooth`
- `npx skills find threat modeling` o `security review` (complemento a [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md), no sustituto)

Si una query no devuelve nada útil, probar sinónimos del cuadro “Common Skill Categories” en la skill (`testing`, `ci-cd`, `refactor`).

## Paso 3 — Filtrado (obligatorio según find-skills)

Para cada candidato interesante, **no** recomendar solo por título:

- Preferir **1k+ installs** (cautela bajo 100).
- Preferir autores **reconocidos** (expo, vercel-labs, anthropics, microsoft, etc.).
- Ojear el repo en GitHub (stars/actividad) si el paquete es desconocido.

Descartar o marcar “baja prioridad” skills claramente centrados en **automatización web / Playwright** salvo que decidáis añadir una capa web al producto.

## Paso 4 — Entrega y decisión de instalación

Producir una lista corta para ti (3–8 skills) agrupada por:

- **Expo / dev client / builds**
- **RN + TypeScript + monorepo**
- **Tests / calidad / debugging**
- **Opcional**: seguridad o BLE si aparece algo sólido

Para cada ítem: nombre, qué cubre, installs aproximados, comando `npx skills add owner/repo@skill`, enlace en skills.sh.

Solo entonces instalar los que elijas (la skill sugiere `-g -y` para no interactivo; puedes omitir `-y` si prefieres confirmar).

## Nota de alcance

Este plan es **descubrimiento y curación**, no cambios al código de Mesher. Si más adelante queréis skills **propias** del dominio (p. ej. “convenciones Mesher: puertos, paquetes”), eso sería un paso aparte con `npx skills init` según la misma skill.
