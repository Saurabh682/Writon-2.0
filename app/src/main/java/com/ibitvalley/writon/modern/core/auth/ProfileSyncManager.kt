package com.ibitvalley.writon.modern.core.auth

import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.network.model.UpsertMyProfileRequestDto

/**
 * Synchronizes profile data after Firebase establishes the user's identity.
 * The Fastify server reads the email address from the verified Firebase token,
 * so the client never sends or exposes a second copy of that private value.
 */
object ProfileSyncManager {
    suspend fun syncProfile(request: UpsertMyProfileRequestDto): String? {
        return runCatching { NetworkClient.apiService.upsertMyProfile(request) }
            .fold(
                onSuccess = { response ->
                    if (response.isSuccessful) null else ProfileSyncErrorMapper.messageFor(statusCode = response.code())
                },
                onFailure = { error -> ProfileSyncErrorMapper.messageFor(error = error) }
            )
    }

    suspend fun syncGoogleProfile(): String? {
        // GET /api/v1/me is deliberate. The server reads the verified Firebase
        // email and either links its canonical legacy profile or creates a new
        // one. Sending Google's display name through PUT would overwrite an
        // established WritOn identity after a successful account claim.
        return runCatching { NetworkClient.apiService.getMyProfile() }
            .fold(
                onSuccess = { response ->
                    if (response.isSuccessful) null else ProfileSyncErrorMapper.messageFor(statusCode = response.code())
                },
                onFailure = { error -> ProfileSyncErrorMapper.messageFor(error = error) }
            )
    }
}
