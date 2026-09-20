package com.ibitvalley.writon.modern.feature.auth

import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Rule
import org.junit.Test

class LoginScreenTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun loginScreenRendersCredentialManagerEntryAndAccountCreation() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val emailHint = context.getString(R.string.auth_email_hint)
        val passwordPlaceholder = context.getString(R.string.auth_password_placeholder)
        val googleSignIn = context.getString(R.string.auth_google_sign_in)
        val createAccount = context.getString(R.string.auth_create_account)

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
        composeRule.onNodeWithText(googleSignIn).assertIsDisplayed()
        composeRule.onNodeWithText(createAccount).assertIsDisplayed().performClick()
        composeRule.runOnIdle { check(signUpClicked) }
    }
}
