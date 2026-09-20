package com.ibitvalley.writon.modern.feature.profile

import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.MyProfileDto
import com.ibitvalley.writon.modern.core.network.model.MyProfileResponseDto
import com.ibitvalley.writon.modern.data.repository.MediaRepository
import com.ibitvalley.writon.modern.data.repository.PostRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.test.resetMain
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class ProfileViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val api: WritOnApiService = mock()

    @Before fun setup() = Dispatchers.setMain(dispatcher)
    @After fun teardown() = Dispatchers.resetMain()

    @Test fun `failed initial profile load exposes retry and successful retry clears it`() = runTest(dispatcher) {
        whenever(api.getMyProfile()).thenReturn(Response.error(503, "offline".toResponseBody()))
        val model = ProfileViewModel(api, mock<UserDao>(), mock<MediaRepository>(), mock<PostRepository>())

        advanceUntilIdle()
        assertTrue(model.loadFailed.value)

        val profile = MyProfileDto(
            id = "writer-1", email = null, penName = "writer", fullName = "Writer",
            bio = null, avatarUrl = null, location = null, joinedAt = "2026-09-07",
            followersCount = 0, followingCount = 0
        )
        whenever(api.getMyProfile()).thenReturn(Response.success(MyProfileResponseDto(profile)))
        whenever(api.getPosts(anyOrNull(), anyOrNull(), eq("writer-1"), eq("writer"), anyOrNull(), eq(1), eq(50)))
            .thenReturn(Response.error(503, "offline".toResponseBody()))

        model.loadUserProfile()
        advanceUntilIdle()

        assertFalse(model.loadFailed.value)
        assertNotNull(model.userProfile.value)
    }

    @Test fun `text-only profile edit does not resend a legacy avatar URL`() = runTest(dispatcher) {
        val profile = MyProfileDto(
            id = "writer-1", email = null, penName = "frozen_song", fullName = "Kumar Saurabh",
            bio = "Old bio", avatarUrl = "https://legacy.example/avatar.jpg", location = "India",
            joinedAt = "2017-01-09", followersCount = 27, followingCount = 45
        )
        whenever(api.getMyProfile()).thenReturn(Response.success(MyProfileResponseDto(profile)))
        whenever(api.getPosts(anyOrNull(), anyOrNull(), eq("writer-1"), eq("frozen_song"), anyOrNull(), eq(1), eq(50)))
            .thenReturn(Response.error(503, "offline".toResponseBody()))
        whenever(api.upsertMyProfile(org.mockito.kotlin.any())).thenReturn(
            Response.success(MyProfileResponseDto(profile.copy(bio = "New bio")))
        )
        val model = ProfileViewModel(api, mock<UserDao>(), mock<MediaRepository>(), mock<PostRepository>())
        advanceUntilIdle()

        model.updateProfile("Kumar Saurabh", "frozen_song", "New bio", "India")
        advanceUntilIdle()

        val request = argumentCaptor<com.ibitvalley.writon.modern.core.network.model.UpsertMyProfileRequestDto>()
        verify(api).upsertMyProfile(request.capture())
        assertTrue(request.firstValue.avatarUrl == null)
    }

    @Test fun `profile update error preserves the actionable field detail`() {
        val message = profileUpdateFailureMessage(
            """{"error":"Invalid profile data","details":{"avatarUrl":["Use a profile photo uploaded securely through WritOn."]}}"""
        )

        assertEquals("Use a profile photo uploaded securely through WritOn.", message)
    }
}
