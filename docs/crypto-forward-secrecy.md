# Forward secrecy, rotación de claves y evolución criptográfica (Mesher)

Este documento amplía lo que el **plan de implementación** deja fuera de alcance inmediato: cómo encajar **forward secrecy** y **rotación** en un sistema DTN/malla **sin servidor**, y cómo hacerlo sin romper una arquitectura **hexagonal (puertos / adaptadores)**.

No sustituye un análisis formal de amenazas ni una auditoría; sirve para alinear diseño futuro y estimar esfuerzo.

---

## 1. Qué es la forward secrecy en este contexto

**Forward secrecy** (a veces “perfect forward secrecy” en sentido estricto) significa que la compromisión de **claves materiales actuales** del dispositivo **no permite descifrar mensajes antiguos** que ya circularon o que están almacenados en otros nodos de forma cifrada.

Intuición:

- Si siempre cifras con **la misma clave simétrica larga** derivada una sola vez del QR, quien robe esa clave puede leer **todo el historial** compatible con esa clave.
- Si el material de cifrado **avanza** con el tiempo (cadena de derivaciones, intercambios efímeros, etc.), filtrar solo el estado *actual* deja fuera de alcance (o reduce mucho) el historial.

En malla oportunista, el adversario modelo típico incluye: robo de terminal, malware en el dispositivo, y observadores de tráfico/metadata en la malla (no necesariamente descifrado del contenido).

---

## 2. Por qué es difícil sin servidor (y con gossip)

Los protocolos clásicos tipo **Signal** asumen conectividad razonable con un servidor que ayuda a **pre-keys**, reordenación lógica y recuperación. En Mesher:

- Los mensajes pueden **llegar fuera de orden**, **duplicarse** (gossip + retransmisiones) y **tardar** arbitrariamente.
- Cualquier esquema con **contadores o cadenas de derivación** debe definir explícitamente: qué pasa con gaps, replays dentro de ventana, y resincronización tras crash o restauración de backup.

Por tanto, la complejidad no es tanto “React vs nativo”, sino **semántica del protocolo** + **DTN**.

---

## 3. Encaje con arquitectura limpia / puertos y adaptadores

La arquitectura propuesta **no se rompe** si la criptografía con estado vive detrás de un puerto bien diseñado.

### 3.1 Rol del `CryptoPort` en el MVP (referencia)

En el MVP suele bastar algo del estilo:

- `seal` / `open` (cifrado autenticado hacia una clave pública conocida o material derivado del QR).
- `sign` / `verify` a nivel de paquete o identidad.

### 3.2 Evolución del contrato (fases posteriores)

Para forward secrecy realista, el puerto tiende a hacerse **orientado a sesión** y **con estado**:

- Entrada/salida por par lógico (`peerId` / fingerprint acordado en QR).
- Cada mensaje cifrado lleva una **cabecera criptográfica** (número de mensaje, época, DH efímero, nonce, etc., según el protocolo elegido).
- Operaciones posibles (ejemplos de firma conceptual, no API final):

  - `encryptOutbound(peerId, plaintext) → { ciphertext, cryptoHeader }`
  - `decryptInbound(peerId, cryptoHeader, ciphertext)`
  - `serializeSessionState(peerId)` / `restoreSessionState(peerId, blob)` para persistencia
  - `notifyDirectContact(peerId)` cuando hay un encuentro BLE “fuerte” que permite rotación o intercambio extra

El **dominio** y los **casos de uso** solo necesitan:

- Incluir `cryptoHeader` en el `NetworkPacket` versionado.
- Reglas de negocio del tipo “no enviar texto claro”, “versionar esquema cripto”, “rechazar header incompatible”.

El **adaptador** (`LibsodiumCryptoAdapter`, módulo nativo, o librería de ratchet) implementa la matemática y el estado.

### 3.3 Persistencia

`PersistencePort` (o un sub-repositorio dedicado) debe almacenar **blobs de estado de sesión por par**, además de claves de largo plazo y contactos. Ese estado es sensible: considerar **Keychain / Keystore** según plataforma, no solo SQLite en claro.

### 3.4 Lo que no debe hacer la UI

Zustand y pantallas no deben contener lógica de ratchet ni claves. Como mucho, reflejan “sesión con B: OK / necesita reemparejamiento” según eventos que vienen de los casos de uso.

---

## 4. Opciones de diseño (de menor a mayor fuerza y complejidad)

### 4.1 Clave estática o derivación única post-QR (MVP típico)

- **Forward secrecy:** prácticamente **no** (o muy débil).
- **Complejidad:** baja.
- **Encaje:** `CryptoPort` mínimo.

### 4.2 Rotación periódica o bajo evento (re-QR o canal directo BLE)

- Cuando A y B están **físicamente en contacto** (nuevo QR, o sesión BLE estable definida en el producto), se negocia **nuevo material** y se **archiva** o invalida el anterior según política.
- **Forward secrecy:** **parcial** (todo lo anterior a la rotación queda protegido contra robos *posteriores* a la rotación, pero no contra compromiso continuo del dispositivo).
- **Complejidad:** media; muy alineado con la narrativa de “nos vemos en la rave”.
- **Encaje:** nuevos casos de uso (`RotateKeysWithPeer`, `ApplyPairingRenewal`) + persistencia de “época” o `keyVersion` en el envelope de red.

### 4.3 Ratchet simétrico (cadena de claves / contadores)

- A partir de un secreto inicial, se deriva una cadena para mensajes sucesivos.
- **Forward secrecy:** buena **si** el protocolo define bien **orden**, **ventanas** y **duplicados**.
- **Complejidad:** media–alta en DTN: hay que especificar comportamiento ante mensajes duplicados de la malla, saltos de contador, y recuperación tras crash.
- **Encaje:** todo el estado en adaptador + persistencia; cabeceras en cada payload.

### 4.4 Doble ratchet (estilo Signal / conversaciones modernas)

- Combina ratchet simétrico con intercambios **Diffie-Hellman efímeros** en el flujo de mensajes.
- **Forward secrecy:** muy fuerte en el modelo clásico.
- **Complejidad:** alta; en malla pura sin servidor aumentan los casos de **reordenación**, **forks**, **múltiples dispositivos por identidad**, y **sincronización de estado**.
- **Encaje:** posible, pero suele evaluarse **reutilizar implementación auditada** (nativo) detrás de `CryptoPort` en lugar de reimplementar.

---

## 5. Recomendación de roadmap (coherente con Mesher)

1. **MVP:** E2E con emparejamiento QR + cifrado autenticado (p. ej. `crypto_box` o equivalente libsodium). Documentar explícitamente **límites** respecto a forward secrecy.
2. **Fase siguiente (alto valor / coste razonable):** **rotación explícita** al reencontrarse (QR o política BLE “directo”) + versión de claves en el protocolo de red.
3. **Fase avanzada:** diseñar o integrar **ratchet** (primero simétrico con DTN bien especificado; doble ratchet solo si hay recursos y biblioteca adecuada).

---

## 6. Checklist antes de implementar un ratchet

- Semántica de **orden** y **duplicados** en gossip.
- Política de **persistencia** del estado (¿qué pasa si el usuario restaura backup antiguo?).
- **Multi-dispositivo** (misma identidad en dos teléfonos): ¿soportado o explícitamente excluido?
- **Metadatos** que siguen siendo visibles en la malla (tamaños, tiempos, frecuencia) y modelo de amenazas para “anonimato” vs “confidencialidad”.
- Tests: vectores conocidos, pruebas de ida y vuelta con mensajes reordenados y repetidos.

---

## 7. Referencias orientativas (lectura)

- Signal Protocol / Double Ratchet (conceptos generales; adaptación DTN no es directa).
- Documentación de **libsodium** (`crypto_box`, `crypto_kx`, APIs de sesión si se usan capas superiores).
- Literatura y RFCs sobre **DTN** y seguridad en redes tolerantes a demoras (para alinear expectativas, no como implementación literal).

---

*Documento vivo: actualizar cuando el `NetworkPacket` y el `CryptoPort` tengan versiones concretas en código.*
