package com.ibitvalley.writon.modern.feature.library

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.model.ReadingHistoryItemDto
import com.ibitvalley.writon.modern.core.network.model.ReadingHistorySummaryDto
import com.ibitvalley.writon.modern.feature.collections.CollectionsViewModel

private val HistoryEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private enum class HistoryFilter(val label: String) {
    All("All"), Stories("Stories"), Poems("Poems"), Articles("Articles")
}

private data class HistoryStory(
    val id: String,
    val group: String,
    val kind: HistoryFilter,
    val title: String,
    val author: String,
    val minutes: Int,
    val progress: Float,
    val bookmarked: Boolean,
    val coverTone: Color,
    val coverLabel: String
)

private fun ReadingHistoryItemDto.asHistoryStory(): HistoryStory {
    val kind = when (category.lowercase()) {
        "poetry", "poem", "shayari" -> HistoryFilter.Poems
        "essay", "article", "philosophy", "journalism" -> HistoryFilter.Articles
        else -> HistoryFilter.Stories
    }
    return HistoryStory(
        id = id,
        group = "Recently read",
        kind = kind,
        title = title,
        author = author.fullName,
        minutes = readingTimeMin,
        progress = progress.coerceIn(0f, 1f),
        bookmarked = isBookmarked,
        coverTone = Color(0xFFF2ECE4),
        coverLabel = category
    )
}

@Composable
fun ReadingHistoryScreen(
    viewModel: CollectionsViewModel,
    onStoryClick: (String) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {}
) {
    var filter by rememberSaveable { mutableStateOf(HistoryFilter.All) }
    var menuFor by rememberSaveable { mutableStateOf<String?>(null) }
    var showTip by rememberSaveable { mutableStateOf(true) }
    LaunchedEffect(Unit) { viewModel.loadHistory() }
    val filteredStories = viewModel.historyItems.map { it.asHistoryStory() }
        .filter { filter == HistoryFilter.All || it.kind == filter }
    val groups = filteredStories.groupBy { it.group }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 24.dp, end = 24.dp, top = 16.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item { HistoryHeader(onSearchClick, onSettingsClick) }
        item { HistoryFilters(filter, onSelect = { filter = it }) }
        item { HistorySummary(viewModel.historySummary) }
        if (filteredStories.isEmpty()) {
            item { EmptyHistory(filter) }
        } else {
            groups.forEach { (group, stories) ->
                item { Text(group, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)) }
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        color = Color(0xFFFFFDF9),
                        border = BorderStroke(1.dp, Color(0xFFE9E1D7))
                    ) {
                        Column {
                            stories.forEachIndexed { index, story ->
                                HistoryRow(
                                    story = story,
                                    bookmarked = story.bookmarked,
                                    menuExpanded = menuFor == story.id,
                                    onClick = { onStoryClick(story.id) },
                                    onBookmark = { viewModel.toggleBookmark(story.id) },
                                    onMore = { menuFor = story.id },
                                    onDismiss = { menuFor = null }
                                )
                                if (index < stories.lastIndex) HorizontalDivider(color = Color(0xFFE9E1D7), modifier = Modifier.padding(start = 164.dp))
                            }
                        }
                    }
                }
            }
        }
        if (showTip) item { ContinueReadingTip(onDismiss = { showTip = false }) }
    }
}

@Composable
private fun HistoryHeader(onSearchClick: () -> Unit, onSettingsClick: () -> Unit) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            WritOnBrandMark(width = 108.dp)
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onSearchClick) { Image(painterResource(R.drawable.ic_search), contentDescription = "Search", modifier = Modifier.size(24.dp)) }
            IconButton(onClick = onSettingsClick) { Image(painterResource(R.drawable.ic_settings), contentDescription = "Settings", modifier = Modifier.size(24.dp)) }
        }
        Text(
            "Reading History",
            modifier = Modifier.padding(top = 40.dp),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = HistoryEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 48.sp, lineHeight = 54.sp)
        )
        Text(
            "Your reading journey, in the order you read.",
            modifier = Modifier.padding(top = 6.dp),
            style = MaterialTheme.typography.titleLarge.copy(fontFamily = HistoryEditorialFamily, fontSize = 18.sp),
            color = Color(0xFF6D6963)
        )
    }
}

@Composable
private fun HistoryFilters(selected: HistoryFilter, onSelect: (HistoryFilter) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth()) {
        HistoryFilter.entries.forEach { filter ->
            val selectedFilter = filter == selected
            Column(
                modifier = Modifier.weight(1f).clip(RoundedCornerShape(WritOnRadius.field)).clickable { onSelect(filter) },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painterResource(when (filter) {
                            HistoryFilter.All -> if (selectedFilter) R.drawable.ic_history_orange else R.drawable.ic_history
                            HistoryFilter.Stories -> if (selectedFilter) R.drawable.ic_book_orange else R.drawable.ic_book
                            HistoryFilter.Poems -> if (selectedFilter) R.drawable.ic_category_orange else R.drawable.ic_category
                            HistoryFilter.Articles -> if (selectedFilter) R.drawable.ic_bookmark_orange else R.drawable.ic_bookmark
                        }), contentDescription = null, modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(filter.label, fontSize = 14.sp, fontWeight = if (selectedFilter) FontWeight.Medium else FontWeight.Normal, color = if (selectedFilter) BrandRed else Color(0xFF151718))
                }
                Spacer(Modifier.height(14.dp))
                Surface(modifier = Modifier.fillMaxWidth().height(if (selectedFilter) 3.dp else 1.dp), color = if (selectedFilter) BrandRed else Color(0xFFE9E1D7)) {}
            }
        }
    }
}

@Composable
private fun HistorySummary(summary: ReadingHistorySummaryDto) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        color = Color(0xFFFFFDF9),
        border = BorderStroke(1.dp, Color(0xFFE9E1D7))
    ) {
        Row(modifier = Modifier.padding(horizontal = 20.dp, vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = BrandRed.copy(alpha = .12f), modifier = Modifier.size(72.dp)) {
                Box(contentAlignment = Alignment.Center) { Image(painterResource(R.drawable.ic_book_orange), contentDescription = null, modifier = Modifier.size(38.dp)) }
            }
            Spacer(Modifier.width(20.dp))
            Column {
                Text(summary.storiesRead.toString(), style = MaterialTheme.typography.displaySmall.copy(fontFamily = HistoryEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 39.sp))
                Text("Stories read", fontSize = 14.sp, color = Color(0xFF6D6963))
            }
            Spacer(Modifier.weight(1f))
            VerticalDivider(modifier = Modifier.height(64.dp), color = Color(0xFFE9E1D7))
            Spacer(Modifier.width(20.dp))
            Column {
                Text("%.1f".format(summary.hoursRead), style = MaterialTheme.typography.displaySmall.copy(fontFamily = HistoryEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 39.sp))
                Text("Hours spent reading", fontSize = 14.sp, color = Color(0xFF6D6963), maxLines = 1)
            }
        }
    }
}

@Composable
private fun HistoryRow(
    story: HistoryStory,
    bookmarked: Boolean,
    menuExpanded: Boolean,
    onClick: () -> Unit,
    onBookmark: () -> Unit,
    onMore: () -> Unit,
    onDismiss: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 154.dp).clickable(onClick = onClick).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        HistoryCover(story)
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(story.title, style = MaterialTheme.typography.titleLarge.copy(fontFamily = HistoryEditorialFamily, fontSize = 22.sp, lineHeight = 25.sp, fontWeight = FontWeight.SemiBold), maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(modifier = Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = CircleShape, color = story.coverTone.copy(alpha = .20f), modifier = Modifier.size(24.dp)) {
                    Box(contentAlignment = Alignment.Center) { Text(story.author.take(1), fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                }
                Spacer(Modifier.width(8.dp))
                Text(story.author, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("  •  ", fontSize = 13.sp, color = Color(0xFF6D6963))
                Text("${story.minutes} min read", fontSize = 14.sp, color = Color(0xFF6D6963), maxLines = 1)
            }
            Row(modifier = Modifier.padding(top = 15.dp), verticalAlignment = Alignment.CenterVertically) {
                LinearProgressIndicator(progress = { story.progress }, modifier = Modifier.weight(1f).height(4.dp).clip(CircleShape), color = BrandRed, trackColor = Color(0xFFE9E1D7))
                Spacer(Modifier.width(14.dp))
                Text("${(story.progress * 100).toInt()}%", fontSize = 14.sp, color = Color(0xFF151718))
            }
        }
        Column(modifier = Modifier.align(Alignment.Top), horizontalAlignment = Alignment.CenterHorizontally) {
            IconButton(onClick = onBookmark, modifier = Modifier.size(38.dp)) {
                Image(painterResource(if (bookmarked) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark), contentDescription = if (bookmarked) "Remove saved story" else "Save story", modifier = Modifier.size(22.dp))
            }
            Box {
                IconButton(onClick = onMore, modifier = Modifier.size(38.dp)) { Image(painterResource(R.drawable.ic_more_vertical), contentDescription = "Story options", modifier = Modifier.size(22.dp)) }
                DropdownMenu(expanded = menuExpanded, onDismissRequest = onDismiss) {
                    DropdownMenuItem(text = { Text("Remove from history") }, onClick = onDismiss)
                    DropdownMenuItem(text = { Text("Share story") }, onClick = onDismiss)
                }
            }
        }
    }
}

@Composable
private fun HistoryCover(story: HistoryStory) {
    Surface(modifier = Modifier.size(112.dp, 142.dp), shape = RoundedCornerShape(14.dp), color = story.coverTone) {
        Column(modifier = Modifier.padding(13.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Surface(shape = CircleShape, color = Color(0xFFFFFDF9).copy(alpha = .22f), modifier = Modifier.size(24.dp)) {}
            Text(story.coverLabel, color = Color(0xFFFFFDF9), fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun EmptyHistory(filter: HistoryFilter) {
    Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFFFFDF9), shape = RoundedCornerShape(22.dp), border = BorderStroke(1.dp, Color(0xFFE9E1D7))) {
        Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painterResource(R.drawable.ic_history_muted), contentDescription = null, modifier = Modifier.size(38.dp))
            Text("No ${filter.label.lowercase()} reading yet", modifier = Modifier.padding(top = 12.dp), style = MaterialTheme.typography.titleLarge.copy(fontFamily = HistoryEditorialFamily))
            Text("Stories you read will appear here.", modifier = Modifier.padding(top = 4.dp), color = Color(0xFF6D6963))
        }
    }
}

@Composable
private fun ContinueReadingTip(onDismiss: () -> Unit) {
    Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFF8F4EE), shape = RoundedCornerShape(WritOnRadius.field), border = BorderStroke(1.dp, Color(0xFFE9E1D7))) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("✦", fontSize = 23.sp, color = BrandRed)
            Spacer(Modifier.width(12.dp))
            Text("Tip: Tap any story to continue reading\nfrom where you left off.", modifier = Modifier.weight(1f), fontSize = 14.sp, lineHeight = 19.sp)
            IconButton(onClick = onDismiss, modifier = Modifier.size(36.dp)) { Text("×", fontSize = 27.sp, color = Color(0xFF151718)) }
        }
    }
}
