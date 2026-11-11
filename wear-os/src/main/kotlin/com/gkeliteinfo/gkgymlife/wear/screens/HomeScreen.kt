package com.gkeliteinfo.gkgymlife.wear.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.gkeliteinfo.gkgymlife.wear.components.*
import com.gkeliteinfo.gkgymlife.wear.data.WatchHealthManager
import com.gkeliteinfo.gkgymlife.wear.data.WatchSyncRepository
import com.gkeliteinfo.gkgymlife.wear.theme.BackgroundDark
import com.gkeliteinfo.gkgymlife.wear.theme.PrimaryLime
import com.gkeliteinfo.gkgymlife.wear.theme.SurfaceDark
import com.gkeliteinfo.gkgymlife.wear.theme.TextMuted

/**
 * Modern Horizontal Swipeable Cards for Wear OS HomeScreen.
 * Allows smooth horizontal swiping across 5 glance cards:
 * 1. Activity Rings (Apple Watch-Style Concentric Rings)
 * 2. Today's Workout (Phone Sync / Start Workout)
 * 3. Health & Vitals (Steps & Pulse)
 * 4. Water Tracking (+250ml / +500ml quick log)
 * 5. Quick Workouts Presets
 */
@Composable
fun HomeScreen(
    repository: WatchSyncRepository,
    healthManager: WatchHealthManager,
    onRequestPermissions: () -> Unit,
    onStartWorkout: () -> Unit
) {
    val authSession by repository.authSession.collectAsState()
    val activePayload by repository.activePayload.collectAsState()
    val steps by healthManager.steps.collectAsState()
    val heartRate by healthManager.heartRate.collectAsState()
    val waterIntake by healthManager.waterIntakeMl.collectAsState()
    val waterGoal by healthManager.waterGoalMl.collectAsState()
    val hasPermissions = remember(steps, heartRate) { healthManager.hasPermissions() }

    var isPhoneConnected by remember { mutableStateOf<Boolean?>(null) }
    var connectedPhoneName by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        repository.checkPhoneConnection { connected, name ->
            isPhoneConnected = connected
            connectedPhoneName = name
            if (connected) {
                repository.requestSyncFromPhone()
            }
        }
    }

    val pageCount = 5
    val pagerState = rememberPagerState(initialPage = 0, pageCount = { pageCount })

    Scaffold(
        timeText = { TimeText() },
        modifier = Modifier.background(BackgroundDark)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                when (page) {
                    0 -> ActivityRingsCardPage(
                        steps = steps,
                        heartRate = heartRate
                    )
                    1 -> WorkoutCardPage(
                        activePayload = activePayload,
                        authSession = authSession,
                        isPhoneConnected = isPhoneConnected,
                        connectedPhoneName = connectedPhoneName,
                        onStartWorkout = onStartWorkout,
                        onSyncRequest = {
                            repository.requestSyncFromPhone()
                            repository.checkPhoneConnection { connected, name ->
                                isPhoneConnected = connected
                                connectedPhoneName = name
                            }
                        }
                    )
                    2 -> VitalsCardPage(
                        steps = steps,
                        heartRate = heartRate,
                        hasPermissions = hasPermissions,
                        onRequestPermissions = onRequestPermissions
                    )
                    3 -> WaterCardPage(
                        waterIntake = waterIntake,
                        waterGoal = waterGoal,
                        userName = authSession?.name,
                        isPhoneConnected = isPhoneConnected,
                        onAddWater = { amount -> healthManager.addWater(amount) },
                        onSyncRequest = {
                            repository.requestSyncFromPhone()
                            repository.checkPhoneConnection { connected, name ->
                                isPhoneConnected = connected
                                connectedPhoneName = name
                            }
                        }
                    )
                    4 -> QuickPresetsCardPage(
                        onSelectPreset = { preset ->
                            repository.loadWorkoutPreset(preset)
                            onStartWorkout()
                        }
                    )
                }
            }

            // Dot Page Indicator at Bottom
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(pageCount) { index ->
                    val isSelected = pagerState.currentPage == index
                    Box(
                        modifier = Modifier
                            .size(if (isSelected) 6.dp else 4.dp)
                            .background(
                                color = if (isSelected) PrimaryLime else Color(0xFF4A4A50),
                                shape = CircleShape
                            )
                    )
                }
            }
        }
    }
}

/**
 * Card 1: Apple Watch-Style Concentric Activity Rings Card
 */
@Composable
private fun ActivityRingsCardPage(steps: Int, heartRate: Int) {
    val estimatedCalories = (steps * 0.04f).toInt()
    val calorieGoal = 1000
    val estimatedExerciseMinutes = minOf(60, steps / 150)
    val exerciseGoal = 30
    val estimatedStandHours = minOf(12, maxOf(1, steps / 900))
    val standGoal = 12

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "ACTIVITY",
            color = PrimaryLime,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Large Concentric Rings in center
        WearActivityRings(
            moveProgress = estimatedCalories.toFloat() / calorieGoal,
            exerciseProgress = estimatedExerciseMinutes.toFloat() / exerciseGoal,
            standProgress = estimatedStandHours.toFloat() / standGoal,
            size = 94.dp,
            strokeWidthDp = 9.dp,
            gapDp = 2.dp
        )

        Spacer(modifier = Modifier.height(6.dp))

        // Ring Values Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("MOVE", color = RingMoveColor, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                Text("$estimatedCalories", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("EXERCISE", color = RingExerciseColor, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                Text("${estimatedExerciseMinutes}m", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("STAND", color = RingStandColor, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                Text("${estimatedStandHours}h", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/**
 * Card 2: Today's Workout Card (Synced or Ready)
 */
@Composable
private fun WorkoutCardPage(
    activePayload: com.gkeliteinfo.gkgymlife.wear.data.WatchWorkoutPayload?,
    authSession: com.gkeliteinfo.gkgymlife.wear.data.WatchAuthSession?,
    isPhoneConnected: Boolean?,
    connectedPhoneName: String?,
    onStartWorkout: () -> Unit,
    onSyncRequest: () -> Unit
) {
    val title = if (authSession?.name != null) {
        val firstName = authSession.name.split(" ").firstOrNull() ?: "MY"
        "${firstName.uppercase()}'S WORKOUT"
    } else {
        "TODAY'S WORKOUT"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = title,
            color = TextMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Connection Badge
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = if (isPhoneConnected == true) "🟢" else "⚪", fontSize = 8.sp)
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = when {
                    authSession?.name != null -> authSession.name
                    isPhoneConnected == true -> connectedPhoneName ?: "Phone Connected"
                    isPhoneConnected == false -> "Disconnected"
                    else -> "Checking..."
                },
                color = if (isPhoneConnected == true) Color.White else TextMuted,
                fontSize = 9.sp,
                maxLines = 1
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (activePayload != null) {
            Text(
                text = activePayload.workoutType,
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
            Text(
                text = "${activePayload.exercises.size} exercises • ${activePayload.durationMinutes}m",
                color = TextMuted,
                fontSize = 10.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            CompactChip(
                onClick = onStartWorkout,
                label = { Text("Start Workout ▶", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                colors = ChipDefaults.primaryChipColors(backgroundColor = PrimaryLime, contentColor = Color.Black),
                modifier = Modifier.fillMaxWidth(0.85f)
            )
        } else {
            Card(
                onClick = onSyncRequest,
                modifier = Modifier.fillMaxWidth(0.9f),
                backgroundPainter = CardDefaults.cardBackgroundPainter(
                    startBackgroundColor = SurfaceDark,
                    endBackgroundColor = SurfaceDark
                )
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (authSession != null) "🔄 Tap to Sync" else "🔒 Log In on Phone",
                        color = PrimaryLime,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = if (authSession != null) "fetch today's plan" else "from GK Fitness app",
                        color = TextMuted,
                        fontSize = 9.sp
                    )
                }
            }
        }
    }
}

/**
 * Card 3: Vitals & Health Card (Steps & Heart Rate)
 */
@Composable
private fun VitalsCardPage(
    steps: Int,
    heartRate: Int,
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "HEALTH & VITALS",
            color = PrimaryLime,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        Card(
            onClick = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth(0.92f),
            backgroundPainter = CardDefaults.cardBackgroundPainter(
                startBackgroundColor = SurfaceDark,
                endBackgroundColor = SurfaceDark
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("👟 STEPS", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text("$steps", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text("/10,000", color = TextMuted, fontSize = 8.sp)
                }

                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(30.dp)
                        .background(Color(0xFF2E2E32))
                )

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("❤️ PULSE", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = if (heartRate > 0) "$heartRate" else "--",
                        color = Color(0xFFFF453A),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text("BPM", color = TextMuted, fontSize = 8.sp)
                }
            }
        }

        if (!hasPermissions) {
            Spacer(modifier = Modifier.height(6.dp))
            CompactChip(
                onClick = onRequestPermissions,
                label = { Text("⚠️ Enable Sensors", fontSize = 9.sp, fontWeight = FontWeight.Bold) },
                colors = ChipDefaults.primaryChipColors(backgroundColor = Color(0xFFFF9800), contentColor = Color.Black),
                modifier = Modifier.fillMaxWidth(0.85f)
            )
        }
    }
}

/**
 * Card 4: Water Tracking Card (+250ml / +500ml)
 */
@Composable
private fun WaterCardPage(
    waterIntake: Int,
    waterGoal: Int,
    userName: String?,
    isPhoneConnected: Boolean?,
    onAddWater: (Int) -> Unit,
    onSyncRequest: () -> Unit
) {
    val title = if (userName != null) {
        val firstName = userName.split(" ").firstOrNull() ?: "MY"
        "${firstName.uppercase()}'S HYDRATION"
    } else {
        "HYDRATION"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                text = title,
                color = Color(0xFF64B5F6),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp,
                maxLines = 1
            )
            Spacer(modifier = Modifier.width(6.dp))
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(
                        color = when (isPhoneConnected) {
                            true -> Color(0xFF00E676)
                            false -> Color(0xFFEF5350)
                            null -> Color(0xFFFFB74D)
                        },
                        shape = CircleShape
                    )
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "$waterIntake / $waterGoal ml",
            color = Color.White,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold
        )

        val progress = if (waterGoal > 0) (waterIntake.toFloat() / waterGoal).coerceIn(0f, 1f) else 0f
        Spacer(modifier = Modifier.height(6.dp))

        // Progress line
        Box(
            modifier = Modifier
                .fillMaxWidth(0.7f)
                .height(4.dp)
                .background(Color(0xFF1E2838), RoundedCornerShape(2.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .height(4.dp)
                    .background(Color(0xFF64B5F6), RoundedCornerShape(2.dp))
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CompactChip(
                onClick = { onAddWater(250) },
                label = { Text("+250ml", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                colors = ChipDefaults.secondaryChipColors(backgroundColor = Color(0xFF1E2838), contentColor = Color(0xFF64B5F6))
            )
            CompactChip(
                onClick = { onAddWater(500) },
                label = { Text("+500ml", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                colors = ChipDefaults.secondaryChipColors(backgroundColor = Color(0xFF1E2838), contentColor = Color(0xFF64B5F6))
            )
        }
    }
}

/**
 * Card 5: Quick Workout Presets Card
 */
@Composable
private fun QuickPresetsCardPage(onSelectPreset: (String) -> Unit) {
    val presets = listOf(
        "Push Day" to "Chest & Triceps",
        "Pull Day" to "Back & Biceps",
        "Leg Day" to "Quads & Calves",
        "Arms & Core" to "Full Arms"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 18.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "QUICK PRESETS",
            color = TextMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp
        )

        Spacer(modifier = Modifier.height(6.dp))

        presets.forEach { (name, subtitle) ->
            Card(
                onClick = { onSelectPreset(name) },
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .padding(vertical = 2.dp),
                backgroundPainter = CardDefaults.cardBackgroundPainter(
                    startBackgroundColor = SurfaceDark,
                    endBackgroundColor = SurfaceDark
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(name, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(subtitle, color = TextMuted, fontSize = 8.sp)
                    }
                    Text("▶", color = PrimaryLime, fontSize = 9.sp)
                }
            }
        }
    }
}
