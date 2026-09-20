package com.ibitvalley.writon.modern.core.auth

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AuthFailurePolicyTest {

    private val deletedUser = FirebaseAuthInvalidUserException(
        "ERROR_USER_NOT_FOUND",
        "There is no user record corresponding to this identifier. The user may have been deleted."
    )

    @Test
    fun deletedAccountIsExpectedAndInvalidatesAStaleSession() {
        assertFalse(AuthFailurePolicy.shouldReportNonFatal(deletedUser))
        assertTrue(AuthFailurePolicy.shouldInvalidateSession(deletedUser))
        assertEquals(
            "We couldn't find this account. It may have been deleted. You can create a new account or use another sign-in method.",
            AuthFailurePolicy.userMessage(deletedUser, "Sign-in failed.")
        )
    }

    @Test
    fun unexpectedProgrammingFailureRemainsObservable() {
        val unexpected = IllegalStateException("unexpected auth state")

        assertTrue(AuthFailurePolicy.shouldReportNonFatal(unexpected))
        assertFalse(AuthFailurePolicy.shouldInvalidateSession(unexpected))
        assertEquals("Sign-in failed.", AuthFailurePolicy.userMessage(unexpected, "Sign-in failed."))
    }

    @Test
    fun tooManyRequestsExceptionIsSuppressedFromNonFatalAndHasReassuringMessage() {
        val tooManyRequests = com.google.firebase.FirebaseTooManyRequestsException(
            "We have blocked all requests from this device due to unusual activity. Try again later."
        )

        assertFalse(AuthFailurePolicy.shouldReportNonFatal(tooManyRequests))
        assertFalse(AuthFailurePolicy.shouldInvalidateSession(tooManyRequests))
        assertEquals(
            "Too many requests. For your security, requests from this device are temporarily paused. Please try again in a few minutes.",
            AuthFailurePolicy.userMessage(tooManyRequests, "Sign-in failed.")
        )
    }
}
