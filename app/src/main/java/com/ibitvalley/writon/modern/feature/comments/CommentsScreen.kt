package com.ibitvalley.writon.modern.feature.comments

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import java.text.SimpleDateFormat
import java.util.Locale

enum class CommentSortOrder(val labelRes: Int) {
    Recent(R.string.comments_sort_recent),
    Applauds(R.string.comments_sort_applauds),
    Oldest(R.string.comments_sort_oldest),
}

private val CommentsEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold),
)

data class DisplayComment(
    val id: String,
    val authorName: String,
    val authorAvatarUrl: String?,
    val content: String,
    val timeAgo: String,
    val replyingToName: String? = null,
    val replies: List<DisplayComment> = emptyList(),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommentsScreen(
    comments: List<CommentEntity>,
    currentUserInitials: String = "You",
    totalCount: Int = comments.size,
    onBackClick: () -> Unit,
    onSubmitComment: (String, String?) -> Unit,
) {
    var commentInput by remember { mutableStateOf("") }
    var replyingTo by remember { mutableStateOf<DisplayComment?>(null) }
    var selectedSort by remember { mutableStateOf(CommentSortOrder.Recent) }
    val displayComments = remember(comments, selectedSort) { comments.toCommentThreads(selectedSort) }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.comments_title),
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontFamily = CommentsEditorialFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 23.sp,
                            ),
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            totalCount.toString(),
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 18.sp),
                            color = BrandRed,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Image(
                            painterResource(R.drawable.ic_back),
                            contentDescription = "Back",
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground),
                        )
                    }
                },
                actions = { CommentSortSelector(selectedSort, onSelected = { selectedSort = it }) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(innerPadding).padding(horizontal = WritOnSpacing.lg),
        ) {
            Spacer(Modifier.height(WritOnSpacing.sm))
            CommentComposer(
                currentUserInitials = currentUserInitials,
                input = commentInput,
                replyingTo = replyingTo,
                onInputChange = { commentInput = it },
                onCancelReply = { replyingTo = null },
                onSubmit = {
                    if (commentInput.isNotBlank()) {
                        onSubmitComment(commentInput.trim(), replyingTo?.id)
                        commentInput = ""
                        replyingTo = null
                    }
                },
            )
            Spacer(Modifier.height(WritOnSpacing.lg))

            if (displayComments.isEmpty()) {
                EmptyCommentsState(modifier = Modifier.weight(1f))
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md),
                ) {
                    items(displayComments, key = DisplayComment::id) { comment ->
                        CommentThread(comment = comment, onReplyClick = { replyingTo = it })
                        HorizontalDivider(
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                            thickness = 1.dp,
                            modifier = Modifier.padding(top = WritOnSpacing.md),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CommentSortSelector(selectedSort: CommentSortOrder, onSelected: (CommentSortOrder) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        androidx.compose.material3.TextButton(onClick = { expanded = true }) {
            Text(stringResource(selectedSort.labelRes), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
            Text(" ∨", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        }
        androidx.compose.material3.DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            CommentSortOrder.entries.forEach { option ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(stringResource(option.labelRes)) },
                    onClick = { onSelected(option); expanded = false },
                )
            }
        }
    }
}

@Composable
private fun CommentComposer(
    currentUserInitials: String,
    input: String,
    replyingTo: DisplayComment?,
    onInputChange: (String) -> Unit,
    onCancelReply: () -> Unit,
    onSubmit: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
            replyingTo?.let { target ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
                    Text(
                        "Replying to @${target.authorName}",
                        fontSize = 12.sp,
                        color = BrandRed,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = onCancelReply, modifier = Modifier.size(48.dp)) {
                        Image(
                            painterResource(R.drawable.ic_close),
                            contentDescription = "Cancel reply",
                            modifier = Modifier.size(16.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant),
                        )
                    }
                }
            }
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.size(40.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            currentUserInitials.take(2).uppercase(),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                TextField(
                    value = input,
                    onValueChange = onInputChange,
                    placeholder = {
                        Text(
                            if (replyingTo != null) "Write your reply…" else "Write a thoughtful comment…",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    },
                    modifier = Modifier.weight(1f),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        cursorColor = BrandRed,
                    ),
                    maxLines = 4,
                )
                IconButton(
                    onClick = onSubmit,
                    enabled = input.isNotBlank(),
                    modifier = Modifier
                        .size(48.dp)
                        .semantics {
                            contentDescription = if (replyingTo == null) "Submit comment" else "Submit reply"
                        },
                ) {
                    Surface(
                        shape = CircleShape,
                        color = if (input.isNotBlank()) BrandRed else MaterialTheme.colorScheme.outlineVariant,
                        modifier = Modifier.size(38.dp),
                    ) { Box(contentAlignment = Alignment.Center) { Text("↑", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold) } }
                }
            }
        }
    }
}

@Composable
private fun EmptyCommentsState(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxWidth().padding(vertical = 32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painter = painterResource(R.drawable.ic_comment_muted), contentDescription = null, modifier = Modifier.size(48.dp))
            Spacer(Modifier.height(14.dp))
            Text(
                stringResource(R.string.comments_empty_title),
                style = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = CommentsEditorialFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                ),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                stringResource(R.string.comments_empty_desc),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun CommentThread(comment: DisplayComment, onReplyClick: (DisplayComment) -> Unit, depth: Int = 0) {
    var repliesExpanded by remember(comment.id) { mutableStateOf(depth > 0) }
    val threadLineColor = MaterialTheme.colorScheme.outlineVariant
    Column(
        modifier = if (depth == 0) Modifier.fillMaxWidth() else Modifier
            .fillMaxWidth()
            .padding(start = 20.dp)
            .drawBehind {
                drawLine(
                    color = threadLineColor,
                    start = Offset(0f, 0f),
                    end = Offset(0f, size.height),
                    strokeWidth = 1.dp.toPx(),
                )
            }
            .padding(start = 14.dp),
    ) {
        CommentItemRow(comment = comment, depth = depth, onReplyClick = { onReplyClick(comment) })
        if (comment.replies.isNotEmpty()) {
            val replyCount = comment.replies.size
            Text(
                text = if (repliesExpanded) {
                    stringResource(R.string.comments_hide_replies)
                } else {
                    pluralStringResource(R.plurals.comments_view_replies, replyCount, replyCount)
                },
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                color = BrandRed,
                modifier = Modifier
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { repliesExpanded = !repliesExpanded }
                    .semantics {
                        role = Role.Button
                        contentDescription = if (repliesExpanded) {
                            "Hide replies"
                        } else {
                            "Show $replyCount replies"
                        }
                    }
                    .padding(vertical = 14.dp),
            )
        }
        if (repliesExpanded) {
            comment.replies.forEach { reply ->
                Spacer(Modifier.height(12.dp))
                CommentThread(comment = reply, onReplyClick = onReplyClick, depth = depth + 1)
            }
        }
    }
}

@Composable
private fun CommentItemRow(comment: DisplayComment, depth: Int, onReplyClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        UserAvatar(
            url = comment.authorAvatarUrl,
            name = comment.authorName,
            size = if (depth == 0) 42.dp else 36.dp,
        )
        Spacer(Modifier.width(if (depth == 0) 14.dp else 12.dp))
        Column(modifier = Modifier.weight(1f)) {
            if (comment.replyingToName != null) {
                Text(
                    text = stringResource(R.string.comments_replying_to, comment.replyingToName),
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = BrandRed,
                    modifier = Modifier.padding(bottom = 4.dp),
                )
            }
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    comment.authorName,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 15.sp),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(" • ${comment.timeAgo}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(4.dp))
            Text(
                comment.content,
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                stringResource(R.string.comments_reply),
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Medium),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .padding(top = 2.dp)
                    .minimumInteractiveComponentSize()
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(onClick = onReplyClick)
                    .semantics { role = Role.Button; contentDescription = "Reply to ${comment.authorName}" }
                    .padding(vertical = 12.dp),
            )
        }
    }
}

private fun List<CommentEntity>.toCommentThreads(sort: CommentSortOrder): List<DisplayComment> {
    val ids = mapTo(hashSetOf()) { it.id }
    val byParent = groupBy { entity -> entity.parentId?.takeIf(ids::contains) }
    fun sorted(items: List<CommentEntity>): List<CommentEntity> = when (sort) {
        CommentSortOrder.Oldest -> items.sortedBy { it.createdAt }
        CommentSortOrder.Applauds, CommentSortOrder.Recent -> items.sortedByDescending { it.createdAt }
    }
    fun build(parentId: String?, parentAuthorName: String? = null): List<DisplayComment> =
        sorted(byParent[parentId].orEmpty()).map { entity ->
        DisplayComment(
            id = entity.id,
            authorName = entity.authorName,
            authorAvatarUrl = entity.authorAvatarUrl,
            content = entity.content,
            timeAgo = formatTimeAgo(entity.createdAt),
            replyingToName = parentAuthorName,
            replies = build(entity.id, entity.authorName),
        )
    }
    return build(null)
}

private fun initialsOf(name: String): String =
    name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")

private fun formatTimeAgo(createdAt: String): String {
    val millis = parseIsoTimestampMillis(createdAt) ?: return "Recently"
    val elapsedMinutes = ((System.currentTimeMillis() - millis) / 60_000).coerceAtLeast(0)
    return when {
        elapsedMinutes < 1 -> "Just now"
        elapsedMinutes < 60 -> "${elapsedMinutes}m ago"
        elapsedMinutes < 1_440 -> "${elapsedMinutes / 60}h ago"
        else -> "${elapsedMinutes / 1_440}d ago"
    }
}

/** Parses the API's ISO-8601 timestamps without java.time or the API-24-only `X` pattern. */
internal fun parseIsoTimestampMillis(value: String): Long? {
    val normalized = value.trim()
        .replace(Regex("Z$"), "+0000")
        .replace(Regex("([+-]\\d{2}):(\\d{2})$"), "$1$2")
    return listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
        "yyyy-MM-dd'T'HH:mm:ssZ",
    ).firstNotNullOfOrNull { pattern ->
        runCatching {
            SimpleDateFormat(pattern, Locale.US).apply { isLenient = false }.parse(normalized)?.time
        }.getOrNull()
    }
}
