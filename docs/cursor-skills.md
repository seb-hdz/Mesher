# Cursor / Agent skills para Mesher

Después de fijar el stack (**Expo dev client, pnpm, SQLite, TweetNaCl vía `CryptoPort`**), conviene instalar skills que refuercen **React Native**, **Expo** y **depuración**. **No** priorizar skills centrados en **Playwright** u automatización web pura: esta app no tiene capa web como objetivo.

## 1. Skill local `find-skills`

En el repo hay [`.agents/skills/find-skills/SKILL.md`](../.agents/skills/find-skills/SKILL.md). Sigue sus pasos:

1. Revisa el leaderboard en [skills.sh](https://skills.sh/).
2. Busca con `npx skills find <query>` (ej. `react native`, `expo`, `typescript`, `debugging`).
3. Valida **instalaciones**, **autor** y **reputación del repo** antes de instalar.
4. Instala con `npx skills add <owner/repo>`.

## 2. Consultas sugeridas (ajustar a lo que exista en el índice)

```bash
npx skills find react native
npx skills find expo
npx skills find systematic debugging
npx skills find typescript
```

## 3. Criterio para Mesher

- **Sí**: convenciones RN/Expo, diseño de UI móvil, debugging estructurado, revisión de código.
- **No** (para este producto): Playwright / E2E web genérico sin componente web.

## 4. Ejemplos recientes desde `npx skills find expo`

Candidatos con buen volumen de instalaciones (verificar siempre en [skills.sh](https://skills.sh/) antes de añadir):

- `expo/skills@expo-dev-client`
- `expo/skills@building-native-ui`
- `expo/skills@expo-cicd-workflows`

Instalación: `npx skills add expo/skills@expo-dev-client` (sintaxis exacta según la CLI actual).

## 5. Recordatorio

Los skills **no sustituyen** la arquitectura hexagonal: transporte, persistencia y cripto siguen detrás de **puertos** en `@mesher/domain`.

## 6. Expo config plugins y nativo

- Regla del repo: [`.cursor/rules/expo-native-integration.mdc`](../.cursor/rules/expo-native-integration.mdc) (sin eject; cambios nativos vía plugins / `app.json` / `patch-package`).
- Skill instalada para apoyo a config Expo: `expo-config-setup` (`.agents/skills/expo-config-setup/`). Búsqueda adicional: `npx skills find expo config plugin` en la raíz del monorepo; instalar con `npx skills add … -y --copy` y versionar `skills-lock.json`.
