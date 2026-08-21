package com.ibitvalley.writon.modern.feature.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
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

private val SearchEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private data class SearchStory(
    val title: String,
    val summary: String,
    val minutes: Int,
    val applauds: Int,
    val author: String,
    val coverTone: Color,
    val coverLabel: String
)

private val searchStories = listOf(
    SearchStory("The Architecture of Solitude", "A reflection on how silence shapes the lives we build.", 6, 324, "Arjun Kapoor", Color(0xFF6D6963), "Still\nwater"),
    SearchStory("Letters to the Things I Left Behind", "Sometimes the hardest goodbyes are the ones we never say out loud.", 4, 187, "Meera Iyer", Color(0xFF6D6963), "Warm\nwindow"),
    SearchStory("The Last Train Home", "He bought a one-way ticket. The train had other plans.", 7, 256, "Kabir Malhotra", Color(0xFF6D6963), "Last\ntrain"),
    SearchStory("What We Owe Ourselves", "On showing up, even when no one is watching.", 5, 412, "Ira Sharma", Color(0xFF151718), "Night\nsky")
)

@Composable
fun SearchScreen(
    onStoryClick: (String) -> Unit,
    onExploreClick: () -> Unit = {}
) {
    var query by rememberSaveable { mutableStateOf("") }
    var selectedTab by rememberSaveable { mutableStateOf("Stories") }
    val results = if (query.isBlank()) searchStories else searchStories.filter {
        it.title.contains(query, ignoreCase = true) || it.summary.contains(query, ignoreCase = true) || it.author.contains(query, ignoreCase = true)
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
            PopularSearches(onSelect = { query = it })
        }
        item { SearchTabs(selectedTab = selectedTab, onSelect = { selectedTab = it }) }
        if (selectedTab == "Stories") {
            if (results.isEmpty()) {
                item { EmptyResults(query) }
            } else {
                items(results.size) { index ->
                    SearchResultCard(story = results[index], onClick = { onStoryClick("${index + 1}") })
                }
            }
        } else {
            item { SearchTabPlaceholder(selectedTab) }
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
            IconButton(onClick = { }) {
                Image(painterResource(R.drawable.ic_filter_muted), contentDescription = "Filter search", modifier = Modifier.size(24.dp))
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
                    Text("♨ ${story.applauds}", fontSize = 13.sp, color = BrandRed)
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
private fun EmptyResults(query: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 54.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(painterResource(R.drawable.ic_search_muted), contentDescription = null, modifier = Modifier.size(38.dp))
        Text("No stories found", modifier = Modifier.padding(top = WritOnSpacing.md), style = MaterialTheme.typography.titleLarge.copy(fontFamily = SearchEditorialFamily))
        Text("Try another search for “$query”.", style = MaterialTheme.typography.bodyLarge, color = Color(0xFF6D6963))
    }
}

@Composable
private fun SearchTabPlaceholder(tab: String) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("$tab", style = MaterialTheme.typography.headlineMedium.copy(fontFamily = SearchEditorialFamily))
        Text("Search across WritOn $tab.", modifier = Modifier.padding(top = WritOnSpacing.sm), color = Color(0xFF6D6963))
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
