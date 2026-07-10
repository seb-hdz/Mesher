import Foundation
import React

@objc(MesherSiriBridge)
class MesherSiriBridge: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(updateContacts:resolver:rejecter:)
  func updateContacts(
    _ contacts: NSArray,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      var mapped: [MesherSiriStorage.Contact] = []
      for item in contacts {
        guard let dict = item as? [String: Any],
              let id = dict["id"] as? String,
              let displayName = dict["displayName"] as? String
        else {
          continue
        }
        mapped.append(MesherSiriStorage.Contact(id: id, displayName: displayName))
      }
      try MesherSiriStorage.saveContacts(mapped)
      resolve(true)
    } catch {
      reject("MESHER_SIRI_UPDATE_CONTACTS", error.localizedDescription, error)
    }
  }

  @objc(getPendingActions:rejecter:)
  func getPendingActions(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let actions = MesherSiriStorage.loadPendingActions().map { action -> [String: Any] in
      [
        "id": action.id,
        "peerId": action.peerId,
        "body": action.body,
        "createdAt": action.createdAt,
      ]
    }
    resolve(actions)
  }

  @objc(clearPendingActions:resolver:rejecter:)
  func clearPendingActions(
    _ ids: NSArray,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      let stringIds = ids.compactMap { $0 as? String }
      try MesherSiriStorage.clearPending(ids: stringIds)
      resolve(true)
    } catch {
      reject("MESHER_SIRI_CLEAR_PENDING", error.localizedDescription, error)
    }
  }

  @objc(getScheduledJobs:rejecter:)
  func getScheduledJobs(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let jobs = MesherSiriStorage.loadScheduledJobs().map { job -> [String: Any] in
      [
        "id": job.id,
        "peerId": job.peerId,
        "body": job.body,
        "fireAt": job.fireAt,
        "createdAt": job.createdAt,
      ]
    }
    resolve(jobs)
  }

  @objc(clearScheduledJob:resolver:rejecter:)
  func clearScheduledJob(
    _ jobId: NSString,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      try MesherSiriStorage.clearScheduled(id: jobId as String)
      resolve(true)
    } catch {
      reject("MESHER_SIRI_CLEAR_SCHEDULED", error.localizedDescription, error)
    }
  }
}
