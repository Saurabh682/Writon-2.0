package com.ibitvalley.writon.modern.feature.onboarding

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class InterestsScreenTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun selectedTopicsAreVisibleAndContinueReturnsTheCurrentSelection() {
        var continuedWith: Set<String>? = null

        composeRule.setContent {
            WritOnTheme {
                InterestsScreen(
                    initialSelectedTopicIds = setOf("poetry"),
                    availableTopics = listOf(InterestTopicOption("poetry", "Poetry"), InterestTopicOption("essays", "Essays")),
                    isSaving = false,
                    errorMessage = null,
                    onBackClick = {},
                    onContinueClick = { continuedWith = it },
                    onContinueWithSavedChoices = {},
                    onSkipClick = {},
                )
            }
        }

        composeRule.onNodeWithContentDescription("Poetry, Selected").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Essays, Not selected").performClick()
        composeRule.onNodeWithContentDescription("Essays, Selected").assertIsDisplayed()
        composeRule.onNodeWithText("2 topics selected").assertIsDisplayed()
        composeRule.onNodeWithText("Find my reads").performClick()

        composeRule.runOnIdle {
            assertEquals(setOf("poetry", "essays"), continuedWith)
        }
    }

    @Test
    fun interestsRemainOptionalAndSkipIsImmediatelyAvailable() {
        var continuedWith: Set<String>? = null
        var skipped = false

        composeRule.setContent {
            WritOnTheme {
                InterestsScreen(
                    initialSelectedTopicIds = emptySet(),
                    availableTopics = listOf(InterestTopicOption("poetry", "Poetry")),
                    isSaving = false,
                    errorMessage = null,
                    onBackClick = {},
                    onContinueClick = { continuedWith = it },
                    onContinueWithSavedChoices = {},
                    onSkipClick = { skipped = true },
                )
            }
        }

        composeRule.onNodeWithText("Explore all stories").performClick()
        composeRule.onNodeWithText("Skip").performClick()

        composeRule.runOnIdle {
            assertEquals(emptySet<String>(), continuedWith)
            assertEquals(true, skipped)
        }
    }
}
