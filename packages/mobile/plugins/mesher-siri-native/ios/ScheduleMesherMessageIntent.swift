import AppIntents
import Foundation
import UserNotifications

@available(iOS 16.0, *)
struct ScheduleMesherMessageIntent: AppIntent {
  static var title: LocalizedStringResource = "Schedule Mesher Message"
  static var description = IntentDescription("Schedule a Mesher mesh message for later.")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Recipient")
  var contact: MesherContactEntity

  @Parameter(title: "Message")
  var message: String

  @Parameter(title: "Delay (minutes)")
  var delayMinutes: Int

  static var parameterSummary: some ParameterSummary {
    Summary("Send \(\.$message) to \(\.$contact) on Mesher in \(\.$delayMinutes) minutes")
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      throw $message.needsValueError(IntentDialog(Self.localizedAskMessage))
    }
    guard delayMinutes > 0 else {
      throw $delayMinutes.needsValueError(IntentDialog(Self.localizedAskDelay))
    }

    let fireAt = Date().addingTimeInterval(TimeInterval(delayMinutes * 60))
    let job = try MesherSiriStorage.enqueueScheduled(
      peerId: contact.id,
      body: trimmed,
      fireAt: fireAt
    )

    let center = UNUserNotificationCenter.current()
    let granted = await requestNotificationPermission(center)
    if granted {
      let content = UNMutableNotificationContent()
      content.title = "Mesher"
      content.body = "Time to send your message to \(contact.displayName)."
      content.sound = .default
      // expo-notifications surfaces userInfo as content.data in JS.
      content.userInfo = [
        "type": "scheduled_send",
        "jobId": job.id,
      ]

      let comps = Calendar.current.dateComponents(
        [.year, .month, .day, .hour, .minute, .second],
        from: fireAt
      )
      let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
      let request = UNNotificationRequest(
        identifier: "mesher.scheduled.\(job.id)",
        content: content,
        trigger: trigger
      )
      try await center.add(request)
    }

    return .result(
      dialog: IntentDialog(
        "I'll send this to \(contact.displayName) in \(delayMinutes) minutes when Mesher is ready."
      )
    )
  }

  private func requestNotificationPermission(_ center: UNUserNotificationCenter) async -> Bool {
    do {
      return try await center.requestAuthorization(options: [.alert, .sound, .badge])
    } catch {
      return false
    }
  }

  private static var localizedAskMessage: LocalizedStringResource {
    if Locale.current.language.languageCode?.identifier == "es" {
      return LocalizedStringResource("¿Qué le quiero decir?")
    }
    return LocalizedStringResource("What should I say?")
  }

  private static var localizedAskDelay: LocalizedStringResource {
    if Locale.current.language.languageCode?.identifier == "es" {
      return LocalizedStringResource("¿En cuántos minutos?")
    }
    return LocalizedStringResource("In how many minutes?")
  }
}
