package com.ibitvalley.writon.modern.core.auth

import java.io.IOException
import java.net.SocketTimeoutException

object ProfileSyncErrorMapper {
    fun messageFor(statusCode: Int? = null, error: Throwable? = null): String = when {
        error is SocketTimeoutException -> "WritOn's profile service is taking too long to respond. Please retry in a moment."
        error is IOException -> "Could not reach WritOn's profile service. Check your connection and try again."
        statusCode == 401 -> "Your WritOn session was not accepted. Please sign in with Google again."
        statusCode == 409 -> "That WritOn username is already taken. Please choose a different one."
        statusCode != null && statusCode >= 500 -> "WritOn's profile service is temporarily unavailable. Please try again shortly."
        statusCode == 400 -> "WritOn could not use the profile information. Please check it and try again."
        else -> "We could not save your WritOn profile right now. Please try again."
    }
}
