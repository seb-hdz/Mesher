import AppIntents
import Foundation

@available(iOS 16.0, *)
struct MesherContactEntity: AppEntity {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Mesher Contact")
  static var defaultQuery = MesherContactQuery()

  var id: String
  var displayName: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(displayName)")
  }
}

@available(iOS 16.0, *)
struct MesherContactQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [MesherContactEntity] {
    let idSet = Set(identifiers)
    return MesherSiriStorage.loadContacts()
      .filter { idSet.contains($0.id) }
      .map { MesherContactEntity(id: $0.id, displayName: $0.displayName) }
  }

  func suggestedEntities() async throws -> [MesherContactEntity] {
    MesherSiriStorage.loadContacts().map {
      MesherContactEntity(id: $0.id, displayName: $0.displayName)
    }
  }
}

@available(iOS 16.0, *)
extension MesherContactQuery: EntityStringQuery {
  func entities(matching string: String) async throws -> [MesherContactEntity] {
    let needle = string.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard !needle.isEmpty else {
      return try await suggestedEntities()
    }
    return MesherSiriStorage.loadContacts()
      .filter { $0.displayName.lowercased().contains(needle) }
      .map { MesherContactEntity(id: $0.id, displayName: $0.displayName) }
  }
}
