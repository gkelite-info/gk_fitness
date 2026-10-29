package com.gkeliteinfo.gkgymlife.wear.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.gkeliteinfo.gkgymlife.wear.data.WatchHealthManager
import com.gkeliteinfo.gkgymlife.wear.data.WatchSyncRepository
import com.gkeliteinfo.gkgymlife.wear.theme.BackgroundDark
import com.gkeliteinfo.gkgymlife.wear.theme.PrimaryLime
import com.gkeliteinfo.gkgymlife.wear.theme.SurfaceDark
import com.gkeliteinfo.gkgymlife.wear.theme.TextMuted

@Composable
fun HomeScreen(
    repository: WatchSyncRepository,
    healthManager: WatchHealthManager,
    onStartWorkout: () -> Unit
) {
    val activePayload by repository.activePayload.collectAsState()
    val steps by healthManager.steps.collectAsState()
    val heartRate by healthManager.heartRate.collectAsState()
    val waterIntake by healthManager.waterIntakeMl.collectAsState()
    val waterGoal by healthManager.waterGoalMl.collectAsState()

    var isPhoneConnected by remember { mutableStateOf<Boolean?>(null) }
    var connectedPhoneName by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        repository.checkPhoneConnection { connected, name ->
            isPhoneConnected = connected
            connectedPhoneName = name
        }
    }

    Scaffold(
        timeText = { TimeText() },
        modifier = Modifier.background(BackgroundDark)
    ) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 22.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            item {
                Text(
                    text = "GK GYMLIFE",
                    color = PrimaryLime,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }

            // Phone Connection Status Card
            item {
                Card(
                    onClick = {
                        repository.checkPhoneConnection { connected, name ->
                            isPhoneConnected = connected
                            connectedPhoneName = name
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    backgroundPainter = CardDefaults.cardBackgroundPainter(
                        startBackgroundColor = SurfaceDark,
                        endBackgroundColor = SurfaceDark
                    )
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = if (isPhoneConnected == true) "🟢" else "⚪",
                            fontSize = 10.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = when (isPhoneConnected) {
                                true -> connectedPhoneName ?: "Phone Connected"
                                false -> "Phone Disconnected"
                                else -> "Checking Phone..."
                            },
                            color = if (isPhoneConnected == true) Color.White else TextMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            // Active Synced Workout (From Phone)
            if (activePayload != null) {
                val payload = activePayload!!
                item {
                    Text(
                        text = "ACTIVE WORKOUT",
                        color = PrimaryLime,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                item {
                    Card(
                        onClick = onStartWorkout,
                        modifier = Modifier.fillMaxWidth(),
                        backgroundPainter = CardDefaults.cardBackgroundPainter(
                            startBackgroundColor = SurfaceDark,
                            endBackgroundColor = SurfaceDark
                        )
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = payload.workoutType,
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${payload.exercises.size} exercises • ${payload.durationMinutes} min",
                                color = TextMuted,
                                fontSize = 10.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                item {
                    CompactChip(
                        onClick = onStartWorkout,
                        label = { Text("Start Workout", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                        colors = ChipDefaults.primaryChipColors(backgroundColor = PrimaryLime, contentColor = Color.Black),
                        modifier = Modifier.fillMaxWidth(0.9f)
                    )
                }
            }

            // Daily Health Metrics Card (Steps & Heart Rate)
            item {
                Card(
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.fillMaxWidth(),
                    backgroundPainter = CardDefaults.cardBackgroundPainter(
                        startBackgroundColor = SurfaceDark,
                        endBackgroundColor = SurfaceDark
                    )
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("👟 STEPS", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                            Text("$steps", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(22.dp)
                                .background(Color(0xFF2E2E32))
                        )
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("❤️ PULSE", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                            Text("$heartRate bpm", color = PrimaryLime, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Water Tracking Card
            item {
                Card(
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.fillMaxWidth(),
                    backgroundPainter = CardDefaults.cardBackgroundPainter(
                        startBackgroundColor = SurfaceDark,
                        endBackgroundColor = SurfaceDark
                    )
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("💧 WATER INTAKE", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "$waterIntake / $waterGoal ml",
                            color = Color(0xFF64B5F6),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CompactChip(
                                onClick = { healthManager.addWater(250) },
                                label = { Text("+250ml", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                                colors = ChipDefaults.secondaryChipColors(backgroundColor = Color(0xFF1E2838))
                            )
                            CompactChip(
                                onClick = { healthManager.addWater(500) },
                                label = { Text("+500ml", fontSize = 10.sp, fontWeight = FontWeight.SemiBold) },
                                colors = ChipDefaults.secondaryChipColors(backgroundColor = Color(0xFF1E2838))
                            )
                        }
                    }
                }
            }

            // Quick Workout Presets Header
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "QUICK WORKOUTS",
                    color = TextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Quick Workout Presets
            val presets = listOf(
                "Push Day (Chest & Triceps)",
                "Pull Day (Back & Biceps)",
                "Leg Day (Quads & Calves)",
                "Arms & Core"
            )

            items(presets.size) { index ->
                val presetName = presets[index]
                Card(
                    onClick = {
                        repository.loadWorkoutPreset(presetName)
                        onStartWorkout()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    backgroundPainter = CardDefaults.cardBackgroundPainter(
                        startBackgroundColor = SurfaceDark,
                        endBackgroundColor = SurfaceDark
                    )
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = presetName,
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text("▶", color = PrimaryLime, fontSize = 10.sp)
                    }
                }
            }
        }
    }
}
