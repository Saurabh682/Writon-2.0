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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import coil.compose.AsyncImage


import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.feature.launch.startActivitySafely
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
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
    onBackClick: () -> Unit,
    onAuthorClick: (String) -> Unit = {},
    onCommentsClick: () -> Unit = {},
    onLoginRequired: () -> Unit = {}
) {
    val post by viewModel.post.collectAsState()
    val comments by viewModel.comments.collectAsState()
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    var showAppearanceSheet by remember { mutableStateOf(false) }

    val savedReaderPreferences = remember(userPreferences) { userPreferences?.readerPreferences }
    var readerFontSizeSp by remember(savedReaderPreferences) { mutableFloatStateOf(savedReaderPreferences?.fontSizeSp ?: 20f) }
    var readerLineMultiplier by remember(savedReaderPreferences) { mutableFloatStateOf(savedReaderPreferences?.lineHeightMultiplier ?: 1.6f) }
    var readerFontFamilyChoice by remember(savedReaderPreferences) { mutableStateOf(savedReaderPreferences?.fontFamily ?: "serif") }
    fun saveReaderOptions() {
        userPreferences?.saveReaderPreferences(
            com.ibitvalley.writon.modern.core.preferences.ReaderPreferences(
                fontSizeSp = readerFontSizeSp,
                lineHeightMultiplier = readerLineMultiplier,
                fontFamily = readerFontFamilyChoice
            )
        )
    }

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
                        if (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null) onLoginRequired()
                        else viewModel.toggleBookmark()
                    }) {
                        Image(
                            painterResource(if (post?.isBookmarked == true) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark),
                            if (post?.isBookmarked == true) stringResource(R.string.reader_bookmark_saved) else stringResource(R.string.reader_bookmark_save),
                            Modifier.size(24.dp),
                            colorFilter = if (post?.isBookmarked == true) null else androidx.compose.ui.graphics.ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
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
                        if (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null) onLoginRequired()
                        else viewModel.toggleBookmark()
                    },
                    onShare = { shareStory(context, story) }
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
                        fontFamilyChoice = readerFontFamilyChoice
                    )
                }
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
                    "Reader Typography",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontFamily = ReaderEditorialFamily,
                        fontWeight = FontWeight.Bold
                    )
                )

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
    fontFamilyChoice: String = "serif"
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
        if (index > 0) Spacer(Modifier.height(WritOnSpacing.lg))
        when (block) {
            ReaderContentBlock.Divider -> HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            is ReaderContentBlock.Quote -> ReaderQuoteBlock(block.text, bodyTextStyle, fontSizeSp, lineMultiplier)
            is ReaderContentBlock.Paragraph -> {
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
            trimmed.startsWith("#") -> flushTextBlock()
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
    onShare: () -> Unit
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
    val shareUrl = "${BuildConfig.API_BASE_URL.trimEnd('/')}/stories/${Uri.encode(post.slug)}"
    val intent = Intent(Intent.ACTION_SEND).apply {
        putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.reader_share_subject, post.title))
        putExtra(
            Intent.EXTRA_TEXT,
            context.getString(R.string.reader_share_message, post.title, post.authorName, shareUrl),
        )
        type = "text/plain"
    }
    context.startActivitySafely(Intent.createChooser(intent, null))
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

