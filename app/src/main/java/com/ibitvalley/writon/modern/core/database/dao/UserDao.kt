package com.ibitvalley.writon.modern.core.database.dao

import androidx.room.*
import com.ibitvalley.writon.modern.core.database.model.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {

    @Query("SELECT * FROM users WHERE id = :id OR penName = :id LIMIT 1")
    fun getUserById(id: String): Flow<UserEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Query("DELETE FROM users")
    suspend fun clearAll()
}
