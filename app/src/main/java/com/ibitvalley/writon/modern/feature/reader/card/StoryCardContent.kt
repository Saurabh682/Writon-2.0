package com.ibitvalley.writon.modern.feature.reader.card

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.Ink
import com.ibitvalley.writon.modern.core.designsystem.theme.InkMuted
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianBackground
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianBorderStroke
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianPrimary
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianTextPrimary
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianTextSecondary
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper

private val CardSerifFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

private val CardDecorativeFamily = FontFamily(
    Font(R.font.cormorant_garamond, weight = FontWeight.Normal)
)

/**
 * Visual card layout for export and live preview.
 */
@Composable
fun StoryCardContent(
    excerpt: String,
    title: String,
    authorName: String,
    authorPenName: String,
    theme: CardTheme,
    exportSize: CardExportSize,
    modifier: Modifier = Modifier,
    isExportRender: Boolean = false
) {
    val isDark = theme == CardTheme.OBSIDIAN

    val bgColor = if (isDark) ObsidianBackground else BrandBeige
    val accentColor = if (isDark) ObsidianPrimary else BrandRed
    val excerptTextColor = if (isDark) ObsidianTextPrimary else Ink
    val titleTextColor = if (isDark) ObsidianTextPrimary else Ink
    val authorTextColor = if (isDark) ObsidianTextSecondary else InkMuted
    val dividerColor = if (isDark) ObsidianBorderStroke else Color(0xFFE9E1D7)
    val decorativeQuoteColor = accentColor.copy(alpha = if (isDark) 0.35f else 0.22f)

    // Dynamic typography sizing based on export vs preview and aspect ratio
    val scaleFactor = if (isExportRender) 2.4f else 1.0f

    val quoteGlyphSize = (when (exportSize) {
        CardExportSize.LANDSCAPE_16_9 -> 36.sp
        CardExportSize.SQUARE_1_1 -> 44.sp
        CardExportSize.PORTRAIT_4_5 -> 50.sp
        CardExportSize.STORY_9_16 -> 58.sp
    } * scaleFactor)

    val excerptFontSize = (when (exportSize) {
        CardExportSize.LANDSCAPE_16_9 -> 14.sp
        CardExportSize.SQUARE_1_1 -> 16.sp
        CardExportSize.PORTRAIT_4_5 -> 17.sp
        CardExportSize.STORY_9_16 -> 19.sp
    } * scaleFactor)

    val excerptLineHeight = excerptFontSize * 1.45f

    val titleFontSize = (when (exportSize) {
        CardExportSize.LANDSCAPE_16_9 -> 11.sp
        else -> 13.sp
    } * scaleFactor)

    val metaFontSize = (when (exportSize) {
        CardExportSize.LANDSCAPE_16_9 -> 9.sp
        else -> 11.sp
    } * scaleFactor)

    val paddingH = if (isExportRender) 52.dp else 20.dp
    val paddingV = if (isExportRender) 44.dp else 18.dp
    val accentBarHeight = if (isExportRender) 10.dp else 4.dp
    val logoWidth = if (isExportRender) 210.dp else 84.dp

    Box(
        modifier = modifier
            .background(bgColor)
    ) {
        // Top accent bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(accentBarHeight)
                .background(accentColor)
                .align(Alignment.TopCenter)
        )

        // Main content column
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    start = paddingH,
                    end = paddingH,
                    top = paddingV + accentBarHeight,
                    bottom = paddingV
                ),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Section: Decorative quote and excerpt
            Column(
                modifier = Modifier.fillMaxWidth()
            ) {
                // Large opening quote glyph
                Text(
                    text = "“",
                    fontFamily = CardDecorativeFamily,
                    fontSize = quoteGlyphSize,
                    lineHeight = quoteGlyphSize * 0.7f,
                    color = decorativeQuoteColor,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(if (isExportRender) 12.dp else 4.dp))

                // The curated literary excerpt
                Text(
                    text = excerpt,
                    fontFamily = CardSerifFamily,
                    fontSize = excerptFontSize,
                    lineHeight = excerptLineHeight,
                    color = excerptTextColor,
                    fontWeight = FontWeight.Normal,
                    fontStyle = FontStyle.Normal,
                    maxLines = when (exportSize) {
                        CardExportSize.LANDSCAPE_16_9 -> 4
                        CardExportSize.SQUARE_1_1 -> 7
                        CardExportSize.PORTRAIT_4_5 -> 9
                        CardExportSize.STORY_9_16 -> 12
                    },
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Bottom Section: Attribution, Title, and Brand mark
            Column(
                modifier = Modifier.fillMaxWidth()
            ) {
                HorizontalDivider(
                    color = dividerColor,
                    thickness = if (isExportRender) 2.dp else 1.dp
                )

                Spacer(modifier = Modifier.height(if (isExportRender) 18.dp else 8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    // Story Title & Author Identity
                    Column(
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = title,
                            fontFamily = CardSerifFamily,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = titleFontSize,
                            color = titleTextColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Spacer(modifier = Modifier.height(if (isExportRender) 6.dp else 2.dp))

                        val penTag = if (authorPenName.isNotBlank() && !authorPenName.equals("writon", ignoreCase = true)) {
                            " • @$authorPenName"
                        } else ""

                        Text(
                            text = "by $authorName$penTag",
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Medium,
                            fontSize = metaFontSize,
                            color = authorTextColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Text(
                            text = "writon.cc",
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Normal,
                            fontSize = (metaFontSize.value * 0.9f).sp,
                            color = authorTextColor.copy(alpha = 0.7f)
                        )
                    }

                    Spacer(modifier = Modifier.width(if (isExportRender) 24.dp else 10.dp))

                    // WritOn brand mark
                    WritOnBrandMark(
                        width = logoWidth
                    )
                }
            }
        }
    }
}
