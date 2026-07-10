import AppIntents
import Foundation

@available(iOS 16.0, *)
struct SendMesherMessageIntent: AppIntent {
  static var title: LocalizedStringResource = "Send Mesher Message"
  static var description = IntentDescription("Queue a Mesher mesh message to a contact.")
  /// Keep false so Siri can acknowledge quickly; JS drains the queue when the runtime is ready.
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Recipient")
  var contact: MesherContactEntity

  @Parameter(title: "Message")
  var message: String

  static var parameterSummary: some ParameterSummary {
    Summary("Send \(\.$message) to \(\.$contact) on Mesher")
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      throw $message.needsValueError(IntentDialog(Self.localizedAskMessage))
    }

    do {
      _ = try MesherSiriStorage.enqueuePending(peerId: contact.id, body: trimmed)
      return .result(
        dialog: IntentDialog(
          "Message queued for \(contact.displayName). Mesher will send it when ready."
        )
      )
    } catch {
      return .result(
        dialog: IntentDialog(
          "Could not queue the message for \(contact.displayName). Open Mesher and try again."
        )
      )
    }
  }

  private static var localizedAskMessage: LocalizedStringResource {
    if Locale.current.language.languageCode?.identifier == "es" {
      return LocalizedStringResource("¿Qué le quiero decir?")
    }
    return LocalizedStringResource("What should I say?")
  }
}
