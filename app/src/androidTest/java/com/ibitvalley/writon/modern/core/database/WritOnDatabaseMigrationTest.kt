package com.ibitvalley.writon.modern.core.database

import android.content.Context
import androidx.room.Room
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.sqlite.db.SupportSQLiteOpenHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.platform.app.InstrumentationRegistry
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class WritOnDatabaseMigrationTest {
    private lateinit var context: Context
    private val databaseName = "writon-migration-test.db"

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        context.deleteDatabase(databaseName)
    }

    @After
    fun tearDown() {
        context.deleteDatabase(databaseName)
    }

    @Test
    fun migrationFrom1To2PreservesCachedContentAndCreatesDrafts() {
        createVersionOneDatabase().use { helper ->
            helper.writableDatabase.execSQL(
                """INSERT INTO posts (
                    id, authorId, authorName, authorPenName, authorAvatarUrl, title, slug,
                    summary, content, category, coverImage, readingTimeMin, likesCnt,
                    commentsCnt, bookmarksCnt, isLiked, isBookmarked, createdAt
                ) VALUES (
                    'legacy-post', 'legacy-author', 'Legacy Writer', 'legacy_writer', NULL,
                    'Saved before upgrade', 'saved-before-upgrade', NULL, 'Body', 'Essays',
                    NULL, 1, 0, 0, 0, 0, 0, '2026-08-28T00:00:00Z'
                )""".trimIndent()
            )
        }

        val migrated = Room.databaseBuilder(context, WritOnDatabase::class.java, databaseName)
            .addMigrations(WritOnDatabase.MIGRATION_1_2)
            .allowMainThreadQueries()
            .build()
        try {
                migrated.openHelper.writableDatabase.query(
                    "SELECT title FROM posts WHERE id = 'legacy-post'"
                ).use { cursor ->
                    assertTrue(cursor.moveToFirst())
                    assertEquals("Saved before upgrade", cursor.getString(0))
                }

                migrated.openHelper.writableDatabase.query("PRAGMA table_info(drafts)").use { cursor ->
                    val columns = buildSet {
                        while (cursor.moveToNext()) add(cursor.getString(cursor.getColumnIndexOrThrow("name")))
                    }
                    assertEquals(
                        setOf(
                            "localId", "remotePostId", "title", "content", "summary", "category",
                            "tagsJson", "coverImage", "visibility", "createdAt", "updatedAt",
                            "syncState", "lastError"
                        ),
                        columns
                    )
                }
        } finally {
            migrated.close()
        }
    }

    @Test
    fun enqueueLatestMutationKeepsOnePendingRetryPerDraftOperation() = runBlocking {
        val database = Room.inMemoryDatabaseBuilder(context, WritOnDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        try {
                val first = OutboxMutationEntity(
                    mutationType = "UPSERT_DRAFT",
                    targetId = "draft-1",
                    payloadJson = "{\"title\":\"first\"}"
                )
                val latest = first.copy(payloadJson = "{\"title\":\"latest\"}")

                database.outboxDao().enqueueLatestMutation(first)
                database.outboxDao().enqueueLatestMutation(latest)

                val pending = database.outboxDao().getPendingMutations()
                assertEquals(1, pending.size)
                assertEquals(latest.payloadJson, pending.single().payloadJson)
        } finally {
            database.close()
        }
    }

    private fun createVersionOneDatabase(): SupportSQLiteOpenHelper {
        return FrameworkSQLiteOpenHelperFactory().create(
            SupportSQLiteOpenHelper.Configuration.builder(context)
                .name(databaseName)
                .callback(object : SupportSQLiteOpenHelper.Callback(1) {
                    override fun onCreate(db: SupportSQLiteDatabase) {
                        db.execSQL("CREATE TABLE IF NOT EXISTS posts (id TEXT NOT NULL PRIMARY KEY, authorId TEXT NOT NULL, authorName TEXT NOT NULL, authorPenName TEXT NOT NULL, authorAvatarUrl TEXT, title TEXT NOT NULL, slug TEXT NOT NULL, summary TEXT, content TEXT NOT NULL, category TEXT NOT NULL, coverImage TEXT, readingTimeMin INTEGER NOT NULL, likesCnt INTEGER NOT NULL, commentsCnt INTEGER NOT NULL, bookmarksCnt INTEGER NOT NULL, isLiked INTEGER NOT NULL, isBookmarked INTEGER NOT NULL, createdAt TEXT NOT NULL)")
                        db.execSQL("CREATE TABLE IF NOT EXISTS users (id TEXT NOT NULL PRIMARY KEY, penName TEXT NOT NULL, fullName TEXT NOT NULL, email TEXT, avatarUrl TEXT, bio TEXT, quoteOfDay TEXT, followersCnt INTEGER NOT NULL, followingCnt INTEGER NOT NULL)")
                        db.execSQL("CREATE TABLE IF NOT EXISTS outbox_mutations (mutationId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, mutationType TEXT NOT NULL, targetId TEXT NOT NULL, payloadJson TEXT NOT NULL, timestamp INTEGER NOT NULL, isSynced INTEGER NOT NULL)")
                        db.execSQL("CREATE TABLE IF NOT EXISTS comments (id TEXT NOT NULL PRIMARY KEY, postId TEXT NOT NULL, authorId TEXT NOT NULL, authorName TEXT NOT NULL, authorAvatarUrl TEXT, content TEXT NOT NULL, createdAt TEXT NOT NULL, parentId TEXT)")
                    }

                    override fun onUpgrade(db: SupportSQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
                })
                .build()
        )
    }
}
