package com.ibitvalley.writon.modern.core.network.model

import com.google.gson.annotations.SerializedName

data class AuthorDto(
    @SerializedName("id") val id: String = "",
    @SerializedName("penName") val penName: String = "",
    @SerializedName("fullName") val fullName: String = "",
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("bio") val bio: String? = null,
    @SerializedName("quoteOfDay") val quoteOfDay: String? = null,
    @SerializedName("followersCnt") val followersCnt: Int? = null,
    @SerializedName("followingCnt") val followingCnt: Int? = null,
    @SerializedName("foundingWriterNumber") val foundingWriterNumber: Int? = null,
    @SerializedName("emailVerified") val emailVerified: Boolean = false
)

data class PostDto(
    @SerializedName("contentSource") val contentSource: String? = null,
    @SerializedName("id") val id: String = "",
    @SerializedName("title") val title: String = "",
    @SerializedName("slug") val slug: String = "",
    @SerializedName("summary") val summary: String? = null,
    @SerializedName("content") val content: String = "",
    @SerializedName("category") val category: String = "Essays",
    @SerializedName("languageCode") val languageCode: String? = "und",
    @SerializedName("coverImage") val coverImage: String? = null,
    @SerializedName("readingTimeMin") val readingTimeMin: Int = 1,
    @SerializedName("likesCnt") val likesCnt: Int = 0,
    @SerializedName("commentsCnt") val commentsCnt: Int = 0,
    @SerializedName("bookmarksCnt") val bookmarksCnt: Int = 0,
    @SerializedName("createdAt") val createdAt: String = "",
    @SerializedName("contentUpdatedAt") val contentUpdatedAt: String? = null,
    @SerializedName("author") val author: AuthorDto = AuthorDto(),
    @SerializedName("isLiked") val isLiked: Boolean = false,
    @SerializedName("isBookmarked") val isBookmarked: Boolean = false,
    @SerializedName("isFollowingAuthor") val isFollowingAuthor: Boolean = false
)

data class PostsResponseDto(
    @SerializedName("posts") val posts: List<PostDto> = emptyList(),
    @SerializedName("pagination") val pagination: PaginationDto
)

data class FeedResponseDto(
    @SerializedName("items") val items: List<PostDto>,
    @SerializedName("nextCursor") val nextCursor: String?,
    @SerializedName("feedSessionId") val feedSessionId: String,
    @SerializedName("rankingVersion") val rankingVersion: String
)

data class FeedBehaviorEventDto(
    @SerializedName("eventId") val eventId: String,
    @SerializedName("idempotencyKey") val idempotencyKey: String,
    @SerializedName("storyId") val storyId: String,
    @SerializedName("feedSessionId") val feedSessionId: String,
    @SerializedName("eventType") val eventType: String,
    @SerializedName("clientEventTime") val clientEventTime: String,
    @SerializedName("visibleFraction") val visibleFraction: Float? = null,
    @SerializedName("visibleMillis") val visibleMillis: Int? = null,
    @SerializedName("engagedSeconds") val engagedSeconds: Float? = null
)

data class FeedBehaviorBatchDto(
    @SerializedName("events") val events: List<FeedBehaviorEventDto>
)

data class FeedBehaviorOutcomeDto(
    @SerializedName("accepted") val accepted: Int,
    @SerializedName("duplicateOrRejected") val duplicateOrRejected: Int
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
    @SerializedName("updatedAt") val updatedAt: String? = null,
    @SerializedName("isMine") val isMine: Boolean = false,
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
    @SerializedName("isPublished") val isPublished: Boolean = true,
    @SerializedName("clientDraftId") val clientDraftId: String? = null,
    @SerializedName("languageCode") val languageCode: String = "und"
)

data class RelationStateRequestDto(
    @SerializedName("enabled") val enabled: Boolean,
)

data class AddCommentRequestDto(
    @SerializedName("content") val content: String,
    @SerializedName("parentId") val parentId: String? = null,
    @SerializedName("clientMutationId") val clientMutationId: String? = null,
)

data class UpdateCommentRequestDto(
    @SerializedName("content") val content: String,
)

data class InterestsResponseDto(
    @SerializedName("topicIds") val topicIds: List<String>,
)

data class UpdateInterestsRequestDto(
    @SerializedName("topicIds") val topicIds: List<String>,
)

data class EngagementPreferencesDto(
    @SerializedName("primaryIntent") val primaryIntent: String?,
    @SerializedName("onboardingVersion") val onboardingVersion: Int,
    @SerializedName("onboardingCompletedAt") val onboardingCompletedAt: String?,
    @SerializedName("preferenceCardState") val preferenceCardState: String,
    @SerializedName("preferenceCardUpdatedAt") val preferenceCardUpdatedAt: String? = null,
)

data class UpdateEngagementPreferencesRequestDto(
    @SerializedName("primaryIntent") val primaryIntent: String?,
    @SerializedName("onboardingVersion") val onboardingVersion: Int,
    @SerializedName("onboardingCompletedAt") val onboardingCompletedAt: String?,
    @SerializedName("preferenceCardState") val preferenceCardState: String,
)

data class UpdatePostRequestDto(
    @SerializedName("title") val title: String,
    @SerializedName("content") val content: String,
    @SerializedName("summary") val summary: String? = null,
    @SerializedName("category") val category: String,
    @SerializedName("coverImage") val coverImage: String? = null,
    @SerializedName("isPublished") val isPublished: Boolean = false,
    @SerializedName("clientDraftId") val clientDraftId: String? = null,
    @SerializedName("languageCode") val languageCode: String = "und"
)

data class DraftsResponseDto(
    @SerializedName("posts") val posts: List<PostDto>,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class MediaUploadResponseDto(
    @SerializedName("url") val url: String,
    @SerializedName("key") val key: String
)

data class UserProfileResponseDto(
    @SerializedName("user") val user: AuthorDto
)

data class ReadingHistoryItemDto(
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
    @SerializedName("progress") val progress: Float,
    @SerializedName("readSeconds") val readSeconds: Int,
    @SerializedName("firstReadAt") val firstReadAt: String,
    @SerializedName("lastReadAt") val lastReadAt: String
) {
    fun asPost() = PostDto(
        id = id,
        title = title,
        slug = slug,
        summary = summary,
        content = content,
        category = category,
        coverImage = coverImage,
        readingTimeMin = readingTimeMin,
        likesCnt = likesCnt,
        commentsCnt = commentsCnt,
        bookmarksCnt = bookmarksCnt,
        createdAt = createdAt,
        author = author,
        isLiked = isLiked,
        isBookmarked = isBookmarked
    )
}

data class ReadingHistorySummaryDto(
    @SerializedName("storiesRead") val storiesRead: Int,
    @SerializedName("hoursRead") val hoursRead: Float
)

data class ReadingHistoryResponseDto(
    @SerializedName("items") val items: List<ReadingHistoryItemDto>,
    @SerializedName("summary") val summary: ReadingHistorySummaryDto,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class ReadingProgressRequestDto(
    @SerializedName("progress") val progress: Float,
    @SerializedName("readSeconds") val readSeconds: Int = 0,
    @SerializedName("clientMutationId") val clientMutationId: String? = null
)

data class ReadingProgressResponseDto(
    @SerializedName("progress") val progress: Float,
    @SerializedName("readSeconds") val readSeconds: Int,
    @SerializedName("lastReadAt") val lastReadAt: String
)

data class NotificationActorDto(
    @SerializedName("id") val id: String?,
    @SerializedName("penName") val penName: String?,
    @SerializedName("fullName") val fullName: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?
)

data class NotificationDto(
    @SerializedName("id") val id: String,
    @SerializedName("kind") val kind: String,
    @SerializedName("message") val message: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("readAt") val readAt: String?,
    @SerializedName("postId") val postId: String?,
    @SerializedName("postTitle") val postTitle: String?,
    @SerializedName("actor") val actor: NotificationActorDto?
)

data class NotificationsResponseDto(
    @SerializedName("notifications") val notifications: List<NotificationDto>,
    @SerializedName("pagination") val pagination: PaginationDto
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
    @SerializedName("followingCount") val followingCount: Int,
    @SerializedName("storiesCount") val storiesCount: Int = 0,
    @SerializedName("applaudsReceived") val applaudsReceived: Int = 0,
    @SerializedName("quoteOfDay") val quoteOfDay: String? = null,
    @SerializedName("foundingWriterNumber") val foundingWriterNumber: Int? = null,
    @SerializedName("emailVerified") val emailVerified: Boolean = false
)


data class MyProfileResponseDto(
    @SerializedName("profile") val profile: MyProfileDto
)

data class MilestoneDto(
    @SerializedName("key") val key: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("icon") val icon: String,
    @SerializedName("progress") val progress: Int,
    @SerializedName("target") val target: Int,
    @SerializedName("earned") val earned: Boolean,
    @SerializedName("earnedAt") val earnedAt: String?
)

data class MilestoneSummaryDto(
    @SerializedName("earned") val earned: Int,
    @SerializedName("total") val total: Int
)

data class MilestoneJourneyDto(
    @SerializedName("milestones") val milestones: List<MilestoneDto>,
    @SerializedName("newlyEarned") val newlyEarned: List<MilestoneDto>,
    @SerializedName("summary") val summary: MilestoneSummaryDto
)

data class ReviewPromptConfigDto(
    @SerializedName("enabled") val enabled: Boolean = false,
    @SerializedName("rolloutPercent") val rolloutPercent: Int = 0,
    @SerializedName("minimumVersionCode") val minimumVersionCode: Int = 0,
    @SerializedName("excludedVersionCodes") val excludedVersionCodes: List<Int> = emptyList(),
    @SerializedName("eligibilityVersion") val eligibilityVersion: String = "review_eligibility_v1",
    @SerializedName("readerEnabled") val readerEnabled: Boolean = false,
    @SerializedName("writerEnabled") val writerEnabled: Boolean = false
)

data class AppVersionResponseDto(
    @SerializedName("latestVersionCode") val latestVersionCode: Int,
    @SerializedName("minSupportedVersionCode") val minSupportedVersionCode: Int,
    @SerializedName("updateUrl") val updateUrl: String,
    @SerializedName("reviewPrompt") val reviewPrompt: ReviewPromptConfigDto? = null
)

data class PushTokenRegistrationRequestDto(
    @SerializedName("token") val token: String,
    @SerializedName("platform") val platform: String = "android",
    @SerializedName("appVersionCode") val appVersionCode: Int,
    @SerializedName("notificationPermission") val notificationPermission: String,
    @SerializedName("installationId") val installationId: String? = null
)

data class PushTokenRevocationRequestDto(
    @SerializedName("token") val token: String,
    @SerializedName("installationId") val installationId: String? = null
)

data class NotificationPreferencesDto(
    @SerializedName("interactionsEnabled") val interactionsEnabled: Boolean = true,
    @SerializedName("followsEnabled") val followsEnabled: Boolean = true,
    @SerializedName("editorialEnabled") val editorialEnabled: Boolean = true,
    @SerializedName("publishingEnabled") val publishingEnabled: Boolean = true,
    @SerializedName("firstApplauseEnabled") val firstApplauseEnabled: Boolean = true,
    @SerializedName("commentsRepliesEnabled") val commentsRepliesEnabled: Boolean = true,
    @SerializedName("newFollowersEnabled") val newFollowersEnabled: Boolean = true,
    @SerializedName("followedWriterPublishedEnabled") val followedWriterPublishedEnabled: Boolean = true,
    @SerializedName("readingNudgesEnabled") val readingNudgesEnabled: Boolean = true,
    @SerializedName("draftNudgesEnabled") val draftNudgesEnabled: Boolean = true,
    @SerializedName("weeklyPromptEnabled") val weeklyPromptEnabled: Boolean = true,
    @SerializedName("dailyDigestEnabled") val dailyDigestEnabled: Boolean = true
)

data class NotificationPreferencesUpdateDto(
    @SerializedName("interactionsEnabled") val interactionsEnabled: Boolean? = null,
    @SerializedName("followsEnabled") val followsEnabled: Boolean? = null,
    @SerializedName("editorialEnabled") val editorialEnabled: Boolean? = null,
    @SerializedName("publishingEnabled") val publishingEnabled: Boolean? = null,
    @SerializedName("firstApplauseEnabled") val firstApplauseEnabled: Boolean? = null,
    @SerializedName("commentsRepliesEnabled") val commentsRepliesEnabled: Boolean? = null,
    @SerializedName("newFollowersEnabled") val newFollowersEnabled: Boolean? = null,
    @SerializedName("followedWriterPublishedEnabled") val followedWriterPublishedEnabled: Boolean? = null,
    @SerializedName("readingNudgesEnabled") val readingNudgesEnabled: Boolean? = null,
    @SerializedName("draftNudgesEnabled") val draftNudgesEnabled: Boolean? = null,
    @SerializedName("weeklyPromptEnabled") val weeklyPromptEnabled: Boolean? = null,
    @SerializedName("dailyDigestEnabled") val dailyDigestEnabled: Boolean? = null
)

data class AccountDeletionResponseDto(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String
)

data class UpsertMyProfileRequestDto(
    @SerializedName("penName") val penName: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("bio") val bio: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("location") val location: String? = null
)

data class UsersResponseDto(
    @SerializedName("users") val users: List<AuthorDto>,
    @SerializedName("pagination") val pagination: PaginationDto
)

data class TagDto(
    @SerializedName("name") val name: String,
    @SerializedName("count") val count: Int
)

data class TagsResponseDto(
    @SerializedName("tags") val tags: List<TagDto>
)

