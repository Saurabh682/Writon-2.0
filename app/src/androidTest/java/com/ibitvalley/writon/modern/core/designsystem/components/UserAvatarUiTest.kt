package com.ibitvalley.writon.modern.core.designsystem.components

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.core.app.ApplicationProvider
import coil.ImageLoader
import coil.intercept.Interceptor
import coil.request.ErrorResult
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Rule
import org.junit.Test

class UserAvatarUiTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun failedProfilePhotoShowsInitialsAndAccessibleDescription() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val failingImageLoader = ImageLoader.Builder(context)
            .components {
                add(Interceptor { chain ->
                    ErrorResult(
                        drawable = null,
                        request = chain.request,
                        throwable = IllegalStateException("Deterministic profile-photo failure")
                    )
                })
            }
            .build()

        val testName = "Kumar Saurabh"
        val expectedDescription = context.getString(R.string.profile_photo_content_description, testName)

        composeRule.setContent {
            WritOnTheme {
                UserAvatar(
                    url = "https://api.writon.cc/api/v1/media/profiles%2Ftest%2Fmissing.webp",
                    name = testName,
                    imageLoader = failingImageLoader,
                )
            }
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithTag("user-avatar-initials", useUnmergedTree = true).assertIsDisplayed()
        composeRule.onNodeWithContentDescription(expectedDescription).assertIsDisplayed()
    }
}
