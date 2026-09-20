package com.ibitvalley.writon.modern.feature.onboarding

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class IntentOnboardingScreenTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun choosingReadSavesBeforeContinuing() {
        var savedIntent: String? = null
        var continued = false
        composeRule.setContent {
            WritOnTheme {
                IntentOnboardingScreen(
                    initialIntent = null,
                    onBackClick = {},
                    onIntentSaved = { savedIntent = it; true },
                    onContinue = { continued = true },
                )
            }
        }

        composeRule.onNodeWithText("1 of 2").assertIsDisplayed()
        composeRule.onNodeWithText("Continue").assertIsNotEnabled()
        composeRule.onNodeWithText("Read").performClick()
        composeRule.onNodeWithText("Continue").performClick()

        composeRule.runOnIdle {
            assertEquals("read", savedIntent)
            assertTrue(continued)
        }
    }

    @Test
    fun failedLocalSaveDoesNotAdvance() {
        var continued = false
        composeRule.setContent {
            WritOnTheme {
                IntentOnboardingScreen(
                    initialIntent = "write",
                    onBackClick = {},
                    onIntentSaved = { false },
                    onContinue = { continued = true },
                )
            }
        }

        composeRule.onNodeWithText("Continue").performClick()
        composeRule.runOnIdle { assertFalse(continued) }
    }

    @Test
    fun skipPersistsUnknownIntentAndAdvances() {
        var savedIntent: String? = "unchanged"
        var continued = false
        composeRule.setContent {
            WritOnTheme {
                IntentOnboardingScreen(
                    initialIntent = "both",
                    onBackClick = {},
                    onIntentSaved = { savedIntent = it; true },
                    onContinue = { continued = true },
                )
            }
        }

        composeRule.onNodeWithText("Skip").performClick()
        composeRule.runOnIdle {
            assertEquals(null, savedIntent)
            assertTrue(continued)
        }
    }
}
