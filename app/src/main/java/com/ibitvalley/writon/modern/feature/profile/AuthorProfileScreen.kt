package com.ibitvalley.writon.modern.feature.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.PostCoverImage
import com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.AuthorDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import kotlinx.coroutines.launch

private val AuthorEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold)
)

/** A public writer view. It deliberately never reuses the signed-in profile screen. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthorProfileScreen(
    authorId: String,
    apiService: WritOnApiService,
    isAuthenticated: Boolean,
    onBackClick: () -> Unit,
    onStoryClick: (String) -> Unit,
    onLoginRequired: () -> Unit
) {
    var author by remember(authorId) { mutableStateOf<AuthorDto?>(null) }
    var stories by remember(authorId) { mutableStateOf<List<PostDto>>(emptyList()) }
    var isLoading by remember(authorId) { mutableStateOf(true) }
    var errorMessage by remember(authorId) { mutableStateOf<String?>(null) }
    var isFollowing by remember(authorId) { mutableStateOf(false) }
    var isFollowUpdating by remember(authorId) { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(authorId) {
        isLoading = true
        errorMessage = null
        runCatching {
            val profileResponse = apiService.getUserProfile(authorId)
            if (!profileResponse.isSuccessful || profileResponse.body() == null) {
                error("Writer profile could not be loaded.")
            }
            val loadedAuthor = profileResponse.body()!!.user
            val postsResponse = apiService.getPosts(authorId = loadedAuthor.id, limit = 50)
            loadedAuthor to if (postsResponse.isSuccessful) postsResponse.body()?.posts.orEmpty() else emptyList()
        }.onSuccess { (loadedAuthor, loadedStories) ->
            author = loadedAuthor
            stories = loadedStories
            isFollowing = loadedStories.firstOrNull()?.isFollowingAuthor == true
        }.onFailure {
            errorMessage = "This writer profile is unavailable right now."
        }
        isLoading = false
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Writer Profile", style = MaterialTheme.typography.headlineSmall.copy(fontFamily = AuthorEditorialFamily)) },
                navigationIcon = {
                    androidx.compose.material3.IconButton(onClick = onBackClick) {
                        Image(
                            painter = painterResource(R.drawable.ic_back),
                            contentDescription = "Back",
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        when {
            isLoading -> androidx.compose.foundation.layout.Box(
                modifier = Modifier.fillMaxSize().padding(innerPadding),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator(color = BrandRed) }

            author == null -> androidx.compose.foundation.layout.Box(
                modifier = Modifier.fillMaxSize().padding(innerPadding).padding(WritOnSpacing.lg),
                contentAlignment = Alignment.Center
            ) { Text(errorMessage ?: "Writer not found.", color = MaterialTheme.colorScheme.onSurfaceVariant) }

            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(innerPadding),
                contentPadding = PaddingValues(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
                verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
            ) {
                item {
                    AuthorIdentity(
                        author = author!!,
                        isFollowing = isFollowing,
                        isFollowUpdating = isFollowUpdating,
                        onFollowClick = {
                            if (!isAuthenticated) {
                                onLoginRequired()
                            } else if (!isFollowUpdating) {
                                isFollowUpdating = true
                                // The endpoint is a toggle, so apply only the count the server confirms.
                                coroutineScope.launch {
                                    runCatching { apiService.toggleFollow(author!!.id) }
                                        .onSuccess { response ->
                                            response.body()?.let { result ->
                                                isFollowing = result.following
                                                author = author?.copy(followersCnt = result.followersCount)
                                            }
                                        }
                                    isFollowUpdating = false
                                }
                            }
                        }
                    )
                }
                item { AuthorAbout(author!!) }
                item {
                    Text(
                        "Stories",
                        style = MaterialTheme.typography.headlineSmall.copy(fontFamily = AuthorEditorialFamily),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                if (stories.isEmpty()) {
                    item { Text("No published stories yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                } else {
                    items(stories, key = { it.id }) { story ->
                        AuthorStoryRow(story = story, onClick = { onStoryClick(story.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun AuthorIdentity(
    author: AuthorDto,
    isFollowing: Boolean,
    isFollowUpdating: Boolean,
    onFollowClick: () -> Unit
) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            UserAvatar(url = author.avatarUrl, name = author.fullName, size = 76.dp)
            Spacer(Modifier.width(WritOnSpacing.md))
            Column(Modifier.weight(1f)) {
                Text(
                    author.fullName,
                    style = MaterialTheme.typography.headlineMedium.copy(fontFamily = AuthorEditorialFamily, fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (author.penName.isNotBlank()) {
                    Text("@${author.penName}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    "${author.followersCnt ?: 0} followers · ${author.followingCnt ?: 0} following",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(Modifier.height(WritOnSpacing.md))
        OutlinedButton(
            onClick = onFollowClick,
            enabled = !isFollowUpdating,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(WritOnRadius.field),
            border = BorderStroke(1.dp, if (isFollowing) MaterialTheme.colorScheme.outlineVariant else BrandRed),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = if (isFollowing) MaterialTheme.colorScheme.onSurface else BrandRed)
        ) {
            if (isFollowUpdating) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = BrandRed, strokeWidth = 2.dp)
            else Text(if (isFollowing) "Following" else "Follow", fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun AuthorAbout(author: AuthorDto) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(Modifier.padding(WritOnSpacing.md)) {
            Text("About", style = MaterialTheme.typography.titleLarge.copy(fontFamily = AuthorEditorialFamily), color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(WritOnSpacing.sm))
            Text(
                author.bio?.takeIf { it.isNotBlank() } ?: "This writer hasn’t added a bio yet.",
                style = MaterialTheme.typography.bodyMedium.copy(lineHeight = 21.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun AuthorStoryRow(story: PostDto, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = WritOnSpacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        PostCoverImage(
            imageUrl = story.coverImage,
            category = story.category,
            contentDescription = "Cover image for ${story.title}",
            modifier = Modifier.size(width = 88.dp, height = 66.dp),
            categoryFontSize = 14.sp
        )
        Spacer(Modifier.width(WritOnSpacing.md))
        Column(Modifier.weight(1f)) {
            Text(
                story.title,
                style = MaterialTheme.typography.titleLarge.copy(fontFamily = AuthorEditorialFamily, fontWeight = FontWeight.SemiBold),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "${story.readingTimeMin} min read · ${story.likesCnt} applauds",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
}
