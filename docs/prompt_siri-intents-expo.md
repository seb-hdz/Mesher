# Siri / App Intents for Mesher (Expo)

Handoff prompt for implementing Siri integration in the mobile app. Copy the block below into another Agent session.

```text
Siri / App Intents integration for Mesher (Expo dev client)

Contexto:
Mesher es una app Expo (dev client) con plugins nativos reproducibles. El usuario quiere invocar acciones por voz, p. ej. "Siri, send a message to CONTACT_NAME on Mesher" o mensajes programados "send a message to CONTACT_NAME in 30 minutes saying meet me in 5". La integración Siri es nativa (iOS); el runtime mesh (SQLite, identidad, cifrado, BLE gossip) vive hoy en TypeScript/React Native. No hay módulo oficial de Expo para Siri; el patrón del repo es config plugin + fuentes bajo plugins/ (como BLE).

Flujo actual:
1. @packages/mobile/app.json — expo-dev-client, plugins nativos (withMesherBle, expo-notifications), UIBackgroundModes bluetooth-central/peripheral, bundleIdentifier com.sebhdz.mesher
2. @packages/mobile/plugins/withMesherBle.js — patrón de referencia: copiar fuentes nativas, registrar en Xcode/Gradle vía config plugin
3. @packages/mobile/plugins/mesher-ble-native/ios/MesherBleNative.swift — módulo Swift + RCTEventEmitter; patrón de bridge nativo ↔ JS
4. @packages/mobile/index.ts — entrada del bundle; installNativeMesherLogBridge() temprano
5. @packages/mobile/src/state/meshStore.ts — initMeshRuntime, sendMessage(peerId, body), refreshPeers, peers con displayName
6. @packages/mobile/src/mesh/meshRuntime.ts — singleton MeshRuntime; sendToPeer → enqueueOutgoingMessage + runGossipRound; requiere init previo
7. @packages/mobile/src/adapters/sqlite-persistence.ts — peers (id, display_name, sign_pk, box_pk) en expo-sqlite mesher.db
8. @packages/mobile/src/adapters/notifications.ts — expo-notifications; scheduleNotificationAsync para previews locales (no push remoto)
9. @.cursor/rules/expo-native-integration.mdc — política: cambios nativos reproducibles vía plugin/parche, sin eject ni edits manuales rutinarios en ios/

Problema / Objetivo:
Actual: no hay Siri, App Intents, deep linking ni cola de acciones pendientes desde voz.
Deseado: integración Siri en iOS usando App Intents (iOS 16+, Swift macros), NO INSendMessageIntent clásico (es para Messages de Apple). Frases ejemplo:
- "Send a message to {contact} on Mesher"
- "Tell {contact} on Mesher {message}"
- "Send a message to {contact} in 30 minutes saying {message}"

Arquitectura recomendada (por fases):

Fase 1 — MVP (baja complejidad):
- App Intent recibe contact + message
- Abre la app vía deep link mesher://compose?peerId=...&body=... (añadir expo-linking + scheme en app.json)
- RN lee URL inicial y navega a compose o llama sendMessage tras initMeshRuntime

Fase 2 — Envío por voz sin UI (complejidad media):
- Plugin mesher-siri-native + withMesherSiri.js (espejo de withMesherBle)
- MesherContactEntity (AppEntity) + EntityQuery para disambiguation de contactos en Siri
- Sincronizar peers a almacenamiento nativo (UserDefaults o App Group) cuando cambien en meshStore.refreshPeers — módulo MesherSiri.updateContacts([{id, displayName}])
- App Intent perform() escribe acción pendiente { peerId, body, scheduledAt? } y responde rápido a Siri (< pocos segundos)
- JS drena la cola tras initMeshRuntime / AppState active y llama sendMessage
- Puede requerir foreground breve o confiar en background BLE ya configurado

Fase 3 — Mensajes programados (alta complejidad):
- Intent persiste scheduled send (SQLite vía JS en próximo launch, o JSON en App Group desde nativo)
- Programar notificación local con trigger de fecha + data { type: scheduled_send, id }
- Al responder notificación / foreground, drenar y sendMessage
- Expectativas: no exactitud al segundo en background; BLE puede no estar listo si la app estaba killed; Siri debe comunicar "enviaré cuando Mesher esté activo" si aplica

Estructura de plugin sugerida:
packages/mobile/plugins/mesher-siri-native/ios/
  MesherSiriContacts.swift       — AppEntity + EntityQuery
  SendMesherMessageIntent.swift
  ScheduleMesherMessageIntent.swift
  MesherSiriBridge.m             — RCT: updateContacts, getPendingActions, clearPending
packages/mobile/plugins/withMesherSiri.js

Restricciones técnicas:
- No duplicar lógica mesh/crypto en Swift salvo decisión explícita de send 100% nativo (scope enorme)
- App Intent perform() debe ser rápido: encolar trabajo, no esperar RN cold boot completo
- Contactos en SQLite no son legibles por Siri sin sync a capa nativa
- Identidad en expo-secure-store no es trivial desde intent handler
- Rebuild dev client tras cada cambio nativo (igual que BLE)
- Android / Google Assistant es scope separado (App Actions)

Criterios de aceptación:
- Fase 1: frase Siri o Shortcut abre Mesher con contacto y mensaje prefilled; usuario puede enviar o auto-envío tras init
- Fase 2: "Send {message} to {contact} on Mesher" resuelve contacto por displayName, encola y envía sin pantalla de compose cuando runtime está listo
- Fase 2: peers nuevos/eliminados se reflejan en sugerencias Siri tras sync
- Fase 3: intent con delay persiste envío y dispara notificación; al fire time se ejecuta sendMessage si app/runtime disponible
- Plugin registrado en app.json; prebuild/EAS reproducen ios/ sin edits manuales
- Documentar limitaciones de background/BLE para el usuario final

Notas de implementación:
- Registrar frases con AppShortcutsProvider y parámetros @Parameter(title: "Contact") var contact: MesherContactEntity
- Hook de sync de contactos: tras refreshPeers en meshStore o al guardar peer en sqlite-persistence
- Considerar expo-linking getInitialURL / addEventListener para deep links
- Testing solo en dispositivo físico con dev client, no Expo Go
- SiriKit INSendMessageIntent no aplica a app de mensajería custom

Archivos de referencia:
@packages/mobile/app.json
@packages/mobile/package.json
@packages/mobile/index.ts
@packages/mobile/plugins/withMesherBle.js
@packages/mobile/plugins/mesher-ble-native/ios/MesherBleNative.swift
@packages/mobile/src/state/meshStore.ts
@packages/mobile/src/mesh/meshRuntime.ts
@packages/mobile/src/adapters/sqlite-persistence.ts
@packages/mobile/src/adapters/notifications.ts
@.cursor/rules/expo-native-integration.mdc
```
