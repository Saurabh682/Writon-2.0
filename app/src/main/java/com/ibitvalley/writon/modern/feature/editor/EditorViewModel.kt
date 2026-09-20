package com.ibitvalley.writon.modern.feature.editor

import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.ai.LocalGemmaAIEngine
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.DraftRepository
import com.ibitvalley.writon.modern.data.repository.MediaRepository
import com.ibitvalley.writon.modern.data.repository.QueuedPublishException
import android.content.Context
import android.net.Uri
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.ibitvalley.writon.modern.feature.feed.CATEGORIES
import com.ibitvalley.writon.modern.core.network.model.PostDto

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
    val isEditingPublished = MutableStateFlow(false)
    val categories = MutableStateFlow(CATEGORIES)
    val coverImage = MutableStateFlow<String?>(null)
    private val _draftStatus = MutableStateFlow<EditorDraftStatus>(EditorDraftStatus.Saved)
    val draftStatus: StateFlow<EditorDraftStatus> = _draftStatus.asStateFlow()
    private val _legacyDraft = MutableStateFlow<DraftEntity?>(null)
    val legacyDraft: StateFlow<DraftEntity?> = _legacyDraft.asStateFlow()
    private var currentDraft: DraftEntity? = null
    private var hasRestoredDraft = false
    private val editedBeforeRestore = mutableSetOf<EditorDraftField>()
    private var autosaveJob: Job? = null

    val aiSuggestion = MutableStateFlow<String?>(null)

    init {
        viewModelScope.launch {
            draftRepository.observeLatestDraft().collect { draft ->
                if (hasRestoredDraft) return@collect
                hasRestoredDraft = true
                if (draft != null) {
                    restoreDraft(draft)
                } else {
                    _legacyDraft.value = draftRepository.findLegacyDraft()
                }
                if (editedBeforeRestore.isNotEmpty()) scheduleAutosave()
            }
        }
        viewModelScope.launch {
            repository.getCategories().takeIf { it.isNotEmpty() }?.let { categories.value = it }
        }
    }

    fun restoreLegacyDraft() {
        val legacy = _legacyDraft.value ?: return
        viewModelScope.launch {
            val claimed = draftRepository.claimLegacyDraft(legacy.localId)
            _legacyDraft.value = null
            if (claimed != null) restoreDraft(claimed)
            else _draftStatus.value = EditorDraftStatus.Failed("The older draft could not be restored.")
        }
    }

    fun dismissLegacyDraft() {
        _legacyDraft.value = null
    }

    fun beginEditingPublishedStory(post: PostDto) {
        autosaveJob?.cancel()
        hasRestoredDraft = true
        editedBeforeRestore.clear()
        _draftStatus.value = EditorDraftStatus.Saving
        viewModelScope.launch {
            draftRepository.preparePublishedEdit(post)
                .onSuccess(::restoreDraft)
                .onFailure { error ->
                    _draftStatus.value = EditorDraftStatus.Failed(
                        error.message ?: "The story could not be opened for editing. Please try again."
                    )
                }
        }
    }

    private fun restoreDraft(draft: DraftEntity) {
        currentDraft = draft
        isEditingPublished.value = draft.syncState == "published_edit"
        if (EditorDraftField.Title !in editedBeforeRestore) title.value = draft.title
        if (EditorDraftField.Summary !in editedBeforeRestore) summary.value = draft.summary
        if (EditorDraftField.Category !in editedBeforeRestore) category.value = draft.category
        if (EditorDraftField.Content !in editedBeforeRestore) content.value = draft.content
        coverImage.value = draft.coverImage
        _draftStatus.value = EditorDraftStatus.Saved
    }

    fun updateTitle(value: String) {
        if (!hasRestoredDraft) editedBeforeRestore += EditorDraftField.Title
        title.value = value
        scheduleAutosave()
    }

    fun updateContent(value: String) {
        if (!hasRestoredDraft) editedBeforeRestore += EditorDraftField.Content
        content.value = value
        scheduleAutosave()
    }

    fun updateSummary(value: String) {
        if (!hasRestoredDraft) editedBeforeRestore += EditorDraftField.Summary
        summary.value = value
        scheduleAutosave()
    }

    fun updateCategory(value: String) {
        if (!hasRestoredDraft) editedBeforeRestore += EditorDraftField.Category
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

        autosaveJob?.cancel()
        viewModelScope.launch {
            isPublishing.value = true
            try {
                val localDraft = draftRepository.saveLocal(
                    existing = currentDraft,
                    title = title.value,
                    content = content.value,
                    summary = summary.value,
                    category = category.value,
                    coverImage = coverImage.value
                )
                currentDraft = localDraft
                WritOnTelemetry.trace("story_publish") {
                    draftRepository.publish(localDraft)
                }
                    .onSuccess {
                        repository.refreshPosts()
                        _draftStatus.value = EditorDraftStatus.Saved
                        clearAfterPublish()
                        onSuccess()
                    }
                    .onFailure { error ->
                        _draftStatus.value = if (error is QueuedPublishException) {
                            EditorDraftStatus.QueuedForPublish
                        } else {
                            EditorDraftStatus.Failed(error.message ?: "Could not publish. Your draft is still safe.")
                        }
                    }
            } catch (error: Exception) {
                _draftStatus.value = EditorDraftStatus.Failed(
                    error.message ?: "Could not save the latest changes for publishing. Please try again."
                )
            } finally {
                isPublishing.value = false
            }
        }
    }

    private fun clearAfterPublish() {
        currentDraft = null
        title.value = ""
        summary.value = ""
        category.value = "Essays"
        content.value = ""
        coverImage.value = null
        isEditingPublished.value = false
    }

    fun cancelQueuedPublish() {
        val draft = currentDraft ?: return
        viewModelScope.launch {
            draftRepository.cancelQueuedPublish(draft)
                .onSuccess { _draftStatus.value = EditorDraftStatus.Saved }
                .onFailure { error ->
                    _draftStatus.value = EditorDraftStatus.Failed(
                        error.message ?: "Could not cancel the queued publication."
                    )
                }
        }
    }

    fun saveDraft() {
        autosaveJob?.cancel()
        viewModelScope.launch { persistDraft() }
    }

    fun uploadCover(context: Context, uri: Uri) {
        viewModelScope.launch {
            _draftStatus.value = EditorDraftStatus.Saving
            WritOnTelemetry.trace("cover_image_upload") {
                    mediaRepository.uploadImage(context, uri)
                }
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

private enum class EditorDraftField { Title, Content, Summary, Category }

internal fun validateStoryForPublish(title: String, content: String): String? = when {
    title.isBlank() && content.isBlank() -> "Add a title and story before publishing."
    title.isBlank() -> "Add a title before publishing."
    title.trim().length < 3 -> "Use at least 3 characters for the title."
    content.isBlank() -> "Add your story before publishing."
    else -> null
}

sealed interface EditorDraftStatus {
    data object Unsaved : EditorDraftStatus
    data object Saving : EditorDraftStatus
    data object Saved : EditorDraftStatus
    data object Offline : EditorDraftStatus
    data object QueuedForPublish : EditorDraftStatus
    data class Failed(val message: String) : EditorDraftStatus
}
