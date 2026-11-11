package com.gkeliteinfo.gkgymlife.wear.data

import android.content.Intent
import android.util.Log
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
        val path = messageEvent.path
        Log.d("GKWearListener", "onMessageReceived path=$path")

        when (path) {
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
                    Log.e("GKWearListener", "workout-session error: ${e.message}", e)
                }
            }
            "/gk/water-sync" -> {
                try {
                    val json = String(messageEvent.data, StandardCharsets.UTF_8)
                    Log.d("GKWearListener", "Received /gk/water-sync message: $json")
                    val map = gson.fromJson(json, Map::class.java)
                    val intake = (map["waterIntakeMl"] as? Number)?.toInt() ?: 0
                    val goal = (map["waterGoalMl"] as? Number)?.toInt()
                    WatchHealthManager.getInstance(applicationContext).updateWaterFromPhone(intake, goal)
                } catch (e: Exception) {
                    Log.e("GKWearListener", "water-sync error: ${e.message}", e)
                }
            }
            "/gk/auth-session" -> {
                try {
                    val json = String(messageEvent.data, StandardCharsets.UTF_8)
                    Log.d("GKWearListener", "Received /gk/auth-session message: $json")
                    val session = gson.fromJson(json, WatchAuthSession::class.java)
                    WatchSyncRepository.getInstance(applicationContext).updateAuthSession(session)
                } catch (e: Exception) {
                    Log.e("GKWearListener", "auth-session error: ${e.message}", e)
                }
            }
        }
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED) {
                val uri = event.dataItem.uri
                Log.d("GKWearListener", "onDataChanged uri=${uri.path}")

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
                            Log.e("GKWearListener", "DataChanged workout error: ${e.message}", e)
                        }
                    }
                    "/gk/water-sync" -> {
                        try {
                            val dataMapItem = DataMapItem.fromDataItem(event.dataItem)
                            val intake = dataMapItem.dataMap.getInt("waterIntakeMl", 0)
                            val goal = dataMapItem.dataMap.getInt("waterGoalMl", 3000)
                            Log.d("GKWearListener", "DataChanged /gk/water-sync: intake=$intake, goal=$goal")
                            WatchHealthManager.getInstance(applicationContext).updateWaterFromPhone(intake, goal)
                        } catch (e: Exception) {
                            Log.e("GKWearListener", "DataChanged water error: ${e.message}", e)
                        }
                    }
                    "/gk/auth-session" -> {
                        try {
                            val dataMapItem = DataMapItem.fromDataItem(event.dataItem)
                            val sessionJson = dataMapItem.dataMap.getString("session")
                            if (!sessionJson.isNullOrEmpty()) {
                                Log.d("GKWearListener", "DataChanged /gk/auth-session: $sessionJson")
                                val session = gson.fromJson(sessionJson, WatchAuthSession::class.java)
                                WatchSyncRepository.getInstance(applicationContext).updateAuthSession(session)
                            }
                        } catch (e: Exception) {
                            Log.e("GKWearListener", "DataChanged auth error: ${e.message}", e)
                        }
                    }
                }
            }
        }
    }
}
