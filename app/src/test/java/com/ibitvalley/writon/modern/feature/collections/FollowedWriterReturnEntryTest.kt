package com.ibitvalley.writon.modern.feature.collections

import com.ibitvalley.writon.modern.core.network.model.AuthorDto
import com.ibitvalley.writon.modern.core.network.model.NotificationActorDto
import com.ibitvalley.writon.modern.core.network.model.NotificationDto
import com.ibitvalley.writon.modern.core.network.model.NotificationPreferencesDto
import com.ibitvalley.writon.modern.core.network.model.ReadingHistoryItemDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FollowedWriterReturnEntryTest {
    @Test
    fun `selects the first unread followed-writer story`() {
        val entry = selectFollowedWriterReturnEntry(
            preferences = NotificationPreferencesDto(followedWriterPublishedEnabled = true),
            notifications = listOf(notification("other", "comment"), notification("story-1")),
            history = emptyList(),
        )

        assertEquals("story-1", entry?.storyId)
        assertEquals("Asha", entry?.writerName)
    }

    @Test
    fun `hides completed stories and accepts the preserved publishing alias`() {
        val entry = selectFollowedWriterReturnEntry(
            preferences = NotificationPreferencesDto(followedWriterPublishedEnabled = true),
            notifications = listOf(notification("done"), notification("fresh", "publishing")),
            history = listOf(history("done", progress = 0.7f)),
        )

        assertEquals("fresh", entry?.storyId)
    }

    @Test
    fun `notification preference remains authoritative`() {
        val entry = selectFollowedWriterReturnEntry(
            preferences = NotificationPreferencesDto(followedWriterPublishedEnabled = false),
            notifications = listOf(notification("story-1")),
            history = emptyList(),
        )

        assertNull(entry)
    }

    private fun notification(postId: String, kind: String = "followed_writer_published") = NotificationDto(
        id = "notification-$postId",
        kind = kind,
        message = "published a new story",
        createdAt = "2026-09-11T08:00:00Z",
        readAt = null,
        postId = postId,
        postTitle = "A new story",
        actor = NotificationActorDto("writer-1", "asha", "Asha", null),
    )

    private fun history(id: String, progress: Float) = ReadingHistoryItemDto(
        id = id,
        title = "Read story",
        slug = "read-story",
        summary = null,
        content = "",
        category = "Essays",
        coverImage = null,
        readingTimeMin = 3,
        likesCnt = 0,
        commentsCnt = 0,
        bookmarksCnt = 0,
        createdAt = "2026-09-10T08:00:00Z",
        author = AuthorDto(),
        progress = progress,
        readSeconds = 180,
        firstReadAt = "2026-09-10T08:00:00Z",
        lastReadAt = "2026-09-10T08:03:00Z",
    )
}
