package com.ibitvalley.writon.modern.feature.reader

import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.ai.AIStorySummary
import com.ibitvalley.writon.modern.core.ai.LocalGemmaAIEngine
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.PostDetailRefreshOutcome
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ReaderViewModel(
    private val postId: String,
    private val repository: PostRepository,
    private val aiEngine: LocalGemmaAIEngine = LocalGemmaAIEngine()
) : ViewModel() {
    val storyId: String get() = postId
    private var totalEngagedSeconds = 0
    private var maximumProgress = 0.05f
    private var closed = false
    private val storyOpenTrace = WritOnTelemetry.beginTrace("story_open")
    private val _isUnavailable = MutableStateFlow(false)
    val isUnavailable: StateFlow<Boolean> = _isUnavailable.asStateFlow()
    private val _isLoadingStory = MutableStateFlow(true)
    val isLoadingStory: StateFlow<Boolean> = _isLoadingStory.asStateFlow()
    private val _loadFailed = MutableStateFlow(false)
    val loadFailed: StateFlow<Boolean> = _loadFailed.asStateFlow()
    private val _isShowingOfflineCopy = MutableStateFlow(false)
    val isShowingOfflineCopy: StateFlow<Boolean> = _isShowingOfflineCopy.asStateFlow()
    private val _commentMutationError = MutableStateFlow<String?>(null)
    val commentMutationError: StateFlow<String?> = _commentMutationError.asStateFlow()

    val post: StateFlow<PostEntity?> = repository.getPostDetailFlow(postId)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    val nextStory: StateFlow<PostEntity?> = combine(post, repository.getPostsFlow()) { current, candidates ->
        current?.let { selectNextStory(it, candidates) }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = null
    )

    val comments: StateFlow<List<CommentEntity>> = repository.getCommentsFlow(postId)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    init {
        viewModelScope.launch {
            post.filterNotNull().first()
            storyOpenTrace.close()
        }
        loadPost()
        refreshComments()
        recordReadingStart()
    }

    fun refreshPost() {
        if (_isLoadingStory.value) return
        loadPost()
    }

    private fun loadPost() {
        _isLoadingStory.value = true
        viewModelScope.launch {
            try {
                when (repository.refreshPostDetail(postId)) {
                    PostDetailRefreshOutcome.REFRESHED -> {
                        _isUnavailable.value = false
                        _loadFailed.value = false
                        _isShowingOfflineCopy.value = false
                    }
                    PostDetailRefreshOutcome.NOT_FOUND -> {
                        _isUnavailable.value = true
                        _loadFailed.value = false
                        _isShowingOfflineCopy.value = false
                        storyOpenTrace.close()
                    }
                    PostDetailRefreshOutcome.RETAINED_OFFLINE -> {
                        _isUnavailable.value = false
                        _loadFailed.value = false
                        _isShowingOfflineCopy.value = true
                    }
                    PostDetailRefreshOutcome.FAILED_NO_CACHE -> {
                        _isUnavailable.value = false
                        _loadFailed.value = true
                        _isShowingOfflineCopy.value = false
                        storyOpenTrace.close()
                    }
                }
            } finally {
                _isLoadingStory.value = false
            }
        }
    }

    private fun refreshComments() {
        viewModelScope.launch {
            repository.refreshComments(postId)
        }
    }

    private fun recordReadingStart() {
        viewModelScope.launch {
            repository.recordReadingStart(postId)
        }
    }

    fun submitComment(content: String, authorName: String, parentId: String? = null) {
        if (content.isBlank()) return

        viewModelScope.launch {
            repository.addComment(postId, content, authorName, parentId)
        }
    }

    fun updateComment(commentId: String, content: String) {
        if (content.isBlank()) return
        viewModelScope.launch {
            repository.updateComment(commentId, content)
                .onFailure { _commentMutationError.value = it.message ?: "Could not update the comment." }
        }
    }

    fun deleteComment(commentId: String) {
        viewModelScope.launch {
            repository.deleteComment(commentId, postId)
                .onFailure { _commentMutationError.value = it.message ?: "Could not delete the comment." }
        }
    }

    fun clearCommentMutationError() { _commentMutationError.value = null }

    val aiSummary = MutableStateFlow<AIStorySummary?>(null)
    val isGeneratingAI = MutableStateFlow(false)

    fun generateAISummary(title: String, content: String) {
        viewModelScope.launch {
            isGeneratingAI.value = true
            val summary = aiEngine.summarizeStory(title, content)
            aiSummary.value = summary
            isGeneratingAI.value = false
        }
    }

    fun toggleLike() {
        val currentPost = post.value ?: return
        viewModelScope.launch {
            repository.toggleLike(currentPost.id, currentPost.isLiked, currentPost.likesCnt)
        }
    }

    fun toggleBookmark(onConfirmedSaved: () -> Unit = {}) {
        val currentPost = post.value ?: return
        viewModelScope.launch {
            repository.toggleBookmark(currentPost.id, currentPost.isBookmarked, currentPost.bookmarksCnt)
                .onSuccess { isSaved -> if (isSaved) onConfirmedSaved() }
        }
    }

    fun recordEngagement(progress: Float, additionalSeconds: Int) {
        if (additionalSeconds <= 0) return
        val boundedSeconds = additionalSeconds.coerceIn(0, 60)
        totalEngagedSeconds += boundedSeconds
        maximumProgress = maxOf(maximumProgress, progress.coerceIn(0f, 1f))
        viewModelScope.launch {
            repository.recordReadingProgress(
                postId = postId,
                progress = maximumProgress,
                readSeconds = boundedSeconds,
                totalEngagedSeconds = totalEngagedSeconds
            )
        }
    }

    fun recordShare() {
        viewModelScope.launch { repository.recordFeedShare(postId) }
    }

    fun onReaderClosed(progress: Float, additionalSeconds: Int) {
        if (closed) return
        closed = true
        if (additionalSeconds > 0) recordEngagement(progress, additionalSeconds)
        if (totalEngagedSeconds < 5) {
            viewModelScope.launch {
                repository.recordFeedQuickExit(postId, totalEngagedSeconds.toFloat())
            }
        }
    }

    override fun onCleared() {
        storyOpenTrace.close()
        super.onCleared()
    }
}

internal fun selectNextStory(current: PostEntity, candidates: List<PostEntity>): PostEntity? =
    candidates.asSequence()
        .filter { it.id != current.id }
        .maxByOrNull { candidate ->
            val sameLanguage = current.languageCode != "und" && candidate.languageCode == current.languageCode
            val sameCategory = candidate.category.equals(current.category, ignoreCase = true)
            val differentAuthor = candidate.authorId != current.authorId
            when {
                sameLanguage && sameCategory && differentAuthor -> 5
                sameLanguage && differentAuthor -> 4
                sameCategory && differentAuthor -> 3
                differentAuthor -> 2
                sameLanguage -> 1
                else -> 0
            }
        }

internal enum class NextStoryReason { SAME_WRITER, SAME_CATEGORY, SAME_LANGUAGE, DIFFERENT_WRITER, RECOMMENDED }

internal fun nextStoryReason(current: PostEntity, next: PostEntity): NextStoryReason = when {
    next.authorId == current.authorId -> NextStoryReason.SAME_WRITER
    next.category.equals(current.category, ignoreCase = true) -> NextStoryReason.SAME_CATEGORY
    current.languageCode != "und" && next.languageCode == current.languageCode -> NextStoryReason.SAME_LANGUAGE
    next.authorId != current.authorId -> NextStoryReason.DIFFERENT_WRITER
    else -> NextStoryReason.RECOMMENDED
}
