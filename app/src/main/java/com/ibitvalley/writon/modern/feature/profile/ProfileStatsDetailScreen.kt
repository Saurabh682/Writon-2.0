package com.ibitvalley.writon.modern.feature.profile

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.AuthorDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

private const val PROFILE_STATS_REQUEST_TIMEOUT_MS = 15_000L

enum class ProfileStatsDestination(val routeValue: String, val title: String) {
    Stories("stories", "Stories published"),
    Applauds("applauds", "Applauds received"),
    Followers("followers", "Followers"),
    Following("following", "Following");

    companion object {
        fun fromRoute(value: String?): ProfileStatsDestination? = entries.firstOrNull { it.routeValue == value }
    }
}

data class ProfileStatsDetailUiState(
    val isLoading: Boolean = false,
    val posts: List<PostDto> = emptyList(),
    val users: List<AuthorDto> = emptyList(),
    val errorMessage: String? = null,
)

class ProfileStatsDetailViewModel(
    private val destination: ProfileStatsDestination,
    private val apiService: WritOnApiService,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileStatsDetailUiState(isLoading = true))
    val uiState: StateFlow<ProfileStatsDetailUiState> = _uiState

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = ProfileStatsDetailUiState(isLoading = true)
            try {
                _uiState.value = loadProfileStatsDetail(destination, apiService)
            } catch (_: TimeoutCancellationException) {
                _uiState.value = ProfileStatsDetailUiState(errorMessage = "This is taking longer than expected. Try again.")
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                _uiState.value = ProfileStatsDetailUiState(errorMessage = "Check your connection and try again.")
            }
        }
    }
}

internal suspend fun loadProfileStatsDetail(
    destination: ProfileStatsDestination,
    apiService: WritOnApiService,
): ProfileStatsDetailUiState = withTimeout(PROFILE_STATS_REQUEST_TIMEOUT_MS) {
    when (destination) {
        ProfileStatsDestination.Stories -> {
            val response = apiService.getMyPublishedStories()
            response.takeIf { it.isSuccessful }?.body()?.let { ProfileStatsDetailUiState(posts = it.posts) }
                ?: ProfileStatsDetailUiState(errorMessage = "We could not load your published stories.")
        }
        ProfileStatsDestination.Applauds -> {
            val response = apiService.getMyReceivedApplauseStories()
            response.takeIf { it.isSuccessful }?.body()?.let { ProfileStatsDetailUiState(posts = it.posts) }
                ?: ProfileStatsDetailUiState(errorMessage = "We could not load your applauded stories.")
        }
        ProfileStatsDestination.Followers -> {
            val response = apiService.getMyFollowers()
            response.takeIf { it.isSuccessful }?.body()?.let { ProfileStatsDetailUiState(users = it.users) }
                ?: ProfileStatsDetailUiState(errorMessage = "We could not load your followers.")
        }
        ProfileStatsDestination.Following -> {
            val response = apiService.getMyFollowing()
            response.takeIf { it.isSuccessful }?.body()?.let { ProfileStatsDetailUiState(users = it.users) }
                ?: ProfileStatsDetailUiState(errorMessage = "We could not load writers you follow.")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileStatsDetailScreen(
    destination: ProfileStatsDestination,
    viewModel: ProfileStatsDetailViewModel,
    onBackClick: () -> Unit,
    onStoryClick: (String) -> Unit,
    onAuthorClick: (String) -> Unit,
) {
    val state by viewModel.uiState.collectAsState()
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(destination.title, style = MaterialTheme.typography.headlineSmall) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Image(
                            painter = painterResource(R.drawable.ic_back),
                            contentDescription = "Back",
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground),
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        when {
            state.isLoading -> ProfileStatsLoading(Modifier.padding(innerPadding))
            state.errorMessage != null -> ProfileStatsError(
                message = state.errorMessage!!,
                onRetry = viewModel::refresh,
                modifier = Modifier.padding(innerPadding),
            )
            destination == ProfileStatsDestination.Stories || destination == ProfileStatsDestination.Applauds -> {
                if (state.posts.isEmpty()) {
                    ProfileStatsEmpty(destination, Modifier.padding(innerPadding))
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(innerPadding),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(WritOnSpacing.lg),
                        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md),
                    ) {
                        items(state.posts, key = PostDto::id) { post ->
                            ProfileStatStoryRow(
                                post = post,
                                showApplauds = destination == ProfileStatsDestination.Applauds,
                                onClick = { onStoryClick(post.id) },
                            )
                        }
                    }
                }
            }
            else -> {
                if (state.users.isEmpty()) {
                    ProfileStatsEmpty(destination, Modifier.padding(innerPadding))
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(innerPadding),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(WritOnSpacing.lg),
                        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.sm),
                    ) {
                        items(state.users, key = AuthorDto::id) { author ->
                            ProfileStatAuthorRow(author = author, onClick = { onAuthorClick(author.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileStatStoryRow(post: PostDto, showApplauds: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        tonalElevation = WritOnElevation.flat,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .semantics { role = Role.Button; contentDescription = "Open ${post.title}" },
    ) {
        Column(Modifier.padding(WritOnSpacing.md)) {
            Text(post.category.uppercase(), style = MaterialTheme.typography.labelSmall, color = BrandRed)
            Spacer(Modifier.height(6.dp))
            Text(post.title, style = MaterialTheme.typography.titleLarge, maxLines = 2, overflow = TextOverflow.Ellipsis)
            post.summary?.takeIf { it.isNotBlank() }?.let { summary ->
                Spacer(Modifier.height(6.dp))
                Text(summary, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(12.dp))
            Text(
                text = if (showApplauds) "${post.likesCnt} applauds" else "${post.readingTimeMin} min read",
                style = MaterialTheme.typography.labelLarge,
                color = if (showApplauds) BrandRed else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ProfileStatAuthorRow(author: AuthorDto, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .semantics { role = Role.Button; contentDescription = "Open ${author.fullName}'s profile" },
    ) {
        Row(modifier = Modifier.padding(WritOnSpacing.md), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.size(48.dp)) {
                Box(contentAlignment = Alignment.Center) { Text(initialsForProfileStat(author.fullName), style = MaterialTheme.typography.labelLarge) }
            }
            Spacer(Modifier.width(WritOnSpacing.md))
            Column(Modifier.weight(1f)) {
                Text(author.fullName, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold), maxLines = 1, overflow = TextOverflow.Ellipsis)
                author.penName.takeIf { it.isNotBlank() }?.let { Text("@$it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
private fun ProfileStatsLoading(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        androidx.compose.material3.CircularProgressIndicator(color = BrandRed)
    }
}

@Composable
private fun ProfileStatsError(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize().padding(WritOnSpacing.xl), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onRetry) { Text("Try again", color = BrandRed) }
        }
    }
}

@Composable
private fun ProfileStatsEmpty(destination: ProfileStatsDestination, modifier: Modifier = Modifier) {
    val title = when (destination) {
        ProfileStatsDestination.Stories -> "You have not published a story yet."
        ProfileStatsDestination.Applauds -> stringResource(R.string.applauds_empty_title)
        ProfileStatsDestination.Followers -> "No one is following you yet."
        ProfileStatsDestination.Following -> "You are not following any writers yet."
    }
    Box(modifier = modifier.fillMaxSize().padding(WritOnSpacing.xl), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (destination == ProfileStatsDestination.Applauds) {
                Image(
                    painter = painterResource(R.drawable.empty_applauds_received),
                    contentDescription = null,
                    modifier = Modifier.size(220.dp),
                    contentScale = ContentScale.Fit,
                )
            }
            Text(
                title,
                modifier = Modifier.padding(top = if (destination == ProfileStatsDestination.Applauds) WritOnSpacing.md else 0.dp),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
            if (destination == ProfileStatsDestination.Applauds) {
                Text(
                    stringResource(R.string.applauds_received_empty_desc),
                    modifier = Modifier.padding(top = WritOnSpacing.sm),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

private fun initialsForProfileStat(name: String): String =
    name.split(' ').mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")
