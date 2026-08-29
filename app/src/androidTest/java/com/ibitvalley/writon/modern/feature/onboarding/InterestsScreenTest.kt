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
                    isSaving = false,
                    errorMessage = null,
                    onBackClick = {},
                    onContinueClick = { continuedWith = it },
                    onContinueWithSavedChoices = {},
                    onSkipClick = {},
                )
            }
        }

        composeRule.onNodeWithContentDescription("Poetry, selected").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Essays, not selected").performClick()
        composeRule.onNodeWithContentDescription("Essays, selected").assertIsDisplayed()
        composeRule.onNodeWithText("2 topics selected").assertIsDisplayed()
        composeRule.onNodeWithText("Continue").performClick()

        composeRule.runOnIdle {
            assertEquals(setOf("poetry", "essays"), continuedWith)
        }
    }
}
