package com.ibitvalley.writon.modern.feature.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme

import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import com.ibitvalley.writon.modern.core.network.model.AuthorDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.network.model.TagDto


private val SearchEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private data class SearchStory(
    val id: String,
    val title: String,
    val summary: String,
    val minutes: Int,
    val applauds: Int,
    val author: String,
    val coverTone: Color,
    val coverLabel: String
)

private fun PostDto.asSearchStory() = SearchStory(
    id = id,
    title = title,
    summary = summary.orEmpty().ifBlank { "A story from ${author.fullName}." },
    minutes = readingTimeMin,
    applauds = likesCnt,
    author = author.fullName,
    coverTone = Color(0xFFF2ECE4),
    coverLabel = category
)

@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    onStoryClick: (String) -> Unit,
    onExploreClick: () -> Unit = {}
) {
    var query by rememberSaveable { mutableStateOf("") }
    var selectedTab by rememberSaveable { mutableStateOf("Stories") }
    val stories = viewModel.results.map { it.asSearchStory() }
    val writers = viewModel.writerResults
    val tags = viewModel.tagResults

    LaunchedEffect(query, selectedTab) {
        viewModel.search(query, selectedTab)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = WritOnSpacing.lg, end = WritOnSpacing.lg, top = WritOnSpacing.md, bottom = WritOnSpacing.lg)
    ) {
        item { SearchHeader() }
        item { SearchHero() }
        item {
            SearchField(value = query, onValueChange = { query = it })
            Text(
                "Popular searches",
                modifier = Modifier.padding(top = WritOnSpacing.lg, bottom = WritOnSpacing.sm),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            PopularSearches(onSelect = {
                query = it
                selectedTab = "Stories"
            })
        }
        item {
            SearchTabs(
                selectedTab = selectedTab,
                onSelect = { selectedTab = it }
            )
        }

        if (viewModel.isLoading) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.CircularProgressIndicator(
                        color = BrandRed,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        } else {
            when (selectedTab) {
                "Stories" -> {
                    if (stories.isEmpty()) {
                        item { EmptyResults("stories", query) }
                    } else {
                        items(stories.size) { index ->
                            SearchResultCard(story = stories[index], onClick = { onStoryClick(stories[index].id) })
                        }
                    }
                }
                "Writers" -> {
                    if (writers.isEmpty()) {
                        item { EmptyResults("writers", query) }
                    } else {
                        items(writers.size) { index ->
                            SearchWriterCard(
                                writer = writers[index],
                                onClick = {
                                    query = writers[index].fullName
                                    selectedTab = "Stories"
                                }
                            )
                        }
                    }
                }
                "Tags" -> {
                    if (tags.isEmpty()) {
                        item { EmptyResults("tags", query) }
                    } else {
                        items(tags.size) { index ->
                            SearchTagCard(
                                tag = tags[index],
                                onClick = {
                                    query = tags[index].name
                                    selectedTab = "Stories"
                                }
                            )
                        }
                    }
                }
            }
        }

        item { ExploreTopicsCard(onExploreClick) }
    }
}


@Composable
private fun SearchHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        WritOnBrandMark(width = 108.dp)
        Spacer(Modifier.weight(1f))
        IconButton(onClick = { }) {
            Image(painterResource(R.drawable.ic_notification), contentDescription = "Notifications", modifier = Modifier.size(29.dp))
        }
    }
}

@Composable
private fun SearchHero() {
    Column(modifier = Modifier.padding(top = 54.dp, bottom = WritOnSpacing.lg)) {
        Text(
            "Search",
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = SearchEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 42.sp)
        )
        Text(
            "Find stories, writers and ideas.",
            modifier = Modifier.padding(top = 4.dp),
            style = MaterialTheme.typography.titleLarge.copy(fontFamily = SearchEditorialFamily, fontSize = 17.sp),
            color = Color(0xFF6D6963)
        )
    }
}

@Composable
private fun SearchField(value: String, onValueChange: (String) -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9E1D7))
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.ic_search_muted), contentDescription = null, modifier = Modifier.padding(start = WritOnSpacing.md).size(29.dp))
            TextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Search stories, writers, topics…", color = Color(0xFF6D6963), fontSize = 16.sp) },
                singleLine = true,
                textStyle = MaterialTheme.typography.titleMedium.copy(fontSize = 16.sp),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    cursorColor = BrandRed
                )
            )
            if (value.isNotEmpty()) {
                IconButton(onClick = { onValueChange("") }, modifier = Modifier.padding(end = 4.dp)) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Clear search",
                        tint = Color(0xFF6D6963),
                        modifier = Modifier.size(20.dp)
                    )
                }
            } else {
                Spacer(Modifier.width(12.dp))
            }
        }
    }
}


@Composable
private fun PopularSearches(onSelect: (String) -> Unit) {
    val topics = listOf("Mindfulness", "Love", "Travel", "Life Lessons", "Poetry", "Leadership")
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.sm)
    ) {
        topics.forEach { topic ->
            Surface(
                onClick = { onSelect(topic) },
                color = Color(0xFFF2ECE4),
                shape = RoundedCornerShape(WritOnRadius.pill),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9E1D7))
            ) {
                Text(topic, modifier = Modifier.padding(horizontal = 13.dp, vertical = 8.dp), fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun SearchTabs(selectedTab: String, onSelect: (String) -> Unit) {
    val tabs = listOf("Stories", "Writers", "Tags")
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 34.dp)
    ) {
        tabs.forEach { tab ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onSelect(tab) },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    tab,
                    color = if (tab == selectedTab) BrandRed else Color(0xFF151718),
                    style = MaterialTheme.typography.titleMedium.copy(fontSize = 17.sp),
                    fontWeight = if (tab == selectedTab) FontWeight.SemiBold else FontWeight.Normal
                )
                Spacer(Modifier.height(18.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth().height(if (tab == selectedTab) 3.dp else 1.dp),
                    color = if (tab == selectedTab) BrandRed else Color(0xFFE9E1D7)
                ) {}
            }
        }
    }
}

@Composable
private fun SearchResultCard(story: SearchStory, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.card),
        shadowElevation = WritOnElevation.raised
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            SearchCover(story)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    story.title,
                    style = MaterialTheme.typography.titleLarge.copy(fontFamily = SearchEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 19.sp, lineHeight = 23.sp),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    story.summary,
                    modifier = Modifier.padding(top = 6.dp),
                    style = MaterialTheme.typography.bodyLarge.copy(fontSize = 15.sp, lineHeight = 20.sp),
                    color = Color(0xFF6D6963),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Row(modifier = Modifier.padding(top = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("${story.minutes} min read", fontSize = 13.sp, color = Color(0xFF6D6963))
                    Text("  •  ", color = Color(0xFF6D6963))
                    Image(painterResource(R.drawable.ic_applaud_muted), contentDescription = "Applauds", modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(story.applauds.toString(), fontSize = 13.sp, color = BrandRed)
                    Text("  •  ", color = Color(0xFF6D6963))
                    Text(story.author, fontSize = 13.sp, color = Color(0xFF6D6963), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                IconButton(onClick = { }) { Image(painterResource(R.drawable.ic_bookmark), contentDescription = "Save ${story.title}", modifier = Modifier.size(24.dp)) }
                IconButton(onClick = { }) { Image(painterResource(R.drawable.ic_more_vertical), contentDescription = "More options", modifier = Modifier.size(24.dp)) }
            }
        }
    }
    Spacer(Modifier.height(WritOnSpacing.sm))
}

@Composable
private fun SearchCover(story: SearchStory) {
    Surface(
        modifier = Modifier.width(88.dp).height(112.dp),
        shape = RoundedCornerShape(WritOnRadius.field),
        color = story.coverTone
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Surface(shape = CircleShape, color = Color(0xFFFFFDF9).copy(alpha = 0.2f), modifier = Modifier.size(24.dp)) {}
            Text(
                story.coverLabel,
                style = MaterialTheme.typography.titleMedium.copy(fontFamily = SearchEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 17.sp),
                color = Color(0xFFFFFDF9)
            )
        }
    }
}

@Composable
private fun SearchWriterCard(writer: AuthorDto, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9E1D7)),
        shadowElevation = WritOnElevation.raised
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar(
                url = writer.avatarUrl,
                name = writer.fullName,
                size = 52.dp
            )

            Spacer(Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = writer.fullName,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = SearchEditorialFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 18.sp
                    )
                )
                Text(
                    text = "@${writer.penName}",
                    style = MaterialTheme.typography.bodyMedium.copy(color = BrandRed, fontSize = 14.sp)
                )
                if (!writer.bio.isNullOrBlank()) {
                    Text(
                        text = writer.bio,
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF6D6963)),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${writer.followersCnt ?: 0} followers",
                    style = MaterialTheme.typography.labelMedium.copy(color = Color(0xFF6D6963))
                )
            }
        }
    }
}

@Composable
private fun SearchTagCard(tag: TagDto, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.field),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9E1D7))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFFF2ECE4),
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "#",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = BrandRed
                        )
                    )
                }
            }

            Spacer(Modifier.width(14.dp))

            Text(
                text = tag.name,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = SearchEditorialFamily,
                    fontWeight = FontWeight.SemiBold
                ),
                modifier = Modifier.weight(1f)
            )

            Surface(
                shape = RoundedCornerShape(WritOnRadius.pill),
                color = Color(0xFFF2ECE4)
            ) {
                Text(
                    text = "${tag.count} ${if (tag.count == 1) "story" else "stories"}",
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelMedium.copy(color = Color(0xFF6D6963))
                )
            }
        }
    }
}

@Composable
private fun EmptyResults(category: String, query: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 54.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(painterResource(R.drawable.ic_search_muted), contentDescription = null, modifier = Modifier.size(38.dp))
        Text("No $category found", modifier = Modifier.padding(top = WritOnSpacing.md), style = MaterialTheme.typography.titleLarge.copy(fontFamily = SearchEditorialFamily))
        if (query.isNotBlank()) {
            Text("Try another search for “$query”.", style = MaterialTheme.typography.bodyLarge, color = Color(0xFF6D6963))
        } else {
            Text("Type something to search for $category.", style = MaterialTheme.typography.bodyLarge, color = Color(0xFF6D6963))
        }
    }
}


@Composable
private fun ExploreTopicsCard(onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(top = WritOnSpacing.sm),
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.field),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9E1D7))
    ) {
        Row(
            modifier = Modifier.padding(WritOnSpacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(shape = CircleShape, color = Color(0xFFE9E1D7), modifier = Modifier.size(48.dp)) {
                Box(contentAlignment = Alignment.Center) { Image(painterResource(R.drawable.ic_explore_orange), contentDescription = null, modifier = Modifier.size(24.dp)) }
            }
            Spacer(Modifier.width(WritOnSpacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text("Explore topics", style = MaterialTheme.typography.titleMedium.copy(fontFamily = SearchEditorialFamily, fontWeight = FontWeight.SemiBold))
                Text("Discover stories across categories\nthat inspire you.", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF6D6963))
            }
            Image(painterResource(R.drawable.ic_forward_orange), contentDescription = "Explore topics", modifier = Modifier.size(24.dp))
        }
    }
}
