package com.ibitvalley.writon.modern.feature.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.ai.LocalGemmaAIEngine
import com.ibitvalley.writon.modern.data.repository.PostRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class EditorViewModel(
    private val repository: PostRepository,
    private val aiEngine: LocalGemmaAIEngine = LocalGemmaAIEngine()
) : ViewModel() {

    val title = MutableStateFlow("")
    val summary = MutableStateFlow("")
    val category = MutableStateFlow("Essays")
    val content = MutableStateFlow("")
    val isPublishing = MutableStateFlow(false)

    val aiSuggestion = MutableStateFlow<String?>(null)

    fun updateTitle(value: String) {
        title.value = value
    }

    fun updateContent(value: String) {
        content.value = value
    }

    fun updateSummary(value: String) {
        summary.value = value
    }

    fun updateCategory(value: String) {
        category.value = value
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
        if (title.value.isBlank() || content.value.isBlank()) return

        viewModelScope.launch {
            isPublishing.value = true
            repository.publishStory(
                title = title.value,
                content = content.value,
                summary = summary.value.ifBlank { null },
                category = category.value
            )
            isPublishing.value = false
            onSuccess()
        }
    }
}
