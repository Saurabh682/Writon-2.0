package com.ibitvalley.writon.modern.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.google.gson.JsonParser
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.UpdatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.AddCommentRequestDto
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
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
                        if (response.isSuccessful && response.body() != null) {
                            val postDto = response.body()!!.post
                            val postEntity = com.ibitvalley.writon.modern.core.database.model.PostEntity(
                                id = postDto.id,
                                authorId = postDto.author.id,
                                authorName = postDto.author.fullName,
                                authorPenName = postDto.author.penName,
                                authorAvatarUrl = postDto.author.avatarUrl,
                                title = postDto.title,
                                slug = postDto.slug,
                                summary = postDto.summary,
                                content = postDto.content,
                                category = postDto.category,
                                coverImage = postDto.coverImage,
                                readingTimeMin = postDto.readingTimeMin,
                                likesCnt = postDto.likesCnt,
                                commentsCnt = postDto.commentsCnt,
                                bookmarksCnt = postDto.bookmarksCnt,
                                isLiked = postDto.isLiked,
                                isBookmarked = postDto.isBookmarked,
                                createdAt = postDto.createdAt
                            )
                            db.postDao().deletePostById(mutation.targetId)
                            db.postDao().insertPost(postEntity)
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
                        val parentId = JsonParser.parseString(mutation.payloadJson)
                            .asJsonObject
                            .get("parentId")
                            ?.takeUnless { it.isJsonNull }
                            ?.asString
                        val response = apiService.addComment(
                            mutation.targetId,
                            AddCommentRequestDto(content = content, parentId = parentId)
                        )
                        if (response.isSuccessful) {
                            outboxDao.markMutationSynced(mutation.mutationId)
                        } else {
                            allSuccessful = false
                        }
                    }
                    "UPSERT_DRAFT", "PUBLISH_DRAFT" -> {
                        val draft = gson.fromJson(mutation.payloadJson, DraftEntity::class.java)
                        val shouldPublish = mutation.mutationType == "PUBLISH_DRAFT"
                        val response = if (draft.remotePostId == null) {
                            apiService.createPost(
                                CreatePostRequestDto(
                                    title = draft.title.ifBlank { "Untitled draft" },
                                    content = draft.content,
                                    summary = draft.summary.ifBlank { null },
                                    category = draft.category,
                                    coverImage = draft.coverImage,
                                    isPublished = shouldPublish,
                                    clientDraftId = draft.localId
                                )
                            )
                        } else {
                            apiService.updatePost(
                                draft.remotePostId,
                                UpdatePostRequestDto(
                                    title = draft.title.ifBlank { "Untitled draft" },
                                    content = draft.content,
                                    summary = draft.summary.ifBlank { null },
                                    category = draft.category,
                                    coverImage = draft.coverImage,
                                    isPublished = shouldPublish,
                                    clientDraftId = draft.localId
                                )
                            )
                        }
                        val remote = response.body()?.post
                        if (response.isSuccessful && remote != null) {
                            if (shouldPublish) {
                                db.draftDao().deleteById(draft.localId)
                            } else {
                                db.draftDao().markSynced(draft.localId, remote.id, "synced")
                            }
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
