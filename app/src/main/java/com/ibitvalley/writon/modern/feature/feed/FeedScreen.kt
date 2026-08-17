package com.ibitvalley.writon.modern.feature.feed

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

val CATEGORIES = listOf("All", "Essays", "Poetry", "Tech", "Philosophy", "Fiction", "Culture")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    viewModel: FeedViewModel,
    onStoryClick: (String) -> Unit,
    onWriteClick: () -> Unit
) {
    val posts by viewModel.posts.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "WritOn.",
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        fontSize = 24.sp
                    )
                },
                actions = {
                    IconButton(onClick = { /* TODO */ }) {
                        Icon(Icons.Default.BookmarkBorder, contentDescription = "Library")
                    }
                    IconButton(onClick = { /* TODO */ }) {
                        Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BrandBeige)
            )
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        if (posts.isEmpty()) {
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandRed)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize()
            ) {
                items(posts) { post ->
                    Box(modifier = Modifier.fillParentMaxHeight()) {
                        FeedCard(
                            post = post,
                            onReadClick = { onStoryClick(post.id) },
                            onApplaud = { viewModel.toggleLike(post.id, post.isLiked, post.likesCnt) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FeedCard(
    post: PostEntity,
    onReadClick: () -> Unit,
    onApplaud: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .clip(RoundedCornerShape(32.dp))
            .background(Color.White)
            .clickable { onReadClick() }
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = { onApplaud() }
                )
            }
    ) {
        // Image as a side element (matches design better)
        post.coverImage?.let {
            AsyncImage(
                model = it,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxHeight(0.7f)
                    .fillMaxWidth(0.6f)
                    .align(Alignment.BottomEnd)
                    .offset(x = 60.dp, y = (-40).dp)
                    .alpha(0.8f),
                contentScale = ContentScale.Fit
            )
        }

        // Content Column
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = BrandRed.copy(alpha = 0.05f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = post.category.uppercase(),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        color = BrandRed,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
                Text(
                    text = " • ${post.readingTimeMin} min read",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = post.title,
                style = MaterialTheme.typography.headlineLarge,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 32.sp,
                lineHeight = 40.sp,
                modifier = Modifier.fillMaxWidth(0.8f)
            )

            Box(
                modifier = Modifier
                    .padding(top = 16.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .background(BrandRed)
            )

            Spacer(modifier = Modifier.height(24.dp))

            post.summary?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.DarkGray,
                    lineHeight = 26.sp,
                    modifier = Modifier.fillMaxWidth(0.65f)
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            // Author Section
            Row(verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = post.authorAvatarUrl ?: "https://ui-avatars.com/api/?name=${post.authorName}",
                    contentDescription = null,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                )
                Column(modifier = Modifier.padding(start = 12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = post.authorName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Icon(
                            Icons.Default.Verified,
                            contentDescription = null,
                            tint = BrandRed,
                            modifier = Modifier.size(14.dp).padding(start = 4.dp)
                        )
                    }
                    Text(text = "@${post.authorPenName}", color = Color.Gray, fontSize = 13.sp)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    painter = painterResource(id = R.drawable.speech),
                    contentDescription = null,
                    tint = BrandRed,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "${post.likesCnt / 1000.0}K",
                    modifier = Modifier.padding(start = 8.dp),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Bottom Nav Hints
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(BrandBeige.copy(alpha = 0.5f))
                    .padding(horizontal = 24.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = BrandRed)
                    Column(modifier = Modifier.padding(start = 12.dp)) {
                        Text("Read", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text("Swipe right", color = Color.Gray, fontSize = 12.sp)
                    }
                }
                
                VerticalDivider(modifier = Modifier.height(40.dp).padding(horizontal = 16.dp), color = Color.LightGray)

                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ArrowUpward, contentDescription = null, tint = BrandRed)
                    Column(modifier = Modifier.padding(start = 12.dp)) {
                        Text("Next", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text("Swipe up", color = Color.Gray, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
