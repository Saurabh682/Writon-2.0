package com.ibitvalley.writon.modern.feature.feed

import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.IconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable

import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.customActions
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.PostCoverImage
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

val CATEGORIES = listOf("All", "Essays", "Poetry", "Tech", "Philosophy", "Fiction", "Culture")

private val HomeEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private val HomeSurface = Color(0xFFFFFDF9)
private val HomeInk = Color(0xFF151718)
private val HomeMuted = Color(0xFF6D6963)
private val HomeBorder = Color(0xFFE9E1D7)
private val HomeChip = Color(0xFFF2ECE4)

@Composable
fun FeedScreen(
    viewModel: FeedViewModel,
    onStoryClick: (String) -> Unit,
    onWriteClick: () -> Unit,
    onLibraryClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    isAuthenticated: Boolean = true,
    onLoginRequired: () -> Unit = {}
) {
    val posts by viewModel.posts.collectAsState()
    var currentIndex by rememberSaveable { mutableIntStateOf(0) }
    val safeIndex = currentIndex.coerceIn(0, posts.lastIndex.coerceAtLeast(0))

    LaunchedEffect(posts.size) {
        if (currentIndex > posts.lastIndex) currentIndex = 0
    }

    Column(
        modifier = Modifier.fillMaxSize().background(BrandBeige).padding(horizontal = 18.dp, vertical = 16.dp)
    ) {
        HomeHeader(onLibraryClick = onLibraryClick, onProfileClick = onProfileClick)
        Spacer(Modifier.height(20.dp))
        if (posts.isEmpty()) {
            EmptyDiscovery(
                modifier = Modifier.weight(1f),
                onRefresh = { viewModel.refreshFeed() }
            )
        } else {
            AnimatedContent(
                targetState = safeIndex,
                modifier = Modifier.weight(1f),
                transitionSpec = {
                    if (targetState > initialState) {
                        (slideInVertically(animationSpec = tween(320)) { fullHeight -> fullHeight } +
                            fadeIn(animationSpec = tween(220)) +
                            scaleIn(initialScale = 0.985f, animationSpec = tween(320))) togetherWith
                            (slideOutVertically(animationSpec = tween(280)) { fullHeight -> -fullHeight } +
                                fadeOut(animationSpec = tween(180)) +
                                scaleOut(targetScale = 0.985f, animationSpec = tween(280)))
                    } else {
                        (slideInVertically(animationSpec = tween(320)) { fullHeight -> -fullHeight } +
                            fadeIn(animationSpec = tween(220)) +
                            scaleIn(initialScale = 0.985f, animationSpec = tween(320))) togetherWith
                            (slideOutVertically(animationSpec = tween(280)) { fullHeight -> fullHeight } +
                                fadeOut(animationSpec = tween(180)) +
                                scaleOut(targetScale = 0.985f, animationSpec = tween(280)))
                    }
                },
                label = "homeStoryCard"
            ) { index ->
                if (index in posts.indices) {
                    val post = posts[index]
                    DiscoveryStoryCard(
                        post = post,
                        modifier = Modifier.fillMaxSize(),
                        onRead = { onStoryClick(post.id) },
                        onPrevious = { if (index > 0) currentIndex = index - 1 },
                        onNext = { if (index < posts.lastIndex) currentIndex = index + 1 },
                        onApplaud = {
                            if (isAuthenticated) viewModel.toggleLike(post.id, post.isLiked, post.likesCnt)
                            else onLoginRequired()
                        },
                        onAuthorClick = onProfileClick
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeHeader(onLibraryClick: () -> Unit, onProfileClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        WritOnBrandMark(width = 118.dp)
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onLibraryClick) {
            Image(painterResource(R.drawable.ic_bookmark), contentDescription = "Open Library", modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.width(12.dp))
        Surface(
            modifier = Modifier.size(44.dp).semantics { contentDescription = "Open profile"; role = Role.Button },
            shape = CircleShape,
            color = HomeChip,
            border = BorderStroke(1.dp, BrandRed.copy(alpha = .45f)),
            onClick = onProfileClick
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(painterResource(R.drawable.ic_profile), contentDescription = null, modifier = Modifier.size(25.dp))
            }
        }
    }
}

@Composable
private fun DiscoveryStoryCard(
    post: PostEntity,
    modifier: Modifier,
    onRead: () -> Unit,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onApplaud: () -> Unit,
    onAuthorClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .pointerInput(post.id) {
                awaitEachGesture {
                    awaitFirstDown(requireUnconsumed = false)
                    var dragX = 0f
                    var dragY = 0f
                    var pressed = true
                    while (pressed) {
                        val event = awaitPointerEvent()
                        event.changes.forEach { change ->
                            dragX += change.positionChange().x
                            dragY += change.positionChange().y
                            pressed = change.pressed
                            change.consume()
                        }
                    }
                    val absX = kotlin.math.abs(dragX)
                    val absY = kotlin.math.abs(dragY)
                    when {
                        absY > absX && dragY < -40f -> onNext()
                        absY > absX && dragY > 40f -> onPrevious()
                        absX > absY * 1.5f && dragX > 100f -> onRead()
                    }
                }
            }
            .semantics {
                contentDescription = "${post.title}, by ${post.authorName}. ${post.readingTimeMin} minute read."
                customActions = listOf(
                    androidx.compose.ui.semantics.CustomAccessibilityAction("Read story") { onRead(); true },
                    androidx.compose.ui.semantics.CustomAccessibilityAction("Next story") { onNext(); true },
                    androidx.compose.ui.semantics.CustomAccessibilityAction("Previous story") { onPrevious(); true },
                    androidx.compose.ui.semantics.CustomAccessibilityAction("Applaud") { onApplaud(); true }
                )
            },
        shape = RoundedCornerShape(24.dp),
        color = HomeSurface,
        border = BorderStroke(1.dp, HomeBorder),
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
            // Story content area - tapping anywhere here opens the story
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() }
                    ) { onRead() }
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(16.dp), color = HomeChip) {
                        Text(
                            post.category.uppercase(),
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = .7.sp,
                            color = BrandRed
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    Image(painterResource(R.drawable.ic_clock_muted), contentDescription = null, modifier = Modifier.size(21.dp))
                    Spacer(Modifier.width(7.dp))
                    Text("${post.readingTimeMin} min read", fontSize = 14.sp, color = HomeMuted)
                }
                Spacer(Modifier.height(24.dp))
                Text(
                    post.title,
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontFamily = HomeEditorialFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 44.sp,
                        lineHeight = 48.sp
                    ),
                    color = HomeInk,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
                post.summary?.takeIf { it.isNotBlank() }?.let { summary ->
                    Spacer(Modifier.height(18.dp))
                    Text(summary, fontSize = 17.sp, lineHeight = 24.sp, color = HomeMuted, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.height(22.dp))
                PostCoverImage(
                    imageUrl = post.coverImage,
                    category = post.category,
                    contentDescription = "Cover image for ${post.title}",
                    modifier = Modifier.fillMaxWidth().height(228.dp),
                    categoryFontSize = 38.sp,
                    forceDefault = true
                )
            }

            // Bottom Footer Area - NOT clickable to open the story! Allows easy scrolling / gestures
            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = HomeBorder, thickness = 1.dp)
            Spacer(Modifier.height(14.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() }
                        ) { onAuthorClick() },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AuthorAvatar(post.authorAvatarUrl, post.authorName, onAuthorClick)
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(post.authorName, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = HomeInk, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("@${post.authorPenName}", fontSize = 13.sp, color = HomeMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                IconButton(onClick = onApplaud, modifier = Modifier.size(46.dp)) {
                    Image(
                        painterResource(if (post.isLiked) R.drawable.ic_applaud_orange else R.drawable.ic_applaud_muted),
                        contentDescription = if (post.isLiked) "Remove applaud" else "Applaud",
                        modifier = Modifier.size(29.dp)
                    )
                }
                Text(formatApplauds(post.likesCnt), fontSize = 16.sp, fontWeight = FontWeight.Medium, color = if (post.isLiked) BrandRed else HomeInk)
            }
        }
    }

}

@Composable
private fun AuthorAvatar(avatarUrl: String?, authorName: String, onClick: () -> Unit) {
    Surface(modifier = Modifier.size(44.dp), shape = CircleShape, color = HomeChip, border = BorderStroke(1.dp, HomeBorder), onClick = onClick) {
        if (avatarUrl.isNullOrBlank()) {
            Box(contentAlignment = Alignment.Center) { Text(authorName.firstOrNull()?.uppercaseChar()?.toString() ?: "W", fontWeight = FontWeight.SemiBold, color = HomeInk) }
        } else {
            AsyncImage(model = avatarUrl, contentDescription = "Open ${authorName}'s profile", modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop)
        }
    }
}

@Composable
private fun EmptyDiscovery(modifier: Modifier = Modifier, onRefresh: () -> Unit = {}) {
    Surface(modifier = modifier.fillMaxWidth(), shape = RoundedCornerShape(28.dp), color = HomeSurface, border = BorderStroke(1.dp, HomeBorder)) {
        Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("Discover Stories", style = MaterialTheme.typography.titleLarge.copy(fontFamily = HomeEditorialFamily), color = HomeInk)
            Spacer(Modifier.height(8.dp))
            Text("Stories are loading from writers...", color = HomeMuted)
            Spacer(Modifier.height(16.dp))
            androidx.compose.material3.Button(
                onClick = onRefresh,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandRed),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Refresh Feed", color = Color.White)
            }
        }
    }
}

private fun formatApplauds(count: Int): String = if (count >= 1000) String.format(java.util.Locale.getDefault(), "%.1fK", count / 1000.0) else count.toString()

