package com.ibitvalley.writon.modern.feature.editor

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class EditorValidationTest {
    @Test fun `publish requires title and content`() {
        assertEquals("Add a title and story before publishing.", validateStoryForPublish(" ", ""))
        assertEquals("Add a title before publishing.", validateStoryForPublish("", "Story"))
        assertEquals("Add your story before publishing.", validateStoryForPublish("Title", ""))
    }

    @Test fun `complete story can publish`() {
        assertNull(validateStoryForPublish("Title", "Story"))
    }
}
