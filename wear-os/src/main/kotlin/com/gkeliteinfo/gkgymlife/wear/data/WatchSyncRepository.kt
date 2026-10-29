package com.gkeliteinfo.gkgymlife.wear.data

import android.content.Context
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

class WatchSyncRepository(private val context: Context) {

    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    private val offlineQueue = OfflineQueue(context)

    private val _activePayload = MutableStateFlow<WatchWorkoutPayload?>(null)
    val activePayload = _activePayload.asStateFlow()

    private val _completedSets = MutableStateFlow<Map<String, Int>>(emptyMap())
    val completedSets = _completedSets.asStateFlow()

    fun updateActivePayload(payload: WatchWorkoutPayload) {
        _activePayload.value = payload
    }

    fun loadSampleWorkout() {
        loadWorkoutPreset("Push (Chest & Shoulders)")
    }

    fun loadWorkoutPreset(preset: String) {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val cleanPreset = preset.lowercase()
        val exercises = when {
            cleanPreset.contains("leg") -> listOf(
                WatchExercise("leg-1", "Barbell Back Squat", "LEGS", 4, "8-10", 0),
                WatchExercise("leg-2", "Leg Press Machine", "LEGS", 3, "10-12", 1),
                WatchExercise("leg-3", "Romanian Deadlift", "HAMSTRINGS", 3, "10-12", 2),
                WatchExercise("leg-4", "Standing Calf Raises", "CALVES", 4, "15", 3)
            )
            cleanPreset.contains("pull") || cleanPreset.contains("back") -> listOf(
                WatchExercise("pull-1", "Lat Pulldown", "BACK", 4, "10-12", 0),
                WatchExercise("pull-2", "Seated Cable Row", "BACK", 3, "10-12", 1),
                WatchExercise("pull-3", "Barbell Bicep Curl", "BICEPS", 3, "10-12", 2),
                WatchExercise("pull-4", "Hammer Curls", "BICEPS", 3, "12", 3)
            )
            cleanPreset.contains("arm") || cleanPreset.contains("core") -> listOf(
                WatchExercise("arm-1", "Dumbbell Bicep Curl", "BICEPS", 3, "10-12", 0),
                WatchExercise("arm-2", "Triceps Rope Pushdown", "TRICEPS", 3, "12-15", 1),
                WatchExercise("arm-3", "Overhead Dumbbell Extension", "TRICEPS", 3, "10-12", 2),
                WatchExercise("arm-4", "Hanging Leg Raises", "ABS", 3, "15", 3)
            )
            else -> listOf(
                WatchExercise("push-1", "Flat Barbell Bench Press", "CHEST", 4, "8-10", 0),
                WatchExercise("push-2", "Incline Dumbbell Press", "CHEST", 3, "10-12", 1),
                WatchExercise("push-3", "Overhead Shoulder Press", "SHOULDERS", 3, "10-12", 2),
                WatchExercise("push-4", "Triceps Rope Pushdown", "TRICEPS", 3, "12", 3)
            )
        }

        _activePayload.value = WatchWorkoutPayload(
            type = "WORKOUT_SESSION",
            userId = "local-user",
            planDayId = "quick-$preset",
            sessionDate = today,
            workoutType = preset,
            durationMinutes = 45,
            isTrainerPlan = false,
            isCustom = true,
            exercises = exercises,
            restTimerSeconds = 60,
            restTimerEnabled = true
        )
    }

    fun checkPhoneConnection(onResult: (Boolean, String?) -> Unit) {
        scope.launch {
            try {
                val nodeClient = Wearable.getNodeClient(context)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                if (nodes.isNotEmpty()) {
                    val primary = nodes.firstOrNull { it.isNearby } ?: nodes.first()
                    onResult(true, primary.displayName)
                } else {
                    onResult(false, null)
                }
            } catch (_: Exception) {
                onResult(false, null)
            }
        }
    }

    fun logSet(
        dayExerciseId: String,
        setNumber: Int,
        weight: Double,
        reps: Int,
        setType: String = "working"
    ) {
        val payload = _activePayload.value ?: return
        val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())

        val setLog = PendingSetLog(
            dayExerciseId = dayExerciseId,
            planDayId = payload.planDayId,
            sessionDate = payload.sessionDate,
            setNumber = setNumber,
            setType = setType,
            weight = weight,
            reps = reps,
            isCompleted = true,
            completedAt = nowIso,
            synced = false
        )

        scope.launch {
            val insertedId = offlineQueue.insert(setLog)

            // Update completed sets in memory
            val currentMap = _completedSets.value.toMutableMap()
            currentMap[dayExerciseId] = maxOf(currentMap[dayExerciseId] ?: 0, setNumber)
            _completedSets.value = currentMap

            // Attempt to send immediately to phone
            val message = WatchSetLogMessage(
                dayExerciseId = dayExerciseId,
                planDayId = payload.planDayId,
                sessionDate = payload.sessionDate,
                setNumber = setNumber,
                setType = setType,
                weight = weight,
                reps = reps,
                isCompleted = true,
                completedAt = nowIso,
                source = "wearos"
            )

            val json = gson.toJson(message)
            val sent = sendToPhone("/gk/set-log", json)
            if (sent) {
                offlineQueue.markSynced(listOf(insertedId))
            }
        }
    }

    fun finishWorkout(durationMinutes: Int, onComplete: () -> Unit) {
        val payload = _activePayload.value ?: run {
            onComplete()
            return
        }

        val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())

        scope.launch {
            val unsynced = offlineQueue.getUnsyncedLogs()
            // Flush unsynced set logs first
            val syncedIds = mutableListOf<Long>()
            for (pending in unsynced) {
                val msg = WatchSetLogMessage(
                    dayExerciseId = pending.dayExerciseId,
                    planDayId = pending.planDayId,
                    sessionDate = pending.sessionDate,
                    setNumber = pending.setNumber,
                    setType = pending.setType,
                    weight = pending.weight,
                    reps = pending.reps,
                    isCompleted = pending.isCompleted,
                    completedAt = pending.completedAt,
                    source = "wearos"
                )
                if (sendToPhone("/gk/set-log", gson.toJson(msg))) {
                    syncedIds.add(pending.id)
                }
            }
            if (syncedIds.isNotEmpty()) {
                offlineQueue.markSynced(syncedIds)
            }

            val totalCompletedSets = _completedSets.value.values.sum()
            val summary = WatchWorkoutSummaryMessage(
                planDayId = payload.planDayId,
                sessionDate = payload.sessionDate,
                durationMinutes = durationMinutes,
                completedExercisesCount = _completedSets.value.size,
                totalSetsCompleted = totalCompletedSets,
                completedAt = nowIso,
                source = "wearos"
            )

            sendToPhone("/gk/workout-complete", gson.toJson(summary))
            onComplete()
        }
    }

    private suspend fun sendToPhone(path: String, messageJson: String): Boolean {
        return try {
            val nodeClient = Wearable.getNodeClient(context)
            val messageClient = Wearable.getMessageClient(context)
            val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)

            if (nodes.isEmpty()) return false

            val data = messageJson.toByteArray(StandardCharsets.UTF_8)
            var anySuccess = false
            for (node in nodes) {
                Tasks.await(messageClient.sendMessage(node.id, path, data))
                anySuccess = true
            }
            anySuccess
        } catch (_: Exception) {
            false
        }
    }

    companion object {
        @Volatile
        private var INSTANCE: WatchSyncRepository? = null

        fun getInstance(context: Context): WatchSyncRepository {
            return INSTANCE ?: synchronized(this) {
                val instance = WatchSyncRepository(context.applicationContext)
                INSTANCE = instance
                instance
            }
        }
    }
}
