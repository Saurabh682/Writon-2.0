package com.ibitvalley.writon.modern.core.auth

import org.junit.Assert.assertEquals
import org.junit.Test
import java.net.SocketTimeoutException

class ProfileSyncErrorMapperTest {
    @Test
    fun `timeout gives a retryable profile-service message`() {
        assertEquals(
            "WritOn's profile service is taking too long to respond. Please retry in a moment.",
            ProfileSyncErrorMapper.messageFor(error = SocketTimeoutException())
        )
    }

    @Test
    fun `rejected Firebase token explains the required reauthentication`() {
        assertEquals(
            "Your WritOn session was not accepted. Please sign in with Google again.",
            ProfileSyncErrorMapper.messageFor(statusCode = 401)
        )
    }

    @Test
    fun `username conflict explains the profile conflict`() {
        assertEquals(
            "That WritOn username is already taken. Please choose a different one.",
            ProfileSyncErrorMapper.messageFor(statusCode = 409)
        )
    }

    @Test
    fun `unavailable backend explains that the profile service can be retried`() {
        assertEquals(
            "WritOn's profile service is temporarily unavailable. Please try again shortly.",
            ProfileSyncErrorMapper.messageFor(statusCode = 503)
        )
    }
}
