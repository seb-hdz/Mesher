## What you can test on dev client (physical iPhone)

| **Feature**                                   | **Notes**                                        |
| --------------------------------------------- | ------------------------------------------------ |
| Siri voice phrases                            | After rebuild + Siri indexing (can take minutes) |
| Contact disambiguation                        | Needs peers synced via updateSiriContacts        |
| Message elicitation (“¿Qué le quiero decir?”) |                                                  |
| perform() → pending queue (native)            | Works even if JS isn’t ready                     |
| Queue drain → sendMessage → BLE               | Needs JS runtime (see below)                     |
| mesher://compose fallback                     |                                                  |
| Scheduled message + local notification        |                                                  |
| App Group storage                             | App Group must be provisioned in Xcode           |

---

## Main dev-client caveat: Metro and the JS drain

Siri’s native side (enqueue) works without Metro.

The send path needs RN:

1. initMeshRuntime()
2. drainSiriQueues() in meshStore

In dev, JS usually loads from Metro. If the app cold-starts after Siri (killed state) and Metro isn’t reachable, drain may not run even though Siri queued the action.

### Practical testing:

- Keep Metro running while testing Siri.
- Or use a release-style dev build with embedded JS for kill/background scenarios.
- Simulator is poor for Siri; use a physical device.

---

## What you cannot easily test on dev client

- **Instant Siri phrase availability** — shortcuts index asynchronously; use the Shortcuts app to run intents manually while phrases propagate.

---

## Recommended test order on dev client

1. Rebuild and install dev client on device.
2. Open Mesher once (init runtime, sync contacts).
3. Shortcuts app → run “Send Mesher Message” manually (bypasses Siri indexing).
4. Then try Siri: “Envía un mensaje a Ana en Mesher” (do **not** put the message body in the same utterance — Siri elicits it next).
5. Also try contact-less: “Envía un mensaje en Mesher” → Siri asks for recipient, then message.
6. Test without message body for elicitation (after naming the contact).
7. Test `mesher://compose?peerId=...&body=...` from Safari or Shortcuts.

> The dev client is the right vehicle for Siri testing. The bundle ID is yours (`com.sebhdz.mesher`); the extra `exp+mesher://` scheme is only for Expo dev deep linking, not a blocker for App Intents. The main gotcha is Metro availability when testing the full voice → send path after a cold start.
