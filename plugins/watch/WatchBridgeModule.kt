package com.gkeliteinfo.gkgymlife.watch

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
            if (nodes.isEmpty()) return false
            val data = message.toByteArray(StandardCharsets.UTF_8)
            for (node in nodes) {
                Tasks.await(messageClient.sendMessage(node.id, path, data))
            }
            true
        } catch (_: Exception) {
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

                // 1. DataClient
                val dataClient = Wearable.getDataClient(reactContext)
                val putDataMapRequest = PutDataMapRequest.create("/gk/water-sync")
                putDataMapRequest.dataMap.putInt("waterIntakeMl", intake)
                putDataMapRequest.dataMap.putInt("waterGoalMl", goal)
                putDataMapRequest.dataMap.putLong("timestamp", System.currentTimeMillis())
                val request = putDataMapRequest.asPutDataRequest().setUrgent()
                Tasks.await(dataClient.putDataItem(request))

                // 2. MessageClient
                val nodeClient = Wearable.getNodeClient(reactContext)
                val messageClient = Wearable.getMessageClient(reactContext)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                val data = json.toByteArray(StandardCharsets.UTF_8)
                for (node in nodes) {
                    Tasks.await(messageClient.sendMessage(node.id, "/gk/water-sync", data))
                }
                promise.resolve(true)
            } catch (e: Exception) {
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

        when (path) {
            "/gk/set-log" -> emitEvent("Watch_SetLogReceived", dataString)
            "/gk/workout-complete" -> emitEvent("Watch_WorkoutComplete", dataString)
            "/gk/heart-rate" -> emitEvent("Watch_HeartRateReceived", dataString)
            "/gk/water-log" -> emitEvent("Watch_WaterLogReceived", dataString)
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
        // Reserved for continuous sync
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
