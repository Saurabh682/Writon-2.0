package com.ibitvalley.writon.modern.core.config

import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WritOnRemoteConfigTest {

    // Regression: an out-of-range cloud value could request an unbounded Explore page.
    @Test
    fun exploreLimit_isBoundedForSafeQueries() {
        assertEquals(1, normalizeExploreTrendingLimit(-5))
        assertEquals(10, normalizeExploreTrendingLimit(10))
        assertEquals(20, normalizeExploreTrendingLimit(500))
    }

    // Regression: a failed fetch was reported as a successful cached-config outcome.
    @Test
    fun fetchOutcome_distinguishesUpdatedCachedAndFailure() {
        assertEquals(RemoteConfigFetchStatus.Updated, resolveRemoteConfigFetchStatus(true, true))
        assertEquals(RemoteConfigFetchStatus.Cached, resolveRemoteConfigFetchStatus(true, false))
        assertEquals(RemoteConfigFetchStatus.Failure, resolveRemoteConfigFetchStatus(false, false))
    }

    @Test
    fun booleanFlag_usesFallbackWhenRemoteConfigHasNoValue_butPreservesExplicitOverrides() {
        assertTrue(
            resolveRemoteConfigBoolean(
                FirebaseRemoteConfig.VALUE_SOURCE_STATIC,
                value = false,
                default = true
            )
        )
        assertFalse(
            resolveRemoteConfigBoolean(
                FirebaseRemoteConfig.VALUE_SOURCE_REMOTE,
                value = false,
                default = true
            )
        )
        assertTrue(
            resolveRemoteConfigBoolean(
                FirebaseRemoteConfig.VALUE_SOURCE_DEFAULT,
                value = true,
                default = false
            )
        )
    }

    @Test
    fun defaultFallbackValues_areSafeWhenOfflineOrUninitialized() {
        // When Firebase is not initialized (unit test environment),
        // safe hardcoded in-app defaults must always be returned.
        assertTrue(WritOnRemoteConfig.isFeatureUpdateIndicatorEnabled)
        assertTrue(WritOnRemoteConfig.isDailyDigestNotificationEnabled)
        assertTrue(WritOnRemoteConfig.isEditorAiAssistEnabled)
        assertTrue(WritOnRemoteConfig.isExploreCuratedBannerEnabled)
        assertEquals(10L, WritOnRemoteConfig.exploreTrendingStoriesLimit)
        assertTrue(WritOnRemoteConfig.isQuoteCardShareEnabled)
        assertFalse(WritOnRemoteConfig.features.value.personalizedHomeFeedEnabled)
        assertFalse(WritOnRemoteConfig.features.value.isFetchComplete)
    }
}
