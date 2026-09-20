package com.ibitvalley.writon.modern.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DraftDao {
    @Query("SELECT * FROM drafts WHERE ownerKey = :ownerKey AND (trim(title, ' ' || char(9) || char(10) || char(13)) != '' OR trim(content, ' ' || char(9) || char(10) || char(13)) != '') ORDER BY updatedAt DESC LIMIT 1")
    fun observeLatest(ownerKey: String): Flow<DraftEntity?>

    @Query("SELECT * FROM drafts WHERE localId = :localId AND ownerKey = :ownerKey LIMIT 1")
    suspend fun getById(localId: String, ownerKey: String): DraftEntity?

    @Query("SELECT * FROM drafts WHERE ownerKey = 'legacy_unclaimed' ORDER BY updatedAt DESC LIMIT 1")
    suspend fun getLatestLegacy(): DraftEntity?

    @Query("UPDATE drafts SET ownerKey = :ownerKey WHERE localId = :localId AND ownerKey = 'legacy_unclaimed'")
    suspend fun claimLegacy(localId: String, ownerKey: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(draft: DraftEntity)

    @Query("UPDATE drafts SET remotePostId = :remotePostId, syncState = :syncState, lastError = NULL, updatedAt = :updatedAt WHERE localId = :localId AND ownerKey = :ownerKey")
    suspend fun markSynced(localId: String, ownerKey: String, remotePostId: String, syncState: String, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE drafts SET syncState = 'failed', lastError = :message WHERE localId = :localId AND ownerKey = :ownerKey")
    suspend fun markFailed(localId: String, ownerKey: String, message: String)

    @Query("DELETE FROM drafts WHERE localId = :localId AND ownerKey = :ownerKey")
    suspend fun deleteById(localId: String, ownerKey: String)
}
