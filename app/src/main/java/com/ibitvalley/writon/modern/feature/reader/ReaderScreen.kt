package com.ibitvalley.writon.modern.feature.reader

import android.content.Context
import android.content.Intent
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import coil.compose.AsyncImage


import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.database.model.PostEntity
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
    onBackClick: () -> Unit,
    onLoginRequired: () -> Unit = {}
) {
    val post by viewModel.post.collectAsState()
    val comments by viewModel.comments.collectAsState()
    val commentInput by viewModel.commentText.collectAsState()
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    var showCommentsSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = { IconButton(onClick = onBackClick) { Image(painterResource(R.drawable.ic_back), "Back", Modifier.size(24.dp)) } },
                actions = {
                    IconButton(onClick = {}) { Text("Aa", style = MaterialTheme.typography.titleLarge.copy(fontFamily = ReaderEditorialFamily)) }
                    IconButton(onClick = {
                        if (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null) onLoginRequired()
                        else viewModel.toggleBookmark()
                    }) {
                        Image(painterResource(if (post?.isBookmarked == true) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark), if (post?.isBookmarked == true) "Remove bookmark" else "Save story", Modifier.size(24.dp))
                    }
                    IconButton(onClick = { post?.let { shareStory(context, it) } }) { Image(painterResource(R.drawable.ic_share), "Share story", Modifier.size(24.dp)) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BrandBeige)
            )
        },
        bottomBar = {
            post?.let { story ->
                ReaderActionTray(
                    post = story,
                    onApplaud = {
                        if (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null) onLoginRequired()
                        else viewModel.toggleLike()
                    },
                    onComment = { showCommentsSheet = true },
                    onSave = {
                        if (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null) onLoginRequired()
                        else viewModel.toggleBookmark()
                    },
                    onShare = { shareStory(context, story) }
                )
            }
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        post?.let { story ->
            val paragraphs = remember(story.content) {
                story.content
                    .lineSequence()
                    .filterNot { it.trimStart().startsWith("#") }
                    .joinToString("\n")
                    .split(Regex("\\n\\s*\\n"))
                    .map(String::trim)
                    .filter(String::isNotEmpty)
            }
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
                        fontWeight = FontWeight.Bold
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
                ReaderAuthorMetadata(story)
                HorizontalDivider(Modifier.padding(vertical = WritOnSpacing.xl), color = MaterialTheme.colorScheme.outlineVariant)
                if (paragraphs.isEmpty()) {
                    Text("This story has no text yet.", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    ReaderBody(paragraphs)
                }
                Spacer(Modifier.height(WritOnSpacing.xxl))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(WritOnRadius.card))
                        .clickable { showCommentsSheet = true }
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
                        modifier = Modifier.clickable { showCommentsSheet = true }
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
                            modifier = Modifier.clickable { showCommentsSheet = true }
                        )
                    }
                }
            }
        }
    }

    if (showCommentsSheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showCommentsSheet = false },
            sheetState = sheetState,
            containerColor = SurfacePaper,
            dragHandle = { BottomSheetDefaults.DragHandle(color = MaterialTheme.colorScheme.outlineVariant) }
        ) {
            CommentsPaneContent(
                comments = comments,
                commentInput = commentInput,
                onCommentChange = { viewModel.commentText.value = it },
                onSubmit = {
                    val user = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
                    if (user == null) {
                        showCommentsSheet = false
                        onLoginRequired()
                    } else {
                        val authorName = user.displayName ?: user.email?.substringBefore("@") ?: "Writer"
                        viewModel.submitComment(authorName)
                    }
                },
                onClose = { showCommentsSheet = false }
            )
        }
    }
}


@Composable
private fun ReaderAuthorMetadata(post: PostEntity) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        AsyncImage(
            model = post.authorAvatarUrl ?: "https://ui-avatars.com/api/?name=${post.authorName}", contentDescription = post.authorName,
            modifier = Modifier.size(56.dp).clip(CircleShape), contentScale = ContentScale.Crop
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
private fun ReaderBody(paragraphs: List<String>) {
    if (paragraphs.isEmpty()) return

    val bodyTextStyle = MaterialTheme.typography.bodyLarge.copy(
        fontFamily = ReaderEditorialFamily,
        fontSize = 20.sp,
        lineHeight = 32.sp,
        fontWeight = FontWeight.Normal,
        platformStyle = PlatformTextStyle(includeFontPadding = false),
        lineHeightStyle = LineHeightStyle(
            alignment = LineHeightStyle.Alignment.Top,
            trim = LineHeightStyle.Trim.Both
        )
    )

    val first = paragraphs.first()
    if (first.isNotBlank()) {
        val dropCap = first.take(1)
        val rest = first.drop(1).trimStart()

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            Text(
                text = dropCap,
                style = MaterialTheme.typography.displayLarge.copy(
                    fontFamily = ReaderEditorialFamily,
                    fontSize = 62.sp,
                    lineHeight = 54.sp,
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
                text = rest,
                style = bodyTextStyle,
                modifier = Modifier.weight(1f)
            )
        }
    }

    paragraphs.drop(1).forEach { paragraph ->
        Spacer(Modifier.height(WritOnSpacing.lg))
        Text(paragraph, style = bodyTextStyle)
    }
}


@Composable
private fun ReaderActionTray(post: PostEntity, onApplaud: () -> Unit, onComment: () -> Unit, onSave: () -> Unit, onShare: () -> Unit) {
    Surface(color = BrandBeige) {
        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = WritOnSpacing.md, vertical = WritOnSpacing.sm),
            shape = RoundedCornerShape(WritOnRadius.feature), color = SurfacePaper,
            tonalElevation = WritOnElevation.flat, shadowElevation = WritOnElevation.raised
        ) {
            Row(Modifier.fillMaxWidth().padding(vertical = WritOnSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
                ReaderTrayAction("Applaud", post.likesCnt, onApplaud, post.isLiked) {
                    Image(painterResource(if (post.isLiked) R.drawable.ic_applaud_orange else R.drawable.ic_applaud_muted), null, Modifier.size(26.dp))
                }
                ReaderTrayDivider()
                ReaderTrayAction("Comment", post.commentsCnt, onComment) { Image(painterResource(R.drawable.ic_comment), null, Modifier.size(26.dp)) }
                ReaderTrayDivider()
                ReaderTrayAction("Save", null, onSave, post.isBookmarked) {
                    Image(painterResource(if (post.isBookmarked) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark), null, Modifier.size(26.dp))
                }
                ReaderTrayDivider()
                ReaderTrayAction("Share", null, onShare) { Image(painterResource(R.drawable.ic_share), null, Modifier.size(26.dp)) }
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
        AsyncImage(avatarUrl ?: "https://ui-avatars.com/api/?name=$name", name, Modifier.size(36.dp).clip(CircleShape), contentScale = ContentScale.Crop)
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
    val intent = Intent(Intent.ACTION_SEND).apply {
        putExtra(Intent.EXTRA_TEXT, "Check out this story: ${post.title}\n\nhttps://writon.co/posts/${post.slug}")
        type = "text/plain"
    }
    context.startActivity(Intent.createChooser(intent, null))
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
            color = SurfacePaper
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
                        focusedContainerColor = BrandBeige,
                        unfocusedContainerColor = BrandBeige,
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

