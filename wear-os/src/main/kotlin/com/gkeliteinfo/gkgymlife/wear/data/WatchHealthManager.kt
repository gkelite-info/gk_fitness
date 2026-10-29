package com.gkeliteinfo.gkgymlife.wear.data

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.Node
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

class WatchHealthManager(private val context: Context) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    private val prefs = context.getSharedPreferences("gk_wear_health", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(Dispatchers.IO)
    private val gson = Gson()

    private val _steps = MutableStateFlow(0)
    val steps = _steps.asStateFlow()

    private val _heartRate = MutableStateFlow(72)
    val heartRate = _heartRate.asStateFlow()

    private val _waterIntakeMl = MutableStateFlow(0)
    val waterIntakeMl = _waterIntakeMl.asStateFlow()

    private val _waterGoalMl = MutableStateFlow(3000)
    val waterGoalMl = _waterGoalMl.asStateFlow()

    private var initialStepOffset = -1

    init {
        loadDailyWater()
        startSensors()
    }

    private fun getTodayKey(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    private fun loadDailyWater() {
        val today = getTodayKey()
        val savedDate = prefs.getString("water_date", "")
        if (savedDate == today) {
            _waterIntakeMl.value = prefs.getInt("water_ml", 0)
        } else {
            _waterIntakeMl.value = 0
            prefs.edit().putString("water_date", today).putInt("water_ml", 0).apply()
        }
    }

    fun addWater(amountMl: Int) {
        val today = getTodayKey()
        val newTotal = _waterIntakeMl.value + amountMl
        _waterIntakeMl.value = newTotal
        prefs.edit().putString("water_date", today).putInt("water_ml", newTotal).apply()
        vibrateHaptic(100)

        // Sync water to phone
        scope.launch {
            try {
                val payload = mapOf(
                    "sessionDate" to today,
                    "waterIntakeMl" to newTotal,
                    "addedMl" to amountMl,
                    "timestamp" to System.currentTimeMillis()
                )
                sendToPhone("/gk/water-log", gson.toJson(payload))
            } catch (_: Exception) {}
        }
    }

    fun startSensors() {
        sensorManager?.let { sm ->
            val stepSensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
            stepSensor?.let {
                sm.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
            }

            val hrSensor = sm.getDefaultSensor(Sensor.TYPE_HEART_RATE)
            hrSensor?.let {
                sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
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
            }
            Sensor.TYPE_HEART_RATE -> {
                val bpm = event.values[0].toInt()
                if (bpm > 0) {
                    _heartRate.value = bpm
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
            if (nodes.isEmpty()) return false
            val data = messageJson.toByteArray(StandardCharsets.UTF_8)
            for (node in nodes) {
                Tasks.await(messageClient.sendMessage(node.id, path, data))
            }
            true
        } catch (_: Exception) {
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

