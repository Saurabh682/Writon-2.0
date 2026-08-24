package com.ibitvalley.writon.modern.feature.profile

import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.PostCoverImage
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.feature.collections.CollectionsViewModel

private val ApplaudsEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private data class ApplaudedStory(
    val id: String,
    val kind: String,
    val title: String,
    val author: String,
    val time: String,
    val coverImage: String?,
    val coverTone: Color,
    val coverLabel: String,
    val hasCover: Boolean = true
)

private fun PostDto.asApplaudedStory(): ApplaudedStory {
    val kind = when (category.lowercase()) {
        "poetry", "poem", "shayari" -> "Poems"
        "essay", "article", "philosophy", "journalism" -> "Articles"
        else -> "Stories"
    }
    return ApplaudedStory(
        id = id,
        kind = kind,
        title = title,
        author = author.fullName,
        time = "Recently applauded",
        coverImage = coverImage,
        coverTone = Color(0xFFF2ECE4),
        coverLabel = category,
        hasCover = true
    )
}

@Composable
fun ApplaudsScreen(
    viewModel: CollectionsViewModel,
    onBackClick: () -> Unit = {},
    onStoryClick: (String) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {}
) {
    var selectedTab by rememberSaveable { mutableStateOf("All") }
    var expandedStoryId by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { viewModel.loadApplauds() }
    val stories = viewModel.applaudedPosts.map { it.asApplaudedStory() }
        .filter { selectedTab == "All" || it.kind == selectedTab }
    val totalApplauds = viewModel.applaudedPosts.size

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = WritOnSpacing.lg, end = WritOnSpacing.lg, top = WritOnSpacing.md, bottom = WritOnSpacing.xl),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
    ) {
        item { ApplaudsHeader(onSearchClick, onSettingsClick) }
        item { ApplaudsTabs(selectedTab, onSelect = { selectedTab = it }) }
        item { ApplaudsSummary(totalApplauds) }
        if (stories.isEmpty()) {
            item { EmptyApplauds(selectedTab) }
        } else {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFFFFDF9),
                    shape = RoundedCornerShape(WritOnRadius.feature),
                    shadowElevation = WritOnElevation.raised
                ) {
                    Column {
                        stories.forEachIndexed { index, story ->
                            ApplaudedStoryRow(
                                story = story,
                                expanded = expandedStoryId == story.id,
                                onClick = { onStoryClick(story.id) },
                                onToggleApplaud = { viewModel.toggleApplaud(story.id) },
                                onMoreClick = { expandedStoryId = story.id },
                                onDismissMore = { expandedStoryId = null },
                                onRemove = { viewModel.toggleApplaud(story.id); expandedStoryId = null }
                            )
                            if (index < stories.lastIndex) {
                                androidx.compose.material3.HorizontalDivider(color = Color(0xFFE9E1D7), modifier = Modifier.padding(start = WritOnSpacing.md))
                            }
                        }
                    }
                }
            }
        }
        item { ApplaudsFooter() }
    }
}

@Composable
private fun ApplaudsHeader(onSearchClick: () -> Unit, onSettingsClick: () -> Unit) {
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
            IconButton(onClick = onSettingsClick) {
                Image(
                    painterResource(R.drawable.ic_settings),
                    contentDescription = "Settings",
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
            }
        }
        Text(
            "Applauds",
            modifier = Modifier.padding(top = 48.dp),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = ApplaudsEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 48.sp)
        )
        Text(
            "Stories you applauded.",
            modifier = Modifier.padding(top = WritOnSpacing.xs),
            style = MaterialTheme.typography.titleLarge.copy(fontFamily = ApplaudsEditorialFamily, fontSize = 17.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ApplaudsTabs(selectedTab: String, onSelect: (String) -> Unit) {
    val tabs = listOf("All", "Stories", "Poems", "Articles")
    Row(modifier = Modifier.fillMaxWidth()) {
        tabs.forEach { tab ->
            Column(
                modifier = Modifier.weight(1f).clickable { onSelect(tab) },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    tab,
                    fontSize = 15.sp,
                    color = if (tab == selectedTab) BrandRed else Color(0xFF6D6963),
                    fontWeight = if (tab == selectedTab) FontWeight.Medium else FontWeight.Normal
                )
                Spacer(Modifier.height(13.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth().height(if (tab == selectedTab) 3.dp else 1.dp),
                    color = if (tab == selectedTab) BrandRed else Color(0xFFE9E1D7)
                ) {}
            }
        }
    }
}

@Composable
private fun ApplaudsSummary(total: Int) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.feature),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9E1D7))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(painterResource(R.drawable.ic_applaud_orange), contentDescription = null, modifier = Modifier.size(52.dp))
            Spacer(Modifier.width(WritOnSpacing.lg))
            Column {
                Text(
                    total.toString(),
                    style = MaterialTheme.typography.displaySmall.copy(fontFamily = ApplaudsEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 40.sp),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    stringResource(R.string.common_stories_applauded),
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(Modifier.weight(1f))
            androidx.compose.material3.VerticalDivider(modifier = Modifier.height(52.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Spacer(Modifier.width(WritOnSpacing.lg))
            Text(
                stringResource(R.string.applauds_keep_supporting),
                fontSize = 15.sp,
                lineHeight = 21.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ApplaudedStoryRow(
    story: ApplaudedStory,
    expanded: Boolean,
    onClick: () -> Unit,
    onToggleApplaud: () -> Unit,
    onMoreClick: () -> Unit,
    onDismissMore: () -> Unit,
    onRemove: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 112.dp).clickable(onClick = onClick).padding(horizontal = WritOnSpacing.md, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (story.hasCover) {
            StoryCover(story)
            Spacer(Modifier.width(WritOnSpacing.md))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                story.title,
                style = MaterialTheme.typography.titleLarge.copy(fontFamily = ApplaudsEditorialFamily, fontSize = 21.sp, lineHeight = 25.sp, fontWeight = FontWeight.SemiBold),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text("by ${story.author}", modifier = Modifier.padding(top = 5.dp), fontSize = 15.sp, color = Color(0xFF6D6963), maxLines = 1)
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.Center) {
            Text(story.time, fontSize = 13.sp, color = Color(0xFF6D6963))
            Row(modifier = Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onToggleApplaud, modifier = Modifier.size(40.dp)) {
                    Image(painterResource(R.drawable.ic_applaud_orange), contentDescription = "Remove applaud", modifier = Modifier.size(26.dp))
                }
                Box {
                    IconButton(onClick = onMoreClick, modifier = Modifier.size(36.dp)) {
                        Image(painterResource(R.drawable.ic_more_vertical), contentDescription = "Story options", modifier = Modifier.size(24.dp))
                    }
                    DropdownMenu(expanded = expanded, onDismissRequest = onDismissMore) {
                        DropdownMenuItem(text = { Text(stringResource(R.string.applauds_remove)) }, onClick = onRemove)
                        DropdownMenuItem(text = { Text(stringResource(R.string.common_share)) }, onClick = onDismissMore)
                        DropdownMenuItem(text = { Text(stringResource(R.string.applauds_open_author)) }, onClick = onDismissMore)
                    }
                }
            }
        }
    }
}

@Composable
private fun StoryCover(story: ApplaudedStory) {
    PostCoverImage(
        imageUrl = story.coverImage,
        category = story.coverLabel,
        contentDescription = "Cover for ${story.title}",
        modifier = Modifier
            .size(72.dp)
            .clip(RoundedCornerShape(WritOnRadius.field)),
        categoryFontSize = 11.sp,
        forceDefault = story.coverImage.isNullOrBlank()
    )
}

@Composable
private fun EmptyApplauds(tab: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(
            painterResource(R.drawable.ic_applaud_muted),
            contentDescription = null,
            modifier = Modifier.size(38.dp),
            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
        )
        Text(
            stringResource(R.string.applauds_empty_title),
            modifier = Modifier.padding(top = WritOnSpacing.sm),
            style = MaterialTheme.typography.titleLarge.copy(fontFamily = ApplaudsEditorialFamily),
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun ApplaudsFooter() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(WritOnRadius.field)
    ) {
        Row(
            modifier = Modifier.padding(WritOnSpacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("♡", color = BrandRed, fontSize = 39.sp)
            Spacer(Modifier.width(WritOnSpacing.md))
            Text(
                stringResource(R.string.applauds_empty_desc),
                modifier = Modifier.weight(1f),
                fontSize = 14.sp,
                lineHeight = 20.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                stringResource(R.string.applauds_thank_you),
                color = BrandRed,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}
