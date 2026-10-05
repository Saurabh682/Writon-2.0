package com.ibitvalley.writon.modern.core.database

import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class IncomingStoryInboxTest {
    @Test
    fun duplicateAliasesReadDismissAndAccountIsolation() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val db = Room.inMemoryDatabaseBuilder(context, WritOnDatabase::class.java).build()
        try {
            val dao = db.incomingStoryDao()
            dao.capture("device", "a-story", "shared", now = 1)
            dao.capture("device", "canonical-id", "push", now = 2)
            dao.capture("device", "a-story", "shared", now = 3)
            dao.resolve("account-a", "a-story", "canonical-id", "a-story", "A story", now = 4)

            val guest = dao.observe("device").first().single()
            assertEquals("canonical-id", guest.storyKey)
            assertEquals("A story", guest.title)
            assertEquals(4L, guest.readAt)
            // Opening retains the item; receiving an alias again does not duplicate it.
            dao.markRead("device", "canonical-id", now = 5)
            dao.capture("device", "a-story", "shared", now = 6)
            assertEquals(1, dao.observe("device").first().size)

            dao.capture("account-a", "private-link", "push", now = 7)
            assertEquals(2, dao.observe("account-a").first().size)
            assertEquals(1, dao.observe("account-b").first().size)
            assertEquals(1, dao.observe("device").first().size)

            dao.dismiss("device", "canonical-id")
            assertTrue(dao.observe("device").first().isEmpty())
            assertEquals("private-link", dao.observe("account-a").first().single().storyKey)
        } finally {
            db.close()
        }
    }

    @Test
    fun capturedLinksSurviveDatabaseReopenAndOrdinaryBrowsingDoesNotCapture() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val name = "incoming-story-persistence-test.db"
        context.deleteDatabase(name)
        try {
            Room.databaseBuilder(context, WritOnDatabase::class.java, name).build().let { db ->
                try {
                    db.incomingStoryDao().capture("device", "offline-story", "shared", now = 1)
                    db.incomingStoryDao().resolve("device", "ordinary-story", "ordinary-id", "ordinary-story", "Not captured")
                } finally { db.close() }
            }
            Room.databaseBuilder(context, WritOnDatabase::class.java, name).build().let { db ->
                try { assertEquals("offline-story", db.incomingStoryDao().observe("device").first().single().storyKey) }
                finally { db.close() }
            }
        } finally { context.deleteDatabase(name) }
    }
}
