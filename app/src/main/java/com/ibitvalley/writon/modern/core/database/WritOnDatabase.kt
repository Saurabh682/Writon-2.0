package com.ibitvalley.writon.modern.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.ibitvalley.writon.modern.core.database.dao.CommentDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.database.model.UserEntity

@Database(
    entities = [PostEntity::class, UserEntity::class, OutboxMutationEntity::class, CommentEntity::class],
    version = 1,
    exportSchema = false
)
abstract class WritOnDatabase : RoomDatabase() {

    abstract fun postDao(): PostDao
    abstract fun userDao(): UserDao
    abstract fun outboxDao(): OutboxDao
    abstract fun commentDao(): CommentDao

    companion object {
        @Volatile
        private var INSTANCE: WritOnDatabase? = null

        fun getDatabase(context: Context): WritOnDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    WritOnDatabase::class.java,
                    "writon_modern.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
