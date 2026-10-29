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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.gkeliteinfo.gkgymlife.wear.data.WatchSyncRepository
import com.gkeliteinfo.gkgymlife.wear.theme.BackgroundDark
import com.gkeliteinfo.gkgymlife.wear.theme.PrimaryLime
import com.gkeliteinfo.gkgymlife.wear.theme.SurfaceDark
import com.gkeliteinfo.gkgymlife.wear.theme.TextMuted

@Composable
fun SummaryScreen(
    repository: WatchSyncRepository,
    onDone: () -> Unit
) {
    val activePayload by repository.activePayload.collectAsState()
    val completedSets by repository.completedSets.collectAsState()
    val totalSets = completedSets.values.sum()
    val duration = activePayload?.durationMinutes ?: 45

    Scaffold(
        timeText = { TimeText() },
        modifier = Modifier.background(BackgroundDark)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 14.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "🏆",
                fontSize = 24.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "WORKOUT DONE!",
                color = PrimaryLime,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

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
                    modifier = Modifier.fillMaxWidth().padding(4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "$duration min • ${completedSets.size} exercises",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "$totalSets sets logged",
                        color = TextMuted,
                        fontSize = 10.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            CompactChip(
                onClick = {
                    repository.finishWorkout(durationMinutes = duration) {
                        onDone()
                    }
                },
                label = { Text("Done & Sync", fontWeight = FontWeight.Bold, fontSize = 11.sp) },
                colors = ChipDefaults.primaryChipColors(backgroundColor = PrimaryLime, contentColor = Color.Black),
                modifier = Modifier.fillMaxWidth(0.85f)
            )
        }
    }
}
