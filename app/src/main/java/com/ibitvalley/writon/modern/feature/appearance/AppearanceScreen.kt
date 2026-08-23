package com.ibitvalley.writon.modern.feature.appearance
import androidx.compose.ui.res.stringResource

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.*
import com.ibitvalley.writon.modern.core.preferences.UserPreferences

private val EditorialSerif = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private val ModernSans = FontFamily.Default
private val TypewriterMono = FontFamily.Monospace

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppearanceScreen(
    userPreferences: UserPreferences,
    onBackClick: () -> Unit,
    onThemeChanged: (String) -> Unit = {}
) {
    var themeMode by remember { mutableStateOf(userPreferences.themeMode) }
    var fontSizeSp by remember { mutableFloatStateOf(userPreferences.readerFontSizeSp) }
    var lineMultiplier by remember { mutableFloatStateOf(userPreferences.readerLineHeightMultiplier) }
    var fontFamilyChoice by remember { mutableStateOf(userPreferences.readerFontFamily) }

    fun updateTheme(newTheme: String) {
        themeMode = newTheme
        userPreferences.themeMode = newTheme
        onThemeChanged(newTheme)
    }

    fun updateFontSize(newSize: Float) {
        fontSizeSp = newSize
        userPreferences.readerFontSizeSp = newSize
    }

    fun updateLineMultiplier(newMultiplier: Float) {
        lineMultiplier = newMultiplier
        userPreferences.readerLineHeightMultiplier = newMultiplier
    }

    fun updateFontFamily(newFamily: String) {
        fontFamilyChoice = newFamily
        userPreferences.readerFontFamily = newFamily
    }

    val previewFontFamily = when (fontFamilyChoice) {
        "sans" -> ModernSans
        "mono" -> TypewriterMono
        else -> EditorialSerif
    }

    val isSystemDark = androidx.compose.foundation.isSystemInDarkTheme()
    val resolvedTheme = when (themeMode.lowercase()) {
        "system" -> if (isSystemDark) "dark" else "paper"
        else -> themeMode.lowercase()
    }

    // Preview colors based on active theme
    val (previewBg, previewCard, previewText, previewTextSub, previewAccent) = when (resolvedTheme) {
        "sepia" -> Tuple5(SepiaBackground, SepiaSurfaceCard, SepiaTextPrimary, SepiaTextSecondary, SepiaPrimary)
        "dark", "obsidian" -> Tuple5(ObsidianBackground, ObsidianSurfaceCard, ObsidianTextPrimary, ObsidianTextSecondary, ObsidianPrimary)
        else -> Tuple5(BrandBeige, SurfacePaper, Ink, InkMuted, BrandRed)
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        stringResource(R.string.appearance_title),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontFamily = EditorialSerif,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Image(
                            painterResource(R.drawable.ic_back),
                            contentDescription = "Back",
                            modifier = Modifier.size(24.dp),
                            colorFilter = androidx.compose.ui.graphics.ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Live Interactive Preview Box
            item {
                Text(
                    stringResource(R.string.appearance_preview),
                    style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(8.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(WritOnRadius.card),
                    color = previewCard,
                    border = BorderStroke(1.dp, previewAccent.copy(alpha = 0.25f)),
                    shadowElevation = WritOnElevation.raised
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            "ON CRAFT & STILLNESS",
                            fontFamily = previewFontFamily,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = previewAccent,
                            letterSpacing = 1.2.sp
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.appearance_preview_title),
                            fontFamily = previewFontFamily,
                            fontSize = (fontSizeSp + 4).sp,
                            lineHeight = ((fontSizeSp + 4) * 1.3).sp,
                            fontWeight = FontWeight.Bold,
                            color = previewText
                        )
                        Spacer(Modifier.height(10.dp))
                        Text(
                            "The craft of writing is not merely about stringing words together; it is the deliberate shaping of silence and sound, breathing life into quiet spaces.",
                            fontFamily = previewFontFamily,
                            fontSize = fontSizeSp.sp,
                            lineHeight = (fontSizeSp * lineMultiplier).sp,
                            color = previewText
                        )
                    }
                }
            }

            // Theme Selection Section
            item {
                Text(
                    "COLOR THEME",
                    style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    ThemeOptionCard(
                        title = "Paper",
                        subtitle = "Warm Light",
                        cardColor = SurfacePaper,
                        textColor = Ink,
                        accentColor = BrandRed,
                        isSelected = themeMode == "paper",
                        modifier = Modifier.weight(1f),
                        onClick = { updateTheme("paper") }
                    )
                    ThemeOptionCard(
                        title = "Sepia",
                        subtitle = "Book Cafe",
                        cardColor = SepiaSurfaceCard,
                        textColor = SepiaTextPrimary,
                        accentColor = SepiaPrimary,
                        isSelected = themeMode == "sepia",
                        modifier = Modifier.weight(1f),
                        onClick = { updateTheme("sepia") }
                    )
                    ThemeOptionCard(
                        title = "Dark",
                        subtitle = "Obsidian",
                        cardColor = ObsidianSurfaceCard,
                        textColor = ObsidianTextPrimary,
                        accentColor = ObsidianPrimary,
                        isSelected = themeMode == "dark" || themeMode == "obsidian",
                        modifier = Modifier.weight(1f),
                        onClick = { updateTheme("dark") }
                    )
                    ThemeOptionCard(
                        title = "System",
                        subtitle = "Auto",
                        cardColor = MaterialTheme.colorScheme.surfaceVariant,
                        textColor = MaterialTheme.colorScheme.onSurface,
                        accentColor = MaterialTheme.colorScheme.primary,
                        isSelected = themeMode == "system",
                        modifier = Modifier.weight(1f),
                        onClick = { updateTheme("system") }
                    )
                }
            }

            // Font Size Section
            item {
                Text(
                    "TEXT SIZE (${fontSizeSp.toInt()} sp)",
                    style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(10.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(WritOnRadius.card),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = WritOnElevation.flat,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("A", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Slider(
                                value = fontSizeSp,
                                onValueChange = { updateFontSize(it) },
                                valueRange = 16f..24f,
                                steps = 3,
                                modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
                                colors = SliderDefaults.colors(
                                    thumbColor = MaterialTheme.colorScheme.primary,
                                    activeTrackColor = MaterialTheme.colorScheme.primary
                                )
                            )
                            Text("A", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            listOf(16f to "Small", 18f to "Default", 20f to "Medium", 22f to "Large", 24f to "Huge").forEach { (size, label) ->
                                TextButton(
                                    onClick = { updateFontSize(size) },
                                    colors = ButtonDefaults.textButtonColors(
                                        contentColor = if (fontSizeSp.toInt() == size.toInt()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                ) {
                                    Text(label, fontSize = 12.sp, fontWeight = if (fontSizeSp.toInt() == size.toInt()) FontWeight.Bold else FontWeight.Normal)
                                }
                            }
                        }
                    }
                }
            }

            // Line Spacing Section
            item {
                Text(
                    "LINE SPACING",
                    style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    SegmentOption(
                        title = "Compact",
                        subtitle = "1.3x",
                        isSelected = lineMultiplier <= 1.35f,
                        modifier = Modifier.weight(1f),
                        onClick = { updateLineMultiplier(1.3f) }
                    )
                    SegmentOption(
                        title = "Relaxed",
                        subtitle = "1.6x",
                        isSelected = lineMultiplier in 1.36f..1.65f,
                        modifier = Modifier.weight(1f),
                        onClick = { updateLineMultiplier(1.6f) }
                    )
                    SegmentOption(
                        title = "Spacious",
                        subtitle = "1.9x",
                        isSelected = lineMultiplier > 1.65f,
                        modifier = Modifier.weight(1f),
                        onClick = { updateLineMultiplier(1.9f) }
                    )
                }
            }

            // Typeface Family Section
            item {
                Text(
                    "TYPEFACE STYLE",
                    style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    SegmentOption(
                        title = "Serif",
                        subtitle = "Editorial",
                        isSelected = fontFamilyChoice == "serif",
                        fontFamily = EditorialSerif,
                        modifier = Modifier.weight(1f),
                        onClick = { updateFontFamily("serif") }
                    )
                    SegmentOption(
                        title = "Sans",
                        subtitle = "Clean",
                        isSelected = fontFamilyChoice == "sans",
                        fontFamily = ModernSans,
                        modifier = Modifier.weight(1f),
                        onClick = { updateFontFamily("sans") }
                    )
                    SegmentOption(
                        title = "Mono",
                        subtitle = "Typewriter",
                        isSelected = fontFamilyChoice == "mono",
                        fontFamily = TypewriterMono,
                        modifier = Modifier.weight(1f),
                        onClick = { updateFontFamily("mono") }
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun ThemeOptionCard(
    title: String,
    subtitle: String,
    cardColor: Color,
    textColor: Color,
    accentColor: Color,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .height(90.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = cardColor,
        border = BorderStroke(
            if (isSelected) 2.dp else 1.dp,
            if (isSelected) accentColor else Color.Gray.copy(alpha = 0.25f)
        ),
        shadowElevation = if (isSelected) 4.dp else 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(accentColor)
            )
            Spacer(Modifier.height(6.dp))
            Text(
                title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = textColor,
                textAlign = TextAlign.Center
            )
            Text(
                subtitle,
                fontSize = 10.sp,
                color = textColor.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun SegmentOption(
    title: String,
    subtitle: String,
    isSelected: Boolean,
    fontFamily: FontFamily = FontFamily.Default,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .height(72.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        border = BorderStroke(
            if (isSelected) 1.5.dp else 1.dp,
            if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                title,
                fontSize = 14.sp,
                fontFamily = fontFamily,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
            )
            Text(
                subtitle,
                fontSize = 11.sp,
                color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f) else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private data class Tuple5<A, B, C, D, E>(
    val a: A, val b: B, val c: C, val d: D, val e: E
)
