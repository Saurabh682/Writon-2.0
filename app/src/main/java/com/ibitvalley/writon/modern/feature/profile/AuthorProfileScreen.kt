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
import androidx.compose.ui.res.stringResource
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
    initialFollowingHint: Boolean = false,
    apiService: WritOnApiService,
    isAuthenticated: Boolean,
    viewerId: String? = null,
    onBackClick: () -> Unit,
    onStoryClick: (String) -> Unit,
    onLoginRequired: () -> Unit
) {
    var author by remember(authorId) { mutableStateOf<AuthorDto?>(null) }
    var stories by remember(authorId) { mutableStateOf<List<PostDto>>(emptyList()) }
    var isLoading by remember(authorId) { mutableStateOf(true) }
    var errorMessage by remember(authorId) { mutableStateOf<String?>(null) }
    var isFollowing by remember(authorId, initialFollowingHint) { mutableStateOf(initialFollowingHint) }
    var isFollowUpdating by remember(authorId) { mutableStateOf(false) }
    var followErrorMessage by remember(authorId) { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()
    val profileLoadError = stringResource(R.string.author_profile_unavailable)
    val followUpdateError = stringResource(R.string.author_follow_update_failed)

    LaunchedEffect(authorId, isAuthenticated, viewerId) {
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
            isFollowing = initialFollowingHint || loadedStories.firstOrNull()?.isFollowingAuthor == true
        }.onFailure {
            errorMessage = profileLoadError
        }
        isLoading = false
        if (author != null && isAuthenticated && viewerId != authorId) {
            loadFollowingState(apiService, authorId)?.let { isFollowing = it }
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.author_profile_title), style = MaterialTheme.typography.headlineSmall.copy(fontFamily = AuthorEditorialFamily)) },
                navigationIcon = {
                    androidx.compose.material3.IconButton(onClick = onBackClick) {
                        Image(
                            painter = painterResource(R.drawable.ic_back),
                            contentDescription = stringResource(R.string.common_back),
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
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
            ) { Text(errorMessage ?: stringResource(R.string.author_not_found), color = MaterialTheme.colorScheme.onSurfaceVariant) }

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
                        showFollowButton = viewerId != author!!.id,
                        followErrorMessage = followErrorMessage,
                        onFollowClick = {
                            if (!isAuthenticated) {
                                onLoginRequired()
                            } else if (!isFollowUpdating) {
                                isFollowUpdating = true
                                followErrorMessage = null
                                // The endpoint is a toggle, so apply only the count the server confirms.
                                coroutineScope.launch {
                                    val response = runCatching { apiService.toggleFollow(author!!.id) }.getOrNull()
                                    val result = response?.body()?.takeIf { response.isSuccessful }
                                    if (result == null) followErrorMessage = followUpdateError
                                    else {
                                        isFollowing = result.following
                                        author = author?.copy(followersCnt = result.followersCount)
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
                        stringResource(R.string.author_stories),
                        style = MaterialTheme.typography.headlineSmall.copy(fontFamily = AuthorEditorialFamily),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                if (stories.isEmpty()) {
                    item { Text(stringResource(R.string.author_no_stories), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                } else {
                    items(stories, key = { it.id }) { story ->
                        AuthorStoryRow(story = story, onClick = { onStoryClick(story.id) })
                    }
                }
            }
        }
    }
}

internal suspend fun loadFollowingState(apiService: WritOnApiService, authorId: String): Boolean? {
    var page = 1
    while (true) {
        val response = runCatching { apiService.getMyFollowing(page = page, limit = 50) }.getOrNull()
            ?: return null
        val body = response.body()?.takeIf { response.isSuccessful } ?: return null
        if (body.users.any { it.id == authorId }) return true
        if (!body.pagination.hasMore) return false
        page += 1
    }
}

@Composable
private fun AuthorIdentity(
    author: AuthorDto,
    isFollowing: Boolean,
    isFollowUpdating: Boolean,
    showFollowButton: Boolean,
    followErrorMessage: String?,
    onFollowClick: () -> Unit
) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            UserAvatar(
                url = author.avatarUrl,
                name = author.fullName,
                size = 76.dp,
                foundingWriterNumber = author.foundingWriterNumber,
                emailVerified = author.emailVerified
            )
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
                author.foundingWriterNumber?.let { number ->
                    Text(
                        stringResource(R.string.profile_founding_writer_badge, number),
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                        color = BrandRed
                    )
                }
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    stringResource(R.string.author_follow_counts, author.followersCnt ?: 0, author.followingCnt ?: 0),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        if (showFollowButton) {
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
            else Text(stringResource(if (isFollowing) R.string.author_following else R.string.author_follow), fontWeight = FontWeight.SemiBold)
        }
            followErrorMessage?.let {
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
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
            Text(stringResource(R.string.profile_tab_about), style = MaterialTheme.typography.titleLarge.copy(fontFamily = AuthorEditorialFamily), color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(WritOnSpacing.sm))
            Text(
                author.bio?.takeIf { it.isNotBlank() } ?: stringResource(R.string.author_no_bio),
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
            contentDescription = stringResource(R.string.author_story_cover, story.title),
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
                stringResource(R.string.author_story_metrics, story.readingTimeMin, story.likesCnt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
}
