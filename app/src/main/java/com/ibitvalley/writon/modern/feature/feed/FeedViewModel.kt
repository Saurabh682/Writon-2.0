package com.ibitvalley.writon.modern.feature.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.data.repository.PostRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class FeedViewModel(
    private val repository: PostRepository
) : ViewModel() {

    val selectedCategory = MutableStateFlow("All")
    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()
    val isRefreshing = MutableStateFlow(false)
    val isLoadingMore = MutableStateFlow(false)
    val hasMore = MutableStateFlow(true)

    private var nextPage = 1
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
            repository.seedInitialStoriesIfEmpty()
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

    fun refreshFeed() {
        if (isRefreshing.value) return
        val category = selectedCategory.value
        val query = _searchQuery.value
        val requestKey = feedKey(category, query)
        activeFeedKey = requestKey
        nextPage = 1
        hasMore.value = true
        isLoadingMore.value = false
        viewModelScope.launch {
            isRefreshing.value = true
            try {
                val result = repository.refreshPosts(category = category, query = query)
                if (activeFeedKey == requestKey) {
                    hasMore.value = result.wasFetched && result.hasMore
                    nextPage = 2
                }
            } finally {
                isRefreshing.value = false
            }
        }
    }

    /** Prefetches the next server page. The UI calls this near the end of the story deck. */
    fun loadNextPage() {
        if (isLoadingMore.value || isRefreshing.value || !hasMore.value) return

        val category = selectedCategory.value
        val query = _searchQuery.value
        val requestKey = feedKey(category, query)
        val pageToLoad = nextPage
        isLoadingMore.value = true

        viewModelScope.launch {
            try {
                val result = repository.loadPostsPage(
                    category = category,
                    query = query,
                    page = pageToLoad
                )
                if (activeFeedKey == requestKey && result.wasFetched) {
                    hasMore.value = result.hasMore
                    nextPage = pageToLoad + 1
                }
            } finally {
                if (activeFeedKey == requestKey) isLoadingMore.value = false
            }
        }
    }

    private fun feedKey(category: String = selectedCategory.value, query: String = _searchQuery.value): String =
        "$category\u0000$query"

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
