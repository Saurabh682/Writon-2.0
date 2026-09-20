package com.ibitvalley.writon.modern.feature.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.cancel

data class InterestsUiState(
    val selectedTopicIds: Set<String> = emptySet(),
    val availableTopics: List<InterestTopicOption> = InterestTopicCatalog.fallbackTopics,
    val isLoadingTopics: Boolean = false,
    val isSaving: Boolean = false,
    val hasSyncError: Boolean = false,
    val exceedsSyncLimit: Boolean = false,
)

/**
 * Keeps interests available immediately from the local cache, then reconciles
 * them with the signed-in writer's account. Visitors intentionally remain local.
 */
class InterestsViewModel(
    private val apiService: WritOnApiService,
    private val userPreferences: UserPreferences,
    private val accountId: String?,
    private val isCurrentAccount: () -> Boolean = { true },
) : ViewModel() {
    private var edited = false
    private var localTopicIds = InterestTopicCatalog.preserveSavedIds(userPreferences.interestChoices(accountId))
    private val _uiState = MutableStateFlow(
        InterestsUiState(
            selectedTopicIds = localTopicIds,
            availableTopics = userPreferences.cachedInterestCatalog
                ?.let(InterestTopicCatalog::fromServerNames) ?: InterestTopicCatalog.fallbackTopics,
        ),
    )
    val uiState: StateFlow<InterestsUiState> = _uiState

    init {
        refreshAvailableTopics()
        if (accountId != null) refreshFromAccount()
    }

    fun markEdited() { edited = true }

    /** Navigation owns this manually constructed ViewModel. */
    fun close() { viewModelScope.cancel() }

    private fun refreshAvailableTopics() {
        _uiState.value = _uiState.value.copy(isLoadingTopics = true)
        viewModelScope.launch {
            val serverNames = cancellableResult { apiService.getTags() }
                .getOrNull()
                ?.takeIf { it.isSuccessful }
                ?.body()
                ?.tags
                ?.map { it.name }
            if (serverNames != null) userPreferences.cachedInterestCatalog = serverNames
            _uiState.value = _uiState.value.copy(
                availableTopics = serverNames?.let(InterestTopicCatalog::fromServerNames)
                    ?: _uiState.value.availableTopics,
                isLoadingTopics = false,
            )
        }
    }

    private fun refreshFromAccount() {
        viewModelScope.launch {
            if (!isCurrentAccount()) return@launch
            cancellableResult { apiService.getMyInterests() }
                .getOrNull()
                ?.takeIf { it.isSuccessful }
                ?.body()
                ?.topicIds
                ?.let(InterestTopicCatalog::preserveSavedIds)
                ?.let { remoteIds ->
                    if (!edited && isCurrentAccount() && !userPreferences.hasPendingInterestSync(accountId)) {
                        localTopicIds = remoteIds
                        userPreferences.saveInterestChoices(accountId, remoteIds, pendingSync = false)
                        _uiState.value = _uiState.value.copy(selectedTopicIds = remoteIds)
                    }
                }
        }
    }

    fun continueWithSavedChoices(onSaved: () -> Unit) {
        if (!isCurrentAccount()) return
        if (!recordOnboardingCompletion()) return
        userPreferences.isOnboardingComplete = true
        _uiState.value = _uiState.value.copy(hasSyncError = false)
        onSaved()
    }

    fun save(topicIds: Set<String>, onSaved: () -> Unit) {
        if (_uiState.value.isSaving || !isCurrentAccount()) return
        edited = true
        val normalized = InterestTopicCatalog.mergeSelection(
            localTopicIds, topicIds, _uiState.value.availableTopics.map { it.id }.toSet(),
        ).toSortedSet()
        localTopicIds = normalized
        userPreferences.saveInterestChoices(accountId, normalized, pendingSync = accountId != null)
        if (!recordOnboardingCompletion()) {
            _uiState.value = _uiState.value.copy(hasSyncError = true)
            return
        }
        userPreferences.isOnboardingComplete = true
        _uiState.value = _uiState.value.copy(
            selectedTopicIds = normalized,
            isSaving = false,
            hasSyncError = false,
            exceedsSyncLimit = false,
        )
        onSaved()
    }

    private fun recordOnboardingCompletion(): Boolean {
        val current = userPreferences.engagementPreferences(accountId)
        val saved = userPreferences.saveEngagementPreferences(
            accountId,
            current.copy(
                onboardingVersion = maxOf(current.onboardingVersion, 2),
                onboardingCompletedAtMillis = current.onboardingCompletedAtMillis ?: System.currentTimeMillis(),
                preferenceCardState = "completed",
            ),
            pendingSync = accountId != null,
        )
        return saved
    }

    private suspend fun <T> cancellableResult(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (cancelled: CancellationException) {
        throw cancelled
    } catch (failure: Exception) {
        Result.failure(failure)
    }
}
