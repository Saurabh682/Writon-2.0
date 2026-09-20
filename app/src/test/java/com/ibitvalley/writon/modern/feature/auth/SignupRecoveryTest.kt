package com.ibitvalley.writon.modern.feature.auth

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SignupRecoveryTest {
    @Test fun `profile retry never creates the Firebase identity again`() {
        assertTrue(shouldCreateFirebaseIdentity(null))
        assertFalse(shouldCreateFirebaseIdentity("email"))
        assertFalse(shouldCreateFirebaseIdentity("google"))
    }

    @Test fun `profile recovery does not require retaining a password`() {
        assertTrue(
            canSubmitSignupForm(
                pendingProfileKind = "email",
                fullName = "Kumar Saurabh",
                email = "",
                username = "frozen_song",
                password = "",
                confirmPassword = "",
                agreedToTerms = true,
            )
        )
    }

    @Test fun `new identity creation still requires a valid confirmed password`() {
        assertFalse(
            canSubmitSignupForm(
                pendingProfileKind = null,
                fullName = "Kumar Saurabh",
                email = "reader@example.com",
                username = "frozen_song",
                password = "short",
                confirmPassword = "short",
                agreedToTerms = true,
            )
        )
        assertTrue(
            canSubmitSignupForm(
                pendingProfileKind = null,
                fullName = "Kumar Saurabh",
                email = "reader@example.com",
                username = "frozen_song",
                password = "long-enough",
                confirmPassword = "long-enough",
                agreedToTerms = true,
            )
        )
    }
}
