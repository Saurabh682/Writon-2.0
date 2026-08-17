package com.ibitvalley.writon.modern.core.database.dao

import androidx.room.*
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity

@Dao
interface OutboxDao {

    @Query("SELECT * FROM outbox_mutations WHERE isSynced = 0 ORDER BY timestamp ASC")
    suspend fun getPendingMutations(): List<OutboxMutationEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueueMutation(mutation: OutboxMutationEntity): Long

    @Query("UPDATE outbox_mutations SET isSynced = 1 WHERE mutationId = :id")
    suspend fun markMutationSynced(id: Long)

    @Query("DELETE FROM outbox_mutations WHERE isSynced = 1")
    suspend fun clearSyncedMutations()
}
