package com.gkeliteinfo.gkgymlife.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.gkeliteinfo.gkgymlife.wear.data.WatchHealthManager
import com.gkeliteinfo.gkgymlife.wear.data.WatchSyncRepository
import com.gkeliteinfo.gkgymlife.wear.screens.ActiveSetScreen
import com.gkeliteinfo.gkgymlife.wear.screens.HomeScreen
import com.gkeliteinfo.gkgymlife.wear.screens.RestTimerScreen
import com.gkeliteinfo.gkgymlife.wear.screens.SummaryScreen
import com.gkeliteinfo.gkgymlife.wear.screens.WorkoutScreen
import com.gkeliteinfo.gkgymlife.wear.theme.GkWearTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repository = WatchSyncRepository.getInstance(applicationContext)
        val healthManager = WatchHealthManager.getInstance(applicationContext)

        setContent {
            GkWearTheme {
                WearAppNavigation(repository, healthManager)
            }
        }
    }
}

@Composable
fun WearAppNavigation(
    repository: WatchSyncRepository,
    healthManager: WatchHealthManager
) {
    val navController = rememberSwipeDismissableNavController()

    SwipeDismissableNavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeScreen(
                repository = repository,
                healthManager = healthManager,
                onStartWorkout = {
                    navController.navigate("workout")
                }
            )
        }

        composable("workout") {
            WorkoutScreen(
                repository = repository,
                onSelectExercise = { index ->
                    navController.navigate("active_set/$index")
                },
                onFinishWorkout = {
                    navController.navigate("summary")
                }
            )
        }

        composable("active_set/{index}") { backStackEntry ->
            val indexStr = backStackEntry.arguments?.getString("index") ?: "0"
            val index = indexStr.toIntOrNull() ?: 0

            ActiveSetScreen(
                repository = repository,
                exerciseIndex = index,
                onSetCompleted = { restSeconds ->
                    if (restSeconds > 0) {
                        navController.navigate("rest_timer/$restSeconds")
                    } else {
                        navController.popBackStack()
                    }
                }
            )
        }

        composable("rest_timer/{seconds}") { backStackEntry ->
            val secStr = backStackEntry.arguments?.getString("seconds") ?: "90"
            val seconds = secStr.toIntOrNull() ?: 90

            RestTimerScreen(
                initialSeconds = seconds,
                onTimerFinished = {
                    navController.popBackStack()
                }
            )
        }

        composable("summary") {
            SummaryScreen(
                repository = repository,
                onDone = {
                    navController.navigate("home") {
                        popUpTo("home") { inclusive = true }
                    }
                }
            )
        }
    }
}
