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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
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
    val authorFoundingWriterNumber: Int? = null,
    val authorEmailVerified: Boolean = false,
    val content: String,
    val timeAgo: String,
    val isEdited: Boolean = false,
    val isMine: Boolean = false,
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
    onEditComment: (String, String) -> Unit,
    onDeleteComment: (String) -> Unit,
    mutationError: String? = null,
    onMutationErrorShown: () -> Unit = {},
) {
    var commentInput by remember { mutableStateOf(TextFieldValue("")) }
    var replyingTo by remember { mutableStateOf<DisplayComment?>(null) }
    var editingComment by remember { mutableStateOf<DisplayComment?>(null) }
    var commentPendingDeletion by remember { mutableStateOf<DisplayComment?>(null) }
    var selectedSort by remember { mutableStateOf(CommentSortOrder.Recent) }
    val displayComments = remember(comments, selectedSort) { comments.toCommentThreads(selectedSort) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(mutationError) {
        mutationError?.let {
            snackbarHostState.showSnackbar(it)
            onMutationErrorShown()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
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
                editingComment = editingComment,
                onInputChange = { commentInput = it },
                onCancelReply = { replyingTo = null; editingComment = null; commentInput = TextFieldValue("") },
                onSubmit = {
                    if (commentInput.text.isNotBlank()) {
                        val edited = editingComment
                        if (edited != null) onEditComment(edited.id, commentInput.text.trim())
                        else onSubmitComment(commentInput.text.trim(), replyingTo?.id)
                        commentInput = TextFieldValue("")
                        replyingTo = null
                        editingComment = null
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
                        CommentThread(
                            comment = comment,
                            onReplyClick = { editingComment = null; replyingTo = it; commentInput = TextFieldValue("") },
                            onEditClick = {
                                editingComment = it
                                replyingTo = null
                                commentInput = TextFieldValue(it.content, TextRange(it.content.length))
                            },
                            onDeleteClick = { commentPendingDeletion = it },
                        )
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

    commentPendingDeletion?.let { comment ->
        AlertDialog(
            onDismissRequest = { commentPendingDeletion = null },
            title = { Text(stringResource(R.string.comments_delete_title)) },
            text = { Text(stringResource(R.string.comments_delete_message)) },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = {
                    onDeleteComment(comment.id)
                    commentPendingDeletion = null
                }) { Text(stringResource(R.string.comments_delete_confirm), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { commentPendingDeletion = null }) {
                    Text(stringResource(R.string.common_cancel))
                }
            },
        )
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
    input: TextFieldValue,
    replyingTo: DisplayComment?,
    editingComment: DisplayComment?,
    onInputChange: (TextFieldValue) -> Unit,
    onCancelReply: () -> Unit,
    onSubmit: () -> Unit,
) {
    val editingDescription = stringResource(R.string.comments_editing)
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
            (editingComment ?: replyingTo)?.let { target ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
                    Text(
                        if (editingComment != null) stringResource(R.string.comments_editing) else "Replying to @${target.authorName}",
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
                            when {
                                editingComment != null -> stringResource(R.string.comments_edit_placeholder)
                                replyingTo != null -> "Write your reply…"
                                else -> "Write a thoughtful comment…"
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    },
                    modifier = Modifier
                        .weight(1f)
                        .semantics {
                            if (editingComment != null) {
                                contentDescription = editingDescription
                            }
                        },
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
                    enabled = input.text.isNotBlank(),
                    modifier = Modifier
                        .size(48.dp)
                        .semantics {
                            contentDescription = if (replyingTo == null) "Submit comment" else "Submit reply"
                        },
                ) {
                    Surface(
                        shape = CircleShape,
                        color = if (input.text.isNotBlank()) BrandRed else MaterialTheme.colorScheme.outlineVariant,
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
private fun CommentThread(
    comment: DisplayComment,
    onReplyClick: (DisplayComment) -> Unit,
    onEditClick: (DisplayComment) -> Unit,
    onDeleteClick: (DisplayComment) -> Unit,
    depth: Int = 0,
) {
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
        CommentItemRow(
            comment = comment,
            depth = depth,
            onReplyClick = { onReplyClick(comment) },
            onEditClick = { onEditClick(comment) },
            onDeleteClick = { onDeleteClick(comment) },
        )
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
                CommentThread(
                    comment = reply,
                    onReplyClick = onReplyClick,
                    onEditClick = onEditClick,
                    onDeleteClick = onDeleteClick,
                    depth = depth + 1,
                )
            }
        }
    }
}

@Composable
private fun CommentItemRow(
    comment: DisplayComment,
    depth: Int,
    onReplyClick: () -> Unit,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit,
) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        UserAvatar(
            url = comment.authorAvatarUrl,
            name = comment.authorName,
            size = if (depth == 0) 42.dp else 36.dp,
            foundingWriterNumber = comment.authorFoundingWriterNumber,
            emailVerified = comment.authorEmailVerified,
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
                if (comment.isEdited) {
                    Text(" • ${stringResource(R.string.comments_edited)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(
                comment.content,
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                CommentAction(
                    label = stringResource(R.string.comments_reply),
                    onClick = onReplyClick,
                    contentDescription = stringResource(R.string.comments_replying_to, comment.authorName),
                )
                if (comment.isMine) {
                    CommentAction(stringResource(R.string.comments_edit), onEditClick)
                    CommentAction(stringResource(R.string.comments_delete), onDeleteClick, MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
private fun CommentAction(
    label: String,
    onClick: () -> Unit,
    color: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    contentDescription: String? = null,
) {
    Text(
        label,
        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Medium),
        color = color,
        modifier = Modifier
            .minimumInteractiveComponentSize()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .semantics {
                contentDescription?.let { this.contentDescription = it }
            }
            .semantics { role = Role.Button }
            .padding(horizontal = 6.dp, vertical = 12.dp),
    )
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
            authorFoundingWriterNumber = entity.authorFoundingWriterNumber,
            authorEmailVerified = entity.authorEmailVerified,
            content = entity.content,
            timeAgo = formatTimeAgo(entity.createdAt),
            isEdited = entity.updatedAt != null,
            isMine = entity.isMine,
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
