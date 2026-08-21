package com.ibitvalley.writon.modern.core.designsystem.theme

import androidx.compose.ui.graphics.Color

// The complete WritOn palette. New UI must use one of these seven values.
val BrandBeige = Color(0xFFF8F4EE)
val SurfacePaper = Color(0xFFFFFDF9)
val SurfaceMuted = Color(0xFFF2ECE4)
val Ink = Color(0xFF151718)
val InkMuted = Color(0xFF6D6963)
val BorderStrong = Color(0xFFE9E1D7)
val BorderSubtle = Color(0xFFE9E1D7)
val BrandRed = Color(0xFFE75A2A)
val BrandRedPressed = Color(0xFFE75A2A)
val BrandRedSoft = Color(0xFFF2ECE4)
val BrandRedOnSoft = Color(0xFFE75A2A)
val AccentBookmark = BrandRed
val AccentAIGlow = BrandRed
val Positive = BrandRed
val Negative = BrandRed

// Dark mode intentionally keeps the same approved editorial palette.
val DarkBackground = BrandBeige
val DarkSurfaceCard = SurfacePaper
val DarkSurfaceElevated = SurfaceMuted
val DarkBorderStroke = BorderSubtle
val DarkTextPrimary = Ink
val DarkTextSecondary = InkMuted
val DarkPrimary = BrandRed

// Compatibility aliases for existing feature code. New code should prefer the
// semantic names above or MaterialTheme.colorScheme roles.
val AccentPrimary = BrandRed
val AccentHover = BrandRedPressed
val AccentClap = BrandRed
val LightBackground = BrandBeige
val LightSurfaceCard = SurfacePaper
val LightSurfaceElevated = SurfacePaper
val LightBorderStroke = BorderSubtle
val LightTextPrimary = Ink
val LightTextSecondary = InkMuted
