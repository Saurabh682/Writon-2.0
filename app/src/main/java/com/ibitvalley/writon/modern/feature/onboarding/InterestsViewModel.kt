package com.ibitvalley.writon.modern.feature.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.UpdateInterestsRequestDto
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class InterestsUiState(
    val selectedTopicIds: Set<String> = emptySet(),
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
)

/**
 * Keeps interests available immediately from the local cache, then reconciles
 * them with the signed-in writer's account. Visitors intentionally remain local.
 */
class InterestsViewModel(
    private val apiService: WritOnApiService,
    private val userPreferences: UserPreferences,
    private val isSignedIn: Boolean,
) : ViewModel() {
    private val localTopicIds = normalizeTopicIds(userPreferences.favouriteCategories)
    private val _uiState = MutableStateFlow(
        InterestsUiState(selectedTopicIds = localTopicIds),
    )
    val uiState: StateFlow<InterestsUiState> = _uiState

    init {
        if (localTopicIds != userPreferences.favouriteCategories) {
            userPreferences.saveFavouriteCategories(localTopicIds)
        }
        if (isSignedIn) refreshFromAccount()
    }

    private fun refreshFromAccount() {
        viewModelScope.launch {
            runCatching { apiService.getMyInterests() }
                .getOrNull()
                ?.takeIf { it.isSuccessful }
                ?.body()
                ?.topicIds
                ?.toSet()
                ?.let { remoteIds ->
                    // Do not erase a choice made offline just because a new account
                    // has no server-side choices yet.
                    if (remoteIds.isNotEmpty() || _uiState.value.selectedTopicIds.isEmpty()) {
                        userPreferences.saveFavouriteCategories(remoteIds)
                        _uiState.value = _uiState.value.copy(selectedTopicIds = remoteIds)
                    }
                }
        }
    }

    fun continueWithSavedChoices(onSaved: () -> Unit) {
        _uiState.value = _uiState.value.copy(errorMessage = null)
        onSaved()
    }

    fun save(topicIds: Set<String>, onSaved: () -> Unit) {
        val normalized = topicIds.toSortedSet()
        userPreferences.saveFavouriteCategories(normalized)
        userPreferences.isOnboardingComplete = true
        _uiState.value = InterestsUiState(selectedTopicIds = normalized, isSaving = true)

        if (!isSignedIn) {
            _uiState.value = _uiState.value.copy(isSaving = false)
            onSaved()
            return
        }

        viewModelScope.launch {
            try {
                val response = apiService.updateMyInterests(UpdateInterestsRequestDto(normalized.toList()))
                if (response.isSuccessful && response.body() != null) {
                    val savedIds = response.body()!!.topicIds.toSet()
                    userPreferences.saveFavouriteCategories(savedIds)
                    _uiState.value = InterestsUiState(selectedTopicIds = savedIds)
                    onSaved()
                } else {
                    _uiState.value = InterestsUiState(
                        selectedTopicIds = normalized,
                        errorMessage = "Your choices are saved on this device. We could not update your account yet.",
                    )
                }
            } catch (_: Exception) {
                _uiState.value = InterestsUiState(
                    selectedTopicIds = normalized,
                    errorMessage = "Your choices are saved on this device. Check your connection and try again.",
                )
            }
        }
    }
}

private fun normalizeTopicIds(values: Set<String>): Set<String> {
    val legacyNames = mapOf(
        "poetry" to "poetry",
        "essays" to "essays",
        "philosophy" to "philosophy",
        "short stories" to "short_stories",
        "shayari" to "shayari",
        "journalism" to "journalism",
        "humour" to "humour",
        "life & wellness" to "life_wellness",
        "sci-fi & fantasy" to "sci_fi_fantasy",
        "travel" to "travel",
        "career & growth" to "career_growth",
        "more topics" to "more_topics",
    )
    return values.mapNotNull { value ->
        val normalized = value.trim().lowercase()
        legacyNames[normalized] ?: normalized.takeIf { it in legacyNames.values }
    }.toSet()
}
