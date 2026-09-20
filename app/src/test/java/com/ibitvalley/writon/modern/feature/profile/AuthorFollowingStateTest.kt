package com.ibitvalley.writon.modern.feature.profile

import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.AuthorDto
import com.ibitvalley.writon.modern.core.network.model.PaginationDto
import com.ibitvalley.writon.modern.core.network.model.UsersResponseDto
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import retrofit2.Response

class AuthorFollowingStateTest {
    private val api = mock<WritOnApiService>()

    @Test
    fun `finds a followed writer on a later page`() = runTest {
        whenever(api.getMyFollowing(page = 1, limit = 50)).thenReturn(page(listOf("other"), 1, true))
        whenever(api.getMyFollowing(page = 2, limit = 50)).thenReturn(page(listOf("target"), 2, false))

        assertEquals(true, loadFollowingState(api, "target"))
    }

    @Test
    fun `returns false only after the final successful page`() = runTest {
        whenever(api.getMyFollowing(page = 1, limit = 50)).thenReturn(page(listOf("other"), 1, false))

        assertEquals(false, loadFollowingState(api, "target"))
    }

    @Test
    fun `preserves the existing hint when relationship lookup fails`() = runTest {
        whenever(api.getMyFollowing(page = 1, limit = 50)).thenReturn(Response.error(503, "Unavailable".toResponseBody(null)))

        assertEquals(null, loadFollowingState(api, "target"))
    }

    private fun page(ids: List<String>, page: Int, hasMore: Boolean) = Response.success(
        UsersResponseDto(
            users = ids.map { AuthorDto(id = it, fullName = it) },
            pagination = PaginationDto(page = page, limit = 50, hasMore = hasMore)
        )
    )
}
