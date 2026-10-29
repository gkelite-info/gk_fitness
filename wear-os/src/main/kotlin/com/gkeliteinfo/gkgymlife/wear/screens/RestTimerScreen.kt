package com.gkeliteinfo.gkgymlife.wear.screens

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.gkeliteinfo.gkgymlife.wear.theme.BackgroundDark
import com.gkeliteinfo.gkgymlife.wear.theme.PrimaryLime
import com.gkeliteinfo.gkgymlife.wear.theme.SurfaceDark
import com.gkeliteinfo.gkgymlife.wear.theme.TextMuted
import kotlinx.coroutines.delay

@Composable
fun RestTimerScreen(
    initialSeconds: Int = 90,
    onTimerFinished: () -> Unit
) {
    var secondsLeft by remember { mutableStateOf(initialSeconds) }
    val totalSeconds = remember { maxOf(initialSeconds, 1) }
    val context = LocalContext.current

    fun vibrateFinish() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 200, 100, 200, 100, 400), -1)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                @Suppress("DEPRECATION")
                vibrator?.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE))
            }
        } catch (_: Exception) {}
    }

    LaunchedEffect(secondsLeft) {
        if (secondsLeft > 0) {
            delay(1000L)
            secondsLeft -= 1
        } else {
            vibrateFinish()
            delay(400L)
            onTimerFinished()
        }
    }

    val progress = (secondsLeft.toFloat() / totalSeconds.toFloat()).coerceIn(0f, 1f)
    val minutes = secondsLeft / 60
    val secs = secondsLeft % 60
    val formattedTime = String.format("%d:%02d", minutes, secs)

    Scaffold(
        timeText = { TimeText() },
        modifier = Modifier.background(BackgroundDark)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(
                progress = progress,
                modifier = Modifier.fillMaxSize().padding(12.dp),
                indicatorColor = PrimaryLime,
                trackColor = SurfaceDark,
                strokeWidth = 6.dp
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "REST",
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = formattedTime,
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CompactChip(
                        onClick = onTimerFinished,
                        label = { Text("Skip", fontSize = 10.sp) },
                        colors = ChipDefaults.secondaryChipColors(backgroundColor = SurfaceDark)
                    )
                    CompactChip(
                        onClick = { secondsLeft += 15 },
                        label = { Text("+15s", fontSize = 10.sp) },
                        colors = ChipDefaults.secondaryChipColors(backgroundColor = SurfaceDark)
                    )
                }
            }
        }
    }
}
