package com.ibitvalley.writon.modern.feature.reader.card

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Target export aspect ratios and dimensions for Story Cards.
 */
enum class CardExportSize(
    val ratioLabel: String,
    val description: String,
    val targetWidthPx: Int,
    val targetHeightPx: Int,
    val maxChars: Int,
    val previewWidthDp: Dp,
    val previewHeightDp: Dp
) {
    STORY_9_16(
        ratioLabel = "9:16",
        description = "Story & Reels",
        targetWidthPx = 1080,
        targetHeightPx = 1920,
        maxChars = 280,
        previewWidthDp = 220.dp,
        previewHeightDp = 391.dp
    ),
    PORTRAIT_4_5(
        ratioLabel = "4:5",
        description = "Feed Portrait",
        targetWidthPx = 1080,
        targetHeightPx = 1350,
        maxChars = 220,
        previewWidthDp = 232.dp,
        previewHeightDp = 290.dp
    ),
    SQUARE_1_1(
        ratioLabel = "1:1",
        description = "Feed Square",
        targetWidthPx = 1080,
        targetHeightPx = 1080,
        maxChars = 180,
        previewWidthDp = 240.dp,
        previewHeightDp = 240.dp
    ),
    LANDSCAPE_16_9(
        ratioLabel = "16:9",
        description = "X / Threads",
        targetWidthPx = 1200,
        targetHeightPx = 675,
        maxChars = 140,
        previewWidthDp = 280.dp,
        previewHeightDp = 158.dp
    );

    val aspectRatio: Float
        get() = targetWidthPx.toFloat() / targetHeightPx.toFloat()
}

enum class CardTheme(val label: String) {
    PAPER("Paper"),
    OBSIDIAN("Obsidian")
}
