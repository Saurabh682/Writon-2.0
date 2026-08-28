package com.ibitvalley.writon.modern.core.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GoogleSignInErrorMapperTest {

    @Test
    fun `developer error explains the Android OAuth configuration required`() {
        assertEquals(
            "Google Sign-In is not configured for this Android build. Add this app's SHA-1 certificate in Firebase, download a new google-services.json, then rebuild the app.",
            GoogleSignInErrorMapper.messageFor(statusCode = 10, fallbackMessage = "Developer error")
        )
    }

    @Test
    fun `cancelled sign-in returns no error message`() {
        assertNull(GoogleSignInErrorMapper.messageFor(statusCode = 12501, fallbackMessage = null))
    }

    @Test
    fun `unknown failure keeps the supplied safe message`() {
        assertEquals(
            "Something went wrong.",
            GoogleSignInErrorMapper.messageFor(statusCode = 8, fallbackMessage = "Something went wrong.")
        )
    }
}
