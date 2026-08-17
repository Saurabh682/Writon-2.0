package com.ibitvalley.writon.modern.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.database.model.UserEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val penName: String,
    private val apiService: WritOnApiService,
    private val userDao: UserDao
) : ViewModel() {

    val userProfile: StateFlow<UserEntity?> = userDao.getUserById(penName)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    val isLoading = MutableStateFlow(false)

    init {
        loadUserProfile()
    }

    fun loadUserProfile() {
        viewModelScope.launch {
            isLoading.value = true
            try {
                val response = apiService.getUserProfile(penName)
                if (response.isSuccessful && response.body() != null) {
                    val authorDto = response.body()!!.user
                    val entity = UserEntity(
                        id = authorDto.id,
                        penName = authorDto.penName,
                        fullName = authorDto.fullName,
                        email = null,
                        avatarUrl = authorDto.avatarUrl,
                        bio = authorDto.bio,
                        quoteOfDay = authorDto.quoteOfDay,
                        followersCnt = authorDto.followersCnt ?: 0,
                        followingCnt = authorDto.followingCnt ?: 0
                    )
                    userDao.insertUser(entity)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading.value = false
            }
        }
    }
}
