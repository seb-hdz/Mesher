# Depuración de integraciones nativas en Expo: logs vía eventos de device

## Principio

Para depurar código **Swift/Kotlin** en un **development build** de Expo/React Native, un patrón útil es **reenviar trazas nativas a la misma consola que Metro** (donde ya ves `console.log` de TypeScript). Así correlacionas fallos del bridge (promesas, APIs del SO, orden de callbacks) con logs JS (`[mesher:init]`, `[mesher:ble]`, etc.) sin cambiar de ventana a cada paso.

**Idea central:**

1. **Nativo** publica un **evento de device** con nombre estable y un **payload solo con tipos que el bridge serializa bien** (strings, números, booleans, estructuras planas).
2. **JavaScript** instala **una suscripción global una sola vez al cargar el bundle** — idealmente en el punto de entrada (`index.ts`), **antes** de `registerRootComponent` / montar `App` — y copia el contenido a `console.log` / `warn` / `error` según un campo de severidad o convención de prefijos.

No sustituye Xcode ni `adb logcat`; los combina: el nativo puede seguir usando `print` / `Log` para herramientas del SO, y el evento para **visibilidad en el flujo de depuración JS**.

## Requisitos técnicos (resumen)

| Plataforma | Emisión típica |
|------------|----------------|
| **iOS** | Subclase de `RCTEventEmitter`: declarar el nombre del evento en `supportedEvents()`, y `sendEvent(withName:body:)` en el **main queue** si aplica. |
| **Android** | `DeviceEventManagerModule.RCTDeviceEventEmitter.emit(...)` (o helper equivalente en el módulo). Para evitar warnings de `NativeEventEmitter`, el módulo suele exponer `@ReactMethod addListener` / `removeListeners` aunque estén vacíos. |

**Buenas prácticas**

- Un **único nombre de evento** dedicado a diagnóstico (p. ej. `…NativeLog`) evita mezclar tráfico con eventos de producto.
- Payload **pequeño y textual**; evita objetos opacos o binarios enormes.
- En Android, comprobar instancia de React activa antes de emitir si hace falta (p. ej. `hasActiveReactInstance()`), y no asumir que el emit siempre llega antes de que el listener esté registrado — por eso el listener en **entrada** lo antes posible.

## Expo / rebuild

- Solo tiene sentido en un binario que **incluya el módulo nativo** (dev client, EAS build con el plugin, etc.), no en un cliente sin ese código.
- Cualquier cambio en Swift/Kotlin del plugin exige **rebuild** del nativo según vuestro flujo (`expo prebuild`, Xcode, Gradle, EAS).

## Límites

- Trazas de **alto nivel**; no reemplaza Instruments, systrace, HCI snoop, etc.
- Si el bridge no está listo, algunos emits pueden perderse en Android; el log del SO sigue siendo la red de seguridad.

---

## Referencia en Mesher: `MesherNativeLog`

En este repo, el patrón anterior está aplicado al plugin BLE como ejemplo concreto:

| Pieza | Ubicación |
|-------|-----------|
| Evento | `MesherNativeLog` — cuerpo `{ level, message }` con `level` en `info` / `warn` / `error`. |
| Suscripción al arranque | [packages/mobile/index.ts](../packages/mobile/index.ts) — `installNativeMesherLogBridge()`. |
| Bridge JS | [packages/mobile/src/logging/installNativeMesherLogBridge.ts](../packages/mobile/src/logging/installNativeMesherLogBridge.ts). |
| iOS | [plugins/mesher-ble-native/ios/MesherBleNative.swift](../packages/mobile/plugins/mesher-ble-native/ios/MesherBleNative.swift) — `emitNativeLog` + `supportedEvents`. |
| Android | [plugins/mesher-ble-native/android/MesherBleModule.kt](../packages/mobile/plugins/mesher-ble-native/android/MesherBleModule.kt) — `emitNativeLog` + `sendEvent`. |

Los mensajes suelen llevar prefijo `[MesherBleNative]` para filtrar en Metro.

**Regla de Cursor** asociada: [.cursor/rules/expo-native-debug-logging.mdc](../.cursor/rules/expo-native-debug-logging.mdc).

## Otras referencias

- Integración nativa reproducible (plugins): [.cursor/rules/expo-native-integration.mdc](../.cursor/rules/expo-native-integration.mdc)
- BLE iOS / segundo plano: [ios-background-ble.md](./ios-background-ble.md)
