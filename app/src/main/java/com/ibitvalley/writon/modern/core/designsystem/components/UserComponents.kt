package com.ibitvalley.writon.modern.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import androidx.compose.foundation.BorderStroke
import androidx.compose.runtime.remember
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

fun extractInitials(name: String): String {
    val parts = name.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }
    return when {
        parts.size >= 2 -> "${parts[0].first().uppercaseChar()}${parts[1].first().uppercaseChar()}"
        parts.isNotEmpty() && parts[0].isNotEmpty() -> parts[0].take(2).uppercase()
        else -> "W"
    }
}

@Composable
fun UserAvatar(
    url: String?,
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    onClick: (() -> Unit)? = null
) {
    val initials = remember(name) { extractInitials(name) }
    val isCustomPhoto = !url.isNullOrBlank() &&
        !url.contains("ui-avatars.com", ignoreCase = true) &&
        !url.contains("dicebear.com", ignoreCase = true)

    val clickModifier = if (onClick != null) {
        Modifier.clickable(onClick = onClick)
    } else {
        Modifier
    }

    if (isCustomPhoto) {
        AsyncImage(
            model = url,
            contentDescription = name,
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .then(clickModifier),
            contentScale = ContentScale.Crop
        )
    } else {
        Surface(
            modifier = modifier
                .size(size)
                .then(clickModifier),
            shape = CircleShape,
            color = Color(0xFFEBE3D7),
            border = BorderStroke(1.dp, Color(0xFFDFD6C9)),
            shadowElevation = 0.dp
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = initials,
                    fontWeight = FontWeight.Bold,
                    color = BrandRed,
                    fontSize = (size.value * 0.38).sp
                )
            }
        }
    }
}

@Composable
fun FollowButton(
    isFollowing: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(36.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isFollowing) Color.Transparent else MaterialTheme.colorScheme.primary,
            contentColor = if (isFollowing) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onPrimary
        ),
        border = if (isFollowing) androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null,
        shape = RoundedCornerShape(WritOnRadius.pill),
        contentPadding = PaddingValues(horizontal = WritOnSpacing.md, vertical = 0.dp)
    ) {
        Text(
            text = if (isFollowing) "Following" else "Follow",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun UserListItem(
    name: String,
    penName: String,
    avatarUrl: String?,
    modifier: Modifier = Modifier,
    trailingContent: @Composable (() -> Unit)? = null,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = WritOnSpacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        UserAvatar(url = avatarUrl, name = name)
        Spacer(modifier = Modifier.width(WritOnSpacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(text = "@$penName", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        trailingContent?.invoke()
    }
}
