package com.ibitvalley.writon.modern.ui.navigation

import android.content.Intent
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.ibitvalley.writon.modern.WritOnModernActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import com.google.gson.JsonParser
import java.net.HttpURLConnection
import java.net.URL

/** Live source-feed and drawer navigation smoke check on the connected test device. */
@RunWith(AndroidJUnit4::class)
class EditorialExploreNavigationTest {
    @get:Rule val compose = createEmptyComposeRule()

    @Test fun homeSwipesOpenExploreAndEditorialHasItsOwnTab() {
        val communityTitle = firstStoryTitle("community")
        val editorialTitle = firstStoryTitle("editorial")
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val intent = Intent(context, WritOnModernActivity::class.java).putExtra("targetRoute", "home")
        ActivityScenario.launch<WritOnModernActivity>(intent).use { scenario ->
            compose.waitUntil(30_000) {
                compose.onAllNodesWithText("From the community").fetchSemanticsNodes().isNotEmpty()
            }
            waitForStory(communityTitle)
            assertExploreFullyClosed()
            scenario.recreate()
            compose.waitForIdle()
            waitForStory(communityTitle)
            assertExploreFullyClosed()
            compose.onRoot().performTouchInput {
                swipe(start = androidx.compose.ui.geometry.Offset(width * 0.1f, height * 0.2f),
                    end = androidx.compose.ui.geometry.Offset(width * 0.9f, height * 0.2f),
                    durationMillis = 500)
            }
            compose.waitForIdle()
            compose.onNodeWithTag("explore_drawer", useUnmergedTree = true).assertIsDisplayed()
            compose.onNodeWithText("Close Explore").assertIsDisplayed().performClick()
            compose.waitForIdle()
            assertExploreFullyClosed()
            compose.onNodeWithText("Editorial").performClick()
            compose.onNodeWithText("WritOn editorial and bot-created stories").assertIsDisplayed()
            waitForStory(editorialTitle)
            compose.onNodeWithText("Explore").performClick()
            compose.waitForIdle()
            compose.onNodeWithTag("explore_drawer", useUnmergedTree = true).assertIsDisplayed()
            compose.onNodeWithText("Close Explore").assertIsDisplayed()
            // System Back closes the window without abandoning the Editorial tab.
            androidx.test.espresso.Espresso.pressBack()
            compose.waitForIdle()
            assertExploreFullyClosed()
            compose.onNodeWithText("WritOn editorial and bot-created stories").assertIsDisplayed()
            waitForStory(editorialTitle)
        }
    }

    private fun assertExploreFullyClosed() {
        // Fully clipped drawer nodes are omitted from Compose's semantics tree.
        if (compose.onAllNodesWithTag("explore_drawer", useUnmergedTree = true)
                .fetchSemanticsNodes().isEmpty()) return
        val bounds = compose.onNodeWithTag("explore_drawer", useUnmergedTree = true)
            .getUnclippedBoundsInRoot()
        check(bounds.right.value <= 0.5f) {
            "Closed Explore drawer still covers the feed: $bounds"
        }
    }

    private fun firstStoryTitle(audience: String): String {
        val connection = URL("https://api.writon.cc/api/v1/$audience/posts?limit=1").openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 15_000
        try {
            check(connection.responseCode == 200) { "Hosted source feed unavailable" }
            val payload = connection.inputStream.bufferedReader().use { JsonParser.parseReader(it).asJsonObject }
            return payload.getAsJsonArray("posts")[0].asJsonObject.get("title").asString
        } finally { connection.disconnect() }
    }

    private fun waitForStory(title: String) {
        compose.waitUntil(30_000) { compose.onAllNodesWithText(title).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText(title).assertIsDisplayed()
    }
}
