package com.ibitvalley.writon.modern.feature.search

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.PostDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SearchViewModel(
    private val apiService: WritOnApiService
) : ViewModel() {
    var results by mutableStateOf<List<PostDto>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    private var searchJob: Job? = null

    fun search(query: String) {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            isLoading = true
            delay(if (query.isBlank()) 0 else 250)
            runCatching {
                withContext(Dispatchers.IO) {
                    apiService.getPosts(searchQuery = query.takeIf { it.isNotBlank() })
                }
            }.onSuccess { response ->
                if (response.isSuccessful) results = response.body()?.posts.orEmpty()
                else results = emptyList()
            }.onFailure { results = emptyList() }
            isLoading = false
        }
    }
}
