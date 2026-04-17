# Informe de auditoría Mesher (skills: arquitectura, TS, monorepo, RN, revisión)

Auditoría ejecutada según el plan acordado (sin usar la skill `find-skills`). **Precondiciones:** `pnpm install`, `pnpm run build` y `pnpm --filter @mesher/domain test` en verde (7 tests).

---

## Resumen ejecutivo

El monorepo respeta en lo esencial **hexagonal / clean**: `@mesher/domain` sin React ni Expo; puertos en dominio; casos de uso en `@mesher/application` con `AppDeps`; adaptadores y composición en `packages/mobile`. Los puntos más urgentes son de **correctitud y bordes**: `runGossipRound` no actualiza el estado de los outbound tras enviar (riesgo de **reemisión perpetua** de pendientes), `newMessageId` usa `Date.now()` en lugar del `ClockPort`, y el emparejado por QR hace `JSON.parse` + aserción de tipo sin validación. A nivel UI, el código es MVP claro; hay oportunidades de **reutilizar estilos/componentes** y de **centralizar** el acceso al runtime en la capa de estado. No hay workflows CI en el repo (solo dependencias); `expo-dev-client` está alineado con la documentación.

---

## Hallazgos por severidad

| ID | Sev | Violación / riesgo | Ubicación | Skill que lo enfatiza |
|----|-----|-------------------|-----------|------------------------|
| H1 | **P0** | Tras `runGossipRound`, los registros outbound siguen en `PENDING`; cada ronda de gossip puede **volver a enviar** los mismos paquetes sin criterio de “ya enviado” o error. | `packages/application/src/use-cases/run-gossip-round.ts` + `PersistencePort` | code-review, clean-architecture (`usecase-*`) |
| H2 | **P1** | `newMessageId` usa `Date.now()` en lugar de `deps.clock.nowMs()` — **inconsistencia** con el resto del tiempo inyectado (tests/relojes falsos). | `packages/application/src/use-cases/enqueue-outgoing-message.ts` | clean-architecture (`dep-*`), typescript-advanced-types |
| H3 | **P1** | `pairFromQrJson` / payload QR: `JSON.parse` + cast a `PairQrPayloadV1` sin validar campos — superficie de **datos malformados o hostiles** en el borde. | `packages/mobile/src/mesh/meshRuntime.ts` | code-review, clean-architecture (`adapt-*`) |
| H4 | **P1** | `MockBleMeshTransport.broadcastChunk` invoca handlers **sin await**; errores async en `onChunk` pueden **perderse** (difícil depurar). | `packages/mobile/src/adapters/mock-ble-transport.ts` | systematic-debugging, code-review |
| H5 | **P2** | Contadores globales de `streamId` en módulo (`process-incoming-message.ts`, `run-gossip-round.ts`) — acoplamiento global y peor **aislamiento en tests**. | `packages/application/src/use-cases/*.ts` | clean-architecture (`test-*`, `usecase-*`) |
| H6 | **P2** | `pairWithPeerFromQrPayload`: si `displayName.trim()` es vacío, el `id` deriva de bytes de `boxPublicKey` — dos contactos con nombre vacío pueden **colisionar** en UX si el id se muestra como “identidad humana”. | `packages/application/src/use-cases/pair-with-peer.ts` | architecture-patterns (modelado) |
| H7 | **P2** | `getPeerByBoxPublicKey` carga **toda** la tabla `peers` y compara en JS — escala mal; falta índice/consulta por `box_pk`. | `packages/mobile/src/adapters/sqlite-persistence.ts` | code-review (rendimiento) |
| H8 | **P2** | `PairScreen` usa `getMeshRuntime()` directamente para el QR mientras el resto pasa por `useMeshStore` — **inconsistencia de encapsulación** de la fachada móvil. | `packages/mobile/src/screens/PairScreen.tsx` | react-native-design, monorepo-management (límites de capa UI) |
| H9 | **P2** | `app.json`: permisos Android y entradas iOS **duplicadas**; mantenimiento confuso. | `packages/mobile/app.json` | expo-cicd-workflows (higiene config) |

Ningún uso de `any` detectado bajo `packages/` (búsqueda rápida).

---

## Encapsulación y reutilización (acciones concretas)

1. **Estado outbound tras gossip:** tras broadcast exitoso, llamar a `updateOutboundStatus` (p. ej. `SENT`) o introducir estado intermedio acorde al producto; definir política si falla el transporte.
2. **Tiempo unificado:** `newMessageId` debe usar `deps.clock.nowMs()` (o delegar generación de id en un puerto pequeño si se quiere máxima testabilidad).
3. **Borde QR:** validar JSON con esquema (p. ej. Zod) en mobile o un helper en application que reciba `unknown` y devuelva `PairQrPayloadV1` o error tipado.
4. **Stream IDs:** inyectar un `StreamIdSource` en `AppDeps` o encapsular `nextStreamId` en una clase por runtime para tests deterministas y eliminar duplicación de lógica entre handlers entrantes y salientes.
5. **UI:** extraer `ScreenContainer`, estilos de `TextInput`/listas y tokens de color; sustituir `Text` clicable en `ComposeScreen` por `Pressable` + `accessibilityRole`.
6. **PairScreen:** exponer `getPairingPayload` vía `meshStore` o un hook que envuelva el runtime para no importar `getMeshRuntime` en pantallas.
7. **SQLite:** `getPeerByBoxPublicKey` con `WHERE box_pk = ?` y posible índice único si el modelo lo permite.

---

## Puertos vs adaptadores (comprobación rápida)

| Puerto (domain) | Adaptador(es) en mobile |
|-----------------|-------------------------|
| `ClockPort` | `adapters/clock.ts` |
| `SecureRandomPort` | `adapters/random.ts` |
| `CryptoPort` | `adapters/tweetnacl-crypto.ts` |
| `PersistencePort` | `adapters/sqlite-persistence.ts` |
| `TransportPort` | `MockBleMeshTransport` (+ stub BLE real documentado) |
| `NotificationPort` | `adapters/notifications.ts` |

Composición: `initMeshRuntime` construye `AppDeps` y registra `createIncomingHandler` — coherente con hexagonal.

---

## Monorepo y empaquetado

- Dependencias: `domain` sin workspaces hijos; `application` → `domain`; `mobile` → `application` + `domain`. Correcto.
- `exports` en `package.json` de paquetes TS apuntan a `dist/` — evita imports a rutas internas no públicas si se respeta el entrypoint.
- `metro.config.js` incluye `watchFolders` al root — patrón habitual en monorepos Expo.

---

## Tests y debugging

- Dominio: tests en políticas y framing; **cobertura baja** en application (solo smoke de `StreamChunkAssembler`). Ampliar tests de casos de uso con puertos in-memory favorece reglas `test-*` de clean-architecture.
- Si aparecen fallos intermitentes con el mock de transporte, aplicar **systematic-debugging** sobre hipótesis de async no esperado (H4).

---

## Expo / CI

- `expo-dev-client` en `app.json` coincide con [docs/project-structure.md](project-structure.md).
- **No hay** `.github/workflows` propios del repo Mesher; la skill `expo-cicd-workflows` sería relevante si se añade EAS/CI más adelante.

---

## Orden sugerido de refactors

1. **P0:** Política de estado outbound + actualización tras `runGossipRound` (o documentar explícitamente si el flood es intencional solo para mock).
2. **P1:** Reloj en `newMessageId`; validación QR; endurecer mock BLE (await / manejo de errores).
3. **P2:** Stream IDs injectables; consulta SQL por box pk; refactors UI y `PairScreen`; limpieza `app.json`.

---

## Referencia de skills aplicadas (conceptualmente)

`clean-architecture`, `architecture-patterns`, `typescript-advanced-types`, `monorepo-management`, `react-native-design`, `building-native-ui`, `code-review`, `systematic-debugging` (focal), `expo-dev-client`, `expo-cicd-workflows` (ligero).
