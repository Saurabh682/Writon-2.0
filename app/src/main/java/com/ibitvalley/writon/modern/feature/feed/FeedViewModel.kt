package com.ibitvalley.writon.modern.feature.feed

import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.FeedAudience
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

internal enum class FeedEmptyState { LOADING, FAILURE, EMPTY }

internal fun feedEmptyState(isRefreshing: Boolean, refreshFailed: Boolean): FeedEmptyState = when {
    isRefreshing -> FeedEmptyState.LOADING
    refreshFailed -> FeedEmptyState.FAILURE
    else -> FeedEmptyState.EMPTY
}

internal fun shouldUsePersonalizedHomeFeed(enabled: Boolean, category: String, query: String): Boolean =
    enabled && category == "All" && query.isBlank()

internal fun sourceFeedPosts(cached: List<PostEntity>, ids: List<String>): List<PostEntity> {
    val byId = cached.associateBy { it.id }
    return ids.distinct().mapNotNull(byId::get)
}

class FeedViewModel(
    private val repository: PostRepository,
    val audience: FeedAudience = FeedAudience.COMMUNITY
) : ViewModel() {

    val selectedCategory = MutableStateFlow("All")
    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()
    val isRefreshing = MutableStateFlow(false)
    val isLoadingMore = MutableStateFlow(false)
    val hasMore = MutableStateFlow(true)
    val refreshFailed = MutableStateFlow(false)
    val loadMoreFailed = MutableStateFlow(false)

    private var nextPage = 1
    private var nextPersonalizedCursor: String? = null
    private var personalizedFeedEnabled = false
    private var activePersonalizedFeed = false
    private var refreshPending = false
    private var activeFeedKey = feedKey()
    private val feedIds = MutableStateFlow(repository.cachedSourceFeedIds(audience))

    // Preserve scroll state
    var scrollIndex = 0
    var scrollOffset = 0

    @OptIn(ExperimentalCoroutinesApi::class)
    val posts: StateFlow<List<PostEntity>> = combine(
        selectedCategory, 
        _searchQuery
    ) { category, query -> Pair(category, query) }.flatMapLatest { (category, query) ->
        combine(repository.getPostsFlow(category, query), feedIds) { cached, ids ->
            // Detail/search/Explore cache writes cannot add stories to either deck.
            sourceFeedPosts(cached, ids)
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = emptyList()
    )

    init {
        viewModelScope.launch {
            repository.removeLegacySeedStories()
            refreshFeed()
        }
    }

    fun selectCategory(category: String) {
        if (selectedCategory.value == category) return
        selectedCategory.value = category
        refreshFeed()
    }

    fun onSearch(query: String) {
        _searchQuery.value = query
    }

    fun setPersonalizedFeedEnabled(enabled: Boolean) {
        // Source-safe ranking must ship before re-enabling the mixed legacy fallback.
        personalizedFeedEnabled = false
    }

    fun refreshFeed() {
        if (isRefreshing.value) {
            refreshPending = true
            return
        }
        val category = selectedCategory.value
        val query = _searchQuery.value
        val wantsPersonalizedFeed = shouldUsePersonalizedHomeFeed(personalizedFeedEnabled, category, query)
        val requestKey = feedKey(category, query, wantsPersonalizedFeed)
        activeFeedKey = requestKey
        nextPage = 1
        nextPersonalizedCursor = null
        activePersonalizedFeed = false
        hasMore.value = true
        isLoadingMore.value = false
        refreshFailed.value = false
        loadMoreFailed.value = false
        viewModelScope.launch {
            isRefreshing.value = true
            try {
                val result = WritOnTelemetry.trace("feed_first_load") {
                    repository.loadSourceFeed(audience, category, query, page = 1)
                }
                if (activeFeedKey == requestKey) {
                    feedIds.value = result.items.map { it.id }
                    if (category == "All" && query.isBlank()) repository.saveSourceFeedIds(audience, feedIds.value)
                    hasMore.value = result.hasMore
                    nextPage = 2
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (activeFeedKey == requestKey) refreshFailed.value = true
                e.printStackTrace()
            } finally {
                if (activeFeedKey == requestKey) {
                    isRefreshing.value = false
                }
                if (refreshPending) {
                    refreshPending = false
                    refreshFeed()
                }
            }
        }
    }

    /** Prefetches the next server page. The UI calls this near the end of the story deck. */
    fun loadNextPage() {
        if (isLoadingMore.value || isRefreshing.value || !hasMore.value) return

        val category = selectedCategory.value
        val query = _searchQuery.value
        val requestKey = feedKey(
            category,
            query,
            shouldUsePersonalizedHomeFeed(personalizedFeedEnabled, category, query)
        )
        val pageToLoad = nextPage
        isLoadingMore.value = true
        loadMoreFailed.value = false

        viewModelScope.launch {
            try {
                val result = repository.loadSourceFeed(audience, category, query, pageToLoad)
                if (activeFeedKey == requestKey) {
                    feedIds.value = (feedIds.value + result.items.map { it.id }).distinct()
                    if (category == "All" && query.isBlank()) repository.saveSourceFeedIds(audience, feedIds.value)
                    hasMore.value = result.hasMore
                    nextPage = pageToLoad + 1
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                e.printStackTrace()
                if (activeFeedKey == requestKey) loadMoreFailed.value = true
            } finally {
                if (activeFeedKey == requestKey) isLoadingMore.value = false
            }
        }
    }

    private fun feedKey(
        category: String = selectedCategory.value,
        query: String = _searchQuery.value,
        personalized: Boolean = shouldUsePersonalizedHomeFeed(personalizedFeedEnabled, category, query)
    ): String = "$category\u0000$query\u0000$personalized"

    fun recordImpression(postId: String) {
        viewModelScope.launch { repository.recordFeedImpression(postId) }
    }

    fun recordOpen(postId: String) {
        viewModelScope.launch { repository.recordFeedOpen(postId) }
    }

    fun toggleLike(postId: String, currentLiked: Boolean, count: Int) {
        viewModelScope.launch {
            repository.toggleLike(postId, currentLiked, count)
        }
    }

    fun toggleBookmark(postId: String, currentBookmarked: Boolean, count: Int) {
        viewModelScope.launch {
            repository.toggleBookmark(postId, currentBookmarked, count)
        }
    }
}
