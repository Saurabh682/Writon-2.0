package com.ibitvalley.writon.modern.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = DarkBackground,
    primaryContainer = BrandRedOnSoft,
    onPrimaryContainer = DarkTextPrimary,
    secondary = DarkTextSecondary,
    onSecondary = DarkBackground,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurfaceCard,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurfaceElevated,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkBorderStroke,
    error = Negative,
    onError = SurfacePaper
)

private val LightColorScheme = lightColorScheme(
    primary = BrandRed,
    onPrimary = SurfacePaper,
    primaryContainer = BrandRedSoft,
    onPrimaryContainer = BrandRedOnSoft,
    secondary = InkMuted,
    onSecondary = SurfacePaper,
    background = LightBackground,
    onBackground = LightTextPrimary,
    surface = LightSurfaceCard,
    onSurface = LightTextPrimary,
    surfaceVariant = LightSurfaceElevated,
    onSurfaceVariant = LightTextSecondary,
    outline = BorderStrong,
    error = Negative,
    onError = SurfacePaper
)

private val SepiaColorScheme = lightColorScheme(
    primary = SepiaPrimary,
    onPrimary = SepiaSurfaceCard,
    primaryContainer = SepiaSurfaceElevated,
    onPrimaryContainer = SepiaPrimary,
    secondary = SepiaTextSecondary,
    onSecondary = SepiaSurfaceCard,
    background = SepiaBackground,
    onBackground = SepiaTextPrimary,
    surface = SepiaSurfaceCard,
    onSurface = SepiaTextPrimary,
    surfaceVariant = SepiaSurfaceElevated,
    onSurfaceVariant = SepiaTextSecondary,
    outline = SepiaBorderStroke,
    error = SepiaPrimary,
    onError = SepiaSurfaceCard
)

fun getThemeColorScheme(themeMode: String, isSystemDark: Boolean): androidx.compose.material3.ColorScheme {
    return when (themeMode.lowercase()) {
        "dark", "obsidian" -> DarkColorScheme
        "sepia" -> SepiaColorScheme
        "paper", "light" -> LightColorScheme
        else -> if (isSystemDark) DarkColorScheme else LightColorScheme
    }
}

@Composable
fun WritOnTheme(
    themeMode: String = "paper",
    content: @Composable () -> Unit
) {
    val isSystemDark = isSystemInDarkTheme()
    val colorScheme = getThemeColorScheme(themeMode, isSystemDark)

    MaterialTheme(
        colorScheme = colorScheme,
        typography = EditorialTypography,
        content = content
    )
}
