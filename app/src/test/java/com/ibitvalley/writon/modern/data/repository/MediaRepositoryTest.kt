package com.ibitvalley.writon.modern.data.repository

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Assert.fail
import org.junit.Test
import java.io.InputStream

class MediaRepositoryTest {
    @Test
    fun `uploaded media uses the configured API origin rather than a revision host`() {
        val url = canonicalUploadedMediaUrl("profiles/test-user/avatar.webp")

        assertTrue(url.contains("/api/v1/media/profiles%2Ftest-user%2Favatar.webp"))
        assertFalse(url.contains("run.app"))
    }

    @Test
    fun `bounded image reader stops immediately after the upload limit`() {
        val stream = CountingInputStream(totalBytes = 1_024)

        try {
            readImageBytes(stream, maxBytes = 32)
            fail("Oversized images must be rejected.")
        } catch (_: IllegalArgumentException) {
            assertTrue("The whole oversized image must not be loaded into memory.", stream.bytesRead <= 33)
        }
    }

    @Test
    fun `bounded image reader returns an image within the upload limit`() {
        val bytes = byteArrayOf(1, 2, 3, 4)

        assertArrayEquals(bytes, readImageBytes(bytes.inputStream(), maxBytes = bytes.size))
    }

    @Test
    fun `upload failures preserve the actionable server message`() {
        val message = mediaUploadFailureMessage(
            statusCode = 415,
            responseBody = """{"error":"Only JPEG, PNG, and WebP images are supported."}"""
        )

        assertTrue(message.contains("JPEG, PNG, and WebP"))
    }

    @Test
    fun `upload failures fall back safely when the server body is unavailable`() {
        assertTrue(mediaUploadFailureMessage(502, null).contains("502"))
        assertTrue(mediaUploadFailureMessage(500, "not-json").contains("500"))
    }

    private class CountingInputStream(private val totalBytes: Int) : InputStream() {
        var bytesRead: Int = 0
            private set

        override fun read(): Int {
            if (bytesRead >= totalBytes) return -1
            bytesRead += 1
            return 1
        }

        override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
            if (bytesRead >= totalBytes) return -1
            val count = minOf(length, totalBytes - bytesRead)
            repeat(count) { index -> buffer[offset + index] = 1 }
            bytesRead += count
            return count
        }
    }
}
