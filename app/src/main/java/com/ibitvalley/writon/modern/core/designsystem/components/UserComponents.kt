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
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

@Composable
fun UserAvatar(
    url: String?,
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
) {
    if (url != null) {
        AsyncImage(
            model = url,
            contentDescription = name,
            modifier = modifier
                .size(size)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(Color.LightGray),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.take(1).uppercase(),
                fontWeight = FontWeight.Bold,
                color = Color.White,
                fontSize = (size.value * 0.4).sp
            )
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
            containerColor = if (isFollowing) Color.Transparent else BrandRed,
            contentColor = if (isFollowing) BrandRed else Color.White
        ),
        border = if (isFollowing) androidx.compose.foundation.BorderStroke(1.dp, BrandRed) else null,
        shape = RoundedCornerShape(18.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
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
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        UserAvatar(url = avatarUrl, name = name)
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(text = "@$penName", color = Color.Gray, fontSize = 12.sp)
        }
        trailingContent?.invoke()
    }
}
