package com.ibitvalley.writon.modern.feature.auth

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Rule
import org.junit.Test

class SignupScreenTest {
    @get:Rule val rule = createAndroidComposeRule<ComponentActivity>()

    @Test fun signupExposesAccountFieldsRecoveryEntryAndLegalLinks() {
        rule.setContent {
            WritOnTheme { SignupScreen(onBackClick = {}, onSignInClick = {}, onCreateAccountClick = {}) }
        }

        rule.onNodeWithText("Create your WritOn account").assertIsDisplayed()
        rule.onNodeWithText("Full name").assertExists()
        rule.onNodeWithText("Email address").assertExists()
        rule.onNodeWithText("Username").assertExists()
        rule.onNodeWithText("Password").assertExists()
        rule.onNodeWithText("Confirm password").assertExists()
        rule.onNodeWithText("Terms of Service", substring = true).performScrollTo().assertIsDisplayed()
        rule.onNodeWithText("Privacy Policy", substring = true).assertIsDisplayed()
        rule.onAllNodesWithContentDescription("Show password").assertCountEquals(2)
    }
}
