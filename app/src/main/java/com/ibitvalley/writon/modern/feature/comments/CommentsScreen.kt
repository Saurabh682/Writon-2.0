package com.ibitvalley.writon.modern.feature.comments

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing

private val CommentsEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

data class DisplayComment(
    val id: String,
    val authorName: String,
    val authorAvatarUrl: String?,
    val content: String,
    val timeAgo: String,
    val applaudsCount: Int = 0,
    val repliesCount: Int = 0,
    val isApplauded: Boolean = false,
    val replies: List<DisplayComment> = emptyList()
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommentsScreen(
    comments: List<CommentEntity>,
    currentUserInitials: String = "You",
    totalCount: Int = comments.size,
    onBackClick: () -> Unit,
    onSubmitComment: (String, String?) -> Unit,
    onApplaudComment: (String) -> Unit = {}
) {
    var commentInput by remember { mutableStateOf("") }
    var replyingTo by remember { mutableStateOf<DisplayComment?>(null) }
    var sortExpanded by remember { mutableStateOf(false) }
    var selectedSort by remember { mutableStateOf("Most recent") }

    // Map Room CommentEntity list accurately to display model
    val displayComments = remember(comments, selectedSort) {
        val baseList = comments.mapIndexed { index, entity ->
            DisplayComment(
                id = entity.id,
                authorName = entity.authorName,
                authorAvatarUrl = entity.authorAvatarUrl,
                content = entity.content,
                timeAgo = formatTimeAgo(entity.createdAt, index),
                applaudsCount = 0,
                repliesCount = 0
            )
        }

        when (selectedSort) {
            "Top applauds" -> baseList.sortedByDescending { it.applaudsCount }
            "Oldest" -> baseList.reversed()
            else -> baseList
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "Comments",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontFamily = CommentsEditorialFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 23.sp
                            ),
                            color = Color(0xFF191715)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            displayComments.size.toString(),
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            ),
                            color = BrandRed
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Image(painterResource(R.drawable.ic_back), contentDescription = "Back", modifier = Modifier.size(24.dp))
                    }
                },
                actions = {
                    Box {
                        TextButton(onClick = { sortExpanded = true }) {
                            Text(selectedSort, color = Color(0xFF6D6963), fontSize = 14.sp)
                            Text(" ∨", color = Color(0xFF6D6963), fontSize = 12.sp)
                        }
                        DropdownMenu(expanded = sortExpanded, onDismissRequest = { sortExpanded = false }) {
                            DropdownMenuItem(text = { Text("Most recent") }, onClick = { selectedSort = "Most recent"; sortExpanded = false })
                            DropdownMenuItem(text = { Text("Top applauds") }, onClick = { selectedSort = "Top applauds"; sortExpanded = false })
                            DropdownMenuItem(text = { Text("Oldest") }, onClick = { selectedSort = "Oldest"; sortExpanded = false })
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = WritOnSpacing.lg)
        ) {
            Spacer(Modifier.height(WritOnSpacing.sm))

            // Comment Composer Card
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                tonalElevation = WritOnElevation.flat,
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                    if (replyingTo != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
                        ) {
                            Text(
                                "Replying to @${replyingTo?.authorName}",
                                fontSize = 12.sp,
                                color = BrandRed,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(onClick = { replyingTo = null }, modifier = Modifier.size(18.dp)) {
                                Image(painterResource(R.drawable.ic_close), contentDescription = "Cancel reply", modifier = Modifier.size(12.dp))
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // User Avatar
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.size(38.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    currentUserInitials.take(2).uppercase(),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Spacer(Modifier.width(12.dp))

                        // TextField
                        TextField(
                            value = commentInput,
                            onValueChange = { commentInput = it },
                            placeholder = {
                                Text(
                                    if (replyingTo != null) "Write your reply..." else "Write a thoughtful comment...",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            },
                            modifier = Modifier.weight(1f),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                                cursorColor = BrandRed
                            ),
                            maxLines = 4
                        )

                        Spacer(Modifier.width(8.dp))

                        // Circular Send Button with Up Arrow
                        Surface(
                            shape = CircleShape,
                            color = if (commentInput.isNotBlank()) BrandRed else BrandRed.copy(alpha = 0.5f),
                            modifier = Modifier
                                .size(38.dp)
                                .clickable(enabled = commentInput.isNotBlank()) {
                                    onSubmitComment(commentInput, replyingTo?.id)
                                    commentInput = ""
                                    replyingTo = null
                                }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("↑", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(WritOnSpacing.lg))

            // Comments List
            // Comments List or Empty State
            if (displayComments.isEmpty()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Image(
                            painter = painterResource(R.drawable.ic_comment_muted),
                            contentDescription = null,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(Modifier.height(14.dp))
                        Text(
                            "No comments yet",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontFamily = CommentsEditorialFamily,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 18.sp
                            ),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "Be the first to share your thoughts on this story.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)
                ) {
                    items(displayComments) { comment ->
                        CommentItemRow(
                            comment = comment,
                            onReplyClick = { replyingTo = comment },
                            onApplaudClick = { onApplaudComment(comment.id) }
                        )
                        HorizontalDivider(
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                            thickness = 1.dp,
                            modifier = Modifier.padding(top = WritOnSpacing.md)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CommentItemRow(
    comment: DisplayComment,
    onReplyClick: () -> Unit,
    onApplaudClick: () -> Unit
) {
    var applauded by remember { mutableStateOf(comment.isApplauded) }
    var currentApplauds by remember { mutableIntStateOf(comment.applaudsCount) }
    var showMenu by remember { mutableStateOf(false) }
    var expandedReplies by remember { mutableStateOf(false) }

    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        // Author Avatar Circle
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.size(42.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    initialsOf(comment.authorName),
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontFamily = CommentsEditorialFamily
                )
            }
        }

        Spacer(Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            // Header: Name + Timestamp + Applauds + More Menu
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    comment.authorName,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    " • ${comment.timeAgo}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.weight(1f))

                // Applaud Clap Button
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable {
                            applauded = !applauded
                            currentApplauds = if (applauded) currentApplauds + 1 else (currentApplauds - 1).coerceAtLeast(0)
                            onApplaudClick()
                        }
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Image(
                        painterResource(if (applauded) R.drawable.ic_applaud_orange else R.drawable.ic_applaud_orange),
                        contentDescription = "Applaud",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        "$currentApplauds",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                // 3-dots Menu
                Box {
                    IconButton(onClick = { showMenu = true }, modifier = Modifier.size(24.dp)) {
                        Text("⋮", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                        DropdownMenuItem(text = { Text("Report comment") }, onClick = { showMenu = false })
                        DropdownMenuItem(text = { Text("Share") }, onClick = { showMenu = false })
                    }
                }
            }

            Spacer(Modifier.height(4.dp))

            // Comment text
            Text(
                comment.content,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                ),
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(Modifier.height(8.dp))

            // Action footer
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Reply",
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Medium),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.clickable(onClick = onReplyClick)
                )

                if (comment.repliesCount > 0) {
                    Spacer(Modifier.width(16.dp))
                    Text(
                        if (expandedReplies) "Hide replies" else "View ${comment.repliesCount} replies →",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = BrandRed,
                        modifier = Modifier.clickable { expandedReplies = !expandedReplies }
                    )
                }
            }

            if (expandedReplies) {
                Spacer(Modifier.height(8.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(10.dp)) {
                        Text(
                            "Author Response: Thank you so much! Really appreciate your thoughtful words.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

private fun initialsOf(name: String): String =
    name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")

private fun formatTimeAgo(createdAt: String, index: Int): String {
    return when (index) {
        0 -> "2h ago"
        1 -> "5h ago"
        2 -> "8h ago"
        3 -> "12h ago"
        4 -> "1d ago"
        else -> "${index + 1}d ago"
    }
}
