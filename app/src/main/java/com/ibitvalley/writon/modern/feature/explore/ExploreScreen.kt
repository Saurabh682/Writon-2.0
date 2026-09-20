package com.ibitvalley.writon.modern.feature.explore
import androidx.compose.ui.res.stringResource

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import java.util.Locale

private val ExploreEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

@Composable
fun ExploreScreen(
    viewModel: ExploreViewModel,
    onStoryClick: (String) -> Unit,
    onSearchClick: () -> Unit = {},
    onReadingPreferencesClick: () -> Unit = {},
    showCuratedBanner: Boolean = true,
    trendingStoriesLimit: Int = 10
) {
    LaunchedEffect(trendingStoriesLimit) { viewModel.load(trendingStoriesLimit) }
    val context = LocalContext.current
    val appLanguage = ConfigurationCompat.getLocales(LocalConfiguration.current)[0]?.toLanguageTag()
    val displayLocale = ConfigurationCompat.getLocales(LocalConfiguration.current)[0] ?: Locale.getDefault()
    var finderExpanded by rememberSaveable { mutableStateOf(false) }
    var selectedLanguage by rememberSaveable { mutableStateOf<String?>(null) }
    var selectedCategory by rememberSaveable { mutableStateOf<String?>(null) }
    var maxReadingTimeMin by rememberSaveable { mutableStateOf<Int?>(null) }
    val startHere = remember(viewModel.discoveries, appLanguage) {
        selectStartHere(viewModel.discoveries, appLanguage)
    }
    val quickReads = remember(viewModel.discoveries, appLanguage, startHere) {
        selectQuickReads(viewModel.discoveries, appLanguage, startHere.mapTo(mutableSetOf()) { it.id })
    }
    val availableLanguages = remember(viewModel.discoveries) {
        availableFindAReadLanguages(viewModel.discoveries)
    }
    val availableCategories = remember(viewModel.discoveries) {
        availableFindAReadCategories(viewModel.discoveries)
    }
    val finderResults = remember(
        viewModel.discoveries,
        appLanguage,
        selectedLanguage,
        selectedCategory,
        maxReadingTimeMin
    ) {
        selectFindARead(
            posts = viewModel.discoveries,
            preferredLanguage = appLanguage,
            selectedLanguage = selectedLanguage,
            selectedCategory = selectedCategory,
            maxReadingTimeMin = maxReadingTimeMin
        )
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = WritOnSpacing.lg, end = WritOnSpacing.lg, top = WritOnSpacing.md, bottom = WritOnSpacing.xl),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)
    ) {
        item { ExploreHeader(onSearchClick, onReadingPreferencesClick) }
        if (showCuratedBanner) item { ExploreHero() }
        if (viewModel.discoveries.isNotEmpty()) {
            item {
                FindAReadControls(
                    expanded = finderExpanded,
                    languages = availableLanguages,
                    categories = availableCategories,
                    selectedLanguage = selectedLanguage,
                    selectedCategory = selectedCategory,
                    maxReadingTimeMin = maxReadingTimeMin,
                    displayLocale = displayLocale,
                    onExpandedChange = { expanded ->
                        finderExpanded = expanded
                        if (expanded) {
                            WritOnTelemetry.storyFinderOpened(context, viewModel.discoveries.size)
                            viewModel.load(limit = 20)
                        }
                    },
                    onLanguageSelected = { language ->
                        selectedLanguage = language
                        WritOnTelemetry.storyFinderFilterChanged(
                            context = context,
                            dimension = "language",
                            isSet = language != null,
                            resultCount = selectFindARead(
                                viewModel.discoveries,
                                appLanguage,
                                language,
                                selectedCategory,
                                maxReadingTimeMin
                            ).size
                        )
                    },
                    onCategorySelected = { category ->
                        selectedCategory = category
                        WritOnTelemetry.storyFinderFilterChanged(
                            context = context,
                            dimension = "category",
                            isSet = category != null,
                            resultCount = selectFindARead(
                                viewModel.discoveries,
                                appLanguage,
                                selectedLanguage,
                                category,
                                maxReadingTimeMin
                            ).size
                        )
                    },
                    onReadingTimeSelected = { readingTime ->
                        maxReadingTimeMin = readingTime
                        WritOnTelemetry.storyFinderFilterChanged(
                            context = context,
                            dimension = "time",
                            isSet = readingTime != null,
                            resultCount = selectFindARead(
                                viewModel.discoveries,
                                appLanguage,
                                selectedLanguage,
                                selectedCategory,
                                readingTime
                            ).size
                        )
                    },
                    onReset = {
                        selectedLanguage = null
                        selectedCategory = null
                        maxReadingTimeMin = null
                    }
                )
            }
        }
        when {
            viewModel.isLoading && viewModel.discoveries.isEmpty() -> item { ExploreLoading() }
            startHere.isEmpty() -> item {
                ExploreEmpty(
                    onRetry = { viewModel.load(trendingStoriesLimit, force = true) },
                    onSearch = onSearchClick
                )
            }
            finderExpanded -> {
                if (finderResults.isEmpty()) {
                    item {
                        FindAReadEmpty(
                            onReset = {
                                selectedLanguage = null
                                selectedCategory = null
                                maxReadingTimeMin = null
                            },
                            onSearch = onSearchClick
                        )
                    }
                } else {
                    item {
                        ExploreSectionHeader(
                            title = stringResource(R.string.explore_finder_results_title),
                            description = stringResource(R.string.explore_finder_results_desc)
                        )
                    }
                    itemsIndexed(finderResults, key = { _, story -> "finder-${story.id}" }) { index, story ->
                        ExploreStoryCard(
                            story = story,
                            onClick = {
                                WritOnTelemetry.storyFinderStoryOpened(
                                    context = context,
                                    storyId = story.id,
                                    resultPosition = index + 1,
                                    constraintCount = listOf(
                                        selectedLanguage,
                                        selectedCategory,
                                        maxReadingTimeMin
                                    ).count { it != null }
                                )
                                onStoryClick(story.id)
                            }
                        )
                    }
                }
            }
            else -> {
                item {
                    ExploreSectionHeader(
                        title = stringResource(R.string.explore_start_here_title),
                        description = stringResource(R.string.explore_start_here_desc)
                    )
                }
                items(startHere, key = { "start-${it.id}" }) { story ->
                    ExploreStoryCard(story = story, onClick = { onStoryClick(story.id) })
                }
                if (quickReads.isNotEmpty()) {
                    item {
                        ExploreSectionHeader(
                            title = stringResource(R.string.explore_quick_reads_title),
                            description = stringResource(R.string.explore_quick_reads_desc)
                        )
                    }
                    items(quickReads, key = { "quick-${it.id}" }) { story ->
                        ExploreStoryCard(story = story, onClick = { onStoryClick(story.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun FindAReadControls(
    expanded: Boolean,
    languages: List<String>,
    categories: List<String>,
    selectedLanguage: String?,
    selectedCategory: String?,
    maxReadingTimeMin: Int?,
    displayLocale: Locale,
    onExpandedChange: (Boolean) -> Unit,
    onLanguageSelected: (String?) -> Unit,
    onCategorySelected: (String?) -> Unit,
    onReadingTimeSelected: (Int?) -> Unit,
    onReset: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(top = WritOnSpacing.md),
        shape = RoundedCornerShape(WritOnRadius.feature),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(modifier = Modifier.padding(WritOnSpacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.explore_finder_title),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontFamily = ExploreEditorialFamily,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                    Text(
                        text = stringResource(R.string.explore_finder_desc),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (expanded) {
                    TextButton(onClick = { onExpandedChange(false) }) {
                        Text(stringResource(R.string.common_close))
                    }
                } else {
                    OutlinedButton(onClick = { onExpandedChange(true) }) {
                        Text(stringResource(R.string.explore_finder_action))
                    }
                }
            }
            if (expanded) {
                Spacer(Modifier.height(WritOnSpacing.md))
                FinderChoiceRow(
                    label = stringResource(R.string.explore_finder_time_label),
                    choices = listOf(
                        null to stringResource(R.string.explore_finder_any),
                        5 to stringResource(R.string.explore_finder_five_minutes),
                        10 to stringResource(R.string.explore_finder_ten_minutes)
                    ),
                    selected = maxReadingTimeMin,
                    onSelected = onReadingTimeSelected
                )
                if (languages.isNotEmpty()) {
                    Spacer(Modifier.height(WritOnSpacing.sm))
                    FinderChoiceRow(
                        label = stringResource(R.string.explore_finder_language_label),
                        choices = listOf(null to stringResource(R.string.explore_finder_any)) + languages.map { code ->
                            code to Locale.forLanguageTag(code).getDisplayLanguage(displayLocale)
                                .replaceFirstChar { if (it.isLowerCase()) it.titlecase(displayLocale) else it.toString() }
                        },
                        selected = selectedLanguage,
                        onSelected = onLanguageSelected
                    )
                }
                if (categories.isNotEmpty()) {
                    Spacer(Modifier.height(WritOnSpacing.sm))
                    FinderChoiceRow(
                        label = stringResource(R.string.explore_finder_topic_label),
                        choices = listOf(null to stringResource(R.string.explore_finder_any)) +
                            categories.map { it to it },
                        selected = selectedCategory,
                        onSelected = onCategorySelected
                    )
                }
                if (selectedLanguage != null || selectedCategory != null || maxReadingTimeMin != null) {
                    TextButton(onClick = onReset, modifier = Modifier.align(Alignment.End)) {
                        Text(stringResource(R.string.explore_finder_reset))
                    }
                }
            }
        }
    }
}

@Composable
private fun <T> FinderChoiceRow(
    label: String,
    choices: List<Pair<T, String>>,
    selected: T,
    onSelected: (T) -> Unit
) {
    Text(
        text = label,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(Modifier.height(WritOnSpacing.xs))
    LazyRow(horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.xs)) {
        itemsIndexed(choices, key = { index, choice -> "$index-${choice.first}" }) { _, choice ->
            FilterChip(
                selected = selected == choice.first,
                onClick = { onSelected(choice.first) },
                label = { Text(choice.second) }
            )
        }
    }
}

@Composable
private fun FindAReadEmpty(onReset: () -> Unit, onSearch: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.feature),
        color = MaterialTheme.colorScheme.surface
    ) {
        Column(modifier = Modifier.padding(WritOnSpacing.lg)) {
            Text(
                text = stringResource(R.string.explore_finder_empty_title),
                style = MaterialTheme.typography.titleLarge.copy(fontFamily = ExploreEditorialFamily)
            )
            Spacer(Modifier.height(WritOnSpacing.xs))
            Text(
                text = stringResource(R.string.explore_finder_empty_desc),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(WritOnSpacing.md))
            Row(horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.sm)) {
                Button(onClick = onReset) { Text(stringResource(R.string.explore_finder_reset)) }
                OutlinedButton(onClick = onSearch) { Text(stringResource(R.string.common_search)) }
            }
        }
    }
}

@Composable
private fun ExploreHeader(onSearchClick: () -> Unit, onReadingPreferencesClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        WritOnBrandMark(width = 108.dp)
        Spacer(Modifier.weight(1f))
        TextButton(onClick = onReadingPreferencesClick) {
            Text(stringResource(R.string.settings_reading_title))
        }
        IconButton(onClick = onSearchClick) {
            Image(
                painterResource(R.drawable.ic_search),
                contentDescription = stringResource(R.string.common_search),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
            )
        }
    }
}

@Composable
private fun ExploreHero() {
    Column(modifier = Modifier.padding(top = WritOnSpacing.lg)) {
        Text(
            stringResource(R.string.explore_hero_line1),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = ExploreEditorialFamily, fontSize = 42.sp, lineHeight = 48.sp, fontWeight = FontWeight.Normal)
        )
        Text(
            stringResource(R.string.explore_hero_line2),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = ExploreEditorialFamily, fontSize = 42.sp, lineHeight = 48.sp, fontWeight = FontWeight.Normal),
            color = BrandRed
        )
        Spacer(Modifier.height(WritOnSpacing.lg))
        Text(
            stringResource(R.string.explore_hero_desc),
            style = MaterialTheme.typography.bodyLarge.copy(fontSize = 17.sp, lineHeight = 25.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ExploreSectionHeader(title: String, description: String) {
    Column(modifier = Modifier.padding(top = WritOnSpacing.md)) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall.copy(
                fontFamily = ExploreEditorialFamily,
                fontWeight = FontWeight.SemiBold
            )
        )
        Spacer(Modifier.height(3.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ExploreStoryCard(story: PostDto, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.feature),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
        ),
        shadowElevation = WritOnElevation.raised,
        onClick = onClick
    ) {
        Column(modifier = Modifier.padding(WritOnSpacing.md)) {
            Text(
                text = story.category.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = BrandRed
            )
            Spacer(Modifier.height(WritOnSpacing.xs))
            Text(
                text = story.title,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontFamily = ExploreEditorialFamily,
                    fontWeight = FontWeight.SemiBold,
                    lineHeight = 27.sp
                ),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            story.summary?.takeIf { it.isNotBlank() }?.let { summary ->
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    text = summary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(Modifier.height(WritOnSpacing.sm))
            Text(
                text = stringResource(
                    R.string.explore_story_meta,
                    story.author.fullName.ifBlank { story.author.penName },
                    story.readingTimeMin
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ExploreLoading() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator(color = BrandRed)
        Spacer(Modifier.height(WritOnSpacing.md))
        Text(
            text = stringResource(R.string.explore_loading),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ExploreEmpty(onRetry: () -> Unit, onSearch: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(top = WritOnSpacing.lg),
        shape = RoundedCornerShape(WritOnRadius.feature),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(
            modifier = Modifier.padding(WritOnSpacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.explore_empty_title),
                style = MaterialTheme.typography.titleLarge.copy(fontFamily = ExploreEditorialFamily)
            )
            Spacer(Modifier.height(WritOnSpacing.xs))
            Text(
                text = stringResource(R.string.explore_empty_desc),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(WritOnSpacing.md))
            Row(horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.sm)) {
                Button(onClick = onRetry) { Text(stringResource(R.string.explore_retry)) }
                Button(onClick = onSearch) { Text(stringResource(R.string.common_search)) }
            }
        }
    }
}
