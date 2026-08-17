package com.ibitvalley.writon.modern.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.ibitvalley.writon.modern.core.designsystem.components.*
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onBackClick: () -> Unit,
) {
    val user by viewModel.userProfile.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Stories", "About", "Applauds")

    Scaffold(
        topBar = {
            ModernTopBar(
                title = "",
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* More actions */ }) {
                        Icon(Icons.Default.MoreHoriz, contentDescription = "More")
                    }
                }
            )
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding).fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (user == null) {
                item {
                    Box(modifier = Modifier.fillParentMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandRed)
                    }
                }
            } else {
                val u = user!!
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Profile Image with Edit Badge
                    Box {
                        UserAvatar(
                            url = u.avatarUrl,
                            name = u.fullName,
                            size = 100.dp,
                            modifier = Modifier.border(2.dp, BrandRed, CircleShape)
                        )
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(BrandRed)
                                .border(2.dp, Color.White, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(text = u.fullName, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(text = "@${u.penName}", color = Color.Gray, fontSize = 14.sp)

                    Spacer(modifier = Modifier.height(24.dp))

                    // Stats Row
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 48.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        StatItem("${u.followersCnt}", "Stories")
                        StatItem("2.4K", "Applauds")
                        StatItem("${u.followingCnt}", "Following")
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Bio
                    Text(
                        text = u.bio ?: "Writer. Designer. Observer of quiet spaces. Exploring the intersection of architecture, attention, and human experience.",
                        modifier = Modifier.padding(horizontal = 32.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        fontSize = 14.sp,
                        color = Color.DarkGray,
                        lineHeight = 20.sp
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Action Buttons
                    Row(
                        modifier = Modifier.padding(horizontal = 32.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        FollowButton(
                            isFollowing = false,
                            onClick = {},
                            modifier = Modifier.weight(1f).height(48.dp)
                        )
                        OutlinedButton(
                            onClick = {},
                            modifier = Modifier.size(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(0.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.LightGray)
                        ) {
                            Icon(Icons.Default.MailOutline, contentDescription = null, tint = Color.Black)
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    // Tabs
                    ModernTabRow(
                        selectedTabIndex = selectedTab,
                        tabs = tabs,
                        onTabSelected = { selectedTab = it }
                    )
                }

                // List items based on tab
                if (selectedTab == 0) {
                    items(3) {
                        val mockPost = com.ibitvalley.writon.modern.core.database.model.PostEntity(
                            id = "p$it",
                            authorId = u.id,
                            authorName = u.fullName,
                            authorPenName = u.penName,
                            authorAvatarUrl = u.avatarUrl,
                            title = "Story Title $it",
                            slug = "slug-$it",
                            summary = "A short summary for story $it",
                            content = "",
                            category = "Essays",
                            coverImage = null,
                            readingTimeMin = 5,
                            likesCnt = 10,
                            commentsCnt = 2,
                            bookmarksCnt = 5,
                            createdAt = "2026-08-17"
                        )
                        StoryCard(post = mockPost, onClick = {}, modifier = Modifier.padding(horizontal = 16.dp))
                    }
                } else {
                    item {
                        EmptyState(message = "No ${tabs[selectedTab].lowercase()} found.")
                    }
                }
            }
        }
    }
}

@Composable
fun StatItem(count: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = count, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text(text = label, color = Color.Gray, fontSize = 12.sp)
    }
}

