package com.ibitvalley.writon.modern.feature.collections

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.NotificationDto
import com.ibitvalley.writon.modern.core.network.model.NotificationPreferencesDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.network.model.ReadingHistoryItemDto
import com.ibitvalley.writon.modern.core.network.model.ReadingHistorySummaryDto
import com.ibitvalley.writon.modern.core.network.model.ReadingProgressRequestDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class FollowedWriterReturnEntry(
    val notificationId: String,
    val storyId: String,
    val storyTitle: String,
    val writerName: String?,
)

internal fun selectFollowedWriterReturnEntry(
    preferences: NotificationPreferencesDto?,
    notifications: List<NotificationDto>,
    history: List<ReadingHistoryItemDto>,
): FollowedWriterReturnEntry? {
    if (preferences?.followedWriterPublishedEnabled != true) return null
    val completedStoryIds = history.asSequence()
        .filter { it.progress >= 0.7f }
        .mapTo(mutableSetOf()) { it.id }

    return notifications.asSequence()
        .filter { it.readAt == null && it.kind in setOf("followed_writer_published", "publishing") }
        .filter { it.postId != null && it.postId !in completedStoryIds }
        .mapNotNull { notification ->
            val storyId = notification.postId ?: return@mapNotNull null
            val storyTitle = notification.postTitle?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            FollowedWriterReturnEntry(
                notificationId = notification.id,
                storyId = storyId,
                storyTitle = storyTitle,
                writerName = notification.actor?.fullName?.takeIf { it.isNotBlank() }
                    ?: notification.actor?.penName?.takeIf { it.isNotBlank() },
            )
        }
        .firstOrNull()
}

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
    val hasUnreadNotifications: Boolean
        get() = notifications.any { it.readAt == null }
    var followedWriterReturnEntry by mutableStateOf<FollowedWriterReturnEntry?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    private var activeFollowedWriterOwner: String? = null

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

    fun markNotificationRead(notificationId: String) = launchRequest(showSpinner = false) {
        val response = apiService.markNotificationRead(notificationId)
        if (response.isSuccessful) {
            notifications = notifications.map { if (it.id == notificationId) it.copy(readAt = response.body()?.get("readAt")) else it }
        }
    }

    fun loadFollowedWriterReturnEntry(ownerId: String?) {
        activeFollowedWriterOwner = ownerId
        if (ownerId == null) {
            followedWriterReturnEntry = null
            return
        }
        viewModelScope.launch {
            val entry = try {
                withContext(Dispatchers.IO) {
                    coroutineScope {
                        val preferences = async { apiService.getNotificationPreferences() }
                        val notifications = async { apiService.getMyNotifications(limit = 50) }
                        val history = async { apiService.getMyReadingHistory(limit = 50) }
                        val preferenceResponse = preferences.await()
                        val notificationResponse = notifications.await()
                        val historyResponse = history.await()
                        if (!preferenceResponse.isSuccessful || !notificationResponse.isSuccessful || !historyResponse.isSuccessful) {
                            null
                        } else {
                            selectFollowedWriterReturnEntry(
                                preferenceResponse.body(),
                                notificationResponse.body()?.notifications.orEmpty(),
                                historyResponse.body()?.items.orEmpty(),
                            )
                        }
                    }
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (_: Exception) {
                null
            }
            if (activeFollowedWriterOwner == ownerId) followedWriterReturnEntry = entry
        }
    }

    fun consumeFollowedWriterReturnEntry() {
        val notificationId = followedWriterReturnEntry?.notificationId ?: return
        followedWriterReturnEntry = null
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { apiService.markNotificationRead(notificationId) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (_: Exception) {
                // The entry is refreshed on the next Home resume if the server did not record the read.
            }
        }
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
