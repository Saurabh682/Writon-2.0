package com.ibitvalley.writon.modern.feature.reader.card

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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
    val decorativeQuoteColor = accentColor.copy(alpha = if (isDark) 0.72f else 0.62f)

    val quoteGlyphSize = if (isExportRender) 58.sp else 44.sp
    val excerptFontSize = if (isExportRender) when (exportSize) {
        CardExportSize.LANDSCAPE_16_9 -> 25.sp
        CardExportSize.SQUARE_1_1 -> 30.sp
        CardExportSize.PORTRAIT_4_5 -> 33.sp
        CardExportSize.STORY_9_16 -> 36.sp
    } else when (exportSize) {
        CardExportSize.LANDSCAPE_16_9 -> 13.sp
        CardExportSize.SQUARE_1_1 -> 15.sp
        CardExportSize.PORTRAIT_4_5 -> 17.sp
        CardExportSize.STORY_9_16 -> 18.sp
    }

    val excerptLineHeight = excerptFontSize * 1.45f

    val titleFontSize = if (isExportRender) 18.sp else 12.sp
    val metaFontSize = if (isExportRender) 14.sp else 10.sp

    val paddingH = if (isExportRender) 48.dp else 18.dp
    val paddingV = if (isExportRender) 34.dp else 14.dp
    val accentBarHeight = if (isExportRender) 5.dp else 3.dp
    val logoWidth = if (isExportRender) 112.dp else 78.dp

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

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    start = paddingH,
                    end = paddingH,
                    top = paddingV + accentBarHeight,
                    bottom = paddingV
                ),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
            ) {
                Text(
                    text = "“",
                    fontFamily = CardDecorativeFamily,
                    fontSize = quoteGlyphSize,
                    lineHeight = quoteGlyphSize,
                    color = decorativeQuoteColor
                )
                Spacer(Modifier.weight(1f))
                WritOnBrandMark(width = logoWidth, tint = BrandRed)
            }

            Box(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentAlignment = androidx.compose.ui.Alignment.CenterStart
            ) {
                Text(
                    text = excerpt,
                    fontFamily = CardSerifFamily,
                    fontSize = excerptFontSize,
                    lineHeight = excerptLineHeight,
                    color = excerptTextColor,
                    fontWeight = FontWeight.Normal,
                    fontStyle = FontStyle.Normal,
                    maxLines = when (exportSize) {
                        CardExportSize.LANDSCAPE_16_9 -> 3
                        CardExportSize.SQUARE_1_1 -> 5
                        CardExportSize.PORTRAIT_4_5 -> 7
                        CardExportSize.STORY_9_16 -> 9
                    },
                    overflow = TextOverflow.Ellipsis
                )
            }

            Column(
                modifier = Modifier.fillMaxWidth()
            ) {
                HorizontalDivider(
                    color = dividerColor,
                    thickness = 1.dp
                )

                Spacer(modifier = Modifier.height(if (isExportRender) 14.dp else 8.dp))
                Text(
                    text = title,
                    fontFamily = CardSerifFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = titleFontSize,
                    color = titleTextColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(if (isExportRender) 4.dp else 2.dp))
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
                Spacer(modifier = Modifier.height(if (isExportRender) 8.dp else 4.dp))
                Text(
                    text = "writon.cc",
                    fontFamily = FontFamily.SansSerif,
                    fontWeight = FontWeight.Medium,
                    fontSize = (metaFontSize.value * 0.85f).sp,
                    color = accentColor
                )
            }
        }
    }
}
