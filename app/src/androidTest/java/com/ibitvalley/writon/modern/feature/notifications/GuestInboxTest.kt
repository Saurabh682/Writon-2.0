package com.ibitvalley.writon.modern.feature.notifications

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.database.dao.IncomingStoryEntity
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.feature.collections.CollectionsViewModel
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import java.lang.reflect.Proxy
import java.util.concurrent.atomic.AtomicInteger

class GuestInboxTest {
    @get:Rule val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test fun guestCanOpenAndDismissLocalLinkWithoutAuthenticatedRequests() {
        val requests = AtomicInteger()
        val api = Proxy.newProxyInstance(
            WritOnApiService::class.java.classLoader,
            arrayOf(WritOnApiService::class.java),
        ) { _, _, _ ->
            requests.incrementAndGet()
            error("Guest inbox must not request authenticated activity")
        } as WritOnApiService
        val model = CollectionsViewModel(api)
        val entry = IncomingStoryEntity("device", "saved-story", title = "A retained read", source = "shared", receivedAt = 1)
        var opened: IncomingStoryEntity? = null
        var dismissed: IncomingStoryEntity? = null
        composeRule.setContent {
            WritOnTheme {
                NotificationsScreen(
                    viewModel = model,
                    showServerActivities = false,
                    incomingStories = listOf(entry),
                    onIncomingStoryClick = { opened = it },
                    onDismissIncomingStory = { dismissed = it },
                )
            }
        }
        composeRule.onNodeWithText("A retained read").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.activity.getString(R.string.notifications_open_link)).performClick()
        composeRule.onNodeWithText("A retained read").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.activity.getString(R.string.notifications_dismiss_link)).performClick()
        composeRule.runOnIdle {
            assertEquals(entry, opened)
            assertEquals(entry, dismissed)
            assertEquals(0, requests.get())
        }
    }
}
