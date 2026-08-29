package com.ibitvalley.writon.modern.feature.comments

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.ibitvalley.writon.modern.core.database.model.CommentEntity
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class CommentsScreenTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun replyExpandsUnderItsParentAndSubmitsWithTheParentId() {
        var submitted: Pair<String, String?>? = null
        val comments = listOf(
            comment(id = "root-1", author = "Root Author", content = "Root response"),
            comment(id = "reply-1", author = "Reply Author", content = "Nested response", parentId = "root-1"),
        )

        composeRule.setContent {
            WritOnTheme {
                CommentsScreen(
                    comments = comments,
                    totalCount = 2,
                    onBackClick = {},
                    onSubmitComment = { content, parentId -> submitted = content to parentId },
                )
            }
        }

        composeRule.onNodeWithText("View 1 reply").performClick()
        composeRule.onNodeWithText("Nested response").assertIsDisplayed()
        composeRule.onNodeWithText("Reply to @Root Author").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Reply to Reply Author").performClick()
        composeRule.onNodeWithText("Replying to @Reply Author").assertIsDisplayed()
        composeRule.onNodeWithText("Write your reply…").performTextInput("Thanks")
        composeRule.onNodeWithContentDescription("Submit reply").performClick()

        composeRule.runOnIdle {
            assertEquals("Thanks" to "reply-1", submitted)
        }
    }

    private fun comment(
        id: String,
        author: String,
        content: String,
        parentId: String? = null,
    ) = CommentEntity(
        id = id,
        postId = "post-1",
        authorId = "author-$id",
        authorName = author,
        authorAvatarUrl = null,
        content = content,
        createdAt = "2026-08-29T10:00:00Z",
        parentId = parentId,
    )
}
