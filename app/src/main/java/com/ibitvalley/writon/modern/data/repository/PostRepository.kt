package com.ibitvalley.writon.modern.data.repository

import com.google.gson.Gson
import com.ibitvalley.writon.modern.core.database.dao.CommentDao
import com.ibitvalley.writon.modern.core.database.dao.OutboxDao
import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.database.model.OutboxMutationEntity
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.CreatePostRequestDto
import com.ibitvalley.writon.modern.core.network.model.ReadingProgressRequestDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

class PostRepository(
    private val apiService: WritOnApiService,
    private val postDao: PostDao,
    private val commentDao: CommentDao,
    private val outboxDao: OutboxDao,
    private val gson: Gson = Gson()
) {

    suspend fun seedInitialStoriesIfEmpty() = withContext(Dispatchers.IO) {
        val count = postDao.getPostCount()
        if (count == 0) {
            val initialPosts = listOf(
                PostEntity(
                    id = "seed-1",
                    authorId = "author-maya",
                    authorName = "Maya Lin",
                    authorPenName = "mayalin",
                    authorAvatarUrl = null,
                    title = "The Geometry of Silence",
                    slug = "the-geometry-of-silence",
                    summary = "Why the most enduring structures in modern architecture are defined by the spaces they deliberately leave empty.",
                    content = "Architecture is often celebrated for what it contains—the stone, the timber, the soaring columns of steel. But true serenity lives in the voids between them.\n\nWhen we strip away ornamentation, we create room for thought to expand. Silence becomes the primary material of design.",
                    category = "Essays",
                    coverImage = null,
                    readingTimeMin = 5,
                    likesCnt = 342,
                    commentsCnt = 28,
                    bookmarksCnt = 89,
                    isLiked = false,
                    isBookmarked = false,
                    createdAt = "2026-08-20T10:00:00Z"
                ),
                PostEntity(
                    id = "seed-2",
                    authorId = "author-vikram",
                    authorName = "Vikram Desai",
                    authorPenName = "vikramd",
                    authorAvatarUrl = null,
                    title = "On Slow Craft and Modern Software",
                    slug = "on-slow-craft-and-modern-software",
                    summary = "Reflections on building systems with permanence, patience, and intentional constraints.",
                    content = "We have traded deliberate craftsmanship for frantic iteration. In this essay, I explore what software engineering can learn from master watchmakers and bookbinders.",
                    category = "Tech",
                    coverImage = null,
                    readingTimeMin = 7,
                    likesCnt = 512,
                    commentsCnt = 44,
                    bookmarksCnt = 160,
                    isLiked = false,
                    isBookmarked = false,
                    createdAt = "2026-08-19T14:30:00Z"
                ),
                PostEntity(
                    id = "seed-3",
                    authorId = "author-meera",
                    authorName = "Meera Iyer",
                    authorPenName = "meeraiyer",
                    authorAvatarUrl = null,
                    title = "The Poetics of Ordinary Days",
                    slug = "the-poetics-of-ordinary-days",
                    summary = "Finding profound creative inspiration in morning routines, quiet tea, and unhurried observations.",
                    content = "Great art does not require monumental events. The steam rising from an enamel kettle holds as much mystery as an ocean storm if you give it your undivided attention.",
                    category = "Culture",
                    coverImage = null,
                    readingTimeMin = 4,
                    likesCnt = 280,
                    commentsCnt = 19,
                    bookmarksCnt = 75,
                    isLiked = false,
                    isBookmarked = false,
                    createdAt = "2026-08-18T09:15:00Z"
                )
            )
            postDao.insertPosts(initialPosts)
        }
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

    suspend fun refreshPostDetail(postId: String) = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getPostDetail(postId)
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!.post
                val entity = PostEntity(
                    id = dto.id,
                    authorId = dto.author.id,
                    authorName = dto.author.fullName,
                    authorPenName = dto.author.penName,
                    authorAvatarUrl = dto.author.avatarUrl,
                    title = dto.title,
                    slug = dto.slug,
                    summary = dto.summary,
                    content = dto.content,
                    category = dto.category,
                    coverImage = dto.coverImage,
                    readingTimeMin = dto.readingTimeMin,
                    likesCnt = dto.likesCnt,
                    commentsCnt = dto.commentsCnt,
                    bookmarksCnt = dto.bookmarksCnt,
                    isLiked = dto.isLiked,
                    isBookmarked = dto.isBookmarked,
                    createdAt = dto.createdAt
                )
                postDao.insertPost(entity)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun refreshComments(postId: String) = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getComments(postId)
            if (response.isSuccessful && response.body() != null) {
                val commentEntities = response.body()!!.comments.map { dto ->
                    CommentEntity(
                        id = dto.id,
                        postId = dto.postId,
                        authorId = dto.authorId,
                        authorName = dto.author.fullName,
                        authorAvatarUrl = dto.author.avatarUrl,
                        content = dto.content,
                        createdAt = dto.createdAt,
                        parentId = dto.parentId
                    )
                }
                commentDao.deleteCommentsByPostId(postId)
                commentDao.insertComments(commentEntities)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun addComment(postId: String, content: String, authorName: String) = withContext(Dispatchers.IO) {
        val tempId = "temp_${System.currentTimeMillis()}"
        val tempComment = CommentEntity(
            id = tempId,
            postId = postId,
            authorId = "current_user", // Ideally from UserSession
            authorName = authorName,
            authorAvatarUrl = null,
            content = content,
            createdAt = java.time.Instant.now().toString()
        )

        // Optimistic UI update
        commentDao.insertComment(tempComment)

        try {
            val response = apiService.addComment(postId, mapOf("content" to content))
            if (response.isSuccessful) {
                refreshComments(postId)
            } else {
                queueComment(postId, content)
            }
            Unit
        } catch (e: Exception) {
            queueComment(postId, content)
        }
    }

    suspend fun refreshPosts(category: String? = null, tab: String = "latest", query: String? = null) {
        withContext(Dispatchers.IO) {
            try {
                val categoryQuery = if (category == "All") null else category
                val response = apiService.getPosts(
                    category = categoryQuery,
                    tab = tab,
                    searchQuery = query
                )
                if (response.isSuccessful && response.body() != null) {
                    val payload = response.body()!!
                    val postEntities = payload.posts.map { dto ->
                        PostEntity(
                            id = dto.id,
                            authorId = dto.author.id,
                            authorName = dto.author.fullName,
                            authorPenName = dto.author.penName,
                            authorAvatarUrl = dto.author.avatarUrl,
                            title = dto.title,
                            slug = dto.slug,
                            summary = dto.summary,
                            content = dto.content,
                            category = dto.category,
                            coverImage = dto.coverImage,
                            readingTimeMin = dto.readingTimeMin,
                            likesCnt = dto.likesCnt,
                            commentsCnt = dto.commentsCnt,
                            bookmarksCnt = dto.bookmarksCnt,
                            isLiked = dto.isLiked,
                            isBookmarked = dto.isBookmarked,
                            createdAt = dto.createdAt
                        )
                    }

                    // Upsert latest posts into Room cache with OnConflictStrategy.REPLACE
                    // Preserves local-only entries and unsynced modifications safely
                    postDao.insertPosts(postEntities)
                }
            } catch (e: Exception) {
                // Network failure: Room offline cache will continue serving content seamlessly
                e.printStackTrace()
            }
        }
    }

    suspend fun toggleLike(postId: String, currentLiked: Boolean, currentCount: Int) = withContext(Dispatchers.IO) {
        val newLiked = !currentLiked
        val newCount = if (newLiked) currentCount + 1 else maxOf(0, currentCount - 1)

        // Optimistic UI update in local Room DB
        postDao.updateLikeStatus(postId, newLiked, newCount)

        try {
            val response = apiService.toggleLike(postId)
            if (!response.isSuccessful) {
                queueMutation("LIKE", postId)
            }
        } catch (e: Exception) {
            queueMutation("LIKE", postId)
        }
    }

    suspend fun toggleBookmark(postId: String, currentBookmarked: Boolean, currentCount: Int) = withContext(Dispatchers.IO) {
        val newBookmarked = !currentBookmarked
        val newCount = if (newBookmarked) currentCount + 1 else maxOf(0, currentCount - 1)

        // Optimistic UI update in Room DB
        postDao.updateBookmarkStatus(postId, newBookmarked, newCount)

        try {
            val response = apiService.toggleBookmark(postId)
            if (!response.isSuccessful) {
                queueMutation("BOOKMARK", postId)
            }
        } catch (e: Exception) {
            queueMutation("BOOKMARK", postId)
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
                isPublished = true
            )

            try {
                val response = apiService.createPost(request)
                if (response.isSuccessful) {
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

    private suspend fun queueComment(postId: String, content: String) {
        outboxDao.enqueueMutation(
            OutboxMutationEntity(
                mutationType = "ADD_COMMENT",
                targetId = postId,
                payloadJson = gson.toJson(mapOf("content" to content))
            )
        )
    }

    private suspend fun queueMutation(type: String, postId: String) {
        outboxDao.enqueueMutation(
            OutboxMutationEntity(
                mutationType = type,
                targetId = postId,
                payloadJson = "{}"
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
}
