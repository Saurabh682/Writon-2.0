package com.ibitvalley.writon.modern.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.google.gson.JsonParser
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class OutboxSyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val db = WritOnDatabase.getDatabase(context)
    private val outboxDao = db.outboxDao()
    private val apiService = NetworkClient.apiService
    private val gson = Gson()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val pendingMutations = outboxDao.getPendingMutations()
        if (pendingMutations.isEmpty()) {
            return@withContext Result.success()
        }

        var allSuccessful = true

        for (mutation in pendingMutations) {
            try {
                when (mutation.mutationType) {
                    "LIKE" -> {
                        val response = apiService.toggleLike(mutation.targetId)
                        if (response.isSuccessful) {
                            outboxDao.markMutationSynced(mutation.mutationId)
                        } else {
                            allSuccessful = false
                        }
                    }
                    "BOOKMARK" -> {
                        val response = apiService.toggleBookmark(mutation.targetId)
                        if (response.isSuccessful) {
                            outboxDao.markMutationSynced(mutation.mutationId)
                        } else {
                            allSuccessful = false
                        }
                    }
                    "CREATE_POST" -> {
                        val postRequest = gson.fromJson(mutation.payloadJson, CreatePostRequestDto::class.java)
                        val response = apiService.createPost(postRequest)
                        if (response.isSuccessful) {
                            outboxDao.markMutationSynced(mutation.mutationId)
                        } else {
                            allSuccessful = false
                        }
                    }
                    "ADD_COMMENT" -> {
                        val content = JsonParser.parseString(mutation.payloadJson)
                            .asJsonObject
                            .get("content")
                            ?.asString
                            ?.trim()
                            .orEmpty()
                        if (content.isBlank()) {
                            allSuccessful = false
                            continue
                        }
                        val response = apiService.addComment(mutation.targetId, mapOf("content" to content))
                        if (response.isSuccessful) {
                            outboxDao.markMutationSynced(mutation.mutationId)
                        } else {
                            allSuccessful = false
                        }
                    }
                    else -> allSuccessful = false
                }
            } catch (e: Exception) {
                e.printStackTrace()
                allSuccessful = false
            }
        }

        outboxDao.clearSyncedMutations()

        if (allSuccessful) Result.success() else Result.retry()
    }
}
