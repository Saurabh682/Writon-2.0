package com.ibitvalley.writon.modern.feature.auth

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Rule
import org.junit.Test

class LoginScreenTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun loginScreenRegistersItsGoogleResultLauncherInsideAnActivity() {
        composeRule.setContent {
            WritOnTheme {
                LoginScreen(
                    onBackClick = {},
                    onSignInClick = {},
                    onSignUpClick = {},
                )
            }
        }

        composeRule.onNodeWithText("Enter your email or username").assertIsDisplayed()
        composeRule.onNodeWithText("Enter your password").assertIsDisplayed()
    }
}
