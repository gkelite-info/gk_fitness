package com.gkeliteinfo.gkgymlife.wear.data

import com.google.gson.annotations.SerializedName

data class WatchExercise(
    @SerializedName("dayExerciseId") val dayExerciseId: String,
    @SerializedName("exerciseName") val exerciseName: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("sets") val sets: Int = 3,
    @SerializedName("reps") val reps: String = "10",
    @SerializedName("order") val order: Int = 0,
    @SerializedName("videoUrl") val videoUrl: String? = null
)

data class WatchWorkoutPayload(
    @SerializedName("type") val type: String = "WORKOUT_SESSION",
    @SerializedName("userId") val userId: String,
    @SerializedName("planDayId") val planDayId: String,
    @SerializedName("sessionDate") val sessionDate: String,
    @SerializedName("workoutType") val workoutType: String,
    @SerializedName("durationMinutes") val durationMinutes: Int = 45,
    @SerializedName("isTrainerPlan") val isTrainerPlan: Boolean = false,
    @SerializedName("isCustom") val isCustom: Boolean = false,
    @SerializedName("exercises") val exercises: List<WatchExercise> = emptyList(),
    @SerializedName("restTimerSeconds") val restTimerSeconds: Int = 90,
    @SerializedName("restTimerEnabled") val restTimerEnabled: Boolean = true
)

data class WatchSetLogMessage(
    @SerializedName("dayExerciseId") val dayExerciseId: String,
    @SerializedName("planDayId") val planDayId: String,
    @SerializedName("sessionDate") val sessionDate: String,
    @SerializedName("setNumber") val setNumber: Int,
    @SerializedName("setType") val setType: String = "working",
    @SerializedName("weight") val weight: Double,
    @SerializedName("reps") val reps: Int,
    @SerializedName("isCompleted") val isCompleted: Boolean = true,
    @SerializedName("completedAt") val completedAt: String,
    @SerializedName("source") val source: String = "wearos"
)

data class WatchWorkoutSummaryMessage(
    @SerializedName("planDayId") val planDayId: String,
    @SerializedName("sessionDate") val sessionDate: String,
    @SerializedName("durationMinutes") val durationMinutes: Int,
    @SerializedName("completedExercisesCount") val completedExercisesCount: Int,
    @SerializedName("totalSetsCompleted") val totalSetsCompleted: Int,
    @SerializedName("completedAt") val completedAt: String,
    @SerializedName("source") val source: String = "wearos"
)
