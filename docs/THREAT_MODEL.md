# Modelo de amenazas (MVP) — Mesher

Este documento describe el alcance de seguridad del **MVP** descrito en el plan de implementación. No sustituye una auditoría.

## Objetivos de seguridad

- **Confidencialidad del contenido**: el cuerpo del mensaje va **cifrado** para el destinatario (NaCl `box` con claves de caja intercambiadas por QR).
- **Integridad y autenticidad del origen**: el paquete lleva firma **Ed25519** del remitente sobre un **canonico** de dominio (sin `hopCount`, para permitir retransmisión sin re-firmar).
- **Control de inundación**: TTL, máximo de saltos y deduplicación por `messageId` reducen abuso de la malla.

## Fuera de alcance del MVP

- **Forward secrecy** fuerte y rotación avanzada: ver [crypto-forward-secrecy.md](./crypto-forward-secrecy.md).
- **Anonimato** frente a observadores de la malla: metadatos (tamaños, tiempos, claves públicas de caja en claro para enrutamiento) son visibles para nodos intermedios.
- **Protección contra dispositivo comprometido**: si el atacante controla el terminal, puede leer claves en **SecureStore** y el historial local descifrado.

## Superficie de ataque

| Vector | Notas |
|--------|--------|
| Nodo relay | Ve ciphertext, `senderSignPublicKey`, `senderBoxPublicKey`, `recipientBoxPublicKey`, TTL, `hopCount`, `messageId`. |
| QR falso | Un QR malicioso puede emparejar con identidades atacante; el usuario debe validar **fuera de banda** (nombre, contexto). |
| Replay | `seen_messages` mitiga reenvíos duplicados en un nodo; la malla global puede tener ventanas distintas por implementación. |

## Decisiones criptográficas (MVP)

- **TweetNaCl** en JS para `sign` + `box` (compatible con NaCl). Sustituible por un adaptador nativo **libsodium** sin cambiar el dominio (`CryptoPort`).
- Emparejamiento: payload QR versión 1 con `signPublicKey` y `boxPublicKey` en Base64 (ver `PairQrPayloadV1` en `@mesher/application`).

## Recomendaciones de producto

- Mostrar **huella corta** de claves al emparejar (fase posterior).
- No prometer “modo Signal” ni anonimato total en entornos de malla.
