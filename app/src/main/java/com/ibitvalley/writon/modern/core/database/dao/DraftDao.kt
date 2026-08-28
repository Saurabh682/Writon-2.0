package com.ibitvalley.writon.modern.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DraftDao {
    @Query("SELECT * FROM drafts ORDER BY updatedAt DESC LIMIT 1")
    fun observeLatest(): Flow<DraftEntity?>

    @Query("SELECT * FROM drafts WHERE localId = :localId LIMIT 1")
    suspend fun getById(localId: String): DraftEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(draft: DraftEntity)

    @Query("UPDATE drafts SET remotePostId = :remotePostId, syncState = :syncState, lastError = NULL, updatedAt = :updatedAt WHERE localId = :localId")
    suspend fun markSynced(localId: String, remotePostId: String, syncState: String, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE drafts SET syncState = 'failed', lastError = :message WHERE localId = :localId")
    suspend fun markFailed(localId: String, message: String)

    @Query("DELETE FROM drafts WHERE localId = :localId")
    suspend fun deleteById(localId: String)
}
