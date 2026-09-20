package com.ibitvalley.writon.modern.ui.navigation

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.google.firebase.auth.FirebaseAuth
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.WritOnModernActivity
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test

/** Runs against the actual activity, without deleting preferences or account data. */
class GuestNavigationSmokeTest {
    @get:Rule val rule = createAndroidComposeRule<WritOnModernActivity>()

    @Test fun visitorNavigationAndDismissalSurviveRepeatedTransitions() {
        val isSignedOut = runCatching {
            FirebaseAuth.getInstance().currentUser == null
        }.getOrDefault(true)
        assumeTrue("Use a signed-out tester device", isSignedOut)
        val context = ApplicationProvider.getApplicationContext<Context>()
        val startReadingText = context.getString(R.string.welcome_start_reading)
        val homeText = context.getString(R.string.nav_home)
        val exploreText = context.getString(R.string.nav_explore)
        val libraryText = context.getString(R.string.nav_library)
        val keepReadingText = context.getString(R.string.guest_keep_reading)

        rule.waitUntil(20_000) {
            rule.onAllNodesWithText(startReadingText).fetchSemanticsNodes().isNotEmpty() ||
                rule.onAllNodesWithText("Continue as a visitor").fetchSemanticsNodes().isNotEmpty() ||
                rule.onAllNodesWithText(homeText).fetchSemanticsNodes().isNotEmpty()
        }
        if (rule.onAllNodesWithText(startReadingText).fetchSemanticsNodes().isNotEmpty()) {
            rule.onNodeWithText(startReadingText).performClick()
        } else if (rule.onAllNodesWithText("Continue as a visitor").fetchSemanticsNodes().isNotEmpty()) {
            rule.onNodeWithText("Continue as a visitor").performClick()
        }
        repeat(3) {
            rule.onNodeWithText(exploreText).performClick()
            rule.onNodeWithText(homeText).performClick()
            rule.onNodeWithText(libraryText).performClick()
            rule.onNodeWithText(keepReadingText).assertIsDisplayed().performClick()
            rule.onNodeWithText(homeText).assertIsDisplayed()
        }
        rule.activityRule.scenario.recreate()
        rule.waitUntil(20_000) { rule.onAllNodesWithText(homeText).fetchSemanticsNodes().isNotEmpty() }
        rule.onNodeWithText(homeText).assertIsDisplayed()
    }
}
