package com.ibitvalley.writon.modern.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.MyProfileDto
import com.ibitvalley.writon.modern.core.network.model.PostDto

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val apiService: WritOnApiService,
    @Suppress("unused") private val userDao: UserDao
) : ViewModel() {

    private val _userProfile = MutableStateFlow<MyProfileDto?>(null)
    val userProfile: StateFlow<MyProfileDto?> = _userProfile

    private val _userStories = MutableStateFlow<List<PostDto>>(emptyList())
    val userStories: StateFlow<List<PostDto>> = _userStories

    private val _highlights = MutableStateFlow<List<PostDto>>(emptyList())
    val highlights: StateFlow<List<PostDto>> = _highlights

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

                    val authorQuery = profile.penName.ifBlank { profile.fullName }
                    val postsResponse = apiService.getPosts(searchQuery = authorQuery.ifBlank { null }, limit = 20)
                    if (postsResponse.isSuccessful && postsResponse.body() != null) {
                        val posts = postsResponse.body()!!.posts
                        _userStories.value = posts
                        _highlights.value = posts.sortedByDescending { it.likesCnt }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading.value = false
            }
        }
    }
}
