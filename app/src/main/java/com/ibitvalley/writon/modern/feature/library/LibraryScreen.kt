package com.ibitvalley.writon.modern.feature.library

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.designsystem.components.EmptyState
import com.ibitvalley.writon.modern.core.designsystem.components.ModernTabRow
import com.ibitvalley.writon.modern.core.designsystem.components.ModernTopBar
import com.ibitvalley.writon.modern.core.designsystem.components.StoryCard
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Saved", "Applauded", "History", "Following")

    Scaffold(
        topBar = {
            ModernTopBar(title = "Library")
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            ModernTabRow(
                selectedTabIndex = selectedTab,
                tabs = tabs,
                onTabSelected = { selectedTab = it }
            )

            val mockPosts = remember {
                listOf(
                    PostEntity(
                        id = "1",
                        authorId = "a1",
                        authorName = "Maya Lin",
                        authorPenName = "maya",
                        authorAvatarUrl = null,
                        title = "The Architecture of Solitude",
                        slug = "arch-solitude",
                        summary = "Finding peace in the quiet moments of design and life.",
                        content = "",
                        category = "Essays",
                        coverImage = "https://images.unsplash.com/photo-1499750310107-5fef28a66643",
                        readingTimeMin = 5,
                        likesCnt = 124,
                        commentsCnt = 12,
                        bookmarksCnt = 45,
                        isBookmarked = true,
                        createdAt = "2026-08-14T10:00:00Z"
                    )
                )
            }

            if (selectedTab == 0 && mockPosts.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(mockPosts) { post ->
                        StoryCard(
                            post = post,
                            onClick = { /* Navigate to reader */ }
                        )
                    }
                }
            } else {
                EmptyState(
                    message = "Nothing here yet. Explore more to fill your library!",
                    icon = { Icon(Icons.Default.Inbox, contentDescription = null, modifier = Modifier.size(48.dp), tint = Color.LightGray) }
                )
            }
        }
    }
}
