package com.ibitvalley.writon.modern.data.repository

import com.google.gson.Gson
import com.ibitvalley.writon.modern.core.database.dao.DraftDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.UpdatePostRequestDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.UUID

class DraftRepository(
    private val apiService: WritOnApiService,
    private val draftDao: DraftDao,
    private val outboxDao: OutboxDao,
    private val gson: Gson = Gson()
) {
    fun observeLatestDraft(): Flow<DraftEntity?> = draftDao.observeLatest()

    suspend fun saveLocal(
        existing: DraftEntity?,
        title: String,
        content: String,
        summary: String,
        category: String,
        coverImage: String? = null,
        visibility: String = "public"
    ): DraftEntity = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val draft = DraftEntity(
            localId = existing?.localId ?: UUID.randomUUID().toString(),
            remotePostId = existing?.remotePostId,
            title = title,
            content = content,
            summary = summary,
            category = category,
            tagsJson = existing?.tagsJson ?: "[]",
            coverImage = coverImage ?: existing?.coverImage,
            visibility = visibility,
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
            syncState = "local"
        )
        draftDao.upsert(draft)
        draft
    }

    suspend fun syncDraft(draft: DraftEntity): Result<DraftEntity> = withContext(Dispatchers.IO) {
        val request = UpdatePostRequestDto(
            title = draft.title.ifBlank { "Untitled draft" },
            content = draft.content,
            summary = draft.summary.ifBlank { null },
            category = draft.category,
            coverImage = draft.coverImage,
            isPublished = false,
            clientDraftId = draft.localId
        )
        try {
            val response = if (draft.remotePostId == null) {
                apiService.createPost(
                    CreatePostRequestDto(
                        title = request.title,
                        content = request.content,
                        summary = request.summary,
                        category = request.category,
                        coverImage = request.coverImage,
                        isPublished = false,
                        clientDraftId = draft.localId
                    )
                )
            } else {
                apiService.updatePost(draft.remotePostId, request)
            }
            val remote = response.body()?.post
            if (response.isSuccessful && remote != null) {
                draftDao.markSynced(draft.localId, remote.id, "synced")
                Result.success(draft.copy(remotePostId = remote.id, syncState = "synced", lastError = null))
            } else {
                enqueueDraft(draft)
                draftDao.markFailed(draft.localId, "Could not save to WritOn. It will retry when connected.")
                Result.failure(IllegalStateException("Draft save failed (${response.code()})"))
            }
        } catch (error: Exception) {
            enqueueDraft(draft)
            draftDao.markFailed(draft.localId, "Offline. Your draft is safe on this device and will retry.")
            Result.failure(error)
        }
    }

    suspend fun publish(draft: DraftEntity): Result<String> = withContext(Dispatchers.IO) {
        val request = CreatePostRequestDto(
            title = draft.title,
            content = draft.content,
            summary = draft.summary.ifBlank { null },
            category = draft.category,
            coverImage = draft.coverImage,
            isPublished = true,
            clientDraftId = draft.localId
        )
        try {
            val response = if (draft.remotePostId == null) apiService.createPost(request) else apiService.updatePost(
                draft.remotePostId,
                UpdatePostRequestDto(
                    title = request.title,
                    content = request.content,
                    summary = request.summary,
                    category = request.category,
                    coverImage = request.coverImage,
                    isPublished = true,
                    clientDraftId = draft.localId
                )
            )
            val post = response.body()?.post
            if (response.isSuccessful && post != null) {
                draftDao.deleteById(draft.localId)
                Result.success(post.id)
            } else {
                enqueuePublish(draft)
                Result.failure(IllegalStateException("Publish failed (${response.code()})"))
            }
        } catch (error: Exception) {
            enqueuePublish(draft)
            Result.failure(error)
        }
    }

    private suspend fun enqueueDraft(draft: DraftEntity) {
        outboxDao.enqueueLatestMutation(
            OutboxMutationEntity(
                mutationType = "UPSERT_DRAFT",
                targetId = draft.localId,
                payloadJson = gson.toJson(draft)
            )
        )
    }

    private suspend fun enqueuePublish(draft: DraftEntity) {
        outboxDao.enqueueLatestMutation(
            OutboxMutationEntity(
                mutationType = "PUBLISH_DRAFT",
                targetId = draft.localId,
                payloadJson = gson.toJson(draft)
            )
        )
    }
}
