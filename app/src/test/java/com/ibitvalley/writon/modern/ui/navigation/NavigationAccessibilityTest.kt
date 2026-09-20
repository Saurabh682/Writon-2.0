package com.ibitvalley.writon.modern.ui.navigation

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationAccessibilityTest {
    @Test fun `bottom labels yield to accessible icons at large text`() {
        // Catches overlapping labels that make the five-item bottom bar unreadable at 200% text.
        assertTrue(shouldShowBottomNavLabels(1.0f))
        assertTrue(shouldShowBottomNavLabels(1.29f))
        assertFalse(shouldShowBottomNavLabels(1.3f))
        assertFalse(shouldShowBottomNavLabels(2.0f))
    }
}
