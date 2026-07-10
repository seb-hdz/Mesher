# Mesher

Monorepo **pnpm** para mensajería **store-and-forward** con **gossip** y capa **hexagonal** (puertos / adaptadores). App móvil: **React Native + Expo** con **development build** (`expo-dev-client`).

## Estructura

| Paquete | Descripción |
|---------|-------------|
| `packages/domain` | Entidades, `NetworkPacket` v1, políticas TTL/dedup/hops, framing MTU, interfaces de puertos |
| `packages/application` | Casos de uso (enqueue, incoming pipeline, gossip round, pair, purge) |
| `packages/mobile` | Adaptadores (SQLite, TweetNaCl, transporte BLE vía `MesherBleNative`), **Zustand**, UI |

Integración nativa Expo: **sin eject**; usar config plugins y `app.json` (ver [`.cursor/rules/expo-native-integration.mdc`](.cursor/rules/expo-native-integration.mdc)). Los plugins [`withMesherBle`](packages/mobile/plugins/withMesherBle.js) y [`withMesherSiri`](packages/mobile/plugins/withMesherSiri.js) copian fuentes desde `plugins/mesher-ble-native/` y `plugins/mesher-siri-native/` en cada `expo prebuild`.

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

## Siri y App Intents (iOS)

Mesher expone acciones por voz con **App Intents** (iOS 16+), implementadas en Swift bajo `packages/mobile/plugins/mesher-siri-native/` y aplicadas con `withMesherSiri`. El runtime mesh (SQLite, cifrado, BLE gossip) sigue en TypeScript; Siri encola en nativo y JS drena la cola cuando el runtime está listo.

| Capacidad | Descripción |
|-----------|-------------|
| **Enviar mensaje por voz** | Siri resuelve un contacto Mesher, pide el texto si falta y encola el envío sin abrir Compose |
| **Mensaje programado** | Programa un envío con notificación local; al disparar, JS ejecuta `sendMessage` |
| **Compose (fallback)** | Deep link `mesher://compose?peerId=…&body=…` o intent que abre la app con destinatario y borrador |
| **Desambiguación** | Varios contactos con el mismo nombre → Siri pregunta cuál |
| **Offline** | Parsing de voz e intents on-device; no requiere internet |

Ejemplos de frases (el **mensaje** lo pide Siri en un segundo turno; no lo incluyas en la misma oración):

- *"Envía un mensaje a Ana en Mesher"*
- *"Manda un mensaje a Ana en Mesher"*
- *"Envía un mensaje en Mesher"* (Siri pide contacto y luego texto)
- *"Programa un mensaje a Ana en Mesher"* (luego minutos y cuerpo)

También están en la app **Atajos** (Shortcuts): *Send Mesher Message*, *Schedule Mesher Message*, *Open Mesher Compose*.

**Probar en dispositivo físico:** hace falta **rebuild** del dev client tras cambios nativos (`npx expo prebuild` + `npx expo run:ios`). Abre Mesher al menos una vez para sincronizar contactos con Siri. Las frases de voz se indexan en background (puede tardar); mientras tanto, ejecuta los atajos manualmente desde Atajos. En dev, mantén **Metro** corriendo si quieres validar el envío completo voz → BLE tras un cold start.

Limitaciones conocidas: si la app estaba terminada, el envío puede esperar hasta el próximo foreground; la entrega BLE depende de vecinos en alcance; Android / Google Assistant no está en scope.

## Documentación

- [docs/project-structure.md](./docs/project-structure.md) — mapa de carpetas y próximos pasos (dev client + Metro)  
- [mesh.md](./mesh.md) — escenario y diseño conceptual  
- [docs/ios-background-ble.md](./docs/ios-background-ble.md) — limitaciones iOS  
- [docs/ios-local-notifications.md](./docs/ios-local-notifications.md) — notificaciones locales, Personal Team y plugin `withMesherStripPushEntitlement`  
- [docs/ble-mesh-background-qa.md](./docs/ble-mesh-background-qa.md) — QA manual segundo plano (BLE)  
- [docs/dev-client-siri-testable-behaviors.md](./docs/dev-client-siri-testable-behaviors.md) — pruebas Siri / App Intents en dev client  
- [docs/prompt_siri-intents-expo.md](./docs/prompt_siri-intents-expo.md) — diseño y fases de la integración Siri  
- [docs/siri-intents-research.md](./docs/siri-intents-research.md) — notas offline y App Intents  
- [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md) — seguridad MVP  
- [docs/crypto-forward-secrecy.md](./docs/crypto-forward-secrecy.md) — evolución cripto  
- [docs/cursor-skills.md](./docs/cursor-skills.md) — skills recomendadas  
