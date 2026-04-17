# Mapa del repositorio Mesher

Guía rápida para orientarte en carpetas y archivos importantes. El monorepo usa **pnpm workspaces**; el código compartido vive en `packages/`, la app en `packages/mobile`.

---

## Raíz del proyecto (`/`)

| Ruta | Qué hay |
|------|---------|
| [`package.json`](../package.json) | Scripts del monorepo (`build`, `test`) y `packageManager` pnpm |
| [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) | Lista de paquetes bajo `packages/*` |
| [`.npmrc`](../.npmrc) | Ajustes de instalación (hoisting útil con Expo) |
| [`.gitignore`](../.gitignore) | Artefactos ignorados (`node_modules`, `.expo`, etc.) |
| [`README.md`](../README.md) | Resumen del proyecto y comandos básicos |
| [`mesh.md`](../mesh.md) | Escenario de producto y diseño conceptual (rave / DTN / gossip) |

---

## Documentación (`docs/`)

| Archivo | Contenido |
|---------|-----------|
| [`ios-background-ble.md`](ios-background-ble.md) | Limitaciones de BLE en segundo plano en iOS |
| [`expo-native-debug-log.md`](expo-native-debug-log.md) | Principio: logs nativos → Metro vía eventos de device; ejemplo `MesherNativeLog` |
| [`THREAT_MODEL.md`](THREAT_MODEL.md) | Modelo de amenazas del MVP (cifrado, metadatos, QR) |
| [`crypto-forward-secrecy.md`](crypto-forward-secrecy.md) | Evolución futura: rotación, forward secrecy, ratchets |
| [`cursor-skills.md`](cursor-skills.md) | Cómo buscar/instalar skills de agente (Expo, debugging, etc.) |
| **`project-structure.md`** (este archivo) | Navegación del repo y próximos pasos de desarrollo |

---

## Skills de Cursor (opcional)

| Ruta | Qué hay |
|------|---------|
| [`.agents/skills/find-skills/`](../.agents/skills/find-skills/) | Skill local para descubrir otras skills (`npx skills`, skills.sh) |

---

## Paquete `@mesher/domain` (`packages/domain/`)

Lógica **pura TypeScript**: sin React Native. Contratos estables para el resto del sistema.

| Ruta | Qué hay |
|------|---------|
| `src/packet/` | `NetworkPacket` v1, serialización JSON/Base64, bytes **canónicos** para firmar |
| `src/policies/` | Reglas `canForward`, `isRecipient`, `withIncrementedHop` (TTL, hops, dedup) |
| `src/framing/` | Fragmentación MTU + ensamblado por `streamId` |
| `src/ports/` | Interfaces: `TransportPort`, `PersistencePort`, `CryptoPort`, reloj, random, notificaciones |
| `src/encoding/` | Base64 sin depender de `Buffer` |
| `dist/` | Salida compilada (`pnpm --filter @mesher/domain build`) — la app importa esto vía workspace |
| `src/**/*.test.ts` | Tests Vitest del dominio |

---

## Paquete `@mesher/application` (`packages/application/`)

**Casos de uso** que orquestan dominio + puertos (sin implementar BLE/SQLite aquí).

| Ruta | Qué hay |
|------|---------|
| `src/use-cases/` | Encolar mensaje, pipeline de entrada, gossip, emparejar por QR, purgar expirados |
| `src/gossip/` | `StreamChunkAssembler` (multiplex por `streamId`) |
| `src/deps.ts` | Tipo `AppDeps` (inyección de puertos) |
| `dist/` | Salida compilada |

---

## App móvil (`packages/mobile/`)

React Native + **Expo** (con **expo-dev-client**). Aquí están los **adaptadores** a los puertos del dominio.

| Ruta | Qué hay |
|------|---------|
| `App.tsx` | Entrada de la app; monta el navegador principal |
| `app.json` | Nombre/slug, plugins (`expo-dev-client`), permisos iOS/Android (BT, cámara) |
| `metro.config.js` | Metro ve el monorepo (`watchFolders`, `node_modules` raíz) |
| `index.ts` | Punto de entrada Expo; instala el bridge de logs nativos (`installNativeMesherLogBridge`) — ver [expo-native-debug-log.md](expo-native-debug-log.md) |
| `assets/` | Iconos y splash |
| **`src/adapters/`** | `sqlite-persistence`, `tweetnacl-crypto`, `mock-ble-transport`, reloj, random, notificaciones; stub documentado para BLE real (`plx-ble-transport.stub.ts`) |
| **`src/identity/`** | Carga/creación de claves con `expo-secure-store` |
| **`src/mesh/`** | `meshRuntime.ts`: compone `AppDeps`, transporte mock, suscripción a chunks |
| **`src/state/`** | Store global UI con **Zustand** (`meshStore.ts`) |
| **`src/screens/`** | Home, Pair (QR), Compose |
| **`src/navigation/`** | `RootNavigator`, tipos de rutas |

---

## Próximos pasos (desarrollo local)

### 1. Instalar y compilar paquetes TS

Desde la **raíz** del repo:

```bash
pnpm install
pnpm run build
```

Esto genera `packages/domain/dist` y `packages/application/dist`. La app móvil depende de esos paquetes; el script `prestart` de `mobile` también dispara el build al hacer `pnpm start` en mobile.

### 2. Development build (dev client)

**Expo Go** no sirve como sustituto completo cuando usas módulos nativos (p. ej. `react-native-ble-plx`, SQLite nativo, etc.). El plan asume **development build** (`expo-dev-client`).

**Primera vez (genera `ios/` y `android/`):**

```bash
cd packages/mobile
npx expo prebuild
```

Luego compila e instala la app en simulador o dispositivo:

```bash
npx expo run:ios
# o
npx expo run:android
```

Eso instala el binario con **dev client** embebido.

### 3. Servidor de desarrollo (Metro)

En otra terminal (o a veces `run:*` ya arranca bundler según versión):

```bash
cd packages/mobile
pnpm start
# equivalente: npx expo start --dev-client
```

Abre la app **Mesher (dev)** en el simulador/teléfono y conéctala al bundler (escanea QR en dispositivo físico o usa teclas en simulador).

**Resumen:** sí — el flujo habitual es **tener un dev client instalado** (vía `expo prebuild` + `expo run:ios|android`) y **levantar Metro** con `expo start --dev-client` para recargar JS en caliente.

### 4. Qué esperar hoy en el MVP

- El transporte activo es **`MockBleMeshTransport`**: la malla solo existe **dentro del mismo proceso JS** (útil para probar cifrado, SQLite y UI en un solo dispositivo).
- Para **BLE real entre dos teléfonos**, el siguiente paso técnico es implementar `TransportPort` con **react-native-ble-plx** tras prebuild; guía breve en [`packages/mobile/src/adapters/plx-ble-transport.stub.ts`](../packages/mobile/src/adapters/plx-ble-transport.stub.ts).

### 5. Documentos útiles al avanzar

- Permisos y expectativas iOS: [`docs/ios-background-ble.md`](ios-background-ble.md)
- Seguridad MVP: [`docs/THREAT_MODEL.md`](THREAT_MODEL.md)

---

*Si añades carpetas nuevas (p. ej. `packages/e2e` o tests de integración), conviene actualizar este archivo.*
