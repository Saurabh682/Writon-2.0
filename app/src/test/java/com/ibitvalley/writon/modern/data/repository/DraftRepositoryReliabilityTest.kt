package com.ibitvalley.writon.modern.data.repository

import com.ibitvalley.writon.modern.core.database.dao.DraftDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Test
import org.junit.Assert.assertTrue
import org.junit.Assert.assertEquals
import org.mockito.kotlin.any
import org.mockito.kotlin.inOrder
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import retrofit2.Response

class DraftRepositoryReliabilityTest {
    private val api: WritOnApiService = mock()
    private val draftDao: DraftDao = mock()
    private val outbox: OutboxDao = mock()
    private val repository = DraftRepository(api, draftDao, outbox, accountIdProvider = { "account-a" })

    @Test
    fun `queued publish supersedes an older autosave for the same draft`() = runTest {
        whenever(api.createPost(any()))
            .thenReturn(Response.error(503, "offline".toResponseBody("text/plain".toMediaType())))
        val draft = DraftEntity(
            localId = "draft-1",
            ownerKey = "account-a",
            title = "A title",
            content = "A complete story",
            createdAt = 1L,
            updatedAt = 2L
        )

        val result = repository.publish(draft)

        assertTrue(result.exceptionOrNull() is QueuedPublishException)
        inOrder(outbox) {
            verify(outbox).deletePendingMutation("UPSERT_DRAFT", "draft-1")
            verify(outbox).enqueueLatestMutation(any<OutboxMutationEntity>())
        }
    }

    @Test
    fun `writer can cancel a queued publication without deleting the draft`() = runTest {
        val draft = DraftEntity(localId = "draft-1", ownerKey = "account-a", content = "Private work")

        assertTrue(repository.cancelQueuedPublish(draft).isSuccess)

        org.mockito.kotlin.verify(outbox).deletePendingMutation("PUBLISH_DRAFT", "draft-1")
        org.mockito.kotlin.verifyNoInteractions(draftDao)
    }

    @Test
    fun `draft from another account is never uploaded`() = runTest {
        val result = repository.syncDraft(
            DraftEntity(localId = "draft-b", ownerKey = "account-b", content = "Private draft")
        )

        assertTrue(result.exceptionOrNull() is SecurityException)
        org.mockito.kotlin.verifyNoInteractions(api)
    }

    @Test
    fun `legacy draft changes owner only after explicit claim`() = runTest {
        val legacy = DraftEntity(localId = "legacy-1", ownerKey = "legacy_unclaimed", content = "Older work")
        val claimed = legacy.copy(ownerKey = "account-a")
        whenever(draftDao.claimLegacy("legacy-1", "account-a")).thenReturn(1)
        whenever(draftDao.getById("legacy-1", "account-a")).thenReturn(claimed)

        assertEquals("account-a", repository.claimLegacyDraft("legacy-1")?.ownerKey)
    }
}
