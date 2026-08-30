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

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val apiService: WritOnApiService,
    @Suppress("unused") private val userDao: UserDao,
    private val mediaRepository: MediaRepository
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

    init {
        loadUserProfile()
    }

    fun loadUserProfile() {
        viewModelScope.launch {
            isLoading.value = true
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
                }
            } catch (e: Exception) {
                e.printStackTrace()
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
                val avatarUrl = if (avatarContext != null && avatarUri != null) {
                    mediaRepository.uploadImage(avatarContext, avatarUri).getOrElse { throw it }
                } else {
                    current?.avatarUrl
                }
                val request = UpsertMyProfileRequestDto(
                    penName = penName.trim(),
                    fullName = fullName.trim(),
                    bio = bio.trim().ifBlank { null },
                    location = location.trim().ifBlank { null },
                    avatarUrl = avatarUrl
                )
                val response = apiService.upsertMyProfile(request)
                if (response.isSuccessful && response.body() != null) {
                    _userProfile.value = response.body()!!.profile
                    onSuccess()
                } else {
                    val errMsg = response.errorBody()?.string() ?: "Failed to update profile"
                    onError(errMsg)
                }
            } catch (e: Exception) {
                onError(e.message ?: "Network error occurred")
            } finally {
                isLoading.value = false
            }
        }
    }
}
