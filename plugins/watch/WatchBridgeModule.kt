package com.gkeliteinfo.gkgymlife.watch

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.nio.charset.StandardCharsets

class WatchBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    MessageClient.OnMessageReceivedListener,
    DataClient.OnDataChangedListener {

    private val scope = CoroutineScope(Dispatchers.IO)
    private var isListenerRegistered = false

    init {
        registerListeners()
    }

    override fun getName(): String {
        return "WatchBridgeModule"
    }

    private fun registerListeners() {
        if (!isListenerRegistered) {
            try {
                Wearable.getMessageClient(reactContext).addListener(this)
                Wearable.getDataClient(reactContext).addListener(this)
                isListenerRegistered = true
            } catch (e: Exception) {
                // Ignore if Google Play Services Wearable is not installed on the host
            }
        }
    }

    private fun unregisterListeners() {
        if (isListenerRegistered) {
            try {
                Wearable.getMessageClient(reactContext).removeListener(this)
                Wearable.getDataClient(reactContext).removeListener(this)
                isListenerRegistered = false
            } catch (e: Exception) {
                // Ignore
            }
        }
    }

    @ReactMethod
    fun getConnectionStatus(promise: Promise) {
        scope.launch {
            try {
                val nodeClient = Wearable.getNodeClient(reactContext)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                Log.d("GKWatchBridge", "getConnectionStatus found ${nodes.size} connected nodes")
                for (node in nodes) {
                    Log.d("GKWatchBridge", "Node: id=${node.id}, name=${node.displayName}, isNearby=${node.isNearby}")
                }

                val result = Arguments.createMap()
                if (nodes.isNotEmpty()) {
                    val primaryNode = nodes.firstOrNull { it.isNearby } ?: nodes.first()
                    result.putBoolean("isPaired", true)
                    result.putBoolean("isReachable", primaryNode.isNearby)
                    result.putString("deviceName", primaryNode.displayName)
                    result.putString("nodeId", primaryNode.id)
                    result.putString("platform", "wearos")
                } else {
                    result.putBoolean("isPaired", false)
                    result.putBoolean("isReachable", false)
                    result.putNull("deviceName")
                    result.putNull("nodeId")
                    result.putString("platform", "wearos")
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e("GKWatchBridge", "getConnectionStatus error: ${e.message}", e)
                val fallback = Arguments.createMap()
                fallback.putBoolean("isPaired", false)
                fallback.putBoolean("isReachable", false)
                fallback.putString("platform", "wearos")
                promise.resolve(fallback)
            }
        }
    }

    @ReactMethod
    fun pushWorkoutPayload(path: String, payloadJson: String, promise: Promise) {
        scope.launch {
            try {
                // 1. DataClient for persistent sync
                val dataClient = Wearable.getDataClient(reactContext)
                val putDataMapRequest = PutDataMapRequest.create(path)
                putDataMapRequest.dataMap.putString("payload", payloadJson)
                putDataMapRequest.dataMap.putLong("timestamp", System.currentTimeMillis())

                val request = putDataMapRequest.asPutDataRequest().setUrgent()
                Tasks.await(dataClient.putDataItem(request))

                // 2. MessageClient for instantaneous real-time delivery
                try {
                    val nodeClient = Wearable.getNodeClient(reactContext)
                    val messageClient = Wearable.getMessageClient(reactContext)
                    val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                    val data = payloadJson.toByteArray(StandardCharsets.UTF_8)
                    for (node in nodes) {
                        Tasks.await(messageClient.sendMessage(node.id, path, data))
                    }
                } catch (msgErr: Exception) {
                    // Ignore message client errors if data client succeeded
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("PUSH_WORKOUT_ERROR", "Failed to push workout data to watch: ${e.message}", e)
            }
        }
    }

    private suspend fun sendMessageInternal(path: String, message: String): Boolean {
        return try {
            val nodeClient = Wearable.getNodeClient(reactContext)
            val messageClient = Wearable.getMessageClient(reactContext)
            val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
            Log.d("GKWatchBridge", "sendMessageInternal: path=$path, found ${nodes.size} nodes")
            if (nodes.isEmpty()) {
                Log.w("GKWatchBridge", "Cannot sendMessageInternal: no connected nodes")
                return false
            }
            val data = message.toByteArray(StandardCharsets.UTF_8)
            for (node in nodes) {
                Tasks.await(messageClient.sendMessage(node.id, path, data))
                Log.d("GKWatchBridge", "Sent message to watch node ${node.id} (${node.displayName})")
            }
            true
        } catch (e: Exception) {
            Log.e("GKWatchBridge", "sendMessageInternal error: ${e.message}", e)
            false
        }
    }

    @ReactMethod
    fun sendMessage(path: String, message: String, promise: Promise) {
        scope.launch {
            try {
                val ok = sendMessageInternal(path, message)
                promise.resolve(ok)
            } catch (e: Exception) {
                promise.reject("SEND_MESSAGE_ERROR", "Failed to send message to watch: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun pushWaterSync(waterIntakeMl: Double, waterGoalMl: Double, promise: Promise) {
        scope.launch {
            try {
                val intake = waterIntakeMl.toInt()
                val goal = waterGoalMl.toInt()
                val json = "{\"waterIntakeMl\":$intake,\"waterGoalMl\":$goal,\"timestamp\":${System.currentTimeMillis()}}"
                Log.d("GKWatchBridge", "pushWaterSync: intake=$intake, goal=$goal")

                // 1. DataClient for persistent sync
                try {
                    val dataClient = Wearable.getDataClient(reactContext)
                    val putDataMapRequest = PutDataMapRequest.create("/gk/water-sync")
                    putDataMapRequest.dataMap.putInt("waterIntakeMl", intake)
                    putDataMapRequest.dataMap.putInt("waterGoalMl", goal)
                    putDataMapRequest.dataMap.putLong("timestamp", System.currentTimeMillis())
                    val request = putDataMapRequest.asPutDataRequest().setUrgent()
                    Tasks.await(dataClient.putDataItem(request))
                    Log.d("GKWatchBridge", "pushWaterSync: DataClient putDataItem succeeded")
                } catch (dataErr: Exception) {
                    Log.w("GKWatchBridge", "pushWaterSync DataClient notice: ${dataErr.message}")
                }

                // 2. MessageClient for instantaneous delivery
                val nodeClient = Wearable.getNodeClient(reactContext)
                val messageClient = Wearable.getMessageClient(reactContext)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                Log.d("GKWatchBridge", "pushWaterSync: found ${nodes.size} connected nodes")
                val data = json.toByteArray(StandardCharsets.UTF_8)
                var anySent = false
                for (node in nodes) {
                    Tasks.await(messageClient.sendMessage(node.id, "/gk/water-sync", data))
                    Log.d("GKWatchBridge", "pushWaterSync: sent message to node ${node.id} (${node.displayName})")
                    anySent = true
                }
                promise.resolve(anySent || nodes.isNotEmpty())
            } catch (e: Exception) {
                Log.e("GKWatchBridge", "pushWaterSync error: ${e.message}", e)
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun pushStepSync(steps: Double, sessionDate: String, promise: Promise) {
        scope.launch {
            try {
                val stepCount = steps.toInt()
                val json = "{\"steps\":$stepCount,\"sessionDate\":\"$sessionDate\",\"timestamp\":${System.currentTimeMillis()}}"
                Log.d("GKWatchBridge", "pushStepSync: steps=$stepCount, sessionDate=$sessionDate")

                // 1. DataClient for persistent sync (cached on watch even if watch is asleep/disconnected)
                try {
                    val dataClient = Wearable.getDataClient(reactContext)
                    val putDataMapRequest = PutDataMapRequest.create("/gk/step-sync")
                    putDataMapRequest.dataMap.putInt("steps", stepCount)
                    putDataMapRequest.dataMap.putString("sessionDate", sessionDate)
                    putDataMapRequest.dataMap.putLong("timestamp", System.currentTimeMillis())
                    val request = putDataMapRequest.asPutDataRequest().setUrgent()
                    Tasks.await(dataClient.putDataItem(request))
                    Log.d("GKWatchBridge", "pushStepSync: DataClient putDataItem succeeded")
                } catch (dataErr: Exception) {
                    Log.w("GKWatchBridge", "pushStepSync DataClient notice: ${dataErr.message}")
                }

                // 2. MessageClient for instantaneous real-time delivery
                val nodeClient = Wearable.getNodeClient(reactContext)
                val messageClient = Wearable.getMessageClient(reactContext)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                Log.d("GKWatchBridge", "pushStepSync: found ${nodes.size} connected nodes")
                val data = json.toByteArray(StandardCharsets.UTF_8)
                var anySent = false
                for (node in nodes) {
                    Tasks.await(messageClient.sendMessage(node.id, "/gk/step-sync", data))
                    Log.d("GKWatchBridge", "pushStepSync: sent message to node ${node.id} (${node.displayName})")
                    anySent = true
                }
                promise.resolve(anySent || nodes.isNotEmpty())
            } catch (e: Exception) {
                Log.e("GKWatchBridge", "pushStepSync error: ${e.message}", e)
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun pushAuthSession(sessionJson: String, promise: Promise) {
        scope.launch {
            try {
                Log.d("GKWatchBridge", "pushAuthSession: $sessionJson")

                // 1. DataClient for persistent sync (survives watch disconnect/reboot)
                try {
                    val dataClient = Wearable.getDataClient(reactContext)
                    val putDataMapRequest = PutDataMapRequest.create("/gk/auth-session")
                    putDataMapRequest.dataMap.putString("session", sessionJson)
                    putDataMapRequest.dataMap.putLong("timestamp", System.currentTimeMillis())
                    val request = putDataMapRequest.asPutDataRequest().setUrgent()
                    Tasks.await(dataClient.putDataItem(request))
                    Log.d("GKWatchBridge", "pushAuthSession: DataClient putDataItem succeeded")
                } catch (dataErr: Exception) {
                    Log.w("GKWatchBridge", "pushAuthSession DataClient notice: ${dataErr.message}")
                }

                // 2. MessageClient for instantaneous delivery
                val nodeClient = Wearable.getNodeClient(reactContext)
                val messageClient = Wearable.getMessageClient(reactContext)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                val data = sessionJson.toByteArray(StandardCharsets.UTF_8)
                for (node in nodes) {
                    Tasks.await(messageClient.sendMessage(node.id, "/gk/auth-session", data))
                    Log.d("GKWatchBridge", "pushAuthSession: sent to node ${node.id}")
                }
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e("GKWatchBridge", "pushAuthSession error: ${e.message}", e)
                promise.resolve(false)
            }
        }
    }

    // Required for React Native event emitters
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep for RN NativeEventEmitter compliance
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep for RN NativeEventEmitter compliance
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        val path = messageEvent.path
        val dataString = String(messageEvent.data, StandardCharsets.UTF_8)
        Log.d("GKWatchBridge", "onMessageReceived path=$path: $dataString")

        when (path) {
            "/gk/set-log" -> emitEvent("Watch_SetLogReceived", dataString)
            "/gk/workout-complete" -> emitEvent("Watch_WorkoutComplete", dataString)
            "/gk/heart-rate" -> emitEvent("Watch_HeartRateReceived", dataString)
            "/gk/water-log" -> emitEvent("Watch_WaterLogReceived", dataString)
            "/gk/step-sync" -> emitEvent("Watch_StepSyncReceived", dataString)
            "/gk/request-active-workout" -> emitEvent("Watch_RequestActiveWorkout", dataString)
            "/gk/heartbeat" -> {
                // Pong back
                scope.launch {
                    sendMessageInternal("/gk/heartbeat-ack", "PONG")
                }
            }
        }
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == com.google.android.gms.wearable.DataEvent.TYPE_CHANGED) {
                val uri = event.dataItem.uri
                when (uri.path) {
                    "/gk/water-log" -> {
                        try {
                            val dataMapItem = com.google.android.gms.wearable.DataMapItem.fromDataItem(event.dataItem)
                            val sessionDate = dataMapItem.dataMap.getString("sessionDate")
                            val intake = dataMapItem.dataMap.getInt("waterIntakeMl", 0)
                            val added = dataMapItem.dataMap.getInt("addedMl", 0)
                            val timestamp = dataMapItem.dataMap.getLong("timestamp", System.currentTimeMillis())
                            val clientLogId = dataMapItem.dataMap.getString("clientLogId") ?: ""
                            val json = "{\"clientLogId\":\"$clientLogId\",\"sessionDate\":\"$sessionDate\",\"waterIntakeMl\":$intake,\"addedMl\":$added,\"timestamp\":$timestamp}"
                            Log.d("GKWatchBridge", "onDataChanged received /gk/water-log: $json")
                            emitEvent("Watch_WaterLogReceived", json)
                        } catch (e: Exception) {
                            Log.e("GKWatchBridge", "onDataChanged /gk/water-log error: ${e.message}", e)
                        }
                    }
                    "/gk/step-sync" -> {
                        try {
                            val dataMapItem = com.google.android.gms.wearable.DataMapItem.fromDataItem(event.dataItem)
                            val userId = dataMapItem.dataMap.getString("userId") ?: ""
                            val sessionDate = dataMapItem.dataMap.getString("sessionDate") ?: ""
                            val steps = dataMapItem.dataMap.getInt("steps", 0)
                            val timestamp = dataMapItem.dataMap.getLong("timestamp", System.currentTimeMillis())
                            val json = "{\"userId\":\"$userId\",\"sessionDate\":\"$sessionDate\",\"steps\":$steps,\"timestamp\":$timestamp}"
                            Log.d("GKWatchBridge", "onDataChanged received /gk/step-sync: $json")
                            emitEvent("Watch_StepSyncReceived", json)
                        } catch (e: Exception) {
                            Log.e("GKWatchBridge", "onDataChanged /gk/step-sync error: ${e.message}", e)
                        }
                    }
                }
            }
        }
    }

    private fun emitEvent(eventName: String, params: Any?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    override fun invalidate() {
        super.invalidate()
        unregisterListeners()
    }
}
