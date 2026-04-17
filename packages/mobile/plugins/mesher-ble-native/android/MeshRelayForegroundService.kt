package com.sebhdz.mesher

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Foreground service (connectedDevice) so the process stays eligible for BLE scan + GATT while the
 * user opts into background relay. Does not implement mesh logic — MesherBleModule / JS handle radio.
 */
class MeshRelayForegroundService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(STOP_FOREGROUND_REMOVE)
      } else {
        @Suppress("DEPRECATION")
        stopForeground(true)
      }
      stopSelf()
      return START_NOT_STICKY
    }
    startAsForeground()
    return START_STICKY
  }

  private fun startAsForeground() {
    createChannel()
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIF_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE,
      )
    } else {
      @Suppress("DEPRECATION")
      startForeground(NOTIF_ID, notification)
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = getSystemService(NotificationManager::class.java)
    val ch = NotificationChannel(
      CHANNEL_ID,
      "Mesher mesh relay",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Keeps Bluetooth mesh active when relay in background is enabled"
      setShowBadge(false)
    }
    mgr.createNotificationChannel(ch)
  }

  private fun buildNotification(): Notification {
    val launchIntent =
      packageManager.getLaunchIntentForPackage(packageName)
        ?: Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(packageName)
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val pending = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Mesher relay")
      .setContentText("Bluetooth mesh relay is active in the background")
      .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
      .setContentIntent(pending)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  companion object {
    const val CHANNEL_ID = "mesher_mesh_relay"
    private const val NOTIF_ID = 71001
    const val ACTION_STOP = "com.sebhdz.mesher.action.STOP_MESH_RELAY"

    fun start(context: Context) {
      val i = Intent(context, MeshRelayForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(i)
      } else {
        context.startService(i)
      }
    }

    fun stop(context: Context) {
      val i = Intent(context, MeshRelayForegroundService::class.java).apply {
        action = ACTION_STOP
      }
      context.startService(i)
    }
  }
}
