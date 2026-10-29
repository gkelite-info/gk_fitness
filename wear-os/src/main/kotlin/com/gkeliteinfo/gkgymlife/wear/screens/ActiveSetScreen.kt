package com.gkeliteinfo.gkgymlife.wear.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.gkeliteinfo.gkgymlife.wear.data.WatchSyncRepository
import com.gkeliteinfo.gkgymlife.wear.theme.BackgroundDark
import com.gkeliteinfo.gkgymlife.wear.theme.PrimaryLime
import com.gkeliteinfo.gkgymlife.wear.theme.SurfaceDark
import com.gkeliteinfo.gkgymlife.wear.theme.TextMuted

@Composable
fun ActiveSetScreen(
    repository: WatchSyncRepository,
    exerciseIndex: Int,
    onSetCompleted: (restSeconds: Int) -> Unit
) {
    val activePayload by repository.activePayload.collectAsState()
    val completedSets by repository.completedSets.collectAsState()
    val exercise = activePayload?.exercises?.getOrNull(exerciseIndex)

    if (exercise == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Exercise not found", color = Color.White)
        }
        return
    }

    val currentSetNumber = (completedSets[exercise.dayExerciseId] ?: 0) + 1
    var weight by remember { mutableStateOf(50.0) }
    var reps by remember {
        val parsed = exercise.reps.filter { it.isDigit() }.toIntOrNull() ?: 10
        mutableStateOf(parsed)
    }

    Scaffold(
        timeText = { TimeText() },
        modifier = Modifier.background(BackgroundDark)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = exercise.exerciseName,
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "Set $currentSetNumber of ${exercise.sets}",
                    color = PrimaryLime,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Adjusters Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Weight Controller
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("WEIGHT", color = TextMuted, fontSize = 9.sp)
                    Text("${weight}kg", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        CompactButton(
                            onClick = { if (weight >= 2.5) weight -= 2.5 },
                            colors = ButtonDefaults.secondaryButtonColors(backgroundColor = SurfaceDark)
                        ) {
                            Text("-", color = Color.White, fontSize = 14.sp)
                        }
                        CompactButton(
                            onClick = { weight += 2.5 },
                            colors = ButtonDefaults.secondaryButtonColors(backgroundColor = SurfaceDark)
                        ) {
                            Text("+", color = Color.White, fontSize = 14.sp)
                        }
                    }
                }

                // Reps Controller
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("REPS", color = TextMuted, fontSize = 9.sp)
                    Text("$reps", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        CompactButton(
                            onClick = { if (reps > 1) reps -= 1 },
                            colors = ButtonDefaults.secondaryButtonColors(backgroundColor = SurfaceDark)
                        ) {
                            Text("-", color = Color.White, fontSize = 14.sp)
                        }
                        CompactButton(
                            onClick = { reps += 1 },
                            colors = ButtonDefaults.secondaryButtonColors(backgroundColor = SurfaceDark)
                        ) {
                            Text("+", color = Color.White, fontSize = 14.sp)
                        }
                    }
                }
            }

            // Complete Set Button
            CompactChip(
                onClick = {
                    repository.logSet(
                        dayExerciseId = exercise.dayExerciseId,
                        setNumber = currentSetNumber,
                        weight = weight,
                        reps = reps,
                        setType = "working"
                    )
                    val restDuration = if (activePayload?.restTimerEnabled == true) {
                        activePayload?.restTimerSeconds ?: 90
                    } else {
                        0
                    }
                    onSetCompleted(restDuration)
                },
                label = { Text("✓ Complete Set", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                colors = ChipDefaults.primaryChipColors(backgroundColor = PrimaryLime, contentColor = Color.Black),
                modifier = Modifier.fillMaxWidth(0.9f)
            )
        }
    }
}
