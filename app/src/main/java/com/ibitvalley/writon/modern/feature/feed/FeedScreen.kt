package com.ibitvalley.writon.modern.feature.feed

import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.expandVertically
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.material3.Icon
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable

import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.SystemUpdateAlt
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
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.update.InAppUpdateUiState

val CATEGORIES = listOf(
    "All", "Essays", "Poetry", "Short Stories", "Shayari", "Humour", "Reviews",
    "Journalism", "Tech", "Philosophy", "Satire", "Fiction", "Culture"
)

private val HomeEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private const val ReturnToTopThreshold = 4

@Composable
fun FeedScreen(
    viewModel: FeedViewModel,
    onStoryClick: (String) -> Unit,
    onWriteClick: () -> Unit,
    continuationTitle: String? = null,
    onContinueReading: () -> Unit = {},
    onDismissContinuation: () -> Unit = {},
    draftTitle: String? = null,
    onContinueWriting: () -> Unit = {},
    followedWriterStoryTitle: String? = null,
    followedWriterName: String? = null,
    onFollowedWriterStoryClick: () -> Unit = {},
    onLibraryClick: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
    isAuthenticated: Boolean = true,
    onLoginRequired: () -> Unit = {},
    inAppUpdateUiState: InAppUpdateUiState = InAppUpdateUiState.Hidden,
    onInAppUpdateClick: () -> Unit = {},
    showExistingUserPreferencesCard: Boolean = false,
    onChoosePreferences: () -> Unit = {},
    onDismissPreferences: () -> Unit = {}
) {
    val posts by viewModel.posts.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isLoadingMore by viewModel.isLoadingMore.collectAsState()
    val hasMore by viewModel.hasMore.collectAsState()
    val refreshFailed by viewModel.refreshFailed.collectAsState()
    val loadMoreFailed by viewModel.loadMoreFailed.collectAsState()
    var currentIndex by rememberSaveable { mutableIntStateOf(0) }
    var advanceWhenPageArrives by rememberSaveable { mutableStateOf(false) }
    var showReturnToTop by rememberSaveable { mutableStateOf(false) }
    val safeIndex = currentIndex.coerceIn(0, posts.lastIndex.coerceAtLeast(0))
    LaunchedEffect(posts.size, hasMore) {
        if (currentIndex > posts.lastIndex) currentIndex = 0
        if (advanceWhenPageArrives && currentIndex < posts.lastIndex) {
            currentIndex += 1
            advanceWhenPageArrives = false
        } else if (advanceWhenPageArrives && !hasMore) {
            advanceWhenPageArrives = false
        }
    }

    // Keep the next page ready before the reader reaches the end of the current deck.
    LaunchedEffect(safeIndex, posts.size, hasMore) {
        if (posts.isNotEmpty() && hasMore && safeIndex >= posts.lastIndex - 2) {
            viewModel.loadNextPage()
        }
    }

    LaunchedEffect(safeIndex) {
        if (safeIndex == 0) showReturnToTop = false
    }

    LaunchedEffect(safeIndex, posts.getOrNull(safeIndex)?.id) {
        val visiblePost = posts.getOrNull(safeIndex) ?: return@LaunchedEffect
        kotlinx.coroutines.delay(1_000)
        viewModel.recordImpression(visiblePost.id)
    }

    Column(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(horizontal = 18.dp, vertical = 16.dp)
    ) {
        HomeHeader(
            onLibraryClick = onLibraryClick,
            onSearchClick = onSearchClick,
            onNotificationsClick = onNotificationsClick,
            onProfileClick = onProfileClick
        )
        HomeUpdateIndicator(
            state = inAppUpdateUiState,
            onClick = onInAppUpdateClick
        )
        if (showExistingUserPreferencesCard && posts.isNotEmpty() && !refreshFailed &&
            inAppUpdateUiState == InAppUpdateUiState.Hidden) {
            ExistingUserPreferencesCard(onChoosePreferences, onDismissPreferences)
        }
        draftTitle?.let { title ->
            androidx.compose.material3.TextButton(onClick = onContinueWriting) {
                Text(
                    text = if (title.isBlank()) stringResource(R.string.continue_writing_untitled)
                    else stringResource(R.string.continue_writing_draft, title),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        followedWriterStoryTitle?.takeIf { it.isNotBlank() }?.let { title ->
            FollowedWriterReturnCard(title, followedWriterName, onFollowedWriterStoryClick)
        }
        Spacer(Modifier.height(if (inAppUpdateUiState == InAppUpdateUiState.Hidden) 14.dp else 8.dp))

        if (isRefreshing && posts.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    color = BrandRed,
                    strokeWidth = 2.dp
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    stringResource(R.string.feed_updating),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        if (isLoadingMore && !isRefreshing) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = Modifier.size(14.dp),
                    color = BrandRed,
                    strokeWidth = 2.dp
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    stringResource(R.string.feed_loading_more),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        AnimatedVisibility(
            visible = showReturnToTop && safeIndex > 0,
            enter = expandVertically(animationSpec = tween(180)) + fadeIn(animationSpec = tween(180)),
            exit = shrinkVertically(animationSpec = tween(150)) + fadeOut(animationSpec = tween(150))
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                horizontalArrangement = Arrangement.End
            ) {
                Surface(
                    modifier = Modifier
                        .height(48.dp)
                        .semantics {
                            contentDescription = "Return to the first story"
                            role = Role.Button
                        },
                    shape = RoundedCornerShape(24.dp),
                    color = BrandRed,
                    onClick = {
                        currentIndex = 0
                        advanceWhenPageArrives = false
                        showReturnToTop = false
                    }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_chevron_up_white),
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = "Back to top",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }
        }

        if (posts.isNotEmpty() && refreshFailed) {
            FeedStatusBanner(
                message = stringResource(R.string.feed_offline_cache),
                action = stringResource(R.string.common_retry),
                onAction = viewModel::refreshFeed
            )
        } else if (posts.isNotEmpty() && loadMoreFailed) {
            FeedStatusBanner(
                message = stringResource(R.string.feed_more_failed),
                action = stringResource(R.string.common_retry),
                onAction = viewModel::loadNextPage
            )
        }

        if (posts.isEmpty()) {
            EmptyDiscovery(
                modifier = Modifier.weight(1f),
                state = feedEmptyState(isRefreshing, refreshFailed),
                onRefresh = viewModel::refreshFeed
            )
        } else {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = stringResource(R.string.feed_story_position, safeIndex + 1, posts.size),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    if (safeIndex < posts.lastIndex || hasMore) {
                        Text(
                            text = stringResource(R.string.feed_swipe_for_next),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    }
                }
                if (continuationTitle.isNullOrBlank()) {
                    androidx.compose.material3.TextButton(
                        onClick = {
                            val post = posts[safeIndex]
                            viewModel.recordOpen(post.id)
                            onStoryClick(post.id)
                        }
                    ) {
                        Text(
                            text = stringResource(R.string.notification_action_read_story),
                            color = BrandRed,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                } else {
                    val continuationDescription = stringResource(R.string.continue_reading_story, continuationTitle)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        androidx.compose.material3.TextButton(
                            onClick = onContinueReading,
                            modifier = Modifier.semantics { contentDescription = continuationDescription }
                        ) {
                            Text(
                                text = stringResource(R.string.feed_resume_reading),
                                color = BrandRed,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        IconButton(
                            onClick = onDismissContinuation,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Image(
                                painter = painterResource(R.drawable.ic_close),
                                contentDescription = stringResource(R.string.feed_dismiss_resume),
                                modifier = Modifier.size(16.dp),
                                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                            )
                        }
                    }
                }
            }
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
                        onRead = {
                            viewModel.recordOpen(post.id)
                            onStoryClick(post.id)
                        },
                        onPrevious = {
                            if (index > 0) {
                                if (index >= ReturnToTopThreshold) showReturnToTop = true
                                currentIndex = index - 1
                            }
                        },
                        onNext = {
                            if (index < posts.lastIndex) {
                                currentIndex = index + 1
                            } else if (hasMore) {
                                advanceWhenPageArrives = true
                                viewModel.loadNextPage()
                            }
                        },
                        onApplaud = {
                            if (isAuthenticated) viewModel.toggleLike(post.id, post.isLiked, post.likesCnt)
                            else onLoginRequired()
                        },
                        onAuthorClick = { onAuthorClick(post.authorId) },
                        isFirstCard = (index == 0),
                        onRefresh = { viewModel.refreshFeed() }
                    )
                }
            }
            if (!hasMore && safeIndex == posts.lastIndex) {
                Text(
                    stringResource(R.string.feed_all_caught_up),
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun FollowedWriterReturnCard(
    storyTitle: String,
    writerName: String?,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        onClick = onClick,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.feed_followed_writer_update),
                    color = BrandRed,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = if (writerName.isNullOrBlank()) {
                        stringResource(R.string.feed_followed_writer_story_unknown, storyTitle)
                    } else {
                        stringResource(R.string.feed_followed_writer_story, writerName, storyTitle)
                    },
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 13.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                text = stringResource(R.string.notification_action_read_story),
                modifier = Modifier.padding(start = 10.dp),
                color = BrandRed,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
internal fun ExistingUserPreferencesCard(onChoose: () -> Unit, onDismiss: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(stringResource(R.string.preferences_card_title), fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(stringResource(R.string.preferences_card_body), style = MaterialTheme.typography.bodySmall)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                androidx.compose.material3.TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.preferences_card_dismiss))
                }
                androidx.compose.material3.TextButton(onClick = onChoose) {
                    Text(stringResource(R.string.preferences_card_action), color = BrandRed)
                }
            }
        }
    }
}

@Composable
private fun HomeUpdateIndicator(
    state: InAppUpdateUiState,
    onClick: () -> Unit
) {
    AnimatedVisibility(
        visible = state != InAppUpdateUiState.Hidden,
        enter = fadeIn(animationSpec = tween(180)) + expandVertically(animationSpec = tween(180)),
        exit = fadeOut(animationSpec = tween(140)) + shrinkVertically(animationSpec = tween(140))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
            horizontalArrangement = Arrangement.End
        ) {
            val label = when (state) {
                InAppUpdateUiState.Available -> stringResource(R.string.in_app_update_available)
                InAppUpdateUiState.Downloading -> stringResource(R.string.in_app_update_downloading)
                InAppUpdateUiState.ReadyToInstall -> stringResource(R.string.in_app_update_restart)
                InAppUpdateUiState.Hidden -> ""
            }
            Surface(
                modifier = Modifier
                    .height(36.dp)
                    .clickable(
                        enabled = state != InAppUpdateUiState.Downloading,
                        role = Role.Button,
                        onClick = onClick
                    )
                    .semantics {
                        contentDescription = label
                    },
                shape = RoundedCornerShape(18.dp),
                color = BrandRed.copy(alpha = 0.12f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (state == InAppUpdateUiState.Downloading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = BrandRed,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Outlined.SystemUpdateAlt,
                            contentDescription = null,
                            modifier = Modifier.size(17.dp),
                            tint = BrandRed
                        )
                    }
                    Spacer(Modifier.width(7.dp))
                    Text(
                        text = label,
                        color = BrandRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeHeader(
    onLibraryClick: () -> Unit,
    onSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onProfileClick: () -> Unit
) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        WritOnBrandMark(width = 118.dp)
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSearchClick) {
            Image(
                painterResource(R.drawable.ic_search),
                contentDescription = "Search stories",
                modifier = Modifier.size(25.dp),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
            )
        }
        IconButton(onClick = onNotificationsClick) {
            Image(
                painterResource(R.drawable.ic_notification),
                contentDescription = "Open notifications",
                modifier = Modifier.size(25.dp),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
            )
        }
        IconButton(onClick = onLibraryClick) {
            Image(
                painterResource(R.drawable.ic_bookmark),
                contentDescription = "Open Library",
                modifier = Modifier.size(28.dp),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
            )
        }
        Spacer(Modifier.width(12.dp))
        Surface(
            modifier = Modifier.size(44.dp).semantics { contentDescription = "Open profile"; role = Role.Button },
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant,
            border = BorderStroke(1.dp, BrandRed.copy(alpha = .45f)),
            onClick = onProfileClick
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(
                    painterResource(R.drawable.ic_profile),
                    contentDescription = null,
                    modifier = Modifier.size(25.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
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
    onAuthorClick: () -> Unit,
    isFirstCard: Boolean = false,
    onRefresh: () -> Unit = {}
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
                        absY > absX && dragY > 40f -> {
                            if (isFirstCard) {
                                onRefresh()
                            } else {
                                onPrevious()
                            }
                        }
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
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
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
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = BrandRed.copy(alpha = 0.10f)
                    ) {
                        Text(
                            post.category.uppercase(),
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = .7.sp,
                            color = BrandRed,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    Spacer(Modifier.width(12.dp))
                    Image(
                        painterResource(R.drawable.ic_clock_muted),
                        contentDescription = null,
                        modifier = Modifier.size(21.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                    Spacer(Modifier.width(7.dp))
                    Text(
                        "${post.readingTimeMin} min read",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Clip
                    )
                }
                Spacer(Modifier.height(24.dp))
                Text(
                    post.title,
                    modifier = Modifier.fillMaxWidth().height(108.dp),
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontFamily = HomeEditorialFamily,
                        fontWeight = FontWeight.Normal,
                        fontSize = 27.sp,
                        lineHeight = 33.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(12.dp))
                Box(modifier = Modifier.fillMaxWidth().height(76.dp)) {
                    post.summary?.takeIf { it.isNotBlank() }?.let { summary ->
                        Text(summary, fontSize = 16.sp, lineHeight = 23.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    }
                }
                Spacer(Modifier.height(14.dp))
                PostCoverImage(
                    imageUrl = post.coverImage,
                    category = post.category,
                    contentDescription = "Cover image for ${post.title}",
                    modifier = Modifier.fillMaxWidth().height(228.dp),
                    categoryFontSize = 38.sp
                )
            }

            // Bottom Footer Area - NOT clickable to open the story! Allows easy scrolling / gestures
            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 1.dp)
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
                        Text(post.authorName, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("@${post.authorPenName}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                IconButton(onClick = onApplaud, modifier = Modifier.size(46.dp)) {
                    Image(
                        painterResource(if (post.isLiked) R.drawable.ic_applaud_orange else R.drawable.ic_applaud_muted),
                        contentDescription = if (post.isLiked) "Remove applaud" else "Applaud",
                        modifier = Modifier.size(29.dp)
                    )
                }
                Text(formatApplauds(post.likesCnt), fontSize = 16.sp, fontWeight = FontWeight.Medium, color = if (post.isLiked) BrandRed else MaterialTheme.colorScheme.onSurface)
            }
        }
    }

}

@Composable
private fun AuthorAvatar(avatarUrl: String?, authorName: String, onClick: () -> Unit) {
    com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar(
        url = avatarUrl,
        name = authorName,
        size = 44.dp,
        onClick = onClick
    )
}

@Composable
private fun FeedStatusBanner(message: String, action: String, onAction: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(message, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        androidx.compose.material3.TextButton(onClick = onAction) { Text(action) }
    }
}

@Composable
private fun EmptyDiscovery(
    modifier: Modifier = Modifier,
    state: FeedEmptyState,
    onRefresh: () -> Unit = {}
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            if (state == FeedEmptyState.LOADING) {
                CircularProgressIndicator(color = BrandRed)
                Spacer(Modifier.height(16.dp))
            }
            Text(
                stringResource(
                    when (state) {
                        FeedEmptyState.LOADING -> R.string.feed_loading_title
                        FeedEmptyState.FAILURE -> R.string.feed_error_title
                        FeedEmptyState.EMPTY -> R.string.feed_discovery_empty_title
                    }
                ),
                style = MaterialTheme.typography.titleLarge.copy(fontFamily = HomeEditorialFamily),
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(
                    when (state) {
                        FeedEmptyState.LOADING -> R.string.feed_loading_message
                        FeedEmptyState.FAILURE -> R.string.feed_error_message
                        FeedEmptyState.EMPTY -> R.string.feed_discovery_empty_message
                    }
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (state != FeedEmptyState.LOADING) {
                Spacer(Modifier.height(16.dp))
                androidx.compose.material3.Button(
                    onClick = onRefresh,
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandRed),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(stringResource(R.string.common_retry), color = Color.White)
                }
            }
        }
    }
}

private fun formatApplauds(count: Int): String = if (count >= 1000) String.format(java.util.Locale.getDefault(), "%.1fK", count / 1000.0) else count.toString()

