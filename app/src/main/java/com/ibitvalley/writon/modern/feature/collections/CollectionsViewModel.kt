package com.ibitvalley.writon.modern.feature.collections

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.NotificationDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.network.model.ReadingHistoryItemDto
import com.ibitvalley.writon.modern.core.network.model.ReadingHistorySummaryDto
import com.ibitvalley.writon.modern.core.network.model.ReadingProgressRequestDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CollectionsViewModel(
    private val apiService: WritOnApiService
) : ViewModel() {
    var savedPosts by mutableStateOf<List<PostDto>>(emptyList())
        private set
    var applaudedPosts by mutableStateOf<List<PostDto>>(emptyList())
        private set
    var historyItems by mutableStateOf<List<ReadingHistoryItemDto>>(emptyList())
        private set
    var historySummary by mutableStateOf(ReadingHistorySummaryDto(0, 0f))
        private set
    var notifications by mutableStateOf<List<NotificationDto>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadSaved() = launchRequest {
        val response = apiService.getMyBookmarks()
        if (response.isSuccessful) savedPosts = response.body()?.posts.orEmpty()
        else errorMessage = "Could not load saved stories."
    }

    fun loadApplauds() = launchRequest {
        val response = apiService.getMyApplauds()
        if (response.isSuccessful) applaudedPosts = response.body()?.posts.orEmpty()
        else errorMessage = "Could not load applauded stories."
    }

    fun loadHistory() = launchRequest {
        val response = apiService.getMyReadingHistory()
        if (response.isSuccessful) {
            historyItems = response.body()?.items.orEmpty()
            historySummary = response.body()?.summary ?: ReadingHistorySummaryDto(0, 0f)
        } else errorMessage = "Could not load reading history."
    }

    fun loadNotifications(kind: String? = null) = launchRequest {
        val response = apiService.getMyNotifications(kind = kind)
        if (response.isSuccessful) notifications = response.body()?.notifications.orEmpty()
        else errorMessage = "Could not load notifications."
    }

    fun toggleApplaud(postId: String) = launchRequest {
        val response = apiService.toggleLike(postId)
        if (response.isSuccessful) loadApplauds()
        else errorMessage = "Could not update applause."
    }

    fun toggleBookmark(postId: String) = launchRequest {
        val response = apiService.toggleBookmark(postId)
        if (response.isSuccessful) loadSaved()
        else errorMessage = "Could not update saved stories."
    }

    fun recordReadingStart(postId: String) = launchRequest(showSpinner = false) {
        apiService.recordReadingProgress(postId, ReadingProgressRequestDto(progress = 0.05f))
    }

    private fun launchRequest(showSpinner: Boolean = true, block: suspend () -> Unit) {
        viewModelScope.launch {
            if (showSpinner) isLoading = true
            errorMessage = null
            runCatching {
                withContext(Dispatchers.IO) { block() }
            }.onFailure {
                errorMessage = "Check your connection and try again."
            }
            if (showSpinner) isLoading = false
        }
    }
}
