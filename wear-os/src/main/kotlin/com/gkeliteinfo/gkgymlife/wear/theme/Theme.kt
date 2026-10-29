package com.gkeliteinfo.gkgymlife.wear.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme

val PrimaryLime = Color(0xFFDFFF00)
val PrimaryVariant = Color(0xFFCCF200)
val BackgroundDark = Color(0xFF000000)
val SurfaceDark = Color(0xFF18181B)
val BorderDark = Color(0xFF27272A)
val TextMuted = Color(0xFF8E8E8E)
val TextLight = Color(0xFFFFFFFF)
val ErrorRed = Color(0xFFFF453A)
val SuccessGreen = Color(0xFF30D158)

val WearColorPalette = Colors(
    primary = PrimaryLime,
    primaryVariant = PrimaryVariant,
    secondary = PrimaryLime,
    background = BackgroundDark,
    surface = SurfaceDark,
    error = ErrorRed,
    onPrimary = Color.Black,
    onSecondary = Color.Black,
    onBackground = TextLight,
    onSurface = TextLight,
    onError = TextLight
)

@Composable
fun GkWearTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = WearColorPalette,
        content = content
    )
}
