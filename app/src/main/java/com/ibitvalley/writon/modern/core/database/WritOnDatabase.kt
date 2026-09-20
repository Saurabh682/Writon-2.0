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
    version = 6,
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
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6)
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

        internal val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL(
                    "ALTER TABLE posts ADD COLUMN languageCode TEXT NOT NULL DEFAULT 'und'"
                )
            }
        }

        internal val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Ownership of existing drafts cannot be proven. Retain them for a future
                // explicit recovery flow, but never expose or upload them under an account.
                database.execSQL(
                    "ALTER TABLE drafts ADD COLUMN ownerKey TEXT NOT NULL DEFAULT 'legacy_unclaimed'"
                )
                database.execSQL("CREATE INDEX IF NOT EXISTS index_drafts_ownerKey ON drafts(ownerKey)")
            }
        }

        internal val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE posts ADD COLUMN contentUpdatedAt TEXT")
                database.execSQL("ALTER TABLE comments ADD COLUMN updatedAt TEXT")
                database.execSQL("ALTER TABLE comments ADD COLUMN isMine INTEGER NOT NULL DEFAULT 0")
            }
        }

        internal val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE comments ADD COLUMN authorFoundingWriterNumber INTEGER")
                database.execSQL("ALTER TABLE comments ADD COLUMN authorEmailVerified INTEGER NOT NULL DEFAULT 0")
            }
        }
    }
}

