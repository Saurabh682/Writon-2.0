package com.ibitvalley.writon.modern.core.preferences

import org.junit.Assert.assertEquals
import org.junit.Test

class ReaderPreferencesTest {
    @Test fun `reader choices stay within supported values`() {
        val normalized = ReaderPreferences(40f, 0.5f, "comic").normalized()
        assertEquals(24f, normalized.fontSizeSp)
        assertEquals(1.3f, normalized.lineHeightMultiplier)
        assertEquals("serif", normalized.fontFamily)
    }

    @Test fun `valid reader choices remain unchanged`() {
        val selected = ReaderPreferences(21f, 1.9f, "sans")
        assertEquals(selected, selected.normalized())
    }
}
