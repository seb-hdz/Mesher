import Foundation

/// Shared App Group storage for Siri contacts mirror, pending send actions, and scheduled jobs.
/// Falls back to the app Documents directory when the App Group container is unavailable
/// (e.g. Personal Team without the capability provisioned yet).
enum MesherSiriStorage {
  static let appGroupId = "group.com.sebhdz.mesher"

  private static let contactsFile = "contacts.json"
  private static let pendingFile = "pending_actions.json"
  private static let scheduledFile = "scheduled_jobs.json"

  struct Contact: Codable, Equatable {
    let id: String
    let displayName: String
  }

  struct PendingAction: Codable, Equatable {
    let id: String
    let peerId: String
    let body: String
    let createdAt: Double
  }

  struct ScheduledJob: Codable, Equatable {
    let id: String
    let peerId: String
    let body: String
    let fireAt: Double
    let createdAt: Double
  }

  private static var containerURL: URL {
    if let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) {
      return url
    }
    return FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("mesher-siri", isDirectory: true)
  }

  private static func ensureContainer() throws {
    let url = containerURL
    if !FileManager.default.fileExists(atPath: url.path) {
      try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    }
  }

  private static func fileURL(_ name: String) -> URL {
    containerURL.appendingPathComponent(name)
  }

  private static func readJSON<T: Decodable>(_ name: String, as type: T.Type) -> T? {
    let url = fileURL(name)
    guard FileManager.default.fileExists(atPath: url.path),
          let data = try? Data(contentsOf: url)
    else {
      return nil
    }
    return try? JSONDecoder().decode(T.self, from: data)
  }

  private static func writeJSON<T: Encodable>(_ value: T, to name: String) throws {
    try ensureContainer()
    let data = try JSONEncoder().encode(value)
    try data.write(to: fileURL(name), options: [.atomic])
  }

  // MARK: - Contacts

  static func loadContacts() -> [Contact] {
    readJSON(contactsFile, as: [Contact].self) ?? []
  }

  static func saveContacts(_ contacts: [Contact]) throws {
    try writeJSON(contacts, to: contactsFile)
  }

  // MARK: - Pending actions

  static func loadPendingActions() -> [PendingAction] {
    readJSON(pendingFile, as: [PendingAction].self) ?? []
  }

  static func savePendingActions(_ actions: [PendingAction]) throws {
    try writeJSON(actions, to: pendingFile)
  }

  static func enqueuePending(peerId: String, body: String) throws -> PendingAction {
    var actions = loadPendingActions()
    let action = PendingAction(
      id: UUID().uuidString,
      peerId: peerId,
      body: body,
      createdAt: Date().timeIntervalSince1970 * 1000
    )
    actions.append(action)
    try savePendingActions(actions)
    return action
  }

  static func clearPending(ids: [String]) throws {
    let idSet = Set(ids)
    let remaining = loadPendingActions().filter { !idSet.contains($0.id) }
    try savePendingActions(remaining)
  }

  // MARK: - Scheduled jobs

  static func loadScheduledJobs() -> [ScheduledJob] {
    readJSON(scheduledFile, as: [ScheduledJob].self) ?? []
  }

  static func saveScheduledJobs(_ jobs: [ScheduledJob]) throws {
    try writeJSON(jobs, to: scheduledFile)
  }

  static func enqueueScheduled(peerId: String, body: String, fireAt: Date) throws -> ScheduledJob {
    var jobs = loadScheduledJobs()
    let job = ScheduledJob(
      id: UUID().uuidString,
      peerId: peerId,
      body: body,
      fireAt: fireAt.timeIntervalSince1970 * 1000,
      createdAt: Date().timeIntervalSince1970 * 1000
    )
    jobs.append(job)
    try saveScheduledJobs(jobs)
    return job
  }

  static func clearScheduled(id: String) throws {
    let remaining = loadScheduledJobs().filter { $0.id != id }
    try saveScheduledJobs(remaining)
  }

  static func dueScheduledJobs(now: Date = Date()) -> [ScheduledJob] {
    let nowMs = now.timeIntervalSince1970 * 1000
    return loadScheduledJobs().filter { $0.fireAt <= nowMs }
  }
}
