package com.ibitvalley.writon.modern.core.database.dao

import androidx.room.*
import kotlinx.coroutines.flow.Flow

/** Device-local links, not a replacement for the authenticated server activity stream. */
@Entity(tableName = "incoming_stories", primaryKeys = ["ownerKey", "storyKey"])
data class IncomingStoryEntity(
    val ownerKey: String,
    val storyKey: String,
    val slug: String? = null,
    val title: String? = null,
    val source: String,
    val receivedAt: Long,
    val readAt: Long? = null,
)

@Dao
abstract class IncomingStoryDao {
    @Query("SELECT * FROM incoming_stories WHERE ownerKey = 'device' OR ownerKey = :owner ORDER BY receivedAt DESC")
    abstract fun observe(owner: String): Flow<List<IncomingStoryEntity>>

    @Query("SELECT * FROM incoming_stories WHERE ownerKey = :owner AND (storyKey = :key OR slug = :key) LIMIT 1")
    abstract suspend fun find(owner: String, key: String): IncomingStoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun upsert(entry: IncomingStoryEntity)

    @Query("DELETE FROM incoming_stories WHERE ownerKey = :owner AND storyKey = :key")
    abstract suspend fun dismiss(owner: String, key: String)

    @Query("UPDATE incoming_stories SET readAt = COALESCE(readAt, :now) WHERE ownerKey = :owner AND storyKey = :key")
    abstract suspend fun markRead(owner: String, key: String, now: Long = System.currentTimeMillis())

    @Transaction
    open suspend fun capture(owner: String, key: String, source: String, title: String? = null, now: Long = System.currentTimeMillis()) {
        if (key.isBlank()) return
        val existing = find(owner, key)
        upsert(existing?.copy(receivedAt = now, title = title?.takeIf(String::isNotBlank) ?: existing.title)
            ?: IncomingStoryEntity(owner, key, title = title?.takeIf(String::isNotBlank), source = source, receivedAt = now))
    }

    /** Merge only already-captured links; ordinary browsing must never create inbox items. */
    @Transaction
    open suspend fun resolve(owner: String, key: String, canonicalId: String, slug: String, title: String, now: Long = System.currentTimeMillis()) {
        for (scope in setOf("device", owner)) {
            val entries = listOfNotNull(find(scope, key), find(scope, canonicalId), find(scope, slug))
                .distinctBy { it.storyKey }
            if (entries.isEmpty()) continue
            val latest = entries.maxBy { it.receivedAt }
            entries.forEach { dismiss(scope, it.storyKey) }
            upsert(latest.copy(storyKey = canonicalId, slug = slug, title = title,
                readAt = entries.mapNotNull { it.readAt }.minOrNull() ?: now))
        }
    }
}
