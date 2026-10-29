package com.gkeliteinfo.gkgymlife.wear.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
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
fun WorkoutScreen(
    repository: WatchSyncRepository,
    onSelectExercise: (index: Int) -> Unit,
    onFinishWorkout: () -> Unit
) {
    val activePayload by repository.activePayload.collectAsState()
    val completedSets by repository.completedSets.collectAsState()
    val exercises = activePayload?.exercises ?: emptyList()

    Scaffold(
        timeText = { TimeText() },
        modifier = Modifier.background(BackgroundDark)
    ) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 26.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Text(
                    text = activePayload?.workoutType ?: "Workout",
                    color = PrimaryLime,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }

            items(exercises.size) { index ->
                val ex = exercises[index]
                val logged = completedSets[ex.dayExerciseId] ?: 0
                val isDone = logged >= ex.sets

                Card(
                    onClick = { onSelectExercise(index) },
                    modifier = Modifier.fillMaxWidth(),
                    backgroundPainter = CardDefaults.cardBackgroundPainter(
                        startBackgroundColor = if (isDone) Color(0xFF1E280A) else SurfaceDark,
                        endBackgroundColor = if (isDone) Color(0xFF1E280A) else SurfaceDark
                    )
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = ex.exerciseName,
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "${ex.sets} sets • ${ex.reps} reps",
                                color = TextMuted,
                                fontSize = 10.sp
                            )
                        }

                        if (logged > 0) {
                            Text(
                                text = if (isDone) "✓" else "$logged/${ex.sets}",
                                color = if (isDone) PrimaryLime else Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(6.dp))
                CompactChip(
                    onClick = onFinishWorkout,
                    label = { Text("✓ Finish Workout", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                    colors = ChipDefaults.primaryChipColors(backgroundColor = PrimaryLime, contentColor = Color.Black),
                    modifier = Modifier.fillMaxWidth(0.9f)
                )
            }
        }
    }
}
