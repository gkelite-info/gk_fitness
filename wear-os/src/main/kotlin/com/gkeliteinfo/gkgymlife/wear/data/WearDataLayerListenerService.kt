package com.gkeliteinfo.gkgymlife.wear.data

import android.content.Intent
import com.gkeliteinfo.gkgymlife.wear.MainActivity
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.google.gson.Gson
import java.nio.charset.StandardCharsets

class WearDataLayerListenerService : WearableListenerService() {

    private val gson = Gson()

    override fun onMessageReceived(messageEvent: MessageEvent) {
        when (messageEvent.path) {
            "/gk/workout-session" -> {
                try {
                    val payloadJson = String(messageEvent.data, StandardCharsets.UTF_8)
                    if (payloadJson.isNotEmpty()) {
                        val payload = gson.fromJson(payloadJson, WatchWorkoutPayload::class.java)
                        WatchSyncRepository.getInstance(applicationContext).updateActivePayload(payload)

                        val intent = Intent(applicationContext, MainActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        }
                        startActivity(intent)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            "/gk/water-sync" -> {
                try {
                    val json = String(messageEvent.data, StandardCharsets.UTF_8)
                    val map = gson.fromJson(json, Map::class.java)
                    val intake = (map["waterIntakeMl"] as? Number)?.toInt() ?: 0
                    val goal = (map["waterGoalMl"] as? Number)?.toInt()
                    WatchHealthManager.getInstance(applicationContext).updateWaterFromPhone(intake, goal)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED) {
                val uri = event.dataItem.uri
                when (uri.path) {
                    "/gk/workout-session" -> {
                        try {
                            val dataMapItem = DataMapItem.fromDataItem(event.dataItem)
                            val payloadJson = dataMapItem.dataMap.getString("payload")
                            if (!payloadJson.isNullOrEmpty()) {
                                val payload = gson.fromJson(payloadJson, WatchWorkoutPayload::class.java)
                                WatchSyncRepository.getInstance(applicationContext).updateActivePayload(payload)

                                // Bring up MainActivity if needed
                                val intent = Intent(applicationContext, MainActivity::class.java).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                                }
                                startActivity(intent)
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    "/gk/water-sync" -> {
                        try {
                            val dataMapItem = DataMapItem.fromDataItem(event.dataItem)
                            val intake = dataMapItem.dataMap.getInt("waterIntakeMl", 0)
                            val goal = dataMapItem.dataMap.getInt("waterGoalMl", 3000)
                            WatchHealthManager.getInstance(applicationContext).updateWaterFromPhone(intake, goal)
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            }
        }
    }
}
