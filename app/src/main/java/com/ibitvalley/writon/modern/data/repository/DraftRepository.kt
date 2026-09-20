package com.ibitvalley.writon.modern.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.gson.Gson
import com.ibitvalley.writon.modern.core.database.dao.DraftDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import com.ibitvalley.writon.modern.core.database.model.GUEST_DRAFT_OWNER
import com.ibitvalley.writon.modern.core.database.model.draftOwnerKey
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.UpdatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.UUID
import java.util.Locale

class DraftRepository(
    private val apiService: WritOnApiService,
    private val draftDao: DraftDao,
    private val outboxDao: OutboxDao,
    private val gson: Gson = Gson(),
    private val userPreferences: UserPreferences? = null,
    private val accountIdProvider: () -> String? = { FirebaseAuth.getInstance().currentUser?.uid }
) {
    private fun currentOwnerKey(): String = draftOwnerKey(accountIdProvider())

    fun observeLatestDraft(): Flow<DraftEntity?> = draftDao.observeLatest(currentOwnerKey())

    suspend fun findLegacyDraft(): DraftEntity? = withContext(Dispatchers.IO) {
        if (currentOwnerKey() == GUEST_DRAFT_OWNER) null else draftDao.getLatestLegacy()
    }

    suspend fun claimLegacyDraft(localId: String): DraftEntity? = withContext(Dispatchers.IO) {
        val ownerKey = currentOwnerKey()
        if (ownerKey == GUEST_DRAFT_OWNER) return@withContext null
        if (draftDao.claimLegacy(localId, ownerKey) != 1) return@withContext null
        draftDao.getById(localId, ownerKey)
    }

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
        val ownerKey = currentOwnerKey()
        require(existing == null || existing.ownerKey == ownerKey) { "Draft belongs to a different account." }
        val draft = DraftEntity(
            localId = existing?.localId ?: UUID.randomUUID().toString(),
            ownerKey = ownerKey,
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
            syncState = if (existing?.syncState == "published_edit") "published_edit" else "local"
        )
        draftDao.upsert(draft)
        userPreferences?.growthTracker?.recordDraftLength(draft.content.length)
        draft
    }

    suspend fun preparePublishedEdit(post: PostDto): Result<DraftEntity> = withContext(Dispatchers.IO) {
        runCatching {
            val editablePost = if (post.content.isNotBlank()) {
                post
            } else {
                val response = apiService.getPostDetail(post.id)
                response.body()?.post?.takeIf { response.isSuccessful && it.content.isNotBlank() }
                    ?: throw IllegalStateException("The story text could not be loaded. Please try again.")
            }
            val now = System.currentTimeMillis()
            val draft = DraftEntity(
                localId = UUID.randomUUID().toString(),
                ownerKey = currentOwnerKey(),
                remotePostId = editablePost.id,
                title = editablePost.title,
                content = editablePost.content,
                summary = editablePost.summary.orEmpty(),
                category = editablePost.category,
                coverImage = editablePost.coverImage,
                createdAt = now,
                updatedAt = now,
                syncState = "published_edit",
            )
            draftDao.upsert(draft)
            draft
        }
    }

    suspend fun syncDraft(draft: DraftEntity): Result<DraftEntity> = withContext(Dispatchers.IO) {
        if (draft.ownerKey != currentOwnerKey()) {
            return@withContext Result.failure(SecurityException("Draft belongs to a different account."))
        }
        if (draft.ownerKey == GUEST_DRAFT_OWNER) return@withContext Result.success(draft)
        // Editing a live story remains device-local until the author explicitly confirms
        // the update. Autosave must never publish partial keystrokes to readers.
        if (draft.syncState == "published_edit") return@withContext Result.success(draft)
        val request = UpdatePostRequestDto(
            title = draft.title.ifBlank { "Untitled draft" },
            content = draft.content,
            summary = draft.summary.ifBlank { null },
            category = draft.category,
            coverImage = draft.coverImage,
            isPublished = false,
            clientDraftId = draft.localId,
            languageCode = currentContentLanguage()
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
                        clientDraftId = draft.localId,
                        languageCode = request.languageCode
                    )
                )
            } else {
                apiService.updatePost(draft.remotePostId, request)
            }
            val remote = response.body()?.post
            if (response.isSuccessful && remote != null) {
                draftDao.markSynced(draft.localId, draft.ownerKey, remote.id, "synced")
                Result.success(draft.copy(remotePostId = remote.id, syncState = "synced", lastError = null))
            } else {
                enqueueDraft(draft)
                draftDao.markFailed(draft.localId, draft.ownerKey, "Could not save to WritOn. It will retry when connected.")
                Result.failure(IllegalStateException("Draft save failed (${response.code()})"))
            }
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            enqueueDraft(draft)
            draftDao.markFailed(draft.localId, draft.ownerKey, "Offline. Your draft is safe on this device and will retry.")
            Result.failure(error)
        }
    }

    suspend fun publish(draft: DraftEntity): Result<String> = withContext(Dispatchers.IO) {
        if (draft.ownerKey != currentOwnerKey()) {
            return@withContext Result.failure(SecurityException("Draft belongs to a different account."))
        }
        if (draft.ownerKey == GUEST_DRAFT_OWNER) {
            return@withContext Result.failure(IllegalStateException("Sign in before publishing."))
        }
        val request = CreatePostRequestDto(
            title = draft.title,
            content = draft.content,
            summary = draft.summary.ifBlank { null },
            category = draft.category,
            coverImage = draft.coverImage,
            isPublished = true,
            clientDraftId = draft.localId,
            languageCode = currentContentLanguage()
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
                    clientDraftId = draft.localId,
                    languageCode = request.languageCode
                )
            )
            val post = response.body()?.post
            if (response.isSuccessful && post != null) {
                draftDao.deleteById(draft.localId, draft.ownerKey)
                userPreferences?.growthTracker?.recordFailureResolved("publish_failure")
                userPreferences?.growthTracker?.recordPublishedStory(post.id)
                Result.success(post.id)
            } else {
                userPreferences?.growthTracker?.recordUserVisibleFailure("publish_failure")
                enqueuePublish(draft)
                Result.failure(QueuedPublishException("Publish failed (${response.code()})"))
            }
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            userPreferences?.growthTracker?.recordUserVisibleFailure("publish_failure")
            enqueuePublish(draft)
            Result.failure(QueuedPublishException(cause = error))
        }
    }

    suspend fun cancelQueuedPublish(draft: DraftEntity): Result<Unit> = withContext(Dispatchers.IO) {
        if (draft.ownerKey != currentOwnerKey()) {
            return@withContext Result.failure(SecurityException("Draft belongs to a different account."))
        }
        outboxDao.deletePendingMutation("PUBLISH_DRAFT", draft.localId)
        Result.success(Unit)
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

    private fun currentContentLanguage(): String {
        val saved = userPreferences?.appLanguage.orEmpty().lowercase(Locale.US)
        val resolved = if (saved == "system" || saved.isBlank()) Locale.getDefault().language else saved
        return resolved.takeIf { it in setOf("en", "hi", "bn", "mr", "es", "fr", "ur") } ?: "en"
    }

    private suspend fun enqueuePublish(draft: DraftEntity) {
        outboxDao.deletePendingMutation("UPSERT_DRAFT", draft.localId)
        outboxDao.enqueueLatestMutation(
            OutboxMutationEntity(
                mutationType = "PUBLISH_DRAFT",
                targetId = draft.localId,
                payloadJson = gson.toJson(draft)
            )
        )
    }
}

class QueuedPublishException(message: String = "Publish is queued until the connection recovers.", cause: Throwable? = null) :
    IllegalStateException(message, cause)
