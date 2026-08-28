package com.ibitvalley.writon.modern.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.ibitvalley.writon.modern.core.database.dao.CommentDao
import com.ibitvalley.writon.modern.core.database.dao.DraftDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.database.model.UserEntity

@Database(
    entities = [PostEntity::class, UserEntity::class, OutboxMutationEntity::class, CommentEntity::class, DraftEntity::class],
    version = 2,
    exportSchema = true
)
abstract class WritOnDatabase : RoomDatabase() {

    abstract fun postDao(): PostDao
    abstract fun userDao(): UserDao
    abstract fun outboxDao(): OutboxDao
    abstract fun commentDao(): CommentDao
    abstract fun draftDao(): DraftDao

    companion object {
        @Volatile
        private var INSTANCE: WritOnDatabase? = null

        fun getDatabase(context: Context): WritOnDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    WritOnDatabase::class.java,
                    "writon_modern.db"
                )
                    .addMigrations(MIGRATION_1_2)
                    .fallbackToDestructiveMigrationOnDowngrade()
                    .build()
                INSTANCE = instance
                instance
            }
        }

        internal val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL(
                    """CREATE TABLE IF NOT EXISTS drafts (
                        localId TEXT NOT NULL PRIMARY KEY,
                        remotePostId TEXT,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        summary TEXT NOT NULL,
                        category TEXT NOT NULL,
                        tagsJson TEXT NOT NULL,
                        coverImage TEXT,
                        visibility TEXT NOT NULL,
                        createdAt INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL,
                        syncState TEXT NOT NULL,
                        lastError TEXT
                    )""".trimIndent()
                )
            }
        }
    }
}

