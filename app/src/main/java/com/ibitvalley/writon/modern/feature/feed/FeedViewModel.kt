package com.ibitvalley.writon.modern.feature.feed

import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.data.repository.PostRepository
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

class FeedViewModel(
    private val repository: PostRepository
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

    // Preserve scroll state
    var scrollIndex = 0
    var scrollOffset = 0

    @OptIn(ExperimentalCoroutinesApi::class)
    val posts: StateFlow<List<PostEntity>> = combine(
        selectedCategory, 
        _searchQuery
    ) { category, query ->
        Pair(category, query)
    }.flatMapLatest { (category, query) ->
        repository.getPostsFlow(category, query)
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
        if (personalizedFeedEnabled == enabled) return
        personalizedFeedEnabled = enabled
        refreshFeed()
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
                if (wantsPersonalizedFeed) {
                    val result = WritOnTelemetry.trace("feed_first_load") {
                        repository.loadPersonalizedFeed(limit = 20)
                    }
                    if (activeFeedKey == requestKey) {
                        activePersonalizedFeed = result.isPersonalized
                        nextPersonalizedCursor = result.nextCursor.takeIf { result.isPersonalized }
                        hasMore.value = result.nextCursor != null
                        refreshFailed.value = !result.wasFetched
                        if (result.wasFetched && !result.isPersonalized) {
                            nextPage = result.nextCursor?.toIntOrNull() ?: 2
                        }
                    }
                } else {
                    val result = WritOnTelemetry.trace("feed_first_load") {
                        repository.refreshPosts(category = category, query = query)
                    }
                    if (activeFeedKey == requestKey) {
                        hasMore.value = result.hasMore
                        refreshFailed.value = !result.wasFetched
                        if (result.wasFetched) nextPage = 2
                    }
                }
            } catch (e: Exception) {
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
                if (activePersonalizedFeed) {
                    val result = repository.loadPersonalizedFeed(cursor = nextPersonalizedCursor, limit = 20)
                    if (activeFeedKey == requestKey && result.wasFetched) {
                        nextPersonalizedCursor = result.nextCursor
                        hasMore.value = result.nextCursor != null
                    } else if (activeFeedKey == requestKey) {
                        loadMoreFailed.value = true
                    }
                } else {
                    val result = repository.loadPostsPage(
                        category = category,
                        query = query,
                        page = pageToLoad
                    )
                    if (activeFeedKey == requestKey && result.wasFetched) {
                        hasMore.value = result.hasMore
                        nextPage = pageToLoad + 1
                    } else if (activeFeedKey == requestKey) {
                        loadMoreFailed.value = true
                    }
                }
            } catch (e: Exception) {
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
