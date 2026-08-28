package com.ibitvalley.writon.modern.core.database.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "posts")
data class PostEntity(
    @PrimaryKey val id: String,
    val authorId: String,
    val authorName: String,
    val authorPenName: String,
    val authorAvatarUrl: String?,
    val title: String,
    val slug: String,
    val summary: String?,
    val content: String,
    val category: String,
    val coverImage: String?,
    val readingTimeMin: Int,
    val likesCnt: Int,
    val commentsCnt: Int,
    val bookmarksCnt: Int,
    val isLiked: Boolean = false,
    val isBookmarked: Boolean = false,
    val createdAt: String
)

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val penName: String,
    val fullName: String,
    val email: String?,
    val avatarUrl: String?,
    val bio: String?,
    val quoteOfDay: String?,
    val followersCnt: Int = 0,
    val followingCnt: Int = 0
)

@Entity(tableName = "outbox_mutations")
data class OutboxMutationEntity(
    @PrimaryKey(autoGenerate = true) val mutationId: Long = 0,
    val mutationType: String, // CREATE_POST, LIKE, BOOKMARK, ADD_COMMENT
    val targetId: String,
    val payloadJson: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)

/** Local-first editor state. A draft is kept independently of the feed cache. */
@Entity(tableName = "drafts")
data class DraftEntity(
    @PrimaryKey val localId: String,
    val remotePostId: String? = null,
    val title: String = "",
    val content: String = "",
    val summary: String = "",
    val category: String = "Essays",
    val tagsJson: String = "[]",
    val coverImage: String? = null,
    val visibility: String = "public",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val syncState: String = "local",
    val lastError: String? = null
)

@Entity(tableName = "comments")
data class CommentEntity(
    @PrimaryKey val id: String,
    val postId: String,
    val authorId: String,
    val authorName: String,
    val authorAvatarUrl: String?,
    val content: String,
    val createdAt: String,
    val parentId: String? = null
)

data class PostAuthorTuple(
    val authorId: String,
    val authorName: String,
    val authorPenName: String,
    val authorAvatarUrl: String?
)

data class PostTagTuple(
    val name: String,
    val count: Int
)

