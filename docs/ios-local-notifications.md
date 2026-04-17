# Solución: Notificaciones Locales en iOS (Personal Teams)

Las cuentas de desarrollador gratuitas (**Personal Teams**) no admiten el servicio de notificaciones remotas (Push Notifications) de Apple (APNs): eso es **otro producto** (mensajes enviados por un servidor a través de Apple). Las **notificaciones locales** programadas en el dispositivo **sí** son compatibles con Personal Team y no requieren APNs ni servidor.

La alternativa oficial para alertas sin depender de ese push remoto es el uso de **Notificaciones Locales** (`UserNotifications`).

## 1. Conceptos Clave

- **Sin Servidor**: Se programan y ejecutan íntegramente dentro del dispositivo.
- **Sin Costo**: No requieren membresía de $99 USD/año para el caso “solo locales”.
- **Framework**: Se utiliza `UserNotifications`.

## 2. Implementación en Swift

### Paso A: Solicitar Autorización

Debe ejecutarse (usualmente en el `onAppear` o `AppDelegate`) para que el usuario permita alertas.

```swift
import UserNotifications

func solicitarPermisos() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { otorgado, error in
        if otorgado {
            print("Permisos concedidos por el usuario.")
        } else if let error = error {
            print("Error al solicitar permisos: \(error.localizedDescription)")
        }
    }
}
```

### Paso B: Programar la Notificación

Define el contenido y el disparador (trigger).

```swift
func programarAlertaLocal() {
    let contenido = UNMutableNotificationContent()
    contenido.title = "Recordatorio Local"
    contenido.body = "Esta notificación funciona con una cuenta gratuita."
    contenido.sound = .default

    // Disparador: Se activa en 10 segundos
    let disparador = UNTimeIntervalNotificationTrigger(timeInterval: 10, repeats: false)

    // Solicitud con ID único
    let request = UNNotificationRequest(
        identifier: UUID().uuidString,
        content: contenido,
        trigger: disparador
    )

    // Añadir a la cola del sistema
    UNUserNotificationCenter.current().add(request)
}
```

## 3. Tipos de Disparadores (Triggers)

- Time Interval: Ejecuta la notificación tras X segundos.
- Calendar: Ejecuta la notificación en una fecha/hora específica (ej. alarmas diarias).
- Location: Ejecuta la notificación cuando el usuario entra o sale de una zona (requiere CoreLocation).

## 4. Limitación de primer plano

Por defecto, iOS no muestra el banner si la app está abierta. Para forzarlo, implementa el delegado en tu AppDelegate:

```swift
extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Muestra el banner incluso con la app abierta
        completionHandler([.banner, .sound])
    }
}
```

## 5. En Mesher (Expo, solo locales)

Mesher **no** usa notificaciones remotas ni APNs para avisar de mensajes mesh: no hay servidor que envíe push a Apple. El aviso cuando la app no está en primer plano es una **notificación local inmediata** vía [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/), que en iOS se apoya en **`UserNotifications`** igual que el código Swift de arriba.

Implementación en el repo:

- Adaptador: [`packages/mobile/src/adapters/notifications.ts`](../packages/mobile/src/adapters/notifications.ts) (`scheduleNotificationAsync` con `trigger: null`, permisos, canal en Android).
- Con la app **activa** (`AppState === "active"`): se muestra un **banner in-app** ([`IncomingMessageBanner.tsx`](../packages/mobile/src/ui/IncomingMessageBanner.tsx)) y **no** se programa la notificación del sistema, para no duplicar la UX.
- Con la app en **background / inactive**: se programa la notificación local del sistema (misma API de Expo).

### Mapeo conceptual Swift ↔ Expo (iOS)

| Idea del MD (Swift) | En Mesher (Expo) |
|---------------------|------------------|
| `requestAuthorization` | `Notifications.getPermissionsAsync` / `Notifications.requestPermissionsAsync` (tras crear canal en Android; en iOS solicita alertas al usuario). |
| `UNNotificationRequest` + `add` | `Notifications.scheduleNotificationAsync` con contenido y `trigger: null` para disparo inmediato. |
| `willPresent` + `completionHandler([.banner, .sound])` | `Notifications.setNotificationHandler` → `shouldShowBanner`, `shouldShowList`, `shouldPlaySound` (comportamiento cuando la notificación **sí** llega al handler en primer plano). |

### Personal Team y `aps-environment`

Con cuenta gratuita de desarrollador (**Personal Team**), las **notificaciones locales** siguen siendo válidas. Lo que **no** admite Personal Team es la capacidad **Push Notifications** de Apple ligada al entitlement **`aps-environment`** (APNs / mensajes remotos desde un servidor).

El plugin oficial de **`expo-notifications`** añade por defecto `aps-environment` al plist de entitlements de iOS (aunque solo uses notificaciones locales), lo que hace fallar el perfil de aprovisionamiento en Xcode con errores del tipo “doesn't include the Push Notifications capability” o “doesn't include the aps-environment entitlement”.

En Mesher, un **config plugin propio** **elimina** ese entitlement tras la pasada de `expo-notifications` en la cadena de mods (en `app.json` va **antes** en la lista que `expo-notifications`, para que Expo ejecute primero la lógica que añade el entitlement y el siguiente eslabón lo quite). Así se puede firmar con Personal Team sin renunciar a `expo-notifications` para locales:

- Plugin: [`packages/mobile/plugins/withMesherStripPushEntitlement.js`](../packages/mobile/plugins/withMesherStripPushEntitlement.js)
- Registrado en [`packages/mobile/app.json`](../packages/mobile/app.json) **antes** de `"expo-notifications"` (orden del pipeline de mods de Expo: así expo añade el entitlement y el siguiente paso de la cadena lo elimina).

**Después de añadir o cambiar este plugin**, regenera el proyecto nativo de iOS (por ejemplo `npx expo prebuild --clean` en `packages/mobile`, o el flujo equivalente en EAS) para que el `.entitlements` generado ya no contenga `aps-environment`. Si abriste `ios/` en Xcode antes, quita manualmente la capability **Push Notifications** si siguiera apareciendo en una copia antigua del proyecto.

## 6. Android (Mesher)

En Android las notificaciones locales pasan por **`NotificationManager`** y un **canal** obligatorio desde Android 8+.

En Mesher:

- **Canal de mensajes**: id `mesher_messages`, nombre “Mesher messages”, importancia **HIGH** (avisos de mensaje entrante), creado en el mismo adaptador [`notifications.ts`](../packages/mobile/src/adapters/notifications.ts).
- **Permiso**: `POST_NOTIFICATIONS` (Android 13+) declarado en [`packages/mobile/app.json`](../packages/mobile/app.json) y solicitado en runtime vía Expo.
- **No confundir** con el **foreground service** del relay BLE ([`MeshRelayForegroundService.kt`](../packages/mobile/plugins/mesher-ble-native/android/MeshRelayForegroundService.kt)): ese canal es **LOW** y solo mantiene el proceso elegible para Bluetooth; el de mensajes es independiente y es el que usa el contenido del preview.

## 7. Primer plano y `setNotificationHandler` (trade-off)

Hoy el handler devuelve `shouldShowBanner: false` para notificaciones que **lleguen al handler con la app en primer plano**. Eso evita un banner del sistema encima del **banner in-app** ya previsto cuando `AppState` es `active` (caso normal: no se programa notificación local en ese estado).

Si en el futuro se activara `shouldShowBanner: true` solo en iOS para imitar al pie de la letra el snippet `willPresent` del §4, un mensaje que disparara notificación justo al volver a `active` podría **duplicarse** (sistema + in-app). Por eso el comportamiento actual prioriza una sola superficie de UI en primer plano.
