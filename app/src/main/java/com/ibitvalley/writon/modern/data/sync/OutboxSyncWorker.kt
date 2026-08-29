package com.ibitvalley.writon.modern.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.UpdatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.AddCommentRequestDto
import com.ibitvalley.writon.modern.core.network.model.RelationStateRequestDto
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.nio.charset.StandardCharsets
import java.util.UUID

internal fun stableOutboxUuid(kind: String, mutationId: Long): String =
    UUID.nameUUIDFromBytes("writon:$kind:$mutationId".toByteArray(StandardCharsets.UTF_8)).toString()

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
                        val state = relationStateFor(mutation.payloadJson, mutation.targetId, isLike = true)
                        val response = apiService.setLike(mutation.targetId, state)
                        if (response.isSuccessful) {
                            outboxDao.markMutationSynced(mutation.mutationId)
                        } else {
                            allSuccessful = false
                        }
                    }
                    "BOOKMARK" -> {
                        val state = relationStateFor(mutation.payloadJson, mutation.targetId, isLike = false)
                        val response = apiService.setBookmark(mutation.targetId, state)
                        if (response.isSuccessful) {
                            outboxDao.markMutationSynced(mutation.mutationId)
                        } else {
                            allSuccessful = false
                        }
                    }
                    "CREATE_POST" -> {
                        val queuedRequest = gson.fromJson(mutation.payloadJson, CreatePostRequestDto::class.java)
                        val postRequest = if (queuedRequest.clientDraftId.isNullOrBlank()) {
                            queuedRequest.copy(clientDraftId = stableOutboxUuid("post", mutation.mutationId))
                        } else {
                            queuedRequest
                        }
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
                        val queuedRequest = gson.fromJson(mutation.payloadJson, AddCommentRequestDto::class.java)
                        if (queuedRequest.content.isBlank()) {
                            allSuccessful = false
                            continue
                        }
                        val request = if (queuedRequest.clientMutationId.isNullOrBlank()) {
                            queuedRequest.copy(
                                clientMutationId = stableOutboxUuid("comment", mutation.mutationId),
                            )
                        } else {
                            queuedRequest
                        }
                        val response = apiService.addComment(
                            mutation.targetId,
                            request,
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

    private suspend fun relationStateFor(
        payloadJson: String,
        postId: String,
        isLike: Boolean,
    ): RelationStateRequestDto {
        val payload = runCatching { gson.fromJson(payloadJson, RelationStateRequestDto::class.java) }.getOrNull()
        val hasExplicitState = runCatching {
            gson.fromJson(payloadJson, com.google.gson.JsonObject::class.java).has("enabled")
        }.getOrDefault(false)
        if (payload != null && hasExplicitState) return payload

        // Upgrade compatibility: old queued toggle rows used an empty object. Room already
        // contains the user's optimistic desired state, so retry that state explicitly.
        val cachedPost = db.postDao().getPostById(postId).first()
        return RelationStateRequestDto(
            enabled = if (isLike) cachedPost?.isLiked == true else cachedPost?.isBookmarked == true,
        )
    }
}
