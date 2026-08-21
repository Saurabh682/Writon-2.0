package com.ibitvalley.writon.modern.feature.notifications

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
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

private val NotificationEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private enum class NotificationKind { APPLAUD, COMMENT, FOLLOW, BOOKMARK, REMINDER, BADGE }

private data class ActivityNotification(
    val name: String,
    val action: String,
    val detail: String,
    val time: String,
    val kind: NotificationKind,
    val unread: Boolean = false,
    val hasStory: Boolean = false,
    val tone: Color = Color(0xFF6D6963)
)

private val newActivity = listOf(
    ActivityNotification("Sara Roy", "applauded your story", "Letters to the Things I Left Behind", "2m ago", NotificationKind.APPLAUD, true, true, Color(0xFF6D6963)),
    ActivityNotification("Arjun Mehta", "commented on your story", "The Architecture of Solitude", "15m ago", NotificationKind.COMMENT, true, true, Color(0xFF6D6963)),
    ActivityNotification("Maya Lin", "started following you", "Writer. Dreamer. Observer.", "1h ago", NotificationKind.FOLLOW, true)
)

private val earlierActivity = listOf(
    ActivityNotification("Karan Malhotra", "applauded your story", "The Last Train Home", "3h ago", NotificationKind.APPLAUD, hasStory = true, tone = Color(0xFF6D6963)),
    ActivityNotification("Diya Sharma", "commented on your story", "What We Owe Ourselves", "5h ago", NotificationKind.COMMENT, hasStory = true, tone = Color(0xFF151718)),
    ActivityNotification("Arpit Kohli", "started following you", "Writer and story enthusiast.", "8h ago", NotificationKind.FOLLOW),
    ActivityNotification("", "Your story was bookmarked", "The Architecture of Solitude", "Yesterday", NotificationKind.BOOKMARK),
    ActivityNotification("", "Reminder: Finish your draft", "You have a draft that’s left unpublished.", "Yesterday", NotificationKind.REMINDER),
    ActivityNotification("", "You earned a new badge", "Consistent Writer", "2d ago", NotificationKind.BADGE)
)

@Composable
fun NotificationsScreen(
    onSearchClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {}
) {
    var selectedFilter by rememberSaveable { mutableStateOf("All") }
    val filteredNew = newActivity.filter { it.matches(selectedFilter) }
    val filteredEarlier = earlierActivity.filter { it.matches(selectedFilter) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = WritOnSpacing.lg, end = WritOnSpacing.lg, top = WritOnSpacing.md, bottom = WritOnSpacing.xl),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
    ) {
        item { NotificationHeader(onSearchClick, onSettingsClick) }
        item { NotificationFilters(selectedFilter = selectedFilter, onSelected = { selectedFilter = it }) }
        if (filteredNew.isNotEmpty()) {
            item { SectionLabel("New") }
            item { NotificationGroup(filteredNew) }
        }
        if (filteredEarlier.isNotEmpty()) {
            item { SectionLabel("Earlier") }
            item { NotificationGroup(filteredEarlier) }
        }
    }
}

private fun ActivityNotification.matches(filter: String): Boolean = when (filter) {
    "Mentions" -> false
    "Comments" -> kind == NotificationKind.COMMENT
    "Applauds" -> kind == NotificationKind.APPLAUD
    "Follows" -> kind == NotificationKind.FOLLOW
    else -> true
}

@Composable
private fun NotificationHeader(onSearchClick: () -> Unit, onSettingsClick: () -> Unit) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            WritOnBrandMark(width = 108.dp)
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onSearchClick) { Image(painterResource(R.drawable.ic_search), contentDescription = "Search", modifier = Modifier.size(24.dp)) }
            IconButton(onClick = onSettingsClick) { Image(painterResource(R.drawable.ic_settings), contentDescription = "Notification settings", modifier = Modifier.size(24.dp)) }
        }
        Text(
            "Notifications",
            modifier = Modifier.padding(top = 48.dp),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = NotificationEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 42.sp)
        )
        Text(
            "Stay updated with what matters.",
            modifier = Modifier.padding(top = WritOnSpacing.xs),
            style = MaterialTheme.typography.titleLarge.copy(fontFamily = NotificationEditorialFamily, fontSize = 17.sp),
            color = Color(0xFF6D6963)
        )
    }
}

@Composable
private fun NotificationFilters(selectedFilter: String, onSelected: (String) -> Unit) {
    val filters = listOf(
        "All" to R.drawable.ic_bullet_list,
        "Mentions" to null,
        "Comments" to R.drawable.ic_comment,
        "Applauds" to null,
        "Follows" to R.drawable.ic_follow
    )
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        filters.forEach { (label, icon) ->
            val selected = selectedFilter == label
            Surface(
                onClick = { onSelected(label) },
                color = if (selected) Color(0xFFE9E1D7) else Color.Transparent,
                shape = RoundedCornerShape(WritOnRadius.pill)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    when (label) {
                        "Mentions" -> Text("@", fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = if (selected) BrandRed else Color(0xFF151718))
                        "Applauds" -> Image(painterResource(R.drawable.ic_applaud), contentDescription = null, modifier = Modifier.size(23.dp))
                        else -> icon?.let { Image(painterResource(if (selected) when (it) { R.drawable.ic_bullet_list -> R.drawable.ic_bullet_list_orange; R.drawable.ic_comment -> R.drawable.ic_comment_orange; else -> R.drawable.ic_follow_orange } else it), contentDescription = null, modifier = Modifier.size(22.dp)) }
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(label, fontSize = 15.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
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
private fun NotificationGroup(notifications: List<ActivityNotification>) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.card),
        shadowElevation = WritOnElevation.raised
    ) {
        Column {
            notifications.forEachIndexed { index, notification ->
                NotificationRow(notification)
                if (index < notifications.lastIndex) {
                    androidx.compose.material3.HorizontalDivider(color = Color(0xFFE9E1D7), modifier = Modifier.padding(start = 18.dp))
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(notification: ActivityNotification) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { }
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ActivityAvatar(notification)
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                if (notification.name.isBlank()) notification.action else "${notification.name} ${notification.action}",
                style = MaterialTheme.typography.bodyLarge.copy(fontSize = 16.sp),
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                notification.detail,
                modifier = Modifier.padding(top = 3.dp),
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
                color = Color(0xFF6D6963),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text(notification.time, style = MaterialTheme.typography.bodySmall, color = Color(0xFF6D6963), maxLines = 1)
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
            color = when (notification.kind) {
                NotificationKind.FOLLOW -> Color(0xFFE9E1D7)
                NotificationKind.BOOKMARK, NotificationKind.REMINDER, NotificationKind.BADGE -> Color(0xFFE9E1D7)
                else -> Color(0xFFE9E1D7)
            }
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
                    Image(painterResource(icon), contentDescription = null, modifier = Modifier.size(24.dp))
                } else Text(initial, fontWeight = FontWeight.SemiBold)
            }
        }
        when (notification.kind) {
            NotificationKind.APPLAUD -> Image(painterResource(R.drawable.ic_applaud), contentDescription = "Applaud", modifier = Modifier.align(Alignment.BottomEnd).size(27.dp))
            NotificationKind.COMMENT -> ActivityBadge(R.drawable.ic_comment, Modifier.align(Alignment.BottomEnd))
            NotificationKind.FOLLOW -> ActivityBadge(R.drawable.ic_follow, Modifier.align(Alignment.BottomEnd))
            else -> Unit
        }
    }
}

@Composable
private fun ActivityBadge(icon: Int, modifier: Modifier) {
    Surface(modifier = modifier.size(27.dp), shape = CircleShape, color = Color(0xFFFFFDF9)) {
        Image(painterResource(icon), contentDescription = null, modifier = Modifier.padding(5.dp))
    }
}

@Composable
private fun StoryThumb(tone: Color) {
    Surface(modifier = Modifier.size(48.dp), color = tone, shape = RoundedCornerShape(7.dp)) {
        Box(contentAlignment = Alignment.Center) {
            Surface(shape = CircleShape, color = Color(0xFFFFFDF9).copy(alpha = 0.28f), modifier = Modifier.size(19.dp)) {}
        }
    }
}

@Composable
private fun BadgeMark() {
    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFE75A2A), modifier = Modifier.size(37.dp)) {
        Box(contentAlignment = Alignment.Center) { Text("★", color = Color(0xFFE9E1D7), fontSize = 22.sp) }
    }
}
