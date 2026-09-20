package com.ibitvalley.writon.modern.data.repository

import com.google.gson.Gson
import com.google.firebase.auth.FirebaseAuth
import com.ibitvalley.writon.modern.core.database.dao.CommentDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.AddCommentRequestDto
import com.ibitvalley.writon.modern.core.network.model.UpdateCommentRequestDto
import com.ibitvalley.writon.modern.core.network.model.RelationStateRequestDto
import com.ibitvalley.writon.modern.core.network.model.ReadingProgressRequestDto
import com.ibitvalley.writon.modern.core.network.model.FeedBehaviorBatchDto
import com.ibitvalley.writon.modern.core.network.model.FeedBehaviorEventDto
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.data.sync.readingProgressOutboxTarget
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/** Result returned after a single server page has been merged into the Room cache. */
data class PostPageResult(
    val hasMore: Boolean,
    val loadedCount: Int,
    val wasFetched: Boolean
)

data class PersonalizedFeedPageResult(
    val items: List<PostEntity>,
    val nextCursor: String?,
    val feedSessionId: String?,
    val rankingVersion: String?,
    val isPersonalized: Boolean,
    val wasFetched: Boolean
)

private const val MIN_PERSONALIZED_FIRST_PAGE_SIZE = 5

internal fun isUsablePersonalizedPage(cursor: String?, itemCount: Int, limit: Int): Boolean =
    cursor != null || itemCount >= minOf(MIN_PERSONALIZED_FIRST_PAGE_SIZE, limit)

enum class PostDetailRefreshOutcome {
    REFRESHED,
    NOT_FOUND,
    RETAINED_OFFLINE,
    FAILED_NO_CACHE
}

class PostRepository(
    private val apiService: WritOnApiService,
    private val postDao: PostDao,
    private val commentDao: CommentDao,
    private val outboxDao: OutboxDao,
    private val gson: Gson = Gson(),
    private val userPreferences: UserPreferences? = null
) {
    private var activeFeedSessionId: String? = null
    private var activeRankingVersion: String? = null
    private fun utcNowIso(): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date())

    /** Removes placeholder rows and purged stories distributed to early WritOn 2.0 builds. */
    suspend fun removeLegacySeedStories() = withContext(Dispatchers.IO) {
        postDao.deletePostsByIds(
            listOf(
                "seed-1", "seed-2", "seed-3",
                "4c1fb2fa-f99b-4694-8f4f-8ca5f0eb3516",
                "72286de1-1635-4c15-8fd9-7d9459f1f52c",
                "02bbba36-e86b-438c-bc7d-bfc59d4b46f1",
                "e6936253-58f3-411f-ad64-cfb9e0c7ed02",
                "57b8d913-dfad-41a7-bef6-0478e6845368",
                "c1a59aa5-54de-4be1-8d34-f83879ca67b1",
                "9187aa00-3e89-41c9-b66a-8f651410f780",
                "f36c1e96-4c50-49c1-80ef-11261eeef719"
            )
        )
        postDao.purgeDisallowedStories()
    }

    fun getPostsFlow(category: String = "All", query: String = ""): Flow<List<PostEntity>> {
        return if (category == "All") {
            if (query.isEmpty()) postDao.getAllPosts() else postDao.searchAllPosts(query)
        } else {
            if (query.isEmpty()) postDao.searchPostsByCategory(category, "") else postDao.searchPostsByCategory(category, query)
        }
    }

    fun getPostDetailFlow(id: String): Flow<PostEntity?> {
        return postDao.getPostById(id)
    }

    fun getCommentsFlow(postId: String): Flow<List<CommentEntity>> {
        return commentDao.getCommentsByPostId(postId)
    }

    suspend fun refreshPostDetail(postId: String): PostDetailRefreshOutcome = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getPostDetail(postId)
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!.post
                val entity = dto.toEntity()
                postDao.insertPost(entity)
                return@withContext PostDetailRefreshOutcome.REFRESHED
            }
            if (response.code() == 404 || response.code() == 410) {
                postDao.deletePostById(postId)
                commentDao.deleteCommentsByPostId(postId)
                return@withContext PostDetailRefreshOutcome.NOT_FOUND
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        if (postDao.getPostSnapshot(postId) != null) {
            PostDetailRefreshOutcome.RETAINED_OFFLINE
        } else {
            PostDetailRefreshOutcome.FAILED_NO_CACHE
        }
    }

    suspend fun refreshComments(postId: String) = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getComments(postId)
            if (response.isSuccessful && response.body() != null) {
                val commentEntities = response.body()!!.comments.map { dto ->
                    CommentEntity(
                        id = dto.id ?: "",
                        postId = dto.postId ?: postId,
                        authorId = dto.authorId ?: "author_unknown",
                        authorName = dto.author?.fullName ?: dto.author?.penName ?: "WritOn Member",
                        authorAvatarUrl = dto.author?.avatarUrl,
                        content = dto.content ?: "",
                        createdAt = dto.createdAt ?: "",
                        parentId = dto.parentId,
                        updatedAt = dto.updatedAt,
                        isMine = dto.isMine,
                        authorFoundingWriterNumber = dto.author?.foundingWriterNumber,
                        authorEmailVerified = dto.author?.emailVerified == true
                    )
                }
                commentDao.deleteCommentsByPostId(postId)
                commentDao.insertComments(commentEntities)
                postDao.updateCommentsCount(postId, commentEntities.size)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun addComment(
        postId: String,
        content: String,
        authorName: String,
        parentId: String? = null,
    ) = withContext(Dispatchers.IO) {
        userPreferences?.growthTracker?.recordStrongReaderAction()
        val clientMutationId = UUID.randomUUID().toString()
        val tempId = "temp_$clientMutationId"
        val request = AddCommentRequestDto(
            content = content,
            parentId = parentId,
            clientMutationId = clientMutationId,
        )
        val tempComment = CommentEntity(
            id = tempId,
            postId = postId,
            authorId = "current_user", // Ideally from UserSession
            authorName = authorName,
            authorAvatarUrl = null,
            content = content,
            createdAt = utcNowIso(),
            parentId = parentId,
        )

        // Optimistic UI update
        commentDao.insertComment(tempComment)
        try {
            postDao.incrementCommentsCount(postId)
        } catch (_: Exception) {}

        try {
            val response = apiService.addComment(postId, request)
            if (response.isSuccessful) {
                refreshComments(postId)
            } else {
                queueComment(postId, request)
            }
            Unit
        } catch (e: Exception) {
            queueComment(postId, request)
        }
    }

    suspend fun updateComment(commentId: String, content: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.updateComment(commentId, UpdateCommentRequestDto(content.trim()))
            if (response.isSuccessful) {
                refreshComments(postId = commentDao.getCommentById(commentId)?.postId
                    ?: return@withContext Result.failure(IllegalStateException("Comment is no longer available.")))
                Result.success(Unit)
            } else {
                Result.failure(IllegalStateException("Comment update failed with HTTP ${response.code()}"))
            }
        } catch (error: Exception) {
            Result.failure(error)
        }
    }

    suspend fun deleteComment(commentId: String, postId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.deleteComment(commentId)
            if (response.isSuccessful) {
                refreshComments(postId)
                Result.success(Unit)
            } else {
                Result.failure(IllegalStateException("Comment deletion failed with HTTP ${response.code()}"))
            }
        } catch (error: Exception) {
            Result.failure(error)
        }
    }

    /**
     * Replaces the cached first page for the active feed. Later pages must be loaded with
     * [loadPostsPage] so a refresh never discards already paged-in stories by accident.
     */
    suspend fun refreshPosts(
        category: String? = null,
        tab: String = "latest",
        query: String? = null,
        limit: Int = 20
    ): PostPageResult {
        return loadPostsPage(category, tab, query, page = 1, limit = limit, replaceCachedPage = true)
    }

    suspend fun loadPersonalizedFeed(cursor: String? = null, limit: Int = 20): PersonalizedFeedPageResult =
        withContext(Dispatchers.IO) {
            try {
                val signedIn = FirebaseAuth.getInstance().currentUser != null
                val vectors = if (signedIn) null else userPreferences?.let {
                    it.guestFeedLearning.vectors(it.interestChoices(null))
                }
                val response = apiService.getPersonalizedFeed(
                    cursor = cursor,
                    limit = limit,
                    language = currentContentLanguage(),
                    guestTopics = vectors?.topics,
                    guestAuthors = vectors?.authors,
                    guestLanguages = vectors?.languages
                )
                val payload = response.body()
                if (response.isSuccessful && payload != null) {
                    val items = payload.items.map { it.toEntity() }
                    if (isUsablePersonalizedPage(cursor, items.size, limit)) {
                        if (cursor == null) postDao.replaceAllPosts(items) else postDao.mergeFeedPosts(items)
                        activeFeedSessionId = payload.feedSessionId
                        activeRankingVersion = payload.rankingVersion
                        return@withContext PersonalizedFeedPageResult(
                            items = items,
                            nextCursor = payload.nextCursor,
                            feedSessionId = payload.feedSessionId,
                            rankingVersion = payload.rankingVersion,
                            isPersonalized = true,
                            wasFetched = true
                        )
                    }
                }
            } catch (error: Exception) {
                error.printStackTrace()
            }

            // Only the first page may switch safely to the standard feed. A later cursor belongs
            // to the personalized session and must never be interpreted as a standard page number.
            if (cursor == null) try {
                val fallbackPage = 1
                val postsResponse = apiService.getPosts(
                    category = null,
                    tab = "latest",
                    page = fallbackPage,
                    limit = limit
                )
                if (postsResponse.isSuccessful && postsResponse.body() != null) {
                    val payload = postsResponse.body()!!
                    val items = payload.posts.map { it.toEntity() }
                    postDao.replaceAllPosts(items)
                    activeFeedSessionId = null
                    activeRankingVersion = null
                    val nextCursor = if (payload.pagination.hasMore) (fallbackPage + 1).toString() else null
                    return@withContext PersonalizedFeedPageResult(
                        items = items,
                        nextCursor = nextCursor,
                        feedSessionId = null,
                        rankingVersion = "standard_fallback",
                        isPersonalized = false,
                        wasFetched = true
                    )
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            PersonalizedFeedPageResult(emptyList(), null, null, null, isPersonalized = false, wasFetched = false)
        }

    suspend fun recordFeedImpression(postId: String) {
        recordFeedEvent(postId, "impression", visibleFraction = 1f, visibleMillis = 1_000)
    }

    suspend fun recordFeedOpen(postId: String) {
        recordFeedEvent(postId, "open")
    }

    suspend fun recordFeedQuickExit(postId: String, engagedSeconds: Float) {
        if (engagedSeconds < 5f) recordFeedEvent(postId, "quick_exit", engagedSeconds = engagedSeconds)
    }

    suspend fun recordFeedShare(postId: String) {
        recordFeedEvent(postId, "share")
    }

    suspend fun recordReadingProgress(
        postId: String,
        progress: Float,
        readSeconds: Int,
        totalEngagedSeconds: Int
    ) = withContext(Dispatchers.IO) {
        val post = postDao.getPostSnapshot(postId) ?: return@withContext
        userPreferences?.growthTracker?.recordReaderProgress(post.id, progress, readSeconds)
        val accountId = FirebaseAuth.getInstance().currentUser?.uid
        if (accountId == null) {
            userPreferences?.guestFeedLearning?.recordReading(
                storyId = post.id,
                topicId = post.category,
                authorId = post.authorId,
                languageCode = post.languageCode,
                progress = progress,
                totalEngagedSeconds = totalEngagedSeconds
            )
            return@withContext
        }
        val request = ReadingProgressRequestDto(
            progress = progress.coerceIn(0f, 1f),
            readSeconds = readSeconds.coerceIn(0, 60),
            clientMutationId = UUID.randomUUID().toString()
        )
        try {
            if (!apiService.recordReadingProgress(postId, request).isSuccessful) {
                queueReadingProgress(accountId, postId, request)
            }
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            queueReadingProgress(accountId, postId, request)
        }
    }

    private suspend fun recordFeedEvent(
        postId: String,
        eventType: String,
        visibleFraction: Float? = null,
        visibleMillis: Int? = null,
        engagedSeconds: Float? = null
    ) = withContext(Dispatchers.IO) {
        val post = postDao.getPostSnapshot(postId) ?: return@withContext
        if (FirebaseAuth.getInstance().currentUser == null) {
            when (eventType) {
                "open" -> userPreferences?.guestFeedLearning?.recordOpen(
                    post.id, post.category, post.authorId, post.languageCode
                )
                "quick_exit" -> userPreferences?.guestFeedLearning?.recordAction(
                    post.id, post.category, post.authorId, post.languageCode, "quick_exit", -2f
                )
                "share" -> userPreferences?.guestFeedLearning?.recordAction(
                    post.id, post.category, post.authorId, post.languageCode, "share", 3f
                )
            }
            return@withContext
        }
        val sessionId = activeFeedSessionId ?: return@withContext
        val eventId = UUID.randomUUID().toString()
        runCatching {
            apiService.recordFeedEvents(
                FeedBehaviorBatchDto(
                    listOf(
                        FeedBehaviorEventDto(
                            eventId = eventId,
                            idempotencyKey = eventId,
                            storyId = post.id,
                            feedSessionId = sessionId,
                            eventType = eventType,
                            clientEventTime = utcNowIso(),
                            visibleFraction = visibleFraction,
                            visibleMillis = visibleMillis,
                            engagedSeconds = engagedSeconds
                        )
                    )
                )
            )
        }
    }

    private fun currentContentLanguage(): String {
        val saved = userPreferences?.appLanguage.orEmpty().lowercase(Locale.US)
        val resolved = if (saved == "system" || saved.isBlank()) Locale.getDefault().language else saved
        return resolved.takeIf { it in setOf("en", "hi", "bn", "mr", "es", "fr", "ur") } ?: "en"
    }

    suspend fun getCategories(): List<String> = withContext(Dispatchers.IO) {
        runCatching { apiService.getTags() }
            .getOrNull()
            ?.takeIf { it.isSuccessful }
            ?.body()
            ?.tags
            ?.map { it.name }
            ?.distinct()
            ?.sorted()
            .orEmpty()
    }

    /** Fetches and appends one page of the active server feed to the local Room cache. */
    suspend fun loadPostsPage(
        category: String? = null,
        tab: String = "latest",
        query: String? = null,
        page: Int,
        limit: Int = 20,
        replaceCachedPage: Boolean = false
    ): PostPageResult {
        return withContext(Dispatchers.IO) {
            try {
                if (replaceCachedPage) {
                    activeFeedSessionId = null
                    activeRankingVersion = null
                }
                val categoryQuery = if (category == "All") null else category
                val response = apiService.getPosts(
                    category = categoryQuery,
                    tab = tab,
                    searchQuery = query,
                    page = page,
                    limit = limit
                )
                if (response.isSuccessful && response.body() != null) {
                    val payload = response.body()!!
                    val postEntities = payload.posts.map { it.toEntity() }

                    // Feed rows deliberately omit full story content. Merge card fields into
                    // Room so the current deck stays visible and a previously downloaded reader
                    // body is never erased by a background refresh.
                    if (replaceCachedPage) {
                        postDao.replaceMatchingPosts(
                            category = categoryQuery,
                            query = query.orEmpty(),
                            posts = postEntities
                        )
                    } else {
                        postDao.mergeFeedPosts(postEntities)
                    }
                    return@withContext PostPageResult(
                        hasMore = payload.pagination.hasMore,
                        loadedCount = postEntities.size,
                        wasFetched = true
                    )
                }
            } catch (e: Exception) {
                // Network failure: Room offline cache will continue serving content seamlessly
                e.printStackTrace()
            }
            return@withContext PostPageResult(hasMore = false, loadedCount = 0, wasFetched = false)
        }
    }

    suspend fun toggleLike(postId: String, currentLiked: Boolean, currentCount: Int) = withContext(Dispatchers.IO) {
        val newLiked = !currentLiked
        val newCount = if (newLiked) currentCount + 1 else maxOf(0, currentCount - 1)
        if (newLiked) userPreferences?.growthTracker?.recordStrongReaderAction()

        // Optimistic UI update in local Room DB
        postDao.updateLikeStatus(postId, newLiked, newCount)

        try {
            val response = apiService.setLike(postId, RelationStateRequestDto(enabled = newLiked))
            if (!response.isSuccessful) {
                queueRelationMutation("LIKE", postId, newLiked)
            }
        } catch (e: Exception) {
            queueRelationMutation("LIKE", postId, newLiked)
        }
    }

    suspend fun toggleBookmark(postId: String, currentBookmarked: Boolean, currentCount: Int): Result<Boolean> = withContext(Dispatchers.IO) {
        val newBookmarked = !currentBookmarked
        val newCount = if (newBookmarked) currentCount + 1 else maxOf(0, currentCount - 1)
        if (newBookmarked) userPreferences?.growthTracker?.recordStrongReaderAction()

        // Optimistic UI update in Room DB
        postDao.updateBookmarkStatus(postId, newBookmarked, newCount)

        try {
            val response = apiService.setBookmark(postId, RelationStateRequestDto(enabled = newBookmarked))
            if (!response.isSuccessful) {
                queueRelationMutation("BOOKMARK", postId, newBookmarked)
                Result.failure(IllegalStateException("Bookmark update queued (${response.code()})"))
            } else {
                Result.success(newBookmarked)
            }
        } catch (e: Exception) {
            queueRelationMutation("BOOKMARK", postId, newBookmarked)
            Result.failure(e)
        }
    }

    suspend fun deletePublishedStory(postId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.deletePost(postId)
            if (response.isSuccessful || response.code() == 404 || response.code() == 410) {
                // A missing story already satisfies the requested final state. Always
                // evict its local body and comments after the server confirms absence.
                postDao.deletePostById(postId)
                commentDao.deleteCommentsByPostId(postId)
                Result.success(Unit)
            } else {
                Result.failure(IllegalStateException("Story deletion failed with HTTP ${response.code()}"))
            }
        } catch (error: Exception) {
            // Destructive mutations are never queued: the user must receive a clear
            // failure and explicitly retry when connectivity has recovered.
            Result.failure(error)
        }
    }

    suspend fun publishStory(title: String, content: String, summary: String?, category: String) {
        withContext(Dispatchers.IO) {
            val request = CreatePostRequestDto(
                title = title,
                content = content,
                summary = summary,
                category = category,
                coverImage = null,
                isPublished = true,
                clientDraftId = UUID.randomUUID().toString(),
                languageCode = currentContentLanguage(),
            )

            try {
                val response = apiService.createPost(request)
                if (response.isSuccessful) {
                    userPreferences?.growthTracker?.recordPublishedStory()
                    refreshPosts()
                } else {
                    queuePost(request)
                }
                Unit
            } catch (e: Exception) {
                queuePost(request)
            }
        }
    }

    suspend fun recordReadingStart(postId: String) = withContext(Dispatchers.IO) {
        try {
            apiService.recordReadingProgress(
                postId = postId,
                request = ReadingProgressRequestDto(progress = 0.05f)
            )
        } catch (_: Exception) {
            // Public and offline reading remain available; progress is best-effort.
        }
    }

    private suspend fun queueComment(postId: String, request: AddCommentRequestDto) {
        outboxDao.enqueueMutation(
            OutboxMutationEntity(
                mutationType = "ADD_COMMENT",
                targetId = postId,
                payloadJson = gson.toJson(request),
            )
        )
    }

    private suspend fun queueReadingProgress(accountId: String, postId: String, request: ReadingProgressRequestDto) {
        outboxDao.enqueueMutation(
            OutboxMutationEntity(
                mutationType = "READING_PROGRESS",
                targetId = readingProgressOutboxTarget(accountId, postId),
                payloadJson = gson.toJson(request),
            )
        )
    }

    private suspend fun queueRelationMutation(type: String, postId: String, enabled: Boolean) {
        outboxDao.enqueueLatestMutation(
            OutboxMutationEntity(
                mutationType = type,
                targetId = postId,
                payloadJson = gson.toJson(RelationStateRequestDto(enabled = enabled)),
            )
        )
    }

    private suspend fun queuePost(request: CreatePostRequestDto) {
        outboxDao.enqueueMutation(
            OutboxMutationEntity(
                mutationType = "CREATE_POST",
                targetId = "local_${System.currentTimeMillis()}",
                payloadJson = gson.toJson(request)
            )
        )
    }

    private fun PostDto.toEntity(): PostEntity {
        val authorDto = this.author
        val safeId = this.id.orEmpty()
        return PostEntity(
            id = safeId,
            authorId = authorDto?.id ?: "unknown",
            authorName = authorDto?.fullName ?: authorDto?.penName ?: "WritOn Author",
            authorPenName = authorDto?.penName ?: "writon",
            authorAvatarUrl = authorDto?.avatarUrl,
            title = this.title.orEmpty(),
            slug = this.slug ?: safeId,
            summary = this.summary,
            content = this.content.orEmpty(),
            category = this.category ?: "Essays",
            coverImage = this.coverImage,
            readingTimeMin = this.readingTimeMin ?: 1,
            likesCnt = this.likesCnt ?: 0,
            commentsCnt = this.commentsCnt ?: 0,
            bookmarksCnt = this.bookmarksCnt ?: 0,
            isLiked = this.isLiked,
            isBookmarked = this.isBookmarked,
            createdAt = this.createdAt.orEmpty(),
            languageCode = this.languageCode ?: "und",
            contentUpdatedAt = this.contentUpdatedAt
        )
    }
}
