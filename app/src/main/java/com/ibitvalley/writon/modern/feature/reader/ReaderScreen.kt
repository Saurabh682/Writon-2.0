package com.ibitvalley.writon.modern.feature.reader
import androidx.compose.ui.res.stringResource

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import coil.compose.AsyncImage

import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.canonicalStoryShareUrl
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.notification.qualifiesForReadingNotificationPrompt
import com.ibitvalley.writon.modern.core.preferences.continuationScrollOffset
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import com.ibitvalley.writon.modern.feature.launch.startActivitySafely
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.designsystem.theme.getThemeColorScheme
import com.ibitvalley.writon.modern.core.config.WritOnRemoteConfig
import com.ibitvalley.writon.modern.feature.reader.card.StoryCardSheet
import com.ibitvalley.writon.modern.feature.reader.card.ExcerptSuggester
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Style
import androidx.compose.material.icons.filled.FormatQuote
import androidx.compose.material.icons.filled.Close
import androidx.compose.foundation.border
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

private val ReaderEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    viewModel: ReaderViewModel,
    userPreferences: com.ibitvalley.writon.modern.core.preferences.UserPreferences? = null,
    continuationAccountId: String? = null,
    onBackClick: () -> Unit,
    onAuthorClick: (String) -> Unit = {},
    onDiscoverMore: () -> Unit = {},
    onNextStoryClick: (String) -> Unit = {},
    onCommentsClick: () -> Unit = {},
    onLoginRequired: () -> Unit = {},
    onReadingValueMoment: () -> Unit = {},
    onBookmarkValueMoment: () -> Unit = {}
) {
    val post by viewModel.post.collectAsState()
    val nextStory by viewModel.nextStory.collectAsState()
    val comments by viewModel.comments.collectAsState()
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    var showAppearanceSheet by remember { mutableStateOf(false) }
    var showCardSheet by remember { mutableStateOf(false) }
    var cardExcerptMode by remember { mutableStateOf(false) }
    var selectedExcerptText by remember { mutableStateOf("") }
    val isQuoteCardEnabled = remember { WritOnRemoteConfig.isQuoteCardShareEnabled }

    var openedLogged by remember(post?.id) { mutableStateOf(false) }
    var completedLogged by remember(post?.id) { mutableStateOf(false) }
    var maxProgress by remember(post?.id) { mutableFloatStateOf(0f) }
    var activeSeconds by remember(post?.id) { mutableIntStateOf(0) }
    var hasRestoredPosition by remember(post?.id) { mutableStateOf(false) }

    // Telemetry: Log Story Opened once per story instance
    LaunchedEffect(post?.id) {
        val story = post ?: return@LaunchedEffect
        if (!openedLogged) {
            WritOnTelemetry.storyOpened(
                context = context,
                storyId = story.id,
                title = story.title,
                authorId = story.authorId,
                readingTimeMin = story.readingTimeMin
            )
            openedLogged = true
        }
    }

    // Reading Continuation: Restore last known scroll position
    LaunchedEffect(post?.id, scrollState.maxValue) {
        val story = post ?: return@LaunchedEffect
        if (scrollState.maxValue > 0 && !hasRestoredPosition) {
            val continuation = userPreferences?.readingContinuation(continuationAccountId)
            if (continuation != null && continuation.storyId == story.id) {
                val offset = continuationScrollOffset(continuation.progress, scrollState.maxValue)
                if (offset > 0) {
                    scrollState.scrollTo(offset)
                }
            }
            hasRestoredPosition = true
        }
    }

    // Active Engagement & Completion Loop
    LaunchedEffect(post?.id) {
        val story = post ?: return@LaunchedEffect
        while (isActive) {
            delay(1000L)
            activeSeconds += 1
            if (scrollState.maxValue > 0) {
                val curProgress = (scrollState.value.toFloat() / scrollState.maxValue).coerceIn(0f, 1f)
                if (curProgress > maxProgress) {
                    maxProgress = curProgress
                }
            }
            // Periodically flush engagement and persist reading continuation
            if (activeSeconds > 0 && activeSeconds % 10 == 0) {
                viewModel.recordEngagement(maxProgress, 10)
                userPreferences?.saveReadingContinuation(continuationAccountId, story.id, maxProgress)
            }
            // Story Completion Threshold (Scorecard Funnel: >= 75% scroll depth & >= 15s dwell)
            if (!completedLogged && maxProgress >= 0.75f && activeSeconds >= 15) {
                completedLogged = true
                WritOnTelemetry.storyCompleted(
                    context = context,
                    storyId = story.id,
                    authorId = story.authorId,
                    readingTimeMin = story.readingTimeMin,
                    readSeconds = activeSeconds
                )
            }
            if (qualifiesForReadingNotificationPrompt(maxProgress, activeSeconds)) {
                onReadingValueMoment()
            }
        }
    }

    // Lifecycle Observer: Flush uncommitted reading time and continuation on pause/exit
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, post?.id) {
        val storyId = post?.id
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_PAUSE || event == Lifecycle.Event.ON_STOP) {
                val remainingSeconds = activeSeconds % 10
                if (remainingSeconds > 0) {
                    viewModel.recordEngagement(maxProgress, remainingSeconds)
                }
                if (storyId != null) {
                    userPreferences?.saveReadingContinuation(continuationAccountId, storyId, maxProgress)
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            val remainingSeconds = activeSeconds % 10
            if (storyId != null) {
                viewModel.onReaderClosed(maxProgress, remainingSeconds)
                userPreferences?.saveReadingContinuation(continuationAccountId, storyId, maxProgress)
            }
        }
    }

    val savedReaderPreferences = remember(userPreferences) { userPreferences?.readerPreferences }
    var readerFontSizeSp by remember(savedReaderPreferences) { mutableFloatStateOf(savedReaderPreferences?.fontSizeSp ?: 20f) }
    var readerLineMultiplier by remember(savedReaderPreferences) { mutableFloatStateOf(savedReaderPreferences?.lineHeightMultiplier ?: 1.6f) }
    var readerFontFamilyChoice by remember(savedReaderPreferences) { mutableStateOf(savedReaderPreferences?.fontFamily ?: "serif") }
    var readerThemeChoice by remember(userPreferences) { mutableStateOf(userPreferences?.readerThemeMode ?: "paper") }
    fun saveReaderOptions() {
        userPreferences?.saveReaderPreferences(
            com.ibitvalley.writon.modern.core.preferences.ReaderPreferences(
                fontSizeSp = readerFontSizeSp,
                lineHeightMultiplier = readerLineMultiplier,
                fontFamily = readerFontFamilyChoice
            )
        )
        userPreferences?.readerThemeMode = readerThemeChoice
    }

    val isSystemDark = androidx.compose.foundation.isSystemInDarkTheme()
    MaterialTheme(colorScheme = getThemeColorScheme(readerThemeChoice, isSystemDark)) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Image(
                            painterResource(R.drawable.ic_back),
                            stringResource(R.string.common_back),
                            Modifier.size(24.dp),
                            colorFilter = androidx.compose.ui.graphics.ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showAppearanceSheet = true }) {
                        Text(
                            "Aa",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontFamily = ReaderEditorialFamily,
                                fontWeight = FontWeight.Bold
                            ),
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                    IconButton(onClick = {
                        val isGuest = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null
                        viewModel.toggleBookmark {
                            onBookmarkValueMoment()
                        }
                        post?.let { WritOnTelemetry.storyBookmarked(context, it.id, isGuest) }
                    }) {
                        Image(
                            painterResource(if (post?.isBookmarked == true) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark),
                            if (post?.isBookmarked == true) stringResource(R.string.reader_bookmark_saved) else stringResource(R.string.reader_bookmark_save),
                            Modifier.size(24.dp),
                            colorFilter = if (post?.isBookmarked == true) null else androidx.compose.ui.graphics.ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                    if (isQuoteCardEnabled) {
                        IconButton(onClick = {
                            post?.let { currentPost ->
                                selectedExcerptText = ExcerptSuggester.suggestExcerpt(currentPost.content, currentPost.title)
                                showCardSheet = true
                            }
                        }) {
                            Icon(
                                imageVector = Icons.Default.FormatQuote,
                                contentDescription = "Share Story Card",
                                modifier = Modifier.size(24.dp),
                                tint = BrandRed
                            )
                        }
                    }
                    IconButton(onClick = { post?.let { shareStory(context, it) } }) {
                        Image(
                            painterResource(R.drawable.ic_share),
                            stringResource(R.string.reader_share_action),
                            Modifier.size(24.dp),
                            colorFilter = androidx.compose.ui.graphics.ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        bottomBar = {
            post?.let { story ->
                ReaderActionTray(
                    post = story,
                    commentsCount = comments.size,
                    onApplaud = {
                        if (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null) onLoginRequired()
                        else viewModel.toggleLike()
                    },
                    onComment = onCommentsClick,
                    onSave = {
                        val isGuest = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null
                        viewModel.toggleBookmark {
                            onBookmarkValueMoment()
                        }
                        story.let { WritOnTelemetry.storyBookmarked(context, it.id, isGuest) }
                    },
                    onShare = { shareStory(context, story) },
                    onCardShare = if (isQuoteCardEnabled) {
                        {
                            selectedExcerptText = ExcerptSuggester.suggestExcerpt(story.content, story.title)
                            showCardSheet = true
                        }
                    } else null
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        post?.let { story ->
            val contentBlocks = remember(story.content) { parseReaderContent(story.content) }
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(scrollState)
                    .padding(horizontal = WritOnSpacing.lg)
                    .padding(top = WritOnSpacing.lg, bottom = WritOnSpacing.xxl)
            ) {
                Text(story.category.uppercase(), style = MaterialTheme.typography.labelLarge, color = BrandRed, letterSpacing = 1.1.sp)
                Spacer(Modifier.height(WritOnSpacing.md))
                Text(
                    story.title,
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontFamily = ReaderEditorialFamily,
                        fontSize = 38.sp,
                        lineHeight = 46.sp,
                        fontWeight = FontWeight.Normal
                    ),
                    color = MaterialTheme.colorScheme.onBackground
                )
                story.summary?.let { summary ->
                    Spacer(Modifier.height(WritOnSpacing.lg))
                    Text(
                        summary,
                        style = MaterialTheme.typography.bodyLarge.copy(fontFamily = ReaderEditorialFamily, fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(Modifier.height(WritOnSpacing.xl))
                ReaderAuthorMetadata(story, onClick = { onAuthorClick(story.authorId) })
                HorizontalDivider(Modifier.padding(vertical = WritOnSpacing.xl), color = MaterialTheme.colorScheme.outlineVariant)
                if (contentBlocks.isEmpty()) {
                    Text("This story has no text yet.", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    ReaderBody(
                        blocks = contentBlocks,
                        fontSizeSp = readerFontSizeSp,
                        lineMultiplier = readerLineMultiplier,
                        fontFamilyChoice = readerFontFamilyChoice,
                        cardExcerptMode = cardExcerptMode,
                        onParagraphSelected = if (isQuoteCardEnabled) {
                            { text ->
                                selectedExcerptText = text
                                showCardSheet = true
                            }
                        } else null
                    )
                }
                Spacer(Modifier.height(WritOnSpacing.xxl))

                ReaderContinuationCard(
                    currentStory = story,
                    nextStory = nextStory,
                    onAuthorClick = { onAuthorClick(story.authorId) },
                    onNextStoryClick = onNextStoryClick,
                    onDiscoverMore = onDiscoverMore
                )
                Spacer(Modifier.height(WritOnSpacing.xxl))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(WritOnRadius.card))
                        .clickable(onClick = onCommentsClick)
                        .padding(vertical = WritOnSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Responses (${comments.size.coerceAtLeast(story.commentsCnt)})",
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontFamily = ReaderEditorialFamily,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "View all",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                        color = BrandRed
                    )
                }
                Spacer(Modifier.height(WritOnSpacing.md))
                if (comments.isEmpty()) {
                    Text(
                        "No responses yet. Tap to leave the first response.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.clickable(onClick = onCommentsClick)
                    )
                } else {
                    comments.take(3).forEach { comment ->
                        ReaderComment(comment.authorName, comment.authorAvatarUrl, comment.content, comment.createdAt)
                        Spacer(Modifier.height(WritOnSpacing.lg))
                    }
                    if (comments.size > 3) {
                        Text(
                            "See all ${comments.size} responses →",
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                            color = BrandRed,
                            modifier = Modifier.clickable(onClick = onCommentsClick)
                        )
                    }
                }
            }
        }
    }

    if (showAppearanceSheet) {
        val appearanceSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showAppearanceSheet = false },
            sheetState = appearanceSheetState,
            containerColor = MaterialTheme.colorScheme.surface,
            dragHandle = { BottomSheetDefaults.DragHandle(color = MaterialTheme.colorScheme.outlineVariant) }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 36.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Text(
                    stringResource(R.string.reader_typography),
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontFamily = ReaderEditorialFamily,
                        fontWeight = FontWeight.Bold
                    )
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    listOf(
                        "paper" to R.string.reader_theme_paper,
                        "sepia" to R.string.reader_theme_sepia,
                        "dark" to R.string.reader_theme_dark
                    ).forEach { (theme, labelRes) ->
                        val selected = readerThemeChoice == theme
                        Button(
                            onClick = {
                                readerThemeChoice = theme
                                userPreferences?.readerThemeMode = theme
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(stringResource(labelRes), fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }

                // Font Size Stepper
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("A", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Slider(
                        value = readerFontSizeSp,
                        onValueChange = {
                            readerFontSizeSp = it
                            saveReaderOptions()
                        },
                        valueRange = 16f..24f,
                        steps = 3,
                        modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
                        colors = SliderDefaults.colors(
                            thumbColor = MaterialTheme.colorScheme.primary,
                            activeTrackColor = MaterialTheme.colorScheme.primary
                        )
                    )
                    Text("A", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }

                // Line Height Selection
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    listOf(
                        1.3f to "Compact",
                        1.6f to "Relaxed",
                        1.9f to "Spacious"
                    ).forEach { (mult, label) ->
                        val selected = (readerLineMultiplier - mult).let { kotlin.math.abs(it) < 0.15f }
                        Button(
                            onClick = {
                                readerLineMultiplier = mult
                                saveReaderOptions()
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(label, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }

                // Font Family Selection
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    listOf(
                        "serif" to "Serif",
                        "sans" to "Sans",
                        "mono" to "Mono"
                    ).forEach { (family, label) ->
                        val selected = readerFontFamilyChoice == family
                        Button(
                            onClick = {
                                readerFontFamilyChoice = family
                                saveReaderOptions()
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(label, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }
        }
    }

    if (showCardSheet) {
        post?.let { currentStory ->
            val cardSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            StoryCardSheet(
                sheetState = cardSheetState,
                initialExcerpt = selectedExcerptText.ifBlank {
                    ExcerptSuggester.suggestExcerpt(currentStory.content, currentStory.title)
                },
                post = currentStory,
                onDismiss = {
                    showCardSheet = false
                    cardExcerptMode = false
                }
            )
        }
    }

    }
}


@Composable
private fun ReaderAuthorMetadata(post: PostEntity, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(WritOnRadius.field))
            .clickable(onClick = onClick),
        verticalAlignment = Alignment.CenterVertically
    ) {
        com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar(
            url = post.authorAvatarUrl,
            name = post.authorName,
            size = 52.dp,
            onClick = onClick
        )
        Spacer(Modifier.width(WritOnSpacing.md))
        Column {
            Text(
                post.authorName,
                style = MaterialTheme.typography.bodyLarge.copy(fontFamily = ReaderEditorialFamily, fontWeight = FontWeight.Bold)
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${post.readingTimeMin} min read", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("  •  ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("${post.likesCnt} applauds", style = MaterialTheme.typography.bodyMedium, color = BrandRed)
            }
        }
    }
}

@Composable
private fun ReaderBody(
    blocks: List<ReaderContentBlock>,
    fontSizeSp: Float = 20f,
    lineMultiplier: Float = 1.6f,
    fontFamilyChoice: String = "serif",
    cardExcerptMode: Boolean = false,
    onParagraphSelected: ((String) -> Unit)? = null
) {
    if (blocks.isEmpty()) return

    val chosenFontFamily = when (fontFamilyChoice) {
        "sans" -> FontFamily.Default
        "mono" -> FontFamily.Monospace
        else -> ReaderEditorialFamily
    }

    val bodyTextStyle = MaterialTheme.typography.bodyLarge.copy(
        fontFamily = chosenFontFamily,
        fontSize = fontSizeSp.sp,
        lineHeight = (fontSizeSp * lineMultiplier).sp,
        fontWeight = FontWeight.Normal,
        platformStyle = PlatformTextStyle(includeFontPadding = false),
        lineHeightStyle = LineHeightStyle(
            alignment = LineHeightStyle.Alignment.Top,
            trim = LineHeightStyle.Trim.Both
        )
    )

    var hasRenderedText = false
    blocks.forEachIndexed { index, block ->
        if (index > 0) {
            val continuesList = block is ReaderContentBlock.ListItem && blocks[index - 1] is ReaderContentBlock.ListItem
            Spacer(Modifier.height(if (continuesList) WritOnSpacing.xs else WritOnSpacing.lg))
        }
        when (block) {
            ReaderContentBlock.Divider -> HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            is ReaderContentBlock.Quote -> {
                val quoteModifier = if (onParagraphSelected != null) {
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onParagraphSelected(block.text) }
                        .padding(vertical = 4.dp)
                } else Modifier

                Box(modifier = quoteModifier) {
                    ReaderQuoteBlock(block.text, bodyTextStyle, fontSizeSp, lineMultiplier)
                }
            }
            is ReaderContentBlock.Heading -> Text(
                text = editorMarkupText(block.text),
                style = bodyTextStyle.copy(
                    fontSize = (fontSizeSp * when (block.level) {
                        1 -> 1.8f
                        2 -> 1.4f
                        else -> 1.1f
                    }).sp,
                    lineHeight = (fontSizeSp * when (block.level) {
                        1 -> 2.25f
                        2 -> 1.9f
                        else -> 1.6f
                    }).sp,
                    fontWeight = FontWeight.SemiBold
                )
            )
            is ReaderContentBlock.ListItem -> Row(verticalAlignment = Alignment.Top) {
                Text(
                    text = if (block.number == null) "•" else "${block.number}.",
                    style = bodyTextStyle.copy(fontWeight = FontWeight.SemiBold),
                    modifier = Modifier.width(28.dp)
                )
                Text(editorMarkupText(block.text), style = bodyTextStyle, modifier = Modifier.weight(1f))
            }
            is ReaderContentBlock.Paragraph -> {
                val paragraphModifier = if (onParagraphSelected != null) {
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onParagraphSelected(block.text) }
                        .padding(vertical = 4.dp)
                } else Modifier

                Box(modifier = paragraphModifier) {
                    val startsWithInlineMarkup = block.text.trimStart().startsWithAny("**", "__", "*", "_")
                    if (!hasRenderedText && !startsWithInlineMarkup) {
                        val dropCap = block.text.take(1)
                        val rest = block.text.drop(1).trimStart()
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text(
                                text = dropCap,
                                style = MaterialTheme.typography.displayLarge.copy(
                                    fontFamily = chosenFontFamily,
                                    fontSize = (fontSizeSp * 2.8f).sp,
                                    lineHeight = (fontSizeSp * 2.5f).sp,
                                    fontWeight = FontWeight.Bold,
                                    platformStyle = PlatformTextStyle(includeFontPadding = false),
                                    lineHeightStyle = LineHeightStyle(
                                        alignment = LineHeightStyle.Alignment.Top,
                                        trim = LineHeightStyle.Trim.Both
                                    )
                                ),
                                modifier = Modifier
                                    .offset(y = (-5).dp)
                                    .padding(end = 8.dp)
                            )
                            Text(
                                text = editorMarkupText(rest),
                                style = bodyTextStyle,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    } else {
                        Text(editorMarkupText(block.text), style = bodyTextStyle)
                    }
                }
                hasRenderedText = true
            }
        }
    }
}

@Composable
private fun ReaderQuoteBlock(
    text: String,
    bodyTextStyle: androidx.compose.ui.text.TextStyle,
    fontSizeSp: Float,
    lineMultiplier: Float
) {
    Row(verticalAlignment = Alignment.Top) {
        VerticalDivider(
            modifier = Modifier.heightIn(min = (fontSizeSp * lineMultiplier).dp),
            color = BrandRed
        )
        Spacer(Modifier.width(WritOnSpacing.sm))
        Text(
            text = editorMarkupText(text),
            style = bodyTextStyle,
            modifier = Modifier.weight(1f)
        )
    }
}

private sealed interface ReaderContentBlock {
    data class Paragraph(val text: String) : ReaderContentBlock
    data class Quote(val text: String) : ReaderContentBlock
    data class Heading(val level: Int, val text: String) : ReaderContentBlock
    data class ListItem(val text: String, val number: Int? = null) : ReaderContentBlock
    data object Divider : ReaderContentBlock
}

/** Parses the small Markdown subset used by imported legacy stories without executing HTML. */
private fun parseReaderContent(content: String): List<ReaderContentBlock> {
    val blocks = mutableListOf<ReaderContentBlock>()
    val lines = mutableListOf<String>()
    var isQuoteBlock: Boolean? = null

    fun flushTextBlock() {
        if (lines.isNotEmpty()) {
            val text = lines.joinToString("\n").trim()
            if (text.isNotEmpty()) {
                blocks += if (isQuoteBlock == true) ReaderContentBlock.Quote(text) else ReaderContentBlock.Paragraph(text)
            }
        }
        lines.clear()
        isQuoteBlock = null
    }

    content.replace("\r\n", "\n").lineSequence().forEach { rawLine ->
        val trimmed = rawLine.trim()
        when {
            trimmed.isBlank() -> flushTextBlock()
            Regex("^#{1,6}\\s+.+$").matches(trimmed) -> {
                flushTextBlock()
                val marker = trimmed.takeWhile { it == '#' }
                blocks += ReaderContentBlock.Heading(marker.length.coerceAtMost(3), trimmed.drop(marker.length).trimStart())
            }
            Regex("^[-*+•]\\s+.+$").matches(trimmed) -> {
                flushTextBlock()
                blocks += ReaderContentBlock.ListItem(trimmed.replaceFirst(Regex("^[-*+•]\\s+"), ""))
            }
            Regex("^\\d+\\.\\s+.+$").matches(trimmed) -> {
                flushTextBlock()
                val match = Regex("^(\\d+)\\.\\s+(.+)$").matchEntire(trimmed)!!
                blocks += ReaderContentBlock.ListItem(match.groupValues[2], match.groupValues[1].toIntOrNull())
            }
            trimmed in setOf("---", "***", "___") -> {
                flushTextBlock()
                blocks += ReaderContentBlock.Divider
            }
            else -> {
                val isQuote = trimmed.startsWith(">")
                if (isQuoteBlock != null && isQuoteBlock != isQuote) flushTextBlock()
                isQuoteBlock = isQuote
                lines += if (isQuote) trimmed.removePrefix(">").trimStart() else rawLine.trim()
            }
        }
    }
    flushTextBlock()
    return blocks
}

private fun editorMarkupText(value: String): AnnotatedString = buildAnnotatedString {
    val tokenPattern = Regex("(\\*\\*.+?\\*\\*|__.+?__|\\*.+?\\*|_.+?_)")
    var cursor = 0
    tokenPattern.findAll(value).forEach { match ->
        append(value.substring(cursor, match.range.first))
        val token = match.value
        when {
            token.startsWith("**") -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(token.removePrefix("**").removeSuffix("**")) }
            token.startsWith("__") -> withStyle(SpanStyle(textDecoration = TextDecoration.Underline)) { append(token.removePrefix("__").removeSuffix("__")) }
            token.startsWith("*") -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(token.removePrefix("*").removeSuffix("*")) }
            else -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(token.removePrefix("_").removeSuffix("_")) }
        }
        cursor = match.range.last + 1
    }
    append(value.substring(cursor))
}

private fun String.startsWithAny(vararg prefixes: String): Boolean = prefixes.any(::startsWith)


@Composable
private fun ReaderActionTray(
    post: PostEntity,
    commentsCount: Int,
    onApplaud: () -> Unit,
    onComment: () -> Unit,
    onSave: () -> Unit,
    onShare: () -> Unit,
    onCardShare: (() -> Unit)? = null
) {
    Surface(color = MaterialTheme.colorScheme.background) {
        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = WritOnSpacing.md, vertical = WritOnSpacing.sm),
            shape = RoundedCornerShape(WritOnRadius.feature),
            color = MaterialTheme.colorScheme.surface,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
            tonalElevation = WritOnElevation.flat,
            shadowElevation = WritOnElevation.raised
        ) {
            Row(Modifier.fillMaxWidth().padding(vertical = WritOnSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
                ReaderTrayAction("Applaud", post.likesCnt, onApplaud, post.isLiked) {
                    Image(painterResource(if (post.isLiked) R.drawable.ic_applaud_orange else R.drawable.ic_applaud_muted), null, Modifier.size(26.dp))
                }
                ReaderTrayDivider()
                ReaderTrayAction("Comment", commentsCount, onComment) {
                    Image(
                        painterResource(R.drawable.ic_comment),
                        null,
                        Modifier.size(26.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurface)
                    )
                }
                ReaderTrayDivider()
                ReaderTrayAction("Save", null, onSave, post.isBookmarked) {
                    Image(
                        painterResource(if (post.isBookmarked) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark),
                        null,
                        Modifier.size(26.dp),
                        colorFilter = if (post.isBookmarked) null else ColorFilter.tint(MaterialTheme.colorScheme.onSurface)
                    )
                }
                ReaderTrayDivider()
                ReaderTrayAction("Share", null, onShare) {
                    Image(
                        painterResource(R.drawable.ic_share),
                        null,
                        Modifier.size(26.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurface)
                    )
                }
                if (onCardShare != null) {
                    ReaderTrayDivider()
                    ReaderTrayAction("Card", null, onCardShare) {
                        Icon(
                            imageVector = Icons.Default.FormatQuote,
                            contentDescription = "Card",
                            modifier = Modifier.size(26.dp),
                            tint = BrandRed
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RowScope.ReaderTrayAction(label: String, count: Int?, onClick: () -> Unit, isAccent: Boolean = false, icon: @Composable () -> Unit) {
    val color = if (isAccent) BrandRed else MaterialTheme.colorScheme.onSurface
    Column(
        Modifier.weight(1f).clip(RoundedCornerShape(WritOnRadius.field)).clickable(onClick = onClick).padding(vertical = WritOnSpacing.xs),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CompositionLocalProvider(LocalContentColor provides color) { icon() }
            count?.let { Spacer(Modifier.width(WritOnSpacing.xs)); Text(it.toString(), style = MaterialTheme.typography.labelLarge, color = color) }
        }
        Spacer(Modifier.height(WritOnSpacing.xxs))
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ReaderTrayDivider() = VerticalDivider(Modifier.height(52.dp), color = MaterialTheme.colorScheme.outlineVariant)

@Composable
private fun ReaderComment(name: String, avatarUrl: String?, content: String, timestamp: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar(
            url = avatarUrl,
            name = name,
            size = 36.dp
        )
        Spacer(Modifier.width(WritOnSpacing.sm))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(name, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.width(WritOnSpacing.xs))
                Text(timestamp.take(10), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(WritOnSpacing.xxs))
            Text(content, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private fun shareStory(context: Context, post: PostEntity) {
    val shareUrl = canonicalStoryShareUrl(post.slug)
    val intent = Intent(Intent.ACTION_SEND).apply {
        putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.reader_share_subject, post.title))
        putExtra(
            Intent.EXTRA_TEXT,
            context.getString(R.string.reader_share_message, post.title, post.authorName, shareUrl),
        )
        type = "text/plain"
    }
    WritOnTelemetry.logShare("story", post.id, context)
    context.startActivitySafely(Intent.createChooser(intent, null))
}

@Composable
private fun ReaderContinuationCard(
    currentStory: PostEntity,
    nextStory: PostEntity?,
    onAuthorClick: () -> Unit,
    onNextStoryClick: (String) -> Unit,
    onDiscoverMore: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.card),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WritOnSpacing.lg)
        ) {
            if (nextStory != null) {
                val reason = when (nextStoryReason(currentStory, nextStory)) {
                    NextStoryReason.SAME_WRITER -> stringResource(R.string.reader_more_from_writer, nextStory.authorName)
                    NextStoryReason.SAME_CATEGORY -> stringResource(R.string.reader_next_same_category, nextStory.category)
                    NextStoryReason.SAME_LANGUAGE -> stringResource(R.string.reader_next_same_language)
                    NextStoryReason.DIFFERENT_WRITER -> stringResource(R.string.reader_next_different_writer)
                    NextStoryReason.RECOMMENDED -> stringResource(R.string.reader_next_recommended)
                }
                Text(
                    text = reason.uppercase(),
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    ),
                    color = BrandRed
                )
                Spacer(Modifier.height(WritOnSpacing.sm))
                Text(
                    text = nextStory.title,
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontFamily = ReaderEditorialFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        lineHeight = 28.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
                nextStory.summary?.takeIf { it.isNotBlank() }?.let { summary ->
                    Spacer(Modifier.height(WritOnSpacing.xs))
                    Text(
                        text = summary,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.height(WritOnSpacing.md))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(
                            R.string.reader_next_story_meta,
                            nextStory.authorName,
                            nextStory.readingTimeMin,
                        ),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.weight(1f))
                    Button(
                        onClick = { onNextStoryClick(nextStory.id) },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRed),
                        shape = RoundedCornerShape(WritOnRadius.pill),
                        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = stringResource(R.string.reader_read_next),
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                            color = Color.White
                        )
                    }
                }
            } else {
                Text(
                    text = "MORE TO EXPLORE",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    ),
                    color = BrandRed
                )
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    text = "Find your next five-minute read",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = ReaderEditorialFamily,
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    text = "Browse curated stories across poetry, fiction, essays, and craft notes.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(WritOnSpacing.md))
                OutlinedButton(
                    onClick = onDiscoverMore,
                    shape = RoundedCornerShape(WritOnRadius.pill),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandRed),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandRed)
                ) {
                    Text(
                        text = "Discover More Stories",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold)
                    )
                }
            }

            HorizontalDivider(
                modifier = Modifier.padding(vertical = WritOnSpacing.md),
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onAuthorClick),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Written by ${currentStory.authorName}",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.weight(1f))
                Text(
                    text = "View profile →",
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = BrandRed
                )
            }
        }
    }
}

@Composable
private fun CommentsPaneContent(
    comments: List<com.ibitvalley.writon.modern.core.database.model.CommentEntity>,
    commentInput: String,
    onCommentChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onClose: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.85f)
            .padding(horizontal = WritOnSpacing.lg)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = WritOnSpacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Responses (${comments.size})",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontFamily = ReaderEditorialFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp
                ),
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onClose) {
                Image(
                    painter = painterResource(R.drawable.ic_close),
                    contentDescription = "Close responses",
                    modifier = Modifier.size(22.dp)
                )
            }
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

        // Comments List
        if (comments.isEmpty()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(vertical = WritOnSpacing.xxl),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Image(
                        painter = painterResource(R.drawable.ic_comment_muted),
                        contentDescription = null,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(Modifier.height(WritOnSpacing.md))
                    Text(
                        "No responses yet",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontFamily = ReaderEditorialFamily,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                    Spacer(Modifier.height(WritOnSpacing.xs))
                    Text(
                        "What are your thoughts on this story?\nBe the first to share a response.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(vertical = WritOnSpacing.md),
                verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)
            ) {
                items(comments) { comment ->
                    ReaderComment(
                        name = comment.authorName,
                        avatarUrl = comment.authorAvatarUrl,
                        content = comment.content,
                        timestamp = comment.createdAt
                    )
                    HorizontalDivider(
                        modifier = Modifier.padding(top = WritOnSpacing.md),
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                    )
                }
            }
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

        // Input composer bar at bottom of pane
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = WritOnSpacing.md),
            color = MaterialTheme.colorScheme.surface
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextField(
                    value = commentInput,
                    onValueChange = onCommentChange,
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(WritOnRadius.card)),
                    placeholder = {
                        Text(
                            "What are your thoughts?",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        cursorColor = BrandRed
                    ),
                    maxLines = 3
                )
                Spacer(Modifier.width(WritOnSpacing.sm))
                Button(
                    onClick = onSubmit,
                    enabled = commentInput.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BrandRed,
                        disabledContainerColor = BrandRed.copy(alpha = 0.4f)
                    ),
                    shape = RoundedCornerShape(WritOnRadius.pill),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text("Respond", style = MaterialTheme.typography.labelLarge, color = Color.White)
                }
            }
        }
    }
}

