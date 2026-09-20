package com.ibitvalley.writon.modern.feature.editor

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import org.junit.Rule
import org.junit.Test

class EditorBodyFieldTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun writingPadShowsFormattedTextInsteadOfMarkdownCode() {
        composeRule.setContent {
            WritOnTheme {
                EditorBodyField(
                    value = TextFieldValue("**hdjehhjs**", TextRange(12)),
                    onValueChange = {},
                    modifier = Modifier.fillMaxSize()
                )
            }
        }

        composeRule.onNodeWithContentDescription("Story content")
            .assertTextEquals("hdjehhjs")
    }
}
