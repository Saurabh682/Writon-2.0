package com.ibitvalley.writon.modern.core.database

import com.ibitvalley.writon.modern.core.database.dao.IncomingStoryDao
import com.ibitvalley.writon.modern.core.database.dao.IncomingStoryEntity
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import org.mockito.Answers.CALLS_REAL_METHODS
import org.mockito.kotlin.*

class IncomingStoryDaoTest {
    private val dao: IncomingStoryDao = mock(defaultAnswer = CALLS_REAL_METHODS)

    @Test
    fun `repeated delivery preserves canonical identity and read status`() = runTest {
        val stored = IncomingStoryEntity("device", "id", "slug", "Title", "shared", 1, 2)
        whenever(dao.find("device", "slug")).thenReturn(stored)
        dao.capture("device", "slug", "push", now = 3)
        val entry = argumentCaptor<IncomingStoryEntity>()
        verify(dao).upsert(entry.capture())
        assertEquals("id", entry.firstValue.storyKey)
        assertEquals(2L, entry.firstValue.readAt)
        assertEquals(3L, entry.firstValue.receivedAt)
    }

    @Test
    fun `canonical reconciliation merges aliases without losing newest delivery`() = runTest {
        val slug = IncomingStoryEntity("device", "slug", source = "shared", receivedAt = 1)
        val id = IncomingStoryEntity("device", "id", source = "push", receivedAt = 3)
        whenever(dao.find("device", "slug")).thenReturn(slug)
        whenever(dao.find("device", "id")).thenReturn(id)
        dao.resolve("account-a", "slug", "id", "slug", "Title", now = 4)
        val entry = argumentCaptor<IncomingStoryEntity>()
        verify(dao).upsert(entry.capture())
        assertEquals("id", entry.firstValue.storyKey)
        assertEquals("slug", entry.firstValue.slug)
        assertEquals("Title", entry.firstValue.title)
        assertEquals(3L, entry.firstValue.receivedAt)
        assertEquals(4L, entry.firstValue.readAt)
        verify(dao).dismiss("device", "slug")
        verify(dao).dismiss("device", "id")
        verify(dao, never()).find(eq("account-b"), any())
    }

    @Test
    fun `normal story viewing and blank deliveries do not populate inbox`() = runTest {
        dao.capture("device", " ", "shared")
        dao.resolve("device", "slug", "id", "slug", "Title")
        verify(dao, never()).upsert(any())
        verify(dao, never()).dismiss(any(), any())
    }
}
