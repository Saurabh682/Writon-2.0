package com.ibitvalley.writon.modern.feature.feed

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ExistingUserPreferencesCardTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun cardOffersNonBlockingChooseAndDismissActions() {
        var chose = false
        var dismissed = false
        composeRule.setContent {
            WritOnTheme {
                ExistingUserPreferencesCard(
                    onChoose = { chose = true },
                    onDismiss = { dismissed = true },
                )
            }
        }

        composeRule.onNodeWithText("Make WritOn yours").assertIsDisplayed()
        composeRule.onNodeWithText("Choose interests").performClick()
        composeRule.onNodeWithText("Not now").performClick()

        composeRule.runOnIdle {
            assertTrue(chose)
            assertTrue(dismissed)
        }
    }
}
