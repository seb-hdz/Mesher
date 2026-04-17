package com.sebhdz.mesher

import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Collections
import java.util.UUID

private val MESHER_SERVICE_UUID: UUID = UUID.fromString("a0b10001-4d65-7368-6572-000000000001")
private val MESHER_CHUNK_UUID: UUID = UUID.fromString("a0b10002-4d65-7368-6572-000000000001")
private val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

class MesherBleModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MesherBleNative"

  private var gattServer: BluetoothGattServer? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  private var meshCharacteristic: BluetoothGattCharacteristic? = null
  private val notifyTargets = Collections.synchronizedSet(mutableSetOf<android.bluetooth.BluetoothDevice>())
  private var pendingStartPromise: Promise? = null
  private var pendingPkPrefix: ByteArray? = null

  private val bluetoothManager: BluetoothManager
    get() = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager

  /** Same event name / payload shape as iOS `MesherNativeLog`. */
  private fun emitNativeLog(level: String, message: String) {
    val line = "[MesherBleNative] $message"
    Log.d("MesherBle", line)
    try {
      if (!reactApplicationContext.hasActiveReactInstance()) return
      val map = Arguments.createMap()
      map.putString("level", level)
      map.putString("message", line)
      sendEvent("MesherNativeLog", map)
    } catch (_: Exception) {
    }
  }

  private val advertiseCallback =
    object : AdvertiseCallback() {
      override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {}

      override fun onStartFailure(errorCode: Int) {
        val label = advertiseFailureLabel(errorCode)
        emitNativeLog("error", "Advertising onStartFailure code=$errorCode ($label)")
        pendingStartPromise?.reject("E_ADV", "Advertising failed: $errorCode ($label)")
        pendingStartPromise = null
      }
    }

  private val gattServerCallback =
    object : BluetoothGattServerCallback() {
      override fun onConnectionStateChange(device: android.bluetooth.BluetoothDevice, status: Int, newState: Int) {
        if (newState != BluetoothProfile.STATE_CONNECTED) {
          notifyTargets.remove(device)
        }
      }

      override fun onServiceAdded(status: Int, service: BluetoothGattService?) {
        val p = pendingStartPromise
        if (p == null) return
        if (status != BluetoothGatt.GATT_SUCCESS) {
          emitNativeLog("error", "onServiceAdded failed status=$status")
          p.reject("E_GATT", "addService failed: $status")
          pendingStartPromise = null
          return
        }
        try {
          startAdvertisingAfterServiceReady(p)
        } catch (e: Exception) {
          emitNativeLog("error", "startAdvertisingAfterServiceReady: ${e.message}")
          p.reject("E_BLE", e.message, e)
          pendingStartPromise = null
        }
      }

      override fun onCharacteristicWriteRequest(
        device: android.bluetooth.BluetoothDevice,
        requestId: Int,
        characteristic: BluetoothGattCharacteristic,
        preparedWrite: Boolean,
        responseNeeded: Boolean,
        offset: Int,
        value: ByteArray?,
      ) {
        if (characteristic.uuid == MESHER_CHUNK_UUID && value != null && offset == 0) {
          val map = Arguments.createMap()
          map.putString("b64", Base64.encodeToString(value, Base64.NO_WRAP))
          sendEvent("MesherBleChunkIn", map)
        }
        if (responseNeeded) {
          gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
        }
      }

      override fun onDescriptorWriteRequest(
        device: android.bluetooth.BluetoothDevice,
        requestId: Int,
        descriptor: BluetoothGattDescriptor,
        preparedWrite: Boolean,
        responseNeeded: Boolean,
        offset: Int,
        value: ByteArray?,
      ) {
        if (descriptor.uuid == CCCD_UUID && value != null && value.size >= 2) {
          val notificationsEnabled =
            (value[0].toInt() and 0xFF) == 0x01 || (value[1].toInt() and 0xFF) == 0x01
          if (notificationsEnabled) {
            notifyTargets.add(device)
          } else {
            notifyTargets.remove(device)
          }
        }
        if (responseNeeded) {
          gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
        }
      }
    }

  private fun startAdvertisingAfterServiceReady(promise: Promise) {
    val adapter = bluetoothManager.adapter ?: run {
      promise.reject("E_BLE", "No Bluetooth adapter")
      pendingStartPromise = null
      return
    }
    if (!adapter.isEnabled) {
      promise.reject("E_BLE", "Bluetooth off")
      pendingStartPromise = null
      return
    }
    advertiser = adapter.bluetoothLeAdvertiser
    if (advertiser == null) {
      promise.reject("E_BLE", "No advertiser")
      pendingStartPromise = null
      return
    }

    val pk = pendingPkPrefix ?: ByteArray(0)
    val settings =
      AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
        .setConnectable(true)
        .build()

    // Legacy ADV / scan response are each capped at 31 bytes. A 128-bit UUID in the primary block
    // plus the same UUID in service data exceeds that limit (AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE).
    // iOS carries the 8-byte prefix in the local name; here we keep service UUID in the main ADU
    // and put service data only in the scan response so ble-plx still merges into `serviceData`.
    val data =
      AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .addServiceUuid(ParcelUuid(MESHER_SERVICE_UUID))
        .build()

    val scanResponseBuilder = AdvertiseData.Builder().setIncludeDeviceName(false)
    if (pk.size == 8) {
      scanResponseBuilder.addServiceData(ParcelUuid(MESHER_SERVICE_UUID), pk)
    }
    val scanResponse = scanResponseBuilder.build()

    advertiser?.startAdvertising(settings, data, scanResponse, advertiseCallback)
    emitNativeLog("info", "startAdvertising invoked pkBytes=${pk.size}")
    promise.resolve(true)
    pendingStartPromise = null
  }

  @ReactMethod
  fun startPeripheral(peerPkPrefixHex: String, promise: Promise) {
    try {
      emitNativeLog("info", "startPeripheral hexLen=${peerPkPrefixHex.length}")
      pendingPkPrefix = hexToBytesInternal(peerPkPrefixHex)
      val adapter = bluetoothManager.adapter ?: run {
        emitNativeLog("error", "reject No Bluetooth adapter")
        promise.reject("E_BLE", "No Bluetooth adapter")
        return
      }
      if (!adapter.isEnabled) {
        emitNativeLog("error", "reject Bluetooth off")
        promise.reject("E_BLE", "Bluetooth off")
        return
      }

      stopPeripheralInternal()

      val svc = BluetoothGattService(MESHER_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
      val char =
        BluetoothGattCharacteristic(
          MESHER_CHUNK_UUID,
          BluetoothGattCharacteristic.PROPERTY_WRITE or
            BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE or
            BluetoothGattCharacteristic.PROPERTY_NOTIFY,
          BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE,
        )
      val cccd =
        BluetoothGattDescriptor(
          CCCD_UUID,
          BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE,
        )
      char.addDescriptor(cccd)
      svc.addCharacteristic(char)
      meshCharacteristic = char

      pendingStartPromise = promise
      gattServer = bluetoothManager.openGattServer(reactApplicationContext, gattServerCallback)
      val ok = gattServer?.addService(svc) == true
      if (!ok) {
        emitNativeLog("error", "reject addService returned false")
        pendingStartPromise?.reject("E_GATT", "addService returned false")
        pendingStartPromise = null
      }
    } catch (e: Exception) {
      emitNativeLog("error", "startPeripheral exception: ${e.message}")
      promise.reject("E_BLE", e.message, e)
      pendingStartPromise = null
    }
  }

  @ReactMethod
  fun notifySubscribers(base64Chunk: String, promise: Promise) {
    try {
      val raw = Base64.decode(base64Chunk, Base64.NO_WRAP)
      val char = meshCharacteristic ?: run {
        promise.reject("E_BLE", "No characteristic")
        return
      }
      val server = gattServer ?: run {
        promise.reject("E_BLE", "No server")
        return
      }
      char.value = raw
      var n = 0
      for (device in notifyTargets.toList()) {
        try {
          if (server.notifyCharacteristicChanged(device, char, false)) {
            n++
          }
        } catch (_: Exception) {
        }
      }
      promise.resolve(n)
    } catch (e: Exception) {
      promise.reject("E_BLE", e.message, e)
    }
  }

  @ReactMethod
  fun addListener(_eventName: String) {}

  @ReactMethod
  fun removeListeners(_count: Int) {}

  @ReactMethod
  fun stopPeripheral(promise: Promise) {
    try {
      stopPeripheralInternal()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_BLE", e.message, e)
    }
  }

  /** Foreground service (connectedDevice) — keeps process alive for BLE while user opts in. */
  @ReactMethod
  fun startBackgroundRelay(promise: Promise) {
    try {
      MeshRelayForegroundService.start(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_FGS", e.message, e)
    }
  }

  @ReactMethod
  fun stopBackgroundRelay(promise: Promise) {
    try {
      MeshRelayForegroundService.stop(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_FGS", e.message, e)
    }
  }

  private fun stopPeripheralInternal() {
    pendingStartPromise = null
    try {
      advertiser?.stopAdvertising(advertiseCallback)
    } catch (_: Exception) {
    }
    advertiser = null
    notifyTargets.clear()
    try {
      gattServer?.close()
    } catch (_: Exception) {
    }
    gattServer = null
    meshCharacteristic = null
  }

  private fun sendEvent(name: String, params: com.facebook.react.bridge.WritableMap?) {
    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, params)
  }

  /** Maps [AdvertiseCallback.onStartFailure] codes for logs routed to Metro via `MesherNativeLog`. */
  private fun advertiseFailureLabel(code: Int): String =
    when (code) {
      AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "DATA_TOO_LARGE"
      AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "TOO_MANY_ADVERTISERS"
      AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED -> "ALREADY_STARTED"
      AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "INTERNAL_ERROR"
      AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "FEATURE_UNSUPPORTED"
      else -> "UNKNOWN"
    }

  private fun hexToBytesInternal(hex: String): ByteArray {
    val s = hex.replace(" ", "").lowercase()
    require(s.length % 2 == 0) { "bad hex length" }
    val out = ByteArray(s.length / 2)
    for (i in out.indices) {
      val hi = Character.digit(s[i * 2], 16)
      val lo = Character.digit(s[i * 2 + 1], 16)
      require(hi >= 0 && lo >= 0) { "bad hex" }
      out[i] = ((hi shl 4) or lo).toByte()
    }
    return out
  }
}
