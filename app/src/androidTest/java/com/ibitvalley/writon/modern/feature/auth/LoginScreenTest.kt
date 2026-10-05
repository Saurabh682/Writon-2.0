package com.ibitvalley.writon.modern.feature.auth

import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.core.app.ApplicationProvider
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Rule
import org.junit.Test

class LoginScreenTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun googleProgressDisablesDuplicateRequests() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val opening = context.getString(R.string.auth_google_opening)
        composeRule.setContent {
            WritOnTheme {
                SocialButton(
                    text = opening,
                    icon = R.drawable.googleicon,
                    enabled = false,
                    isLoading = true,
                    onClick = { error("Pending sign-in must not be submitted again") }
                )
            }
        }
        composeRule.onNodeWithText(opening).assertIsDisplayed().assertIsNotEnabled()
    }

    @Test
    fun loginScreenRendersCredentialManagerEntryAndAccountCreation() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val emailHint = context.getString(R.string.auth_email_or_user_hint)
        val passwordPlaceholder = context.getString(R.string.auth_password_placeholder)
        val googleSignIn = context.getString(R.string.auth_google_sign_in)
        val signUp = context.getString(R.string.auth_create_account)

        var signUpClicked = false
        composeRule.setContent {
            WritOnTheme {
                LoginScreen(
                    onBackClick = {},
                    onSignInClick = {},
                    onSignUpClick = { signUpClicked = true },
                )
            }
        }

        composeRule.onAllNodesWithText(emailHint)[0].assertIsDisplayed()
        composeRule.onNodeWithText(passwordPlaceholder).assertIsDisplayed()
        composeRule.onNodeWithText(googleSignIn).performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText(signUp, substring = true).performScrollTo().assertIsDisplayed().performClick()
        composeRule.runOnIdle { check(signUpClicked) }
    }
}
