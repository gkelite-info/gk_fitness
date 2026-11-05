package com.gkeliteinfo.gkgymlife.wear.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Card
import androidx.wear.compose.material.CardDefaults
import androidx.wear.compose.material.Text
import com.gkeliteinfo.gkgymlife.wear.theme.SurfaceDark
import com.gkeliteinfo.gkgymlife.wear.theme.TextMuted

// Authentic Apple Watch Activity Ring Colors
val RingMoveColor = Color(0xFFFA114F)
val RingMoveTrack = Color(0xFF2A0510)

val RingExerciseColor = Color(0xFFA1FF00)
val RingExerciseTrack = Color(0xFF142702)

val RingStandColor = Color(0xFF00F0FF)
val RingStandTrack = Color(0xFF00282E)

/**
 * Concentric 3-ring Activity Rings matching Apple Watch Activity design
 * for Wear OS (Galaxy Watch, Pixel Watch).
 */
@Composable
fun WearActivityRings(
    moveProgress: Float,
    exerciseProgress: Float,
    standProgress: Float,
    modifier: Modifier = Modifier,
    size: Dp = 100.dp,
    strokeWidthDp: Dp = 9.dp,
    gapDp: Dp = 2.5.dp
) {
    val animatedMove by animateFloatAsState(
        targetValue = moveProgress.coerceIn(0f, 2f),
        animationSpec = tween(durationMillis = 900, easing = FastOutSlowInEasing),
        label = "moveProgress"
    )
    val animatedExercise by animateFloatAsState(
        targetValue = exerciseProgress.coerceIn(0f, 2f),
        animationSpec = tween(durationMillis = 1100, easing = FastOutSlowInEasing),
        label = "exerciseProgress"
    )
    val animatedStand by animateFloatAsState(
        targetValue = standProgress.coerceIn(0f, 2f),
        animationSpec = tween(durationMillis = 1300, easing = FastOutSlowInEasing),
        label = "standProgress"
    )

    Canvas(modifier = modifier.size(size)) {
        val strokeWidth = strokeWidthDp.toPx()
        val gap = gapDp.toPx()
        val step = strokeWidth + gap

        val centerOffset = Offset(this.size.width / 2f, this.size.height / 2f)

        // Radii for outer, middle, inner rings
        val rMove = (this.size.minDimension / 2f) - (strokeWidth / 2f)
        val rExercise = rMove - step
        val rStand = rExercise - step

        fun drawRing(radius: Float, progress: Float, strokeColor: Color, trackColor: Color) {
            val ringDiameter = radius * 2f
            val topLeft = Offset(centerOffset.x - radius, centerOffset.y - radius)
            val arcSize = Size(ringDiameter, ringDiameter)

            // 1. Draw background dark track
            drawArc(
                color = trackColor,
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth)
            )

            // 2. Draw animated progress arc
            if (progress > 0.005f) {
                val sweep = (progress * 360f).coerceAtMost(360f)
                drawArc(
                    color = strokeColor,
                    startAngle = -90f,
                    sweepAngle = sweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )

                // If progress > 1.0 (overachieved), draw overlap extension
                if (progress > 1f) {
                    val overlapSweep = ((progress - 1f) * 360f).coerceAtMost(360f)
                    drawArc(
                        color = strokeColor,
                        startAngle = -90f,
                        sweepAngle = overlapSweep,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                    )
                }
            }
        }

        // Draw from outer to inner
        drawRing(rMove, animatedMove, RingMoveColor, RingMoveTrack)
        drawRing(rExercise, animatedExercise, RingExerciseColor, RingExerciseTrack)
        drawRing(rStand, animatedStand, RingStandColor, RingStandTrack)
    }
}

/**
 * Activity Rings Card with metrics breakdown for Wear OS
 */
@Composable
fun WearActivityRingsCard(
    moveCalories: Int,
    moveGoal: Int = 1000,
    exerciseMinutes: Int,
    exerciseGoal: Int = 30,
    standHours: Int,
    standGoal: Int = 12,
    modifier: Modifier = Modifier
) {
    val moveP = if (moveGoal > 0) moveCalories.toFloat() / moveGoal else 0f
    val exerciseP = if (exerciseGoal > 0) exerciseMinutes.toFloat() / exerciseGoal else 0f
    val standP = if (standGoal > 0) standHours.toFloat() / standGoal else 0f

    Card(
        onClick = {},
        enabled = false,
        modifier = modifier.fillMaxWidth(),
        backgroundPainter = CardDefaults.cardBackgroundPainter(
            startBackgroundColor = SurfaceDark,
            endBackgroundColor = SurfaceDark
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "ACTIVITY RINGS",
                color = TextMuted,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Concentric Rings in center
            WearActivityRings(
                moveProgress = moveP,
                exerciseProgress = exerciseP,
                standProgress = standP,
                size = 88.dp,
                strokeWidthDp = 8.dp,
                gapDp = 2.dp
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Mini stats labels: Move, Exercise, Stand
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Move
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("MOVE", color = RingMoveColor, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "$moveCalories",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "/$moveGoal",
                        color = TextMuted,
                        fontSize = 8.sp
                    )
                }

                // Exercise
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("EXERCISE", color = RingExerciseColor, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "${exerciseMinutes}m",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "/${exerciseGoal}m",
                        color = TextMuted,
                        fontSize = 8.sp
                    )
                }

                // Stand
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("STAND", color = RingStandColor, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "${standHours}h",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "/${standGoal}h",
                        color = TextMuted,
                        fontSize = 8.sp
                    )
                }
            }
        }
    }
}

