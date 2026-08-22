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
        selectedCategory.value = category
        refreshFeed()
    }

    fun onSearch(query: String) {
        _searchQuery.value = query
    }

    fun refreshFeed() {
        viewModelScope.launch {
            isRefreshing.value = true
            repository.refreshPosts(category = selectedCategory.value, query = _searchQuery.value)
            isRefreshing.value = false
        }
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
