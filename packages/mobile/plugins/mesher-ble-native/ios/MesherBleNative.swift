import CoreBluetooth
import Foundation
import React

private let kRestorePkHexKey = "MesherBleRestorePkHex"
private let kPeripheralRestoreId = "com.sebhdz.mesher.peripheral"
private let kMesherServiceUUID = CBUUID(string: "A0B10001-4D65-7368-6572-000000000001")
private let kMesherChunkUUID = CBUUID(string: "A0B10002-4D65-7368-6572-000000000001")

@objc(MesherBleNative)
class MesherBleNative: RCTEventEmitter, CBPeripheralManagerDelegate {
  private var peripheralManager: CBPeripheralManager?
  private var meshCharacteristic: CBMutableCharacteristic?
  private var meshService: CBMutableService?
  private var subscribedCentrals: [CBCentral] = []

  private var pendingPkData: Data?
  private var pendingStartResolve: RCTPromiseResolveBlock?
  private var pendingStartReject: RCTPromiseRejectBlock?

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["MesherBleChunkIn", "MesherNativeLog"]
  }

  /// Mirrors to Metro via `MesherNativeLog`; also `print` for Xcode.
  private func emitNativeLog(_ level: String, _ message: String) {
    let line = "[MesherBleNative] \(message)"
    print(line)
    let body: [String: Any] = ["level": level, "message": line]
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(withName: "MesherNativeLog", body: body)
    }
  }

  override init() {
    super.init()
  }

  @objc(startPeripheral:resolver:rejecter:)
  func startPeripheral(
    _ hex: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    emitNativeLog("info", "startPeripheral hexLen=\(hex.count)")
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.stopInternal(clearRestoreDefaults: false)
      do {
        self.pendingPkData = try Self.dataFromHex(hex)
      } catch {
        self.emitNativeLog("error", "reject bad hex: \(error.localizedDescription)")
        reject("E_BLE", "bad hex", error)
        return
      }
      UserDefaults.standard.set(hex, forKey: kRestorePkHexKey)
      self.pendingStartResolve = resolve
      self.pendingStartReject = reject
      self.peripheralManager = CBPeripheralManager(
        delegate: self,
        queue: .main,
        options: [
          CBPeripheralManagerOptionShowPowerAlertKey: false,
          CBPeripheralManagerOptionRestoreIdentifierKey: kPeripheralRestoreId
        ]
      )
      self.emitNativeLog("info", "CBPeripheralManager created, waiting for poweredOn / didAdd")
    }
  }

  @objc(stopPeripheral:rejecter:)
  func stopPeripheral(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      self?.stopInternal(clearRestoreDefaults: true)
      resolve(true)
    }
  }

  @objc(notifySubscribers:resolver:rejecter:)
  func notifySubscribers(
    _ b64: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      guard let mgr = self.peripheralManager, let ch = self.meshCharacteristic else {
        reject("E_BLE", "No characteristic", nil)
        return
      }
      guard let data = Data(base64Encoded: b64) else {
        reject("E_BLE", "bad base64", nil)
        return
      }
      ch.value = data
      var n = 0
      for central in self.subscribedCentrals {
        if mgr.updateValue(data, for: ch, onSubscribedCentrals: [central]) {
          n += 1
        }
      }
      resolve(n)
    }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    willRestoreState dict: [String: Any]
  ) {
    peripheral.delegate = self
    peripheralManager = peripheral
    var restoredSubs: [CBCentral] = []
    if let services = dict[CBPeripheralManagerRestoredStateServicesKey] as? [CBMutableService] {
      for service in services where service.uuid == kMesherServiceUUID {
        meshService = service
        if let characteristics = service.characteristics as? [CBMutableCharacteristic] {
          for c in characteristics where c.uuid == kMesherChunkUUID {
            meshCharacteristic = c
            restoredSubs.append(contentsOf: c.subscribedCentrals ?? [])
          }
        }
      }
    }
    var seen = Set<UUID>()
    subscribedCentrals = restoredSubs.filter { seen.insert($0.identifier).inserted }
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      if meshCharacteristic != nil, meshService != nil {
        if resumeAdvertisingIfPossible(peripheral: peripheral) {
          pendingStartResolve?(true)
          clearPendingStart()
        } else {
          emitNativeLog("error", "reject Could not restore advertising (missing pk)")
          pendingStartReject?("E_BLE", "Could not restore advertising (missing pk)", nil)
          clearPendingStart()
        }
        return
      }
      if pendingStartResolve != nil || pendingStartReject != nil {
        addMeshService(peripheral: peripheral)
      }
    case .poweredOff, .unauthorized, .unsupported, .resetting:
      if let reject = pendingStartReject {
        emitNativeLog(
          "error",
          "reject Bluetooth unavailable state=\(String(describing: peripheral.state))",
        )
        reject("E_BLE", "Bluetooth unavailable", nil)
        clearPendingStart()
      }
      if peripheral.state != .poweredOn {
        stopInternal(clearRestoreDefaults: false)
      }
    @unknown default:
      break
    }
  }

  /// iOS does not allow `CBAdvertisementDataServiceDataKey` in peripheral-manager advertising (CBError 1
  /// "One or more parameters were invalid"). Android uses LE service data; here we mirror the 8-byte prefix
  /// in the advertised local name (`m` + 16 hex), parsed on the JS side when service data is absent.
  private static func advertisementDictionary(pkPrefix: Data) -> [String: Any] {
    var adv: [String: Any] = [
      CBAdvertisementDataServiceUUIDsKey: [kMesherServiceUUID],
    ]
    if pkPrefix.count == 8 {
      let hex = pkPrefix.map { String(format: "%02x", $0) }.joined()
      adv[CBAdvertisementDataLocalNameKey] = "m" + hex
    }
    return adv
  }

  /// Returns true if advertising was started (restored GATT path).
  private func resumeAdvertisingIfPossible(peripheral: CBPeripheralManager) -> Bool {
    let pkData: Data?
    if let p = pendingPkData {
      pkData = p
    } else if let hex = UserDefaults.standard.string(forKey: kRestorePkHexKey) {
      pkData = try? Self.dataFromHex(hex)
    } else {
      pkData = nil
    }
    guard let pk = pkData else { return false }
    emitNativeLog("info", "resumeAdvertisingIfPossible pkBytes=\(pk.count)")
    peripheral.startAdvertising(Self.advertisementDictionary(pkPrefix: pk))
    return true
  }

  private func addMeshService(peripheral: CBPeripheralManager) {
    let service = CBMutableService(type: kMesherServiceUUID, primary: true)
    let props: CBCharacteristicProperties = [.write, .writeWithoutResponse, .notify]
    let perms: CBAttributePermissions = [.readable, .writeable]
    let ch = CBMutableCharacteristic(
      type: kMesherChunkUUID,
      properties: props,
      value: nil,
      permissions: perms
    )
    // Do not add CCCD (0x2902) manually: Core Bluetooth supplies it for `.notify` on
    // CBPeripheralManager; an extra CBMutableDescriptor caused didAdd(service) to fail with
    // CBError "One or more parameters were invalid." on recent iOS (observed iOS 18+).
    service.characteristics = [ch]
    meshCharacteristic = ch
    meshService = service
    peripheral.add(service)
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    if let error {
      emitNativeLog("error", "reject didAdd service: \(error.localizedDescription)")
      pendingStartReject?("E_GATT", error.localizedDescription, error)
      clearPendingStart()
      return
    }
    guard let pk = pendingPkData else {
      emitNativeLog("error", "reject missing pk prefix after didAdd")
      pendingStartReject?("E_BLE", "missing pk prefix", nil)
      clearPendingStart()
      return
    }
    emitNativeLog("info", "didAdd ok, startAdvertising pkBytes=\(pk.count)")
    peripheral.startAdvertising(Self.advertisementDictionary(pkPrefix: pk))
    emitNativeLog("info", "resolve startPeripheral (advertising outcome in didStartAdvertising)")
    pendingStartResolve?(true)
    clearPendingStart()
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error {
      emitNativeLog("error", "didStartAdvertising ERROR: \(error.localizedDescription)")
    } else {
      emitNativeLog("info", "didStartAdvertising OK")
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      guard request.characteristic.uuid == kMesherChunkUUID, let value = request.value else {
        peripheral.respond(to: request, withResult: .attributeNotFound)
        continue
      }
      let b64 = value.base64EncodedString()
      sendEvent(withName: "MesherBleChunkIn", body: ["b64": b64])
      peripheral.respond(to: request, withResult: .success)
    }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    central: CBCentral,
    didSubscribeTo characteristic: CBCharacteristic
  ) {
    if !subscribedCentrals.contains(where: { $0.identifier == central.identifier }) {
      subscribedCentrals.append(central)
    }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    central: CBCentral,
    didUnsubscribeFrom characteristic: CBCharacteristic
  ) {
    subscribedCentrals.removeAll { $0.identifier == central.identifier }
  }

  private func clearPendingStart() {
    pendingStartResolve = nil
    pendingStartReject = nil
    pendingPkData = nil
  }

  private func stopInternal(clearRestoreDefaults: Bool) {
    clearPendingStart()
    peripheralManager?.stopAdvertising()
    if let mgr = peripheralManager, let svc = meshService {
      mgr.remove(svc)
    }
    meshService = nil
    meshCharacteristic = nil
    subscribedCentrals.removeAll()
    peripheralManager?.delegate = nil
    peripheralManager = nil
    if clearRestoreDefaults {
      UserDefaults.standard.removeObject(forKey: kRestorePkHexKey)
    }
  }

  private static func dataFromHex(_ hex: String) throws -> Data {
    var s = hex.replacingOccurrences(of: " ", with: "").lowercased()
    guard s.count % 2 == 0 else {
      throw NSError(domain: "MesherBle", code: 1, userInfo: [NSLocalizedDescriptionKey: "bad hex length"])
    }
    var data = Data()
    data.reserveCapacity(s.count / 2)
    var i = s.startIndex
    while i < s.endIndex {
      let j = s.index(i, offsetBy: 2)
      let byteString = String(s[i ..< j])
      guard let b = UInt8(byteString, radix: 16) else {
        throw NSError(domain: "MesherBle", code: 2, userInfo: [NSLocalizedDescriptionKey: "bad hex digit"])
      }
      data.append(b)
      i = j
    }
    return data
  }
}
