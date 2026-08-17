package com.ibitvalley.writon.modern.feature.reader

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.ai.AIStorySummary
import com.ibitvalley.writon.modern.core.ai.LocalGemmaAIEngine
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.data.repository.PostRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ReaderViewModel(
    private val postId: String,
    private val repository: PostRepository,
    private val aiEngine: LocalGemmaAIEngine = LocalGemmaAIEngine()
) : ViewModel() {

    val post: StateFlow<PostEntity?> = repository.getPostDetailFlow(postId)
        .stateIn(
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

    val commentText = MutableStateFlow("")

    init {
        refreshComments()
    }

    private fun refreshComments() {
        viewModelScope.launch {
            repository.refreshComments(postId)
        }
    }

    fun submitComment(authorName: String) {
        val content = commentText.value
        if (content.isBlank()) return

        viewModelScope.launch {
            repository.addComment(postId, content, authorName)
            commentText.value = ""
        }
    }

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

    fun toggleBookmark() {
        val currentPost = post.value ?: return
        viewModelScope.launch {
            repository.toggleBookmark(currentPost.id, currentPost.isBookmarked, currentPost.bookmarksCnt)
        }
    }
}
