package com.ibitvalley.writon.modern.feature.reader.card

import com.ibitvalley.writon.modern.cardStoryShareUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StoryCardExportTest {

    @Test
    fun cardStoryShareUrl_appendsSrcCardUtmParameter() {
        val slug = "my-literary-essay"
        val url = cardStoryShareUrl(slug)
        assertTrue(url.contains("writon.cc/stories/my-literary-essay"))
        assertTrue(url.endsWith("?src=card"))
    }

    @Test
    fun cardExportSizes_haveProperDimensionsAndLimits() {
        assertEquals(4, CardExportSize.entries.size)

        val storySize = CardExportSize.STORY_9_16
        assertEquals(1080, storySize.targetWidthPx)
        assertEquals(1920, storySize.targetHeightPx)
        assertEquals(280, storySize.maxChars)

        val portraitSize = CardExportSize.PORTRAIT_4_5
        assertEquals(1080, portraitSize.targetWidthPx)
        assertEquals(1350, portraitSize.targetHeightPx)
        assertEquals(220, portraitSize.maxChars)

        val squareSize = CardExportSize.SQUARE_1_1
        assertEquals(1080, squareSize.targetWidthPx)
        assertEquals(1080, squareSize.targetHeightPx)
        assertEquals(180, squareSize.maxChars)

        val landscapeSize = CardExportSize.LANDSCAPE_16_9
        assertEquals(1200, landscapeSize.targetWidthPx)
        assertEquals(675, landscapeSize.targetHeightPx)
        assertEquals(140, landscapeSize.maxChars)
    }

    @Test
    fun excerptSuggester_extractsCleanSentence() {
        val markdownContent = """
            # Opening Chapter
            
            This is an exquisite opening observation exploring literature and life in depth.
            
            Here is a second paragraph that continues the journey through ideas.
        """.trimIndent()

        val excerpt = ExcerptSuggester.suggestExcerpt(markdownContent, "Opening Chapter")
        assertNotNull(excerpt)
        assertTrue(excerpt.isNotBlank())
        assertTrue(!excerpt.contains("#"))
        assertTrue(excerpt.contains("opening observation") || excerpt.contains("second paragraph"))
    }

    @Test
    fun excerptSuggester_fallsBackToTitleWhenContentIsBlank() {
        val excerpt = ExcerptSuggester.suggestExcerpt("", "Fallback Title")
        assertEquals("Fallback Title", excerpt)
    }
}
