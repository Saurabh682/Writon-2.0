package com.ibitvalley.writon.modern.core.designsystem.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper

@Composable
fun PostCoverImage(
    imageUrl: String?,
    category: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    categoryFontSize: androidx.compose.ui.unit.TextUnit = 26.sp,
    forceDefault: Boolean = false,
) {
    Box(
        modifier = modifier.clip(RoundedCornerShape(WritOnRadius.field)),
        contentAlignment = Alignment.Center
    ) {
        if (forceDefault || imageUrl.isNullOrBlank()) {
            Image(
                painter = painterResource(R.drawable.default_story_cover_wall),
                contentDescription = contentDescription,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
            Text(
                text = category.uppercase(),
                color = BrandRed,
                fontSize = categoryFontSize,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.5.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = WritOnSpacing.md)
            )
        } else {
            AsyncImage(
                model = imageUrl,
                contentDescription = contentDescription,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        }
    }
}

@Composable
fun StoryCard(
    post: PostEntity,
    modifier: Modifier = Modifier,
    onClick: (String) -> Unit,
    onLikeClick: () -> Unit = {},
    onBookmarkClick: () -> Unit = {},
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick(post.id) },
        colors = CardDefaults.cardColors(containerColor = SurfacePaper)
    ) {
        Column(modifier = Modifier.padding(WritOnSpacing.sm)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.md)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        UserAvatar(
                            url = post.authorAvatarUrl,
                            name = post.authorName,
                            size = 20.dp
                        )
                        Spacer(modifier = Modifier.width(WritOnSpacing.xs))
                        Text(
                            text = post.authorName,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Spacer(modifier = Modifier.height(WritOnSpacing.xs))
                    Text(
                        text = post.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    post.summary?.let {
                        Spacer(modifier = Modifier.height(WritOnSpacing.xxs))
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                
                PostCoverImage(
                    imageUrl = post.coverImage,
                    category = post.category,
                    contentDescription = "Cover image for ${post.title}",
                    modifier = Modifier.size(80.dp),
                    categoryFontSize = 14.sp
                )
            }
            
            Spacer(modifier = Modifier.height(WritOnSpacing.sm))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "${post.readingTimeMin} min read",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(WritOnSpacing.xs))
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(WritOnRadius.field)
                    ) {
                        Text(
                            text = post.category,
                            modifier = Modifier.padding(horizontal = WritOnSpacing.xs, vertical = WritOnSpacing.xxs),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onLikeClick, modifier = Modifier.size(32.dp)) {
                        Image(
                            painterResource(if (post.isLiked) R.drawable.ic_heart_filled_orange else R.drawable.ic_heart_muted),
                            contentDescription = "Like", modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = post.likesCnt.toString(),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    Spacer(modifier = Modifier.width(WritOnSpacing.xs))
                    
                    IconButton(onClick = onBookmarkClick, modifier = Modifier.size(32.dp)) {
                        Image(
                            painterResource(if (post.isBookmarked) R.drawable.ic_bookmark_filled_orange else R.drawable.ic_bookmark_muted),
                            contentDescription = "Bookmark", modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}
