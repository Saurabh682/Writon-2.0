package com.ibitvalley.writon.modern.feature.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.ai.LocalGemmaAIEngine
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.DraftRepository
import com.ibitvalley.writon.modern.data.repository.MediaRepository
import android.content.Context
import android.net.Uri
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.ibitvalley.writon.modern.feature.feed.CATEGORIES

class EditorViewModel(
    private val repository: PostRepository,
    private val draftRepository: DraftRepository,
    private val mediaRepository: MediaRepository,
    private val aiEngine: LocalGemmaAIEngine = LocalGemmaAIEngine()
) : ViewModel() {

    val title = MutableStateFlow("")
    val summary = MutableStateFlow("")
    val category = MutableStateFlow("Essays")
    val content = MutableStateFlow("")
    val isPublishing = MutableStateFlow(false)
    val categories = MutableStateFlow(CATEGORIES)
    val coverImage = MutableStateFlow<String?>(null)
    private val _draftStatus = MutableStateFlow<EditorDraftStatus>(EditorDraftStatus.Saved)
    val draftStatus: StateFlow<EditorDraftStatus> = _draftStatus.asStateFlow()
    private var currentDraft: DraftEntity? = null
    private var hasRestoredDraft = false
    private var autosaveJob: Job? = null

    val aiSuggestion = MutableStateFlow<String?>(null)

    init {
        viewModelScope.launch {
            draftRepository.observeLatestDraft().collect { draft ->
                if (hasRestoredDraft) return@collect
                hasRestoredDraft = true
                if (draft != null) {
                    currentDraft = draft
                    title.value = draft.title
                    summary.value = draft.summary
                    category.value = draft.category
                    content.value = draft.content
                    coverImage.value = draft.coverImage
                    _draftStatus.value = EditorDraftStatus.Saved
                }
            }
        }
        viewModelScope.launch {
            repository.getCategories().takeIf { it.isNotEmpty() }?.let { categories.value = it }
        }
    }

    fun updateTitle(value: String) {
        title.value = value
        scheduleAutosave()
    }

    fun updateContent(value: String) {
        content.value = value
        scheduleAutosave()
    }

    fun updateSummary(value: String) {
        summary.value = value
        scheduleAutosave()
    }

    fun updateCategory(value: String) {
        category.value = value
        scheduleAutosave()
    }

    fun runAICopilot(action: String) {
        viewModelScope.launch {
            val text = content.value
            when (action) {
                "polish" -> {
                    aiSuggestion.value = aiEngine.polishWriting(text)
                }
                "enrich" -> {
                    aiSuggestion.value = aiEngine.enrichLiteraryTone(text)
                }
                "headlines" -> {
                    val ideas = aiEngine.generateHeadlineIdeas(title.value.ifEmpty { text })
                    aiSuggestion.value = ideas.joinToString("\n")
                }
            }
        }
    }

    fun applySuggestion() {
        aiSuggestion.value?.let {
            content.value = it
            aiSuggestion.value = null
        }
    }

    fun dismissSuggestion() {
        aiSuggestion.value = null
    }

    fun publishStory(onSuccess: () -> Unit) {
        validateStoryForPublish(title.value, content.value)?.let { message ->
            _draftStatus.value = EditorDraftStatus.Failed(message)
            return
        }

        viewModelScope.launch {
            isPublishing.value = true
            val localDraft = draftRepository.saveLocal(
                existing = currentDraft,
                title = title.value,
                content = content.value,
                summary = summary.value,
                category = category.value,
                coverImage = coverImage.value
            )
            currentDraft = localDraft
            draftRepository.publish(localDraft)
                .onSuccess {
                    repository.refreshPosts()
                    _draftStatus.value = EditorDraftStatus.Saved
                    onSuccess()
                }
                .onFailure { error ->
                    _draftStatus.value = EditorDraftStatus.Failed(error.message ?: "Could not publish. Your draft is still safe.")
                }
            isPublishing.value = false
        }
    }

    fun saveDraft() {
        autosaveJob?.cancel()
        viewModelScope.launch { persistDraft() }
    }

    fun uploadCover(context: Context, uri: Uri) {
        viewModelScope.launch {
            _draftStatus.value = EditorDraftStatus.Saving
            mediaRepository.uploadImage(context, uri)
                .onSuccess { uploadedUrl ->
                    coverImage.value = uploadedUrl
                    persistDraft()
                }
                .onFailure { error ->
                    _draftStatus.value = EditorDraftStatus.Failed(error.message ?: "Could not upload the image.")
                }
        }
    }

    private fun scheduleAutosave() {
        if (!hasRestoredDraft) return
        _draftStatus.value = EditorDraftStatus.Unsaved
        autosaveJob?.cancel()
        autosaveJob = viewModelScope.launch {
            kotlinx.coroutines.delay(800)
            persistDraft()
        }
    }

    private suspend fun persistDraft() {
        _draftStatus.value = EditorDraftStatus.Saving
        val localDraft = draftRepository.saveLocal(
            existing = currentDraft,
            title = title.value,
            content = content.value,
            summary = summary.value,
            category = category.value,
            coverImage = coverImage.value
        )
        currentDraft = localDraft
        draftRepository.syncDraft(localDraft)
            .onSuccess { synced ->
                currentDraft = synced
                _draftStatus.value = EditorDraftStatus.Saved
            }
            .onFailure {
                _draftStatus.value = EditorDraftStatus.Offline
            }
    }
}

internal fun validateStoryForPublish(title: String, content: String): String? = when {
    title.isBlank() && content.isBlank() -> "Add a title and story before publishing."
    title.isBlank() -> "Add a title before publishing."
    content.isBlank() -> "Add your story before publishing."
    else -> null
}

sealed interface EditorDraftStatus {
    data object Unsaved : EditorDraftStatus
    data object Saving : EditorDraftStatus
    data object Saved : EditorDraftStatus
    data object Offline : EditorDraftStatus
    data class Failed(val message: String) : EditorDraftStatus
}
