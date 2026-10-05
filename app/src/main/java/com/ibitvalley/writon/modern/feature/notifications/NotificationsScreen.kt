package com.ibitvalley.writon.modern.feature.notifications

import androidx.compose.ui.res.stringResource
import androidx.annotation.StringRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.IconButton
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.model.NotificationDto
import com.ibitvalley.writon.modern.feature.collections.CollectionsViewModel
import com.ibitvalley.writon.modern.core.database.dao.IncomingStoryEntity

private val NotificationEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

internal enum class NotificationKind { APPLAUD, COMMENT, FOLLOW, BOOKMARK, REMINDER, BADGE }
internal enum class NotificationFilter { ALL, STORIES, COMMENTS, APPLAUDS, FOLLOWS }

/**
 * Canonical notification families contain multiple server kinds (for example comment + reply).
 * Fetch the complete stream once and filter locally so newer kinds remain visible to older tabs.
 */
internal fun notificationApiKind(@Suppress("UNUSED_PARAMETER") filter: NotificationFilter): String? = null

internal data class ActivityNotification(
    val id: String,
    val name: String,
    val action: String,
    val serverKind: String,
    val detail: String,
    val time: String,
    val kind: NotificationKind,
    val unread: Boolean = false,
    val hasStory: Boolean = false,
    val postId: String? = null,
    val actorId: String? = null,
    val tone: Color = Color(0xFF6D6963)
)

internal fun NotificationDto.asActivityNotification(): ActivityNotification {
    val notificationKind = when (kind) {
        "applaud", "first_applause" -> NotificationKind.APPLAUD
        "comment", "reply" -> NotificationKind.COMMENT
        "follow", "new_follower" -> NotificationKind.FOLLOW
        "bookmark" -> NotificationKind.BOOKMARK
        "badge" -> NotificationKind.BADGE
        else -> NotificationKind.REMINDER
    }
    return ActivityNotification(
        id = id,
        name = actor?.fullName.orEmpty(),
        action = message,
        serverKind = kind,
        detail = postTitle ?: actor?.penName.orEmpty().ifBlank { "WritOn activity" },
        time = createdAt.substringBefore('T'),
        kind = notificationKind,
        unread = readAt == null,
        hasStory = postId != null,
        postId = postId,
        actorId = actor?.id,
        tone = Color(0xFFF2ECE4)
    )
}

@StringRes
internal fun notificationActionResource(kind: String, message: String): Int? = when (kind) {
    "applaud", "first_applause" -> R.string.notifications_action_applauded
    "comment" -> R.string.notifications_action_commented
    "reply" -> R.string.notifications_action_replied
    "follow", "new_follower" -> R.string.notifications_action_followed
    "followed_writer_published", "publishing" -> if (message == "published new stories") {
        R.string.notifications_action_published_multiple
    } else {
        R.string.notifications_action_published
    }
    "daily_digest", "editorial", "reading_nudge" -> R.string.notifications_action_recommended
    else -> null
}

internal fun openNotificationDestination(
    notification: ActivityNotification,
    onStoryClick: (String) -> Unit,
    onAuthorClick: (String) -> Unit,
) {
    notification.postId?.let(onStoryClick)
        ?: notification.actorId?.takeIf { notification.kind == NotificationKind.FOLLOW }?.let(onAuthorClick)
}

@Composable
fun NotificationsScreen(
    viewModel: CollectionsViewModel,
    onSearchClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    onStoryClick: (String) -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
    onLogoClick: () -> Unit = {},
    showServerActivities: Boolean = true,
    incomingStories: List<IncomingStoryEntity> = emptyList(),
    onIncomingStoryClick: (IncomingStoryEntity) -> Unit = {},
    onDismissIncomingStory: (IncomingStoryEntity) -> Unit = {},
) {
    var selectedFilter by rememberSaveable { mutableStateOf(NotificationFilter.ALL) }
    LaunchedEffect(showServerActivities) {
        if (showServerActivities) viewModel.loadNotifications(notificationApiKind(selectedFilter))
    }
    val activities = if (showServerActivities) viewModel.notifications.map { it.asActivityNotification() } else emptyList()
    val visibleLinks = if (selectedFilter in setOf(NotificationFilter.ALL, NotificationFilter.STORIES)) incomingStories else emptyList()
    val filteredNew = activities.filter { it.unread && it.matches(selectedFilter) }
    val filteredEarlier = activities.filter { !it.unread && it.matches(selectedFilter) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = WritOnSpacing.lg, end = WritOnSpacing.lg, top = WritOnSpacing.md, bottom = WritOnSpacing.xl),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
    ) {
        item { NotificationHeader(onSearchClick = onSearchClick, onSettingsClick = onSettingsClick, onLogoClick = onLogoClick) }
        item { NotificationFilters(selectedFilter = selectedFilter, onSelected = { selectedFilter = it }) }
        if (visibleLinks.isNotEmpty()) {
            item { SectionLabel(stringResource(R.string.notifications_saved_links)) }
            items(visibleLinks, key = { "link:${it.ownerKey}:${it.storyKey}" }) { entry ->
                IncomingStoryCard(entry, onOpen = { onIncomingStoryClick(entry) }, onDismiss = { onDismissIncomingStory(entry) })
            }
        }
        if (showServerActivities && viewModel.isLoading && activities.isEmpty()) {
            item {
                Box(Modifier.fillMaxWidth().padding(vertical = 32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (showServerActivities && viewModel.errorMessage != null && activities.isEmpty()) {
            item {
                NotificationLoadError(onRetry = { viewModel.loadNotifications() })
            }
        } else if (filteredNew.isNotEmpty()) {
            item { SectionLabel(stringResource(R.string.notifications_section_new)) }
            item { NotificationGroup(filteredNew, onNotificationClick = { notification ->
                viewModel.markNotificationRead(notification.id)
                openNotificationDestination(notification, onStoryClick, onAuthorClick)
            }) }
        }
        if (filteredEarlier.isNotEmpty()) {
            item { SectionLabel(stringResource(R.string.notifications_section_earlier)) }
            item { NotificationGroup(filteredEarlier, onNotificationClick = { notification ->
                viewModel.markNotificationRead(notification.id)
                openNotificationDestination(notification, onStoryClick, onAuthorClick)
            }) }
        }
        if ((!showServerActivities || (!viewModel.isLoading && viewModel.errorMessage == null)) && filteredNew.isEmpty() && filteredEarlier.isEmpty() && visibleLinks.isEmpty()) {
            item { EmptyNotifications() }
        }
    }
}

@Composable
private fun IncomingStoryCard(entry: IncomingStoryEntity, onOpen: () -> Unit, onDismiss: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(if (entry.source == "shared") R.string.notifications_shared_link else R.string.notifications_push_link),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(entry.title ?: stringResource(R.string.notifications_saved_story),
                style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3, overflow = TextOverflow.Ellipsis)
            Text(stringResource(if (entry.readAt == null) R.string.notifications_link_unread else R.string.notifications_link_read),
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = onOpen) { Text(stringResource(R.string.notifications_open_link)) }
                TextButton(onClick = onDismiss) { Text(stringResource(R.string.notifications_dismiss_link)) }
            }
        }
    }
}

@Composable
private fun NotificationLoadError(onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            stringResource(R.string.notifications_load_error),
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyLarge,
        )
        Button(onClick = onRetry) { Text(stringResource(R.string.common_retry)) }
    }
}

@Composable
private fun EmptyNotifications() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(WritOnRadius.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painterResource(R.drawable.ic_notification),
                contentDescription = null,
                modifier = Modifier.size(34.dp),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
            )
            Text(
                stringResource(R.string.notif_empty_title),
                modifier = Modifier.padding(top = 12.dp),
                style = MaterialTheme.typography.titleLarge.copy(fontFamily = NotificationEditorialFamily),
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                stringResource(R.string.notif_empty_desc),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun ActivityNotification.matches(filter: NotificationFilter): Boolean = when (filter) {
    NotificationFilter.STORIES -> kind == NotificationKind.REMINDER
    NotificationFilter.COMMENTS -> kind == NotificationKind.COMMENT
    NotificationFilter.APPLAUDS -> kind == NotificationKind.APPLAUD
    NotificationFilter.FOLLOWS -> kind == NotificationKind.FOLLOW
    NotificationFilter.ALL -> true
}

@Composable
private fun NotificationHeader(
    onSearchClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onLogoClick: () -> Unit = {}
) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.clickable(
                    onClick = onLogoClick,
                    interactionSource = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                    indication = null
                )
            ) {
                WritOnBrandMark(width = 108.dp)
            }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onSearchClick) {
                Image(
                    painterResource(R.drawable.ic_search),
                    contentDescription = stringResource(R.string.common_search),
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
            }
            IconButton(onClick = onSettingsClick) {
                Image(
                    painterResource(R.drawable.ic_settings),
                    contentDescription = stringResource(R.string.notification_settings_title),
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
            }
        }
        Text(
            stringResource(R.string.notifications_title),
            modifier = Modifier.padding(top = 48.dp),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = NotificationEditorialFamily, fontWeight = FontWeight.Normal, fontSize = 42.sp)
        )
        Text(
            stringResource(R.string.notifications_subtitle),
            modifier = Modifier.padding(top = WritOnSpacing.xs),
            style = MaterialTheme.typography.titleLarge.copy(fontFamily = NotificationEditorialFamily, fontSize = 17.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun NotificationFilters(selectedFilter: NotificationFilter, onSelected: (NotificationFilter) -> Unit) {
    val filters = listOf(
        Triple(NotificationFilter.ALL, R.string.notifications_filter_all, R.drawable.ic_bullet_list),
        Triple(NotificationFilter.STORIES, R.string.notifications_filter_mentions, null),
        Triple(NotificationFilter.COMMENTS, R.string.notifications_filter_comments, R.drawable.ic_comment),
        Triple(NotificationFilter.APPLAUDS, R.string.notifications_filter_applauds, null),
        Triple(NotificationFilter.FOLLOWS, R.string.notifications_filter_follows, R.drawable.ic_follow)
    )
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        filters.forEach { (filter, labelResource, icon) ->
            val selected = selectedFilter == filter
            Surface(
                modifier = Modifier.semantics { this.selected = selected },
                onClick = { onSelected(filter) },
                color = if (selected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                shape = RoundedCornerShape(WritOnRadius.pill)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    when (filter) {
                        NotificationFilter.STORIES -> Image(painterResource(R.drawable.ic_book), contentDescription = null, modifier = Modifier.size(22.dp), colorFilter = ColorFilter.tint(if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant))
                        NotificationFilter.APPLAUDS -> Image(painterResource(R.drawable.ic_applaud_orange), contentDescription = null, modifier = Modifier.size(23.dp), colorFilter = ColorFilter.tint(if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant))
                        else -> icon?.let { Image(painterResource(it), contentDescription = null, modifier = Modifier.size(22.dp), colorFilter = ColorFilter.tint(if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant)) }
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(labelResource), fontSize = 15.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(label: String) {
    Text(label, style = MaterialTheme.typography.titleLarge.copy(fontSize = 19.sp), fontWeight = FontWeight.SemiBold)
}

@Composable
private fun NotificationGroup(
    notifications: List<ActivityNotification>,
    onNotificationClick: (ActivityNotification) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(WritOnRadius.card),
        shadowElevation = WritOnElevation.raised
    ) {
        Column {
            notifications.forEachIndexed { index, notification ->
                NotificationRow(notification, onClick = { onNotificationClick(notification) })
                if (index < notifications.lastIndex) {
                    androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.padding(start = 18.dp))
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(notification: ActivityNotification, onClick: () -> Unit) {
    val localizedAction = notificationActionResource(notification.serverKind, notification.action)
        ?.let { stringResource(it) } ?: notification.action
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ActivityAvatar(notification)
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                if (notification.name.isBlank()) localizedAction else "${notification.name} $localizedAction",
                style = MaterialTheme.typography.bodyLarge.copy(fontSize = 16.sp),
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                notification.detail,
                modifier = Modifier.padding(top = 3.dp),
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text(notification.time, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        Spacer(Modifier.width(8.dp))
        when {
            notification.hasStory -> StoryThumb(notification.tone)
            notification.kind == NotificationKind.BADGE -> BadgeMark()
            notification.unread -> Surface(shape = CircleShape, color = BrandRed, modifier = Modifier.size(11.dp)) {}
            else -> Spacer(Modifier.width(11.dp))
        }
        if (notification.hasStory && notification.unread) {
            Spacer(Modifier.width(8.dp))
            Surface(shape = CircleShape, color = BrandRed, modifier = Modifier.size(11.dp)) {}
        }
    }
}

@Composable
private fun ActivityAvatar(notification: ActivityNotification) {
    Box(modifier = Modifier.size(54.dp)) {
        Surface(
            modifier = Modifier.size(48.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Box(contentAlignment = Alignment.Center) {
                val initial = notification.name.split(" ").filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }
                if (notification.name.isBlank()) {
                    val icon = when (notification.kind) {
                        NotificationKind.BOOKMARK -> R.drawable.ic_bookmark
                        NotificationKind.REMINDER -> R.drawable.ic_notification
                        NotificationKind.BADGE -> R.drawable.ic_achievement
                        else -> R.drawable.ic_notification
                    }
                    Image(painterResource(icon), contentDescription = null, modifier = Modifier.size(24.dp), colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant))
                } else Text(initial, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        when (notification.kind) {
            NotificationKind.APPLAUD -> Image(painterResource(R.drawable.ic_applaud_orange), contentDescription = stringResource(R.string.common_applaud), modifier = Modifier.align(Alignment.BottomEnd).size(27.dp))
            NotificationKind.COMMENT -> ActivityBadge(R.drawable.ic_comment, Modifier.align(Alignment.BottomEnd))
            NotificationKind.FOLLOW -> ActivityBadge(R.drawable.ic_follow, Modifier.align(Alignment.BottomEnd))
            else -> Unit
        }
    }
}

@Composable
private fun ActivityBadge(icon: Int, modifier: Modifier) {
    Surface(modifier = modifier.size(27.dp), shape = CircleShape, color = MaterialTheme.colorScheme.surface) {
        Image(painterResource(icon), contentDescription = null, modifier = Modifier.padding(5.dp))
    }
}

@Composable
private fun StoryThumb(tone: Color) {
    Surface(modifier = Modifier.size(48.dp), color = tone, shape = RoundedCornerShape(7.dp)) {
        Box(contentAlignment = Alignment.Center) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.18f), modifier = Modifier.size(19.dp)) {}
        }
    }
}

@Composable
private fun BadgeMark() {
    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFE75A2A), modifier = Modifier.size(37.dp)) {
        Box(contentAlignment = Alignment.Center) { Text("★", color = Color(0xFFE9E1D7), fontSize = 22.sp) }
    }
}
