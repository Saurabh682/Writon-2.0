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

// Warm Sepia / Book Cafe
val SepiaBackground = Color(0xFFF4ECD8)
val SepiaSurfaceCard = Color(0xFFFAF4E8)
val SepiaSurfaceElevated = Color(0xFFEFE5CE)
val SepiaBorderStroke = Color(0xFFE2D6BC)
val SepiaTextPrimary = Color(0xFF38291F)
val SepiaTextSecondary = Color(0xFF7D6755)
val SepiaPrimary = Color(0xFFD35400)

// Midnight Obsidian / Dark Mode
val ObsidianBackground = Color(0xFF131415)
val ObsidianSurfaceCard = Color(0xFF1D1F21)
val ObsidianSurfaceElevated = Color(0xFF27292C)
val ObsidianBorderStroke = Color(0xFF33363A)
val ObsidianTextPrimary = Color(0xFFEDE8DF)
val ObsidianTextSecondary = Color(0xFFA09B93)
val ObsidianPrimary = Color(0xFFFF7A50)

// Legacy / Active Dark tokens
val DarkBackground = ObsidianBackground
val DarkSurfaceCard = ObsidianSurfaceCard
val DarkSurfaceElevated = ObsidianSurfaceElevated
val DarkBorderStroke = ObsidianBorderStroke
val DarkTextPrimary = ObsidianTextPrimary
val DarkTextSecondary = ObsidianTextSecondary
val DarkPrimary = ObsidianPrimary

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
