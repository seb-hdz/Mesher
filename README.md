# Mesher

Monorepo **pnpm** para mensajería **store-and-forward** con **gossip** y capa **hexagonal** (puertos / adaptadores). App móvil: **React Native + Expo** con **development build** (`expo-dev-client`).

## Estructura

| Paquete | Descripción |
|---------|-------------|
| `packages/domain` | Entidades, `NetworkPacket` v1, políticas TTL/dedup/hops, framing MTU, interfaces de puertos |
| `packages/application` | Casos de uso (enqueue, incoming pipeline, gossip round, pair, purge) |
| `packages/mobile` | Adaptadores (SQLite, TweetNaCl, transporte BLE vía `MesherBleNative`), **Zustand**, UI |

Integración nativa Expo: **sin eject**; usar config plugins y `app.json` (ver [`.cursor/rules/expo-native-integration.mdc`](.cursor/rules/expo-native-integration.mdc)). El plugin [`packages/mobile/plugins/withMesherBle.js`](packages/mobile/plugins/withMesherBle.js) aplica el código en `plugins/mesher-ble-native/` en cada `expo prebuild`.

## Requisitos

- Node 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)

## Comandos

```bash
pnpm install
pnpm run build          # compila domain + application
pnpm test               # tests en paquetes que definan `test`
pnpm --filter mobile start
```

Para ejecutar en dispositivo con módulos nativos (BLE real, etc.):

```bash
cd packages/mobile
npx expo prebuild
npx expo run:ios
# o
npx expo run:android
```

**BLE mesh:** validar en **hardware** (dos teléfonos o iPhone + Android); el simulador suele no servir para BLE. Tras `prebuild`, en iOS ejecutar `pod install` en `packages/mobile/ios` (o `npx expo run:ios`, que lo hace). En este repo `android/` e `ios/` suelen estar en `.gitignore`; EAS Build ejecuta `prebuild` y el plugin aplica Mesher BLE desde `plugins/mesher-ble-native/`.

El transporte actual en simulador usa **`MockBleMeshTransport`** (fan-out en memoria). Sustituir por **react-native-ble-plx** en un dev build para pruebas físicas.

## Documentación

- [docs/project-structure.md](./docs/project-structure.md) — mapa de carpetas y próximos pasos (dev client + Metro)  
- [mesh.md](./mesh.md) — escenario y diseño conceptual  
- [docs/ios-background-ble.md](./docs/ios-background-ble.md) — limitaciones iOS  
- [docs/ios-local-notifications.md](./docs/ios-local-notifications.md) — notificaciones locales, Personal Team y plugin `withMesherStripPushEntitlement`  
- [docs/ble-mesh-background-qa.md](./docs/ble-mesh-background-qa.md) — QA manual segundo plano (BLE)  
- [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md) — seguridad MVP  
- [docs/crypto-forward-secrecy.md](./docs/crypto-forward-secrecy.md) — evolución cripto  
- [docs/cursor-skills.md](./docs/cursor-skills.md) — skills recomendadas  
