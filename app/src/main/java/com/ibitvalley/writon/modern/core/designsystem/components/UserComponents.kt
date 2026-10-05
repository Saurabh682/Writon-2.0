package com.ibitvalley.writon.modern.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest
import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import java.net.URI

fun extractInitials(name: String): String {
    val parts = name.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }
    return when {
        parts.size >= 2 -> "${parts[0].first().uppercaseChar()}${parts[1].first().uppercaseChar()}"
        parts.isNotEmpty() && parts[0].isNotEmpty() -> parts[0].take(2).uppercase()
        else -> "W"
    }
}

private val trustedAvatarHosts = setOf(
    "api.writon.cc",
    "cdn.writon.cc",
    "writon-api-rfusi3iwbq-el.a.run.app",
    "writon-api-802112841589.asia-south1.run.app",
    "writon-app-api-canary-rfusi3iwbq-el.a.run.app",
    "images.unsplash.com",
    "firebasestorage.googleapis.com",
    "storage.googleapis.com"
)

internal fun isTrustedAvatarHost(host: String?, configuredApiHost: String? = null): Boolean {
    if (host.isNullOrBlank()) return false
    val lower = host.lowercase()
    return lower in trustedAvatarHosts ||
        lower == configuredApiHost ||
        lower == "googleusercontent.com" ||
        lower.endsWith(".googleusercontent.com")
}

internal fun shouldLoadRemoteAvatar(
    url: String?,
    apiBaseUrl: String = BuildConfig.API_BASE_URL
): Boolean {
    if (url.isNullOrBlank()) return false
    val uri = runCatching { URI(url.trim()) }.getOrNull() ?: return false
    val configuredApiHost = runCatching { URI(apiBaseUrl.trim()).host?.lowercase() }.getOrNull()
    return uri.scheme.equals("https", ignoreCase = true) &&
        uri.userInfo == null &&
        isTrustedAvatarHost(uri.host, configuredApiHost)
}

internal fun shouldLoadLocalAvatarPreview(url: String?): Boolean {
    if (url.isNullOrBlank()) return false
    val uri = runCatching { URI(url.trim()) }.getOrNull() ?: return false
    return uri.scheme.equals("content", ignoreCase = true)
}

@Composable
private fun AvatarInitials(initials: String, size: Dp) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .testTag("user-avatar-initials")
            .drawBehind { drawCircle(Color(0xFFEBE3D7)) },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = initials,
            modifier = Modifier.clearAndSetSemantics { },
            fontWeight = FontWeight.Bold,
            color = BrandRed,
            fontSize = (size.value * 0.38).sp
        )
    }
}

@Composable
fun UserAvatar(
    url: String?,
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    onClick: (() -> Unit)? = null,
    imageLoader: ImageLoader? = null,
    foundingWriterNumber: Int? = null,
    emailVerified: Boolean = false
) {
    val initials = remember(name) { extractInitials(name) }
    val founderDescription = foundingWriterNumber?.let {
        stringResource(R.string.profile_founding_writer_number, it)
    }
    val verifiedDescription = if (emailVerified) stringResource(R.string.profile_email_confirmed) else null
    val avatarDescription = listOfNotNull(
        stringResource(R.string.profile_photo_content_description, name),
        founderDescription,
        verifiedDescription
    ).joinToString(", ")
    val isCustomPhoto = shouldLoadRemoteAvatar(url) || shouldLoadLocalAvatarPreview(url)
    val context = LocalContext.current
    val resolvedImageLoader = imageLoader ?: context.imageLoader
    val imageRequest = remember(context, url) {
        ImageRequest.Builder(context)
            .data(url?.trim())
            .crossfade(true)
            .build()
    }

    val clickModifier = if (onClick != null) {
        Modifier.clickable(onClick = onClick)
    } else {
        Modifier
    }

    Box(
        modifier = modifier
            .size(size)
            .semantics(mergeDescendants = true) {
                contentDescription = avatarDescription
            }
            .then(clickModifier),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            shape = CircleShape,
            color = Color(0xFFEBE3D7),
            border = BorderStroke(if (foundingWriterNumber != null) 2.dp else 1.dp, if (foundingWriterNumber != null) BrandRed else Color(0xFFDFD6C9)),
            shadowElevation = 0.dp
        ) {
            Box(contentAlignment = Alignment.Center) {
                AvatarInitials(initials, size)
                if (isCustomPhoto) {
                    AsyncImage(
                        model = imageRequest,
                        imageLoader = resolvedImageLoader,
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                }
            }
        }
        foundingWriterNumber?.let {
            Surface(
                modifier = Modifier.align(Alignment.TopStart).size(size * 0.34f),
                shape = CircleShape,
                color = BrandRed,
                border = BorderStroke(1.dp, Color.White)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text("F", color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.16f).sp)
                }
            }
        }
        if (emailVerified) {
            Surface(
                modifier = Modifier.align(Alignment.BottomEnd).size(size * 0.34f),
                shape = CircleShape,
                color = BrandRed,
                border = BorderStroke(1.dp, Color.White)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text("✓", color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.17f).sp)
                }
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
