package com.ibitvalley.writon.modern.feature.explore

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.PostDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

class ExploreViewModel(
    private val apiService: WritOnApiService
) : ViewModel() {
    var discoveries by mutableStateOf<List<PostDto>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    private var loadedLimit: Int? = null

    fun load(limit: Int = 10, force: Boolean = false) {
        val boundedLimit = limit.coerceIn(1, 20)
        if (!force && discoveries.isNotEmpty() && loadedLimit == boundedLimit) return
        viewModelScope.launch {
            isLoading = true
            runCatching {
                withContext(Dispatchers.IO) { apiService.getPosts(tab = "popular", limit = boundedLimit) }
            }.onSuccess { response ->
                if (response.isSuccessful) {
                    discoveries = response.body()?.posts.orEmpty()
                    loadedLimit = boundedLimit
                }
            }
            isLoading = false
        }
    }

}

internal fun selectStartHere(
    posts: List<PostDto>,
    preferredLanguage: String?,
    limit: Int = 3
): List<PostDto> {
    val eligible = posts.filter { it.id.isNotBlank() && it.title.isNotBlank() }.distinctBy { it.id }
    if (eligible.isEmpty() || limit <= 0) return emptyList()

    val language = preferredLanguage?.substringBefore('-')?.lowercase()?.takeIf { it.isNotBlank() }
    val preferred = if (language == null) emptyList() else eligible.filter {
        it.languageCode?.substringBefore('-')?.lowercase() == language
    }
    val targetPreferred = (limit * 0.7f).roundToInt().coerceAtMost(preferred.size)
    val selected = pickDiverse(preferred, targetPreferred).toMutableList()
    selected += pickDiverse(eligible.filterNot { candidate -> selected.any { it.id == candidate.id } }, limit - selected.size)
    return selected.take(limit)
}

internal fun selectQuickReads(
    posts: List<PostDto>,
    preferredLanguage: String?,
    excludedIds: Set<String> = emptySet(),
    limit: Int = 4
): List<PostDto> = selectStartHere(
    posts = posts.filter { it.readingTimeMin in 1..5 && it.id !in excludedIds },
    preferredLanguage = preferredLanguage,
    limit = limit
)

internal fun selectFindARead(
    posts: List<PostDto>,
    preferredLanguage: String?,
    selectedLanguage: String? = null,
    selectedCategory: String? = null,
    maxReadingTimeMin: Int? = null,
    limit: Int = 3
): List<PostDto> {
    val language = selectedLanguage?.normalizedLanguage()
    val category = selectedCategory?.trim()?.takeIf { it.isNotEmpty() }
    val matches = posts.filter { post ->
        (language == null || post.languageCode.normalizedLanguage() == language) &&
            (category == null || post.category.equals(category, ignoreCase = true)) &&
            (maxReadingTimeMin == null || post.readingTimeMin in 1..maxReadingTimeMin)
    }
    return selectStartHere(matches, selectedLanguage ?: preferredLanguage, limit)
}

internal fun availableFindAReadLanguages(posts: List<PostDto>): List<String> = posts
    .mapNotNull { it.languageCode.normalizedLanguage() }
    .distinct()
    .sorted()

internal fun availableFindAReadCategories(posts: List<PostDto>): List<String> = posts
    .map { it.category.trim() }
    .filter { it.isNotEmpty() }
    .distinctBy { it.lowercase() }
    .sortedBy { it.lowercase() }

private fun String?.normalizedLanguage(): String? = this
    ?.trim()
    ?.substringBefore('-')
    ?.lowercase()
    ?.takeIf { it.isNotEmpty() && it != "und" }

private fun pickDiverse(posts: List<PostDto>, limit: Int): List<PostDto> {
    if (limit <= 0) return emptyList()
    val selected = mutableListOf<PostDto>()
    val authors = mutableSetOf<String>()
    val categories = mutableSetOf<String>()

    fun addWhere(matches: (PostDto) -> Boolean) {
        posts.asSequence()
            .filter { candidate -> selected.none { it.id == candidate.id } && matches(candidate) }
            .take(limit - selected.size)
            .forEach {
                selected += it
                authors += it.author.id
                categories += it.category.lowercase()
            }
    }

    addWhere { it.author.id !in authors && it.category.lowercase() !in categories }
    addWhere { it.author.id !in authors }
    addWhere { true }
    return selected.take(limit)
}
