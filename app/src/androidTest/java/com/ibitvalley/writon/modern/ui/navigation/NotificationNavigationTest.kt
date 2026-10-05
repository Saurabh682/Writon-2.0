package com.ibitvalley.writon.modern.ui.navigation

import android.content.Intent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.ibitvalley.writon.modern.WritOnModernActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Exercises the real Activity/NavHost handoff without sending an FCM message. */
@RunWith(AndroidJUnit4::class)
class NotificationNavigationTest {
    @get:Rule val composeRule = createEmptyComposeRule()

    @Test fun coldStartNotificationOpensReaderAndStaysThereAfterRouteConsumption() {
        val intent = Intent(ApplicationProvider.getApplicationContext(), WritOnModernActivity::class.java)
            .putExtra("storyId", "notification-navigation-test")
        ActivityScenario.launch<WritOnModernActivity>(intent).use {
            assertReaderVisible()
        }
    }

    @Test fun backgroundNotificationReusesActivityAndOpensLinkedReader() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        ActivityScenario.launch<WritOnModernActivity>(Intent(context, WritOnModernActivity::class.java)).use { scenario ->
            val notificationIntent = Intent(context, WritOnModernActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("targetRoute", "/reader/notification-navigation-test")
            }
            scenario.onActivity { it.startActivity(notificationIntent) }
            assertReaderVisible()
        }
    }

    @Test fun linkedReaderSurvivesActivityRecreation() {
        val intent = Intent(ApplicationProvider.getApplicationContext(), WritOnModernActivity::class.java)
            .putExtra("storyId", "notification-navigation-test")
        ActivityScenario.launch<WritOnModernActivity>(intent).use { scenario ->
            assertReaderVisible()
            scenario.recreate()
            assertReaderVisible()
        }
    }

    private fun assertReaderVisible() {
        composeRule.waitUntil(30_000) {
            composeRule.onAllNodesWithText("Aa").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Aa").assertIsDisplayed()
    }
}
