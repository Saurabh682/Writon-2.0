package com.ibitvalley.writon.modern.feature.explore

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.PostDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ExploreViewModel(
    private val apiService: WritOnApiService
) : ViewModel() {
    var discoveries by mutableStateOf<List<PostDto>>(emptyList())
        private set
    var currentIndex by mutableIntStateOf(0)
        private set

    fun load() {
        if (discoveries.isNotEmpty()) return
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { apiService.getPosts(tab = "popular", limit = 20) }
            }.onSuccess { response ->
                if (response.isSuccessful) discoveries = response.body()?.posts.orEmpty()
            }
        }
    }

    fun next() {
        if (discoveries.isNotEmpty()) currentIndex = (currentIndex + 1) % discoveries.size
    }
}
