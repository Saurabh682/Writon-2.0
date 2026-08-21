package com.ibitvalley.writon.modern.core.network.model

import com.google.gson.annotations.SerializedName

data class AuthorDto(
    @SerializedName("id") val id: String,
    @SerializedName("penName") val penName: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("bio") val bio: String?,
    @SerializedName("quoteOfDay") val quoteOfDay: String?,
    @SerializedName("followersCnt") val followersCnt: Int?,
    @SerializedName("followingCnt") val followingCnt: Int?
)

data class PostDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("slug") val slug: String,
    @SerializedName("summary") val summary: String?,
    @SerializedName("content") val content: String,
    @SerializedName("category") val category: String,
    @SerializedName("coverImage") val coverImage: String?,
    @SerializedName("readingTimeMin") val readingTimeMin: Int,
    @SerializedName("likesCnt") val likesCnt: Int,
    @SerializedName("commentsCnt") val commentsCnt: Int,
    @SerializedName("bookmarksCnt") val bookmarksCnt: Int,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("author") val author: AuthorDto,
    @SerializedName("isLiked") val isLiked: Boolean = false,
    @SerializedName("isBookmarked") val isBookmarked: Boolean = false,
    @SerializedName("isFollowingAuthor") val isFollowingAuthor: Boolean = false
)

data class PostsResponseDto(
    @SerializedName("posts") val posts: List<PostDto>,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class PaginationDto(
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("hasMore") val hasMore: Boolean
)

data class PostDetailResponseDto(
    @SerializedName("post") val post: PostDto
)

data class CommentDto(
    @SerializedName("id") val id: String,
    @SerializedName("postId") val postId: String,
    @SerializedName("authorId") val authorId: String,
    @SerializedName("parentId") val parentId: String?,
    @SerializedName("content") val content: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("author") val author: AuthorDto,
    @SerializedName("replies") val replies: List<CommentDto>? = emptyList()
)

data class CommentsResponseDto(
    @SerializedName("comments") val comments: List<CommentDto>,
    @SerializedName("total") val total: Int
)

data class LikeResponseDto(
    @SerializedName("liked") val liked: Boolean,
    @SerializedName("likesCount") val likesCount: Int
)

data class BookmarkResponseDto(
    @SerializedName("bookmarked") val bookmarked: Boolean,
    @SerializedName("bookmarksCount") val bookmarksCount: Int
)

data class FollowResponseDto(
    @SerializedName("following") val following: Boolean,
    @SerializedName("followersCount") val followersCount: Int
)

data class CreatePostRequestDto(
    @SerializedName("title") val title: String,
    @SerializedName("content") val content: String,
    @SerializedName("summary") val summary: String?,
    @SerializedName("category") val category: String,
    @SerializedName("coverImage") val coverImage: String?,
    @SerializedName("isPublished") val isPublished: Boolean = true
)

data class UserProfileResponseDto(
    @SerializedName("user") val user: AuthorDto
)

data class MyProfileDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String?,
    @SerializedName("penName") val penName: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("bio") val bio: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("location") val location: String?,
    @SerializedName("joinedAt") val joinedAt: String,
    @SerializedName("followersCount") val followersCount: Int,
    @SerializedName("followingCount") val followingCount: Int
)

data class MyProfileResponseDto(
    @SerializedName("profile") val profile: MyProfileDto
)

data class UpsertMyProfileRequestDto(
    @SerializedName("penName") val penName: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("bio") val bio: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("location") val location: String? = null
)
