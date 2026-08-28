package com.ibitvalley.writon.modern.core.auth

/** Maps Play services status codes to actionable, non-sensitive UI messages. */
object GoogleSignInErrorMapper {

    private const val DEVELOPER_ERROR = 10
    private const val NETWORK_ERROR = 7
    private const val SIGN_IN_CANCELLED = 12501
    private const val SIGN_IN_IN_PROGRESS = 12502

    fun messageFor(statusCode: Int, fallbackMessage: String?): String? = when (statusCode) {
        SIGN_IN_CANCELLED -> null
        DEVELOPER_ERROR -> "Google Sign-In is not configured for this Android build. Add this app's SHA-1 certificate in Firebase, download a new google-services.json, then rebuild the app."
        NETWORK_ERROR -> "Google Sign-In needs an internet connection. Please try again."
        SIGN_IN_IN_PROGRESS -> "Google Sign-In is already in progress. Please wait a moment and try again."
        else -> fallbackMessage?.takeIf { it.isNotBlank() } ?: "Google Sign-In failed. Please try again."
    }
}
