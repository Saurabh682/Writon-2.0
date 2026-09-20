package com.ibitvalley.writon.modern.core.designsystem.components

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StoryCoverImageTest {
    @Test
    fun `uses category artwork when cover is missing or fails to load`() {
        assertTrue(shouldUseCategoryCover(null, remoteImageFailed = false))
        assertTrue(shouldUseCategoryCover("", remoteImageFailed = false))
        assertTrue(shouldUseCategoryCover("https://retired.example/cover.webp", remoteImageFailed = true))
        assertFalse(shouldUseCategoryCover("https://images.example/cover.webp", remoteImageFailed = false))
    }
}
