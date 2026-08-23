package com.ibitvalley.writon.modern.feature.library
import androidx.compose.ui.res.stringResource

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.feature.collections.CollectionsViewModel

private val LibraryEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

private enum class LibraryTab(val labelRes: Int) {
    Saved(R.string.library_tab_saved), History(R.string.library_tab_history), Applauds(R.string.library_tab_applauds), Collections(R.string.library_tab_collections)
}

private data class LibraryStory(
    val id: String,
    val category: String,
    val title: String,
    val summary: String,
    val authorName: String,
    val readingTime: Int,
    val applauds: Int
)

private fun PostDto.asLibraryStory() = LibraryStory(
    id = id,
    category = category,
    title = title,
    summary = summary.orEmpty().ifBlank { "A story from ${author.fullName}." },
    authorName = author.fullName,
    readingTime = readingTimeMin,
    applauds = likesCnt
)

@Composable
fun LibraryScreen(
    viewModel: CollectionsViewModel,
    onStoryClick: (String) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onHistoryClick: () -> Unit = {}
) {
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    var newestFirst by remember { mutableStateOf(true) }
    val selectedTab = LibraryTab.entries[selectedTabIndex]
    LaunchedEffect(selectedTab) {
        when (selectedTab) {
            LibraryTab.Saved -> viewModel.loadSaved()
            LibraryTab.Applauds -> viewModel.loadApplauds()
            else -> Unit
        }
    }
    val visibleStories = when (selectedTab) {
        LibraryTab.Saved -> viewModel.savedPosts.map { it.asLibraryStory() }
        LibraryTab.History -> emptyList()
        LibraryTab.Applauds -> viewModel.applaudedPosts.map { it.asLibraryStory() }
        LibraryTab.Collections -> emptyList()
    }.let { stories -> if (newestFirst) stories else stories.reversed() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = WritOnSpacing.lg, end = WritOnSpacing.lg, top = WritOnSpacing.md, bottom = WritOnSpacing.xl),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)
    ) {
        item { LibraryHeader(onSearchClick) }
        item {
            LibraryFilters(
                selectedIndex = selectedTabIndex,
                onSelected = { index ->
                    if (LibraryTab.entries[index] == LibraryTab.History) onHistoryClick()
                    else selectedTabIndex = index
                }
            )
        }
        item { LibrarySectionHeader(selectedTab, visibleStories.size, newestFirst, onToggleOrder = { newestFirst = !newestFirst }) }
        if (visibleStories.isEmpty()) {
            item { EmptyLibraryCollections() }
        } else {
            items(visibleStories, key = { it.id }) { story ->
                LibraryStoryCard(
                    story = story,
                    isBookmarked = selectedTab == LibraryTab.Saved,
                    onClick = { onStoryClick(story.id) },
                    onToggleBookmark = { viewModel.toggleBookmark(story.id) }
                )
            }
        }
    }
}

@Composable
private fun LibraryHeader(onSearchClick: () -> Unit) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            WritOnBrandMark(width = 108.dp)
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onSearchClick) {
                Image(
                    painterResource(R.drawable.ic_search),
                    contentDescription = "Search",
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
            }
            IconButton(onClick = { }) {
                Image(
                    painterResource(R.drawable.ic_more_vertical),
                    contentDescription = "More library options",
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
            }
        }
        Spacer(Modifier.height(WritOnSpacing.lg))
        Text(
            text = stringResource(R.string.library_title),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = LibraryEditorialFamily, fontSize = 42.sp, lineHeight = 48.sp)
        )
        Spacer(Modifier.height(WritOnSpacing.xs))
        Text(
            text = stringResource(R.string.library_subtitle),
            style = MaterialTheme.typography.bodyLarge.copy(fontFamily = LibraryEditorialFamily, fontSize = 18.sp, lineHeight = 25.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(WritOnSpacing.sm))
        Surface(color = BrandRed, shape = CircleShape, modifier = Modifier.width(72.dp).height(4.dp)) { }
        Spacer(Modifier.height(WritOnSpacing.md))
    }
}

@Composable
private fun LibraryFilters(selectedIndex: Int, onSelected: (Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.xs)
    ) {
        LibraryTab.entries.forEachIndexed { index, tab ->
            val selected = index == selectedIndex
            Surface(
                shape = RoundedCornerShape(WritOnRadius.pill),
                color = if (selected) BrandRed.copy(alpha = 0.12f) else Color.Transparent,
                modifier = Modifier.clip(RoundedCornerShape(WritOnRadius.pill)).clickable { onSelected(index) }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = if (selected) 12.dp else 8.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val icon = when (tab) {
                        LibraryTab.Saved -> if (selected) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark_muted
                        LibraryTab.History -> R.drawable.ic_history_muted
                        LibraryTab.Applauds -> null
                        LibraryTab.Collections -> R.drawable.ic_collection_muted
                    }
                    if (tab == LibraryTab.Applauds) {
                        Image(painterResource(if (selected) R.drawable.ic_applaud_orange else R.drawable.ic_applaud_muted), contentDescription = null, modifier = Modifier.size(20.dp))
                    } else {
                        Image(painterResource(icon!!), contentDescription = null, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(WritOnSpacing.xxs))
                    Text(stringResource(tab.labelRes), style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

@Composable
private fun LibrarySectionHeader(tab: LibraryTab, count: Int, newestFirst: Boolean, onToggleOrder: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().padding(top = WritOnSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = when (tab) {
                LibraryTab.Saved -> stringResource(R.string.library_saved_header)
                LibraryTab.History -> stringResource(R.string.library_history_header)
                LibraryTab.Applauds -> stringResource(R.string.library_applauds_header)
                LibraryTab.Collections -> stringResource(R.string.library_collections_header)
            },
            style = MaterialTheme.typography.headlineMedium.copy(fontFamily = LibraryEditorialFamily)
        )
        Spacer(Modifier.weight(1f))
        Text("$count stories", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(WritOnSpacing.md))
        Row(
            modifier = Modifier.clip(RoundedCornerShape(WritOnRadius.field)).clickable(onClick = onToggleOrder).padding(vertical = WritOnSpacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(if (newestFirst) stringResource(R.string.library_sort_newest) else stringResource(R.string.library_sort_oldest), style = MaterialTheme.typography.labelLarge, color = BrandRed)
            Spacer(Modifier.width(WritOnSpacing.xs))
            Text("⌄", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun LibraryStoryCard(story: LibraryStory, isBookmarked: Boolean, onClick: () -> Unit, onToggleBookmark: () -> Unit) {
    var menuExpanded by remember { mutableStateOf(false) }
    Surface(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(WritOnRadius.card)).clickable(onClick = onClick),
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised
    ) {
        Box(Modifier.fillMaxWidth().padding(WritOnSpacing.lg)) {
            Column(modifier = Modifier.padding(end = 40.dp)) {
                Text(story.category.uppercase(), style = MaterialTheme.typography.labelLarge.copy(letterSpacing = 1.1.sp), color = BrandRed)
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    story.title,
                    style = MaterialTheme.typography.headlineMedium.copy(fontFamily = LibraryEditorialFamily, fontSize = 23.sp, lineHeight = 28.sp),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    story.summary,
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 21.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(WritOnSpacing.sm))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.size(38.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(initialsOf(story.authorName), style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    Spacer(Modifier.width(WritOnSpacing.sm))
                    Text(story.authorName, style = MaterialTheme.typography.bodySmall)
                    Text("  •  ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${story.readingTime} min", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(WritOnSpacing.sm))
                    Image(painterResource(R.drawable.ic_applaud_muted), contentDescription = stringResource(R.string.library_tab_applauds), modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(WritOnSpacing.xxs))
                    Text(story.applauds.toString(), style = MaterialTheme.typography.bodySmall, color = BrandRed)
                }
            }
            Column(modifier = Modifier.align(Alignment.TopEnd), horizontalAlignment = Alignment.CenterHorizontally) {
                IconButton(onClick = onToggleBookmark) {
                    Image(
                        painterResource(if (isBookmarked) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark),
                        contentDescription = if (isBookmarked) "Remove saved story" else "Save story",
                        modifier = Modifier.size(24.dp),
                        colorFilter = if (!isBookmarked) ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant) else null
                    )
                }
                Box {
                    IconButton(onClick = { menuExpanded = true }) {
                        Image(
                            painterResource(R.drawable.ic_more_vertical),
                            contentDescription = "Story options",
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                        )
                    }
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        DropdownMenuItem(text = { Text(stringResource(R.string.library_remove_saved)) }, onClick = { menuExpanded = false; onToggleBookmark() })
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyLibraryCollections() {
    Surface(
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(WritOnSpacing.xl), horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painterResource(R.drawable.ic_collection_muted), contentDescription = null, modifier = Modifier.size(40.dp))
            Spacer(Modifier.height(WritOnSpacing.sm))
            Text(stringResource(R.string.library_empty_collections), style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(WritOnSpacing.xxs))
            Text("Save stories to build a collection around your next idea.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun initialsOf(name: String): String = name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")
