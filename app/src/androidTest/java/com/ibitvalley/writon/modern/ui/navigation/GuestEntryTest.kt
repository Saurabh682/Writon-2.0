package com.ibitvalley.writon.modern.ui.navigation

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.mutableStateOf
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.dp
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import com.ibitvalley.writon.modern.feature.welcome.WelcomeScreen
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class GuestEntryTest {
    @get:Rule val rule = createAndroidComposeRule<ComponentActivity>()

    @Test fun visitorCanContinueOnTheFirstWelcomePage() {
        var visits = 0
        rule.setContent {
            WritOnTheme { WelcomeScreen({}, {}, { visits++ }) }
        }
        rule.onNodeWithText("Start reading").assertIsDisplayed().performClick()
        rule.onNodeWithText("I want to write").assertIsDisplayed()
        rule.onNodeWithText("I already have an account").assertIsDisplayed()
        rule.onNodeWithText("Terms of Service").performScrollTo().assertIsDisplayed()
        rule.onNodeWithText("Privacy Policy").assertIsDisplayed()
        rule.runOnIdle { assertEquals(1, visits) }
    }

    @Test fun allEntryChoicesAreVisibleOnACompactScreen() {
        rule.setContent {
            WritOnTheme {
                Box(Modifier.size(width = 360.dp, height = 720.dp)) {
                    WelcomeScreen({}, {}, {})
                }
            }
        }

        rule.onNodeWithText("Start reading").assertIsDisplayed()
        rule.onNodeWithText("I want to write").assertIsDisplayed()
        rule.onNodeWithText("I already have an account").assertIsDisplayed()
    }

    @Test fun skipPreservesReadingWithoutSigningIn() {
        val visible = mutableStateOf(true)
        var signIns = 0
        rule.setContent {
            WritOnTheme {
                Text("Reading remains open")
                if (visible.value) GuestSignInPrompt({ signIns++ }, { visible.value = false })
            }
        }
        rule.onNodeWithText("Keep reading").performClick()
        rule.onNodeWithText("Reading remains open").assertIsDisplayed()
        rule.runOnIdle { assertEquals(0, signIns) }
    }

    @Test fun signInIsExplicit() {
        var signIns = 0
        rule.setContent { WritOnTheme { GuestSignInPrompt({ signIns++ }, {}) } }
        rule.onNodeWithText("Sign in").performClick()
        rule.runOnIdle { assertEquals(1, signIns) }
    }
}
