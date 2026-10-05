package com.ibitvalley.writon.modern.core.preferences

import org.junit.Assert.assertEquals
import org.junit.Test
import com.ibitvalley.writon.modern.core.designsystem.theme.getThemeColorScheme
import com.ibitvalley.writon.modern.core.designsystem.theme.resolveReaderThemeMode

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

    @Test fun `reader follows app theme unless a reader override is selected`() {
        assertEquals("dark", resolveReaderThemeMode("app", "dark"))
        assertEquals("sepia", resolveReaderThemeMode("sepia", "dark"))
        assertEquals(
            getThemeColorScheme("dark", false).background,
            getThemeColorScheme(resolveReaderThemeMode("app", "dark"), false).background
        )
    }
}
