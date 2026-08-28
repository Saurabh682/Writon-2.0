package com.ibitvalley.writon.modern.core.di

import android.content.Context
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.data.repository.DraftRepository
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.MediaRepository

/**
 * Small, explicit dependency container. It keeps Compose routes independent of
 * construction details without forcing a DI framework into the release branch.
 */
class AppContainer(context: Context) {
    val apiService = NetworkClient.apiService
    val database: WritOnDatabase = WritOnDatabase.getDatabase(context)
    val userPreferences = UserPreferences(context)
    val postRepository = PostRepository(
        apiService = apiService,
        postDao = database.postDao(),
        commentDao = database.commentDao(),
        outboxDao = database.outboxDao()
    )
    val draftRepository = DraftRepository(
        apiService = apiService,
        draftDao = database.draftDao(),
        outboxDao = database.outboxDao()
    )
    val mediaRepository = MediaRepository(apiService)
}
