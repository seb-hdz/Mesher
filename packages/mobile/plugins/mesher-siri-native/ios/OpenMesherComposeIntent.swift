import AppIntents
import Foundation
import UIKit

/**
 * Opens Mesher compose via the Phase 1 deep link fallback.
 * Used when native enqueue is unavailable; RN Linking navigates to Compose with params.
 *
 * Uses UIApplication.open instead of OpenURLIntent (iOS 18+) so this works on iOS 16+.
 */
@available(iOS 16.0, *)
struct OpenMesherComposeIntent: AppIntent {
  static var title: LocalizedStringResource = "Open Mesher Compose"
  static var openAppWhenRun: Bool = true

  @Parameter(title: "Recipient")
  var contact: MesherContactEntity

  @Parameter(title: "Message", default: "")
  var message: String

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    var components = URLComponents()
    components.scheme = "mesher"
    components.host = "compose"
    components.queryItems = [
      URLQueryItem(name: "peerId", value: contact.id),
      URLQueryItem(name: "body", value: message),
    ]
    guard let url = components.url else {
      throw NSError(
        domain: "MesherSiri",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Invalid compose URL"]
      )
    }

    await UIApplication.shared.open(url)

    let dialog: LocalizedStringResource =
      Locale.current.language.languageCode?.identifier == "es"
        ? LocalizedStringResource("Abriendo Mesher…")
        : LocalizedStringResource("Opening Mesher…")
    return .result(dialog: IntentDialog(dialog))
  }
}
