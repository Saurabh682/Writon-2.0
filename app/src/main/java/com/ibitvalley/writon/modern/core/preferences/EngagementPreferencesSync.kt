package com.ibitvalley.writon.modern.core.preferences

import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.EngagementPreferencesDto
import com.ibitvalley.writon.modern.core.network.model.UpdateEngagementPreferencesRequestDto
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class EngagementPreferencesSync(
    private val apiService: WritOnApiService,
    private val userPreferences: UserPreferences,
) {
    suspend fun hydrate(accountId: String): Result<EngagementPreferences> = runCatching {
        if (userPreferences.hasPendingEngagementSync(accountId)) {
            return@runCatching push(accountId, userPreferences.engagementPreferences(accountId)).getOrThrow()
        }
        val response = apiService.getMyEngagementPreferences()
        check(response.isSuccessful) { "Engagement preferences could not be loaded (${response.code()})." }
        val remote = requireNotNull(response.body()).toLocal()
        check(userPreferences.saveEngagementPreferences(accountId, remote, pendingSync = false)) {
            "Engagement preferences could not be saved locally."
        }
        remote
    }

    suspend fun save(accountId: String?, preferences: EngagementPreferences): Result<EngagementPreferences> {
        val normalized = preferences.normalized()
        val stored = userPreferences.saveEngagementPreferences(
            accountId,
            normalized,
            pendingSync = accountId != null,
        )
        if (!stored) return Result.failure(IllegalStateException("Engagement preferences could not be saved locally."))
        return if (accountId == null) Result.success(normalized) else push(accountId, normalized)
    }

    private suspend fun push(accountId: String, preferences: EngagementPreferences): Result<EngagementPreferences> = runCatching {
        val response = apiService.updateMyEngagementPreferences(preferences.toRequest())
        check(response.isSuccessful) { "Engagement preferences could not be synchronized (${response.code()})." }
        val saved = requireNotNull(response.body()).toLocal()
        check(userPreferences.saveEngagementPreferences(accountId, saved, pendingSync = false)) {
            "Synchronized engagement preferences could not be saved locally."
        }
        saved
    }
}

private fun EngagementPreferences.toRequest() = UpdateEngagementPreferencesRequestDto(
    primaryIntent = primaryIntent,
    onboardingVersion = onboardingVersion,
    onboardingCompletedAt = onboardingCompletedAtMillis?.let(::formatUtcTimestamp),
    preferenceCardState = preferenceCardState,
)

private fun EngagementPreferencesDto.toLocal() = EngagementPreferences(
    primaryIntent = primaryIntent,
    onboardingVersion = onboardingVersion,
    onboardingCompletedAtMillis = onboardingCompletedAt?.let(::parseUtcTimestamp),
    preferenceCardState = preferenceCardState,
).normalized()

private fun formatUtcTimestamp(value: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(value))

private fun parseUtcTimestamp(value: String): Long? {
    val normalized = value.replace(Regex("([+-]\\d{2}):(\\d{2})$"), "$1$2")
    val patterns = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX")
    return patterns.firstNotNullOfOrNull { pattern ->
        runCatching {
            SimpleDateFormat(pattern, Locale.US).apply {
                isLenient = false
                timeZone = TimeZone.getTimeZone("UTC")
            }.parse(normalized)?.time
        }.getOrNull()
    }
}
