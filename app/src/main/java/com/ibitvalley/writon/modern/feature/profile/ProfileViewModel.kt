package com.ibitvalley.writon.modern.feature.profile

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.MyProfileDto
import com.ibitvalley.writon.modern.core.network.model.MilestoneJourneyDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.network.model.UpsertMyProfileRequestDto
import com.ibitvalley.writon.modern.data.repository.MediaRepository
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import com.google.gson.JsonParser

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val apiService: WritOnApiService,
    @Suppress("unused") private val userDao: UserDao,
    private val mediaRepository: MediaRepository,
    private val postRepository: PostRepository
) : ViewModel() {

    private val _userProfile = MutableStateFlow<MyProfileDto?>(null)
    val userProfile: StateFlow<MyProfileDto?> = _userProfile

    private val _userStories = MutableStateFlow<List<PostDto>>(emptyList())
    val userStories: StateFlow<List<PostDto>> = _userStories

    private val _highlights = MutableStateFlow<List<PostDto>>(emptyList())
    val highlights: StateFlow<List<PostDto>> = _highlights

    private val _milestoneJourney = MutableStateFlow<MilestoneJourneyDto?>(null)
    val milestoneJourney: StateFlow<MilestoneJourneyDto?> = _milestoneJourney

    val isLoading = MutableStateFlow(false)

    private val _loadFailed = MutableStateFlow(false)
    val loadFailed: StateFlow<Boolean> = _loadFailed

    private val _deletingStoryId = MutableStateFlow<String?>(null)
    val deletingStoryId: StateFlow<String?> = _deletingStoryId

    init {
        loadUserProfile()
    }

    fun loadUserProfile() {
        viewModelScope.launch {
            isLoading.value = true
            _loadFailed.value = false
            try {
                val response = apiService.getMyProfile()
                if (response.isSuccessful && response.body() != null) {
                    val profile = response.body()!!.profile
                    _userProfile.value = profile

                    try {
                        val milestoneResponse = apiService.getMyMilestones()
                        if (milestoneResponse.isSuccessful) {
                            _milestoneJourney.value = milestoneResponse.body()
                        }
                    } catch (cancelled: CancellationException) {
                        throw cancelled
                    } catch (_: Exception) {
                        // Milestones enhance the profile but must never block its core content.
                    }

                    // Fetch user's own stories by authorId or authorPenName
                    val postsResponse = apiService.getPosts(
                        authorId = profile.id.ifBlank { null },
                        authorPenName = profile.penName.ifBlank { null },
                        limit = 50
                    )
                    if (postsResponse.isSuccessful && postsResponse.body() != null) {
                        val allFetched = postsResponse.body()!!.posts
                        val authorPosts = allFetched.filter {
                            it.author.id == profile.id ||
                            (profile.penName.isNotBlank() && it.author.penName.equals(profile.penName, ignoreCase = true))
                        }
                        _userStories.value = authorPosts
                        _highlights.value = authorPosts.sortedByDescending { it.likesCnt }
                    }
                } else {
                    _loadFailed.value = true
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (e: Exception) {
                _loadFailed.value = true
            } finally {
                isLoading.value = false
            }
        }
    }

    fun updateProfile(
        fullName: String,
        penName: String,
        bio: String,
        location: String,
        avatarContext: Context? = null,
        avatarUri: Uri? = null,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            isLoading.value = true
            try {
                val current = _userProfile.value
                val uploadedAvatarUrl = if (avatarContext != null && avatarUri != null) {
                    WritOnTelemetry.trace("profile_photo_upload") {
                        mediaRepository.uploadImage(avatarContext, avatarUri)
                    }.getOrElse { throw it }
                } else {
                    null
                }
                val request = UpsertMyProfileRequestDto(
                    penName = penName.trim(),
                    fullName = fullName.trim(),
                    bio = bio.trim().ifBlank { null },
                    location = location.trim().ifBlank { null },
                    // Null is omitted by the default Gson converter, so a text-only edit does not
                    // resubmit a legacy/external avatar that the hardened server correctly rejects.
                    avatarUrl = uploadedAvatarUrl
                )
                val response = apiService.upsertMyProfile(request)
                if (response.isSuccessful && response.body() != null) {
                    _userProfile.value = response.body()!!.profile
                    onSuccess()
                } else {
                    val errMsg = profileUpdateFailureMessage(response.errorBody()?.string())
                    onError(errMsg)
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (e: Exception) {
                onError(e.message ?: "Network error occurred")
            } finally {
                isLoading.value = false
            }
        }
    }

    fun deleteStory(
        storyId: String,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        if (_deletingStoryId.value != null) return
        viewModelScope.launch {
            _deletingStoryId.value = storyId
            postRepository.deletePublishedStory(storyId)
                .onSuccess {
                    _userStories.value = _userStories.value.filterNot { it.id == storyId }
                    _highlights.value = _highlights.value.filterNot { it.id == storyId }
                    _userProfile.value = _userProfile.value?.let { profile ->
                        profile.copy(storiesCount = maxOf(0, profile.storiesCount - 1))
                    }
                    onSuccess()
                }
                .onFailure { error ->
                    onError(error.message.orEmpty())
                }
            _deletingStoryId.value = null
        }
    }
}

internal fun profileUpdateFailureMessage(responseBody: String?): String {
    if (responseBody.isNullOrBlank()) return "Failed to update profile"
    return runCatching {
        val body = JsonParser.parseString(responseBody).asJsonObject
        val details = body.getAsJsonObject("details")
            ?.entrySet()
            ?.asSequence()
            ?.flatMap { (_, value) -> value.asJsonArray.asSequence().map { it.asString } }
            ?.firstOrNull { it.isNotBlank() }
        details ?: body.get("error")?.asString?.takeIf { it.isNotBlank() }
    }.getOrNull() ?: "Failed to update profile"
}
