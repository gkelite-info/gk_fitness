package com.gkeliteinfo.gkgymlife.wear.data

data class PendingSetLog(
    val id: Long = System.currentTimeMillis(),
    val dayExerciseId: String,
    val planDayId: String,
    val sessionDate: String,
    val setNumber: Int,
    val setType: String = "working",
    val weight: Double,
    val reps: Int,
    val isCompleted: Boolean = true,
    val completedAt: String,
    var synced: Boolean = false
)
