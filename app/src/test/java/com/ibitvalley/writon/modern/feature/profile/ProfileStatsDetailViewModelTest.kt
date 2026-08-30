package com.ibitvalley.writon.modern.feature.profile

import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.PaginationDto
import com.ibitvalley.writon.modern.core.network.model.PostsResponseDto
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import retrofit2.Response

class ProfileStatsDetailViewModelTest {
    @Test
    fun `zero received applauds completes loading with an empty result`() = runTest {
        val api = mock<WritOnApiService>()
        whenever(api.getMyReceivedApplauseStories(page = 1, limit = 50)).thenReturn(
            Response.success(
                PostsResponseDto(
                    posts = emptyList(),
                    pagination = PaginationDto(page = 1, limit = 50, hasMore = false),
                )
            )
        )

        val state = loadProfileStatsDetail(ProfileStatsDestination.Applauds, api)
        assertFalse(state.toString(), state.isLoading)
        assertTrue(state.toString(), state.posts.isEmpty())
        assertNull(state.toString(), state.errorMessage)
    }
}
