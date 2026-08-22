package com.ibitvalley.writon.modern.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.MyProfileDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val apiService: WritOnApiService,
    @Suppress("unused") private val userDao: UserDao
) : ViewModel() {

    private val _userProfile = MutableStateFlow<MyProfileDto?>(null)
    val userProfile: StateFlow<MyProfileDto?> = _userProfile

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
                    _userProfile.value = response.body()!!.profile
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading.value = false
            }
        }
    }
}
