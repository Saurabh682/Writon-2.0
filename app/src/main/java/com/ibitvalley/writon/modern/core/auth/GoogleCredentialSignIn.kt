package com.ibitvalley.writon.modern.core.auth

import android.app.Activity
import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

sealed interface GoogleCredentialResult {
    data class Success(val idToken: String) : GoogleCredentialResult
    data object Cancelled : GoogleCredentialResult
    data class Failure(val message: String) : GoogleCredentialResult
}

/** Acquires a Google ID token; Firebase remains the authoritative account provider. */
object GoogleCredentialSignIn {
    private val cleanupScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    suspend fun request(activity: Activity, serverClientId: String): GoogleCredentialResult {
        if (serverClientId.isBlank()) {
            return GoogleCredentialResult.Failure("Google Sign-In is not configured for this build.")
        }
        val manager = CredentialManager.create(activity)
        return try {
            requestCredential(manager, activity, serverClientId, authorizedOnly = true)
        } catch (_: NoCredentialException) {
            try {
                requestCredential(manager, activity, serverClientId, authorizedOnly = false)
            } catch (_: GetCredentialCancellationException) {
                GoogleCredentialResult.Cancelled
            } catch (error: GetCredentialException) {
                GoogleCredentialResult.Failure(safeMessage(error))
            }
        } catch (_: GetCredentialCancellationException) {
            GoogleCredentialResult.Cancelled
        } catch (error: GetCredentialException) {
            GoogleCredentialResult.Failure(safeMessage(error))
        } catch (error: Exception) {
            GoogleCredentialResult.Failure(error.localizedMessage ?: "Google Sign-In failed.")
        }
    }

    fun clearCredentialState(context: Context) {
        cleanupScope.launch {
            runCatching {
                CredentialManager.create(context)
                    .clearCredentialState(ClearCredentialStateRequest())
            }
        }
    }

    private suspend fun requestCredential(
        manager: CredentialManager,
        activity: Activity,
        serverClientId: String,
        authorizedOnly: Boolean
    ): GoogleCredentialResult {
        val googleOption = GetGoogleIdOption.Builder()
            .setServerClientId(serverClientId)
            .setFilterByAuthorizedAccounts(authorizedOnly)
            .setAutoSelectEnabled(false)
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build()
        val credential = manager.getCredential(activity, request).credential
        if (credential !is CustomCredential ||
            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            return GoogleCredentialResult.Failure("Google returned an unsupported credential.")
        }
        val token = GoogleIdTokenCredential.createFrom(credential.data).idToken
        return if (token.isBlank()) {
            GoogleCredentialResult.Failure("Google Sign-In token could not be retrieved.")
        } else {
            GoogleCredentialResult.Success(token)
        }
    }

    internal fun safeMessage(error: GetCredentialException): String =
        error.localizedMessage?.takeIf { it.isNotBlank() } ?: "Google Sign-In failed. Please try again."
}
