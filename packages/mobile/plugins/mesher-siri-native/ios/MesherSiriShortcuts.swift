import AppIntents

/// App Shortcut phrases may include at most one parameter (plus `.applicationName`).
/// Only `AppEntity` / `AppEnum` parameters are allowed in phrases — open-ended `String`
/// / `Int` values (message body, delay) are elicited by Siri after invocation.
///
/// Strategy: cover common verbs + optional contact-less phrases so Siri can elicit
/// the recipient. iOS 17+ Semantic Similarity Index also matches near-paraphrases.
/// Cap: 10 phrases per AppShortcut.
@available(iOS 16.0, *)
struct MesherShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: SendMesherMessageIntent(),
      phrases: [
        // English — with contact
        "Send a message to \(\.$contact) on \(.applicationName)",
        "Tell \(\.$contact) on \(.applicationName)",
        "Message \(\.$contact) on \(.applicationName)",
        "Text \(\.$contact) on \(.applicationName)",
        // English — contact elicited by Siri
        "Send a message on \(.applicationName)",
        // Spanish — with contact
        "Envía un mensaje a \(\.$contact) en \(.applicationName)",
        "Manda un mensaje a \(\.$contact) en \(.applicationName)",
        "Dile a \(\.$contact) en \(.applicationName)",
        "Escríbele a \(\.$contact) en \(.applicationName)",
        // Spanish — contact elicited by Siri
        "Envía un mensaje en \(.applicationName)",
      ],
      shortTitle: "Send Mesher Message",
      systemImageName: "bubble.left.and.bubble.right"
    )
    AppShortcut(
      intent: ScheduleMesherMessageIntent(),
      phrases: [
        "Schedule a message to \(\.$contact) on \(.applicationName)",
        "Send a delayed message to \(\.$contact) on \(.applicationName)",
        "Remind me to message \(\.$contact) on \(.applicationName)",
        "Schedule a message on \(.applicationName)",
        "Programa un mensaje a \(\.$contact) en \(.applicationName)",
        "Envía un mensaje diferido a \(\.$contact) en \(.applicationName)",
        "Programa un mensaje en \(.applicationName)",
      ],
      shortTitle: "Schedule Mesher Message",
      systemImageName: "clock.badge"
    )
    AppShortcut(
      intent: OpenMesherComposeIntent(),
      phrases: [
        "Compose a message to \(\.$contact) on \(.applicationName)",
        "Open compose for \(\.$contact) on \(.applicationName)",
        "Write to \(\.$contact) on \(.applicationName)",
        "Compose a message on \(.applicationName)",
        "Escribe un mensaje a \(\.$contact) en \(.applicationName)",
        "Abre redactar para \(\.$contact) en \(.applicationName)",
        "Escribe un mensaje en \(.applicationName)",
      ],
      shortTitle: "Open Mesher Compose",
      systemImageName: "square.and.pencil"
    )
  }
}
