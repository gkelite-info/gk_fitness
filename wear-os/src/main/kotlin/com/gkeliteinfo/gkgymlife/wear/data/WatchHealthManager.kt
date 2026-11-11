package com.gkeliteinfo.gkgymlife.wear.data

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WatchHealthManager(private val context: Context) :
    SensorEventListener,
    MessageClient.OnMessageReceivedListener,
    DataClient.OnDataChangedListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    private val prefs = context.getSharedPreferences("gk_wear_health", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(Dispatchers.IO)
    private val gson = Gson()

    private val _steps = MutableStateFlow(0)
    val steps = _steps.asStateFlow()

    private val _heartRate = MutableStateFlow(0)
    val heartRate = _heartRate.asStateFlow()

    private val _waterIntakeMl = MutableStateFlow(0)
    val waterIntakeMl = _waterIntakeMl.asStateFlow()

    private val _waterGoalMl = MutableStateFlow(3000)
    val waterGoalMl = _waterGoalMl.asStateFlow()

    private var initialStepOffset = -1
    private var lastHrSentTime = 0L
    private var lastStepsSentToPhone = 0
    private var currentUserId: String? = null

    init {
        loadDailyWater()
        startSensors()
        registerWearableListeners()
    }

    fun setCurrentUserId(userId: String?) {
        currentUserId = userId
        loadDailyWater()
    }

    private fun getUserKey(): String = currentUserId ?: "guest"

    private fun registerWearableListeners() {
        try {
            Wearable.getMessageClient(context).addListener(this)
            Wearable.getDataClient(context).addListener(this)
            Log.d("GKWatchHealth", "Wearable MessageClient and DataClient registered in WatchHealthManager")
        } catch (e: Exception) {
            Log.w("GKWatchHealth", "Failed to register wearable listeners: ${e.message}")
        }
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        when (messageEvent.path) {
            "/gk/water-sync" -> {
                try {
                    val json = String(messageEvent.data, StandardCharsets.UTF_8)
                    Log.d("GKWatchHealth", "onMessageReceived /gk/water-sync: $json")
                    val map = gson.fromJson(json, Map::class.java)
                    val intake = (map["waterIntakeMl"] as? Number)?.toInt() ?: 0
                    val goal = (map["waterGoalMl"] as? Number)?.toInt()
                    updateWaterFromPhone(intake, goal)
                } catch (e: Exception) {
                    Log.e("GKWatchHealth", "onMessageReceived /gk/water-sync error: ${e.message}", e)
                }
            }
            "/gk/auth-session" -> {
                try {
                    val json = String(messageEvent.data, StandardCharsets.UTF_8)
                    Log.d("GKWatchHealth", "onMessageReceived /gk/auth-session: $json")
                    val session = gson.fromJson(json, WatchAuthSession::class.java)
                    WatchSyncRepository.getInstance(context).updateAuthSession(session)
                } catch (e: Exception) {
                    Log.e("GKWatchHealth", "onMessageReceived /gk/auth-session error: ${e.message}", e)
                }
            }
        }
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED) {
                val uri = event.dataItem.uri
                when (uri.path) {
                    "/gk/water-sync" -> {
                        try {
                            val dataMapItem = DataMapItem.fromDataItem(event.dataItem)
                            val intake = dataMapItem.dataMap.getInt("waterIntakeMl", 0)
                            val goal = dataMapItem.dataMap.getInt("waterGoalMl", 3000)
                            Log.d("GKWatchHealth", "onDataChanged /gk/water-sync: intake=$intake, goal=$goal")
                            updateWaterFromPhone(intake, goal)
                        } catch (e: Exception) {
                            Log.e("GKWatchHealth", "onDataChanged /gk/water-sync error: ${e.message}", e)
                        }
                    }
                    "/gk/auth-session" -> {
                        try {
                            val dataMapItem = DataMapItem.fromDataItem(event.dataItem)
                            val sessionJson = dataMapItem.dataMap.getString("session")
                            if (!sessionJson.isNullOrEmpty()) {
                                Log.d("GKWatchHealth", "onDataChanged /gk/auth-session: $sessionJson")
                                val session = gson.fromJson(sessionJson, WatchAuthSession::class.java)
                                WatchSyncRepository.getInstance(context).updateAuthSession(session)
                            }
                        } catch (e: Exception) {
                            Log.e("GKWatchHealth", "onDataChanged /gk/auth-session error: ${e.message}", e)
                        }
                    }
                }
            }
        }
    }

    private fun getTodayKey(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    private fun loadDailyWater() {
        val today = getTodayKey()
        val userKey = getUserKey()
        val savedDate = prefs.getString("water_date_$userKey", "")
        val savedGoal = prefs.getInt("water_goal_ml_$userKey", 3000)
        _waterGoalMl.value = savedGoal

        if (savedDate == today) {
            _waterIntakeMl.value = prefs.getInt("water_ml_$userKey", 0)
        } else {
            _waterIntakeMl.value = 0
            prefs.edit().putString("water_date_$userKey", today).putInt("water_ml_$userKey", 0).apply()
        }
    }

    fun updateWaterFromPhone(intakeMl: Int, goalMl: Int?) {
        val today = getTodayKey()
        val userKey = getUserKey()
        _waterIntakeMl.value = intakeMl
        if (goalMl != null && goalMl > 0) {
            _waterGoalMl.value = goalMl
            prefs.edit().putInt("water_goal_ml_$userKey", goalMl).apply()
        }
        prefs.edit().putString("water_date_$userKey", today).putInt("water_ml_$userKey", intakeMl).apply()
        Log.d("GKWatchHealth", "updateWaterFromPhone applied for user $userKey: intake=$intakeMl, goal=${goalMl ?: _waterGoalMl.value}")
    }

    fun addWater(amountMl: Int) {
        val today = getTodayKey()
        val userKey = getUserKey()
        val newTotal = _waterIntakeMl.value + amountMl
        _waterIntakeMl.value = newTotal
        prefs.edit().putString("water_date_$userKey", today).putInt("water_ml_$userKey", newTotal).apply()
        vibrateHaptic(100)

        val clientLogId = "wear-${System.currentTimeMillis()}-${(1000..9999).random()}"

        // Sync water to phone
        scope.launch {
            try {
                val payload = mapOf(
                    "clientLogId" to clientLogId,
                    "userId" to (currentUserId ?: ""),
                    "sessionDate" to today,
                    "waterIntakeMl" to newTotal,
                    "addedMl" to amountMl,
                    "timestamp" to System.currentTimeMillis()
                )
                val json = gson.toJson(payload)
                Log.d("GKWatchHealth", "addWater sending /gk/water-log to phone: $json")

                // 1. DataClient for persistent sync
                try {
                    val dataClient = Wearable.getDataClient(context)
                    val putDataMapRequest = PutDataMapRequest.create("/gk/water-log")
                    putDataMapRequest.dataMap.putString("clientLogId", clientLogId)
                    putDataMapRequest.dataMap.putString("userId", currentUserId ?: "")
                    putDataMapRequest.dataMap.putString("sessionDate", today)
                    putDataMapRequest.dataMap.putInt("waterIntakeMl", newTotal)
                    putDataMapRequest.dataMap.putInt("addedMl", amountMl)
                    putDataMapRequest.dataMap.putLong("timestamp", System.currentTimeMillis())
                    val request = putDataMapRequest.asPutDataRequest().setUrgent()
                    Tasks.await(dataClient.putDataItem(request))
                    Log.d("GKWatchHealth", "addWater DataClient putDataItem succeeded")
                } catch (dataErr: Exception) {
                    Log.w("GKWatchHealth", "addWater DataClient notice: ${dataErr.message}")
                }

                // 2. MessageClient for instantaneous delivery
                sendToPhone("/gk/water-log", json)
            } catch (e: Exception) {
                Log.e("GKWatchHealth", "addWater sync error: ${e.message}", e)
            }
        }
    }

    fun sendStepsToPhone(stepsCount: Int = _steps.value) {
        scope.launch {
            try {
                val payload = mapOf(
                    "userId" to (currentUserId ?: ""),
                    "sessionDate" to getTodayKey(),
                    "steps" to stepsCount,
                    "timestamp" to System.currentTimeMillis()
                )
                val json = gson.toJson(payload)
                Log.d("GKWatchHealth", "sendStepsToPhone: $json")

                // 1. DataClient for persistence
                try {
                    val dataClient = Wearable.getDataClient(context)
                    val putDataMapRequest = PutDataMapRequest.create("/gk/step-sync")
                    putDataMapRequest.dataMap.putString("userId", currentUserId ?: "")
                    putDataMapRequest.dataMap.putString("sessionDate", getTodayKey())
                    putDataMapRequest.dataMap.putInt("steps", stepsCount)
                    putDataMapRequest.dataMap.putLong("timestamp", System.currentTimeMillis())
                    val request = putDataMapRequest.asPutDataRequest().setUrgent()
                    Tasks.await(dataClient.putDataItem(request))
                } catch (_: Exception) {}

                // 2. MessageClient
                sendToPhone("/gk/step-sync", json)
            } catch (e: Exception) {
                Log.e("GKWatchHealth", "sendStepsToPhone error: ${e.message}", e)
            }
        }
    }

    fun hasPermissions(): Boolean {
        val hasBody = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.BODY_SENSORS
        ) == PackageManager.PERMISSION_GRANTED

        val hasActivity = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACTIVITY_RECOGNITION
        ) == PackageManager.PERMISSION_GRANTED

        return hasBody && hasActivity
    }

    fun startSensors() {
        val sm = sensorManager ?: return

        // Activity recognition permission for steps
        val canReadSteps = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACTIVITY_RECOGNITION
        ) == PackageManager.PERMISSION_GRANTED

        if (canReadSteps) {
            try {
                val stepSensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
                stepSensor?.let {
                    sm.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
                    Log.d("GKWatch", "Registered TYPE_STEP_COUNTER")
                }
                val stepDetector = sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
                stepDetector?.let {
                    sm.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
                    Log.d("GKWatch", "Registered TYPE_STEP_DETECTOR")
                }
            } catch (e: Exception) {
                Log.w("GKWatch", "Failed to register step sensors: ${e.message}")
            }
        }

        // Body sensors permission for Heart Rate
        val canReadPulse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.BODY_SENSORS
        ) == PackageManager.PERMISSION_GRANTED

        if (canReadPulse) {
            try {
                val hrSensor = sm.getDefaultSensor(Sensor.TYPE_HEART_RATE)
                hrSensor?.let {
                    sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
                    Log.d("GKWatch", "Registered TYPE_HEART_RATE")
                }
            } catch (e: Exception) {
                Log.w("GKWatch", "Failed to register heart rate sensor: ${e.message}")
            }
        }
    }

    fun stopSensors() {
        sensorManager?.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_STEP_COUNTER -> {
                val rawSteps = event.values[0].toInt()
                if (rawSteps > 0) {
                    if (initialStepOffset == -1) {
                        val savedOffset = prefs.getInt("step_offset_${getTodayKey()}", -1)
                        if (savedOffset != -1) {
                            initialStepOffset = savedOffset
                        } else {
                            initialStepOffset = rawSteps
                            prefs.edit().putInt("step_offset_${getTodayKey()}", rawSteps).apply()
                        }
                    }
                    val todaySteps = maxOf(0, rawSteps - initialStepOffset)
                    _steps.value = todaySteps

                    // Sync steps to phone throttled (every 25 steps)
                    if (todaySteps - lastStepsSentToPhone >= 25) {
                        lastStepsSentToPhone = todaySteps
                        sendStepsToPhone(todaySteps)
                    }
                }
            }
            Sensor.TYPE_STEP_DETECTOR -> {
                // If step counter hasn't initialized an offset yet, accumulate detected steps
                if (initialStepOffset == -1 && event.values[0] > 0) {
                    _steps.value += 1
                }
            }
            Sensor.TYPE_HEART_RATE -> {
                val bpm = event.values[0].toInt()
                if (bpm > 0) {
                    _heartRate.value = bpm

                    // Send heart rate log to phone throttled (every 10s)
                    val now = System.currentTimeMillis()
                    if (now - lastHrSentTime > 10000) {
                        lastHrSentTime = now
                        scope.launch {
                            try {
                                val hrPayload = mapOf(
                                    "heartRate" to bpm,
                                    "recordedAt" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date()),
                                    "sessionDate" to getTodayKey(),
                                    "source" to "wearos"
                                )
                                sendToPhone("/gk/heart-rate", gson.toJson(hrPayload))
                            } catch (_: Exception) {}
                        }
                    }
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun vibrateHaptic(durationMs: Long) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                @Suppress("DEPRECATION")
                v?.vibrate(durationMs)
            }
        } catch (_: Exception) {}
    }

    private suspend fun sendToPhone(path: String, messageJson: String): Boolean {
        return try {
            val nodeClient = Wearable.getNodeClient(context)
            val messageClient = Wearable.getMessageClient(context)
            val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
            Log.d("GKWatchHealth", "sendToPhone path=$path, connected nodes=${nodes.size}")
            if (nodes.isEmpty()) {
                Log.w("GKWatchHealth", "Cannot sendToPhone: 0 connected nodes")
                return false
            }
            val data = messageJson.toByteArray(StandardCharsets.UTF_8)
            var anySent = false
            for (node in nodes) {
                Tasks.await(messageClient.sendMessage(node.id, path, data))
                Log.d("GKWatchHealth", "sendToPhone sent message to node ${node.id} (${node.displayName})")
                anySent = true
            }
            anySent
        } catch (e: Exception) {
            Log.e("GKWatchHealth", "sendToPhone error for path=$path: ${e.message}", e)
            false
        }
    }

    companion object {
        @Volatile
        private var INSTANCE: WatchHealthManager? = null

        fun getInstance(context: Context): WatchHealthManager {
            return INSTANCE ?: synchronized(this) {
                val instance = WatchHealthManager(context.applicationContext)
                INSTANCE = instance
                instance
            }
        }
    }
}

