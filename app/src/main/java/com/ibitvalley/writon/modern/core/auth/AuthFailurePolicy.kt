package com.ibitvalley.writon.modern.core.auth

import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseAuthInvalidUserException

object AuthFailurePolicy {
    fun shouldReportNonFatal(error: Throwable): Boolean {
        val unwrapped = unwrap(error)
        if (unwrapped is FirebaseTooManyRequestsException) return false
        return unwrapped !is FirebaseAuthException
    }

    fun shouldInvalidateSession(error: Throwable): Boolean =
        unwrap(error) is FirebaseAuthInvalidUserException

    fun userMessage(error: Throwable, fallback: String): String {
        val unwrapped = unwrap(error)
        if (unwrapped is FirebaseTooManyRequestsException) {
            return "Too many requests. For your security, requests from this device are temporarily paused. Please try again in a few minutes."
        }
        val authError = unwrapped as? FirebaseAuthException ?: return fallback
        return when (authError.errorCode) {
            "ERROR_TOO_MANY_REQUESTS" ->
                "Too many attempts. For your security, requests from this device are temporarily paused. Please wait a few minutes and try again."
            "ERROR_USER_NOT_FOUND",
            "ERROR_USER_TOKEN_EXPIRED",
            "ERROR_USER_MISMATCH" ->
                "We couldn't find this account. It may have been deleted. You can create a new account or use another sign-in method."
            "ERROR_USER_DISABLED" ->
                "This account has been disabled. Please contact support if you think this is a mistake."
            else -> authError.localizedMessage?.takeIf(String::isNotBlank) ?: fallback
        }
    }

    private fun unwrap(error: Throwable): Throwable {
        var current = error
        val visited = mutableSetOf<Throwable>()
        while (visited.add(current)) {
            current = current.cause ?: return current
        }
        return current
    }
}
